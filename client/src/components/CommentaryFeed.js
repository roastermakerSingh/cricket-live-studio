import React from 'react';
import './CommentaryFeed.css';

const TYPE = {
  six:     { icon: '🚀', color: '#00d084', label: 'SIX!' },
  four:    { icon: '🏏', color: '#f59e0b', label: 'FOUR!' },
  wicket:  { icon: '⚡', color: '#ff4d4d', label: 'WICKET!' },
  extra:   { icon: '↩',  color: '#3b82f6', label: 'EXTRA' },
  dot:     { icon: '●',  color: '#4b5563', label: '' },
  normal:  { icon: '●',  color: '#4b5563', label: '' },
};

export default function CommentaryFeed({ commentary }) {
  if (!commentary.length) return (
    <div className="comm-empty">
      <span>🎙️</span>
      <p>Commentary appears here as you score balls</p>
    </div>
  );

  return (
    <div className="comm-list">
      {commentary.map((c, i) => {
        const t = TYPE[c.type] || TYPE.normal;
        return (
          <div key={c.id} className={`comm-item ${c.type} ${i === 0 ? 'latest' : ''}`}>
            <div className="comm-left" style={{ borderLeftColor: t.color }}>
              <span className="comm-over">{c.over}</span>
              <span className="comm-icon">{t.icon}</span>
            </div>
            <div className="comm-right">
              {t.label && <span className="comm-label" style={{ color: t.color }}>{t.label}</span>}
              <span className="comm-text">{c.text}</span>
              <span className="comm-time">{c.time}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
