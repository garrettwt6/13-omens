const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { WebSocketServer, WebSocket } = require('ws');

function createServer() {
  const rooms = new Map();
  const files = new Map([
    ['/', ['13_omens_visual_qa_v4.html', 'text/html']],
    ['/index.html', ['13_omens_visual_qa_v4.html', 'text/html']],
    ['/13_omens_visual_qa_v4.html', ['13_omens_visual_qa_v4.html', 'text/html']],
    ['/local-peer.js', ['local-peer.js', 'text/javascript']],
    ['/hollybrook.adventure.json', ['hollybrook.adventure.json', 'application/json']],
    ['/blank.adventure.json', ['blank.adventure.json', 'application/json']],
  ]);
  const server = http.createServer((req, res) => {
    const file = files.get(new URL(req.url, 'http://localhost').pathname);
    if (!file || !['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(404); return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': file[1] + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(path.join(__dirname, file[0])).pipe(res);
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 });
  server.on('upgrade', (req, socket, head) => {
    // Only pages served by this server may open table connections.
    let validOrigin = false;
    try { validOrigin = new URL(req.headers.origin).host === req.headers.host; } catch {}
    if (req.url !== '/table' || !validOrigin) { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
  });
  const send = (ws, message) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message)); };
  wss.on('connection', ws => {
    ws.alive = true;
    ws.on('pong', () => { ws.alive = true; });
    ws.on('error', () => {});
    ws.on('message', raw => {
      let m;
      try { m = JSON.parse(raw); } catch { return ws.close(1008, 'Invalid message'); }
      if (!m || typeof m !== 'object') return ws.close(1008, 'Invalid message');
      if (m.type === 'register') {
        if (ws.id) return ws.close(1008, 'Already registered');
        ws.id = randomUUID();
        if (m.hostId !== undefined) {
          if (typeof m.hostId !== 'string' || !/^13omens-OMEN-[A-Z0-9]{4}$/.test(m.hostId)) return ws.close(1008, 'Invalid room');
          if (rooms.has(m.hostId)) return send(ws, { type: 'error', error: 'unavailable-id' });
          ws.hostId = m.hostId;
          rooms.set(m.hostId, { host: ws, guests: new Map() });
        }
        return send(ws, { type: 'registered', id: ws.hostId || ws.id });
      }
      if (!ws.id) return ws.close(1008, 'Register first');
      if (m.type === 'join') {
        if (ws.hostId || ws.room) return ws.close(1008, 'Already in a table');
        const room = rooms.get(m.hostId);
        if (!room) return send(ws, { type: 'error', error: 'peer-unavailable' });
        ws.room = room; room.guests.set(ws.id, ws);
        send(room.host, { type: 'guest-joined', id: ws.id });
        return send(ws, { type: 'joined', hostId: m.hostId });
      }
      if (m.type === 'data' && m.data && typeof m.data.type === 'string') {
        if (ws.hostId) {
          const target = rooms.get(ws.hostId)?.guests.get(m.to);
          if (target) send(target, { type: 'data', data: m.data });
        } else if (ws.room) send(ws.room.host, { type: 'data', from: ws.id, data: m.data });
      }
    });
    ws.on('close', () => {
      if (ws.hostId) {
        const room = rooms.get(ws.hostId);
        if (room?.host !== ws) return;
        rooms.delete(ws.hostId);
        for (const guest of room.guests.values()) guest.close(1000, 'Host left');
      } else if (ws.room) {
        ws.room.guests.delete(ws.id);
        send(ws.room.host, { type: 'guest-left', id: ws.id });
      }
    });
  });
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.alive) { ws.terminate(); continue; }
      ws.alive = false; ws.ping();
    }
  }, 15000);
  heartbeat.unref();
  server.on('close', () => { clearInterval(heartbeat); wss.close(); });
  server.tableSockets = wss;
  return server;
}
if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const server = createServer();
  server.on('error', err => { console.error('Could not start server:', err.message); process.exitCode = 1; });
  server.listen(port, '0.0.0.0', () => {
    console.log(`Computer: http://localhost:${port}`);
    for (const entries of Object.values(os.networkInterfaces())) {
      for (const entry of entries || []) if (entry.family === 'IPv4' && !entry.internal) console.log(`Share with players on your Wi-Fi: http://${entry.address}:${port}`);
    }
    console.log('Keep this terminal and the Host Chamber tab open. Use a trusted private network.');
  });
}
module.exports = { createServer };
