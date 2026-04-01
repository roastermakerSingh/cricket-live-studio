import React from 'react';
import './MatchResultModal.css';

export default function MatchResultModal({ result, inn1, inn2, config, isAdmin, onClose }) {
  if (!result || !config) return null;

  const { summary, winner, margin, reason } = result;

  const fmtSR = (r, b) => b > 0 ? ((r / b) * 100).toFixed(1) : '—';
  const fmtEco = (r, o, b) => {
    const balls = o * 6 + b;
    return balls > 0 ? ((r / balls) * 6).toFixed(2) : '—';
  };

  const TeamCard = ({ team, inn, inningsLabel }) => {
    if (!inn) return null;
    const top3bat = [...(inn.batters || [])]
      .filter(b => b.balls > 0)
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 5);
    return (
      <div className="team-card">
        <div className="tc-header">
          <span className="tc-flag">{team.flag}</span>
          <span className="tc-name">{team.name}</span>
          <span className="tc-innings">{inningsLabel}</span>
          <span className="tc-total">{inn.runs}/{inn.wickets} <span className="tc-ov">({inn.overs}.{inn.balls} ov)</span></span>
        </div>

        {/* Batting */}
        <div className="tc-section-label">BATTING</div>
        <div className="tc-table">
          <div className="tc-thead">
            <span>BATTER</span><span>R</span><span>B</span><span>4s</span><span>6s</span><span>SR</span>
          </div>
          {top3bat.length === 0
            ? <div className="tc-empty">No balls faced</div>
            : top3bat.map((b, i) => (
              <div key={i} className="tc-row">
                <span className="tc-pname">{b.name}</span>
                <span className="tc-val">{b.runs}</span>
                <span className="tc-val">{b.balls}</span>
                <span className="tc-val">{b.fours}</span>
                <span className="tc-val">{b.sixes}</span>
                <span className="tc-val mono">{fmtSR(b.runs, b.balls)}</span>
              </div>
            ))
          }
        </div>

        {/* Bowling */}
        {inn.bowler && inn.bowler.overs + inn.bowler.balls > 0 && (
          <>
            <div className="tc-section-label">BOWLING</div>
            <div className="tc-table">
              <div className="tc-thead">
                <span>BOWLER</span><span>O</span><span>R</span><span>W</span><span>ECO</span>
              </div>
              <div className="tc-row">
                <span className="tc-pname">{inn.bowler.name}</span>
                <span className="tc-val">{inn.bowler.overs}.{inn.bowler.balls}</span>
                <span className="tc-val">{inn.bowler.runs}</span>
                <span className="tc-val">{inn.bowler.wickets}</span>
                <span className="tc-val mono">{fmtEco(inn.bowler.runs, inn.bowler.overs, inn.bowler.balls)}</span>
              </div>
            </div>
          </>
        )}

        {/* Extras */}
        <div className="tc-extras">
          <span>Extras:</span>
          <span>Wd {inn.extras?.wides || 0}</span>
          <span>NB {inn.extras?.noBalls || 0}</span>
          <span>B {inn.extras?.byes || 0}</span>
          <span>LB {inn.extras?.legByes || 0}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="mrm-backdrop">
      <div className="mrm-box">
        {/* Trophy header */}
        <div className="mrm-hero">
          <div className="mrm-trophy">🏆</div>
          <div className="mrm-result-text">
            <h1 className="mrm-winner">{winner || 'Match Complete'}</h1>
            {margin && <p className="mrm-margin">{margin}</p>}
            {reason && <p className="mrm-reason">{reason}</p>}
          </div>
          <div className="mrm-summary-pill">{summary}</div>
        </div>

        {/* Match info */}
        <div className="mrm-match-info">
          <span>{config.team1.flag} {config.team1.name}</span>
          <span className="mrm-vs">vs</span>
          <span>{config.team2.flag} {config.team2.name}</span>
          <span className="mrm-format">· {config.format} · {config.venue}</span>
        </div>

        {/* Score summary row */}
        <div className="mrm-scores">
          <div className="mrm-score-block">
            <span className="msb-flag">{config.team1.flag}</span>
            <span className="msb-team">{config.team1.short}</span>
            <span className="msb-runs">{inn1?.runs}/{inn1?.wickets}</span>
            <span className="msb-ov">({inn1?.overs}.{inn1?.balls})</span>
          </div>
          <div className="mrm-score-divider">VS</div>
          <div className="mrm-score-block">
            <span className="msb-flag">{config.team2.flag}</span>
            <span className="msb-team">{config.team2.short}</span>
            <span className="msb-runs">{inn2?.runs}/{inn2?.wickets}</span>
            <span className="msb-ov">({inn2?.overs}.{inn2?.balls})</span>
          </div>
        </div>

        {/* Detailed stats */}
        <div className="mrm-stats">
          <TeamCard team={config.team1} inn={inn1} inningsLabel="1st Innings" />
          {inn2 && inn2.runs > 0 && (
            <TeamCard team={config.team2} inn={inn2} inningsLabel="2nd Innings" />
          )}
        </div>

        {/* Footer */}
        <div className="mrm-footer">
          {isAdmin ? (
            <button className="mrm-close-btn admin" onClick={onClose}>
              ⏹ Close Stream & End Match
            </button>
          ) : (
            <div className="mrm-viewer-footer">
              <p>The match has ended. Thank you for watching!</p>
              <button className="mrm-close-btn viewer" onClick={() => window.location.reload()}>
                ↩ Back to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
