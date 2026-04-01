import React from 'react';
import './ScoreOverlay.css';

export default function ScoreOverlay({ config, innings, inn1, inn2 }) {
  const ci = innings === 1 ? inn1 : inn2;
  const battingTeam = innings === 1 ? config.team1 : config.team2;

  if (!ci) return null;

  const b1 = ci.batters?.[ci.currentBatter];
  const b2idx = 1 - (ci.currentBatter || 0);
  const b2 = ci.batters?.[b2idx];

  return (
    <div className="score-overlay">
      {/* Top bar */}
      <div className="sco-top">
        <div className="sco-team">
          <span className="sco-flag">{battingTeam.flag}</span>
          <span className="sco-short">{battingTeam.short}</span>
          <span className="sco-runs">{ci.runs}/{ci.wickets}</span>
          <span className="sco-ov">({ci.overs}.{ci.balls})</span>
          <span className="sco-rr">CRR {ci.runRate}</span>
        </div>
        {innings === 2 && inn1 && (
          <div className="sco-target">
            <span className="sco-t1">{config.team1.short} {inn1.runs}/{inn1.wickets}</span>
            <span className="sco-tgt">TGT {inn1.runs + 1}</span>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="sco-bottom">
        {b1 && (
          <div className="sco-player">
            <span className="sco-pn">{b1.name} *</span>
            <span className="sco-ps">{b1.runs} ({b1.balls})</span>
            <span className="sco-pd">{b1.fours}×4 {b1.sixes}×6</span>
          </div>
        )}
        {b2 && b2 !== b1 && (
          <div className="sco-player">
            <span className="sco-pn">{b2.name}</span>
            <span className="sco-ps">{b2.runs} ({b2.balls})</span>
          </div>
        )}
        {ci.bowler && (
          <div className="sco-player bowler-col">
            <span className="sco-pn">{ci.bowler.name}</span>
            <span className="sco-ps">{ci.bowler.wickets}/{ci.bowler.runs}</span>
            <span className="sco-pd">{ci.bowler.overs}.{ci.bowler.balls}ov</span>
          </div>
        )}
      </div>

      {/* This Over */}
      {ci.thisOver?.length > 0 && (
        <div className="sco-over">
          <span className="sco-over-lbl">THIS OVER</span>
          {ci.thisOver.map((b, i) => (
            <span key={i} className={`sco-ball sco-${b.type}`}>{b.symbol}</span>
          ))}
        </div>
      )}
    </div>
  );
}
