'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useWorkerSession — LiveKit-based real-time worker session hook.
 *
 * Architecture:
 *  - Browser: Web Speech API → STT text → data channel → LiveKit agent
 *  - Agent (server): receives text → Claude LLM → Inworld TTS → audio track
 *  - Anam: intercepts TTS audio → lip-synced video track (if videoEnabled)
 *  - Browser: subscribes to audio + video tracks from agent
 */
export function useWorkerSession({ worker, sessionId, enabled, videoEnabled, systemPrompt }) {
  const roomRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioElRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(!!enabled);
  const [agentText, setAgentText] = useState('');
  const [videoTrack, setVideoTrack] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const micMutedRef = useRef(false);

  // Connect to LiveKit room when enabled
  useEffect(() => {
    if (!enabled || !worker?.id) return;

    let cancelled = false;
    setConnecting(true);

    // Lazy-import livekit-client (client-only)
    let room;
    (async () => {
      try {
        const { Room, RoomEvent, Track } = await import('livekit-client');
        room = new Room();
        roomRef.current = room;

        room.on(RoomEvent.Connected, () => {
          if (!cancelled) { setConnected(true); setConnecting(false); }
        });
        room.on(RoomEvent.Disconnected, () => {
          if (!cancelled) { setConnected(false); setConnecting(false); }
        });

        // Receive text responses + other data from agent
        room.on(RoomEvent.DataReceived, (payload) => {
          try {
            const msg = JSON.parse(new TextDecoder().decode(payload));
            if (msg.type === 'agent_text' && msg.text) {
              setAgentText(msg.text);
              // Fallback: if no audio track from agent, use browser TTS
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
            // Attach to hidden audio element for playback
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

  // Start Web Speech API after connection
  useEffect(() => {
    if (!connected) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      if (micMutedRef.current) return;
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      if (transcript) _publishText(transcript, 'user_speech');
    };
    recognition.onerror = (e) => { if (e.error !== 'no-speech' && e.error !== 'aborted') console.error('[STT]', e.error); };
    recognition.onend = () => { if (recognitionRef.current && !micMutedRef.current) { try { recognition.start(); } catch {} } };

    try { recognition.start(); } catch {}

    return () => {
      recognitionRef.current = null;
      try { recognition.stop(); } catch {}
    };
  }, [connected]);

  // Send prompt update when systemPrompt changes (after connection)
  useEffect(() => {
    if (!connected || !systemPrompt) return;
    _publishText(systemPrompt, 'update_prompt_payload');
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
    const rec = recognitionRef.current;
    if (rec) {
      if (next) { try { rec.stop(); } catch {} }
      else { try { rec.start(); } catch {} }
    }
  }, []);

  const disconnect = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} recognitionRef.current = null; }
    if (roomRef.current) { roomRef.current.disconnect(); roomRef.current = null; }
    window.speechSynthesis?.cancel();
    setConnected(false);
    setVideoTrack(null);
    setAgentText('');
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
    sendText,
    updatePrompt,
    toggleMute,
    disconnect,
    callTool,
    audioElRef,
  };
}
