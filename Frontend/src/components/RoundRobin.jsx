import React from 'react';

export default function RoundRobinBracketDisplay({ matches = [] }) {
  // If no matches provided, show empty state
  if (!matches || matches.length === 0) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #0c1445 0%, #1a237e 50%, #283593 100%)',
        padding: '24px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>No Round Robin Matches</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Generate matches to see the tournament structure</p>
        </div>
      </div>
    );
  }

  // Group matches by round
  const matchesByRound = {};
  matches.forEach(match => {
    const roundNum = match.round_number;
    if (!matchesByRound[roundNum]) {
      matchesByRound[roundNum] = [];
    }
    matchesByRound[roundNum].push(match);
  });

  const rounds = Object.keys(matchesByRound).sort((a, b) => parseInt(a) - parseInt(b));

  // Get unique teams
  const teamsSet = new Set();
  matches.forEach(match => {
    if (match.team1_name) teamsSet.add(match.team1_name);
    if (match.team2_name) teamsSet.add(match.team2_name);
  });
  const totalTeams = teamsSet.size;
  const totalMatches = matches.length;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0c1445 0%, #1a237e 50%, #283593 100%)',
      padding: '24px',
      color: 'white'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '8px' }}>
            Round Robin Tournament
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
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f97316' }}>{totalTeams}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '600', color: 'white', fontSize: '1rem' }}>Format:</span>
              <span style={{ fontSize: '1rem', color: '#a5b4fc' }}>Round Robin</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '600', color: 'white', fontSize: '1rem' }}>Total Rounds:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>{rounds.length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '600', color: 'white', fontSize: '1rem' }}>Total Matches:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>{totalMatches}</span>
            </div>
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
            Each team will play against every other team once. Winner determined by final standings.
          </span>
        </div>

        {/* Rounds - Vertical Layout with Horizontal Matches */}
        <div style={{ 
          padding: '32px',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '16px',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {rounds.map((roundNum, roundIndex) => {
              const roundMatches = matchesByRound[roundNum];
              
              return (
                <div key={roundNum} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  {/* Round Label */}
                  <div style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(37, 99, 235, 0.4)',
                    border: '1px solid rgba(37, 99, 235, 0.3)',
                    minWidth: '160px',
                    width: '160px',
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '16px',
                    backdropFilter: 'blur(8px)'
                  }}>
                    <div style={{
                      fontSize: '1.4em',
                      fontWeight: '700',
                      textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      marginBottom: '4px'
                    }}>
                      Round {roundNum}
                    </div>
                    <div style={{
                      fontSize: '0.85em',
                      opacity: '0.9',
                      fontWeight: '600'
                    }}>
                      {roundMatches.length} {roundMatches.length === 1 ? 'Match' : 'Matches'}
                    </div>
                  </div>
                  
                  {/* Matches Container */}
                  <div style={{ 
                    display: 'flex',
                    gap: '20px',
                    overflowX: 'auto',
                    paddingBottom: '16px',
                    flex: 1
                  }}>
                    {roundMatches.map((match, matchIndex) => {
                      const isCompleted = match.status === 'completed';
                      const isOngoing = match.status === 'ongoing';
                      const team1Won = match.winner_id === match.team1_id;
                      const team2Won = match.winner_id === match.team2_id;
                      const isDraw = isCompleted && !match.winner_id && match.score_team1 === match.score_team2;

                      return (
                        <div key={match.id} style={{
                          background: 'rgba(15, 23, 42, 0.85)',
                          border: '2px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '16px',
                          padding: '20px',
                          minWidth: '280px',
                          flexShrink: 0,
                          boxShadow: '0 10px 25px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          backdropFilter: 'blur(8px)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                          e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.35), 0 5px 15px rgba(0,0,0,0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0) scale(1)';
                          e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)';
                        }}>
                          {/* Match Header */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px',
                            paddingBottom: '12px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)'
                          }}>
                            <span style={{
                              fontWeight: '600',
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontSize: '0.9em'
                            }}>
                              Match #{match.id}
                            </span>
                            <span style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 12px',
                              borderRadius: '8px',
                              fontSize: '0.85em',
                              fontWeight: '600',
                              background: isCompleted 
                                ? 'rgba(16, 185, 129, 0.2)' 
                                : isOngoing 
                                  ? 'rgba(59, 130, 246, 0.2)' 
                                  : 'rgba(92, 107, 192, 0.2)',
                              color: isCompleted 
                                ? '#6ee7b7' 
                                : isOngoing 
                                  ? '#93c5fd' 
                                  : '#a5b4fc',
                              border: `1px solid ${isCompleted 
                                ? 'rgba(16, 185, 129, 0.3)' 
                                : isOngoing 
                                  ? 'rgba(59, 130, 246, 0.3)' 
                                  : 'rgba(92, 107, 192, 0.3)'}`
                            }}>
                              {isCompleted ? '✓ Completed' : isOngoing ? '⏱️ Live' : '📅 Scheduled'}
                            </span>
                          </div>
                          
                          {/* Teams */}
                          <div style={{ marginBottom: '16px' }}>
                            {/* Team 1 */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px 16px',
                              margin: '6px 0',
                              border: team1Won ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.05)',
                              borderRadius: '10px',
                              background: team1Won ? 'rgba(16, 185, 129, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                              transition: 'all 0.3s ease'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                {team1Won && (
                                  <span style={{ fontSize: '1.2em' }}>👑</span>
                                )}
                                <span style={{
                                  fontSize: '1em',
                                  color: '#ffffff',
                                  fontWeight: team1Won ? '700' : '600'
                                }}>
                                  {match.team1_name || 'TBD'}
                                </span>
                              </div>
                              {match.score_team1 !== null && match.score_team1 !== undefined && (
                                <span style={{
                                  fontSize: '1.2em',
                                  fontWeight: '700',
                                  color: team1Won ? '#10b981' : '#e2e8f0',
                                  minWidth: '30px',
                                  textAlign: 'right'
                                }}>
                                  {match.score_team1}
                                </span>
                              )}
                            </div>

                            {/* VS Divider */}
                            <div style={{
                              textAlign: 'center',
                              padding: '6px 0'
                            }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 16px',
                                background: isDraw ? 'rgba(251, 191, 36, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                                color: isDraw ? '#fbbf24' : '#818cf8',
                                fontWeight: '700',
                                fontSize: '0.85em',
                                borderRadius: '8px',
                                border: `1px solid ${isDraw ? 'rgba(251, 191, 36, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
                              }}>
                                {isDraw ? 'DRAW' : 'VS'}
                              </span>
                            </div>

                            {/* Team 2 */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px 16px',
                              margin: '6px 0',
                              border: team2Won ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.05)',
                              borderRadius: '10px',
                              background: team2Won ? 'rgba(16, 185, 129, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                              transition: 'all 0.3s ease'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                {team2Won && (
                                  <span style={{ fontSize: '1.2em' }}>👑</span>
                                )}
                                <span style={{
                                  fontSize: '1em',
                                  color: '#ffffff',
                                  fontWeight: team2Won ? '700' : '600'
                                }}>
                                  {match.team2_name || 'TBD'}
                                </span>
                              </div>
                              {match.score_team2 !== null && match.score_team2 !== undefined && (
                                <span style={{
                                  fontSize: '1.2em',
                                  fontWeight: '700',
                                  color: team2Won ? '#10b981' : '#e2e8f0',
                                  minWidth: '30px',
                                  textAlign: 'right'
                                }}>
                                  {match.score_team2}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Match Result Footer */}
                          {isCompleted && match.winner_name && (
                            <div style={{
                              background: 'rgba(16, 185, 129, 0.1)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px'
                            }}>
                              <span style={{ fontSize: '1em' }}>🏆</span>
                              <span style={{ color: '#6ee7b7', fontSize: '0.9em', fontWeight: '600' }}>
                                {match.winner_name} Wins!
                              </span>
                            </div>
                          )}

                          {isDraw && (
                            <div style={{
                              background: 'rgba(251, 191, 36, 0.1)',
                              border: '1px solid rgba(251, 191, 36, 0.3)',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px'
                            }}>
                              <span style={{ fontSize: '1em' }}>🤝</span>
                              <span style={{ color: '#fbbf24', fontSize: '0.9em', fontWeight: '600' }}>
                                Match Drawn
                              </span>
                            </div>
                          )}

                          {isOngoing && (
                            <div style={{
                              background: 'rgba(59, 130, 246, 0.1)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px'
                            }}>
                              <span style={{ 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                background: '#3b82f6',
                                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                              }}></span>
                              <span style={{ color: '#93c5fd', fontSize: '0.9em', fontWeight: '600' }}>
                                LIVE MATCH
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}