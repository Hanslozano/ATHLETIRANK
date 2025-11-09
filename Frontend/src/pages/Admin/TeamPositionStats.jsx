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
  const [loading, setLoading] = useState(false);

  // Fetch position data when bracket changes
  useEffect(() => {
    if (selectedBracket && selectedBracket.sport_type === 'volleyball') {
      fetchPositionData();
    }
  }, [selectedBracket]);

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
        return assists; // Playmaking efficiency
      case 'libero':
        return digs + receptions; // Defensive efficiency
      case 'outsideHitter':
        return kills + aces + blocks; // Offensive Scoring
      case 'oppositeHitter':
        return kills + blocks + aces; // Attacking power
      case 'blocker':
        return blocks + kills; // Blocking
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
      
      console.log("Fetched player data:", data); // Debug log
      console.log("Sample player positions:", data.slice(0, 5).map(p => ({ name: p.name, position: p.position }))); // Debug positions
      
      // Group players by position - strictly by actual position field only
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

      console.log("Grouped position data:", grouped); // Debug log
      console.log("Setters found:", grouped.setter.length);
      console.log("Outside Hitters found:", grouped.outsideHitter.length);
      console.log("Opposite Hitters found:", grouped.oppositeHitter.length);
      console.log("Liberos found:", grouped.libero.length);
      console.log("Middle Blockers found:", grouped.blocker.length);
      
      setPositionData(grouped);
    } catch (err) {
      console.error("Error fetching position data:", err);
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
  
  // Don't render if not volleyball
  if (!selectedBracket || selectedBracket.sport_type !== 'volleyball') {
    return null;
  }

  return (
    <div className="seasonal-position-stats">
      {/* Header */}
      <div className="seasonal-position-header">
        <h2 className="seasonal-position-title">Team Performance by Position</h2>
        <p className="seasonal-position-subtitle">Top performers in each position across all teams</p>
      </div>

      {/* Position Selector */}
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

      {/* Loading State */}
      {loading && (
        <div className="seasonal-loading">
          <div className="seasonal-spinner"></div>
          <p>Loading position data...</p>
        </div>
      )}

      {/* Stats Table */}
      {!loading && (
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
      )}

      {/* Summary Stats */}
      {!loading && currentData && currentData.length > 0 && (
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
    </div>
  );
};

export default TeamPositionStats;