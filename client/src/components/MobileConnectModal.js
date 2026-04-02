import React, { useEffect, useState } from 'react';
import './Modal.css';

export default function MobileConnectModal({ roomId, onClose }) {
  const [qrData, setQrData] = useState(null);
  const [mobileUrl, setMobileUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';

  useEffect(() => {
    fetch(`${serverUrl}/api/qr/mobile/${roomId}`)
      .then(r => r.json())
      .then(d => {
        setQrData(d.qrDataUrl);
        setMobileUrl(d.mobileUrl);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [roomId]);

  const copy = () => {
    navigator.clipboard?.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📱 Connect Mobile Camera</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="modal-loading"><div className="spinner" /><p>Generating QR code…</p></div>
          ) : qrData ? (
            <>
              <div className="qr-wrap">
                <img src={qrData} alt="QR Code" className="qr-img" />
                <div className="qr-badge">📡 Scan to stream</div>
              </div>

              <div className="steps">
                <div className="step"><span className="step-num">1</span><span>Open your phone's camera or QR scanner</span></div>
                <div className="step"><span className="step-num">2</span><span>Scan the QR code above</span></div>
                <div className="step"><span className="step-num">3</span><span>Allow camera & microphone permissions</span></div>
                <div className="step"><span className="step-num">4</span><span>Point your phone at the match — stream starts automatically</span></div>
              </div>

              <div className="manual-url">
                <span className="url-label">OR OPEN MANUALLY</span>
                <div className="url-row">
                  <span className="url-text">{mobileUrl}</span>
                  <button className="copy-btn" onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>
                </div>
              </div>

              <div className="modal-note">
                📶 Both devices must be on the same Wi-Fi network for QR/local URL. For remote access, use your server's public IP.
              </div>
            </>
          ) : (
            <div className="modal-err">
              <p>Could not generate QR code. Make sure the server is running.</p>
              <p className="url-manual">Open: <code>http://[YOUR-IP]:3000/mobile/{roomId}</code></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
