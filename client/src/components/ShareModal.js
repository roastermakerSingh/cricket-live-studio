import React, { useEffect, useState } from 'react';
import './Modal.css';

export default function ShareModal({ roomId, onClose }) {
  const [qrData, setQrData] = useState(null);
  const [watchUrl, setWatchUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';

  useEffect(() => {
    fetch(`${serverUrl}/api/qr/watch/${roomId}`)
      .then(r => r.json())
      .then(d => {
        setQrData(d.qrDataUrl);
        setWatchUrl(d.watchUrl);
        setLoading(false);
      })
      .catch(() => {
        // Fallback to current origin
        const url = `${window.location.origin}/watch/${roomId}`;
        setWatchUrl(url);
        setLoading(false);
      });
  }, [roomId]);

  const copy = () => {
    navigator.clipboard?.writeText(watchUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🔗 Share Live Watch Link</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="share-hero">
            <span className="share-icon">📺</span>
            <p>Anyone who opens this link can watch the live match with your score overlay in their browser — no app needed.</p>
          </div>

          {loading ? (
            <div className="modal-loading"><div className="spinner" /></div>
          ) : (
            <>
              {qrData && (
                <div className="qr-wrap">
                  <img src={qrData} alt="Watch QR" className="qr-img" />
                  <div className="qr-badge qr-red">📺 Scan to watch</div>
                </div>
              )}

              <div className="manual-url">
                <span className="url-label">WATCH LINK</span>
                <div className="url-row">
                  <span className="url-text">{watchUrl}</span>
                  <button className="copy-btn" onClick={copy}>{copied ? '✓ Copied!' : 'Copy'}</button>
                </div>
              </div>

              <div className="share-features">
                <div className="sf-item"><span>✅</span><span>Live video stream</span></div>
                <div className="sf-item"><span>✅</span><span>Real-time score overlay</span></div>
                <div className="sf-item"><span>✅</span><span>Ball-by-ball updates</span></div>
                <div className="sf-item"><span>✅</span><span>Works on mobile & desktop</span></div>
                <div className="sf-item"><span>✅</span><span>No login required for viewers</span></div>
              </div>

              <div className="modal-note">
                ⚠️ This link works on your local network by default. To share with people outside your network, expose your server via a public IP or use a tunnel like <strong>ngrok</strong> (<code>ngrok http 3001</code>).
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
