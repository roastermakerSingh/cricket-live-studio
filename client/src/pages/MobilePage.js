import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSocket } from '../socket';
import './MobilePage.css';

export default function MobilePage() {
  const { roomId } = useParams();
  const socket = getSocket();
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('connecting'); // connecting | ready | streaming | error
  const [camFacing, setCamFacing] = useState('environment');
  const [errorMsg, setErrorMsg] = useState('');
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    socket.emit('mobile:join', { roomId });

    socket.on('mobile:joined', () => {
      setStatus('ready');
      startCamera('environment');
    });

    socket.on('rtc:offer', async ({ offer, from }) => {
      try {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] });
        pcRef.current = pc;

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => pc.addTrack(t, streamRef.current));
        }

        pc.onicecandidate = (e) => {
          if (e.candidate) socket.emit('rtc:ice', { roomId, candidate: e.candidate });
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') setStatus('streaming');
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') setStatus('ready');
        };

        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('rtc:answer', { roomId, answer });
        setStatus('streaming');
      } catch (e) {
        setErrorMsg('WebRTC connection failed: ' + e.message);
        setStatus('error');
      }
    });

    socket.on('rtc:ice', ({ candidate }) => pcRef.current?.addIceCandidate(candidate).catch(() => {}));

    socket.on('error', ({ message }) => { setErrorMsg(message); setStatus('error'); });

    return () => {
      socket.off('mobile:joined');
      socket.off('rtc:offer');
      socket.off('rtc:ice');
      socket.off('error');
      stopCamera();
    };
  }, [roomId]);

  const startCamera = async (facing) => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      // If peer connection already exists, replace tracks
      if (pcRef.current) {
        const senders = pcRef.current.getSenders();
        stream.getTracks().forEach(track => {
          const sender = senders.find(s => s.track?.kind === track.kind);
          if (sender) sender.replaceTrack(track);
        });
      }
    } catch (e) {
      setErrorMsg('Camera access failed. Please allow camera permissions.');
      setStatus('error');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const flipCamera = () => {
    const next = camFacing === 'environment' ? 'user' : 'environment';
    setCamFacing(next);
    startCamera(next);
  };

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = muted; });
      setMuted(m => !m);
    }
  };

  return (
    <div className="mobile-page">
      <div className="mobile-header">
        <span className="mobile-logo">🏏 CricketLive</span>
        <span className={`mobile-status-badge ${status}`}>
          {status === 'connecting' ? '⟳ Connecting' :
           status === 'ready' ? '● Ready' :
           status === 'streaming' ? '● Streaming' : '✕ Error'}
        </span>
      </div>

      <div className="mobile-video-wrap">
        <video ref={videoRef} className="mobile-video" autoPlay muted playsInline />
        {status === 'connecting' && (
          <div className="mobile-overlay-msg">
            <div className="spinner" />
            <p>Connecting to studio…</p>
          </div>
        )}
        {status === 'streaming' && (
          <div className="streaming-badge">● LIVE TO STUDIO</div>
        )}
      </div>

      {status === 'error' && (
        <div className="mobile-error">
          <span>⚠️</span>
          <p>{errorMsg || 'Something went wrong'}</p>
          <button onClick={() => { setStatus('connecting'); socket.emit('mobile:join', { roomId }); }}>
            Retry
          </button>
        </div>
      )}

      <div className="mobile-controls">
        <button className="mob-ctrl-btn flip" onClick={flipCamera}>
          <span>🔄</span>
          <span>Flip Camera</span>
        </button>
        <button className={`mob-ctrl-btn mute ${muted ? 'muted' : ''}`} onClick={toggleMute}>
          <span>{muted ? '🔇' : '🎙️'}</span>
          <span>{muted ? 'Unmute' : 'Mute'}</span>
        </button>
      </div>

      <div className="mobile-info">
        <div className="info-row">
          <span className="info-icon">📡</span>
          <div>
            <p className="info-title">Room: {roomId}</p>
            <p className="info-sub">Your camera is streaming to the desktop scoring studio</p>
          </div>
        </div>
        <div className="info-tips">
          <p>💡 Keep this page open while filming</p>
          <p>💡 Point camera at the match</p>
          <p>💡 Stay on the same Wi-Fi network</p>
        </div>
      </div>
    </div>
  );
}
