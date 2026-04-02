import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SetupPage.css';

const FORMATS = [
  { label: 'T20', overs: 20 },
  { label: 'ODI', overs: 50 },
  { label: 'Test', overs: 450 },
  { label: 'Custom', overs: null },
];

const FLAG_OPTIONS = [
  '🏏','🦁','🐯','🦅','🌟','⚡','🔥','🏆','🌙','🌊','🏔️','🌿',
  '🎯','🛡️','⚔️','🎖️','🌺','🦋','🐉','🦊','🦅','🌈',
];

export default function SetupPage() {
  const navigate = useNavigate();

  const [team1Name, setTeam1Name] = useState('');
  const [team1Flag, setTeam1Flag] = useState('🏏');
  const [team2Name, setTeam2Name] = useState('');
  const [team2Flag, setTeam2Flag] = useState('⚡');
  const [format, setFormat] = useState('T20');
  const [customOvers, setCustomOvers] = useState('10');
  const [venue, setVenue] = useState('');
  const [toss, setToss] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [flagPicker, setFlagPicker] = useState(null); // 1 | 2 | null

  const selectedFormat = FORMATS.find(f => f.label === format);
  const maxOvers = format === 'Custom'
    ? (parseInt(customOvers) || 0)
    : selectedFormat?.overs || 20;

  // Validation
  const validate = () => {
    const e = {};
    if (!team1Name.trim()) e.team1 = 'Home team name is required';
    else if (team1Name.trim().length < 2) e.team1 = 'Name must be at least 2 characters';
    if (!team2Name.trim()) e.team2 = 'Away team name is required';
    else if (team2Name.trim().length < 2) e.team2 = 'Name must be at least 2 characters';
    if (team1Name.trim() && team2Name.trim() && team1Name.trim().toLowerCase() === team2Name.trim().toLowerCase())
      e.team2 = 'Team names must be different';
    if (format === 'Custom') {
      const o = parseInt(customOvers);
      if (!customOvers || isNaN(o) || o < 1) e.overs = 'Enter a valid number of overs (min 1)';
      else if (o > 100) e.overs = 'Max 100 overs for custom match';
    }
    return e;
  };

  const isValid = () => {
    const e = validate();
    return Object.keys(e).length === 0;
  };

  const handleChange = (field, val) => {
    // Clear error for that field on change
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    if (field === 'team1') setTeam1Name(val);
    if (field === 'team2') setTeam2Name(val);
    if (field === 'overs') setCustomOvers(val);
  };

  const handleLaunch = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setLoading(true);
    try {
      const t1name = team1Name.trim();
      const t2name = team2Name.trim();
      const matchConfig = {
        team1: { name: t1name, flag: team1Flag, short: t1name.slice(0, 3).toUpperCase() },
        team2: { name: t2name, flag: team2Flag, short: t2name.slice(0, 3).toUpperCase() },
        format,
        venue: venue.trim() || 'Cricket Stadium',
        toss,
        maxOvers,
        startTime: new Date().toISOString(),
      };
      const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
      const res = await fetch(`${serverUrl}/api/room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchConfig }),
      });
      const { roomId } = await res.json();
      sessionStorage.setItem(`match_${roomId}`, JSON.stringify(matchConfig));
      navigate(`/studio/${roomId}`);
    } catch {
      setErrors({ submit: 'Could not create match room. Make sure the server is running.' });
    } finally {
      setLoading(false);
    }
  };

  const t1preview = team1Name.trim() || 'Home Team';
  const t2preview = team2Name.trim() || 'Away Team';

  return (
    <div className="setup-page">
      <div className="setup-bg">
        <div className="setup-grid" />
        <div className="setup-glow g1" />
        <div className="setup-glow g2" />
      </div>

      {/* Flag picker modal */}
      {flagPicker && (
        <div className="flag-picker-backdrop" onClick={() => setFlagPicker(null)}>
          <div className="flag-picker-box" onClick={e => e.stopPropagation()}>
            <p className="flag-picker-title">Choose {flagPicker === 1 ? t1preview : t2preview}'s emblem</p>
            <div className="flag-grid">
              {FLAG_OPTIONS.map(f => (
                <button key={f} className={`flag-opt ${(flagPicker === 1 ? team1Flag : team2Flag) === f ? 'selected' : ''}`}
                  onClick={() => { flagPicker === 1 ? setTeam1Flag(f) : setTeam2Flag(f); setFlagPicker(null); }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="setup-wrap fade-up">
        <header className="setup-header">
          <div className="logo">
            <span className="logo-icon">🏏</span>
            <div>
              <h1>CRICKET<span>LIVE</span></h1>
              <p>Professional Broadcast & Scoring Studio</p>
            </div>
          </div>
          <div className="version-badge">v2.0</div>
        </header>

        <div className="setup-card">

          {/* FORMAT */}
          <div className="card-section">
            <h2 className="section-title">MATCH FORMAT</h2>
            <div className="format-row">
              {FORMATS.map(f => (
                <button key={f.label}
                  className={`fmt-btn ${format === f.label ? 'active' : ''}`}
                  onClick={() => setFormat(f.label)}>
                  {f.label}
                </button>
              ))}
            </div>
            {format === 'Custom' && (
              <div className="custom-overs-row">
                <label className="field-label">OVERS PER INNINGS</label>
                <div className="overs-input-wrap">
                  <input
                    type="number" min="1" max="100"
                    className={`overs-input ${errors.overs ? 'error' : ''}`}
                    value={customOvers}
                    onChange={e => handleChange('overs', e.target.value)}
                    placeholder="e.g. 10"
                  />
                  <span className="overs-suffix">overs</span>
                </div>
                {errors.overs && <p className="field-error">{errors.overs}</p>}
              </div>
            )}
          </div>

          {/* TEAMS */}
          <div className="card-section">
            <h2 className="section-title">TEAMS</h2>
            <div className="teams-row">
              {/* Team 1 */}
              <div className="team-col">
                <label className="field-label">HOME TEAM</label>
                <div className="team-input-row">
                  <button className="flag-btn" onClick={() => setFlagPicker(1)} title="Choose emblem">
                    {team1Flag}
                  </button>
                  <input
                    type="text"
                    className={`team-name-input ${errors.team1 ? 'error' : ''}`}
                    placeholder="Team name…"
                    value={team1Name}
                    maxLength={20}
                    onChange={e => handleChange('team1', e.target.value)}
                  />
                </div>
                {errors.team1 && <p className="field-error">{errors.team1}</p>}
                {team1Name.trim() && (
                  <div className="team-chip">
                    <span className="tc-flag">{team1Flag}</span>
                    <span className="tc-name">{team1Name.trim()}</span>
                    <span className="tc-short">{team1Name.trim().slice(0,3).toUpperCase()}</span>
                  </div>
                )}
              </div>

              <div className="vs-circle">VS</div>

              {/* Team 2 */}
              <div className="team-col">
                <label className="field-label">AWAY TEAM</label>
                <div className="team-input-row">
                  <button className="flag-btn" onClick={() => setFlagPicker(2)} title="Choose emblem">
                    {team2Flag}
                  </button>
                  <input
                    type="text"
                    className={`team-name-input ${errors.team2 ? 'error' : ''}`}
                    placeholder="Team name…"
                    value={team2Name}
                    maxLength={20}
                    onChange={e => handleChange('team2', e.target.value)}
                  />
                </div>
                {errors.team2 && <p className="field-error">{errors.team2}</p>}
                {team2Name.trim() && (
                  <div className="team-chip">
                    <span className="tc-flag">{team2Flag}</span>
                    <span className="tc-name">{team2Name.trim()}</span>
                    <span className="tc-short">{team2Name.trim().slice(0,3).toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* VENUE & TOSS */}
          <div className="card-section two-col">
            <div className="field">
              <label className="field-label">VENUE <span className="optional">(optional)</span></label>
              <input type="text" placeholder="e.g. Wankhede Stadium" value={venue}
                onChange={e => setVenue(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">TOSS <span className="optional">(optional)</span></label>
              <select value={toss} onChange={e => setToss(e.target.value)}
                disabled={!team1Name.trim() || !team2Name.trim()}>
                <option value="">— Select —</option>
                <option value={`${t1preview} won toss, batting`}>{t1preview} bat</option>
                <option value={`${t1preview} won toss, bowling`}>{t1preview} bowl</option>
                <option value={`${t2preview} won toss, batting`}>{t2preview} bat</option>
                <option value={`${t2preview} won toss, bowling`}>{t2preview} bowl</option>
              </select>
            </div>
          </div>

          {/* Match summary strip */}
          {team1Name.trim() && team2Name.trim() && (
            <div className="match-summary-strip">
              <span className="ms-team">{team1Flag} {team1Name.trim()}</span>
              <span className="ms-vs">vs</span>
              <span className="ms-team">{team2Flag} {team2Name.trim()}</span>
              <span className="ms-format">{format === 'Custom' ? `${maxOvers} ov` : format}</span>
              {venue.trim() && <span className="ms-venue">📍 {venue.trim()}</span>}
            </div>
          )}

          {errors.submit && <p className="submit-error">{errors.submit}</p>}

          <button
            className="launch-btn"
            onClick={handleLaunch}
            disabled={loading || !isValid()}>
            {loading ? '⟳ Creating Room…' : '⚡ LAUNCH LIVE STUDIO'}
          </button>

          {!isValid() && !loading && (
            <p className="launch-hint">
              {!team1Name.trim() || !team2Name.trim()
                ? '👆 Enter both team names to continue'
                : Object.values(validate())[0]}
            </p>
          )}
        </div>

        <div className="setup-features">
          <div className="feat"><span>📱</span><p>QR Mobile Camera</p></div>
          <div className="feat"><span>🔴</span><p>Live Watch Link</p></div>
          <div className="feat"><span>📊</span><p>Ball-by-Ball Scoring</p></div>
          <div className="feat"><span>💾</span><p>Download Recording</p></div>
        </div>
      </div>
    </div>
  );
}
