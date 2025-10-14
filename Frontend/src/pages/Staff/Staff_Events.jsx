import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrophy, FaCrown, FaChartBar, FaEye } from "react-icons/fa";
import CustomBracket from "../../components/CustomBracket";
import DoubleEliminationBracket from "../../components/DoubleEliminationBracket";
import "../../style/Staff_Events.css";

const StaffEvents = ({ sidebarOpen }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedBracket, setSelectedBracket] = useState(null);
  const [activeTab, setActiveTab] = useState("events");
  const [contentTab, setContentTab] = useState("matches");
  const [matches, setMatches] = useState([]);
  const [bracketMatches, setBracketMatches] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  // Fetch events with brackets
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("http://localhost:5000/api/events");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      
      // Fetch brackets for each event
      const eventsWithBrackets = await Promise.all(
        data.map(async (event) => {
          try {
            const bracketsRes = await fetch(`http://localhost:5000/api/events/${event.id}/brackets`);
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Restore context when returning from Stats page
  useEffect(() => {
    const storedContext = sessionStorage.getItem('staffEventsContext');
    
    if (storedContext) {
      try {
        const { selectedEvent: savedEvent, selectedBracket: savedBracket } = JSON.parse(storedContext);
        
        if (savedEvent && events.length > 0) {
          const event = events.find(e => e.id === savedEvent.id);
          
          if (event) {
            setSelectedEvent(event);
            
            if (savedBracket) {
              const bracket = event.brackets?.find(b => b.id === savedBracket.id);
              if (bracket) {
                handleBracketSelect(event, bracket);
              }
            }
          }
          
          sessionStorage.removeItem('staffEventsContext');
        }
      } catch (err) {
        console.error('Error restoring context:', err);
        sessionStorage.removeItem('staffEventsContext');
      }
    }
  }, [events]);

  // Filter events based on search term and status filter
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Handle bracket selection
  const handleBracketSelect = async (event, bracket) => {
    setSelectedEvent(event);
    setSelectedBracket(bracket);
    setActiveTab("results");
    setContentTab("matches");
    setLoadingDetails(true);
    setError(null);

    try {
      const res = await fetch(`http://localhost:5000/api/brackets/${bracket.id}/matches`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      const visibleMatches = data.filter(match => match.status !== 'hidden');
      setMatches(visibleMatches);
      setBracketMatches(visibleMatches);

      if (visibleMatches.length === 0) {
        setError("No matches found for this bracket.");
      }
    } catch (err) {
      setError("Failed to load matches: " + err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Navigate to stats input
  const handleInputStats = (match) => {
    sessionStorage.setItem('selectedMatchData', JSON.stringify({
      matchId: match.id,
      eventId: selectedEvent?.id,
      bracketId: selectedBracket?.id,
      match: match
    }));
    
    sessionStorage.setItem('staffEventsContext', JSON.stringify({
      selectedEvent: selectedEvent,
      selectedBracket: selectedBracket
    }));
    
    navigate('/StaffDashboard/stats');
  };

  const getStatusBadge = (status) => {
    return <span className={`match-status status-${status}`}>{status}</span>;
  };

  return (
    <div className="admin-dashboard">
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-header">
          <h1>Staff Events</h1>
          <p>View events, brackets, and manage match statistics</p>
        </div>

        <div className="dashboard-main">
          <div className="bracket-content">
            {/* Tabs */}
            <div className="bracket-tabs">
              <button
                className={`bracket-tab-button ${activeTab === "events" ? "bracket-tab-active" : ""}`}
                onClick={() => setActiveTab("events")}
              >
                Select Events & Brackets
              </button>
             {selectedBracket && (
            <button
              className={`bracket-tab-button ${activeTab === "results" ? "bracket-tab-active" : ""}`}
              onClick={() => setActiveTab("results")}
                >
               {selectedBracket.name} - Matches
  </button>
)}
            </div>

            {/* Events Selection Tab */}
            {activeTab === "events" && (
              <div className="bracket-view-section">
                {/* Search Container */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: '1', minWidth: '300px' }}>
                    <input
                      type="text"
                      placeholder="Search events..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        flex: '1',
                        padding: '12px 16px',
                        border: '2px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: 'var(--background-secondary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
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
                      <option value="all">All Status</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Results Info */}
                {(searchTerm || statusFilter !== "all") && (
                  <div style={{ marginBottom: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Showing {filteredEvents.length} of {events.length} events
                    {searchTerm && <span style={{ color: 'var(--primary-color)', marginLeft: '5px' }}> • Searching: "{searchTerm}"</span>}
                    {statusFilter !== "all" && <span style={{ color: 'var(--primary-color)', marginLeft: '5px' }}> • Status: {statusFilter}</span>}
                  </div>
                )}

                {loading ? (
                  <div className="awards_standings_loading">
                    <div className="awards_standings_spinner"></div>
                    <p>Loading events...</p>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="bracket-no-brackets">
                    {events.length === 0 ? (
                      <p>No events found.</p>
                    ) : (
                      <>
                        <p>No events match your search criteria.</p>
                        <button 
                          className="bracket-view-btn" 
                          onClick={() => {
                            setSearchTerm("");
                            setStatusFilter("all");
                          }}
                        >
                          Clear Search
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="awards_standings_table_container">
                    <table className="awards_standings_table">
                      <thead>
                        <tr>
                          <th style={{ fontSize: '15px' }}>Event Name</th>
                          <th style={{ fontSize: '15px' }}>Status</th>
                          <th style={{ fontSize: '15px' }}>Dates</th>
                          <th style={{ fontSize: '15px' }}>Bracket</th>
                          <th style={{ fontSize: '15px' }}>Sport</th>
                          <th style={{ fontSize: '15px' }}>Type</th>
                          <th style={{ fontSize: '15px' }}>Teams</th>
                          <th style={{ textAlign: 'center', width: '120px', fontSize: '15px' }}>Actions</th>
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
                                      <span className={`bracket-sport-badge ${event.status === "ongoing" ? "bracket-sport-basketball" : "bracket-sport-volleyball"}`} style={{ fontSize: '13px', padding: '8px 14px' }}>
                                        {event.status}
                                      </span>
                                    </td>
                                    <td rowSpan={event.brackets.length} style={{ fontSize: '15px', borderRight: '1px solid var(--border-color)' }}>
                                      {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                                    </td>
                                  </>
                                )}
                                <td style={{ fontWeight: '600', fontSize: '15px' }}>{bracket.name}</td>
                                <td>
                                  <span className={`bracket-sport-badge ${bracket.sport_type === 'volleyball' ? 'bracket-sport-volleyball' : 'bracket-sport-basketball'}`} style={{ fontSize: '13px', padding: '8px 14px' }}>
                                    {bracket.sport_type?.toUpperCase() || 'N/A'}
                                  </span>
                                </td>
                                <td style={{ fontSize: '15px' }}>
                                  {bracket.elimination_type === 'double' ? 'Double' : 'Single'} Elim.
                                </td>
                                <td style={{ fontSize: '15px' }}>{bracket.team_count || 0}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button
                                      onClick={() => handleBracketSelect(event, bracket)}
                                      className="bracket-view-btn"
                                      style={{ fontSize: '13px', padding: '8px 14px', flex: '1 1 auto', minWidth: '55px' }}
                                      title="View Matches"
                                    >
                                      <FaEye />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr key={event.id}>
                              <td style={{ fontWeight: '600', fontSize: '16px' }}>{event.name}</td>
                              <td>
                                <span className={`bracket-sport-badge ${event.status === "ongoing" ? "bracket-sport-basketball" : "bracket-sport-volleyball"}`} style={{ fontSize: '13px', padding: '8px 14px' }}>
                                  {event.status}
                                </span>
                              </td>
                              <td style={{ fontSize: '15px' }}>
                                {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                              </td>
                              <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>
                                No brackets available for this event
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
                  {/* Change this line: */}
                  <h2>{selectedBracket.name}</h2>
                  <div className="event-details-info">
                    {/* Add event name here: */}
                    <span><strong>Event:</strong> {selectedEvent.name}</span>
                    <span><strong>Sport:</strong> {capitalize(selectedBracket.sport_type)}</span>
                    <span><strong>Type:</strong> {selectedBracket.elimination_type === 'double' ? 'Double Elimination' : 'Single Elimination'}</span>
                    <span><strong>Teams:</strong> {selectedBracket.team_count || 0}</span>
                  </div>
                </div>

                <div className="awards_standings_tabs">
                  <button
                    className={`awards_standings_tab_button ${contentTab === "matches" ? "awards_standings_tab_active" : ""}`}
                    onClick={() => setContentTab("matches")}
                  >
                    <FaChartBar /> View Matches
                  </button>
                  <button
                    className={`awards_standings_tab_button ${contentTab === "bracket" ? "awards_standings_tab_active" : ""}`}
                    onClick={() => setContentTab("bracket")}
                  >
                    <FaEye /> Bracket View
                  </button>
                </div>

                {loading || loadingDetails ? (
                  <div className="awards_standings_loading">
                    <div className="awards_standings_spinner"></div>
                    <p>Loading matches...</p>
                  </div>
                ) : error ? (
                  <div className="bracket-error"><p>{error}</p></div>
                ) : (
                  <>
                    {contentTab === "matches" && (
                      <div className="awards_standings_tab_content">
                        {matches.length === 0 ? (
                          <div className="bracket-no-brackets">
                            <p>No matches available for this bracket.</p>
                          </div>
                        ) : (
                          <div className="awards_standings_table_container">
                            <table className="awards_standings_table">
                              <thead>
                                <tr>
                                  <th style={{ fontSize: '15px' }}>Round</th>
                                  {selectedBracket.elimination_type === 'double' && <th style={{ fontSize: '15px' }}>Bracket</th>}
                                  <th style={{ fontSize: '15px' }}>Match</th>
                                  <th style={{ fontSize: '15px' }}>Status</th>
                                  <th style={{ fontSize: '15px' }}>Score</th>
                                  <th style={{ fontSize: '15px' }}>Winner</th>
                                  <th style={{ fontSize: '15px' }}>MVP</th>
                                  <th style={{ fontSize: '15px' }}>Scheduled</th>
                                  <th style={{ textAlign: 'center', width: '120px', fontSize: '15px' }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {matches.map((match) => {
                                  const isResetFinal = match.round_number === 201;
                                  const isChampionship = match.round_number === 200 || match.round_number === 201;
                                  
                                  return (
                                    <tr key={match.id}>
                                      <td style={{ fontWeight: '600', fontSize: '15px' }}>
                                        {formatRoundDisplay(match)}
                                        {isResetFinal && (
                                          <span className="reset-final-badge" style={{ marginLeft: '8px', fontSize: '11px' }}>RESET</span>
                                        )}
                                      </td>
                                      {selectedBracket.elimination_type === 'double' && (
                                        <td>
                                          <span className="bracket-type-badge" style={{ fontSize: '13px' }}>
                                            {match.bracket_type ? match.bracket_type.charAt(0).toUpperCase() + match.bracket_type.slice(1) : 'Winner'}
                                          </span>
                                        </td>
                                      )}
                                      <td style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '15px' }}>
                                        {match.team1_name || "TBD"} vs {match.team2_name || "TBD"}
                                      </td>
                                      <td>{getStatusBadge(match.status)}</td>
                                      <td style={{ fontWeight: '700', fontSize: '17px' }}>
                                        {match.status === "completed" ? (
                                          `${match.score_team1} - ${match.score_team2}`
                                        ) : (
                                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                                        )}
                                      </td>
                                      <td style={{ fontSize: '15px' }}>
                                        {match.winner_name ? (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ color: 'var(--success-color)', fontWeight: '600' }}>
                                              {match.winner_name}
                                            </span>
                                            {isChampionship && <FaCrown style={{ color: '#ffd700', fontSize: '16px' }} />}
                                          </div>
                                        ) : (
                                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                                        )}
                                      </td>
                                      <td style={{ fontSize: '15px' }}>
                                        {match.mvp_name ? (
                                          <span style={{ color: '#fbbf24', fontWeight: '600' }}>{match.mvp_name}</span>
                                        ) : (
                                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                                        )}
                                      </td>
                                      <td style={{ fontSize: '14px' }}>
                                        {match.scheduled_at ? new Date(match.scheduled_at).toLocaleString() : '-'}
                                      </td>
                                      <td>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                          <button
                                            onClick={() => handleInputStats(match)}
                                            className="bracket-view-btn"
                                            style={{ 
                                              fontSize: '13px', 
                                              padding: '8px 12px', 
                                              flex: '1 1 auto', 
                                              minWidth: '50px',
                                              background: match.status === 'completed' ? 'var(--purple-color)' : 'var(--success-color)'
                                            }}
                                            title={match.status === 'completed' ? 'Edit Stats' : 'Input Stats'}
                                          >
                                            <FaChartBar />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {contentTab === "bracket" && (
                      <div className="awards_standings_tab_content">
                        {selectedBracket.elimination_type === 'single' ? (
                          <CustomBracket 
                            matches={bracketMatches} 
                            eliminationType={selectedBracket.elimination_type} 
                          />
                        ) : (
                          <DoubleEliminationBracket 
                            matches={bracketMatches} 
                            eliminationType={selectedBracket.elimination_type} 
                          />
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

export default StaffEvents;