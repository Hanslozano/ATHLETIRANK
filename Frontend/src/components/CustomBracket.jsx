import React, { useEffect, useRef, useState } from 'react';
import "../style/CustomBrackets.css";

const CustomBracket = ({ matches, eliminationType = 'single' }) => {
  const bracketRef = useRef(null);
  const [connectionPoints, setConnectionPoints] = useState([]);
  const [matchDisplayNumbers, setMatchDisplayNumbers] = useState({});

  useEffect(() => {
    if (!matches || matches.length === 0) return;

    // Sort matches by round and then by id to get the correct order
    const sortedMatches = [...matches].sort((a, b) => {
      if (a.round_number !== b.round_number) {
        return a.round_number - b.round_number;
      }
      if (a.bracket_type !== b.bracket_type) {
        // Order: winner, loser, championship
        const typeOrder = { 'winner': 0, 'loser': 1, 'championship': 2 };
        return typeOrder[a.bracket_type] - typeOrder[b.bracket_type];
      }
      return a.id - b.id;
    });

    // Create a mapping of match ID to display number
    const displayNumbers = {};
    sortedMatches.forEach((match, index) => {
      displayNumbers[match.id] = index + 1;
    });

    setMatchDisplayNumbers(displayNumbers);
  }, [matches]);

  // Measure match positions for connection lines
  useEffect(() => {
    if (!bracketRef.current) return;

    const matchEls = bracketRef.current.querySelectorAll(".match");
    const points = [];

    matchEls.forEach((matchEl) => {
      const roundIndex = parseInt(matchEl.closest(".round")?.dataset.round, 10);
      const matchIndex = parseInt(matchEl.dataset.match, 10);
      const bracketType = matchEl.closest(".bracket-section")?.dataset.bracketType || 'winner';

      const rect = matchEl.getBoundingClientRect();
      const containerRect = bracketRef.current.getBoundingClientRect();

      // Right-center of current match
      const x = rect.right - containerRect.left;
      const y = rect.top - containerRect.top + rect.height / 2;

      // Left-center of current match (for connecting into)
      const xLeft = rect.left - containerRect.left;
      const yLeft = rect.top - containerRect.top + rect.height / 2;

      points.push({ roundIndex, matchIndex, x, y, xLeft, yLeft, bracketType });
    });

    setConnectionPoints(points);
  }, [matches, eliminationType]);

  if (!matches || matches.length === 0) {
    return (
      <div className="no-matches">
        <div className="no-matches-content">
          <div className="no-matches-icon">🏆</div>
          <h3>No Tournament Created Yet</h3>
          <p>Generate matches by creating a bracket with teams to see the tournament structure.</p>
        </div>
      </div>
    );
  }

  // Separate matches by bracket type for double elimination
  const winnerMatches = matches.filter(m => m.bracket_type === 'winner');
  const loserMatches = matches.filter(m => m.bracket_type === 'loser');
  const championshipMatches = matches.filter(m => m.bracket_type === 'championship');

  // Group matches by round for each bracket type
  const groupMatchesByRound = (matches) => {
    const rounds = {};
    matches.forEach(match => {
      if (!rounds[match.round_number]) {
        rounds[match.round_number] = [];
      }
      rounds[match.round_number].push(match);
    });
    
    return Object.keys(rounds).sort((a, b) => parseInt(a) - parseInt(b));
  };

  const winnerRounds = groupMatchesByRound(winnerMatches);
  const loserRounds = groupMatchesByRound(loserMatches);

  // Function to render a single match component (using your exact original styling)
  const renderMatch = (match, matchIndex) => (
    <div 
      key={match.id} 
      className={`match ${match.status}`}
      data-match={matchIndex}
    >
      <div className="match-header">
        <span className="match-id">Game #{matchDisplayNumbers[match.id]}</span>
        <span className={`match-status ${match.status}`}>
          {match.status === 'completed' ? '✓' : 
            match.status === 'ongoing' ? '⏱️' : '📅'}
          {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
        </span>
      </div>
      
      <div className="teams-container">
        <div className={`team team1 ${match.winner_id === match.team1_id ? 'winner' : ''}`}>
          <div className="team-info">
            <span className="team-name">
              {match.team1_name || 'TBD'}
            </span>
            {match.winner_id === match.team1_id && (
              <span className="winner-crown">👑</span>
            )}
          </div>
          {match.score_team1 !== null && match.score_team1 !== undefined && (
            <span className="score">{match.score_team1}</span>
          )}
        </div>

        <div className="vs-divider">
          {match.team2_id ? (
            <span className="vs-text">VS</span>
          ) : (
            <span className="bye-text">BYE</span>
          )}
        </div>

        <div className={`team team2 ${match.winner_id === match.team2_id ? 'winner' : ''}`}>
          <div className="team-info">
            <span className="team-name">
              {match.team2_name || (match.team2_id ? 'TBD' : '')}
            </span>
            {match.winner_id === match.team2_id && (
              <span className="winner-crown">👑</span>
            )}
          </div>
          {match.score_team2 !== null && match.score_team2 !== undefined && (
            <span className="score">{match.score_team2}</span>
          )}
        </div>
      </div>

      {match.status === 'completed' && match.winner_name && (
        <div className="match-result">
          <span className="trophy-icon">🏆</span>
          <span className="winner-text">{match.winner_name} Wins!</span>
        </div>
      )}

      {match.team2_id === null && (
        <div className="bye-notice">
          <span className="advance-icon">⚡</span>
          {match.team1_name} advances automatically
        </div>
      )}

      {match.status === 'ongoing' && (
        <div className="live-indicator">
          <span className="live-dot"></span>
          LIVE MATCH
        </div>
      )}
    </div>
  );

  // Function to render a round section (using your exact original styling)
  const renderRoundSection = (roundNumber, matches, bracketType) => {
    let displayRoundNumber, roundTitle;
    
    if (bracketType === 'loser') {
      displayRoundNumber = roundNumber - 100;
      roundTitle = `LB Round ${displayRoundNumber}`;
    } else if (bracketType === 'championship') {
      roundTitle = "Championship";
    } else {
      displayRoundNumber = roundNumber;
      roundTitle = `Round ${displayRoundNumber}`;
    }

    const roundMatches = matches.filter(m => m.round_number == roundNumber);

    return (
      <div key={roundNumber} className="round" data-round={displayRoundNumber || 0}>
        <div className="round-header">
          <div className="round-number">{roundTitle}</div>
          <div className="round-subtitle">
            {bracketType === 'championship' ? 'Final Match' :
             bracketType === 'loser' && displayRoundNumber === 1 ? 'First LB Round' :
             bracketType === 'loser' ? `LB Round ${displayRoundNumber}` :
             displayRoundNumber === 1 ? 'First Round' :
             `Round ${displayRoundNumber}`}
          </div>
        </div>
        <div className="matches">
          {roundMatches.map((match, matchIndex) => renderMatch(match, matchIndex))}
        </div>
      </div>
    );
  };

  return (
    <div className="enhanced-bracket-wrapper">
      {/* Header Section */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>
          Single Elimination Tournament
        </h1>
        <div style={{ 
          height: '4px', 
          width: '64px', 
          background: '#f97316',
          marginBottom: '24px'
        }}></div>

        {/* Tournament Info */}
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.85)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '600', color: 'white', fontSize: '1rem' }}>Teams:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f97316' }}>
              {new Set([...matches.map(m => m.team1_name), ...matches.map(m => m.team2_name)].filter(Boolean)).size}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '600', color: 'white', fontSize: '1rem' }}>Format:</span>
            <span style={{ fontSize: '1rem', color: '#a5b4fc' }}>Single Elimination</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '600', color: 'white', fontSize: '1rem' }}>Total Rounds:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>{winnerRounds.length}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '600', color: 'white', fontSize: '1rem' }}>Total Matches:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>{matches.length}</span>
          </div>
        </div>

        {/* Info Banner */}
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.85)',
          borderLeft: '4px solid #f97316',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          borderRadius: '8px',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(8px)'
        }}>
          <span style={{ fontSize: '1.25rem', color: '#f97316' }}>ℹ️</span>
          <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            Single elimination format. Lose once and you're out. Winner advances to the next round.
          </span>
        </div>
      </div>

      {/* Bracket Container */}
      <div style={{ 
        padding: '32px',
        background: 'rgba(15, 23, 42, 0.6)',
        borderRadius: '16px',
        border: '2px solid rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(8px)'
      }}>
        <div className="enhanced-bracket" ref={bracketRef}>
          {/* Connection Lines */}
          <svg className="connection-lines" xmlns="http://www.w3.org/2000/svg">
            {connectionPoints.map((fromPoint, i) => {
              // For double elimination, we need different connection logic
              if (eliminationType === 'double') {
                // Connect within the same bracket type
                const toPoint = connectionPoints.find(
                  (p) =>
                    p.bracketType === fromPoint.bracketType &&
                    p.roundIndex === fromPoint.roundIndex + 1 &&
                    Math.floor(fromPoint.matchIndex / 2) === p.matchIndex
                );

                if (!toPoint) return null;

                const midX = (fromPoint.x + toPoint.xLeft) / 2;

                return (
                  <g key={i} className="bracket-connection">
                    <line
                      x1={fromPoint.x}
                      y1={fromPoint.y}
                      x2={midX}
                      y2={fromPoint.y}
                      stroke="white"
                      strokeWidth="2"
                    />
                    <line
                      x1={midX}
                      y1={fromPoint.y}
                      x2={midX}
                      y2={toPoint.yLeft}
                      stroke="white"
                      strokeWidth="2"
                    />
                    <line
                      x1={midX}
                      y1={toPoint.yLeft}
                      x2={toPoint.xLeft}
                      y2={toPoint.yLeft}
                      stroke="white"
                      strokeWidth="2"
                    />
                  </g>
                );
              } else {
                // Single elimination connection logic (original)
                const toPoint = connectionPoints.find(
                  (p) =>
                    p.roundIndex === fromPoint.roundIndex + 1 &&
                    Math.floor(fromPoint.matchIndex / 2) === p.matchIndex
                );

                if (!toPoint) return null;

                const midX = (fromPoint.x + toPoint.xLeft) / 2;

                return (
                  <g key={i} className="bracket-connection">
                    <line
                      x1={fromPoint.x}
                      y1={fromPoint.y}
                      x2={midX}
                      y2={fromPoint.y}
                      stroke="white"
                      strokeWidth="2"
                    />
                    <line
                      x1={midX}
                      y1={fromPoint.y}
                      x2={midX}
                      y2={toPoint.yLeft}
                      stroke="white"
                      strokeWidth="2"
                    />
                    <line
                      x1={midX}
                      y1={toPoint.yLeft}
                      x2={toPoint.xLeft}
                      y2={toPoint.yLeft}
                      stroke="white"
                      strokeWidth="2"
                    />
                  </g>
                );
              }
            })}
          </svg>

          {/* Bracket Container */}
          <div className="bracket-container">
            {eliminationType === 'double' ? (
              <div className="double-elimination-bracket">
                {/* Winner's Bracket */}
                <div className="bracket-section winner-bracket" data-bracket-type="winner">
                  <h3 className="bracket-title">Winner's Bracket</h3>
                  <div className="rounds-container">
                    {winnerRounds.map(roundNumber => 
                      renderRoundSection(roundNumber, winnerMatches, 'winner')
                    )}
                  </div>
                </div>

                {/* Loser's Bracket */}
                {loserMatches.length > 0 && (
                  <div className="bracket-section loser-bracket" data-bracket-type="loser">
                    <h3 className="bracket-title">Loser's Bracket</h3>
                    <div className="rounds-container">
                      {loserRounds.map(roundNumber => 
                        renderRoundSection(roundNumber, loserMatches, 'loser')
                      )}
                    </div>
                  </div>
                )}

                {/* Championship Match */}
                {championshipMatches.length > 0 && (
                  <div className="bracket-section championship-bracket" data-bracket-type="championship">
                    <h3 className="bracket-title">Championship</h3>
                    <div className="rounds-container">
                      {renderRoundSection(200, championshipMatches, 'championship')}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Single Elimination Bracket (original layout)
              winnerRounds.map((roundNumber, roundIndex) => (
                <div key={roundNumber} className="round" data-round={roundIndex}>
                  <div className="round-header">
                    <div className="round-number">Round {roundNumber}</div>
                    <div className="round-subtitle">
                      {roundNumber === '1' ? 'First Round' :
                       roundNumber === winnerRounds[winnerRounds.length - 1] ? 'Final' :
                       roundNumber === winnerRounds[winnerRounds.length - 2] ? 'Semi-Final' :
                       `Round ${roundNumber}`}
                    </div>
                  </div>
                  <div className="matches">
                    {winnerMatches
                      .filter(m => m.round_number == roundNumber)
                      .map((match, matchIndex) => renderMatch(match, matchIndex))
                    }
                  </div>
                </div>
              ))
            )}
          </div>

          {winnerRounds.length === 0 && (
            <div className="no-rounds">
              <div className="no-rounds-content">
                <div className="warning-icon">⚠️</div>
                <p>No tournament rounds found. Please check if matches were generated properly.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomBracket;