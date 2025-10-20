import React, { useState, useEffect } from "react";
import { FaTrophy, FaMedal, FaStar, FaCrown, FaDownload, FaSearch } from "react-icons/fa";
import "../../style/Admin_Awards & Standing.css";

const AdminAwardsStandings = ({ sidebarOpen }) => {
  const [activeTab, setActiveTab] = useState("tournaments");
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedBracket, setSelectedBracket] = useState(null);
  const [standings, setStandings] = useState([]);
  const [mvpData, setMvpData] = useState(null);
  const [awards, setAwards] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [contentTab, setContentTab] = useState("standings");

  // New filter states
  const [eventSearchTerm, setEventSearchTerm] = useState("");
  const [sportFilter, setSportFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  const safeNumber = (value, decimals = 1) => {
    const num = Number(value);
    return isNaN(num) ? 0 : Number(num.toFixed(decimals));
  };

  useEffect(() => {
    fetchCompletedEvents();
  }, []);

  const fetchCompletedEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/awards/events/completed");
      const data = await res.json();
      
      const eventsWithBrackets = await Promise.all(
        data.map(async (event) => {
          try {
            const bracketsRes = await fetch(`http://localhost:5000/api/awards/events/${event.id}/completed-brackets`);
            const brackets = await bracketsRes.json();
            return { ...event, brackets: brackets || [] };
          } catch (err) {
            console.error(`Error fetching brackets for event ${event.id}:`, err);
            return { ...event, brackets: [] };
          }
        })
      );
      
      setEvents(eventsWithBrackets);
    } catch (err) {
      setError("Failed to load completed events");
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort events
  const getFilteredAndSortedEvents = () => {
    let filtered = events.filter(event => {
      const matchesSearch = event.name.toLowerCase().includes(eventSearchTerm.toLowerCase());
      
      // Filter by sport - check if any bracket matches the sport filter
      let matchesSport = sportFilter === "all";
      if (!matchesSport && event.brackets) {
        matchesSport = event.brackets.some(bracket => 
          bracket.sport_type === sportFilter
        );
      }
      
      return matchesSearch && matchesSport;
    });

    // Sort events
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "date":
          return new Date(b.start_date) - new Date(a.start_date);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredEvents = getFilteredAndSortedEvents();

  const handleBracketSelect = async (event, bracket) => {
    setSelectedEvent(event);
    setSelectedBracket(bracket);
    setActiveTab("results");
    setContentTab("standings");
    setLoading(true);
    setError(null);

    try {
      const standingsRes = await fetch(`http://localhost:5000/api/awards/brackets/${bracket.id}/standings`);
      const standingsData = await standingsRes.json();
      setStandings(standingsData.standings || []);

      const awardsRes = await fetch(`http://localhost:5000/api/awards/brackets/${bracket.id}/mvp-awards`);
      const awardsData = await awardsRes.json();
      
      setMvpData(awardsData.awards?.mvp || null);
      setAwards(awardsData.awards || null);
    } catch (err) {
      setError("Failed to load awards data: " + err.message);
      console.error("Error loading awards:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStandings = standings.filter(team =>
    team.team.toLowerCase().includes(searchTerm.toLowerCase())
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
      if (awards.mvp) {
        awardsArray.push({
          category: "Most Valuable Player",
          winner: awards.mvp.player_name || 'Unknown',
          team: awards.mvp.team_name || 'Unknown',
          stat: `${safeNumber(awards.mvp.ppg)} PPG`
        });
      }
      if (awards.best_playmaker) {
        awardsArray.push({
          category: "Best Playmaker",
          winner: awards.best_playmaker.player_name || 'Unknown',
          team: awards.best_playmaker.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_playmaker.apg)} APG`
        });
      }
      if (awards.best_defender) {
        awardsArray.push({
          category: "Best Defender",
          winner: awards.best_defender.player_name || 'Unknown',
          team: awards.best_defender.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_defender.spg)} SPG`
        });
      }
      if (awards.best_rebounder) {
        awardsArray.push({
          category: "Best Rebounder",
          winner: awards.best_rebounder.player_name || 'Unknown',
          team: awards.best_rebounder.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_rebounder.rpg)} RPG`
        });
      }
      if (awards.best_blocker) {
        awardsArray.push({
          category: "Best Blocker",
          winner: awards.best_blocker.player_name || 'Unknown',
          team: awards.best_blocker.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_blocker.bpg)} BPG`
        });
      }
    } else {
      if (awards.mvp) {
        awardsArray.push({
          category: "Most Valuable Player",
          winner: awards.mvp.player_name || 'Unknown',
          team: awards.mvp.team_name || 'Unknown',
          stat: `${safeNumber(awards.mvp.kpg)} K/G`
        });
      }
      if (awards.best_blocker) {
        awardsArray.push({
          category: "Best Blocker",
          winner: awards.best_blocker.player_name || 'Unknown',
          team: awards.best_blocker.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_blocker.bpg)} BPG, ${safeNumber(awards.best_blocker.hitting_percentage)}% Hit`
        });
      }
      if (awards.best_setter) {
        awardsArray.push({
          category: "Best Setter",
          winner: awards.best_setter.player_name || 'Unknown',
          team: awards.best_setter.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_setter.apg)} A/G`
        });
      }
      if (awards.best_libero) {
        awardsArray.push({
          category: "Best Libero",
          winner: awards.best_libero.player_name || 'Unknown',
          team: awards.best_libero.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_libero.dpg)} D/G, ${safeNumber(awards.best_libero.reception_percentage)}% Rec`
        });
      }
      if (awards.best_server) {
        awardsArray.push({
          category: "Best Server",
          winner: awards.best_server.player_name || 'Unknown',
          team: awards.best_server.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_server.acepg)} ACE/G, ${safeNumber(awards.best_server.service_percentage)}% Srv`
        });
      }
    }
    
    return awardsArray.filter(a => a.winner && a.winner !== 'Unknown');
  };

  return (
    <div className="admin-dashboard">
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-header">
          <h1>Awards & Standings</h1>
          <p>View tournament standings, MVP stats, and awards</p>
        </div>

        <div className="dashboard-main">
          <div className="bracket-content">
            {/* Tabs */}
            <div className="bracket-tabs">
              <button
                className={`bracket-tab-button ${activeTab === "tournaments" ? "bracket-tab-active" : ""}`}
                onClick={() => setActiveTab("tournaments")}
              >
                Select Tournament & Bracket
              </button>
              {selectedBracket && (
                <button
                  className={`bracket-tab-button ${activeTab === "results" ? "bracket-tab-active" : ""}`}
                  onClick={() => setActiveTab("results")}
                >
                  {selectedBracket.name} - Results
                </button>
              )}
            </div>

            {/* Tournament Selection Tab */}
            {activeTab === "tournaments" && (
              <div className="bracket-view-section">
                <h2>Select Tournament & Bracket</h2>

                {/* Search and Filter Container */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: '1', minWidth: '300px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="Search tournaments..."
                      value={eventSearchTerm}
                      onChange={(e) => setEventSearchTerm(e.target.value)}
                      style={{
                        flex: '1',
                        minWidth: '200px',
                        padding: '12px 16px',
                        border: '2px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: 'var(--background-secondary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <select
                      value={sportFilter}
                      onChange={(e) => setSportFilter(e.target.value)}
                      style={{
                        padding: '12px 16px',
                        border: '2px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: 'var(--background-secondary)',
                        color: 'var(--text-primary)',
                        minWidth: '150px',
                      }}
                    >
                      <option value="all">All Sports</option>
                      <option value="basketball">Basketball</option>
                      <option value="volleyball">Volleyball</option>
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      style={{
                        padding: '12px 16px',
                        border: '2px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: 'var(--background-secondary)',
                        color: 'var(--text-primary)',
                        minWidth: '150px',
                      }}
                    >
                      <option value="date">Sort by Date</option>
                      <option value="name">Sort by Name</option>
                    </select>
                  </div>
                </div>

                {/* Results Info */}
                {(eventSearchTerm || sportFilter !== "all") && (
                  <div style={{ marginBottom: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Showing {filteredEvents.length} of {events.length} tournaments
                    {eventSearchTerm && <span style={{ color: 'var(--primary-color)', marginLeft: '5px' }}> • Searching: "{eventSearchTerm}"</span>}
                    {sportFilter !== "all" && <span style={{ color: 'var(--primary-color)', marginLeft: '5px' }}> • Sport: {sportFilter}</span>}
                  </div>
                )}

                {loading ? (
                  <div className="awards_standings_loading">
                    <div className="awards_standings_spinner"></div>
                    <p>Loading tournaments...</p>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="bracket-no-brackets">
                    {events.length === 0 ? (
                      <p>No completed tournaments found. Complete a tournament first to view awards and standings.</p>
                    ) : (
                      <>
                        <p>No tournaments match your search criteria.</p>
                        <button 
                          className="bracket-view-btn" 
                          onClick={() => {
                            setEventSearchTerm("");
                            setSportFilter("all");
                          }}
                        >
                          Clear Filters
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="awards_standings_table_container">
                    <table className="awards_standings_table">
                      <thead>
                        <tr>
                          <th style={{ fontSize: '15px' }}>Tournament</th>
                          <th style={{ fontSize: '15px' }}>Sport</th>
                          <th style={{ fontSize: '15px' }}>Dates</th>
                          <th style={{ fontSize: '15px' }}>Bracket</th>
                          <th style={{ fontSize: '15px' }}>Type</th>
                          <th style={{ fontSize: '15px' }}>Champion</th>
                          <th style={{ textAlign: 'center', fontSize: '15px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEvents.map(event => 
                          event.brackets && event.brackets.length > 0 ? (
                            event.brackets.map((bracket, idx) => (
                              <tr key={`${event.id}-${bracket.id}`}>
                                {idx === 0 && (
                                  <>
                                    <td rowSpan={event.brackets.length} style={{ fontWeight: '600', borderRight: '1px solid var(--border-color)', fontSize: '16px' }}>
                                      {event.name}
                                    </td>
                                    <td rowSpan={event.brackets.length} style={{ borderRight: '1px solid var(--border-color)' }}>
                                      <span className={`bracket-sport-badge ${event.sport === 'volleyball' ? 'bracket-sport-volleyball' : 'bracket-sport-basketball'}`} style={{ fontSize: '13px', padding: '8px 14px' }}>
                                        {event.sport?.toUpperCase() || 'MULTI-SPORT'}
                                      </span>
                                    </td>
                                    <td rowSpan={event.brackets.length} style={{ fontSize: '15px', borderRight: '1px solid var(--border-color)' }}>
                                      {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                                    </td>
                                  </>
                                )}
                                <td style={{ fontWeight: '600', fontSize: '15px' }}>
                                  <span className={`bracket-sport-badge ${bracket.sport_type === 'volleyball' ? 'bracket-sport-volleyball' : 'bracket-sport-basketball'}`} style={{ fontSize: '11px', padding: '4px 8px', marginRight: '8px' }}>
                                    {bracket.sport_type?.toUpperCase()}
                                  </span>
                                  {bracket.name}
                                </td>
                                <td style={{ fontSize: '15px' }}>
                                  {bracket.elimination_type === 'double' ? 'Double' : 'Single'} Elim.
                                </td>
                                <td style={{ fontSize: '15px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FaTrophy style={{ color: '#fbbf24' }} />
                                    <span style={{ fontWeight: '600' }}>{bracket.winner_team_name}</span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    onClick={() => handleBracketSelect(event, bracket)}
                                    className="bracket-view-btn"
                                    style={{ fontSize: '13px', padding: '8px 14px' }}
                                  >
                                    View Results →
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr key={event.id}>
                              <td style={{ fontWeight: '600', fontSize: '16px' }}>{event.name}</td>
                              <td>
                                <span className={`bracket-sport-badge ${event.sport === 'volleyball' ? 'bracket-sport-volleyball' : 'bracket-sport-basketball'}`} style={{ fontSize: '13px', padding: '8px 14px' }}>
                                  {event.sport?.toUpperCase() || 'MULTI-SPORT'}
                                </span>
                              </td>
                              <td style={{ fontSize: '15px' }}>
                                {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                              </td>
                              <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>
                                No completed brackets available
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Results Tab */}
            {activeTab === "results" && selectedEvent && selectedBracket && (
              <div className="bracket-visualization-section">
                <div className="event-details-header">
                  <h2>{selectedEvent.name} - {selectedBracket.name} Results</h2>
                  <div className="event-details-info">
                    <span><strong>Sport:</strong> {selectedBracket.sport_type}</span>
                    <span><strong>Champion:</strong> {selectedBracket.winner_team_name}</span>
                    <span><strong>Type:</strong> {selectedBracket.elimination_type === 'double' ? 'Double Elimination' : 'Single Elimination'}</span>
                  </div>
                </div>

                       {/* Awards View Selector */}
                 {/* Awards View Selector */}
                {/* Awards View Selector */}
                  {/* Awards View Selector */}
                <div style={{ 
                  padding: '25px 40px', 
                  borderBottom: '1px solid var(--border-color)',
                  background: 'var(--background-card)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', maxWidth: '380px' }}>
                    <label style={{ 
                      color: 'var(--text-primary)', 
                      fontWeight: '600',
                      fontSize: '14px',
                      whiteSpace: 'nowrap'
                    }}>
                      View:
                    </label>
                    <select
                      value={awardsTab}
                      onChange={(e) => setAwardsTab(e.target.value)}
                      style={{
                        flex: '1',
                        padding: '8px 12px',
                        border: '2px solid var(--border-color)',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'var(--background-secondary)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: '500',
                        outline: 'none',
                        transition: 'var(--transition)'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    >
                      <option value="standings">🏆 Team Standings</option>
                      <option value="mvp">👑 Tournament MVP</option>
                      <option value="awards">🏅 Awards</option>
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="awards_standings_loading">
                    <div className="awards_standings_spinner"></div>
                    <p>Loading tournament data...</p>
                  </div>
                ) : error ? (
                  <div className="bracket-error"><p>{error}</p></div>
                ) : (
                  <>
                    {contentTab === "standings" && (
                      <div className="awards_standings_tab_content">
                        <div className="awards_standings_toolbar">
                          <div className="awards_standings_search_container">
                            <FaSearch className="awards_standings_search_icon" />
                            <input
                              type="text"
                              className="awards_standings_search_input"
                              placeholder="Search teams..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>
                          <button className="awards_standings_export_btn" onClick={exportStandings}>
                            <FaDownload /> Export CSV
                          </button>
                        </div>

                        <div className="awards_standings_table_container">
                          <table className="awards_standings_table">
                            <thead>
                              <tr>
                                <th>Rank</th>
                                <th>Team</th>
                                <th>W</th>
                                <th>L</th>
                                {selectedBracket.sport_type === "basketball" ? (
                                  <>
                                    <th>PF</th>
                                    <th>PA</th>
                                    <th>Diff</th>
                                  </>
                                ) : (
                                  <>
                                    <th>SF</th>
                                    <th>SA</th>
                                    <th>Ratio</th>
                                  </>
                                )}
                                <th>Win%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredStandings.map((team, index) => (
                                <tr key={index} className={team.position <= 3 ? `awards_standings_podium_${team.position}` : ""}>
                                  <td className="awards_standings_rank">
                                    {team.position <= 3 && (
                                      <span className="awards_standings_medal">
                                        {team.position === 1 ? "🥇" : team.position === 2 ? "🥈" : "🥉"}
                                      </span>
                                    )}
                                    {team.position}
                                  </td>
                                  <td className="awards_standings_team_name">
                                    <strong>{team.team}</strong>
                                  </td>
                                  <td>{team.wins}</td>
                                  <td>{team.losses}</td>
                                  {selectedBracket.sport_type === "basketball" ? (
                                    <>
                                      <td>{team.points_for}</td>
                                      <td>{team.points_against}</td>
                                      <td className={String(team.point_diff).startsWith('+') ? 'awards_standings_positive' : String(team.point_diff).startsWith('-') ? 'awards_standings_negative' : ''}>
                                        {team.point_diff}
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td>{team.sets_for}</td>
                                      <td>{team.sets_against}</td>
                                      <td>{team.set_ratio}</td>
                                    </>
                                  )}
                                  <td>{team.win_percentage}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {contentTab === "mvp" && (
                      <div className="awards_standings_tab_content">
                        {!mvpData ? (
                          <div className="bracket-no-brackets">
                            <p>No MVP data available. Make sure player statistics have been recorded for completed matches.</p>
                          </div>
                        ) : (
                          <div className="awards_standings_mvp_section">
                            <div className="awards_standings_mvp_header">
                              <div className="awards_standings_mvp_crown">
                                <FaCrown />
                              </div>
                              <h2>Tournament Most Valuable Player</h2>
                            </div>
                            
                            <div className="awards_standings_mvp_card">
                              <div className="awards_standings_mvp_info">
                                <div className="awards_standings_mvp_name_section">
                                  <h3>{mvpData.player_name || 'Unknown Player'}</h3>
                                  <span className="awards_standings_mvp_team">{mvpData.team_name || 'Unknown Team'}</span>
                                  <span className="awards_standings_mvp_jersey">#{mvpData.jersey_number || 'N/A'}</span>
                                </div>
                                
                                <div className="awards_standings_mvp_stats_grid">
                                  <div className="awards_standings_stat_card">
                                    <div className="awards_standings_stat_value">{mvpData.games_played || 0}</div>
                                    <div className="awards_standings_stat_label">Games Played</div>
                                  </div>

                                  {selectedBracket.sport_type === "basketball" ? (
                                    <>
                                      <div className="awards_standings_stat_card awards_standings_highlight">
                                        <div className="awards_standings_stat_value">{safeNumber(mvpData.ppg)}</div>
                                        <div className="awards_standings_stat_label">PPG</div>
                                      </div>
                                      <div className="awards_standings_stat_card">
                                        <div className="awards_standings_stat_value">{safeNumber(mvpData.apg)}</div>
                                        <div className="awards_standings_stat_label">APG</div>
                                      </div>
                                      <div className="awards_standings_stat_card">
                                        <div className="awards_standings_stat_value">{safeNumber(mvpData.rpg)}</div>
                                        <div className="awards_standings_stat_label">RPG</div>
                                      </div>
                                      <div className="awards_standings_stat_card">
                                        <div className="awards_standings_stat_value">{safeNumber(mvpData.spg)}</div>
                                        <div className="awards_standings_stat_label">SPG</div>
                                      </div>
                                      <div className="awards_standings_stat_card">
                                        <div className="awards_standings_stat_value">{safeNumber(mvpData.bpg)}</div>
                                        <div className="awards_standings_stat_label">BPG</div>
                                      </div>
                                      <div className="awards_standings_stat_card awards_standings_highlight">
                                        <div className="awards_standings_stat_value">{safeNumber(mvpData.mvp_score, 2)}</div>
                                        <div className="awards_standings_stat_label">MVP Score</div>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="awards_standings_stat_card awards_standings_highlight">
                                        <div className="awards_standings_stat_value">{safeNumber(mvpData.kpg)}</div>
                                        <div className="awards_standings_stat_label">K/G</div>
                                      </div>
                                      <div className="awards_standings_stat_card">
                                        <div className="awards_standings_stat_value">{safeNumber(mvpData.apg)}</div>
                                        <div className="awards_standings_stat_label">A/G</div>
                                      </div>
                                      <div className="awards_standings_stat_card">
                                        <div className="awards_standings_stat_value">{safeNumber(mvpData.dpg)}</div>
                                        <div className="awards_standings_stat_label">D/G</div>
                                      </div>
                                      <div className="awards_standings_stat_card">
                                        <div className="awards_standings_stat_value">{safeNumber(mvpData.bpg)}</div>
                                        <div className="awards_standings_stat_label">B/G</div>
                                      </div>
                                      <div className="awards_standings_stat_card">
                                        <div className="awards_standings_stat_value">{safeNumber(mvpData.acepg)}</div>
                                        <div className="awards_standings_stat_label">Ace/G</div>
                                      </div>
                                      <div className="awards_standings_stat_card awards_standings_highlight">
                                        <div className="awards_standings_stat_value">{safeNumber(mvpData.mvp_score, 2)}</div>
                                        <div className="awards_standings_stat_label">MVP Score</div>
                                      </div>
                                    </>
                                  )}
                                </div>

                                {selectedBracket.sport_type === "volleyball" && (
                                  <div className="awards_standings_percentage_section">
                                    <h4>Performance Percentages</h4>
                                    <div className="awards_standings_percentage_grid">
                                      <div className="awards_standings_percentage_card">
                                        <div className="awards_standings_percentage_bar">
                                          <div 
                                            className="awards_standings_percentage_fill"
                                            style={{ width: `${Math.min(Math.max(mvpData.hitting_percentage || 0, 0), 100)}%` }}
                                          ></div>
                                        </div>
                                        <div className="awards_standings_percentage_label">
                                          <span>Hitting %</span>
                                          <strong>{safeNumber(mvpData.hitting_percentage)}%</strong>
                                        </div>
                                      </div>
                                      <div className="awards_standings_percentage_card">
                                        <div className="awards_standings_percentage_bar">
                                          <div 
                                            className="awards_standings_percentage_fill"
                                            style={{ width: `${Math.min(Math.max(mvpData.service_percentage || 0, 0), 100)}%` }}
                                          ></div>
                                        </div>
                                        <div className="awards_standings_percentage_label">
                                          <span>Service %</span>
                                          <strong>{safeNumber(mvpData.service_percentage)}%</strong>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {contentTab === "awards" && (
                      <div className="awards_standings_tab_content">
                        {!awards || getAwardsForDisplay().length === 0 ? (
                          <div className="bracket-no-brackets">
                            <p>No awards data available. Make sure player statistics have been recorded for completed matches.</p>
                          </div>
                        ) : (
                          <div className="awards_standings_awards_section">
                            <h2>Tournament Awards</h2>
                            <div className="awards_standings_table_container">
                              <table className="awards_standings_table">
                                <thead>
                                  <tr>
                                    <th style={{ width: '60px', textAlign: 'center' }}></th>
                                    <th>Award Category</th>
                                    <th>Winner</th>
                                    <th>Team</th>
                                    <th>Statistics</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {getAwardsForDisplay().map((award, index) => (
                                    <tr key={index}>
                                      <td style={{ textAlign: 'center' }}>
                                        {index === 0 ? (
                                          <FaCrown style={{ color: '#fbbf24', fontSize: '24px' }} />
                                        ) : (
                                          <FaStar style={{ color: '#3b82f6', fontSize: '20px' }} />
                                        )}
                                      </td>
                                      <td style={{ fontWeight: '600' }}>{award.category}</td>
                                      <td style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)' }}>{award.winner}</td>
                                      <td>{award.team}</td>
                                      <td style={{ color: '#3b82f6', fontWeight: '600' }}>{award.stat}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAwardsStandings;