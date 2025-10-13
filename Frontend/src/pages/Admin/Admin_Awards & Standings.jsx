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
      
      // Fetch brackets for each event
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
            {/* Simplified Tabs */}
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

            {/* Combined Tournament & Bracket Selection */}
            {activeTab === "tournaments" && (
              <div className="bracket-view-section">
                <h2>Select Tournament & Bracket</h2>
                {loading ? (
                  <div className="awards_standings_loading">
                    <div className="awards_standings_spinner"></div>
                    <p>Loading tournaments...</p>
                  </div>
                ) : events.length === 0 ? (
                  <div className="bracket-no-brackets">
                    <p>No completed tournaments found. Complete a tournament first to view awards and standings.</p>
                  </div>
                ) : (
                  <div className="tournament-brackets-combined">
                    {events.map(event => (
                      <div key={event.id} className="event-section">
                        <div className="event-header-card">
                          <div className="event-title-section">
                            <h3>{event.name}</h3>
                            <span className={`bracket-sport-badge ${event.sport === 'volleyball' ? 'bracket-sport-volleyball' : 'bracket-sport-basketball'}`}>
                              {event.sport || 'MULTI-SPORT'}
                            </span>
                          </div>
                          <div className="event-dates">
                            {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                          </div>
                        </div>

                        {event.brackets && event.brackets.length > 0 ? (
                          <div className="brackets-grid">
                            {event.brackets.map(bracket => (
                              <div 
                                key={bracket.id} 
                                className="bracket-card clickable-bracket"
                                onClick={() => handleBracketSelect(event, bracket)}
                              >
                                <div className="bracket-card-header">
                                  <h4>{bracket.name}</h4>
                                  <span className={`bracket-sport-badge bracket-sport-${bracket.sport_type}`}>
                                    {bracket.sport_type}
                                  </span>
                                </div>
                                <div className="bracket-card-info">
                                  <div className="bracket-info-row">
                                    <FaTrophy className="info-icon" />
                                    <span>{bracket.winner_team_name}</span>
                                  </div>
                                  <div className="bracket-info-row">
                                    <span className="info-label">Type:</span>
                                    <span>{bracket.elimination_type === 'double' ? 'Double' : 'Single'} Elimination</span>
                                  </div>
                                </div>
                                <div className="bracket-card-actions">
                                  <button className="bracket-view-btn">View Results →</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="no-brackets-message">
                            <p>No completed brackets available for this event</p>
                          </div>
                        )}
                      </div>
                    ))}
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

                <div className="awards_standings_tabs">
                  <button
                    className={`awards_standings_tab_button ${contentTab === "standings" ? "awards_standings_tab_active" : ""}`}
                    onClick={() => setContentTab("standings")}
                  >
                    <FaTrophy /> Team Standings
                  </button>
                  <button
                    className={`awards_standings_tab_button ${contentTab === "mvp" ? "awards_standings_tab_active" : ""}`}
                    onClick={() => setContentTab("mvp")}
                  >
                    <FaCrown /> Tournament MVP
                  </button>
                  <button
                    className={`awards_standings_tab_button ${contentTab === "awards" ? "awards_standings_tab_active" : ""}`}
                    onClick={() => setContentTab("awards")}
                  >
                    <FaMedal /> Awards
                  </button>
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
                                      <span className={`awards_standings_medal`}>
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
                            <div className="awards_standings_awards_grid">
                              {getAwardsForDisplay().map((award, index) => (
                                <div key={index} className="awards_standings_award_card">
                                  <div className="awards_standings_award_icon">
                                    {index === 0 ? <FaCrown /> : <FaStar />}
                                  </div>
                                  <div className="awards_standings_award_content">
                                    <h4>{award.category}</h4>
                                    <div className="awards_standings_award_winner">
                                      <strong>{award.winner}</strong>
                                      <span>{award.team}</span>
                                    </div>
                                    <div className="awards_standings_award_stat">
                                      {award.stat}
                                    </div>
                                  </div>
                                </div>
                              ))}
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

      <style jsx>{`
        .tournament-brackets-combined {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .event-section {
          background: #1e2a3a;
          border-radius: 12px;
          padding: 20px;
        }

        .event-header-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #2d3e50;
        }

        .event-title-section {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .event-title-section h3 {
          margin: 0;
          font-size: 24px;
          color: #fff;
        }

        .event-dates {
          color: #8b9dc3;
          font-size: 14px;
        }

        .brackets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .clickable-bracket {
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .clickable-bracket:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(33, 150, 243, 0.3);
          border-color: #2196f3;
        }

        .bracket-info-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .info-icon {
          color: #ffd700;
        }

        .info-label {
          color: #8b9dc3;
        }

        .no-brackets-message {
          padding: 30px;
          text-align: center;
          color: #8b9dc3;
          background: #151f2e;
          border-radius: 8px;
          margin-top: 15px;
        }

        @media (max-width: 768px) {
          .event-header-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .brackets-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminAwardsStandings;