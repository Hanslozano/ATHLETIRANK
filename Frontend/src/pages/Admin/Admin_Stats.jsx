import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaFilter, FaDownload, FaTrophy, FaArrowLeft } from "react-icons/fa";
import "../../style/Admin_Stats.css";

const AdminStats = ({ sidebarOpen }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedBracket, setSelectedBracket] = useState(null); // Add this state
  const [brackets, setBrackets] = useState([]);
  const [matches, setMatches] = useState([]);
  const [playerStats, setPlayerStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sportFilter, setSportFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("events");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [cameFromAdminEvents, setCameFromAdminEvents] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Format round display based on bracket type and round number
  const formatRoundDisplay = (match) => {
    const roundNum = match.round_number;
    
    if (roundNum === 200) return 'Grand Final';
    if (roundNum === 201) return 'Bracket Reset';
    if (match.bracket_type === 'championship') {
      return `Championship Round ${roundNum - 199}`;
    }
    
    if (match.bracket_type === 'loser' || (roundNum >= 101 && roundNum < 200)) {
      return `LB Round ${roundNum - 100}`;
    }
    
    if (match.bracket_type === 'winner' || roundNum < 100) {
      return `Round ${roundNum}`;
    }
    
    return `Round ${roundNum}`;
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setShowFilters(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check for session storage data on component mount
  useEffect(() => {
    const checkSessionData = async () => {
      const matchData = sessionStorage.getItem('selectedMatchData');
      const contextData = sessionStorage.getItem('adminEventsContext');
      
      if (matchData && contextData) {
        setCameFromAdminEvents(true);
        try {
          const { matchId, eventId, bracketId, match } = JSON.parse(matchData);
          const { selectedEvent: eventContext, selectedBracket: bracketContext } = JSON.parse(contextData);
          
          // Set the event and bracket context
          setSelectedEvent(eventContext);
          setSelectedBracket(bracketContext); // Set the selected bracket
          
          // Load the match statistics directly
          await handleMatchSelect(match);
          
          // Don't clear session storage - keep it for back navigation
        } catch (err) {
          console.error("Error loading session data:", err);
        }
      }
    };
    
    checkSessionData();
  }, []);

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:5000/api/stats/events");
        const data = await res.json();
        setEvents(data);
      } catch (err) {
        console.error("Error fetching events:", err);
        setEvents([
          { 
            id: 1, 
            name: "Basketball Tournament", 
            status: "ongoing", 
            start_date: "2025-09-20", 
            end_date: "2025-10-04",
            archived: "no"
          },
          { 
            id: 2, 
            name: "Volleyball Championship", 
            status: "completed", 
            start_date: "2023-11-01", 
            end_date: "2023-11-03",
            archived: "no"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Handle event selection
  const handleEventSelect = async (event) => {
    setSelectedEvent(event);
    setSelectedBracket(null); // Reset selected bracket
    setLoading(true);
    setCurrentPage(1);
    try {
      const bracketRes = await fetch(`http://localhost:5000/api/stats/events/${event.id}/brackets`);
      const bracketData = await bracketRes.json();
      setBrackets(bracketData);

      const allMatches = [];
      for (const bracket of bracketData) {
        const matchRes = await fetch(`http://localhost:5000/api/stats/${bracket.id}/matches`);
        const matchData = await matchRes.json();
        const matchesWithBracket = matchData.map(match => ({
          ...match,
          bracket_name: bracket.name,
          sport_type: bracket.sport_type,
          bracket_type: match.bracket_type || bracket.bracket_type || bracket.elimination_type
        }));
        allMatches.push(...matchesWithBracket);
      }
      setMatches(allMatches);
      setActiveTab("brackets");
    } catch (err) {
      console.error("Error fetching event data:", err);
      setBrackets([
        { id: 1, name: "Men's Basketball Bracket", sport_type: "basketball", event_id: 1, elimination_type: "double" },
        { id: 2, name: "Women's Volleyball Bracket", sport_type: "volleyball", event_id: 2, elimination_type: "single" }
      ]);
      setMatches([
        { 
          id: 1, 
          bracket_id: 1, 
          team1_name: "Team A", 
          team2_name: "Team B", 
          winner_name: "Team A", 
          score_team1: 85, 
          score_team2: 70, 
          status: "completed", 
          round_number: 1, 
          bracket_name: "Men's Basketball Bracket", 
          sport_type: "basketball",
          bracket_type: "winner"
        },
        { 
          id: 2, 
          bracket_id: 1, 
          team1_name: "Team C", 
          team2_name: "Team D", 
          winner_name: "Team D", 
          score_team1: 65, 
          score_team2: 75, 
          status: "completed", 
          round_number: 101, 
          bracket_name: "Men's Basketball Bracket", 
          sport_type: "basketball",
          bracket_type: "loser"
        },
        { 
          id: 3, 
          bracket_id: 1, 
          team1_name: "Team A", 
          team2_name: "Team D", 
          winner_name: "Team A", 
          score_team1: 90, 
          score_team2: 80, 
          status: "completed", 
          round_number: 200, 
          bracket_name: "Men's Basketball Bracket", 
          sport_type: "basketball",
          bracket_type: "championship"
        },
        { 
          id: 4, 
          bracket_id: 2, 
          team1_name: "Team X", 
          team2_name: "Team Y", 
          winner_name: "Team X", 
          score_team1: 3, 
          score_team2: 1, 
          status: "completed", 
          round_number: 1, 
          bracket_name: "Women's Volleyball Bracket", 
          sport_type: "volleyball",
          bracket_type: "winner"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewEvent = (event) => {
    handleEventSelect(event);
  };

  // Handle match selection to view player stats
  const handleMatchSelect = async (match) => {
    setSelectedMatch(match);
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/stats/matches/${match.id}/stats`);
      const data = await res.json();
      
      const playersWithDetails = data.map((stat) => ({
        ...stat,
        player_name: stat.player_name || "Unknown Player",
        jersey_number: stat.jersey_number || stat.jerseyNumber || "N/A",
        team_name: stat.team_name || "Unknown Team"
      }));
      
      setPlayerStats(playersWithDetails);
      setActiveTab("statistics");
    } catch (err) {
      console.error("Error fetching player stats:", err);
      setPlayerStats([
        { 
          player_id: 1, 
          player_name: "John Doe", 
          team_name: "Team A", 
          jersey_number: 10,
          points: 25, 
          assists: 8, 
          rebounds: 10, 
          three_points_made: 3,
          steals: 2, 
          blocks: 1, 
          fouls: 3, 
          turnovers: 2,
          serves: 0,
          service_aces: 0,
          serve_errors: 0,
          receptions: 0,
          reception_errors: 0,
          digs: 0,
          kills: 0,
          attack_attempts: 0,
          attack_errors: 0,
          volleyball_assists: 0
        },
        { 
          player_id: 2, 
          player_name: "Jane Smith", 
          team_name: "Team A", 
          jersey_number: 5,
          points: 20, 
          assists: 12, 
          rebounds: 5, 
          three_points_made: 2,
          steals: 3, 
          blocks: 0, 
          fouls: 2, 
          turnovers: 1,
          serves: 0,
          service_aces: 0,
          serve_errors: 0,
          receptions: 0,
          reception_errors: 0,
          digs: 0,
          kills: 0,
          attack_attempts: 0,
          attack_errors: 0,
          volleyball_assists: 0
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Go back to Admin Events page
 // Go back to Admin Events page with context preserved
const handleBackToAdminEvents = () => {
  // Store the context to restore the matches view
  sessionStorage.setItem('adminEventsReturnContext', JSON.stringify({
    selectedEvent: selectedEvent,
    selectedBracket: selectedBracket
  }));
  
  // Navigate back to Admin Events
  navigate('/AdminDashboard/events');
};

// In the JSX return, update the button:
{cameFromAdminEvents && (
  <div className="stats-header-right">
    <button 
      onClick={handleBackToAdminEvents}
      className="back-to-events-btn"
    >
      <FaArrowLeft /> Back
    </button>
  </div>
)}
  // Go back to events list (within stats page)
  const handleBackToEvents = () => {
    setSelectedEvent(null);
    setSelectedBracket(null); // Reset selected bracket
    setSelectedMatch(null);
    setBrackets([]);
    setMatches([]);
    setPlayerStats([]);
    setActiveTab("events");
    setCameFromAdminEvents(false);
  };

  // Filter player stats based on search term
  const filteredPlayerStats = playerStats.filter(player => 
    player.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (player.jersey_number && player.jersey_number.toString().includes(searchTerm)) ||
    (player.jerseyNumber && player.jerseyNumber.toString().includes(searchTerm))
  );

  // Group matches by bracket
  const matchesByBracket = {};
  matches.forEach(match => {
    if (!matchesByBracket[match.bracket_id]) {
      matchesByBracket[match.bracket_id] = [];
    }
    matchesByBracket[match.bracket_id].push(match);
  });

  // Find bracket winners
  const bracketWinners = {};
  brackets.forEach(bracket => {
    if (matchesByBracket[bracket.id]) {
      const finalMatches = matchesByBracket[bracket.id].filter(m => 
        Math.max(...matchesByBracket[bracket.id].map(m => m.round_number)) === m.round_number
      );
      if (finalMatches.length > 0) {
        bracketWinners[bracket.id] = finalMatches[0].winner_name;
      }
    }
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Render matches with pagination
  const renderMatchesWithPagination = (bracketMatches, totalPages) => {
    return (
      <>
        <div className="matches-grid">
          {bracketMatches.map((match) => (
            <div 
              key={match.id} 
              className="match-card"
              onClick={() => handleMatchSelect(match)}
            >
              <div className="match-teams">
                <div className={`match-team ${match.winner_id === match.team1_id ? "match-winner" : ""}`}>
                  {match.team1_name}
                </div>
                <div className="match-vs">vs</div>
                <div className={`match-team ${match.winner_id === match.team2_id ? "match-winner" : ""}`}>
                  {match.team2_name}
                </div>
              </div>
              <div className="match-score">
                {match.score_team1} - {match.score_team2}
              </div>
              <div className="match-info">
                <span>{formatRoundDisplay(match)}</span>
                {match.winner_name && (
                  <span className="match-winner-tag">
                    Winner: {match.winner_name}
                  </span>
                )}
              </div>
              <div className="match-actions">
                <button className="bracket-view-btn">
                  View Stats
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="adminstats-pagination-container">
            <button 
              className="adminstats-pagination-btn"
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            
            <div className="adminstats-pagination-numbers">
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  className={`adminstats-pagination-number ${currentPage === index + 1 ? 'active' : ''}`}
                  onClick={() => paginate(index + 1)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            
            <button 
              className="adminstats-pagination-btn"
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </>
    );
  };

  // Render player statistics table
  const renderStatsTable = () => {
    if (playerStats.length === 0) return <p>No statistics available for this match.</p>;
    
    const isBasketball = selectedMatch?.sport_type === "basketball";
    
    return (
      <div className="adminstats-table-container">
        <div className="adminstats-table-controls">
          <div className="adminstats-search-box">
            <FaSearch />
            <input
              type="text"
              placeholder="Search players or jersey numbers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="adminstats-filter-controls">
            {isMobile ? (
              <>
                <button 
                  className="adminstats-filter-toggle-btn"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <FaFilter /> Filters
                </button>
                
                {showFilters && (
                  <div className="adminstats-mobile-filters">
                    <div className="adminstats-filter-group">
                      <select 
                        value={sportFilter} 
                        onChange={(e) => setSportFilter(e.target.value)}
                      >
                        <option value="all">All Sports</option>
                        <option value="basketball">Basketball</option>
                        <option value="volleyball">Volleyball</option>
                      </select>
                    </div>
                    
                    <div className="adminstats-filter-group">
                      <select 
                        value={timeFilter} 
                        onChange={(e) => setTimeFilter(e.target.value)}
                      >
                        <option value="all">All Time</option>
                        <option value="season">This Season</option>
                        <option value="month">This Month</option>
                        <option value="week">This Week</option>
                      </select>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="adminstats-filter-group">
                  <select 
                    value={sportFilter} 
                    onChange={(e) => setSportFilter(e.target.value)}
                  >
                    <option value="all">All Sports</option>
                    <option value="basketball">Basketball</option>
                    <option value="volleyball">Volleyball</option>
                  </select>
                </div>
                
                <div className="adminstats-filter-group">
                  <select 
                    value={timeFilter} 
                    onChange={(e) => setTimeFilter(e.target.value)}
                  >
                    <option value="all">All Time</option>
                    <option value="season">This Season</option>
                    <option value="month">This Month</option>
                    <option value="week">This Week</option>
                  </select>
                </div>
              </>
            )}
            
            <button className="adminstats-export-btn" onClick={exportToCSV}>
              <FaDownload /> Export CSV
            </button>
          </div>
        </div>
        
        <div className="adminstats-table-wrapper">
          <table className="adminstats-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                <th>Jersey</th>
                {isBasketball ? (
                  <>
                    <th>PTS</th>
                    <th>AST</th>
                    <th>REB</th>
                    <th>STL</th>
                    <th>BLK</th>
                    <th>3PM</th>
                    <th>Fouls</th>
                    <th>TO</th>
                  </>
                ) : (
                  <>
                    <th>Kills</th>
                    <th>Assists</th>
                    <th>Digs</th>
                    <th>Blocks</th>
                    <th>Aces</th>
                    <th>Serve Err</th>
                    <th>Att Err</th>
                    <th>Rec Err</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredPlayerStats.map((player) => {
                const jerseyNumber = player.jersey_number || player.jerseyNumber || "N/A";
                
                return (
                  <tr key={player.player_id}>
                    <td className="adminstats-player-name">{player.player_name}</td>
                    <td>{player.team_name}</td>
                    <td className="adminstats-jersey-number">{jerseyNumber}</td>
                    
                    {isBasketball ? (
                      <>
                        <td className="adminstats-highlight">{player.points || 0}</td>
                        <td>{player.assists || 0}</td>
                        <td>{player.rebounds || 0}</td>
                        <td>{player.steals || 0}</td>
                        <td>{player.blocks || 0}</td>
                        <td>{player.three_points_made || 0}</td>
                        <td>{player.fouls || 0}</td>
                        <td>{player.turnovers || 0}</td>
                      </>
                    ) : (
                      <>
                        <td className="adminstats-highlight">{player.kills || 0}</td>
                        <td>{player.volleyball_assists || 0}</td>
                        <td>{player.digs || 0}</td>
                        <td>{player.blocks || 0}</td>
                        <td>{player.service_aces || 0}</td>
                        <td>{player.serve_errors || 0}</td>
                        <td>{player.attack_errors || 0}</td>
                        <td>{player.reception_errors || 0}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Export data as CSV
  const exportToCSV = () => {
    if (playerStats.length === 0) return;
    
    const isBasketball = selectedMatch?.sport_type === "basketball";
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (isBasketball) {
      csvContent += "Player,Team,Jersey,PTS,AST,REB,STL,BLK,3PM,Fouls,TO\n";
    } else {
      csvContent += "Player,Team,Jersey,Kills,Assists,Digs,Blocks,Aces,Serve Err,Att Err,Rec Err\n";
    }
    
    playerStats.forEach(player => {
      const jerseyNumber = player.jersey_number || player.jerseyNumber || "N/A";
      if (isBasketball) {
        csvContent += `${player.player_name},${player.team_name},${jerseyNumber},${player.points || 0},${player.assists || 0},${player.rebounds || 0},${player.steals || 0},${player.blocks || 0},${player.three_points_made || 0},${player.fouls || 0},${player.turnovers || 0}\n`;
      } else {
        csvContent += `${player.player_name},${player.team_name},${jerseyNumber},${player.kills || 0},${player.volleyball_assists || 0},${player.digs || 0},${player.blocks || 0},${player.service_aces || 0},${player.serve_errors || 0},${player.attack_errors || 0},${player.reception_errors || 0}\n`;
      }
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `match_stats.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="admin-dashboard">
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-header">
          <div>
            <h1>Admin Statistics</h1>
            <p>View match results and player statistics</p>
          </div>
        </div>

        <div className="dashboard-main">
          <div className="bracket-content">
            {/* Tabs */}
            <div className="bracket-tabs">
              <button
                className={`bracket-tab-button ${activeTab === "events" ? "bracket-tab-active" : ""}`}
                onClick={() => setActiveTab("events")}
              >
                Events
              </button>
              {selectedEvent && (
                <button
                  className={`bracket-tab-button ${activeTab === "brackets" ? "bracket-tab-active" : ""}`}
                  onClick={() => setActiveTab("brackets")}
                >
                  Brackets & Matches
                </button>
              )}
              {playerStats.length > 0 && (
                <button
                  className={`bracket-tab-button ${activeTab === "statistics" ? "bracket-tab-active" : ""}`}
                  onClick={() => setActiveTab("statistics")}
                >
                  Player Statistics
                </button>
              )}
            </div>

            {/* Events Tab */}
            {activeTab === "events" && (
              <div className="bracket-view-section">
                <h2>All Events</h2>
                {loading ? (
                  <p>Loading events...</p>
                ) : events.length === 0 ? (
                  <div className="bracket-no-brackets">
                    <p>No events available.</p>
                  </div>
                ) : (
                  <div className="bracket-grid">
                    {events.map((event) => (
                      <div className="bracket-card" key={event.id}>
                        <div className="bracket-card-header">
                          <h3>{event.name}</h3>
                          <span className={`bracket-sport-badge ${event.status === "ongoing" ? "bracket-sport-basketball" : "bracket-sport-volleyball"}`}>
                            {event.status}
                          </span>
                        </div>
                        <div className="bracket-card-info">
                          <div><strong>Start:</strong> {new Date(event.start_date).toLocaleDateString()}</div>
                          <div><strong>End:</strong> {new Date(event.end_date).toLocaleDateString()}</div>
                          <div><strong>Status:</strong> 
                            <span className={event.status === "ongoing" ? "status-ongoing" : "status-completed"}>
                              {event.status}
                            </span>
                          </div>
                          <div><strong>Archived:</strong> 
                            <span className={event.archived === "no" ? "archived-no" : "archived-yes"}>
                              {event.archived || "no"}
                            </span>
                          </div>
                        </div>
                        <div className="bracket-card-actions">
                          <button className="bracket-view-btn" onClick={() => handleViewEvent(event)}>
                            View Results
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Brackets & Matches Tab */}
            {activeTab === "brackets" && selectedEvent && (
              <div className="bracket-view-section">
                <div className="event-details-header">
                  <h2>{selectedEvent.name} - Results</h2>
                  <div className="event-details-info">
                    <span><strong>Start:</strong> {new Date(selectedEvent.start_date).toLocaleDateString()}</span>
                    <span><strong>End:</strong> {new Date(selectedEvent.end_date).toLocaleDateString()}</span>
                    <span><strong>Status:</strong> {selectedEvent.status}</span>
                  </div>
                </div>

                {loading ? (
                  <p>Loading brackets and matches...</p>
                ) : brackets.length === 0 ? (
                  <div className="bracket-no-brackets">
                    <p>No brackets available for this event.</p>
                  </div>
                ) : (
                  <div>
                    {brackets.map((bracket) => {
                      const bracketMatches = matchesByBracket[bracket.id] || [];
                      const currentMatches = bracketMatches.slice(indexOfFirstItem, indexOfLastItem);
                      const totalPages = Math.ceil(bracketMatches.length / itemsPerPage);

                      return (
                        <div key={bracket.id} className="bracket-section">
                          {/* Bracket Title Banner */}
                          <div className="bracket-title-banner">
                            <h3>
                              {selectedEvent.name} - {bracket.name}
                            </h3>
                            <div className="sport-badge">
                              {bracket.sport_type?.toUpperCase() || 'SPORT'}
                            </div>
                          </div>
                          
                          <div className="bracket-header">
                            <h3>
                              {bracket.elimination_type === 'double' ? 'Double Elimination' : 'Single Elimination'}
                            </h3>
                            {bracketWinners[bracket.id] && (
                              <div className="bracket-winner">
                                <FaTrophy /> Winner: {bracketWinners[bracket.id]}
                              </div>
                            )}
                          </div>
                          
                          {bracketMatches.length > 0 ? (
                            renderMatchesWithPagination(currentMatches, totalPages)
                          ) : (
                            <p>No matches available for this bracket.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Player Statistics Tab */}
            {activeTab === "statistics" && (
              <div className="bracket-view-section">
                <div className="stats-header-container">
                  {selectedMatch && (
                    <div className="stats-header-center">
                      <h2>{selectedMatch.team1_name} vs {selectedMatch.team2_name}</h2>
                      <p className="stats-match-info">
                        {selectedEvent?.name} - {formatRoundDisplay(selectedMatch)}
                      </p>
                      <p className="stats-bracket-info">
                        <strong>Bracket:</strong> {selectedBracket?.name || selectedMatch.bracket_name} | 
                        <strong> Type:</strong> {selectedBracket?.elimination_type === 'double' ? 'Double Elimination' : 'Single Elimination'}
                      </p>
                    </div>
                  )}
                  
                 {cameFromAdminEvents && (
                  <div className="stats-header-right">
                    <button 
                      onClick={handleBackToAdminEvents}
                      className="back-to-events-btn"
                    >
                      <FaArrowLeft /> Back
                    </button>
                  </div>
                )}
                </div>

                {loading ? (
                  <p>Loading statistics...</p>
                ) : (
                  renderStatsTable()
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStats;