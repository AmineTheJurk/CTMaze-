/**
 * Corn Thief Maze - Unified Game & Multiplayer Server
 * Serves the full-screen 3D game on Port 3000 and handles all WebSocket multiplayer rooms.
 * Works seamlessly in AI Studio preview, local dev, Android APK (port 9090/Render), and Render.com.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

// --- In-Memory Multiplayer State ---
const rooms = new Map();     // roomCode -> Room
const clients = new Map();   // ws -> ClientInfo

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function generatePlayerId() {
  return 'p_' + Math.random().toString(36).substring(2, 9);
}

function getPublicPlayerList(room) {
  return room.players.map(p => ({
    id: p.id,
    name: p.name,
    role: p.role,
    isHost: p.isHost
  }));
}

function send(ws, msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastToRoom(roomCode, msg, excludeWs = null) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const payload = JSON.stringify(msg);
  room.players.forEach(p => {
    if (p.ws !== excludeWs && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(payload);
    }
  });
}

function leaveCurrentRoom(ws) {
  const client = clients.get(ws);
  if (!client || !client.roomCode) return;

  const roomCode = client.roomCode;
  const room = rooms.get(roomCode);
  if (!room) {
    client.roomCode = null;
    return;
  }

  const idx = room.players.findIndex(p => p.id === client.id);
  if (idx !== -1) {
    const leavingPlayer = room.players[idx];
    room.players.splice(idx, 1);
    console.log(`[Room ${roomCode}] Player '${leavingPlayer.name}' (${client.id}) left.`);

    if (room.players.length === 0) {
      console.log(`[Room ${roomCode}] Room empty, deleted.`);
      rooms.delete(roomCode);
    } else {
      if (leavingPlayer.isHost && room.players.length > 0) {
        room.players[0].isHost = true;
        console.log(`[Room ${roomCode}] New host assigned: '${room.players[0].name}'`);
      }
      broadcastToRoom(roomCode, {
        type: 'player_left',
        playerId: client.id,
        name: leavingPlayer.name,
        players: getPublicPlayerList(room)
      });
    }
  }
  client.roomCode = null;
}

function handleMessage(ws, msg) {
  const client = clients.get(ws);
  if (!client) return;

  switch (msg.type) {
    case 'create_room': {
      leaveCurrentRoom(ws);
      const roomCode = generateRoomCode();
      const playerName = (msg.name || 'Host').trim().substring(0, 16);
      const mode = (msg.mode === '1v1') ? '1v1' : 'duo';
      const initialRole = mode === '1v1' ? 'nazer' : 'thief';
      const seed = Math.floor(Math.random() * 1000000000);

      client.name = playerName;
      client.roomCode = roomCode;

      const playerObj = {
        id: client.id,
        name: playerName,
        role: initialRole,
        isHost: true,
        ws
      };

      const room = {
        code: roomCode,
        mode,
        seed,
        started: false,
        cornsCollected: 0,
        players: [playerObj]
      };

      rooms.set(roomCode, room);
      console.log(`[Create] Room ${roomCode} created by '${playerName}' (${mode})`);

      send(ws, {
        type: 'room_created',
        code: roomCode,
        mode,
        seed,
        playerId: client.id,
        players: getPublicPlayerList(room)
      });
      break;
    }

    case 'join_room': {
      leaveCurrentRoom(ws);
      const code = (msg.code || '').trim().toUpperCase();
      const playerName = (msg.name || 'Player').trim().substring(0, 16);
      const room = rooms.get(code);

      if (!room) {
        return send(ws, { type: 'error', message: `Room "${code}" not found. Verify code and try again!` });
      }

      if (room.players.length >= 8) {
        return send(ws, { type: 'error', message: `Room "${code}" is currently full.` });
      }

      client.name = playerName;
      client.roomCode = code;

      const defaultRole = (room.mode === 'duo')
        ? 'thief'
        : (room.players.some(p => p.role === 'thief') ? 'hurter' : 'thief');

      const playerObj = {
        id: client.id,
        name: playerName,
        role: defaultRole,
        isHost: false,
        ws
      };

      room.players.push(playerObj);
      console.log(`[Join] '${playerName}' joined Room ${code} (${room.players.length} players)`);

      send(ws, {
        type: 'room_joined',
        code,
        mode: room.mode,
        seed: room.seed,
        playerId: client.id,
        players: getPublicPlayerList(room)
      });

      broadcastToRoom(code, {
        type: 'player_joined',
        player: {
          id: client.id,
          name: playerName,
          role: defaultRole,
          isHost: false
        },
        players: getPublicPlayerList(room)
      }, ws);
      break;
    }

    case 'change_role': {
      if (!client.roomCode) return;
      const room = rooms.get(client.roomCode);
      if (!room) return;
      const player = room.players.find(p => p.id === client.id);
      if (player && msg.role) {
        player.role = msg.role;
        broadcastToRoom(client.roomCode, {
          type: 'role_changed',
          playerId: client.id,
          role: msg.role,
          players: getPublicPlayerList(room)
        });
      }
      break;
    }

    case 'start_game': {
      if (!client.roomCode) return;
      const room = rooms.get(client.roomCode);
      if (!room) return;

      const hostPlayer = room.players.find(p => p.isHost);
      if (!hostPlayer || hostPlayer.id !== client.id) {
        return send(ws, { type: 'error', message: 'Only the room host can start the game.' });
      }

      room.started = true;
      room.cornsCollected = 0;
      console.log(`[Start] Game started in Room ${client.roomCode}`);

      broadcastToRoom(client.roomCode, {
        type: 'game_started',
        seed: room.seed,
        mode: room.mode,
        players: getPublicPlayerList(room)
      });
      break;
    }

    case 'update_pos': {
      if (!client.roomCode) return;
      broadcastToRoom(client.roomCode, {
        type: 'player_moved',
        id: client.id,
        x: msg.x,
        z: msg.z,
        yaw: msg.yaw,
        pitch: msg.pitch,
        running: !!msg.running,
        vent: !!msg.vent,
        downed: !!msg.downed
      }, ws);
      break;
    }

    case 'pickup_corn': {
      if (!client.roomCode) return;
      const room = rooms.get(client.roomCode);
      if (!room) return;
      const player = room.players.find(p => p.id === client.id);
      if (!player || player.role !== 'thief') return; // Monsters cannot collect corns
      room.cornsCollected = (room.cornsCollected || 0) + 1;
      broadcastToRoom(client.roomCode, {
        type: 'corn_collected',
        index: msg.index,
        total: room.cornsCollected,
        collectorName: client.name
      });
      break;
    }

    case 'thief_caught': {
      if (!client.roomCode) return;
      const room = rooms.get(client.roomCode);
      if (!room) return;
      const target = room.players.find(p => p.id === msg.targetId);
      const targetName = target ? target.name : 'A Thief';

      broadcastToRoom(client.roomCode, {
        type: 'player_caught',
        targetId: msg.targetId,
        thiefId: msg.targetId,
        thiefName: targetName,
        hunterName: client.name,
        hunterRole: msg.hunterRole || 'nazer'
      });
      break;
    }

    case 'thief_escaped': {
      if (!client.roomCode) return;
      broadcastToRoom(client.roomCode, {
        type: 'player_escaped',
        playerId: client.id,
        name: client.name
      });
      break;
    }

    case 'item_used': {
      if (!client.roomCode) return;
      broadcastToRoom(client.roomCode, {
        type: 'item_used',
        playerId: client.id,
        name: client.name,
        item: msg.item
      }, ws);
      break;
    }

    case 'monster_ability': {
      if (!client.roomCode) return;
      const room = rooms.get(client.roomCode);
      const player = room?.players.find(p => p.id === client.id);
      broadcastToRoom(client.roomCode, {
        type: 'monster_ability',
        hunterId: client.id,
        hunterName: client.name,
        hunterRole: player?.role || 'nazer',
        ability: msg.ability
      });
      break;
    }

    case 'leave_room': {
      leaveCurrentRoom(ws);
      break;
    }
  }
}

function handleWsConnection(ws, req) {
  const playerId = generatePlayerId();
  clients.set(ws, { id: playerId, name: 'Player', roomCode: null, isAlive: true });
  console.log(`[WS Connect] ${playerId} connected`);

  ws.on('pong', () => {
    const c = clients.get(ws);
    if (c) c.isAlive = true;
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      handleMessage(ws, msg);
    } catch (e) {
      console.error('Error handling WS msg:', e);
    }
  });

  ws.on('close', () => {
    console.log(`[WS Disconnect] ${playerId}`);
    leaveCurrentRoom(ws);
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error(`[WS Error] ${playerId}:`, err.message);
  });
}

// --- HTTP Server (Standalone WebSocket Server & Health Checks) ---
const server = http.createServer((req, res) => {
  const reqUrl = req.url.split('?')[0];

  // Render health checks
  if (reqUrl === '/healthz' || reqUrl === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('OK');
  }

  // Status API
  if (reqUrl === '/api/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'online',
      rooms: rooms.size,
      players: clients.size,
      uptime: process.uptime()
    }));
  }

  // Standalone status dashboard for Render.com (when game files are not present or at /status)
  const indexPath = path.join(__dirname, 'index.html');
  const hasGameFiles = fs.existsSync(indexPath);

  if (reqUrl === '/status' || reqUrl === '/info' || (!hasGameFiles && (reqUrl === '/' || reqUrl === ''))) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Corn Thief Maze - Multiplayer Server</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0d0c09; color: #efe6c8; margin: 0; padding: 24px; text-align: center; }
    .card { max-width: 580px; margin: 40px auto; background: #1a1710; border: 2px solid #4a3f22; border-radius: 8px; padding: 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: left; }
    h1 { color: #f2c230; margin-top: 0; font-size: 28px; }
    .badge { display: inline-block; background: #27ae60; color: #fff; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 13px; margin-bottom: 16px; }
    .stat { display: flex; justify-content: space-between; border-bottom: 1px solid #332b18; padding: 10px 0; font-size: 16px; }
    .stat b { color: #f2c230; }
    code { background: #000; color: #7fd3ff; padding: 6px 10px; border-radius: 4px; font-size: 15px; display: inline-block; word-break: break-all; }
    .url-box { margin-top: 20px; background: #080705; border: 1px solid #4a3f22; padding: 14px; border-radius: 4px; }
    .note { margin-top: 14px; color: #a79a74; font-size: 14px; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">● MULTIPLAYER SERVER ONLINE</div>
    <h1>🌽 Corn Thief Maze Server</h1>
    <p>Dedicated WebSocket multiplayer lobby and synchronization backend on Render.com.</p>
    
    <div class="stat"><span>Active Game Rooms:</span> <b>${rooms.size}</b></div>
    <div class="stat"><span>Connected Players:</span> <b>${clients.size}</b></div>
    <div class="stat"><span>Server Uptime:</span> <b>${Math.floor(process.uptime())}s</b></div>

    <div class="url-box">
      <div style="font-size:13px; color:#a79a74; margin-bottom:6px; font-weight: bold;">Multiplayer WebSocket Endpoint:</div>
      <code>wss://${req.headers.host || 'corn-thief-multiplayer.onrender.com'}</code>
    </div>

    <div class="note">
      🎮 <b>Game Client:</b> Hosted separately on itch.io (HTML5) &amp; Android/Windows APK.<br>
      Only this WebSocket server runs on Render.com.
    </div>
  </div>
</body>
</html>`);
  }

  // File resolution (if game files are present, e.g. local preview)
  let safePath = path.normalize(decodeURIComponent(reqUrl));
  if (safePath === '/' || safePath === '') {
    safePath = '/index.html';
  }

  const filePath = path.join(__dirname, safePath);

  // Security check: ensure path is within __dirname
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // If requested directory, try index.html inside
      if (stats && stats.isDirectory()) {
        const subIndex = path.join(filePath, 'index.html');
        if (fs.existsSync(subIndex)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return fs.createReadStream(subIndex).pipe(res);
        }
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not Found: ' + reqUrl);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

// Attach WebSocketServer directly on main HTTP server (Port 3000)
const wss = new WebSocketServer({ server });
wss.on('connection', handleWsConnection);

// Keep-alive heartbeat interval (25 seconds)
const heartbeat = setInterval(() => {
  wss.clients.forEach(ws => {
    const c = clients.get(ws);
    if (!c) return;
    if (!c.isAlive) {
      leaveCurrentRoom(ws);
      clients.delete(ws);
      return ws.terminate();
    }
    c.isAlive = false;
    ws.ping();
  });
}, 25000);

wss.on('close', () => clearInterval(heartbeat));

// Start server on PORT (3000)
server.listen(PORT, HOST, () => {
  console.log(`🌽 Corn Thief Maze Game & Server running on http://${HOST}:${PORT}`);
  console.log(`   Multiplayer WebSockets ready on ws://${HOST}:${PORT}`);
});

// Also attempt secondary listener on 8765 if free for legacy fallback
try {
  const secondaryWss = new WebSocketServer({ port: 8765, host: '0.0.0.0' });
  secondaryWss.on('connection', handleWsConnection);
  secondaryWss.on('error', (err) => {
    console.log('[Info] Secondary WS on 8765 not bound:', err.message);
  });
} catch (e) {}
