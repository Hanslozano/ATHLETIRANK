import React, { useState, useEffect } from "react";
import { FaTrophy, FaMedal, FaStar, FaCrown, FaSearch, FaDownload, FaChevronLeft, FaChevronRight } from "react-icons/fa";

const UserAwardsStandings = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedBracket, setSelectedBracket] = useState(null);
  const [brackets, setBrackets] = useState([]);
  const [standings, setStandings] = useState([]);
  const [mvpData, setMvpData] = useState(null);
  const [awards, setAwards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTermStandings, setSearchTermStandings] = useState("");
  const [awardsTab, setAwardsTab] = useState("standings");

  // Safe number formatter
  const safeNumber = (value, decimals = 1) => {
    const num = Number(value);
    if (isNaN(num)) return 0;
    if (typeof value === 'string' && value.includes('Eff')) {
      return Number(num.toFixed(2));
    }
    return Number(num.toFixed(decimals));
  };

  useEffect(() => {
    fetchLatestTournamentData();
  }, []);

  const fetchLatestTournamentData = async () => {
    setLoading(true);
    try {
      // Fetch completed events
      const eventsRes = await fetch("http://localhost:5000/api/awards/events/completed");
      const eventsData = await eventsRes.json();
      
      if (eventsData.length === 0) {
        setLoading(false);
        return;
      }

      // Sort by date to get the most recent
      const sortedEvents = eventsData.sort((a, b) => {
        const dateA = new Date(a.end_date || a.created_at);
        const dateB = new Date(b.end_date || b.created_at);
        return dateB - dateA;
      });

      const latestEvent = sortedEvents[0];
      setEvents(sortedEvents);
      setSelectedEvent(latestEvent);

      // Fetch brackets for latest event
      const bracketsRes = await fetch(`http://localhost:5000/api/awards/events/${latestEvent.id}/completed-brackets`);
      const bracketsData = await bracketsRes.json();
      
      if (bracketsData.length > 0) {
        setBrackets(bracketsData);
        const firstBracket = bracketsData[0];
        setSelectedBracket(firstBracket);
        
        // Load data for first bracket
        await loadBracketData(firstBracket);
      }
    } catch (err) {
      console.error("Error fetching tournament data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadBracketData = async (bracket) => {
    try {
      // Load standings
      const standingsRes = await fetch(`http://localhost:5000/api/awards/brackets/${bracket.id}/standings`);
      const standingsData = await standingsRes.json();
      setStandings(standingsData.standings || []);

      // Load MVP and awards
      const awardsRes = await fetch(`http://localhost:5000/api/awards/brackets/${bracket.id}/mvp-awards`);
      const awardsData = await awardsRes.json();
      
      setMvpData(awardsData.awards?.mvp || null);
      setAwards(awardsData.awards || null);
    } catch (err) {
      console.error("Error loading bracket data:", err);
    }
  };

  const handleEventChange = async (eventId) => {
    const event = events.find(e => e.id === parseInt(eventId));
    if (!event) return;

    setSelectedEvent(event);
    setLoading(true);

    try {
      const bracketsRes = await fetch(`http://localhost:5000/api/awards/events/${event.id}/completed-brackets`);
      const bracketsData = await bracketsRes.json();
      
      if (bracketsData.length > 0) {
        setBrackets(bracketsData);
        const firstBracket = bracketsData[0];
        setSelectedBracket(firstBracket);
        await loadBracketData(firstBracket);
      }
    } catch (err) {
      console.error("Error loading event brackets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBracketChange = async (bracketId) => {
    const bracket = brackets.find(b => b.id === parseInt(bracketId));
    if (!bracket) return;

    setSelectedBracket(bracket);
    setLoading(true);
    await loadBracketData(bracket);
    setLoading(false);
  };

  const handleBackToHome = () => {
    window.location.href = "/";
  };

  const filteredStandings = standings.filter(team =>
    team.team.toLowerCase().includes(searchTermStandings.toLowerCase())
  );

  const exportStandings = () => {
    if (standings.length === 0 || !selectedBracket) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (selectedBracket.sport_type === "basketball") {
      csvContent += "Position,Team,Wins,Losses,Points For,Points Against,Point Diff,Win%\n";
      standings.forEach(team => {
        csvContent += `${team.position},${team.team},${team.wins},${team.losses},${team.points_for},${team.points_against},${team.point_diff},${team.win_percentage}\n`;
      });
    } else {
      csvContent += "Position,Team,Wins,Losses,Sets For,Sets Against,Set Ratio,Win%\n";
      standings.forEach(team => {
        csvContent += `${team.position},${team.team},${team.wins},${team.losses},${team.sets_for},${team.sets_against},${team.set_ratio},${team.win_percentage}\n`;
      });
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedEvent?.name}_${selectedBracket?.name}_standings.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAwardsForDisplay = () => {
    if (!awards || !selectedBracket) return [];
    
    const awardsArray = [];
    
    if (selectedBracket.sport_type === "basketball") {
      if (awards.mythical_five && awards.mythical_five.length > 0) {
        awards.mythical_five.forEach((player, index) => {
          awardsArray.push({
            rank: index + 1,
            category: "MYTHICAL 5",
            winner: player.player_name || 'Unknown',
            team: player.team_name || 'Unknown',
            stat: `${safeNumber(player.ppg)} PPG, ${safeNumber(player.rpg)} RPG, ${safeNumber(player.apg)} APG`,
            overall: safeNumber(player.mvp_score, 1)
          });
        });
      }
    } else {
      if (awards.best_setter) {
        awardsArray.push({
          category: "Best Setter",
          winner: awards.best_setter.player_name || 'Unknown',
          team: awards.best_setter.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_setter.total_assists)} Assists`
        });
      }
      if (awards.best_libero) {
        awardsArray.push({
          category: "Best Libero",
          winner: awards.best_libero.player_name || 'Unknown',
          team: awards.best_libero.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_libero.total_digs)} Digs, ${safeNumber(awards.best_libero.total_receptions)} Receptions`
        });
      }
      if (awards.best_outside_hitter) {
        awardsArray.push({
          category: "Best Outside Hitter",
          winner: awards.best_outside_hitter.player_name || 'Unknown',
          team: awards.best_outside_hitter.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_outside_hitter.total_kills)} Kills, ${safeNumber(awards.best_outside_hitter.total_aces)} Aces`
        });
      }
      if (awards.best_opposite_hitter) {
        awardsArray.push({
          category: "Best Opposite Hitter",
          winner: awards.best_opposite_hitter.player_name || 'Unknown',
          team: awards.best_opposite_hitter.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_opposite_hitter.total_kills)} Kills, ${safeNumber(awards.best_opposite_hitter.total_blocks)} Blocks`
        });
      }
      if (awards.best_middle_blocker) {
        awardsArray.push({
          category: "Best Middle Blocker",
          winner: awards.best_middle_blocker.player_name || 'Unknown',
          team: awards.best_middle_blocker.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_middle_blocker.total_blocks)} Blocks, ${safeNumber(awards.best_middle_blocker.total_kills)} Kills`
        });
      }
    }
    
    return awardsArray.filter(a => a.winner && a.winner !== 'Unknown');
  };

  if (loading && !selectedEvent) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ width: '50px', height: '50px', border: '4px solid #2d3748', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
          <p>Loading tournament data...</p>
        </div>
      </div>
    );
  }

  if (!selectedEvent || brackets.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1c', color: '#e2e8f0' }}>
        <div style={{ background: 'linear-gradient(135deg, #1a2332 0%, #0f172a 100%)', borderBottom: '1px solid #2d3748', padding: '2.5rem 0 2rem', textAlign: 'center' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
            <button onClick={handleBackToHome} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#0f172a', border: '1px solid #2d3748', borderRadius: '8px', color: '#94a3b8', fontSize: '0.95rem', fontWeight: '500', cursor: 'pointer', marginBottom: '1.5rem' }}>
              <FaChevronLeft /> Back to Home
            </button>
            <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '2.5rem', fontWeight: '700', margin: '0 0 0.75rem 0' }}>
              <FaTrophy style={{ color: '#3b82f6' }} /> Awards & Standings
            </h1>
            <p style={{ fontSize: '1.2rem', color: '#94a3b8', margin: 0 }}>Tournament results and awards</p>
          </div>
        </div>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>🏆</div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>No Completed Tournaments</h3>
          <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Check back later for tournament results and awards</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1c', color: '#e2e8f0', width: '100%', position: 'relative' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a2332 0%, #0f172a 100%)', borderBottom: '1px solid #2d3748', padding: '2.5rem 0 2rem', textAlign: 'center', width: '100%' }}>
        <div style={{ maxWidth: '100%', margin: '0 auto', padding: '0 2rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: '2rem' }}>
            <button onClick={handleBackToHome} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#0f172a', border: '1px solid #2d3748', borderRadius: '8px', color: '#94a3b8', fontSize: '0.95rem', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' }}>
              <FaChevronLeft /> Back to Home
            </button>
          </div>
          <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '2.5rem', fontWeight: '700', margin: '0 0 0.75rem 0' }}>
            <FaTrophy style={{ color: '#3b82f6' }} /> Awards & Standings
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#94a3b8', margin: 0 }}>Tournament results and awards</p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ width: '100%', margin: '0 auto', padding: '2rem', boxSizing: 'border-box' }}>
        {/* Tournament Selector */}
        <div style={{ background: '#0f172a', border: '1px solid #2d3748', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>
                <FaTrophy style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                Tournament
              </label>
              <select value={selectedEvent?.id || ''} onChange={(e) => handleEventChange(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: '#1a2332', border: '2px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.95rem', cursor: 'pointer' }}>
                {events.map(event => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>
                <FaMedal style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                Bracket
              </label>
              <select value={selectedBracket?.id || ''} onChange={(e) => handleBracketChange(e.target.value)} disabled={brackets.length === 0} style={{ width: '100%', padding: '0.75rem', background: '#1a2332', border: '2px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.95rem', cursor: 'pointer' }}>
                {brackets.map(bracket => (
                  <option key={bracket.id} value={bracket.id}>{bracket.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Event Details */}
        <div style={{ textAlign: 'center', marginBottom: '2rem', padding: '1.5rem', background: '#0f172a', border: '1px solid #2d3748', borderRadius: '12px', width: '100%', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: '#e2e8f0', maxWidth: '1400px', margin: '0 auto 1rem' }}>{selectedBracket?.name}</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', maxWidth: '1400px', margin: '0 auto' }}>
            <span style={{ background: '#1a2332', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.9rem', color: '#94a3b8' }}>
              <strong style={{ color: '#e2e8f0' }}>Event:</strong> {selectedEvent?.name}
            </span>
            <span style={{ background: '#1a2332', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.9rem', color: '#94a3b8' }}>
              <strong style={{ color: '#e2e8f0' }}>Sport:</strong> {selectedBracket?.sport_type?.toUpperCase()}
            </span>
            <span style={{ background: '#1a2332', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.9rem', color: '#94a3b8' }}>
              <strong style={{ color: '#e2e8f0' }}>Type:</strong> {selectedBracket?.elimination_type === 'double' ? 'Double Elimination' : selectedBracket?.elimination_type === 'round_robin' ? 'Round Robin' : 'Single Elimination'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 40px', borderBottom: '1px solid #2d3748', background: 'transparent', marginBottom: '2rem', width: '100%' }}>
          <div style={{ display: 'flex', gap: '12px', background: 'transparent', padding: '6px', borderRadius: '8px', maxWidth: '1400px', width: '100%', justifyContent: 'center' }}>
            <button onClick={() => setAwardsTab("standings")} style={{ padding: '14px 32px', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', background: awardsTab === "standings" ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent', color: awardsTab === "standings" ? '#ffffff' : '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: awardsTab === "standings" ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none', whiteSpace: 'nowrap' }}>
              🏆 Team Standings
            </button>
            <button onClick={() => setAwardsTab("mvp")} style={{ padding: '14px 32px', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', background: awardsTab === "mvp" ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent', color: awardsTab === "mvp" ? '#ffffff' : '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: awardsTab === "mvp" ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none', whiteSpace: 'nowrap' }}>
              👑 Tournament MVP{selectedBracket?.sport_type === "basketball" ? " & Mythical 5" : ""}
            </button>
            {selectedBracket?.sport_type === "volleyball" && (
              <button onClick={() => setAwardsTab("awards")} style={{ padding: '14px 32px', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', background: awardsTab === "awards" ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'transparent', color: awardsTab === "awards" ? '#ffffff' : '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: awardsTab === "awards" ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none', whiteSpace: 'nowrap' }}>
                🏅 Volleyball Awards
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ background: '#0f172a', border: '1px solid #2d3748', borderRadius: '12px', padding: '2rem', width: '100%', boxSizing: 'border-box' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', maxWidth: '1400px', margin: '0 auto' }}>
              <div style={{ width: '50px', height: '50px', border: '4px solid #2d3748', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
              <p>Loading data...</p>
            </div>
          ) : (
            <>
              {/* Standings Tab */}
              {awardsTab === "standings" && (
                <div>
                 
                  <div style={{ overflowX: 'auto', border: '1px solid #2d3748', borderRadius: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1a2332' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', borderBottom: '1px solid #2d3748' }}>
                          <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Rank</th>
                          <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Team</th>
                          <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>W</th>
                          <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>L</th>
                          {selectedBracket?.sport_type === "basketball" ? (
                            <>
                              <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>PF</th>
                              <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>PA</th>
                              <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Diff</th>
                            </>
                          ) : (
                            <>
                              <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>SF</th>
                              <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>SA</th>
                              <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Ratio</th>
                            </>
                          )}
                          <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Win%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStandings.map((team, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #2d3748', background: team.position <= 3 ? `rgba(${team.position === 1 ? '255, 215, 0' : team.position === 2 ? '192, 192, 192' : '205, 127, 50'}, 0.1)` : 'transparent' }}>
                            <td style={{ padding: '12px 15px', color: '#e2e8f0', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {team.position <= 3 && <span style={{ fontSize: '20px' }}>{team.position === 1 ? "🥇" : team.position === 2 ? "🥈" : "🥉"}</span>}
                              {team.position}
                            </td>
                            <td style={{ padding: '12px 15px', color: '#e2e8f0', fontWeight: '600' }}>
                              <strong>{team.team || 'Unknown Team'}</strong>
                            </td>
                            <td style={{ padding: '12px 15px', color: '#94a3b8' }}>{team.wins || 0}</td>
                            <td style={{ padding: '12px 15px', color: '#94a3b8' }}>{team.losses || 0}</td>
                            {selectedBracket?.sport_type === "basketball" ? (
                              <>
                                <td style={{ padding: '12px 15px', color: '#94a3b8' }}>{team.points_for || 0}</td>
                                <td style={{ padding: '12px 15px', color: '#94a3b8' }}>{team.points_against || 0}</td>
                                <td style={{ padding: '12px 15px', color: String(team.point_diff || 0).startsWith('+') ? '#22c55e' : String(team.point_diff || 0).startsWith('-') ? '#ef4444' : '#94a3b8', fontWeight: '600' }}>
                                  {team.point_diff || 0}
                                </td>
                              </>
                            ) : (
                              <>
                                <td style={{ padding: '12px 15px', color: '#94a3b8' }}>{team.sets_for || 0}</td>
                                <td style={{ padding: '12px 15px', color: '#94a3b8' }}>{team.sets_against || 0}</td>
                                <td style={{ padding: '12px 15px', color: '#94a3b8' }}>{team.set_ratio || 0}</td>
                              </>
                            )}
                            <td style={{ padding: '12px 15px', color: '#94a3b8' }}>{team.win_percentage || '0.0%'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {standings.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      <p>No standings data available.</p>
                    </div>
                  )}
                </div>
              )}

              {/* MVP Tab */}
              {awardsTab === "mvp" && (
                <div>
                  {!mvpData ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                      <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>👤</div>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem', color: '#e2e8f0' }}>No MVP data available</h3>
                      <p>Player statistics are not available for this bracket</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', borderRadius: '50%', marginBottom: '1rem', boxShadow: '0 8px 20px rgba(251, 191, 36, 0.3)' }}>
                          <FaCrown style={{ fontSize: '2.5rem', color: 'white' }} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>Tournament Most Valuable Player</h2>
                      </div>
                      
                      <div style={{ background: '#1a2332', border: '2px solid #2d3748', borderRadius: '12px', padding: '2rem', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '2px solid #2d3748' }}>
                          <h3 style={{ fontSize: '2rem', fontWeight: '700', color: '#e2e8f0', margin: '0 0 0.5rem 0' }}>{mvpData.player_name || 'Unknown Player'}</h3>
                          <span style={{ display: 'block', fontSize: '1.1rem', color: '#3b82f6', fontWeight: '600', marginBottom: '0.5rem' }}>{mvpData.team_name || 'Unknown Team'}</span>
                          <span style={{ display: 'inline-block', padding: '0.35rem 0.75rem', background: '#0f172a', border: '1px solid #2d3748', borderRadius: '8px', color: '#94a3b8', fontSize: '0.9rem', fontWeight: '600' }}>#{mvpData.jersey_number || 'N/A'}</span>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px', marginBottom: '2rem' }}>
                          <div style={{ background: '#0f172a', border: '1px solid #2d3748', borderRadius: '8px', padding: '20px', textAlign: 'center', transition: 'all 0.2s' }}>
                            <div style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>{mvpData.games_played || 0}</div>
                            <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>Games Played</div>
                          </div>

                          {selectedBracket?.sport_type === "basketball" ? (
                            <>
                              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>{safeNumber(mvpData.ppg)}</div>
                                <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>PPG</div>
                              </div>
                              <div style={{ background: '#0f172a', border: '1px solid #2d3748', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>{safeNumber(mvpData.apg)}</div>
                                <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>APG</div>
                              </div>
                              <div style={{ background: '#0f172a', border: '1px solid #2d3748', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>{safeNumber(mvpData.rpg)}</div>
                                <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>RPG</div>
                              </div>
                              <div style={{ background: '#0f172a', border: '1px solid #2d3748', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>{safeNumber(mvpData.spg)}</div>
                                <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>SPG</div>
                              </div>
                              <div style={{ background: '#0f172a', border: '1px solid #2d3748', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>{safeNumber(mvpData.bpg)}</div>
                                <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>BPG</div>
                              </div>
                              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>{safeNumber(mvpData.mvp_score, 2)}</div>
                                <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>Overall</div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>{safeNumber(mvpData.total_kills)}</div>
                                <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>Kills</div>
                              </div>
                              <div style={{ background: '#0f172a', border: '1px solid #2d3748', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>{safeNumber(mvpData.total_assists)}</div>
                                <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>Assists</div>
                              </div>
                              <div style={{ background: '#0f172a', border: '1px solid #2d3748', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>{safeNumber(mvpData.total_digs)}</div>
                                <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>Digs</div>
                              </div>
                              <div style={{ background: '#0f172a', border: '1px solid #2d3748', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>{safeNumber(mvpData.total_blocks)}</div>
                                <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>Blocks</div>
                              </div>
                              <div style={{ background: '#0f172a', border: '1px solid #2d3748', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>{safeNumber(mvpData.total_aces)}</div>
                                <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>Aces</div>
                              </div>
                              <div style={{ background: '#0f172a', border: '1px solid #2d3748', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>{safeNumber(mvpData.total_receptions)}</div>
                                <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>Receptions</div>
                              </div>
                              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>
                                  {mvpData.efficiency !== null && mvpData.efficiency !== undefined ? Number(mvpData.efficiency).toFixed(1) : '0.0'}
                                </div>
                                <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>Overall</div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Mythical 5 Section - Only for Basketball */}
                      {selectedBracket?.sport_type === "basketball" && awards?.mythical_five && awards.mythical_five.length > 0 && (
                        <div style={{ marginTop: '40px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <FaMedal style={{ color: '#fbbf24', fontSize: '28px' }} />
                            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#e2e8f0' }}>Mythical Five</h2>
                          </div>

                          <div style={{ overflowX: 'auto', border: '1px solid #2d3748', borderRadius: '12px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1a2332' }}>
                              <thead>
                                <tr style={{ background: '#0f172a', borderBottom: '1px solid #2d3748' }}>
                                  <th style={{ width: '60px', textAlign: 'center', padding: '15px', color: '#e2e8f0', fontWeight: '600' }}>RANK</th>
                                  <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>PLAYER</th>
                                  <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>TEAM</th>
                                  <th style={{ textAlign: 'center', padding: '15px', color: '#e2e8f0', fontWeight: '600' }}>G</th>
                                  <th style={{ textAlign: 'center', padding: '15px', color: '#e2e8f0', fontWeight: '600' }}>PPG</th>
                                  <th style={{ textAlign: 'center', padding: '15px', color: '#e2e8f0', fontWeight: '600' }}>RPG</th>
                                  <th style={{ textAlign: 'center', padding: '15px', color: '#e2e8f0', fontWeight: '600' }}>APG</th>
                                  <th style={{ textAlign: 'center', padding: '15px', color: '#e2e8f0', fontWeight: '600' }}>SPG</th>
                                  <th style={{ textAlign: 'center', padding: '15px', color: '#e2e8f0', fontWeight: '600' }}>BPG</th>
                                  <th style={{ textAlign: 'center', padding: '15px', background: 'rgba(59, 130, 246, 0.1)', color: '#e2e8f0', fontWeight: '600' }}>OVERALL</th>
                                </tr>
                              </thead>
                              <tbody>
                                {awards.mythical_five.map((player, index) => (
                                  <tr key={index} style={{ background: index < 3 ? 'rgba(251, 191, 36, 0.05)' : 'transparent', borderBottom: '1px solid #2d3748' }}>
                                    <td style={{ textAlign: 'center', fontWeight: '700', fontSize: '18px', padding: '15px' }}>
                                      {index === 0 && <span style={{ color: '#fbbf24' }}>🥇</span>}
                                      {index === 1 && <span style={{ color: '#94a3b8' }}>🥈</span>}
                                      {index === 2 && <span style={{ color: '#cd7f32' }}>🥉</span>}
                                      {index > 2 && <span style={{ color: '#64748b' }}>{index + 1}</span>}
                                    </td>
                                    <td style={{ fontWeight: '700', fontSize: '16px', padding: '15px', color: '#e2e8f0' }}>
                                      {player.player_name || 'Unknown'}
                                      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '400' }}>
                                        #{player.jersey_number || 'N/A'} • {player.position || 'N/A'}
                                      </div>
                                    </td>
                                    <td style={{ fontWeight: '600', padding: '15px', color: '#e2e8f0' }}>{player.team_name || 'Unknown'}</td>
                                    <td style={{ textAlign: 'center', padding: '15px', color: '#94a3b8' }}>{player.games_played || 0}</td>
                                    <td style={{ textAlign: 'center', fontWeight: '600', padding: '15px', color: '#94a3b8' }}>{safeNumber(player.ppg)}</td>
                                    <td style={{ textAlign: 'center', padding: '15px', color: '#94a3b8' }}>{safeNumber(player.rpg)}</td>
                                    <td style={{ textAlign: 'center', padding: '15px', color: '#94a3b8' }}>{safeNumber(player.apg)}</td>
                                    <td style={{ textAlign: 'center', padding: '15px', color: '#94a3b8' }}>{safeNumber(player.spg)}</td>
                                    <td style={{ textAlign: 'center', padding: '15px', color: '#94a3b8' }}>{safeNumber(player.bpg)}</td>
                                    <td style={{ textAlign: 'center', fontWeight: '700', fontSize: '16px', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '15px' }}>
                                      {safeNumber(player.mvp_score, 1)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Volleyball Awards Tab */}
              {awardsTab === "awards" && selectedBracket?.sport_type === "volleyball" && (
                <div>
                  {!awards || getAwardsForDisplay().length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                      <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>🏅</div>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem', color: '#e2e8f0' }}>No awards data available</h3>
                      <p>Award data is not available for this bracket</p>
                    </div>
                  ) : (
                    <div>
                      

                      
                        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1a2332' }}>
                          <thead>
                            <tr style={{ background: '#0f172a', borderBottom: '1px solid #2d3748' }}>
                              <th style={{ width: '60px', textAlign: 'center', padding: '15px', color: '#e2e8f0', fontWeight: '600' }}></th>
                              <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Award Category</th>
                              <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Winner</th>
                              <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Team</th>
                              <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Statistics</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getAwardsForDisplay().map((award, index) => (
                              <tr key={index} style={{ borderBottom: '1px solid #2d3748' }}>
                                <td style={{ textAlign: 'center', padding: '15px' }}>
                                  <FaStar style={{ color: '#3b82f6', fontSize: '20px' }} />
                                </td>
                                <td style={{ fontWeight: '600', padding: '15px', color: '#e2e8f0' }}>{award.category}</td>
                                <td style={{ fontWeight: '700', fontSize: '16px', color: '#e2e8f0', padding: '15px' }}>{award.winner}</td>
                                <td style={{ padding: '15px', color: '#94a3b8' }}>{award.team}</td>
                                <td style={{ color: '#3b82f6', fontWeight: '600', padding: '15px' }}>{award.stat}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
            
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default UserAwardsStandings;