import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSocket } from '../socket';
import ScoreOverlay from '../components/ScoreOverlay';
import ScoringPanel from '../components/ScoringPanel';
import CommentaryFeed from '../components/CommentaryFeed';
import MobileConnectModal from '../components/MobileConnectModal';
import ShareModal from '../components/ShareModal';
import MatchResultModal from '../components/MatchResultModal';
import OverStatsOverlay from '../components/OverStatsOverlay';
import './StudioPage.css';

const initInnings = () => ({
  runs: 0, wickets: 0, overs: 0, balls: 0,
  extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
  runRate: '0.00',
  batters: [
    { name: 'Batter 1', runs: 0, balls: 0, fours: 0, sixes: 0 },
    { name: 'Batter 2', runs: 0, balls: 0, fours: 0, sixes: 0 },
  ],
  bowler: { name: 'Bowler 1', overs: 0, balls: 0, runs: 0, wickets: 0 },
  currentBatter: 0,   // index into batters[] — who is facing
  nonStriker: 1,      // index into batters[] — who is at non-striker end
  thisOver: [], overLog: [],
});

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function buildOverlayDrawFn(scoreStateRef) {
  return (ctx, W, H) => {
    const { innings, inn1, inn2, config } = scoreStateRef.current;
    if (!config) return;
    const ci = innings === 1 ? inn1 : inn2;
    const team = innings === 1 ? config.team1 : config.team2;
    if (!ci) return;
    const s = W / 854;
    ctx.save();

    // Top bar background
    const bW = 340*s, bH = 44*s, bX = 10*s, bY = 10*s;
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    roundRect(ctx, bX, bY, bW, bH, 6*s); ctx.fill();
    ctx.strokeStyle = 'rgba(0,208,132,0.5)'; ctx.lineWidth = 1.5;
    roundRect(ctx, bX, bY, bW, bH, 6*s); ctx.stroke();

    ctx.textBaseline = 'middle';
    const midY = bY + bH/2;
    let x = bX + 10*s;

    ctx.font = `${18*s}px serif`; ctx.fillStyle='#fff';
    ctx.fillText(team.flag, x, midY); x += 26*s;

    ctx.fillStyle='#fff'; ctx.font=`bold ${14*s}px sans-serif`;
    ctx.fillText(team.short, x, midY); x += ctx.measureText(team.short).width + 8*s;

    ctx.fillStyle='#00d084'; ctx.font=`bold ${22*s}px sans-serif`;
    const sc = `${ci.runs}/${ci.wickets}`;
    ctx.fillText(sc, x, midY); x += ctx.measureText(sc).width + 8*s;

    ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font=`${11*s}px monospace`;
    ctx.fillText(`(${ci.overs}.${ci.balls})`, x, midY); x += 52*s;

    ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font=`${10*s}px monospace`;
    ctx.fillText(`CRR ${ci.runRate}`, x, midY);

    // Bottom player bar
    const b1 = ci.batters?.[ci.currentBatter];
    const b2 = ci.batters?.[1-(ci.currentBatter||0)];
    if (b1) {
      const bBy = H-54*s, bBh = 44*s;
      ctx.fillStyle='rgba(0,0,0,0.85)';
      roundRect(ctx, bX, bBy, bW, bBh, 6*s); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1;
      roundRect(ctx, bX, bBy, bW, bBh, 6*s); ctx.stroke();

      const bM = bBy + bBh/2;
      ctx.textBaseline='middle';
      ctx.fillStyle='rgba(255,255,255,0.75)'; ctx.font=`${10*s}px sans-serif`;
      ctx.fillText(`${b1.name} *`, bX+10*s, bM);
      ctx.fillStyle='#fff'; ctx.font=`bold ${12*s}px monospace`;
      ctx.fillText(`${b1.runs}(${b1.balls})`, bX+95*s, bM);
      if (b2) {
        ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font=`${10*s}px sans-serif`;
        ctx.fillText(b2.name, bX+165*s, bM);
        ctx.fillStyle='#fff'; ctx.font=`bold ${12*s}px monospace`;
        ctx.fillText(`${b2.runs}(${b2.balls})`, bX+235*s, bM);
      }
    }

    // This over pills
    if (ci.thisOver?.length > 0) {
      const ps=24*s, gap=4*s;
      let px = W - ci.thisOver.length*(ps+gap) - 10*s;
      const py = H - 38*s;
      ctx.fillStyle='rgba(0,0,0,0.8)';
      roundRect(ctx, px-8*s, py-4*s, ci.thisOver.length*(ps+gap)+12*s, ps+8*s, 6*s); ctx.fill();
      for (const b of ci.thisOver) {
        ctx.fillStyle = b.type==='wicket'?'rgba(255,77,77,0.7)':b.type==='boundary'?'rgba(245,158,11,0.7)':b.type==='extra'?'rgba(59,130,246,0.7)':'rgba(255,255,255,0.15)';
        roundRect(ctx, px, py, ps, ps, ps/2); ctx.fill();
        ctx.fillStyle='#fff'; ctx.font=`bold ${9*s}px monospace`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(b.symbol, px+ps/2, py+ps/2);
        ctx.textAlign='left'; px+=ps+gap;
      }
    }
    ctx.restore();
  };
}

export default function StudioPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socket = getSocket();
  const [config, setConfig] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const mobilePCRef = useRef(null);
  const mobilePendingICE = useRef([]);
  const relayCanvasRef = useRef(null);
  const relayTimerRef = useRef(null);
  const audioCtxRef = useRef(null);       // AudioContext for audio relay
  const audioRelayTimerRef = useRef(null);// audio chunk relay timer
  const mediaRecorderRef = useRef(null);
  const recordChunks = useRef([]);
  const recIntervalRef = useRef(null);
  const scoreStateRef = useRef(null);

  const [cameraMode, setCameraMode] = useState('none');
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const [recordings, setRecordings] = useState([]);
  const [showOverlay, setShowOverlay] = useState(true);
  const [innings, setInnings] = useState(1);
  const [inn1, setInn1] = useState(initInnings());
  const [inn2, setInn2] = useState(initInnings());
  const [commentary, setCommentary] = useState([]);
  const [tab, setTab] = useState('scoring');
  const [viewerCount, setViewerCount] = useState(0);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [showOverStats, setShowOverStats] = useState(false);  // show 20-sec scorecard
  const [overStatsNumber, setOverStatsNumber] = useState(0);  // which over just finished
  const overShownRef = useRef(-1); // tracks last over number that triggered stats (prevents re-trigger)

  const curInn = innings === 1 ? inn1 : inn2;
  const setCurInn = innings === 1 ? setInn1 : setInn2;
  const battingTeam = config ? (innings === 1 ? config.team1 : config.team2) : null;
  const bowlingTeam = config ? (innings === 1 ? config.team2 : config.team1) : null;

  // Keep a ref to current score state for the canvas overlay draw fn
  useEffect(() => { scoreStateRef.current = { innings, inn1, inn2, config }; }, [innings, inn1, inn2, config]);

  useEffect(() => {
    const saved = sessionStorage.getItem(`match_${roomId}`);
    if (saved) setConfig(JSON.parse(saved)); else navigate('/');
  }, [roomId, navigate]);

  useEffect(() => {
    if (!config) return;
    socket.emit('desktop:join', { roomId, matchConfig: config });
    socket.on('desktop:joined', ({ viewerCount: vc }) => setViewerCount(vc || 0));
    socket.on('viewer:count', ({ count }) => setViewerCount(count));
    socket.on('mobile:connected', startMobileWebRTC);
    socket.on('mobile:disconnected', () => { setCameraMode(m => m === 'mobile' ? 'none' : m); });
    socket.on('rtc:answer', async ({ answer }) => {
      const pc = mobilePCRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(answer);
        for (const c of mobilePendingICE.current) await pc.addIceCandidate(c).catch(()=>{});
        mobilePendingICE.current = [];
      } catch(e) { console.warn('rtc:answer error', e); }
    });
    socket.on('rtc:ice', ({ candidate }) => {
      const pc = mobilePCRef.current;
      if (pc && pc.remoteDescription) pc.addIceCandidate(candidate).catch(()=>{});
      else mobilePendingICE.current.push(candidate);
    });
    return () => {
      ['desktop:joined','viewer:count','mobile:connected','mobile:disconnected','rtc:answer','rtc:ice'].forEach(e => socket.off(e));
    };
  }, [config, roomId]);

  useEffect(() => {
    if (!config) return;
    socket.emit('score:update', { roomId, scoreState: { innings, inn1, inn2, config } });
  }, [inn1, inn2, innings, config]);

  // ── Start/stop frame relay (video JPEG frames + audio chunks via socket) ──
  const startRelay = useCallback((videoEl) => {
    if (relayTimerRef.current) clearInterval(relayTimerRef.current);
    if (!relayCanvasRef.current) relayCanvasRef.current = document.createElement('canvas');
    const canvas = relayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const drawOverlay = buildOverlayDrawFn(scoreStateRef);

    // ── Video frame relay (~12fps) ──
    relayTimerRef.current = setInterval(() => {
      if (!videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0) return;
      canvas.width = 854; canvas.height = 480;
      ctx.drawImage(videoEl, 0, 0, 854, 480);
      if (scoreStateRef.current?.config) {
        try { drawOverlay(ctx, 854, 480); } catch(e) {}
      }
      canvas.toBlob(blob => {
        if (!blob) return;
        blob.arrayBuffer().then(buf => {
          socket.emit('video:frame', { roomId, frame: buf, mimeType: 'image/jpeg', timestamp: Date.now() });
        });
      }, 'image/jpeg', 0.55);
    }, 80);

    // ── Audio relay via MediaRecorder on audio track only ──
    const activeStream = localStreamRef.current || remoteStreamRef.current;
    const audioTracks = activeStream?.getAudioTracks() || [];
    if (audioTracks.length > 0) {
      try {
        const audioStream = new MediaStream(audioTracks);
        const audioMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus' : 'audio/webm';
        const audioMR = new MediaRecorder(audioStream, { mimeType: audioMimeType, audioBitsPerSecond: 64000 });
        audioMR.ondataavailable = e => {
          if (e.data && e.data.size > 0) {
            e.data.arrayBuffer().then(buf => {
              socket.emit('audio:chunk', { roomId, chunk: buf, mimeType: audioMimeType, timestamp: Date.now() });
            });
          }
        };
        audioMR.start(500); // 500ms chunks for low latency
        audioCtxRef.current = audioMR; // reuse ref to store the audio MediaRecorder
      } catch(e) {
        console.warn('Audio relay setup failed:', e.message);
      }
    }
  }, [socket, roomId]);

  const stopRelay = useCallback(() => {
    if (relayTimerRef.current) { clearInterval(relayTimerRef.current); relayTimerRef.current = null; }
    try { audioCtxRef.current?.stop(); } catch(e) {}
    audioCtxRef.current = null;
  }, []);

  useEffect(() => {
    if (cameraMode === 'none') { stopRelay(); return; }
    const vid = cameraMode === 'local' ? localVideoRef.current : remoteVideoRef.current;
    if (vid) startRelay(vid);
    return stopRelay;
  }, [cameraMode, showOverlay]);

  const startLocalCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width:{ideal:1280}, height:{ideal:720} }, audio: true });
      localStreamRef.current = stream;
      localVideoRef.current.srcObject = stream;
      await localVideoRef.current.play().catch(()=>{});
      setCameraMode('local');
      socket.emit('stream:status', { roomId, active: true });
      setStreamActive(true);
    } catch(e) { setCameraError('Camera denied. Please allow camera permissions.'); }
  };

  const stopLocalCamera = () => {
    stopRelay();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setCameraMode('none'); setStreamActive(false);
    socket.emit('stream:status', { roomId, active: false });
    if (recording) stopRecording();
  };

  const startMobileWebRTC = useCallback(async () => {
    mobilePendingICE.current = [];
    const pc = new RTCPeerConnection({ iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}] });
    mobilePCRef.current = pc;
    pc.ontrack = e => {
      remoteStreamRef.current = e.streams[0];
      remoteVideoRef.current.srcObject = e.streams[0];
      remoteVideoRef.current.play().catch(()=>{});
      setCameraMode('mobile');
      socket.emit('stream:status', { roomId, active: true });
      setStreamActive(true);
    };
    pc.onicecandidate = e => { if (e.candidate) socket.emit('rtc:ice', { roomId, candidate: e.candidate }); };
    const offer = await pc.createOffer({ offerToReceiveVideo:true, offerToReceiveAudio:true });
    await pc.setLocalDescription(offer);
    socket.emit('rtc:offer', { roomId, offer });
    setShowMobileModal(false);
  }, [roomId, socket]);

  const startRecording = () => {
    const rawStream = localStreamRef.current || remoteStreamRef.current;
    if (!rawStream) return;
    recordChunks.current = [];

    // Build a recording stream: canvas video track (with overlay) + original audio tracks
    let recordStream = rawStream; // fallback: raw stream has audio already
    try {
      if (relayCanvasRef.current) {
        // captureStream from the relay canvas gives us the video-with-overlay
        const canvasStream = relayCanvasRef.current.captureStream(15); // 15fps
        const audioTracks = rawStream.getAudioTracks();
        // Merge canvas video + original audio into one stream
        const combinedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...audioTracks
        ]);
        recordStream = combinedStream;
      }
    } catch(e) {
      console.warn('Canvas stream capture unavailable, using raw stream:', e.message);
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

    const mr = new MediaRecorder(recordStream, { mimeType });
    mr.ondataavailable = e => { if (e.data.size > 0) recordChunks.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(recordChunks.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordings(prev => [...prev, {
        id: Date.now(), url, blob,
        name: `${config?.team1?.short}_vs_${config?.team2?.short}_${new Date().toLocaleTimeString().replace(/:/g, '-')}.webm`,
        size: (blob.size / 1024 / 1024).toFixed(1), duration: recTime,
      }]);
    };
    mediaRecorderRef.current = mr;
    mr.start(1000);
    setRecording(true);
    recIntervalRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop(); setRecording(false);
    clearInterval(recIntervalRef.current); setRecTime(0);
  };

  // ── Match result helpers ──────────────────────────────────────────
  const endMatch = useCallback((result, currentInn1, currentInn2) => {
    setMatchResult(result);
    stopRelay();
    socket.emit('match:end', { roomId, result });
    socket.emit('stream:status', { roomId, active: false });
    setStreamActive(false);
    // Broadcast final score state
    socket.emit('score:update', {
      roomId,
      scoreState: {
        innings, inn1: currentInn1 || inn1, inn2: currentInn2 || inn2,
        config, matchResult: result
      }
    });
  }, [socket, roomId, innings, inn1, inn2, config, stopRelay]);

  const checkMatchEnd = useCallback((updatedInn1, updatedInn2, currentInnings) => {
    if (!config) return null;
    const maxWickets = 10;
    const ci = currentInnings === 1 ? updatedInn1 : updatedInn2;
    const maxOvers = config.maxOvers;
    const oversUsed = ci.overs + (ci.balls > 0 ? 1 : 0);

    if (currentInnings === 1) {
      // End of 1st innings: 10 wickets OR all overs done
      if (ci.wickets >= maxWickets || ci.overs >= maxOvers) {
        return { type: 'inn1_over', inn1: updatedInn1 };
      }
    } else {
      // 2nd innings: target chased
      const target = updatedInn1.runs + 1;
      if (ci.runs >= target) {
        const team2 = config.team2;
        const ballsLeft = (maxOvers * 6) - (ci.overs * 6 + ci.balls);
        const wktsLeft = maxWickets - ci.wickets;
        return {
          type: 'match_over',
          winner: team2.name,
          margin: `${wktsLeft} wicket${wktsLeft !== 1 ? 's' : ''}`,
          summary: `${team2.name} won by ${wktsLeft} wicket${wktsLeft !== 1 ? 's' : ''}`,
          inn1: updatedInn1, inn2: updatedInn2
        };
      }
      // All out in 2nd innings
      if (ci.wickets >= maxWickets || ci.overs >= maxOvers) {
        const inn1Runs = updatedInn1.runs;
        const inn2Runs = ci.runs;
        if (inn2Runs >= inn1Runs) {
          // Tie (extremely rare)
          return {
            type: 'match_over',
            winner: 'Match Tied!',
            margin: '',
            summary: 'Match Tied',
            inn1: updatedInn1, inn2: updatedInn2
          };
        } else {
          const runDiff = inn1Runs - inn2Runs;
          const team1 = config.team1;
          return {
            type: 'match_over',
            winner: team1.name,
            margin: `${runDiff} run${runDiff !== 1 ? 's' : ''}`,
            summary: `${team1.name} won by ${runDiff} run${runDiff !== 1 ? 's' : ''}`,
            inn1: updatedInn1, inn2: updatedInn2
          };
        }
      }
    }
    return null;
  }, [config]);

  const handleBall = useCallback((event) => {
    // We need access to the very latest inn state after the update,
    // so use functional updates and detect end inside the callback
    let resultToEmit = null;
    let inn1After = inn1;
    let inn2After = inn2;

    if (innings === 1) {
      setInn1(prev => {
        const n = applyBall(prev, event);
        inn1After = n;
        return n;
      });
    } else {
      setInn2(prev => {
        const n = applyBall(prev, event);
        inn2After = n;
        return n;
      });
    }

    // Commentary
    if (event.type === 'runs') {
      if (event.value === 6) addCommentary('SIX! Maximum!', 'six');
      else if (event.value === 4) addCommentary('FOUR! Racing to the fence!', 'four');
      else if (event.value === 0) addCommentary('Dot ball.', 'dot');
      else addCommentary(`${event.value} run${event.value > 1 ? 's' : ''}.`, 'normal');
    } else if (event.type === 'wicket') {
      const fielderStr = event.fielder ? ` (${event.fielder})` : '';
      addCommentary(`WICKET! ${event.dismissal || 'Out'}${fielderStr}!`, 'wicket');
    }
    else if (event.type === 'wide') addCommentary('Wide ball!', 'extra');
    else if (event.type === 'noball') addCommentary('No ball! Free hit!', 'extra');
    else if (event.type === 'bye') addCommentary(`${event.value || 1} bye(s).`, 'extra');

    // Check match state AFTER React state flush using setTimeout
    setTimeout(() => {
      setInn1(latest1 => {
        setInn2(latest2 => {
          const res = checkMatchEnd(latest1, latest2, innings);
          if (res) {
            if (res.type === 'inn1_over') {
              addCommentary(`🏏 ${config.team1.name} innings over! ${config.team2.name} need ${latest1.runs + 1} to win.`, 'wicket');
              setInnings(2);
            } else if (res.type === 'match_over') {
              endMatch(res, latest1, latest2);
            }
          }
          // Trigger over stats every 6 overs (over 6, 12, 18...)
          const ci = innings === 1 ? latest1 : latest2;
          if (ci.balls === 0 && ci.overs > 0 && ci.overs % 6 === 0 && !res
              && overShownRef.current !== ci.overs) {
            overShownRef.current = ci.overs; // mark this over as shown
            setOverStatsNumber(ci.overs);
            setShowOverStats(true);
          }
          return latest2;
        });
        return latest1;
      });
    }, 50);
  }, [innings, inn1, inn2, config, checkMatchEnd, endMatch]);

  // Pure function: apply a ball event to innings state, return new state
  const applyBall = (prev, event) => {
    const n = JSON.parse(JSON.stringify(prev));
    const bi = n.currentBatter;
    let runs = 0, countBall = true, isExtra = false, isWicket = false;
    if (event.type === 'runs') {
      runs = event.value; n.batters[bi].runs += runs; n.batters[bi].balls += 1;
      if (runs === 4) n.batters[bi].fours += 1;
      if (runs === 6) n.batters[bi].sixes += 1;
      n.runs += runs;
      // Odd runs: batters swap ends
      if (runs % 2 !== 0) {
        if (n.nonStriker === undefined) n.nonStriker = bi === 0 ? 1 : 0;
        const tmp = n.currentBatter;
        n.currentBatter = n.nonStriker;
        n.nonStriker = tmp;
      }
    } else if (event.type === 'wicket') {
      n.batters[bi].balls += 1; n.wickets += 1; isWicket = true;
      // New batter comes in at the striker end; non-striker stays
      const newBatterIdx = n.batters.length;
      n.batters.push({ name: `Batter ${newBatterIdx + 1}`, runs: 0, balls: 0, fours: 0, sixes: 0 });
      // nonStriker is the batter who wasn't out
      n.nonStriker = (n.nonStriker !== undefined)
        ? n.nonStriker
        : (bi === 0 ? 1 : 0);
      n.currentBatter = newBatterIdx; // new batter faces next ball
    } else if (event.type === 'wide') {
      runs = event.value || 1; n.runs += runs; n.extras.wides += runs; countBall = false; isExtra = true;
    } else if (event.type === 'noball') {
      runs = event.value || 1; n.runs += runs; n.extras.noBalls += runs; countBall = false; isExtra = true;
    } else if (event.type === 'bye') {
      runs = event.value || 1; n.runs += runs; n.extras.byes += runs;
    } else if (event.type === 'legbye') {
      runs = event.value || 1; n.runs += runs; n.extras.legByes += runs;
    }
    const sym = isWicket ? 'W' : isExtra ? (event.type === 'wide' ? 'Wd' : 'NB') : String(runs);
    const bt = isWicket ? 'wicket' : isExtra ? 'extra' : (runs >= 4 ? 'boundary' : 'normal');
    if (countBall) {
      n.thisOver.push({ symbol: sym, type: bt });
      n.bowler.runs += runs;
      if (isWicket) n.bowler.wickets += 1;
      if (!isExtra) n.bowler.balls += 1;
      n.balls += 1;
      if (n.balls === 6) {
        n.overLog.push({ over: n.overs, balls: [...n.thisOver] });
        n.thisOver = []; n.overs += 1; n.balls = 0;
        // Swap striker/non-striker at end of over.
        // Only swap between the TWO active batters (indices 0 and 1 in the first pair,
        // or the last wicket batter and the batter at index (currentBatter ^ 1 masked to 0/1)).
        // Safe approach: always keep currentBatter within 0..1 for the two active batters.
        // The active pair is always [currentBatter, nonStriker] where nonStriker is tracked separately.
        // Since we push new batters on wicket, the non-striker is always at index
        // opposite the current in the LAST two entries. Simplest safe fix:
        // track nonStriker as a separate field, swap on over end.
        if (n.nonStriker === undefined) n.nonStriker = n.currentBatter === 0 ? 1 : 0;
        const tmp = n.currentBatter;
        n.currentBatter = n.nonStriker;
        n.nonStriker = tmp;
        n.bowler = { name: 'Bowler', overs: n.bowler.overs + 1, balls: 0, runs: 0, wickets: 0 };
      }
    }
    const tb = n.overs * 6 + n.balls;
    n.runRate = tb > 0 ? ((n.runs / tb) * 6).toFixed(2) : '0.00';
    return n;
  };

  const addCommentary = (text, type = 'normal') => {
    setCommentary(prev => [{
      id: Date.now(), text, type,
      time: new Date().toLocaleTimeString(),
      over: `${curInn.overs}.${curInn.balls}`,
    }, ...prev].slice(0, 150));
  };

  // ── Manual end match (admin clicks End) ──────────────────────────
  const handleManualEnd = () => {
    if (!window.confirm('End the match and close the stream for all viewers?')) return;
    const result = {
      type: 'match_over',
      winner: 'Match Ended',
      margin: '',
      summary: 'Stream closed by broadcaster',
      inn1, inn2
    };
    endMatch(result, inn1, inn2);
  };

  // ── Admin closes result modal → navigate away ─────────────────────
  const handleAdminClose = () => {
    stopRelay();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    remoteStreamRef.current?.getTracks().forEach(t => t.stop());
    navigate('/');
  };

  const fmtTime = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const hasCamera = cameraMode !== 'none';

  if (!config) return <div className="loading-screen"><span>🏏</span><p>Loading match…</p></div>;

  return (
    <div className="studio-page">
      <header className="studio-header">
        <div className="sh-left">
          <button className="back-btn" onClick={()=>navigate('/')}>←</button>
          <span className="sh-logo">🏏 CRICKET<span>LIVE</span></span>
          <span className="sh-match">{config.team1.short} vs {config.team2.short} · {config.format}</span>
        </div>
        <div className="sh-center">
          {recording && <span className="rec-dot pulse">●</span>}
          {recording && <span className="rec-timer">{fmtTime(recTime)}</span>}
          <span className={`status-pill ${streamActive?'live':''}`}>{streamActive?'● LIVE':'○ OFFLINE'}</span>
        </div>
        <div className="sh-right">
          <span className="viewer-count">👁 {viewerCount}</span>
          <button className="hdr-btn share-btn" onClick={()=>setShowShareModal(true)}>🔗 Share Watch Link</button>
          <button className="hdr-btn end-btn" onClick={handleManualEnd}>✕ End</button>
        </div>
      </header>

      <div className="studio-body">
        <div className="video-col">
          <div className="video-wrap">
            {showOverlay && hasCamera && (
              <div className="overlay-abs"><ScoreOverlay config={config} innings={innings} inn1={inn1} inn2={inn2} /></div>
            )}

            {/* Over stats scorecard - shown for 20s after each over */}
            {showOverStats && !matchResult && (
              <div className="overlay-abs interactive">
                <OverStatsOverlay
                  inn1={inn1} inn2={inn2}
                  innings={innings}
                  config={config}
                  overNumber={overStatsNumber}
                  isAdmin={true}
                  onDone={() => setShowOverStats(false)}
                />
              </div>
            )}
            <video ref={localVideoRef} className={`video-el ${cameraMode==='local'?'visible':'hidden'}`} autoPlay muted playsInline />
            <video ref={remoteVideoRef} className={`video-el ${cameraMode==='mobile'?'visible':'hidden'}`} autoPlay playsInline />
            {!hasCamera && (
              <div className="video-placeholder">
                <span>📹</span><p>No camera active</p>
                {cameraError && <p className="cam-error">{cameraError}</p>}
                <div className="cam-actions">
                  <button className="cam-btn local" onClick={startLocalCamera}>Use This Device</button>
                  <button className="cam-btn mobile" onClick={()=>setShowMobileModal(true)}>📱 Mobile QR</button>
                </div>
              </div>
            )}
          </div>

          <div className="cam-controls">
            <div className="cam-ctrl-row">
              {cameraMode==='local'?<button className="ctrl-btn stop" onClick={stopLocalCamera}>⏹ Stop Camera</button>
               :cameraMode==='mobile'?<button className="ctrl-btn connected" disabled>📱 Mobile Connected</button>
               :<><button className="ctrl-btn start" onClick={startLocalCamera}>📹 Local Camera</button>
                  <button className="ctrl-btn mobile-qr" onClick={()=>setShowMobileModal(true)}>📱 Mobile QR</button></>}
              {hasCamera && !recording && <button className="ctrl-btn rec-start" onClick={startRecording}>● Record</button>}
              {recording && <button className="ctrl-btn rec-stop" onClick={stopRecording}>⏹ Stop · {fmtTime(recTime)}</button>}
              <button className={`ctrl-btn overlay-toggle ${showOverlay?'on':'off'}`} onClick={()=>setShowOverlay(v=>!v)}>
                {showOverlay?'👁 Overlay ON':'🚫 Overlay OFF'}
              </button>
            </div>
          </div>

          <div className="this-over">
            <span className="to-label">THIS OVER</span>
            <div className="to-balls">
              {curInn.thisOver.length===0?<span className="to-empty">—</span>
               :curInn.thisOver.map((b,i)=><span key={i} className={`to-ball bt-${b.type}`}>{b.symbol}</span>)}
            </div>
          </div>

          {recordings.length>0&&(
            <div className="recordings-list">
              <p className="rec-list-title">📼 RECORDINGS</p>
              {recordings.map(r=>(
                <div key={r.id} className="rec-item">
                  <div className="rec-info">
                    <span className="rec-name">{r.name}</span>
                    <span className="rec-meta">{fmtTime(r.duration)} · {r.size} MB</span>
                  </div>
                  <a href={r.url} download={r.name} className="dl-btn">⬇ Download</a>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel-col">
          <div className="inn-switcher">
            <button className={`inn-btn ${innings===1?'active':''}`} onClick={()=>setInnings(1)}>{config.team1.flag} {config.team1.short} — INN 1</button>
            <button className={`inn-btn ${innings===2?'active':''}`} onClick={()=>setInnings(2)}>{config.team2.flag} {config.team2.short} — INN 2</button>
          </div>
          <div className="tab-bar">
            {['scoring','commentary'].map(t=>(
              <button key={t} className={`tab-btn ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
                {t==='scoring'?'🏏 Scoring':'🎙️ Commentary'}
              </button>
            ))}
          </div>
          <div className="tab-content">
            {tab==='scoring'&&<ScoringPanel innings={curInn} inn1={inn1} inn2={inn2} battingTeam={battingTeam} bowlingTeam={bowlingTeam} config={config} inningsNum={innings} onBall={handleBall}
              onUpdateBatter={(idx,name)=>setCurInn(p=>{const n=JSON.parse(JSON.stringify(p));n.batters[idx].name=name;return n;})}
              onUpdateBowler={(name)=>setCurInn(p=>({...p,bowler:{...p.bowler,name}}))}
              onNewBowler={()=>setCurInn(p=>({...p,bowler:{name:`Bowler ${p.overLog.length+2}`,overs:0,balls:0,runs:0,wickets:0}}))} />}
            {tab==='commentary'&&<CommentaryFeed commentary={commentary} />}
          </div>
        </div>
      </div>

      {showMobileModal&&<MobileConnectModal roomId={roomId} onClose={()=>setShowMobileModal(false)} />}
      {showShareModal&&<ShareModal roomId={roomId} onClose={()=>setShowShareModal(false)} />}
      {matchResult&&(
        <MatchResultModal
          result={matchResult}
          inn1={inn1} inn2={inn2}
          config={config}
          isAdmin={true}
          onClose={handleAdminClose}
        />
      )}
    </div>
  );
}
