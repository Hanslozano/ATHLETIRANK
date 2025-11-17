import React, { useState, useEffect } from 'react';

const TeamPositionStats = ({ selectedEvent, selectedBracket }) => {
  const [selectedPosition, setSelectedPosition] = useState('setter');
  const [positionData, setPositionData] = useState({
    setter: [],
    outsideHitter: [],
    oppositeHitter: [],
    libero: [],
    blocker: []
  });
  const [top10Data, setTop10Data] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch position data when bracket changes
  useEffect(() => {
    if (selectedBracket) {
      if (selectedBracket.sport_type === 'volleyball') {
        fetchPositionData();
      } else if (selectedBracket.sport_type === 'basketball') {
        fetchTop10Data();
      }
    }
  }, [selectedBracket, selectedEvent]);

  // Helper function to normalize position names
  const normalizePosition = (position) => {
    if (!position) return '';
    return position.toLowerCase().trim();
  };

  // Helper function to calculate position-based scores
  const calculatePositionScore = (player, positionType) => {
    const assists = player.volleyball_assists || player.assists || 0;
    const kills = player.kills || 0;
    const blocks = player.volleyball_blocks || player.blocks || 0;
    const digs = player.digs || 0;
    const aces = player.service_aces || 0;
    const receptions = player.receptions || 0;

    switch(positionType) {
      case 'setter':
        return assists;
      case 'libero':
        return digs + receptions;
      case 'outsideHitter':
        return kills + aces + blocks;
      case 'oppositeHitter':
        return kills + blocks + aces;
      case 'blocker':
        return blocks + kills;
      default:
        return 0;
    }
  };

  const fetchPositionData = async () => {
    if (!selectedEvent || !selectedBracket) return;
    
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/stats/events/${selectedEvent.id}/players-statistics?bracketId=${selectedBracket.id}`
      );
      const data = await res.json();
      
      console.log("Fetched player data:", data);
      
      // Group players by position
      const grouped = {
        setter: data
          .filter(p => {
            const pos = normalizePosition(p.position);
            return pos === 'setter';
          })
          .sort((a, b) => calculatePositionScore(b, 'setter') - calculatePositionScore(a, 'setter'))
          .slice(0, 10),
          
        outsideHitter: data
          .filter(p => {
            const pos = normalizePosition(p.position);
            return pos === 'outside hitter' || pos === 'outside';
          })
          .sort((a, b) => calculatePositionScore(b, 'outsideHitter') - calculatePositionScore(a, 'outsideHitter'))
          .slice(0, 10),
          
        oppositeHitter: data
          .filter(p => {
            const pos = normalizePosition(p.position);
            return pos === 'opposite hitter' || pos === 'opposite' || pos === 'opp';
          })
          .sort((a, b) => calculatePositionScore(b, 'oppositeHitter') - calculatePositionScore(a, 'oppositeHitter'))
          .slice(0, 10),
          
        libero: data
          .filter(p => {
            const pos = normalizePosition(p.position);
            return pos === 'libero' || pos === 'defensive specialist';
          })
          .sort((a, b) => calculatePositionScore(b, 'libero') - calculatePositionScore(a, 'libero'))
          .slice(0, 10),
          
        blocker: data
          .filter(p => {
            const pos = normalizePosition(p.position);
            return pos === 'middle blocker' || pos === 'middle';
          })
          .sort((a, b) => calculatePositionScore(b, 'blocker') - calculatePositionScore(a, 'blocker'))
          .slice(0, 10)
      };

      console.log("Grouped position data:", grouped);
      setPositionData(grouped);
    } catch (err) {
      console.error("Error fetching position data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTop10Data = async () => {
    if (!selectedEvent || !selectedBracket) return;
    
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/stats/events/${selectedEvent.id}/players-statistics?bracketId=${selectedBracket.id}`
      );
      const data = await res.json();
      
      console.log("Fetched basketball player data:", data);
      
      // Calculate overall score for each player
      const playersWithScore = data.map(player => {
     const ppg = Number(player.ppg) || 0;
const rpg = Number(player.rpg) || 0;
const apg = Number(player.apg) || 0;
const spg = Number(player.spg) || 0;
const bpg = Number(player.bpg) || 0;
const tpg = Number(player.tpg) || 0;
        // MVP Score = PPG + RPG + APG + SPG + BPG - TPG
        const overallScore = ppg + rpg + apg + spg + bpg - tpg;
        
        return {
          ...player,
          overall_score: overallScore
        };
      });
      
      // Sort by overall score and take top 10
      const top10 = playersWithScore
        .sort((a, b) => b.overall_score - a.overall_score)
        .slice(0, 10);
      
      console.log("Top 10 players:", top10);
      setTop10Data(top10);
    } catch (err) {
      console.error("Error fetching top 10 data:", err);
    } finally {
      setLoading(false);
    }
  };

  const positions = [
    { id: 'setter', name: 'Setters', icon: '🎯' },
    { id: 'outsideHitter', name: 'Outside Hitters', icon: '⚡' },
    { id: 'oppositeHitter', name: 'Opposite Hitters', icon: '💥' },
    { id: 'libero', name: 'Liberos', icon: '🛡️' },
    { id: 'blocker', name: 'Middle Blockers', icon: '🚫' }
  ];

  const currentData = positionData[selectedPosition];

  const getStatColumns = () => {
    switch(selectedPosition) {
      case 'setter':
        return ['Assists', 'Service Aces'];
      case 'outsideHitter':
        return ['Kills', 'Aces', 'Blocks'];
      case 'oppositeHitter':
        return ['Kills', 'Blocks', 'Aces'];
      case 'libero':
        return ['Digs', 'Receptions'];
      case 'blocker':
        return ['Blocks', 'Kills'];
      default:
        return [];
    }
  };

  const getStatValues = (player) => {
    switch(selectedPosition) {
      case 'setter':
        return [
          player.volleyball_assists || player.assists || 0, 
          player.service_aces || 0
        ];
      case 'outsideHitter':
        return [
          player.kills || 0, 
          player.service_aces || 0,
          player.volleyball_blocks || player.blocks || 0
        ];
      case 'oppositeHitter':
        return [
          player.kills || 0, 
          player.volleyball_blocks || player.blocks || 0,
          player.service_aces || 0
        ];
      case 'libero':
        return [
          player.digs || 0, 
          player.receptions || 0
        ];
      case 'blocker':
        return [
          player.volleyball_blocks || player.blocks || 0, 
          player.kills || 0
        ];
      default:
        return [];
    }
  };

  const statColumns = getStatColumns();
  
  // Render for both volleyball and basketball
  if (!selectedBracket) {
    return null;
  }

  const isBasketball = selectedBracket.sport_type === 'basketball';
  const isVolleyball = selectedBracket.sport_type === 'volleyball';

  // Don't render if neither sport
  if (!isBasketball && !isVolleyball) {
    return null;
  }

  return (
    <div className="seasonal-position-stats">
      {/* Header */}
      <div className="seasonal-position-header">
        <h2 className="seasonal-position-title">
          {isBasketball ? 'Top 10 Overall Leaders' : 'Positional Leaders'}
        </h2>
        <p className="seasonal-position-subtitle">
          {isBasketball 
            ? 'Top individual performers ranked by overall performance score.' 
            : 'Top individual performers by position across all teams.'}
        </p>
      </div>

      {/* Position Selector - Only for Volleyball */}
      {isVolleyball && (
        <div className="seasonal-position-tabs">
          {positions.map((position) => (
            <button
              key={position.id}
              onClick={() => setSelectedPosition(position.id)}
              className={`seasonal-position-tab ${
                selectedPosition === position.id ? 'active' : ''
              }`}
            >
              <span className="seasonal-position-tab-icon">{position.icon}</span>
              <span className="seasonal-position-tab-text">{position.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="seasonal-loading">
          <div className="seasonal-spinner"></div>
          <p>Loading {isBasketball ? 'top performers' : 'position'} data...</p>
        </div>
      )}

      {/* Basketball Top 10 Section */}
      {!loading && isBasketball && (
        <>
          <div className="seasonal-position-table-container">
            <table className="seasonal-position-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team</th>
                  <th>Player</th>
                  <th className="text-center">Jersey</th>
                  <th className="text-center">PPG</th>
                  <th className="text-center">RPG</th>
                  <th className="text-center">APG</th>
                  <th className="text-center">SPG</th>
                  <th className="text-center">BPG</th>
                  <th className="text-center">TPG</th>
                  <th className="text-center">Overall</th>
                </tr>
              </thead>
              <tbody>
                {!top10Data || top10Data.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="seasonal-no-data">
                      No player statistics available
                    </td>
                  </tr>
                ) : (
                  top10Data.map((player, index) => {
                    const isTopThree = index < 3;
                    
                    return (
                      <tr key={player.id || index} className={isTopThree ? 'top-three' : ''}>
                        <td>
                          <span className={`seasonal-rank-badge seasonal-rank-${index + 1}`}>
                            {index + 1}
                          </span>
                        </td>
                        <td>
                          <span className="seasonal-position-team">{player.team_name}</span>
                        </td>
                        <td>
                          <span className="seasonal-position-player">{player.name}</span>
                        </td>
                        <td className="text-center">
                          <span className="seasonal-position-jersey">
                            #{player.jersey_number}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="seasonal-position-stat-value">{typeof player.ppg === 'number' ? player.ppg.toFixed(1) : (player.ppg || '0.0')}</span>
                        </td>
                        <td className="text-center">
                          <span className="seasonal-position-stat-value">{typeof player.rpg === 'number' ? player.rpg.toFixed(1) : (player.rpg || '0.0')}</span>
                        </td>
                        <td className="text-center">
                          <span className="seasonal-position-stat-value">{typeof player.apg === 'number' ? player.apg.toFixed(1) : (player.apg || '0.0')}</span>
                        </td>
                        <td className="text-center">
                          <span className="seasonal-position-stat-value">{typeof player.spg === 'number' ? player.spg.toFixed(1) : (player.spg || '0.0')}</span>
                        </td>
                        <td className="text-center">
                          <span className="seasonal-position-stat-value">{typeof player.bpg === 'number' ? player.bpg.toFixed(1) : (player.bpg || '0.0')}</span>
                        </td>
                        <td className="text-center">
                          <span className="seasonal-position-stat-value">{typeof player.tpg === 'number' ? player.tpg.toFixed(1) : (player.tpg || '0.0')}</span>
                        </td>
                        <td className="text-center">
                          <span className="seasonal-position-stat-value" style={{fontWeight: 'bold', color: '#4CAF50'}}>
                            {typeof player.overall_score === 'number' ? player.overall_score.toFixed(1) : (player.overall_score || '0.0')}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Stats for Basketball */}
          {top10Data && top10Data.length > 0 && (
            <div className="seasonal-position-summary">
              <div className="seasonal-position-summary-card">
                <div className="seasonal-position-summary-label">🏆 Top Performer</div>
                <div className="seasonal-position-summary-value">{top10Data[0].name}</div>
                <div className="seasonal-position-summary-team">{top10Data[0].team_name}</div>
              </div>
              
              <div className="seasonal-position-summary-card">
                <div className="seasonal-position-summary-label">📊 Teams Represented</div>
                <div className="seasonal-position-summary-value-large">
                  {new Set(top10Data.map(p => p.team_name)).size}
                </div>
              </div>
              
              <div className="seasonal-position-summary-card">
                <div className="seasonal-position-summary-label">⭐ Highest Score</div>
                <div className="seasonal-position-summary-value-large">
                  {top10Data[0].overall_score?.toFixed(1) || '0.0'}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Volleyball Position Stats Table */}
      {!loading && isVolleyball && (
        <>
          <div className="seasonal-position-table-container">
            <table className="seasonal-position-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team</th>
                  <th>Player</th>
                  <th className="text-center">Jersey</th>
                  {statColumns.map((col, idx) => (
                    <th key={idx} className="text-center">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!currentData || currentData.length === 0 ? (
                  <tr>
                    <td colSpan={4 + statColumns.length} className="seasonal-no-data">
                      No players found for this position
                    </td>
                  </tr>
                ) : (
                  currentData.map((player, index) => {
                    const statValues = getStatValues(player);
                    const isTopThree = index < 3;
                    
                    return (
                      <tr key={player.id || index} className={isTopThree ? 'top-three' : ''}>
                        <td>
                          <span className={`seasonal-rank-badge seasonal-rank-${index + 1}`}>
                            {index + 1}
                          </span>
                        </td>
                        <td>
                          <span className="seasonal-position-team">{player.team_name}</span>
                        </td>
                        <td>
                          <span className="seasonal-position-player">{player.name}</span>
                        </td>
                        <td className="text-center">
                          <span className="seasonal-position-jersey">
                            #{player.jersey_number}
                          </span>
                        </td>
                        {statValues.map((value, idx) => (
                          <td key={idx} className="text-center">
                            <span className="seasonal-position-stat-value">{value}</span>
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Stats for Volleyball */}
          {currentData && currentData.length > 0 && (
            <div className="seasonal-position-summary">
              <div className="seasonal-position-summary-card">
                <div className="seasonal-position-summary-label">🏆 Top Performer</div>
                <div className="seasonal-position-summary-value">{currentData[0].name}</div>
                <div className="seasonal-position-summary-team">{currentData[0].team_name}</div>
              </div>
              
              <div className="seasonal-position-summary-card">
                <div className="seasonal-position-summary-label">📊 Teams Represented</div>
                <div className="seasonal-position-summary-value-large">
                  {new Set(currentData.map(p => p.team_name)).size}
                </div>
              </div>
              
              <div className="seasonal-position-summary-card">
                <div className="seasonal-position-summary-label">👥 Total Players</div>
                <div className="seasonal-position-summary-value-large">{currentData.length}</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TeamPositionStats;