const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// CORS for direct browser uploads
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Filename');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Raw body for file uploads (must come before express.json())
app.use('/upload', express.raw({ type: '*/*', limit: '200mb' }));

app.use(express.json());

const STATE_FILE = '/mnt/shared/hw_state.json';

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return { workers: {}, tasks: [] };
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return { workers: {}, tasks: [] }; }
}
function saveState(s) { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }

function pushTransition(task, to, extra = {}) {
  if (!task.transitions) task.transitions = [];
  task.transitions.push({ from: task.status, to, at: new Date().toISOString(), ...extra });
}

// Workers report their status
app.post('/worker/heartbeat', (req, res) => {
  const { id, status, task, ip, vnc_port, skills } = req.body;
  const s = loadState();
  s.workers[id] = { id, status, task, ip, vnc_port, skills: skills || [], updated_at: new Date().toISOString() };
  saveState(s);
  res.json({ ok: true });
});

// Get next pending task for a worker (respects assigned_worker field)
app.get('/worker/task/:id', (req, res) => {
  const workerId = req.params.id;
  const s = loadState();

  // Prefer tasks explicitly assigned to this worker, then unassigned pending tasks
  const task =
    s.tasks.find(t => t.status === 'pending' && t.assigned_worker === workerId) ||
    s.tasks.find(t => t.status === 'pending' && !t.assigned_worker);

  if (task) {
    pushTransition(task, 'running', { worker: workerId });
    task.status = 'running';
    task.worker = workerId;
    task.assigned_at = new Date().toISOString();
    saveState(s);
    return res.json({ task });
  }
  res.json({ task: null });
});

// Mark task complete
app.post('/task/:id/complete', (req, res) => {
  const s = loadState();
  const task = s.tasks.find(t => t.id === req.params.id);
  if (task) {
    pushTransition(task, 'done');
    task.status = 'done';
    task.completed_at = new Date().toISOString();
    saveState(s);
  }
  res.json({ ok: true });
});

// Get single task details
app.get('/task/:id', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const s = loadState();
  const task = s.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'not found' });
  res.json({ task });
});

// Freeform state transition — any state string is valid
app.post('/task/:id/state', (req, res) => {
  const s = loadState();
  const task = s.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'not found' });
  const { to, note } = req.body;
  if (!to || typeof to !== 'string') return res.status(400).json({ error: 'to is required' });
  pushTransition(task, to, { note: note || null, manual: true });
  task.status = to;
  task[to + '_at'] = new Date().toISOString();

  // Auto-complete parent task when all subtasks finish
  if (task.parent_task && (to === 'done' || to === 'failed')) {
    const parent = s.tasks.find(t => t.id === task.parent_task);
    if (parent && !['done','failed','cancelled'].includes(parent.status)) {
      const siblings = s.tasks.filter(t => t.parent_task === task.parent_task);
      const allDone = siblings.every(t => t.status === 'done' || (t.id === task.id && to === 'done'));
      const anyFailed = siblings.some(t => t.status === 'failed' || (t.id === task.id && to === 'failed'));
      if (anyFailed) {
        pushTransition(parent, 'failed', { note: `subtask ${task.id} failed`, manual: true });
        parent.status = 'failed';
      } else if (allDone) {
        pushTransition(parent, 'done', { note: `all ${siblings.length} subtasks complete`, manual: true });
        parent.status = 'done';
        parent.done_at = new Date().toISOString();
      }
    }
  }

  saveState(s);
  res.json({ ok: true, task });
});

// Stream task logs from NFS artifact dir
app.get('/task/:id/logs', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const s = loadState();
  const task = s.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'not found' });
  // Use per-worker log if available, fall back to shared run.log
  const logFile = task.worker_log || (task.artifact_dir ? path.join(task.artifact_dir.replace(/\/$/, ''), 'run.log') : null);
  if (!logFile || !fs.existsSync(logFile)) return res.json({ logs: '', lines: 0 });
  try {
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.split('\n');
    const tail = lines.slice(-200).join('\n');
    res.json({ logs: tail, lines: lines.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Set artifact_dir on a task (called by orchestrator after planning)
app.post('/task/:id/artifact', (req, res) => {
  const s = loadState();
  const task = s.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'not found' });
  if (req.body.artifact_dir) task.artifact_dir = req.body.artifact_dir;
  saveState(s);
  res.json({ ok: true });
});

// Dashboard API
app.get('/status', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(loadState());
});

// Add task — starts in 'queued' state for orchestrator to pick up
app.post('/task', (req, res) => {
  const s = loadState();
  const now = new Date().toISOString();
  const task = {
    id: Date.now().toString(),
    ...req.body,
    status: req.body.status || 'queued',
    created_at: now,
    transitions: [{ from: null, to: req.body.status || 'queued', at: now }],
  };
  s.tasks.push(task);
  saveState(s);
  res.json({ task });
});

// API keys (shared via NFS so all workers can read)
const KEYS_FILE = '/mnt/shared/keys.json';
function loadKeys() {
  try { return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8')); } catch { return {}; }
}
app.get('/config/keys', (req, res) => res.json(loadKeys()));
app.post('/config/keys', (req, res) => {
  const current = loadKeys();
  const updated = { ...current, ...req.body };
  fs.writeFileSync(KEYS_FILE, JSON.stringify(updated, null, 2));
  res.json({ ok: true, keys: Object.keys(updated) });
});

// Linear token storage
const LINEAR_TOKEN_FILE = '/opt/hw-master/linear_token.json';
app.get('/config/linear-token', (req, res) => {
  try { res.json(JSON.parse(fs.readFileSync(LINEAR_TOKEN_FILE, 'utf8'))); }
  catch { res.json({ token: null }); }
});
app.post('/config/linear-token', (req, res) => {
  fs.writeFileSync(LINEAR_TOKEN_FILE, JSON.stringify({ token: req.body.token }));
  res.json({ ok: true });
});

app.listen(3000, () => console.log('Master API on :3000'));

// Redeploy Vercel dashboard
const { exec } = require('child_process');
app.post('/deploy/dashboard', (req, res) => {
  res.json({ ok: true, message: 'Deploying...' });
  exec(
    `/usr/bin/vercel deploy --prod --token ${process.env.VERCEL_TOKEN} --scope ${process.env.VERCEL_SCOPE} --yes`,
    { cwd: '/opt/hw-dashboard' },
    (err, stdout, stderr) => {
      const log = stdout + stderr;
      console.log('Deploy result:', log.slice(-500));
      const s = loadState();
      s.last_deploy = { at: new Date().toISOString(), output: log.slice(-1000), success: !err };
      saveState(s);
    }
  );
});

// NFS file browser
const NFS_ROOT = '/mnt/shared';
app.get('/nfs', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const rel = (req.query.path || '').replace(/\.\./g, '');
  const abs = path.join(NFS_ROOT, rel);
  try {
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(abs).map(name => {
        const full = path.join(abs, name);
        const s = fs.statSync(full);
        return { name, type: s.isDirectory() ? 'dir' : 'file', size: s.size, modified: s.mtime };
      });
      res.json({ type: 'dir', path: rel || '/', entries });
    } else {
      // Text files: return content; binary: return metadata only
      const ext = path.extname(abs).toLowerCase();
      const binaryExts = new Set(['.mp3','.aac','.wav','.ogg','.mp4','.webm','.avi','.mov','.png','.jpg','.jpeg','.gif','.webp','.pdf','.zip','.tar','.gz']);
      if (binaryExts.has(ext)) {
        const s = fs.statSync(abs);
        res.json({ type: 'file', path: rel, binary: true, size: s.size, ext });
      } else {
        const content = fs.readFileSync(abs, 'utf8');
        res.json({ type: 'file', path: rel, content });
      }
    }
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// NFS binary file download/stream
app.get('/nfs/file', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const rel = (req.query.path || '').replace(/\.\./g, '');
  const abs = path.join(NFS_ROOT, rel);
  if (!fs.existsSync(abs)) return res.status(404).json({ error: 'not found' });
  const name = path.basename(abs);
  const ext = path.extname(abs).toLowerCase();
  const mimes = {
    '.mp4':'video/mp4','.webm':'video/webm','.avi':'video/x-msvideo','.mov':'video/quicktime',
    '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp',
    '.mp3':'audio/mpeg','.aac':'audio/aac','.wav':'audio/wav','.ogg':'audio/ogg','.pdf':'application/pdf','.zip':'application/zip',
    '.json':'application/json','.sh':'text/plain','.js':'text/javascript','.html':'text/html',
    '.txt':'text/plain','.log':'text/plain','.md':'text/plain',
  };
  const mime = mimes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `inline; filename="${name}"`);
  fs.createReadStream(abs).pipe(res);
});

// File upload to NFS
const UPLOAD_DIR = "/mnt/shared/uploads";
app.post("/upload", (req, res) => {
  const rawName = req.query.filename || req.headers['x-filename'] || "upload";
  const filename = path.basename(rawName.replace(/\.\./g, ""));
  const safeFile = filename.replace(/[^a-zA-Z0-9._\-]/g, "_");
  // support optional subdirectory via query: ?dir=gtbank_v1
  const subdir = (req.query.dir || '').replace(/[^a-zA-Z0-9._\-]/g, '_');
  const destDir = subdir ? path.join(UPLOAD_DIR, subdir) : UPLOAD_DIR;
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, safeFile);
  try {
    fs.writeFileSync(dest, req.body);
    const relPath = subdir ? `uploads/${subdir}/${safeFile}` : `uploads/${safeFile}`;
    res.json({ ok: true, path: relPath, nfs: `/mnt/shared/${relPath}`, size: req.body.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Skills API
const SKILLS_DIR = '/mnt/shared/skills';

app.get('/skills', (req, res) => {
  try {
    if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true });
    const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.json'));
    const skills = files.map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(SKILLS_DIR, f), 'utf8')); } catch { return null; }
    }).filter(Boolean);
    res.json({ skills });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/skills', (req, res) => {
  try {
    const { name, creator, desc, code, origin } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const skill = { name, creator: creator || 'claude', desc: desc || '', code: code || '', origin: origin || 'manual', created_at: new Date().toISOString() };
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
    fs.writeFileSync(path.join(SKILLS_DIR, slug + '.json'), JSON.stringify(skill, null, 2));
    res.json({ ok: true, slug });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/skills/install', async (req, res) => {
  try {
    const { url, name, creator } = req.body;
    if (!url) return res.status(400).json({ error: 'url required' });
    const https = require('https'), http = require('http');
    const proto = url.startsWith('https') ? https : http;
    const code = await new Promise((resolve, reject) => {
      let data = '';
      proto.get(url, r => { r.on('data', c => data += c); r.on('end', () => resolve(data)); }).on('error', reject);
    });
    const skillName = name || url.split('/').pop().replace(/\.[^.]+$/, '');
    const slug = skillName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const skill = { name: skillName, creator: creator || 'download', desc: 'Downloaded from ' + url, code, origin: url, created_at: new Date().toISOString() };
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
    fs.writeFileSync(path.join(SKILLS_DIR, slug + '.json'), JSON.stringify(skill, null, 2));
    const binDir = '/mnt/shared/bin';
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(path.join(binDir, slug), code, { mode: 0o755 });
    res.json({ ok: true, slug, size: code.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/skills/:slug', (req, res) => {
  try {
    const f = path.join(SKILLS_DIR, req.params.slug + '.json');
    if (fs.existsSync(f)) fs.unlinkSync(f);
    const bin = path.join('/mnt/shared/bin', req.params.slug);
    if (fs.existsSync(bin)) fs.unlinkSync(bin);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Sandbox Builder ────────────────────────────────────────────────────────
const SANDBOXES_FILE = '/mnt/shared/sandboxes.json';
const SANDBOX_WORKER = '164.90.197.224';
const SSH_KEY = '/opt/hw-master/keys/openclaw-key.pem';
const { execSync } = require('child_process');

function loadSandboxes() {
  try { return JSON.parse(fs.readFileSync(SANDBOXES_FILE, 'utf8')); } catch { return {}; }
}
function saveSandboxes(s) { fs.writeFileSync(SANDBOXES_FILE, JSON.stringify(s, null, 2)); }

function nextSandboxPort() {
  const sbs = loadSandboxes();
  const used = new Set(Object.values(sbs).map(s => s.port).filter(Boolean));
  for (let p = 8100; p <= 8199; p++) { if (!used.has(p)) return p; }
  return 8100;
}

function sshRun(ip, cmd) {
  return execSync(
    `ssh -i ${SSH_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@${ip} ${JSON.stringify(cmd)}`,
    { timeout: 30000, encoding: 'utf8' }
  );
}

function sshWriteFile(ip, remotePath, content) {
  // Write to temp file on master, then scp to worker
  const tmpFile = `/tmp/sbx-write-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  fs.writeFileSync(tmpFile, content, 'utf8');
  try {
    execSync(
      `scp -i ${SSH_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -o ConnectTimeout=10 '${tmpFile}' root@${ip}:'${remotePath}'`,
      { timeout: 30000, encoding: 'utf8' }
    );
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

// GET /sandboxes
app.get('/sandboxes', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(loadSandboxes());
});

// POST /sandboxes — create empty sandbox
app.post('/sandboxes', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const id = 'sbx-' + Date.now();
  const port = nextSandboxPort();
  const sb = {
    id, port,
    title: req.body.title || 'New Sandbox',
    status: 'created',
    worker_ip: SANDBOX_WORKER,
    url: `http://${SANDBOX_WORKER}:${port}`,
    messages: [],
    log: [],
    files: {},
    suggested_workers: [],
    created_at: new Date().toISOString(),
  };
  const sbs = loadSandboxes();
  sbs[id] = sb;
  saveSandboxes(sbs);
  try { sshRun(SANDBOX_WORKER, `mkdir -p /opt/sandboxes/${id}`); } catch {}
  res.json({ ok: true, sandbox: sb });
});

// POST /sandboxes/:id/chat — agentic build loop (polling-friendly, synchronous)
app.post('/sandboxes/:id/chat', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  let sbs = loadSandboxes();
  let sb = sbs[req.params.id];
  if (!sb) return res.status(404).json({ error: 'sandbox not found' });

  const userMsg = req.body.message || '';
  const imageUrls = req.body.image_urls || []; // array of base64 data URIs or http URLs

  // Build content for this user message (text + optional images)
  let userContent;
  if (imageUrls.length > 0) {
    userContent = [{ type: 'text', text: userMsg }];
    for (const imgUrl of imageUrls) {
      if (imgUrl.startsWith('data:')) {
        const match = imgUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (match) {
          userContent.push({ type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } });
        }
      } else {
        userContent.push({ type: 'image', source: { type: 'url', url: imgUrl } });
      }
    }
  } else {
    userContent = userMsg;
  }

  sb.messages.push({ role: 'user', content: userContent });
  sb.status = 'building';
  sb.log = sb.log || [];
  sb.log.push({ tool: 'user', result: userMsg, at: new Date().toISOString() });
  sbs[req.params.id] = sb;
  saveSandboxes(sbs);

  // Respond immediately so client can start polling
  res.json({ ok: true, status: 'building', message: 'Build started, poll GET /sandboxes/:id for updates' });

  // Load anthropic key
  let anthropicKey = '';
  try {
    const keyData = JSON.parse(fs.readFileSync('/opt/hw-master/anthropic_key.json', 'utf8'));
    anthropicKey = keyData.key || keyData.token || '';
  } catch {}

  const isOAuth = anthropicKey.startsWith('sk-ant-oat');
  const authHeaders = isOAuth
    ? { 'Authorization': `Bearer ${anthropicKey}`, 'anthropic-beta': 'oauth-2025-04-20' }
    : { 'x-api-key': anthropicKey };

  const TOOLS = [
    {
      name: 'write_file',
      description: 'Write a file to the sandbox directory on the deployment worker',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path within sandbox (e.g. server.js, public/index.html)' },
          content: { type: 'string', description: 'Full file content' },
        },
        required: ['path', 'content'],
      },
    },
    {
      name: 'bash',
      description: 'Run a bash command in the sandbox directory on the worker (e.g. npm install)',
      input_schema: {
        type: 'object',
        properties: { command: { type: 'string' } },
        required: ['command'],
      },
    },
    {
      name: 'deploy',
      description: 'Start the application. Kills any existing process on the sandbox port and starts node with the given entry point.',
      input_schema: {
        type: 'object',
        properties: { entry_point: { type: 'string', description: 'Main file to run, e.g. server.js' } },
        required: ['entry_point'],
      },
    },
    {
      name: 'suggest_workers',
      description: 'Propose worker agents that will simulate real interactions with the deployed app',
      input_schema: {
        type: 'object',
        properties: {
          workers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                role: { type: 'string' },
                description: { type: 'string' },
                scenarios: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      description: { type: 'string' },
                      script: { type: 'string', description: 'Bash script to execute the scenario' },
                    },
                    required: ['name', 'description', 'script'],
                  },
                },
              },
              required: ['id', 'role', 'description', 'scenarios'],
            },
          },
        },
        required: ['workers'],
      },
    },
  ];

  const freshSbs0 = loadSandboxes();
  const freshSb0 = freshSbs0[sb.id] || sb;
  const SYSTEM = `You are a full-stack developer building web applications on demand. IMPORTANT: Keep server.js under 6000 characters. Use concise but functional code.

When given a description, build a complete working application:
1. Use write_file to create all necessary files. Build a Node.js Express server (server.js) that serves static HTML and provides REST APIs. The HTML should be a single index.html with inline CSS and vanilla JS (no build step, no React, no bundler).
2. Use bash("npm install express") to install dependencies (no package.json needed, just install inline).
3. Use deploy("server.js") to start the app on port ${freshSb0.port} (always use PORT=${freshSb0.port} in server.js: const PORT = process.env.PORT || ${freshSb0.port}).
4. Use suggest_workers with 3 specific worker agents with bash scripts using the real URL http://${SANDBOX_WORKER}:${freshSb0.port}.

Make the apps visually STUNNING with a dark professional UI: dark background (#0a0a0f), colored accents (blue #3b82f6, green #22c55e, amber #f59e0b, red #ef4444), glass-morphism cards, smooth CSS animations, gradients, status indicators. Include real data structures, real API endpoints with proper in-memory state, realistic mock data (names, IDs, timestamps). The frontend should auto-poll APIs every 2-3 seconds for live updates. Use CSS grid/flexbox for professional layouts. Add charts/stats using pure CSS (no charting libs). Aim for a product that looks like it could ship.

CRITICAL CODING RULES to avoid syntax errors:
- NEVER use backtick template literals inside Express res.send() or res.json() HTML strings — use single-quoted strings or write the HTML to a separate .html file
- For HTML served by Express, always write it to public/index.html via write_file, then use express.static('public') — never inline large HTML in template literals inside server.js
- When building HTML in JS, use string concatenation (+) not template literals if the HTML contains quotes or complex characters
- Keep server.js under 4000 characters; put all HTML/CSS/JS in public/index.html

If the user sends follow-up requests, iterate on the EXISTING files — rewrite only what needs to change, keep what works. You have the full conversation history.

Sandbox ID: ${freshSb0.id}, Port: ${freshSb0.port}, Worker: ${SANDBOX_WORKER}`;

  // Use full conversation history for ongoing chat context
  const freshSbForHistory = loadSandboxes()[sb.id] || sb;
  let apiMessages = freshSbForHistory.messages.filter(m => m.role === 'user' || m.role === 'assistant');
  if (apiMessages.length === 0) apiMessages = [{ role: 'user', content: userContent }];
  let finalText = '';

  function addLog(tool, result) {
    const freshSbs = loadSandboxes();
    const freshSb = freshSbs[sb.id] || sb;
    freshSb.log = freshSb.log || [];
    freshSb.log.push({ tool, result: String(result).slice(0, 500), at: new Date().toISOString() });
    freshSbs[sb.id] = freshSb;
    saveSandboxes(freshSbs);
  }

  // Agentic tool loop — max 15 iterations
  for (let iter = 0; iter < 15; iter++) {
    let claudeResp;
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'anthropic-version': '2023-06-01',
          ...authHeaders,
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 16000,
          system: SYSTEM,
          tools: TOOLS,
          messages: apiMessages,
        }),
      });
      claudeResp = await resp.json();
    } catch (e) {
      addLog('error', 'Claude API error: ' + e.message);
      break;
    }

    if (claudeResp.error) {
      addLog('error', claudeResp.error.message);
      break;
    }

    const content = claudeResp.content || [];
    apiMessages.push({ role: 'assistant', content });

    const toolResults = [];
    for (const block of content) {
      if (block.type === 'text' && block.text) {
        finalText = block.text;
        addLog('text', block.text.slice(0, 300));
      }
      if (block.type === 'tool_use') {
        const { name, input, id: toolId } = block;
let toolResult = '';
        const freshSbs = loadSandboxes();
        const freshSb = freshSbs[sb.id] || sb;

        try {
          if (name === 'write_file') {
            if (!input.path || input.content === undefined || input.content === null) {
              toolResult = `Error: write_file requires path and content (got path=${input.path}, content type=${typeof input.content})`;
            } else {
              const remotePath = `/opt/sandboxes/${sb.id}/${input.path}`;
              sshRun(SANDBOX_WORKER, `mkdir -p $(dirname '${remotePath}')`);
              sshWriteFile(SANDBOX_WORKER, remotePath, input.content);
              freshSb.files = freshSb.files || {};
              freshSb.files[input.path] = input.content;
              toolResult = `Written: ${input.path} (${String(input.content).length} bytes)`;
            }
          } else if (name === 'bash') {
            if (!input.command) {
              toolResult = 'Error: bash requires command parameter';
            } else {
              const out = sshRun(SANDBOX_WORKER, `cd /opt/sandboxes/${sb.id} && ${input.command} 2>&1`);
              toolResult = out.slice(0, 2000);
            }
          } else if (name === 'deploy') {
            // Syntax-check before deploying to catch template literal issues early
            try {
              const syntaxCheck = sshRun(SANDBOX_WORKER, `node --check /opt/sandboxes/${sb.id}/${input.entry_point} 2>&1`);
              if (syntaxCheck.trim()) {
                toolResult = `Syntax error in ${input.entry_point} — fix before deploying:\n${syntaxCheck.slice(0, 800)}\n\nHINT: Replace any template literals (backticks) inside the html= template literal with string concatenation using +`;
                toolResults.push({ type: 'tool_result', tool_use_id: toolId, content: toolResult, is_error: true });
                continue;
              }
            } catch {}
            sshRun(SANDBOX_WORKER, `fuser -k ${freshSb.port}/tcp 2>/dev/null || true`);
            // Use nohup with explicit backgrounding that disconnects from SSH
            const startCmd = `nohup bash -c 'cd /opt/sandboxes/${sb.id} && PORT=${freshSb.port} node ${input.entry_point} >> /opt/sandboxes/${sb.id}/app.log 2>&1' > /dev/null 2>&1 &`;
            sshRun(SANDBOX_WORKER, startCmd);
            await new Promise(r => setTimeout(r, 3000));
            // Verify it's running
            try {
              const check = sshRun(SANDBOX_WORKER, `curl -s --max-time 3 http://localhost:${freshSb.port}/ > /dev/null 2>&1 && echo running || echo starting`);
              if (check.trim() === 'starting') {
                const log = sshRun(SANDBOX_WORKER, `tail -10 /opt/sandboxes/${sb.id}/app.log 2>/dev/null || echo '(no log)'`);
                toolResult = `Deploy may have failed — app not responding yet:\n${log}`;
              } else {
                freshSb.status = 'deployed';
                toolResult = `Deployed at http://${SANDBOX_WORKER}:${freshSb.port} (${check.trim()})`;
              }
            } catch {
              freshSb.status = 'deployed';
              toolResult = `Deployed at http://${SANDBOX_WORKER}:${freshSb.port}`;
            }
          } else if (name === 'suggest_workers') {
            freshSb.suggested_workers = input.workers;
            toolResult = `Suggested ${input.workers.length} workers`;
          }
        } catch (e) {
          toolResult = 'Error: ' + e.message;
        }

        freshSb.log = freshSb.log || [];
        freshSb.log.push({ tool: name, result: toolResult.slice(0, 500), at: new Date().toISOString() });
        freshSbs[sb.id] = freshSb;
        saveSandboxes(freshSbs);

        toolResults.push({ type: 'tool_result', tool_use_id: toolId, content: toolResult });
      }
    }

    if (toolResults.length === 0) break;
    apiMessages.push({ role: 'user', content: toolResults });
  }

  // Save final message
  const finalSbs = loadSandboxes();
  if (finalSbs[sb.id]) {
    finalSbs[sb.id].messages.push({ role: 'assistant', content: finalText });
    if (finalSbs[sb.id].status === 'building') finalSbs[sb.id].status = 'done';
    saveSandboxes(finalSbs);
  }
});

// GET /sandboxes/:id
app.get('/sandboxes/:id', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const sbs = loadSandboxes();
  const sb = sbs[req.params.id];
  if (!sb) return res.status(404).json({ error: 'not found' });
  res.json(sb);
});

// POST /sandboxes/:id/scenario — run a worker scenario
app.post('/sandboxes/:id/scenario', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const sbs = loadSandboxes();
  const sb = sbs[req.params.id];
  if (!sb) return res.status(404).json({ error: 'sandbox not found' });
  const { script, worker_ip } = req.body;
  if (!script) return res.status(400).json({ error: 'script required' });
  const targetIp = worker_ip || SANDBOX_WORKER;
  // Write script to temp file, scp to worker, run it
  const tmpLocal = `/tmp/scenario-${Date.now()}.sh`;
  const tmpRemote = `/tmp/scenario-${Date.now()}.sh`;
  try {
    fs.writeFileSync(tmpLocal, script, 'utf8');
    execSync(
      `scp -i ${SSH_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -o ConnectTimeout=10 '${tmpLocal}' root@${targetIp}:'${tmpRemote}'`,
      { timeout: 15000, encoding: 'utf8' }
    );
    const out = sshRun(targetIp, `bash '${tmpRemote}' 2>&1; rm -f '${tmpRemote}'`);
    res.json({ ok: true, output: out });
  } catch (e) {
    res.json({ ok: false, output: e.message });
  } finally {
    try { fs.unlinkSync(tmpLocal); } catch {}
  }
});

// DELETE /sandboxes/:id
app.delete('/sandboxes/:id', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const sbs = loadSandboxes();
  const sb = sbs[req.params.id];
  if (sb) {
    try { sshRun(sb.worker_ip, `fuser -k ${sb.port}/tcp 2>/dev/null || true; rm -rf /opt/sandboxes/${sb.id}`); } catch {}
    delete sbs[req.params.id];
    saveSandboxes(sbs);
  }
  res.json({ ok: true });
});

// CORS OPTIONS for sandbox routes
['', '/:id', '/:id/chat', '/:id/scenario', '/deploy-template'].forEach(path => {
  app.options('/sandboxes' + path, (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.sendStatus(204);
  });
});

// POST /sandboxes/deploy-template — deploy a pre-built template to a sandbox
app.post('/sandboxes/deploy-template', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { title, files, npm_packages, entry_point } = req.body;
  if (!files || !files.length) return res.status(400).json({ ok: false, error: 'files required' });

  const id = 'sbx-' + Date.now();
  const port = nextSandboxPort();
  const sb = {
    id, port,
    title: title || 'Template App',
    status: 'deploying',
    worker_ip: SANDBOX_WORKER,
    url: 'http://' + SANDBOX_WORKER + ':' + port,
    messages: [],
    log: [],
    files: {},
    suggested_workers: [],
    created_at: new Date().toISOString(),
  };
  const sbs = loadSandboxes();
  sbs[id] = sb;
  saveSandboxes(sbs);

  try {
    // Create directory on worker
    sshRun(SANDBOX_WORKER, 'mkdir -p /opt/sandboxes/' + id);

    // Write each file
    for (const f of files) {
      const remotePath = '/opt/sandboxes/' + id + '/' + f.path;
      sshRun(SANDBOX_WORKER, "mkdir -p $(dirname '" + remotePath + "')");
      sshWriteFile(SANDBOX_WORKER, remotePath, f.content);
      sb.files[f.path] = f.content;
    }

    // npm install
    const packages = (npm_packages || []).join(' ');
    if (packages) {
      const installOut = sshRun(SANDBOX_WORKER, 'cd /opt/sandboxes/' + id + ' && npm install ' + packages + ' 2>&1');
      sb.log.push({ tool: 'npm_install', result: installOut.slice(0, 500), at: new Date().toISOString() });
    }

    // Syntax check
    const ep = entry_point || 'server.js';
    try {
      const checkOut = sshRun(SANDBOX_WORKER, 'node --check /opt/sandboxes/' + id + '/' + ep + ' 2>&1');
      if (checkOut && checkOut.trim()) {
        const freshSbs = loadSandboxes();
        if (freshSbs[id]) { freshSbs[id].status = 'error'; saveSandboxes(freshSbs); }
        return res.json({ ok: false, error: 'Syntax error: ' + checkOut.slice(0, 500) });
      }
    } catch (syntaxErr) {
      const freshSbs = loadSandboxes();
      if (freshSbs[id]) { freshSbs[id].status = 'error'; saveSandboxes(freshSbs); }
      return res.json({ ok: false, error: 'Syntax error: ' + syntaxErr.message.slice(0, 500) });
    }

    // Kill any old process on port, start app
    sshRun(SANDBOX_WORKER, 'fuser -k ' + port + '/tcp 2>/dev/null || true');
    const startCmd = "nohup bash -c 'cd /opt/sandboxes/" + id + " && PORT=" + port + " node " + ep + " >> /opt/sandboxes/" + id + "/app.log 2>&1' > /dev/null 2>&1 &";
    sshRun(SANDBOX_WORKER, startCmd);

    // Wait 4 seconds then verify
    await new Promise(r => setTimeout(r, 4000));
    let verified = false;
    try {
      const check = sshRun(SANDBOX_WORKER, 'curl -s --max-time 3 http://localhost:' + port + '/ > /dev/null 2>&1 && echo running || echo starting');
      verified = check.trim() === 'running';
    } catch {}

    const freshSbs = loadSandboxes();
    if (freshSbs[id]) {
      freshSbs[id].status = 'deployed';
      freshSbs[id].files = sb.files;
      freshSbs[id].log = sb.log;
      saveSandboxes(freshSbs);
    }

    res.json({ ok: true, sandbox: { ...sb, status: 'deployed', verified } });
  } catch (e) {
    const freshSbs = loadSandboxes();
    if (freshSbs[id]) { freshSbs[id].status = 'error'; saveSandboxes(freshSbs); }
    res.json({ ok: false, error: e.message });
  }
});

// POST /agent/run-script — run a standalone bash script on worker-1
app.options('/agent/run-script', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(204);
});

app.post('/agent/run-script', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { script, args } = req.body;
  if (!script) return res.status(400).json({ ok: false, output: 'script required' });

  const tmpLocal = '/tmp/agent-script-' + Date.now() + '.sh';
  const tmpRemote = '/tmp/agent-script-' + Date.now() + '.sh';
  try {
    fs.writeFileSync(tmpLocal, script, 'utf8');
    execSync(
      'scp -i ' + SSH_KEY + ' -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -o ConnectTimeout=10 \'' + tmpLocal + '\' root@' + SANDBOX_WORKER + ':\'' + tmpRemote + '\'',
      { timeout: 15000, encoding: 'utf8' }
    );
    const argStr = (args || []).map(a => JSON.stringify(String(a))).join(' ');
    const out = sshRun(SANDBOX_WORKER, 'bash \'' + tmpRemote + '\' ' + argStr + ' 2>&1; rm -f \'' + tmpRemote + '\'');
    res.json({ ok: true, output: out });
  } catch (e) {
    res.json({ ok: false, output: e.message });
  } finally {
    try { fs.unlinkSync(tmpLocal); } catch {}
  }
});

// ═══════════════════════════════════════════════════════════════════════
// ── DEMO ROUTES (AI Back-Office Simulation Platform) ───────────────────
// ═══════════════════════════════════════════════════════════════════════

const DEMO_SESSIONS_FILE = '/opt/hw-master/demo_sessions.json';
const DEMO_DB_ROOT = '/opt/demo-db';

function loadDemoKeys() {
  try { return JSON.parse(fs.readFileSync('/mnt/shared/keys.json', 'utf8')); } catch { return {}; }
}
function getDemoKey(k) { return loadDemoKeys()[k] || ''; }

const PERPLEXITY_KEY  = () => getDemoKey('perplexity');
const TWILIO_SID      = () => getDemoKey('twilio_sid');
const TWILIO_AUTH     = () => getDemoKey('twilio_auth_token');
const TELEGRAM_TOKEN  = () => getDemoKey('telegram_bot_token');
const TELEGRAM_CHAT   = '-1002678964150';
const ANTHROPIC_KEY   = () => getDemoKey('anthropic');

function loadDemoSessions() {
  try { return JSON.parse(fs.readFileSync(DEMO_SESSIONS_FILE, 'utf8')); } catch { return {}; }
}
function saveDemoSessions(s) {
  fs.mkdirSync('/opt/hw-master', { recursive: true });
  fs.writeFileSync(DEMO_SESSIONS_FILE, JSON.stringify(s, null, 2));
}

function demoSession(id) {
  return loadDemoSessions()[id] || null;
}

// CORS for demo routes
app.use('/demo', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// POST /demo/session — create new session
app.post('/demo/session', (req, res) => {
  const id = 'demo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const sessions = loadDemoSessions();
  sessions[id] = {
    id,
    phase: 'start',
    company: null,
    platforms: [],
    workers: [],
    realClient: null,
    created_at: new Date().toISOString(),
  };
  saveDemoSessions(sessions);
  // Ensure db dir exists on worker
  try { sshRun(SANDBOX_WORKER, 'mkdir -p ' + DEMO_DB_ROOT + '/' + id); } catch(e) { console.log('mkdir warn:', e.message); }
  res.json({ ok: true, sessionId: id });
});

// GET /demo/session/:id
app.get('/demo/session/:id', (req, res) => {
  const s = demoSession(req.params.id);
  if (!s) return res.status(404).json({ error: 'not found' });
  res.json(s);
});

// POST /demo/research
app.post('/demo/research', async (req, res) => {
  const { company, sessionId } = req.body;
  if (!company) return res.status(400).json({ error: 'company required' });

  try {
    const pResp = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + PERPLEXITY_KEY(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: 'Research ' + company + '. What back-office software platforms do they likely use? Consider: CRM, ERP, Support/Helpdesk, Analytics, Messaging, E-commerce, HR/Payroll. Return ONLY valid JSON (no markdown, no code blocks): {"company":{"name":"...","industry":"...","size":"...","domain":"..."},"platforms":[{"id":"crm","name":"CRM","reason":"...","selected":true},{"id":"support","name":"Support","reason":"...","selected":true},{"id":"analytics","name":"Analytics","reason":"...","selected":true},{"id":"erp","name":"ERP","reason":"...","selected":false},{"id":"messaging","name":"Messaging","reason":"...","selected":true}],"summary":"one sentence summary"}' }],
        max_tokens: 1000,
      }),
    });
    const pData = await pResp.json();
    let raw = (pData.choices && pData.choices[0] && pData.choices[0].message && pData.choices[0].message.content) || '';
    // Strip markdown code blocks if present
    raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    // Find JSON object
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response: ' + raw.slice(0, 200));
    const parsed = JSON.parse(jsonMatch[0]);

    if (sessionId) {
      const sessions = loadDemoSessions();
      if (sessions[sessionId]) {
        sessions[sessionId].company = parsed.company;
        sessions[sessionId].platforms = parsed.platforms;
        sessions[sessionId].phase = 'research';
        saveDemoSessions(sessions);
      }
    }

    res.json(parsed);
  } catch(e) {
    // Fallback with generic data
    const fallback = {
      company: { name: company, industry: 'Technology', size: 'Mid-size', domain: company.toLowerCase().replace(/\s+/g, '') + '.com' },
      platforms: [
        { id: 'crm', name: 'CRM', reason: 'Customer relationship management', selected: true },
        { id: 'support', name: 'Support', reason: 'Customer support ticketing', selected: true },
        { id: 'analytics', name: 'Analytics', reason: 'Business intelligence', selected: true },
        { id: 'erp', name: 'ERP', reason: 'Enterprise resource planning', selected: false },
        { id: 'messaging', name: 'Messaging', reason: 'Internal communications', selected: true },
      ],
      summary: company + ' is a technology company using standard back-office platforms for operations.',
    };
    if (sessionId) {
      const sessions = loadDemoSessions();
      if (sessions[sessionId]) {
        sessions[sessionId].company = fallback.company;
        sessions[sessionId].platforms = fallback.platforms;
        sessions[sessionId].phase = 'research';
        saveDemoSessions(sessions);
      }
    }
    res.json(fallback);
  }
});

// Helper: generate seed SQL for shared DB
function buildSeedSQL(sessionId) {
  const names = ['Alice Johnson','Bob Martinez','Carol White','David Lee','Emma Wilson','Frank Brown','Grace Davis','Henry Taylor','Iris Clark','Jack Anderson'];
  const companies = ['TechCorp','Acme Inc','GlobalTrade','FastStart','MegaBase','CloudSys','DevTools','NetScale','DataHub','AIWorks'];
  const roles = ['CEO','CTO','Sales Manager','Support Lead','Developer','Designer','Analyst','Director','VP Sales','COO'];
  
  let sql = `
CREATE TABLE IF NOT EXISTS contacts (id INTEGER PRIMARY KEY, name TEXT, email TEXT, phone TEXT, company TEXT, role TEXT, status TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY, contact_id INTEGER, amount REAL, type TEXT, currency TEXT, status TEXT, created_at TEXT, description TEXT);
CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY, contact_id INTEGER, subject TEXT, priority TEXT, status TEXT, assignee TEXT, created_at TEXT, resolved_at TEXT);
CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT, category TEXT, price REAL, stock INTEGER, sku TEXT, description TEXT);
CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, contact_id INTEGER, product_id INTEGER, quantity INTEGER, total REAL, status TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS employees (id INTEGER PRIMARY KEY, name TEXT, dept TEXT, role TEXT, email TEXT, phone TEXT, salary REAL, start_date TEXT);
CREATE TABLE IF NOT EXISTS activities (id INTEGER PRIMARY KEY, contact_id INTEGER, type TEXT, description TEXT, outcome TEXT, created_at TEXT);
`;

  // Contacts
  names.forEach((name, i) => {
    const email = name.toLowerCase().replace(' ', '.') + '@' + companies[i].toLowerCase().replace(/\s/,'') + '.com';
    const phone = '+1-555-' + String(1000 + i * 37).slice(0,4);
    const status = ['active','prospect','customer','churned'][i % 4];
    sql += `INSERT OR IGNORE INTO contacts VALUES (${i+1}, '${name}', '${email}', '${phone}', '${companies[i]}', '${roles[i]}', '${status}', datetime('now', '-${i*7} days'));\n`;
  });

  // Transactions
  const amounts = [1250.00,347.50,892.00,5500.00,123.75,2840.00,677.25,3100.00,456.00,9999.99];
  const types = ['invoice','payment','refund','subscription'];
  amounts.forEach((amt, i) => {
    const type = types[i % 4];
    const status = ['completed','pending','failed'][i % 3];
    sql += `INSERT OR IGNORE INTO transactions VALUES (${i+1}, ${(i%10)+1}, ${amt}, '${type}', 'USD', '${status}', datetime('now', '-${i*3} days'), '${type} for Q${(i%4)+1}');\n`;
  });

  // Tickets
  const subjects = ['Login issue','Billing question','Feature request','Bug report','Account upgrade','Data export','API access','Password reset','Performance problem','Integration help'];
  const priorities = ['low','medium','high','critical'];
  subjects.forEach((sub, i) => {
    const p = priorities[i % 4];
    const st = ['open','in_progress','resolved','closed'][i % 4];
    const resolved = st === 'resolved' || st === 'closed' ? ', datetime(\'now\', \'-1 days\')' : ', NULL';
    sql += `INSERT OR IGNORE INTO tickets VALUES (${i+1}, ${(i%10)+1}, '${sub}', '${p}', '${st}', 'Agent ${i%3+1}'${resolved}, datetime('now', '-${i*2} days'));\n`;
  });

  // Products
  const prods = [
    ['Pro Plan','subscription',99,999,'PRO-001'],['Enterprise','subscription',499,500,'ENT-001'],
    ['Starter','subscription',29,2000,'STR-001'],['API Credits','usage',0.01,50000,'API-001'],
    ['Support Pack','service',199,200,'SUP-001'],['Training Hours','service',150,100,'TRN-001'],
    ['Data Storage 1TB','infrastructure',49,1000,'STR-1TB'],['SSL Certificate','security',49,500,'SSL-001'],
    ['Custom Domain','service',12,800,'DOM-001'],['White Label','addon',299,150,'WHL-001'],
  ];
  prods.forEach(([name,cat,price,stock,sku],i) => {
    sql += `INSERT OR IGNORE INTO products VALUES (${i+1}, '${name}', '${cat}', ${price}, ${stock}, '${sku}', '${name} - ${cat} product');\n`;
  });

  // Orders
  for (let i = 0; i < 15; i++) {
    const qty = (i % 5) + 1;
    const prod = (i % 10) + 1;
    const total = qty * prods[prod-1][2];
    const st = ['pending','processing','shipped','delivered','cancelled'][i%5];
    sql += `INSERT OR IGNORE INTO orders VALUES (${i+1}, ${(i%10)+1}, ${prod}, ${qty}, ${total}, '${st}', datetime('now', '-${i} days'));\n`;
  }

  // Employees
  const empNames = ['Sarah Mitchell','James Rivera','Emily Chen','Marcus Thompson','Priya Patel'];
  const depts = ['Engineering','Sales','Support','Marketing','Operations'];
  empNames.forEach((name, i) => {
    const email = name.toLowerCase().replace(' ', '.') + '@company.com';
    const salary = 75000 + i * 12500;
    sql += `INSERT OR IGNORE INTO employees VALUES (${i+1}, '${name}', '${depts[i]}', '${roles[i+2]}', '${email}', '+1-555-900${i}', ${salary}, date('now', '-${i*180} days'));\n`;
  });

  // Activities
  const actTypes = ['call','email','meeting','demo','follow_up'];
  for (let i = 0; i < 20; i++) {
    const type = actTypes[i % 5];
    const outcome = ['interested','not interested','follow up','closed won','pending'][i%5];
    sql += `INSERT OR IGNORE INTO activities VALUES (${i+1}, ${(i%10)+1}, '${type}', '${type} with contact ${(i%10)+1}', '${outcome}', datetime('now', '-${i} hours'));\n`;
  }

  return sql;
}

// Platform server.js templates
function buildPlatformServerJS(type, sessionId, port) {
  const dbPath = DEMO_DB_ROOT + '/' + sessionId + '/shared.sqlite';
  const base = `const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static('public'));
const db = new Database('${dbPath}');
const PORT = process.env.PORT || ${port};
`;

  if (type === 'crm') {
    return base + `
app.get('/api/contacts', (req, res) => {
  const rows = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
  res.json(rows);
});
app.get('/api/pipeline', (req, res) => {
  const rows = db.prepare("SELECT status, COUNT(*) as count FROM contacts GROUP BY status").all();
  res.json(rows);
});
app.get('/api/activities', (req, res) => {
  const rows = db.prepare('SELECT a.*, c.name as contact_name FROM activities a JOIN contacts c ON a.contact_id=c.id ORDER BY a.created_at DESC LIMIT 20').all();
  res.json(rows);
});
app.listen(PORT, () => console.log('CRM on ' + PORT));
`;
  }
  if (type === 'support') {
    return base + `
app.get('/api/tickets', (req, res) => {
  const rows = db.prepare('SELECT t.*, c.name as contact_name, c.email FROM tickets t JOIN contacts c ON t.contact_id=c.id ORDER BY CASE priority WHEN \'critical\' THEN 0 WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 ELSE 3 END, t.created_at DESC').all();
  res.json(rows);
});
app.get('/api/stats', (req, res) => {
  const stats = {
    open: db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status='open'").get().c,
    critical: db.prepare("SELECT COUNT(*) as c FROM tickets WHERE priority='critical'").get().c,
    resolved: db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status='resolved'").get().c,
    avg_time: '2.4h',
  };
  res.json(stats);
});
app.listen(PORT, () => console.log('Support on ' + PORT));
`;
  }
  if (type === 'analytics') {
    return base + `
app.get('/api/revenue', (req, res) => {
  const rows = db.prepare("SELECT date(created_at) as day, SUM(amount) as total FROM transactions WHERE status='completed' GROUP BY day ORDER BY day").all();
  res.json(rows);
});
app.get('/api/summary', (req, res) => {
  const data = {
    total_revenue: db.prepare("SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE status='completed'").get().v,
    open_tickets: db.prepare("SELECT COUNT(*) as v FROM tickets WHERE status='open'").get().v,
    active_contacts: db.prepare("SELECT COUNT(*) as v FROM contacts WHERE status='active' OR status='customer'").get().v,
    orders_today: db.prepare("SELECT COUNT(*) as v FROM orders WHERE date(created_at)=date('now')").get().v,
  };
  res.json(data);
});
app.get('/api/top-products', (req, res) => {
  const rows = db.prepare('SELECT p.name, SUM(o.quantity) as units, SUM(o.total) as revenue FROM orders o JOIN products p ON o.product_id=p.id GROUP BY p.name ORDER BY revenue DESC LIMIT 5').all();
  res.json(rows);
});
app.listen(PORT, () => console.log('Analytics on ' + PORT));
`;
  }
  if (type === 'erp') {
    return base + `
app.get('/api/products', (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY stock ASC').all();
  res.json(rows);
});
app.get('/api/orders', (req, res) => {
  const rows = db.prepare('SELECT o.*, c.name as customer, p.name as product FROM orders o JOIN contacts c ON o.contact_id=c.id JOIN products p ON o.product_id=p.id ORDER BY o.created_at DESC').all();
  res.json(rows);
});
app.get('/api/employees', (req, res) => {
  const rows = db.prepare('SELECT * FROM employees').all();
  res.json(rows);
});
app.listen(PORT, () => console.log('ERP on ' + PORT));
`;
  }
  if (type === 'messaging') {
    return base + `
app.get('/api/messages', (req, res) => {
  const rows = db.prepare('SELECT a.*, c.name as sender FROM activities a JOIN contacts c ON a.contact_id=c.id ORDER BY a.created_at DESC LIMIT 50').all();
  res.json(rows);
});
app.get('/api/contacts', (req, res) => {
  const rows = db.prepare('SELECT id, name, email, status FROM contacts').all();
  res.json(rows);
});
app.listen(PORT, () => console.log('Messaging on ' + PORT));
`;
  }
  return base + `app.listen(PORT);`;
}

// Platform HTML templates
function buildPlatformHTML(type, workerIP, port) {
  const base = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${type.toUpperCase()} Platform</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#0f1117;color:#e2e8f0;min-height:100vh}
.header{background:#1a1d2e;border-bottom:1px solid #2d3155;padding:12px 20px;display:flex;align-items:center;gap:12px}
.logo{font-weight:700;font-size:14px;color:#fff}.badge{background:#3b82f6;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px}
.container{padding:20px;max-width:1200px;margin:0 auto}
.grid{display:grid;gap:16px}
.card{background:#1a1d2e;border:1px solid #2d3155;border-radius:8px;padding:16px}
.card-title{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px}
.stat{font-size:28px;font-weight:700;color:#fff}
.stat-label{font-size:12px;color:#64748b}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;padding:8px 10px;border-bottom:1px solid #2d3155}
td{padding:8px 10px;border-bottom:1px solid #1e2235;color:#e2e8f0}
tr:hover{background:#1e2235}
.badge-sm{padding:2px 7px;border-radius:3px;font-size:10px;font-weight:600}
.high{background:#ef444422;color:#ef4444}
.medium{background:#f59e0b22;color:#f59e0b}
.low{background:#22c55e22;color:#22c55e}
.critical{background:#ef4444;color:#fff}
.open{background:#3b82f622;color:#3b82f6}
.resolved{background:#22c55e22;color:#22c55e}
.active{background:#22c55e22;color:#22c55e}
.prospect{background:#3b82f622;color:#3b82f6}
.customer{background:#a855f722;color:#a855f7}
</style></head>
<body>`;

  if (type === 'crm') {
    return base + `
<div class="header"><div class="logo">👥 CRM</div><div class="badge">Live</div></div>
<div class="container">
<div class="grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px" id="stats"></div>
<div class="grid" style="grid-template-columns:2fr 1fr">
<div class="card"><div class="card-title">Contacts</div><table><thead><tr><th>Name</th><th>Company</th><th>Role</th><th>Status</th></tr></thead><tbody id="contacts"></tbody></table></div>
<div class="card"><div class="card-title">Pipeline</div><div id="pipeline"></div></div>
</div></div>
<script>
async function load(){
  const [contacts,pipeline,activities]=await Promise.all([
    fetch('/api/contacts').then(r=>r.json()),
    fetch('/api/pipeline').then(r=>r.json()),
    fetch('/api/activities').then(r=>r.json())
  ]);
  const statusCounts={active:0,prospect:0,customer:0,churned:0};
  contacts.forEach(c=>statusCounts[c.status]=(statusCounts[c.status]||0)+1);
  document.getElementById('stats').innerHTML=Object.entries(statusCounts).map(([k,v])=>
    '<div class="card"><div class="stat">'+v+'</div><div class="stat-label">'+k+'</div></div>'
  ).join('');
  document.getElementById('contacts').innerHTML=contacts.map(c=>
    '<tr><td>'+c.name+'</td><td>'+c.company+'</td><td>'+c.role+'</td><td><span class="badge-sm '+c.status+'">'+c.status+'</span></td></tr>'
  ).join('');
  document.getElementById('pipeline').innerHTML=pipeline.map(p=>
    '<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>'+p.status+'</span><strong>'+p.count+'</strong></div><div style="background:#2d3155;border-radius:4px;height:8px"><div style="width:'+(p.count*10)+'%;height:100%;background:#3b82f6;border-radius:4px"></div></div></div>'
  ).join('');
}
load();setInterval(load,5000);
</script></body></html>`;
  }

  if (type === 'support') {
    return base + `
<div class="header"><div class="logo">🎫 Support</div><div class="badge">Live</div></div>
<div class="container">
<div class="grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px" id="stats"></div>
<div class="card"><div class="card-title">Ticket Queue</div>
<table><thead><tr><th>#</th><th>Subject</th><th>Contact</th><th>Priority</th><th>Status</th><th>Assignee</th></tr></thead><tbody id="tickets"></tbody></table>
</div></div>
<script>
async function load(){
  const [tickets,stats]=await Promise.all([fetch('/api/tickets').then(r=>r.json()),fetch('/api/stats').then(r=>r.json())]);
  document.getElementById('stats').innerHTML=[
    ['Open',stats.open,'#3b82f6'],['Critical',stats.critical,'#ef4444'],['Resolved',stats.resolved,'#22c55e'],['Avg Time',stats.avg_time,'#a855f7']
  ].map(([l,v,c])=>'<div class="card"><div class="stat" style="color:'+c+'">'+v+'</div><div class="stat-label">'+l+'</div></div>').join('');
  document.getElementById('tickets').innerHTML=tickets.map(t=>
    '<tr><td>#'+t.id+'</td><td>'+t.subject+'</td><td>'+t.contact_name+'</td><td><span class="badge-sm '+t.priority+'">'+t.priority+'</span></td><td><span class="badge-sm '+t.status+'">'+t.status+'</span></td><td>'+t.assignee+'</td></tr>'
  ).join('');
}
load();setInterval(load,5000);
</script></body></html>`;
  }

  if (type === 'analytics') {
    return base + `
<div class="header"><div class="logo">📊 Analytics</div><div class="badge">Live</div></div>
<div class="container">
<div class="grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px" id="kpis"></div>
<div class="grid" style="grid-template-columns:1fr 1fr">
<div class="card"><div class="card-title">Revenue Trend</div><div id="chart" style="height:180px;display:flex;align-items:flex-end;gap:4px;padding-top:10px"></div></div>
<div class="card"><div class="card-title">Top Products</div><div id="products"></div></div>
</div></div>
<script>
async function load(){
  const [summary,revenue,products]=await Promise.all([
    fetch('/api/summary').then(r=>r.json()),fetch('/api/revenue').then(r=>r.json()),fetch('/api/top-products').then(r=>r.json())
  ]);
  document.getElementById('kpis').innerHTML=[
    ['Total Revenue','$'+Number(summary.total_revenue).toLocaleString(),'#22c55e'],
    ['Open Tickets',summary.open_tickets,'#ef4444'],
    ['Active Contacts',summary.active_contacts,'#3b82f6'],
    ['Orders Today',summary.orders_today,'#a855f7'],
  ].map(([l,v,c])=>'<div class="card"><div class="stat" style="color:'+c+'">'+v+'</div><div class="stat-label">'+l+'</div></div>').join('');
  const maxR=Math.max(...revenue.map(r=>r.total),1);
  document.getElementById('chart').innerHTML=revenue.map(r=>
    '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:100%;background:#3b82f6;border-radius:4px 4px 0 0;height:'+(r.total/maxR*160)+'px"></div><div style="font-size:9px;color:#64748b;transform:rotate(-45deg)">'+r.day.slice(5)+'</div></div>'
  ).join('');
  document.getElementById('products').innerHTML=products.map(p=>
    '<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:13px">'+p.name+'</span><span style="font-size:12px;color:#22c55e">$'+Number(p.revenue).toLocaleString()+'</span></div><div style="background:#2d3155;border-radius:4px;height:6px"><div style="width:'+(p.revenue/products[0].revenue*100)+'%;height:100%;background:#3b82f6;border-radius:4px"></div></div></div>'
  ).join('');
}
load();setInterval(load,5000);
</script></body></html>`;
  }

  if (type === 'erp') {
    return base + `
<div class="header"><div class="logo">📦 ERP</div><div class="badge">Live</div></div>
<div class="container">
<div style="display:flex;gap:8px;margin-bottom:16px">
<button onclick="showTab('inventory')" id="tab-inventory" style="padding:8px 16px;background:#3b82f6;border:none;border-radius:4px;color:#fff;cursor:pointer;font-size:12px">Inventory</button>
<button onclick="showTab('orders')" id="tab-orders" style="padding:8px 16px;background:#2d3155;border:none;border-radius:4px;color:#fff;cursor:pointer;font-size:12px">Orders</button>
<button onclick="showTab('employees')" id="tab-employees" style="padding:8px 16px;background:#2d3155;border:none;border-radius:4px;color:#fff;cursor:pointer;font-size:12px">Employees</button>
</div>
<div id="inventory-tab" class="card"><div class="card-title">Inventory</div><table><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th></tr></thead><tbody id="products"></tbody></table></div>
<div id="orders-tab" class="card" style="display:none"><div class="card-title">Orders</div><table><thead><tr><th>ID</th><th>Customer</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th></tr></thead><tbody id="orders"></tbody></table></div>
<div id="employees-tab" class="card" style="display:none"><div class="card-title">Employees</div><table><thead><tr><th>Name</th><th>Dept</th><th>Role</th><th>Email</th></tr></thead><tbody id="employees"></tbody></table></div>
</div>
<script>
let activeTab='inventory';
function showTab(t){
  activeTab=t;
  ['inventory','orders','employees'].forEach(tab=>{
    document.getElementById(tab+'-tab').style.display=tab===t?'block':'none';
    document.getElementById('tab-'+tab).style.background=tab===t?'#3b82f6':'#2d3155';
  });
}
async function load(){
  if(activeTab==='inventory'){
    const p=await fetch('/api/products').then(r=>r.json());
    document.getElementById('products').innerHTML=p.map(pr=>'<tr><td>'+pr.name+'</td><td>'+pr.sku+'</td><td>'+pr.category+'</td><td>$'+pr.price+'</td><td style="color:'+(pr.stock<100?'#ef4444':'#22c55e')+'">'+pr.stock+'</td></tr>').join('');
  } else if(activeTab==='orders'){
    const o=await fetch('/api/orders').then(r=>r.json());
    document.getElementById('orders').innerHTML=o.map(or=>'<tr><td>#'+or.id+'</td><td>'+or.customer+'</td><td>'+or.product+'</td><td>'+or.quantity+'</td><td>$'+or.total+'</td><td>'+or.status+'</td></tr>').join('');
  } else {
    const e=await fetch('/api/employees').then(r=>r.json());
    document.getElementById('employees').innerHTML=e.map(em=>'<tr><td>'+em.name+'</td><td>'+em.dept+'</td><td>'+em.role+'</td><td>'+em.email+'</td></tr>').join('');
  }
}
load();setInterval(load,5000);
</script></body></html>`;
  }

  if (type === 'messaging') {
    return base + `
<div class="header"><div class="logo">💬 Messaging</div><div class="badge">Live</div></div>
<div style="display:flex;height:calc(100vh - 53px)">
<div style="width:220px;background:#1a1d2e;border-right:1px solid #2d3155;overflow-y:auto;padding:12px">
<div style="font-size:11px;color:#64748b;text-transform:uppercase;margin-bottom:8px">Contacts</div>
<div id="contacts"></div></div>
<div style="flex:1;display:flex;flex-direction:column">
<div style="flex:1;overflow-y:auto;padding:16px" id="messages"></div>
</div></div>
<script>
async function load(){
  const [msgs,contacts]=await Promise.all([fetch('/api/messages').then(r=>r.json()),fetch('/api/contacts').then(r=>r.json())]);
  document.getElementById('contacts').innerHTML=contacts.map(c=>'<div style="padding:8px;border-radius:6px;cursor:pointer;margin-bottom:4px;display:flex;align-items:center;gap:8px"><div style="width:32px;height:32px;background:#3b82f633;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#3b82f6">'+c.name[0]+'</div><div><div style="font-size:13px">'+c.name+'</div><div style="font-size:11px;color:#64748b">'+c.status+'</div></div></div>').join('');
  document.getElementById('messages').innerHTML=msgs.map(m=>'<div style="margin-bottom:12px;display:flex;gap:10px;align-items:flex-start"><div style="width:32px;height:32px;background:#3b82f633;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#3b82f6">'+m.sender[0]+'</div><div><div style="font-size:12px;color:#64748b;margin-bottom:4px">'+m.sender+' · '+m.type+'</div><div style="background:#1e2235;padding:10px 14px;border-radius:8px;font-size:13px">'+m.description+'</div></div></div>').join('');
}
load();setInterval(load,5000);
</script></body></html>`;
  }
  return base + `<div class="container"><div class="card"><p>Platform loading...</p></div></div></body></html>`;
}

// POST /demo/build-platforms
app.post('/demo/build-platforms', async (req, res) => {
  const { sessionId, platforms, realClient } = req.body;
  if (!sessionId || !platforms || !platforms.length) return res.status(400).json({ error: 'sessionId + platforms required' });

  const sessions = loadDemoSessions();
  const session = sessions[sessionId];
  if (!session) return res.status(404).json({ error: 'session not found' });

  // Init DB on worker
  const dbDir = DEMO_DB_ROOT + '/' + sessionId;
  const dbPath = dbDir + '/shared.sqlite';
  try {
    sshRun(SANDBOX_WORKER, 'mkdir -p ' + dbDir);
    sshRun(SANDBOX_WORKER, 'apt-get install -y sqlite3 > /dev/null 2>&1 || true');
    const seedSQL = buildSeedSQL(sessionId);
    sshWriteFile(SANDBOX_WORKER, dbDir + '/seed.sql', seedSQL);
    sshRun(SANDBOX_WORKER, 'sqlite3 ' + dbPath + ' < ' + dbDir + '/seed.sql');
    // Upsert real client if provided
    if (realClient && (realClient.name || realClient.email)) {
      const upsertSQL = "INSERT OR REPLACE INTO contacts (id,name,email,phone,company,role,status,created_at) VALUES (1,'" +
        (realClient.name||'Real Client').replace(/'/g,"''") + "','" +
        (realClient.email||'').replace(/'/g,"''") + "','" +
        (realClient.phone||'').replace(/'/g,"''") + "','Real Client','Contact','active',datetime('now'));";
      sshRun(SANDBOX_WORKER, 'sqlite3 ' + dbPath + ' "' + upsertSQL + '"');
    }
  } catch(e) {
    console.error('DB init error:', e.message);
    return res.json({ error: 'DB init failed: ' + e.message });
  }

  const builtPlatforms = [];
  for (const p of platforms) {
    const sbId = 'sbx-demo-' + sessionId + '-' + p.id;
    const port = nextSandboxPort();
    const sbDir = '/opt/sandboxes/' + sbId;

    try {
      sshRun(SANDBOX_WORKER, 'mkdir -p ' + sbDir + '/public');
      sshRun(SANDBOX_WORKER, 'cd ' + sbDir + ' && npm install express better-sqlite3 2>&1 | tail -5');

      const serverJS = buildPlatformServerJS(p.id, sessionId, port);
      sshWriteFile(SANDBOX_WORKER, sbDir + '/server.js', serverJS);
      const html = buildPlatformHTML(p.id, SANDBOX_WORKER, port);
      sshWriteFile(SANDBOX_WORKER, sbDir + '/public/index.html', html);

      // Syntax check
      try { sshRun(SANDBOX_WORKER, 'node --check ' + sbDir + '/server.js 2>&1'); } catch(se) {
        console.error('Syntax error in', p.id, se.message);
      }

      sshRun(SANDBOX_WORKER, 'fuser -k ' + port + '/tcp 2>/dev/null || true');
      sshRun(SANDBOX_WORKER, "nohup bash -c 'cd " + sbDir + " && PORT=" + port + " node server.js >> " + sbDir + "/app.log 2>&1' > /dev/null 2>&1 &");
      await new Promise(r => setTimeout(r, 2000));

      const url = 'http://' + SANDBOX_WORKER + ':' + port;
      const platform = {
        id: p.id,
        name: p.name,
        sandboxId: sbId,
        url,
        port,
        status: 'deployed',
      };
      builtPlatforms.push(platform);

      // Register in sandboxes file
      const sbs = loadSandboxes();
      sbs[sbId] = { id: sbId, port, title: p.name + ' (' + sessionId + ')', status: 'deployed', worker_ip: SANDBOX_WORKER, url, messages: [], log: [], files: {}, suggested_workers: [], created_at: new Date().toISOString() };
      saveSandboxes(sbs);
    } catch(e) {
      console.error('Build error for', p.id, e.message);
      builtPlatforms.push({ id: p.id, name: p.name, status: 'error', error: e.message });
    }
  }

  sessions[sessionId].platforms = builtPlatforms;
  sessions[sessionId].phase = 'platforms';
  sessions[sessionId].realClient = realClient || null;
  saveDemoSessions(sessions);

  res.json({ ok: true, platforms: builtPlatforms });
});

// POST /demo/platforms/:id/chat
app.post('/demo/platforms/:id/chat', async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  const sbId = req.params.id;
  const sbs = loadSandboxes();
  if (!sbs[sbId]) return res.status(404).json({ error: 'sandbox not found' });

  // Delegate to existing sandbox chat
  const fakeSb = sbs[sbId];
  fakeSb.messages = fakeSb.messages || [];
  fakeSb.messages.push({ role: 'user', content: message });
  sbs[sbId] = fakeSb;
  saveSandboxes(sbs);

  // Call Claude to modify the platform
  const isOAuth = ANTHROPIC_KEY().startsWith('sk-ant-oat');
  const authHeaders = isOAuth
    ? { 'Authorization': 'Bearer ' + ANTHROPIC_KEY(), 'anthropic-beta': 'oauth-2025-04-20' }
    : { 'x-api-key': ANTHROPIC_KEY() };

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'anthropic-version': '2023-06-01', ...authHeaders },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: 'You are a platform agent for sandbox ' + sbId + ' running on port ' + fakeSb.port + '. When asked to modify the platform, use write_file to update files and bash to apply changes. The sandbox is at /opt/sandboxes/' + sbId + '. Keep changes minimal and working.',
        tools: [
          { name: 'write_file', description: 'Write file to sandbox', input_schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path','content'] } },
          { name: 'bash', description: 'Run bash command', input_schema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } },
        ],
        messages: fakeSb.messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-10),
      }),
    });
    const data = await resp.json();
    let responseText = '';
    const toolResults = [];

    for (const block of (data.content || [])) {
      if (block.type === 'text') responseText = block.text;
      if (block.type === 'tool_use') {
        let result = '';
        try {
          if (block.name === 'write_file') {
            sshWriteFile(SANDBOX_WORKER, '/opt/sandboxes/' + sbId + '/' + block.input.path, block.input.content);
            result = 'Written: ' + block.input.path;
          } else if (block.name === 'bash') {
            result = sshRun(SANDBOX_WORKER, 'cd /opt/sandboxes/' + sbId + ' && ' + block.input.command + ' 2>&1').slice(0, 500);
          }
        } catch(e) { result = 'Error: ' + e.message; }
        toolResults.push({ tool: block.name, result });
      }
    }

    const freshSbs = loadSandboxes();
    if (freshSbs[sbId]) {
      freshSbs[sbId].messages.push({ role: 'assistant', content: responseText });
      saveSandboxes(freshSbs);
    }

    res.json({ ok: true, message: responseText || 'Done.', toolResults });
  } catch(e) {
    res.json({ ok: false, error: e.message, message: 'Error: ' + e.message });
  }
});

// POST /demo/workers/propose
app.post('/demo/workers/propose', async (req, res) => {
  const { sessionId, platforms } = req.body;
  const session = demoSession(sessionId);

  const workers = [
    {
      id: 'w-' + sessionId + '-telegram',
      name: 'High-Value Transaction Alert',
      description: 'Send Telegram alert when a transaction exceeds $500',
      trigger: 'transaction.amount > 500',
      action: 'Telegram message to group',
      actionType: 'telegram',
      sourcePlatform: 'Analytics',
      outcome: 'Telegram alert sent',
      schedule: 'Every 60s',
      template: '🤖 Worker: High-Value Transaction Alert\n📊 Trigger: transaction ${{amount}} > $500\n✅ Status: Alert sent',
      status: 'proposed',
    },
    {
      id: 'w-' + sessionId + '-ticket',
      name: 'Critical Ticket Escalation',
      description: 'Send Telegram alert when a critical priority ticket is created',
      trigger: 'ticket.priority = critical',
      action: 'Telegram message to group',
      actionType: 'telegram',
      sourcePlatform: 'Support',
      outcome: 'Team notified via Telegram',
      schedule: 'Every 30s',
      template: '🚨 Critical Ticket: {{subject}}\n👤 Contact: {{contact}}\n⏰ Created: {{time}}',
      status: 'proposed',
    },
    {
      id: 'w-' + sessionId + '-lowstock',
      name: 'Low Stock Alert',
      description: 'Notify when product stock falls below reorder threshold',
      trigger: 'product.stock < 100',
      action: 'Telegram alert',
      actionType: 'telegram',
      sourcePlatform: 'ERP',
      outcome: 'Stock alert sent',
      schedule: 'Every 5min',
      template: '📦 Low Stock Alert\nProduct: {{name}}\nStock: {{stock}} units\nSKU: {{sku}}',
      status: 'proposed',
    },
    {
      id: 'w-' + sessionId + '-contact',
      name: 'Contact Activity Follow-up',
      description: 'Alert when a contact has no activity for 7+ days',
      trigger: 'last_activity > 7 days ago',
      action: 'Telegram reminder',
      actionType: 'telegram',
      sourcePlatform: 'CRM',
      outcome: 'Follow-up reminder sent',
      schedule: 'Daily at 9am',
      template: '📞 Follow-up Needed\nContact: {{name}}\nLast Activity: {{days}} days ago\nStatus: {{status}}',
      status: 'proposed',
    },
  ];

  if (sessionId) {
    const sessions = loadDemoSessions();
    if (sessions[sessionId]) {
      sessions[sessionId].workers = workers;
      sessions[sessionId].phase = 'workers';
      saveDemoSessions(sessions);
    }
  }

  res.json({ ok: true, workers });
});

// POST /demo/workers/deploy
app.post('/demo/workers/deploy', async (req, res) => {
  const { sessionId, worker, realClient } = req.body;
  if (!sessionId || !worker) return res.status(400).json({ error: 'sessionId + worker required' });

  const dbPath = DEMO_DB_ROOT + '/' + sessionId + '/shared.sqlite';
  const logPath = DEMO_DB_ROOT + '/' + sessionId + '/worker-' + worker.id + '.log';
  const scriptPath = '/opt/demo-db/' + sessionId + '/worker-' + worker.id + '.js';

  let workerScript = '';

  if (worker.actionType === 'telegram') {
    const templateLines = (worker.template || '').replace(/'/g, "\\'").replace(/\n/g, '\\n');

    if (worker.id.includes('-telegram')) {
      // High-value transaction alert
      workerScript = `const Database = require('better-sqlite3');
const https = require('https');
function tg(msg) {
  const body = JSON.stringify({ chat_id: '${TELEGRAM_CHAT}', text: msg, parse_mode: 'Markdown' });
  const opts = { hostname: 'api.telegram.org', path: '/bot${TELEGRAM_TOKEN()}/sendMessage', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } };
  const r = https.request(opts); r.on('error', ()=>{}); r.write(body); r.end();
}
function log(entry) {
  const fs = require('fs');
  fs.appendFileSync('${logPath}', JSON.stringify({...entry, at: new Date().toISOString()}) + '\\n');
}
function check() {
  try {
    const db = new Database('${dbPath}', {readonly:true});
    const rows = db.prepare("SELECT t.*, c.name as contact_name, c.phone FROM transactions t JOIN contacts c ON t.contact_id=c.id WHERE t.amount > 500 AND t.status='completed' AND datetime(t.created_at) > datetime('now','-5 minutes')").all();
    db.close();
    rows.forEach(t => {
      const msg = '🤖 *Worker: High-Value Transaction Alert*\\n📊 *Trigger:* transaction $' + t.amount + ' > $500\\n👤 *Contact:* ' + t.contact_name + '\\n✅ *Status:* Alert sent';
      tg(msg);
      log({ success: true, message: 'Sent alert for transaction $' + t.amount, trigger: 'amount > 500' });
    });
    if (!rows.length) log({ success: true, message: 'Checked: no new high-value transactions', trigger: 'amount > 500' });
  } catch(e) { log({ success: false, message: e.message }); }
}
check();
setInterval(check, 60000);
console.log('Worker started: High-Value Transaction Alert');
`;
    } else if (worker.id.includes('-ticket')) {
      workerScript = `const Database = require('better-sqlite3');
const https = require('https');
function tg(msg) {
  const body = JSON.stringify({ chat_id: '${TELEGRAM_CHAT}', text: msg, parse_mode: 'Markdown' });
  const opts = { hostname: 'api.telegram.org', path: '/bot${TELEGRAM_TOKEN()}/sendMessage', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } };
  const r = https.request(opts); r.on('error', ()=>{}); r.write(body); r.end();
}
function log(entry) {
  const fs = require('fs');
  fs.appendFileSync('${logPath}', JSON.stringify({...entry, at: new Date().toISOString()}) + '\\n');
}
function check() {
  try {
    const db = new Database('${dbPath}', {readonly:true});
    const rows = db.prepare("SELECT t.*, c.name as contact_name FROM tickets t JOIN contacts c ON t.contact_id=c.id WHERE t.priority='critical' AND t.status='open' AND datetime(t.created_at) > datetime('now','-5 minutes')").all();
    db.close();
    rows.forEach(t => {
      const msg = '🚨 *Critical Ticket Alert*\\n🎫 *Subject:* ' + t.subject + '\\n👤 *Contact:* ' + t.contact_name + '\\n⏰ *Created:* ' + t.created_at;
      tg(msg);
      log({ success: true, message: 'Alert sent for ticket: ' + t.subject, trigger: 'priority=critical' });
    });
    if (!rows.length) log({ success: true, message: 'Checked: no new critical tickets', trigger: 'priority=critical' });
  } catch(e) { log({ success: false, message: e.message }); }
}
check();
setInterval(check, 30000);
console.log('Worker started: Critical Ticket Escalation');
`;
    } else if (worker.id.includes('-lowstock')) {
      workerScript = `const Database = require('better-sqlite3');
const https = require('https');
function tg(msg) {
  const body = JSON.stringify({ chat_id: '${TELEGRAM_CHAT}', text: msg, parse_mode: 'Markdown' });
  const opts = { hostname: 'api.telegram.org', path: '/bot${TELEGRAM_TOKEN()}/sendMessage', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } };
  const r = https.request(opts); r.on('error', ()=>{}); r.write(body); r.end();
}
function log(entry) {
  const fs = require('fs');
  fs.appendFileSync('${logPath}', JSON.stringify({...entry, at: new Date().toISOString()}) + '\\n');
}
let alerted = new Set();
function check() {
  try {
    const db = new Database('${dbPath}', {readonly:true});
    const rows = db.prepare("SELECT * FROM products WHERE stock < 100").all();
    db.close();
    rows.forEach(p => {
      if (!alerted.has(p.id)) {
        alerted.add(p.id);
        const msg = '📦 *Low Stock Alert*\\nProduct: ' + p.name + '\\nStock: ' + p.stock + ' units\\nSKU: ' + p.sku;
        tg(msg);
        log({ success: true, message: 'Low stock alert: ' + p.name + ' (' + p.stock + ')', trigger: 'stock < 100' });
      }
    });
    if (!rows.length) log({ success: true, message: 'All stock levels OK', trigger: 'stock < 100' });
  } catch(e) { log({ success: false, message: e.message }); }
}
check();
setInterval(check, 300000);
console.log('Worker started: Low Stock Alert');
`;
    } else {
      workerScript = `const Database = require('better-sqlite3');
const https = require('https');
function tg(msg) {
  const body = JSON.stringify({ chat_id: '${TELEGRAM_CHAT}', text: msg, parse_mode: 'Markdown' });
  const opts = { hostname: 'api.telegram.org', path: '/bot${TELEGRAM_TOKEN()}/sendMessage', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } };
  const r = https.request(opts); r.on('error', ()=>{}); r.write(body); r.end();
}
function log(entry) {
  const fs = require('fs');
  fs.appendFileSync('${logPath}', JSON.stringify({...entry, at: new Date().toISOString()}) + '\\n');
}
function check() {
  try {
    const db = new Database('${dbPath}', {readonly:true});
    const rows = db.prepare("SELECT c.*, MAX(a.created_at) as last_act FROM contacts c LEFT JOIN activities a ON a.contact_id=c.id GROUP BY c.id HAVING last_act IS NULL OR julianday('now') - julianday(last_act) > 7").all();
    db.close();
    if (rows.length) {
      const msg = '📞 *Follow-up Needed*\\n' + rows.slice(0,3).map(c => '• ' + c.name + ' (' + c.status + ')').join('\\n');
      tg(msg);
      log({ success: true, message: rows.length + ' contacts need follow-up', trigger: 'last_activity > 7 days' });
    } else {
      log({ success: true, message: 'All contacts have recent activity', trigger: 'last_activity > 7 days' });
    }
  } catch(e) { log({ success: false, message: e.message }); }
}
check();
console.log('Worker started: Contact Follow-up');
`;
    }
  }

  if (!workerScript) {
    return res.json({ ok: false, error: 'Unsupported worker type' });
  }

  try {
    sshWriteFile(SANDBOX_WORKER, scriptPath, workerScript);
    sshRun(SANDBOX_WORKER, 'cd ' + DEMO_DB_ROOT + '/' + sessionId + ' && npm install better-sqlite3 2>&1 | tail -3 || true');
    sshRun(SANDBOX_WORKER, 'touch ' + logPath);
    sshRun(SANDBOX_WORKER, 'nohup node ' + scriptPath + ' > ' + logPath + '.out 2>&1 &');

    const sessions = loadDemoSessions();
    if (sessions[sessionId]) {
      const wIdx = (sessions[sessionId].workers || []).findIndex(w => w.id === worker.id);
      if (wIdx >= 0) sessions[sessionId].workers[wIdx].status = 'deployed';
      saveDemoSessions(sessions);
    }

    res.json({ ok: true, status: 'deployed', message: 'Worker deployed and running on worker-1.' });
  } catch(e) {
    res.json({ ok: false, status: 'error', error: e.message });
  }
});

// POST /demo/workers/:id/run
app.post('/demo/workers/:id/run', async (req, res) => {
  const { sessionId } = req.body;
  const workerId = req.params.id;
  // Find session
  const sessions = loadDemoSessions();
  let session = null;
  if (sessionId) { session = sessions[sessionId]; }
  if (!session) {
    // search all sessions
    session = Object.values(sessions).find(s => (s.workers||[]).some(w => w.id === workerId));
  }
  if (!session) return res.status(404).json({ error: 'session not found' });

  const worker = (session.workers||[]).find(w => w.id === workerId);
  if (!worker) return res.status(404).json({ error: 'worker not found' });

  const scriptPath = '/opt/demo-db/' + session.id + '/worker-' + workerId + '.js';
  const logPath = '/opt/demo-db/' + session.id + '/worker-' + workerId + '.log';

  // Send Telegram notification directly for demo
  const msg = '🤖 *Worker Triggered Manually*\\n📋 *Name:* ' + worker.name + '\\n📊 *Trigger:* ' + worker.trigger + '\\n⏰ *Time:* ' + new Date().toISOString();
  const body = JSON.stringify({ chat_id: TELEGRAM_CHAT, text: msg, parse_mode: 'Markdown' });

  const result = { triggered: true, at: new Date().toISOString(), message: worker.name + ' triggered' };
  try {
    sshRun(SANDBOX_WORKER, "curl -s -X POST 'https://api.telegram.org/bot" + TELEGRAM_TOKEN() + "/sendMessage' -H 'Content-Type: application/json' -d '" + JSON.stringify({ chat_id: TELEGRAM_CHAT, text: '🤖 Worker Triggered: ' + worker.name + '\nTrigger: ' + worker.trigger, parse_mode: 'Markdown' }).replace(/'/g, "'\\''") + "' > /dev/null 2>&1 || true");
    sshRun(SANDBOX_WORKER, 'echo \'' + JSON.stringify({ success: true, message: 'Manual trigger: ' + worker.name, at: new Date().toISOString() }) + '\' >> ' + logPath);
    result.result = 'Telegram notification sent. Check the group.';
  } catch(e) { result.result = 'Error: ' + e.message; }

  res.json(result);
});

// GET /demo/workers/:id/logs
app.get('/demo/workers/:id/logs', (req, res) => {
  const { sessionId } = req.query;
  const workerId = req.params.id;
  const sessions = loadDemoSessions();
  let session = sessionId ? sessions[sessionId] : Object.values(sessions).find(s => (s.workers||[]).some(w => w.id === workerId));
  if (!session) return res.json({ logs: [] });

  const logPath = '/opt/demo-db/' + session.id + '/worker-' + workerId + '.log';
  try {
    const raw = sshRun(SANDBOX_WORKER, 'cat ' + logPath + ' 2>/dev/null || echo ""');
    const logs = raw.split('\n').filter(l => l.trim()).map(l => { try { return JSON.parse(l); } catch { return { message: l }; } });
    res.json({ logs: logs.slice(-50) });
  } catch(e) {
    res.json({ logs: [] });
  }
});

// POST /demo/workers/:id/config
app.post('/demo/workers/:id/config', (req, res) => {
  const { sessionId, config } = req.body;
  const sessions = loadDemoSessions();
  const session = sessions[sessionId];
  if (!session) return res.status(404).json({ error: 'session not found' });
  const wIdx = (session.workers||[]).findIndex(w => w.id === req.params.id);
  if (wIdx >= 0) {
    session.workers[wIdx] = { ...session.workers[wIdx], ...config };
    saveDemoSessions(sessions);
  }
  res.json({ ok: true });
});

