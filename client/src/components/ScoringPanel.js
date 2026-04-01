import React, { useState } from 'react';
import './ScoringPanel.css';

const DISMISSALS = ['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket', 'Handled Ball'];
// Dismissals that require a fielder name
const NEEDS_FIELDER = ['Caught', 'Run Out', 'Stumped'];

export default function ScoringPanel({ innings, inn1, inn2, battingTeam, bowlingTeam, config, inningsNum, onBall, onUpdateBatter, onUpdateBowler, onNewBowler }) {
  const [dismissal, setDismissal] = useState('Caught');
  const [fielderName, setFielderName] = useState('');
  const [wideRuns, setWideRuns] = useState(1);
  const [nbRuns, setNbRuns] = useState(1);
  const [byeRuns, setByeRuns] = useState(1);
  const [editBatter, setEditBatter] = useState(null);
  const [editBowler, setEditBowler] = useState(false);
  const [tempName, setTempName] = useState('');

  const needsFielder = NEEDS_FIELDER.includes(dismissal);

  const b1 = innings.batters?.[innings.currentBatter];
  const b2 = innings.batters?.[1 - (innings.currentBatter || 0)];
  const sr = (b) => b?.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '—';
  const eco = innings.bowler?.balls + innings.bowler?.overs * 6 > 0
    ? ((innings.bowler.runs / (innings.bowler.overs + innings.bowler.balls / 6))).toFixed(2) : '—';

  const target = inningsNum === 2 ? (inn1?.runs || 0) + 1 : null;
  const needed = target ? target - innings.runs : null;
  const ballsLeft = config ? ((config.maxOvers - innings.overs) * 6 - innings.balls) : 0;

  // Lock scoring panel when innings is finished
  const inn1Over = inningsNum === 1 && (innings.wickets >= 10 || innings.overs >= (config?.maxOvers || 999));
  const inn2Over = inningsNum === 2 && (
    innings.wickets >= 10 ||
    innings.overs >= (config?.maxOvers || 999) ||
    (target !== null && innings.runs >= target)
  );
  const scoringLocked = inn1Over || inn2Over;

  return (
    <div className="scoring-panel">

      {/* Scoreboard */}
      <div className="sp-scoreboard">
        <div className="sp-team-row">
          <span>{battingTeam?.flag}</span>
          <span className="sp-tname">{battingTeam?.name}</span>
          <div className="sp-score-block">
            <span className="sp-big">{innings.runs}/{innings.wickets}</span>
            <span className="sp-ov">({innings.overs}.{innings.balls} ov)</span>
          </div>
        </div>
        <div className="sp-meta-row">
          <span>CRR: <b>{innings.runRate}</b></span>
          {target && <span>TGT: <b>{target}</b></span>}
          {needed != null && <span>NEED: <b>{needed} off {ballsLeft}b</b></span>}
          <span>EXT: <b>{innings.extras.wides + innings.extras.noBalls + innings.extras.byes + innings.extras.legByes}</b></span>
        </div>
      </div>

      {/* At the crease */}
      <div className="sp-section-label">AT THE CREASE</div>
      <div className="sp-table">
        <div className="sp-thead"><span>BATTER</span><span>R</span><span>B</span><span>4s</span><span>6s</span><span>SR</span></div>
        {[b1, b2].map((b, i) => !b ? null : (
          <div key={i} className={`sp-tr ${i === 0 ? 'on-strike' : ''}`}>
            <span className="sp-bname" onClick={() => { setEditBatter(i === 0 ? innings.currentBatter : 1 - innings.currentBatter); setTempName(b.name); }}>
              {b.name}{i === 0 ? ' *' : ''} <span className="edit-icon">✎</span>
            </span>
            <span>{b.runs}</span><span>{b.balls}</span><span>{b.fours}</span><span>{b.sixes}</span>
            <span className="mono">{sr(b)}</span>
          </div>
        ))}
      </div>

      {/* Bowling */}
      <div className="sp-section-label">BOWLING</div>
      <div className="sp-table">
        <div className="sp-thead"><span>BOWLER</span><span>O</span><span>R</span><span>W</span><span>ECO</span></div>
        <div className="sp-tr on-strike">
          <span className="sp-bname" onClick={() => { setEditBowler(true); setTempName(innings.bowler?.name); }}>
            {innings.bowler?.name} <span className="edit-icon">✎</span>
          </span>
          <span>{innings.bowler?.overs}.{innings.bowler?.balls}</span>
          <span>{innings.bowler?.runs}</span>
          <span>{innings.bowler?.wickets}</span>
          <span className="mono">{eco}</span>
        </div>
      </div>
      <button className="new-bowler-btn" onClick={onNewBowler}>+ New Bowler (next over)</button>

      {/* Innings over banner */}
      {scoringLocked && (
        <div className="innings-over-banner">
          {inn1Over
            ? <><span>✅</span><span>1st Innings Complete — Switch to 2nd Innings above</span></>
            : <><span>🏆</span><span>2nd Innings Complete — Match Over!</span></>}
        </div>
      )}

      {/* Run buttons */}
      <div className="sp-section-label">SCORE BALL</div>
      <div className={`run-grid ${scoringLocked ? 'locked' : ''}`}>
        {[0, 1, 2, 3, 4, 6].map(r => (
          <button key={r} className={`run-btn r${r}`}
            onClick={() => !scoringLocked && onBall({ type: 'runs', value: r })}
            disabled={scoringLocked}>
            {r === 0 ? '•' : r}
          </button>
        ))}
      </div>

      {/* Extras */}
      <div className="extras-grid">
        <div className="extra-cell">
          <span className="ext-label">WIDE</span>
          <select value={wideRuns} onChange={e => setWideRuns(+e.target.value)}>
            {[1,2,3,4,5].map(v => <option key={v} value={v}>+{v}</option>)}
          </select>
          <button className="ext-btn wide" disabled={scoringLocked} onClick={() => !scoringLocked && onBall({ type: 'wide', value: wideRuns })}>Wide</button>
        </div>
        <div className="extra-cell">
          <span className="ext-label">NO BALL</span>
          <select value={nbRuns} onChange={e => setNbRuns(+e.target.value)}>
            {[1,2,3,4,5,6].map(v => <option key={v} value={v}>+{v}</option>)}
          </select>
          <button className="ext-btn nb" disabled={scoringLocked} onClick={() => !scoringLocked && onBall({ type: 'noball', value: nbRuns })}>NB</button>
        </div>
        <div className="extra-cell">
          <span className="ext-label">BYE</span>
          <select value={byeRuns} onChange={e => setByeRuns(+e.target.value)}>
            {[1,2,3,4].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <button className="ext-btn bye" disabled={scoringLocked} onClick={() => !scoringLocked && onBall({ type: 'bye', value: byeRuns })}>Bye</button>
        </div>
      </div>

      {/* Wicket */}
      <div className="sp-section-label">WICKET</div>
      <div className="wicket-section">
        <div className="wicket-row">
          <select className="dismissal-sel" value={dismissal} onChange={e => { setDismissal(e.target.value); setFielderName(''); }}>
            {DISMISSALS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button className="wicket-btn" disabled={scoringLocked}
            onClick={() => {
              if (!scoringLocked) {
                onBall({ type: 'wicket', dismissal, fielder: fielderName.trim() || null });
                setFielderName('');
              }
            }}>
            ⚡ WICKET!
          </button>
        </div>
        {needsFielder && (
          <div className="fielder-row">
            <span className="fielder-label">
              {dismissal === 'Caught' ? '🧤 Caught by' : dismissal === 'Stumped' ? '🧤 Stumped by' : '🏃 Run out by'}
            </span>
            <input
              className="fielder-input"
              type="text"
              placeholder={`Fielder name (optional)`}
              value={fielderName}
              onChange={e => setFielderName(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Extras breakdown */}
      <div className="extras-breakdown">
        {['Wd', 'NB', 'B', 'LB'].map((k, i) => {
          const vals = [innings.extras.wides, innings.extras.noBalls, innings.extras.byes, innings.extras.legByes];
          return <span key={k} className="ext-chip">{k}: {vals[i]}</span>;
        })}
      </div>

      {/* Edit Modals */}
      {editBatter !== null && (
        <div className="edit-overlay" onClick={() => setEditBatter(null)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <h4>Edit Batter Name</h4>
            <input autoFocus value={tempName} onChange={e => setTempName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { onUpdateBatter(editBatter, tempName); setEditBatter(null); } }} />
            <div className="edit-btns">
              <button onClick={() => setEditBatter(null)}>Cancel</button>
              <button className="save" onClick={() => { onUpdateBatter(editBatter, tempName); setEditBatter(null); }}>Save</button>
            </div>
          </div>
        </div>
      )}
      {editBowler && (
        <div className="edit-overlay" onClick={() => setEditBowler(false)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <h4>Edit Bowler Name</h4>
            <input autoFocus value={tempName} onChange={e => setTempName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { onUpdateBowler(tempName); setEditBowler(false); } }} />
            <div className="edit-btns">
              <button onClick={() => setEditBowler(false)}>Cancel</button>
              <button className="save" onClick={() => { onUpdateBowler(tempName); setEditBowler(false); }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
