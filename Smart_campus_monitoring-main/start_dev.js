#!/usr/bin/env node

/**
 * Smart Campus Development Orchestrator
 * Starts all three core services concurrently with zero external dependencies:
 *  - Main Backend:     http://localhost:5000
 *  - AI Assistant:     http://localhost:5005
 *  - Frontend (Vite):  http://localhost:5173
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const net = require('net');
const path = require('path');

// Colors for labeled console output
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';

const SERVICES = [
  {
    name: 'Main Backend',
    prefix: `${BLUE}[Main Backend]${RESET} `,
    port: 5000,
    checkUrl: 'http://127.0.0.1:5000/',
    command: 'node',
    args: ['backend/server.js'],
    cwd: __dirname,
    ready: false
  },
  {
    name: 'AI Assistant',
    prefix: `${MAGENTA}[AI Assistant]${RESET} `,
    port: 5005,
    checkUrl: 'http://127.0.0.1:5005/api/health',
    command: 'node',
    args: ['server.js'],
    cwd: path.join(__dirname, 'ai-assistant', 'backend'),
    ready: false
  },
  {
    name: 'Frontend',
    prefix: `${CYAN}[Frontend]    ${RESET} `,
    port: 5173,
    checkUrl: 'http://127.0.0.1:5173/',
    command: 'npx',
    args: ['vite', '--port', '5173'],
    cwd: path.join(__dirname, 'frontend'),
    ready: false
  }
];

const children = [];
let isShuttingDown = false;

// 1. Verify Port Availability
function checkPortFree(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;

    socket.setTimeout(300);
    socket.once('connect', () => {
      isConnected = true;
      socket.destroy();
      resolve(false); // Port is in use!
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve(true); // Nobody responded within timeout
    });

    socket.once('error', () => {
      // Connection refused means nobody is listening on this port
      resolve(true);
    });

    socket.connect(port, '127.0.0.1');
  });
}

// 2. Line-buffered Log Streamer
function streamOutput(stream, prefix) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep last incomplete line
    for (const line of lines) {
      const trimmed = line.replace(/\r$/, '');
      if (trimmed.length > 0) {
        process.stdout.write(`${prefix}${trimmed}\n`);
      }
    }
  });
}

// 3. Graceful Shutdown
function killProcess(proc) {
  if (!proc || !proc.pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
    } else {
      proc.kill('SIGTERM');
    }
  } catch (e) {
    // Process already terminated
  }
}

function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n${YELLOW}[Orchestrator] Shutting down all services cleanly...${RESET}`);

  for (const child of children) {
    killProcess(child.process);
  }

  setTimeout(() => {
    process.exit(0);
  }, 500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// 4. Poll readiness
function pollServiceReadiness(service, onReady) {
  const start = Date.now();
  const interval = setInterval(() => {
    if (isShuttingDown || service.ready) {
      clearInterval(interval);
      return;
    }

    const req = http.get(service.checkUrl, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        service.ready = true;
        clearInterval(interval);
        console.log(`${GREEN}✔ ${service.name} is ready on port ${service.port}${RESET}`);
        onReady();
      }
    });

    req.on('error', () => {
      // Still initializing
    });

    req.setTimeout(800, () => {
      req.destroy();
    });

    if (Date.now() - start > 30000) {
      clearInterval(interval);
      console.warn(`${YELLOW}⚠ ${service.name} readiness probe timed out after 30s.${RESET}`);
    }
  }, 350);
}

// 5. Main Execution
async function main() {
  console.log(`\n${BOLD}============================================================${RESET}`);
  console.log(`${BOLD}       Smart Campus Environment Management Orchestrator     ${RESET}`);
  console.log(`${BOLD}============================================================${RESET}`);

  // Step 1: Pre-flight port verification
  console.log(`${YELLOW}🔍 Checking port availability (5000, 5005, 5173)...${RESET}`);
  const occupied = [];
  for (const s of SERVICES) {
    const isFree = await checkPortFree(s.port);
    if (!isFree) {
      occupied.push(s);
    }
  }

  if (occupied.length > 0) {
    console.error(`\n${RED}${BOLD}❌ Startup Aborted: Port conflict detected!${RESET}`);
    for (const occ of occupied) {
      console.error(`   - Port ${occ.port} (${occ.name}) is already in use by another process.`);
    }
    console.error(`\n${YELLOW}Please terminate the conflicting process(es) before running the orchestrator.${RESET}`);
    console.error(`Tip on Windows: Get-NetTCPConnection -LocalPort <port> | Select-Object OwningProcess\n`);
    process.exit(1);
  }

  console.log(`${GREEN}✔ All ports are free.${RESET}\n`);

  // Step 2: Concurrently spawn each service
  console.log(`${BOLD}🚀 Spawning services concurrently...${RESET}`);
  for (const s of SERVICES) {
    console.log(`  Starting ${s.name} on port ${s.port}...`);
    const proc = spawn(s.command, s.args, {
      cwd: s.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    proc.on('error', (err) => {
      console.error(`${s.prefix}${RED}Failed to spawn: ${err.message}${RESET}`);
    });

    proc.on('exit', (code) => {
      if (!isShuttingDown) {
        console.warn(`${s.prefix}${YELLOW}Exited with code ${code}${RESET}`);
      }
    });

    streamOutput(proc.stdout, s.prefix);
    streamOutput(proc.stderr, s.prefix);

    children.push({ service: s, process: proc });
  }

  // Step 3: Readiness check
  let readyCount = 0;
  const onServiceReady = () => {
    readyCount++;
    if (readyCount === SERVICES.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n${GREEN}${BOLD}============================================================${RESET}`);
      console.log(`${GREEN}${BOLD}  🎉 All Smart Campus Services Ready in ${elapsed}s!${RESET}`);
      console.log(`${BOLD}------------------------------------------------------------${RESET}`);
      console.log(`  🖥️  ${BOLD}Frontend Dashboard:${RESET}    ${CYAN}http://localhost:5173${RESET}`);
      console.log(`  ⚙️  ${BOLD}Main Backend API:${RESET}      ${BLUE}http://localhost:5000${RESET}`);
      console.log(`  🤖  ${BOLD}AI Assistant API:${RESET}      ${MAGENTA}http://localhost:5005${RESET}`);
      console.log(`${BOLD}============================================================${RESET}`);
      console.log(`Press ${BOLD}Ctrl+C${RESET} to gracefully shut down all services.\n`);
    }
  };

  const startTime = Date.now();
  for (const s of SERVICES) {
    pollServiceReadiness(s, onServiceReady);
  }
}

main().catch((err) => {
  console.error(`${RED}Fatal orchestrator error: ${err.message}${RESET}`);
  shutdown();
});
