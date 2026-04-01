import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getSocket } from '../socket';
import MatchResultModal from '../components/MatchResultModal';
import OverStatsOverlay from '../components/OverStatsOverlay';
import './WatchPage.css';

export default function WatchPage() {
  const { roomId } = useParams();
  const socket = getSocket();
  const canvasRef = useRef(null);
  const latestFrameRef = useRef(null);
  const rafRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [scoreState, setScoreState] = useState(null);
  const [config, setConfig] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [matchResult, setMatchResult] = useState(null);
  const [showOverStats, setShowOverStats] = useState(false);
  const [overStatsData, setOverStatsData] = useState(null);
  const fpsCountRef = useRef(0);
  const fpsTsRef = useRef(Date.now());

  // Audio playback via Web Audio API (reassembles incoming chunks)
  const audioCtxRef = useRef(null);
  const audioMimeRef = useRef('audio/webm;codecs=opus');
  const audioQueueRef = useRef([]);       // queued ArrayBuffers
  const audioNextTimeRef = useRef(0);     // scheduled play time
  const audioSourceNodeRef = useRef(null);

  // Draw latest frame on canvas via rAF (smooth, no jank)
  const drawLoop = useCallback(() => {
    rafRef.current = requestAnimationFrame(drawLoop);
    const canvas = canvasRef.current;
    const frame = latestFrameRef.current;
    if (!canvas || !frame) return;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawLoop]);

  // FPS counter update
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - fpsTsRef.current) / 1000;
      setFps(Math.round(fpsCountRef.current / elapsed));
      fpsCountRef.current = 0;
      fpsTsRef.current = now;
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    socket.emit('viewer:join', { roomId });

    socket.on('viewer:snapshot', ({ scoreState, matchConfig, streamActive, viewerCount }) => {
      if (scoreState) { setScoreState(scoreState); if (scoreState.config) setConfig(scoreState.config); }
      if (matchConfig) setConfig(matchConfig);
      setStreamActive(streamActive || false);
      setViewerCount(viewerCount || 1);
      setConnected(true);
    });

    socket.on('score:update', ({ scoreState }) => {
      setScoreState(scoreState);
      if (scoreState?.config) setConfig(scoreState.config);
    });

    socket.on('stream:status', ({ active }) => setStreamActive(active));
    socket.on('stream:ended', () => setStreamActive(false));
    socket.on('viewer:count', ({ count }) => setViewerCount(count));
    socket.on('match:end', ({ result }) => {
      setStreamActive(false);
      setMatchResult(result);
    });

    // ── Receive video frames ──────────────────────────────────────────────
    socket.on('video:frame', ({ frame, mimeType }) => {
      fpsCountRef.current += 1;
      const blob = new Blob([frame], { type: mimeType || 'image/jpeg' });
      createImageBitmap(blob).then(bitmap => {
        if (latestFrameRef.current && latestFrameRef.current !== bitmap) {
          try { latestFrameRef.current.close(); } catch(e) {}
        }
        latestFrameRef.current = bitmap;
        const canvas = canvasRef.current;
        if (canvas && (canvas.width !== bitmap.width || canvas.height !== bitmap.height)) {
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
        }
      }).catch(() => {});
    });

    // ── Receive & play audio chunks via MediaSource Extensions ───────────
    socket.on('audio:chunk', ({ chunk, mimeType }) => {
      const mime = mimeType || 'audio/webm;codecs=opus';
      audioMimeRef.current = mime;

      // Build audio element + MediaSource on first chunk
      if (!audioCtxRef.current) {
        try {
          if (!MediaSource.isTypeSupported(mime)) {
            console.warn('Audio mime not supported:', mime);
            return;
          }
          const audio = new Audio();
          audio.autoplay = true;
          audio.volume = 1;
          const ms = new MediaSource();
          audio.src = URL.createObjectURL(ms);
          let sb = null;
          const pending = [];

          ms.addEventListener('sourceopen', () => {
            sb = ms.addSourceBuffer(mime);
            sb.mode = 'sequence';
            sb.addEventListener('updateend', () => {
              if (pending.length > 0 && !sb.updating) {
                sb.appendBuffer(pending.shift());
              }
            });
            // flush anything that arrived before sourceopen
            if (pending.length > 0 && !sb.updating) {
              sb.appendBuffer(pending.shift());
            }
          });

          // Store refs: { audio, ms, sb, pending }
          audioCtxRef.current = { audio, ms, sb, pending };
          audio.play().catch(() => {}); // may need user gesture
        } catch(e) {
          console.warn('Audio MSE setup failed:', e.message);
          return;
        }
      }

      const { sb, pending } = audioCtxRef.current;
      const buf = chunk instanceof ArrayBuffer ? chunk : chunk;
      if (sb && !sb.updating) {
        try { sb.appendBuffer(buf); } catch(e) {}
      } else {
        pending.push(buf);
        // keep queue short — drop old chunks if too many (>10 = ~5s backlog)
        if (pending.length > 10) pending.splice(0, pending.length - 5);
      }
    });

    // ── Over stats from score updates ─────────────────────────────────────
    socket.on('score:over', ({ inn1, inn2, innings, config, overNumber }) => {
      setOverStatsData({ inn1, inn2, innings, config, overNumber });
      setShowOverStats(true);
    });

    socket.on('error', ({ message }) => console.error('Socket error:', message));

    return () => {
      ['viewer:snapshot','score:update','stream:status','stream:ended','viewer:count',
       'video:frame','audio:chunk','score:over','error','match:end']
        .forEach(e => socket.off(e));
      if (latestFrameRef.current) { try { latestFrameRef.current.close(); } catch(e) {} }
      // Cleanup audio MSE
      try {
        const a = audioCtxRef.current;
        if (a?.audio) { a.audio.pause(); a.audio.src = ''; }
        if (a?.ms && a.ms.readyState === 'open') a.ms.endOfStream();
      } catch(e) {}
      audioCtxRef.current = null;
    };
  }, [roomId, socket]);

  const copyLink = () => navigator.clipboard?.writeText(window.location.href);

  const curInn = scoreState ? (scoreState.innings === 1 ? scoreState.inn1 : scoreState.inn2) : null;
  const battingTeam = config && scoreState ? (scoreState.innings === 1 ? config.team1 : config.team2) : null;

  return (
    <div className="watch-page">
      {/* Header */}
      <header className="watch-header">
        <span className="wh-logo">🏏 CRICKET<span>LIVE</span></span>
        <div className="wh-center">
          {streamActive
            ? <span className="live-tag pulse">● LIVE</span>
            : <span className="offline-tag">○ {connected ? 'Waiting for stream…' : 'Connecting…'}</span>}
          {streamActive && fps > 0 && <span className="fps-tag">{fps} fps</span>}
        </div>
        <div className="wh-right">
          <span className="wh-viewers">👁 {viewerCount}</span>
          <span className="wh-room">#{roomId}</span>
        </div>
      </header>

      {/* Video canvas */}
      <div className="watch-video-wrap">
        <canvas ref={canvasRef} className="watch-canvas" width={854} height={480} />

        {!streamActive && (
          <div className="watch-waiting">
            {!connected
              ? <><div className="spinner" /><p className="wt-title">Connecting to match…</p><p className="wt-sub">Room #{roomId}</p></>
              : <><div className="waiting-icon">📡</div>
                  <p className="wt-title">Stream not started yet</p>
                  <p className="wt-sub">The broadcaster hasn't started the camera. This page will update automatically.</p></>}
          </div>
        )}

        {/* Over stats scorecard overlay on the video */}
        {showOverStats && overStatsData && (
          <div style={{ position:'absolute', inset:0, zIndex:15 }}>
            <OverStatsOverlay
              inn1={overStatsData.inn1}
              inn2={overStatsData.inn2}
              innings={overStatsData.innings}
              config={overStatsData.config}
              overNumber={overStatsData.overNumber}
              isAdmin={false}
              onDone={() => setShowOverStats(false)}
            />
          </div>
        )}
      </div>

      {/* Audio unlock nudge — browsers block autoplay until user interacts */}
      {streamActive && (
        <div className="watch-audio-bar" onClick={() => {
          const a = audioCtxRef.current?.audio;
          if (a) a.play().catch(() => {});
        }}>
          <span>🔊</span>
          <span>Tap here to enable audio</span>
        </div>
      )}

      {/* Live Score Panel */}
      {curInn && config && battingTeam && (
        <div className="watch-score-panel">
          <div className="wsp-teams">
            <div className="wsp-team">
              <span className="wsp-flag">{battingTeam.flag}</span>
              <span className="wsp-name">{battingTeam.short}</span>
              <span className="wsp-score">{curInn.runs}/{curInn.wickets}</span>
              <span className="wsp-overs">({curInn.overs}.{curInn.balls} ov)</span>
            </div>
            <div className="wsp-meta">
              <span className="wsp-rr">CRR {curInn.runRate}</span>
              {scoreState.innings === 2 && scoreState.inn1 && (
                <span className="wsp-target">TGT {scoreState.inn1.runs + 1}</span>
              )}
            </div>
            {scoreState.innings === 2 && scoreState.inn1 && (
              <div className="wsp-team">
                <span className="wsp-flag">{config.team1.flag}</span>
                <span className="wsp-name">{config.team1.short}</span>
                <span className="wsp-score dim">{scoreState.inn1.runs}/{scoreState.inn1.wickets}</span>
              </div>
            )}
          </div>

          <div className="wsp-players">
            {curInn.batters?.slice(0, 2).map((b, i) => b && (
              <div key={i} className={`wsp-player ${i === curInn.currentBatter ? 'on-strike' : ''}`}>
                <span className="wsp-pname">{b.name}{i === curInn.currentBatter ? ' *' : ''}</span>
                <span className="wsp-pstat">{b.runs} ({b.balls})</span>
                <span className="wsp-pdetail">{b.fours}×4 {b.sixes}×6</span>
              </div>
            ))}
            {curInn.bowler && (
              <div className="wsp-player bowler">
                <span className="wsp-pname">{curInn.bowler.name}</span>
                <span className="wsp-pstat">{curInn.bowler.wickets}/{curInn.bowler.runs}</span>
                <span className="wsp-pdetail">{curInn.bowler.overs}.{curInn.bowler.balls} ov</span>
              </div>
            )}
          </div>

          {curInn.thisOver?.length > 0 && (
            <div className="wsp-over">
              <span className="wsp-over-label">THIS OVER</span>
              {curInn.thisOver.map((b, i) => (
                <span key={i} className={`wsp-ball bt-${b.type}`}>{b.symbol}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Share bar */}
      <div className="watch-share-hint">
        <span>🔗</span>
        <span className="share-url">{window.location.href}</span>
        <button onClick={copyLink}>Copy Link</button>
      </div>

      {matchResult && (
        <MatchResultModal
          result={matchResult}
          inn1={scoreState?.inn1}
          inn2={scoreState?.inn2}
          config={config}
          isAdmin={false}
          onClose={() => setMatchResult(null)}
        />
      )}
    </div>
  );
}
