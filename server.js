const express = require('express');
const path = require('path');
const http = require('http');
const os = require('os');
const WebSocket = require('ws');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const CLEAR_INTERVAL_MS = 20000;   // wipe every room's chat every 20s
const HEARTBEAT_MS = 15000;        // detect dead connections (phone screen locked/app closed)

// word (lowercased) -> { clients: Set<ws>, timer }
const rooms = new Map();

const ADJECTIVES = ['Quiet', 'Swift', 'Silent', 'Hidden', 'Lucky', 'Clever', 'Brave', 'Calm', 'Wild', 'Bright', 'Faded', 'Loose'];
const ANIMALS = ['Fox', 'Owl', 'Wolf', 'Hawk', 'Otter', 'Lynx', 'Raven', 'Panda', 'Falcon', 'Tiger', 'Moth', 'Crow'];

function randomName() {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const b = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const n = Math.floor(100 + Math.random() * 900);
  return `${a}${b}${n}`;
}

function getOrCreateRoom(word) {
  let room = rooms.get(word);
  if (!room) {
    room = { clients: new Set(), timer: null };
    room.timer = setInterval(() => broadcast(word, { type: 'clear' }), CLEAR_INTERVAL_MS);
    rooms.set(word, room);
  }
  return room;
}

function broadcast(word, data, exclude) {
  const room = rooms.get(word);
  if (!room) return;
  const payload = JSON.stringify(data);
  for (const client of room.clients) {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function leaveRoom(ws) {
  const word = ws.room;
  if (!word) return;
  const room = rooms.get(word);
  if (!room) return;
  room.clients.delete(ws);
  ws.room = null;
  if (room.clients.size === 0) {
    clearInterval(room.timer);
    rooms.delete(word);
  } else {
    broadcast(word, { type: 'system', text: `${ws.anonName} left the party.` });
    broadcast(word, { type: 'presence', count: room.clients.size });
  }
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'join') {
      const word = String(msg.word || '').trim().toLowerCase().slice(0, 60);
      if (!word) return;
      if (ws.room) leaveRoom(ws);

      ws.room = word;
      ws.anonName = randomName();
      const room = getOrCreateRoom(word);
      room.clients.add(ws);

      ws.send(JSON.stringify({ type: 'joined', name: ws.anonName, count: room.clients.size, clearMs: CLEAR_INTERVAL_MS }));
      broadcast(word, { type: 'system', text: `${ws.anonName} joined the party.` }, ws);
      broadcast(word, { type: 'presence', count: room.clients.size });
      return;
    }

    if (msg.type === 'chat' && ws.room) {
      const text = String(msg.text || '').slice(0, 1000).trim();
      if (!text) return;
      broadcast(ws.room, { type: 'chat', name: ws.anonName, text, ts: Date.now() });
    }
  });

  ws.on('close', () => leaveRoom(ws));
});

// Heartbeat: if a phone locks/closes the tab/app without a clean close event,
// this notices the dropped connection and removes them from the room.
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      leaveRoom(ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_MS);

wss.on('close', () => clearInterval(heartbeat));

function localIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\nVanish Party server running.`);
  console.log(`On this laptop:      http://localhost:${PORT}`);
  const ips = localIPs();
  if (ips.length) {
    console.log(`On your Wi-Fi network, others can join at:`);
    ips.forEach((ip) => console.log(`  http://${ip}:${PORT}`));
  }
  console.log(`\nThis only works while this laptop and this process are running.\n`);
});
