const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 5e6   // 5MB per frame chunk
});

const PORT = process.env.PORT || 3001;

function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces))
    for (const iface of ifaces[name])
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
  return 'localhost';
}

const LOCAL_IP = getLocalIP();
const CLIENT_URL = process.env.CLIENT_URL || `http://${LOCAL_IP}:3000`;

// rooms: Map<roomId, { desktopId, mobileId, viewerIds[], scoreState, matchConfig, streamActive }>
const rooms = new Map();

// ── REST ──────────────────────────────────────────────────────────────────────

app.post('/api/room', (req, res) => {
  const roomId = uuidv4().slice(0, 8).toUpperCase();
  rooms.set(roomId, {
    desktopId: null, mobileId: null, viewerIds: [],
    scoreState: null, matchConfig: req.body.matchConfig || null,
    streamActive: false, createdAt: Date.now()
  });
  res.json({ roomId });
});

app.get('/api/qr/mobile/:roomId', async (req, res) => {
  const url = `${CLIENT_URL}/mobile/${req.params.roomId}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2, color: { dark: '#00d084', light: '#0a0c0f' } });
    res.json({ qrDataUrl, mobileUrl: url });
  } catch { res.status(500).json({ error: 'QR failed' }); }
});

app.get('/api/qr/watch/:roomId', async (req, res) => {
  const url = `${CLIENT_URL}/watch/${req.params.roomId}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2, color: { dark: '#ff4d4d', light: '#0a0c0f' } });
    res.json({ qrDataUrl, watchUrl: url });
  } catch { res.status(500).json({ error: 'QR failed' }); }
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ip: LOCAL_IP, rooms: rooms.size }));

// ── Socket.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] ${socket.id}`);

  // ── DESKTOP ──────────────────────────────────────────────────────────────
  socket.on('desktop:join', ({ roomId, matchConfig }) => {
    if (!rooms.has(roomId))
      rooms.set(roomId, { desktopId: null, mobileId: null, viewerIds: [], scoreState: null, matchConfig: null, streamActive: false });
    const room = rooms.get(roomId);
    room.desktopId = socket.id;
    if (matchConfig) room.matchConfig = matchConfig;
    socket.join(roomId);
    socket.emit('desktop:joined', { roomId, localIP: LOCAL_IP, viewerCount: room.viewerIds.length });
    console.log(`[${roomId}] Desktop joined`);
  });

  socket.on('score:update', ({ roomId, scoreState }) => {
    const room = rooms.get(roomId);
    if (room) {
      // Detect over completion to broadcast scorecard to viewers
      const ci = scoreState.innings === 1 ? scoreState.inn1 : scoreState.inn2;
      const prevCi = room.scoreState
        ? (scoreState.innings === 1 ? room.scoreState.inn1 : room.scoreState.inn2)
        : null;
      const prevOvers = prevCi?.overs ?? -1;
      const newOvers = ci?.overs ?? 0;

      room.scoreState = scoreState;
      socket.to(roomId).emit('score:update', { scoreState });

      // Fire score:over every 6 completed overs (6, 12, 18...)
      if (newOvers > prevOvers && newOvers > 0 && newOvers % 6 === 0 && (ci?.balls ?? 0) === 0) {
        socket.to(roomId).emit('score:over', {
          inn1: scoreState.inn1, inn2: scoreState.inn2,
          innings: scoreState.innings, config: scoreState.config,
          overNumber: newOvers
        });
      }
    } else {
      socket.to(roomId).emit('score:update', { scoreState });
    }
  });

  socket.on('stream:status', ({ roomId, active }) => {
    const room = rooms.get(roomId);
    if (room) room.streamActive = active;
    socket.to(roomId).emit('stream:status', { active });
  });

  // Desktop broadcasts match result
  socket.on('match:end', ({ roomId, result }) => {
    const room = rooms.get(roomId);
    if (room) { room.streamActive = false; room.matchResult = result; }
    io.to(roomId).emit('match:end', { result });
    console.log(`[${roomId}] Match ended: ${result?.summary}`);
  });

  // ── VIDEO RELAY ───────────────────────────────────────────────────────────
  // Desktop sends encoded video frames → server fans out to all viewers in room
  socket.on('video:frame', ({ roomId, frame, mimeType, timestamp }) => {
    const room = rooms.get(roomId);
    if (!room || room.viewerIds.length === 0) return;
    socket.to(roomId).emit('video:frame', { frame, mimeType, timestamp });
  });

  // Desktop sends audio chunks → server fans out to all viewers
  socket.on('audio:chunk', ({ roomId, chunk, mimeType, timestamp }) => {
    const room = rooms.get(roomId);
    if (!room || room.viewerIds.length === 0) return;
    socket.to(roomId).emit('audio:chunk', { chunk, mimeType, timestamp });
  });

  // ── MOBILE CAMERA ─────────────────────────────────────────────────────────
  socket.on('mobile:join', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
    room.mobileId = socket.id;
    socket.join(roomId);
    socket.emit('mobile:joined', { roomId });
    if (room.desktopId) io.to(room.desktopId).emit('mobile:connected');
    console.log(`[${roomId}] Mobile joined`);
  });

  // ── VIEWER ────────────────────────────────────────────────────────────────
  socket.on('viewer:join', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
    if (!room.viewerIds.includes(socket.id)) room.viewerIds.push(socket.id);
    socket.join(roomId);
    socket.emit('viewer:snapshot', {
      scoreState: room.scoreState,
      matchConfig: room.matchConfig,
      streamActive: room.streamActive,
      viewerCount: room.viewerIds.length
    });
    if (room.desktopId) io.to(room.desktopId).emit('viewer:count', { count: room.viewerIds.length });
    console.log(`[${roomId}] Viewer joined (total: ${room.viewerIds.length})`);
  });

  // ── WebRTC: Desktop ↔ Mobile camera (local network only, fine) ───────────
  socket.on('rtc:offer',   ({ roomId, offer })     => socket.to(roomId).emit('rtc:offer',   { offer, from: socket.id }));
  socket.on('rtc:answer',  ({ roomId, answer })    => socket.to(roomId).emit('rtc:answer',  { answer, from: socket.id }));
  socket.on('rtc:ice',     ({ roomId, candidate }) => socket.to(roomId).emit('rtc:ice',     { candidate, from: socket.id }));

  // ── DISCONNECT ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    for (const [roomId, room] of rooms.entries()) {
      if (room.mobileId === socket.id) {
        room.mobileId = null;
        if (room.desktopId) io.to(room.desktopId).emit('mobile:disconnected');
      }
      if (room.desktopId === socket.id) {
        room.desktopId = null;
        io.to(roomId).emit('stream:ended');
      }
      const vi = room.viewerIds.indexOf(socket.id);
      if (vi !== -1) {
        room.viewerIds.splice(vi, 1);
        if (room.desktopId) io.to(room.desktopId).emit('viewer:count', { count: room.viewerIds.length });
      }
    }
    console.log(`[-] ${socket.id}`);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🏏 CricketLive Server`);
  console.log(`   Port      : ${PORT}`);
  console.log(`   Local IP  : ${LOCAL_IP}`);
  console.log(`   Client    : ${CLIENT_URL}\n`);
});
