'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const DEEPGRAM_API_KEY = '56e0caf0a2d27fc173409bb11929a0249005288b';

/**
 * useWorkerSession — LiveKit-based real-time worker session hook.
 *
 * Architecture:
 *  - Browser: Deepgram WebSocket STT → text → data channel → LiveKit agent
 *  - Agent (server): receives text → Claude LLM → Inworld TTS → audio track
 *  - Anam: intercepts TTS audio → lip-synced video track (if videoEnabled)
 *  - Browser: subscribes to audio + video tracks from agent
 */
export function useWorkerSession({ worker, sessionId, enabled, videoEnabled, systemPrompt }) {
  const roomRef = useRef(null);
  const dgWsRef = useRef(null);       // Deepgram WebSocket
  const audioCtxRef = useRef(null);   // AudioContext for mic capture
  const processorRef = useRef(null);  // ScriptProcessor node
  const micStreamRef = useRef(null);  // MediaStream from getUserMedia
  const audioElRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(!!enabled);
  const [agentText, setAgentText] = useState('');
  const [videoTrack, setVideoTrack] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const micMutedRef = useRef(false);
  const [needsAudioResume, setNeedsAudioResume] = useState(false);

  // Connect to LiveKit room when enabled
  useEffect(() => {
    if (!enabled || !worker?.id) return;

    let cancelled = false;
    setConnecting(true);

    let room;
    (async () => {
      try {
        const { Room, RoomEvent, Track } = await import('livekit-client');
        room = new Room();
        roomRef.current = room;

        room.on(RoomEvent.Connected, async () => {
          if (!cancelled) {
            setConnected(true);
            setConnecting(false);
            // Attempt to unlock AudioContext after connection (user gesture already occurred)
            try { await room.startAudio(); } catch {}
          }
        });
        room.on(RoomEvent.Disconnected, () => {
          if (!cancelled) { setConnected(false); setConnecting(false); }
        });

        // Handle audio playback blocked by autoplay policy
        room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
          setNeedsAudioResume(!room.canPlaybackAudio);
        });

        // Receive text responses + other data from agent
        room.on(RoomEvent.DataReceived, (payload) => {
          try {
            const msg = JSON.parse(new TextDecoder().decode(payload));
            if (msg.type === 'agent_text' && msg.text) {
              setAgentText(msg.text);
              // Fallback to browser TTS if no audio track
              if (!room._agentAudioTrack) {
                const synth = window.speechSynthesis;
                if (synth) {
                  synth.cancel();
                  const utt = new SpeechSynthesisUtterance(msg.text.replace(/```[\s\S]*?```/g, '').trim().slice(0, 500));
                  utt.rate = 1.0;
                  synth.speak(utt);
                }
              }
            }
          } catch {}
        });

        // Subscribe to audio/video tracks from agent
        room.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
          if (track.kind === Track.Kind.Video) {
            setVideoTrack(track);
          }
          if (track.kind === Track.Kind.Audio) {
            room._agentAudioTrack = track;
            if (audioElRef.current) track.attach(audioElRef.current);
          }
        });
        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          if (track.kind === Track.Kind.Video) setVideoTrack(null);
          if (track.kind === Track.Kind.Audio) {
            room._agentAudioTrack = null;
            if (audioElRef.current) track.detach(audioElRef.current);
          }
        });

        const roomName = `worker-${worker.id}-${sessionId || 'demo'}`;
        const resp = await fetch('/api/livekit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName,
            participantName: `user-${Date.now()}`,
            sessionId: sessionId || 'demo',
            workerId: worker.id,
            videoEnabled,
            personaId: worker.personaId || '6ccddf38-aed1-4bbb-9809-fc92986eb436',
            systemPrompt,
          }),
        });
        const { token, url } = await resp.json();
        if (cancelled) return;

        await room.connect(url, token);
      } catch (e) {
        console.error('[useWorkerSession] connect error:', e);
        if (!cancelled) setConnecting(false);
      }
    })();

    return () => {
      cancelled = true;
      if (room) { room.disconnect(); roomRef.current = null; }
      setConnected(false);
      setConnecting(false);
    };
  }, [enabled, worker?.id, sessionId]);

  // Start Deepgram STT after connection
  useEffect(() => {
    if (!connected) return;

    let ws = null;
    let audioCtx = null;
    let processor = null;
    let stream = null;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        micStreamRef.current = stream;
        audioCtx = new AudioContext({ sampleRate: 16000 });
        audioCtxRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        // Connect to Deepgram (auth via subprotocol)
        ws = new WebSocket(
          'wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&language=en-US&model=nova-2&interim_results=false&endpointing=500',
          ['token', DEEPGRAM_API_KEY]
        );
        dgWsRef.current = ws;

        ws.onopen = () => {
          source.connect(processor);
          processor.connect(audioCtx.destination);

          processor.onaudioprocess = (e) => {
            if (micMutedRef.current) return;
            if (ws.readyState !== WebSocket.OPEN) return;
            const float32 = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(float32.length);
            for (let i = 0; i < float32.length; i++) {
              int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
            }
            ws.send(int16.buffer);
          };
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const transcript = data?.channel?.alternatives?.[0]?.transcript?.trim();
            if (transcript && data.is_final) {
              _publishText(transcript, 'user_speech');
            }
          } catch {}
        };

        ws.onerror = (e) => console.error('[Deepgram] WebSocket error:', e);
        ws.onclose = (e) => { if (!cancelled) console.log('[Deepgram] closed:', e.code, e.reason); };
      } catch (e) {
        console.error('[Deepgram] setup failed:', e);
      }
    })();

    return () => {
      cancelled = true;
      dgWsRef.current = null;
      if (processor) { try { processor.disconnect(); } catch {} processorRef.current = null; }
      if (audioCtx) { audioCtx.close().catch(() => {}); audioCtxRef.current = null; }
      if (stream) { stream.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
      if (ws) { try { ws.close(); } catch {} }
    };
  }, [connected]);

  // Send prompt update when systemPrompt changes (after connection)
  useEffect(() => {
    if (!connected || !systemPrompt) return;
    const room = roomRef.current;
    if (room) {
      room.localParticipant?.publishData(
        new TextEncoder().encode(JSON.stringify({ type: 'update_prompt', prompt: systemPrompt })),
        { reliable: true }
      );
    }
  }, [connected, systemPrompt]);

  // Notify agent when videoEnabled changes
  useEffect(() => {
    const room = roomRef.current;
    if (!room || !connected) return;
    room.localParticipant?.publishData(
      new TextEncoder().encode(JSON.stringify({ type: 'toggle_video', enabled: videoEnabled })),
      { reliable: true }
    );
  }, [videoEnabled, connected]);

  function _publishText(text, type) {
    const room = roomRef.current;
    if (!room) return;
    room.localParticipant?.publishData(
      new TextEncoder().encode(JSON.stringify({ type, text })),
      { reliable: true }
    );
  }

  // Resume audio playback after user gesture (for autoplay policy)
  const resumeAudio = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.startAudio();
      setNeedsAudioResume(false);
    } catch {}
    // Also try to directly play the audio element in case startAudio doesn't cover it
    try {
      if (audioElRef.current && audioElRef.current.paused) {
        await audioElRef.current.play();
      }
    } catch {}
  }, []);

  const sendText = useCallback((text) => {
    const room = roomRef.current;
    if (!room) return;
    room.localParticipant?.publishData(
      new TextEncoder().encode(JSON.stringify({ type: 'user_speech', text })),
      { reliable: true }
    );
  }, []);

  const updatePrompt = useCallback((prompt) => {
    const room = roomRef.current;
    if (!room) return;
    room.localParticipant?.publishData(
      new TextEncoder().encode(JSON.stringify({ type: 'update_prompt', prompt })),
      { reliable: true }
    );
  }, []);

  const toggleMute = useCallback(() => {
    const next = !micMutedRef.current;
    micMutedRef.current = next;
    setMicMuted(next);
    // Pause/resume the ScriptProcessor by stopping/starting audio tracks
    const stream = micStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach(t => { t.enabled = !next; });
    }
  }, []);

  const disconnect = useCallback(() => {
    // Stop Deepgram
    if (dgWsRef.current) { try { dgWsRef.current.close(); } catch {} dgWsRef.current = null; }
    if (processorRef.current) { try { processorRef.current.disconnect(); } catch {} processorRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
    // Stop LiveKit
    if (roomRef.current) { roomRef.current.disconnect(); roomRef.current = null; }
    window.speechSynthesis?.cancel();
    setConnected(false);
    setVideoTrack(null);
    setAgentText('');
    setNeedsAudioResume(false);
  }, []);

  const callTool = useCallback(async (name, args) => {
    const room = roomRef.current;
    if (!room) return null;
    const agentParticipant = [...(room.remoteParticipants?.values() || [])].find(p => p.isAgent);
    if (!agentParticipant) return null;
    try {
      const result = await room.localParticipant.performRpc({
        destinationIdentity: agentParticipant.identity,
        method: 'callTool',
        payload: JSON.stringify({ name, args }),
      });
      return JSON.parse(result);
    } catch (e) {
      console.error('[RPC] error:', e);
      return null;
    }
  }, []);

  return {
    connected,
    connecting,
    agentText,
    videoTrack,
    micMuted,
    needsAudioResume,
    resumeAudio,
    sendText,
    updatePrompt,
    toggleMute,
    disconnect,
    callTool,
    audioElRef,
  };
}
