import React, { useEffect, useState } from 'react';
import './OverStatsOverlay.css';

export default function OverStatsOverlay({ inn1, inn2, innings, config, overNumber, onDone, isAdmin = false }) {
  const [timeLeft, setTimeLeft] = useState(20);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(t => {
        const next = t - 1;
        setProgress((next / 20) * 100);
        if (next <= 0) { clearInterval(interval); onDone(); }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onDone]);

  if (!config || !inn1) return null;

  const showBothTeams = innings === 2;

  const fmtSR = (r, b) => b > 0 ? ((r / b) * 100).toFixed(0) : '—';
  const fmtEco = (r, o, b) => {
    const balls = (o || 0) * 6 + (b || 0);
    return balls > 0 ? ((r / balls) * 6).toFixed(1) : '—';
  };

  const TeamStats = ({ team, inn, label, highlight }) => {
    if (!inn) return null;

    // Top 4 batters by runs (who have faced at least 1 ball)
    const topBats = [...(inn.batters || [])]
      .filter(b => b.balls > 0)
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 4);

    // Top 3 bowlers: collect from overLog bowler data + current bowler
    // Since we only store current bowler, show current + up to 2 previous from overLog
    const bowlerMap = {};
    (inn.bowlerLog || []).forEach(bw => {
      if (!bowlerMap[bw.name]) bowlerMap[bw.name] = { name: bw.name, overs: 0, balls: 0, runs: 0, wickets: 0 };
      bowlerMap[bw.name].runs += bw.runs;
      bowlerMap[bw.name].wickets += bw.wickets;
      bowlerMap[bw.name].overs += bw.overs;
      bowlerMap[bw.name].balls += bw.balls;
    });
    // Add current bowler
    if (inn.bowler) {
      const bk = inn.bowler.name;
      if (!bowlerMap[bk]) bowlerMap[bk] = { ...inn.bowler };
      else {
        bowlerMap[bk].runs += inn.bowler.runs;
        bowlerMap[bk].wickets += inn.bowler.wickets;
        bowlerMap[bk].overs += inn.bowler.overs;
        bowlerMap[bk].balls += inn.bowler.balls;
      }
    }
    const topBowlers = Object.values(bowlerMap)
      .filter(b => b.overs > 0 || b.balls > 0)
      .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)
      .slice(0, 3);

    // Fallback: if no bowlerLog, just show current bowler
    const showBowlers = topBowlers.length > 0
      ? topBowlers
      : (inn.bowler && (inn.bowler.overs > 0 || inn.bowler.balls > 0) ? [inn.bowler] : []);

    return (
      <div className={`oso-team-block ${highlight ? 'highlight' : ''}`}>
        <div className="oso-team-header">
          <span className="oso-flag">{team.flag}</span>
          <span className="oso-team-name">{team.name}</span>
          <span className="oso-team-score">
            {inn.runs ?? 0}/{inn.wickets ?? 0}
            <span className="oso-ov"> ({inn.overs ?? 0}.{inn.balls ?? 0} ov)</span>
          </span>
          <span className="oso-rr">RR: {inn.runRate ?? '0.00'}</span>
          {label && <span className="oso-label">{label}</span>}
        </div>

        {/* Top 4 Batting */}
        <div className="oso-sub-label">🏏 BATTING</div>
        <div className="oso-table-wrap">
          <table className="oso-table">
            <thead>
              <tr><th>BATTER</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr>
            </thead>
            <tbody>
              {topBats.length === 0
                ? <tr><td colSpan={6} className="oso-empty">No data yet</td></tr>
                : topBats.map((b, i) => {
                    const isStriker = inn.batters?.indexOf(b) === inn.currentBatter;
                    return (
                      <tr key={i} className={isStriker && highlight ? 'on-strike' : ''}>
                        <td className="oso-pname">{b.name}{isStriker && highlight ? ' *' : ''}</td>
                        <td>{b.runs}</td><td>{b.balls}</td>
                        <td>{b.fours}</td><td>{b.sixes}</td>
                        <td className="oso-mono">{fmtSR(b.runs, b.balls)}</td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>

        {/* Top 3 Bowling */}
        {showBowlers.length > 0 && (
          <>
            <div className="oso-sub-label">🎳 BOWLING</div>
            <div className="oso-table-wrap">
              <table className="oso-table">
                <thead>
                  <tr><th>BOWLER</th><th>O</th><th>R</th><th>W</th><th>ECO</th></tr>
                </thead>
                <tbody>
                  {showBowlers.map((b, i) => (
                    <tr key={i}>
                      <td className="oso-pname">{b.name}</td>
                      <td>{b.overs}.{b.balls}</td>
                      <td>{b.runs}</td>
                      <td className={b.wickets > 0 ? 'oso-wicket-cell' : ''}>{b.wickets}</td>
                      <td className="oso-mono">{fmtEco(b.runs, b.overs, b.balls)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* This over balls */}
        {highlight && inn.overLog?.length > 0 && (
          <div className="oso-over-row">
            <span className="oso-o-label">Over {overNumber}:</span>
            {(inn.overLog[inn.overLog.length - 1]?.balls || []).map((b, i) => (
              <span key={i} className={`oso-ball oso-ball-${b.type}`}>{b.symbol}</span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="oso-backdrop">
      <div className="oso-container">
        {/* Header */}
        <div className="oso-header">
          <div className="oso-header-left">
            <span className="oso-over-badge">END OF OVER {overNumber}</span>
            <span className="oso-match-label">{config.team1.short} vs {config.team2.short} · {config.format}</span>
          </div>
          <div className="oso-timer">
            <svg className="oso-timer-ring" viewBox="0 0 36 36">
              <path className="oso-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="oso-ring-fill" strokeDasharray={`${progress}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span className="oso-timer-num">{timeLeft}</span>
          </div>
        </div>

        {showBothTeams ? (
          <div className="oso-two-teams">
            <TeamStats team={config.team1} inn={inn1} label="1st Inn" highlight={false} />
            <TeamStats team={config.team2} inn={inn2} label="2nd Inn" highlight={true} />
          </div>
        ) : (
          <TeamStats team={config.team1} inn={inn1} label="" highlight={true} />
        )}

        {showBothTeams && inn1 && inn2 && (
          <div className="oso-target-bar">
            <span className="oso-tgt-label">TARGET</span>
            <span className="oso-tgt-runs">{inn1.runs + 1}</span>
            <span className="oso-tgt-sep">·</span>
            <span className="oso-tgt-need">
              {Math.max(0, inn1.runs + 1 - inn2.runs)} needed from {Math.max(0, (config.maxOvers * 6) - (inn2.overs * 6 + inn2.balls))} balls
            </span>
            <span className="oso-tgt-rrr">
              RRR: {(() => {
                const ballsLeft = (config.maxOvers * 6) - (inn2.overs * 6 + inn2.balls);
                const runsNeeded = inn1.runs + 1 - inn2.runs;
                return ballsLeft > 0 && runsNeeded > 0 ? ((runsNeeded / ballsLeft) * 6).toFixed(2) : '—';
              })()}
            </span>
          </div>
        )}

        <div className="oso-footer">
          <span className="oso-auto-label">Auto-closes in {timeLeft}s</span>
          {isAdmin && (
            <button className="oso-skip-btn" onClick={(e) => { e.stopPropagation(); onDone(); }}>
              Skip ›
            </button>
          )}
        </div>
      </div>
    </div>
  );
}