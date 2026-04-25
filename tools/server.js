/**
 * SMT School ERP — Local Dev Tools Runner
 * Run with: node tools/server.js  (or: npm run tools)
 * Open:     http://localhost:3001
 *
 * Zero external dependencies — uses only Node.js built-ins.
 */

const http = require('http')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const PORT = 3001
const ROOT = path.join(__dirname, '..')
const HTML = path.join(__dirname, 'index.html')

// ── Task Definitions ──────────────────────────────────────────────────────────
// Add new tasks here. cmd/args run in ROOT directory with shell: true.
const TASKS = {
  // Tests
  'test:all': {
    label: 'Run All Tests',
    desc: 'Server unit tests + client unit tests',
    group: 'tests',
    cmd: 'npm',
    args: ['test'],
  },
  'test:server': {
    label: 'Server Unit Tests',
    desc: 'Jest tests in server/tests/',
    group: 'tests',
    cmd: 'npm',
    args: ['run', 'test:server'],
  },
  'test:client': {
    label: 'Client Unit Tests',
    desc: 'React Testing Library tests',
    group: 'tests',
    cmd: 'npm',
    args: ['run', 'test:client'],
  },
  'test:e2e': {
    label: 'E2E Tests (Playwright)',
    desc: 'Full browser end-to-end tests',
    group: 'tests',
    cmd: 'npm',
    args: ['run', 'test:e2e'],
  },
  'test:coverage': {
    label: 'Coverage Report',
    desc: 'Tests with Istanbul coverage',
    group: 'tests',
    cmd: 'npm',
    args: ['run', 'test:coverage'],
  },

  // Code Quality
  lint: {
    label: 'Lint Code',
    desc: 'ESLint on server/ and client/src/',
    group: 'quality',
    cmd: 'npm',
    args: ['run', 'lint'],
  },
  'lint:fix': {
    label: 'Lint + Auto-fix',
    desc: 'ESLint with --fix flag',
    group: 'quality',
    cmd: 'npm',
    args: ['run', 'lint:fix'],
  },
  format: {
    label: 'Format (Prettier)',
    desc: 'Reformat all source files',
    group: 'quality',
    cmd: 'npm',
    args: ['run', 'format'],
  },
  'format:check': {
    label: 'Check Formatting',
    desc: 'Verify Prettier compliance (no writes)',
    group: 'quality',
    cmd: 'npm',
    args: ['run', 'format:check'],
  },

  // Security
  audit: {
    label: 'Security Audit',
    desc: 'npm audit — show all vulnerabilities',
    group: 'security',
    cmd: 'npm',
    args: ['audit'],
  },
  'audit:fix': {
    label: 'Audit + Fix',
    desc: 'npm audit fix — auto-resolve safe fixes',
    group: 'security',
    cmd: 'npm',
    args: ['audit', 'fix'],
  },
  outdated: {
    label: 'Check Outdated Packages',
    desc: 'Show packages with newer versions',
    group: 'security',
    cmd: 'npm',
    args: ['outdated'],
  },

  // Build
  build: {
    label: 'Build Client',
    desc: 'Production build of React app',
    group: 'build',
    cmd: 'npm',
    args: ['run', 'build'],
  },
  'build:analyze': {
    label: 'Analyze Bundle',
    desc: 'Build with source-map-explorer',
    group: 'build',
    cmd: 'npm',
    args: ['run', 'build:analyze'],
  },

  // Database
  seed: {
    label: 'Seed Database',
    desc: 'Create default admin/teacher/parent users',
    group: 'database',
    cmd: 'npm',
    args: ['run', 'seed'],
  },
  'db:check': {
    label: 'Check DB Connection',
    desc: 'Verify MongoDB is reachable',
    group: 'database',
    cmd: 'node',
    args: ['-e', "require('dotenv').config(); const m=require('mongoose'); m.connect(process.env.MONGODB_URI||'mongodb://localhost/smt-school').then(()=>{console.log('✓ Connected');m.disconnect()}).catch(e=>process.exit(1))"],
  },

  // Deploy & Git
  'deploy': {
    label: 'Commit & Deploy',
    desc: 'Stage all → commit → push to main → Railway auto-deploys',
    group: 'deploy',
    needsMessage: true,
    shellCmd: (p) => {
      const msg = (p.message || 'chore: update').replace(/"/g, '\\"')
      return `git add -A && git commit -m "${msg}" && git push origin main`
    },
  },
  'git:push': {
    label: 'Push Only',
    desc: 'Push existing commits to origin/main (no new commit)',
    group: 'deploy',
    cmd: 'git',
    args: ['push', 'origin', 'main'],
  },
  'git:status': {
    label: 'Git Status',
    desc: 'Show staged and unstaged changes',
    group: 'deploy',
    cmd: 'git',
    args: ['status', '-v'],
  },
  'git:diff': {
    label: 'Show Diff',
    desc: 'Unstaged changes (stat summary)',
    group: 'deploy',
    cmd: 'git',
    args: ['diff', '--stat'],
  },
  'git:log': {
    label: 'Recent Commits',
    desc: 'Last 15 commits on current branch',
    group: 'deploy',
    cmd: 'git',
    args: ['log', '--oneline', '--graph', '-15'],
  },
  'git:pull': {
    label: 'Pull Latest',
    desc: 'Pull latest changes from origin/main',
    group: 'deploy',
    cmd: 'git',
    args: ['pull', 'origin', 'main'],
  },
  'gh:pr:list': {
    label: 'List Open PRs',
    desc: 'Show open pull requests on GitHub',
    group: 'deploy',
    cmd: 'gh',
    args: ['pr', 'list'],
  },
  'gh:run:list': {
    label: 'CI Status',
    desc: 'Show recent GitHub Actions runs',
    group: 'deploy',
    cmd: 'gh',
    args: ['run', 'list', '--limit', '8'],
  },
}

// ── In-memory task store ──────────────────────────────────────────────────────
const taskHistory = [] // last 20 runs
const activeStreams = new Map() // taskId → { lines[], status, proc, name, startedAt }

function startTask(name, params = {}) {
  const def = TASKS[name]
  if (!def) return null

  const id = `${name.replace(/:/g, '-')}-${Date.now()}`
  const entry = {
    id,
    name,
    label: def.label,
    lines: [],
    status: 'running',
    exitCode: null,
    startedAt: Date.now(),
    endedAt: null,
  }

  activeStreams.set(id, entry)

  const spawnOpts = { cwd: ROOT, shell: true, env: { ...process.env, FORCE_COLOR: '0', CI: 'true' } }
  const proc = def.shellCmd
    ? spawn(def.shellCmd(params), [], spawnOpts)
    : spawn(def.cmd, def.args, spawnOpts)

  entry.proc = proc

  proc.stdout.on('data', (d) => entry.lines.push({ t: 'out', s: d.toString() }))
  proc.stderr.on('data', (d) => entry.lines.push({ t: 'err', s: d.toString() }))

  proc.on('close', (code) => {
    entry.status = code === 0 ? 'success' : 'failed'
    entry.exitCode = code
    entry.endedAt = Date.now()
    entry.proc = null

    taskHistory.unshift({ id, name, label: def.label, status: entry.status, exitCode: code, duration: entry.endedAt - entry.startedAt, endedAt: entry.endedAt })
    if (taskHistory.length > 20) taskHistory.pop()
  })

  proc.on('error', (err) => {
    entry.lines.push({ t: 'err', s: `Failed to start: ${err.message}\nIs the npm script defined in package.json?\n` })
    entry.status = 'failed'
    entry.exitCode = -1
    entry.endedAt = Date.now()
  })

  return id
}

// ── HTTP Server ───────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  // CORS (tools page only, localhost only)
  res.setHeader('Access-Control-Allow-Origin', `http://localhost:${PORT}`)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.end()

  // Serve index.html
  if (req.method === 'GET' && url.pathname === '/') {
    fs.readFile(HTML, (err, data) => {
      if (err) { res.writeHead(404); return res.end('tools/index.html not found') }
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(data)
    })
    return
  }

  // List task definitions
  if (req.method === 'GET' && url.pathname === '/tasks') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    const out = Object.entries(TASKS).reduce((acc, [k, v]) => {
      acc[k] = { label: v.label, desc: v.desc, group: v.group, needsMessage: v.needsMessage || false }
      return acc
    }, {})
    return res.end(JSON.stringify(out))
  }

  // Task history
  if (req.method === 'GET' && url.pathname === '/history') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify(taskHistory))
  }

  // Start a task
  if (req.method === 'POST' && url.pathname.startsWith('/run/')) {
    const name = url.pathname.replace('/run/', '')
    if (!TASKS[name]) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: `Unknown task: ${name}` }))
    }
    let body = ''
    req.on('data', (d) => { body += d })
    req.on('end', () => {
      let params = {}
      try { params = body ? JSON.parse(body) : {} } catch (_) {}
      const id = startTask(name, params)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ id, name, label: TASKS[name].label }))
    })
    return
  }

  // Stop a running task
  if (req.method === 'POST' && url.pathname.startsWith('/stop/')) {
    const id = url.pathname.replace('/stop/', '')
    const entry = activeStreams.get(id)
    if (entry && entry.proc) {
      entry.proc.kill('SIGTERM')
      entry.status = 'cancelled'
      entry.endedAt = Date.now()
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ok: true }))
  }

  // SSE stream for task output
  if (req.method === 'GET' && url.pathname.startsWith('/stream/')) {
    const id = url.pathname.replace('/stream/', '')
    const entry = activeStreams.get(id)
    if (!entry) {
      res.writeHead(404)
      return res.end('Task not found')
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })
    res.write(':ok\n\n') // SSE keep-alive

    let sent = 0

    const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)

    const tick = setInterval(() => {
      while (sent < entry.lines.length) {
        send(entry.lines[sent++])
      }
      if (entry.status !== 'running') {
        send({ t: 'done', status: entry.status, code: entry.exitCode, duration: entry.endedAt - entry.startedAt })
        clearInterval(tick)
        res.end()
      }
    }, 80)

    req.on('close', () => clearInterval(tick))
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

server.listen(PORT, () => {
  console.log(`\n  SMT School ERP — Dev Tools`)
  console.log(`  Open: http://localhost:${PORT}\n`)
})
