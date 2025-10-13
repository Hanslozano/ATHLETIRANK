import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrophy, FaCrown, FaChartBar, FaEye, FaArrowLeft } from "react-icons/fa";
import CustomBracket from "../../components/CustomBracket";
import DoubleEliminationBracket from "../../components/DoubleEliminationBracket";
import "../../style/Admin_Events.css";

const AdminEvents = ({ sidebarOpen }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [brackets, setBrackets] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedBracket, setSelectedBracket] = useState(null);
  const [viewMode, setViewMode] = useState('matches');
  const [bracketMatches, setBracketMatches] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

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

  // Fetch events
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("http://localhost:5000/api/events");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Handle event selection to view brackets and matches
  const handleViewEvent = async (event) => {
    setSelectedEvent(event);
    setSelectedBracket(null);
    setMatches([]);
    setViewMode('matches');
    setLoadingDetails(true);
    setError(null);

    try {
      const res = await fetch(`http://localhost:5000/api/events/${event.id}/brackets`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      setBrackets(data);

      if (data.length === 0) {
        setError("No brackets found for this event.");
      } else if (data.length === 1) {
        handleBracketSelect(data[0]);
      }
    } catch (err) {
      setError("Failed to load brackets: " + err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Handle bracket selection
  const handleBracketSelect = async (bracket) => {
    if (!bracket) return;
    
    setSelectedBracket(bracket);
    setViewMode('matches');
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

  // Navigate to bracket view
  const handleViewBracket = () => {
    setViewMode('bracket');
  };

  // Navigate to stats view
  const handleViewStats = (match) => {
    sessionStorage.setItem('selectedMatchData', JSON.stringify({
      matchId: match.id,
      eventId: selectedEvent?.id,
      bracketId: selectedBracket?.id,
      match: match
    }));
    
    sessionStorage.setItem('adminEventsContext', JSON.stringify({
      selectedEvent: selectedEvent,
      selectedBracket: selectedBracket
    }));
    
    navigate('/AdminDashboard/stats');
  };

  // Back to matches view
  const handleBackToMatches = () => {
    setViewMode('matches');
  };

  // Back to events list
  const handleBackToEvents = () => {
    setSelectedEvent(null);
    setSelectedBracket(null);
    setMatches([]);
    setBrackets([]);
  };

  const getStatusBadge = (status) => {
    return <span className={`match-status status-${status}`}>{status}</span>;
  };

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  const renderMatchCard = (match) => {
    const isResetFinal = match.round_number === 201;
    const isChampionship = match.round_number === 200 || match.round_number === 201;
    
    return (
      <div key={match.id} className="match-card">
        <div className="match-header">
          <div className="match-teams">
            <h4>
              {match.team1_name || "TBD"} vs {match.team2_name || "TBD"}
              {isResetFinal && (
                <span className="reset-final-badge">RESET FINAL</span>
              )}
              {match.winner_id && isChampionship && (
                <FaCrown className="champion-icon" title="Tournament Champion" />
              )}
            </h4>
            <div className="match-badges">
              <span className="round-badge">{formatRoundDisplay(match)}</span>
              {selectedBracket?.elimination_type === 'double' && (
                <span className="bracket-type-badge">
                  {match.bracket_type ? match.bracket_type.charAt(0).toUpperCase() + match.bracket_type.slice(1) : 'Winner'} Bracket
                </span>
              )}
              {getStatusBadge(match.status)}
            </div>
          </div>
        </div>

        <div className="match-info">
          {match.status === "completed" && (
            <div className="match-score">
              {match.score_team1} - {match.score_team2}
            </div>
          )}
          {match.scheduled_at && (
            <p>
              <strong>Scheduled:</strong>{' '}
              {new Date(match.scheduled_at).toLocaleString()}
            </p>
          )}
          {match.winner_name && (
            <p>
              <strong>Winner:</strong>{' '}
              <span className="winner-name">
                {match.winner_name}
                {isChampionship && <FaTrophy className="trophy-icon" />}
              </span>
            </p>
          )}
          {match.mvp_name && (
            <p>
              <strong>MVP:</strong>{' '}
              <span className="mvp-name">{match.mvp_name}</span>
            </p>
          )}
        </div>

        <div className="match-actions">
          <button
            onClick={handleViewBracket}
            className="btn-view-bracket"
          >
            <FaEye /> View Bracket
          </button>
          <button
            onClick={() => handleViewStats(match)}
            className="btn-view-stats"
          >
            <FaChartBar /> View Stats
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-dashboard">
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-header">
          <h1>Events</h1>
          <p>View and manage sports events</p>
        </div>

        <div className="dashboard-main">
          <div className="bracket-content">
            {/* Events List */}
            {!selectedEvent && (
              <div className="bracket-view-section">
                <h2>All Events</h2>
                {loading ? (
                  <p>Loading events...</p>
                ) : error ? (
                  <p className="bracket-error">Error: {error}</p>
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
                              {event.archived}
                            </span>
                          </div>
                        </div>
                        <div className="bracket-card-actions">
                          <button className="bracket-view-btn" onClick={() => handleViewEvent(event)}>View Details</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Event Details View */}
            {selectedEvent && (
              <div className="bracket-view-section">
                {/* Quick Selectors - Only show when in matches view */}
                {viewMode === 'matches' && (
                  <>
                
                    
                    <div className="quick-selectors">
                      <div className="selector-group">
                        <label>Select Event</label>
                        <select 
                          value={selectedEvent?.id || ''} 
                          onChange={(e) => {
                            const event = events.find(ev => ev.id === parseInt(e.target.value));
                            handleViewEvent(event);
                          }}
                          className="selector-dropdown"
                        >
                          <option value="">Choose an event...</option>
                          {events.map(e => (
                            <option key={e.id} value={e.id}>
                              {e.name} ({e.status})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {selectedEvent && brackets.length > 0 && (
                        <div className="selector-group">
                          <label>Select Bracket</label>
                          <select 
                            value={selectedBracket?.id || ''} 
                            onChange={(e) => {
                              const bracket = brackets.find(b => b.id === parseInt(e.target.value));
                              handleBracketSelect(bracket);
                            }}
                            className="selector-dropdown"
                          >
                            <option value="">Choose a bracket...</option>
                            {brackets.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.name} ({b.sport_type} - {b.elimination_type})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {selectedEvent && selectedBracket && (
                        <div className="selected-context">
                          <div className="context-item">
                            <div className="context-label">Event</div>
                            <div className="context-value">{selectedEvent.name}</div>
                          </div>
                          <div className="context-divider"></div>
                          <div className="context-item">
                            <div className="context-label">Bracket</div>
                            <div className="context-value">{selectedBracket.name}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Error Message */}
                {error && (
                  <div className="bracket-error">
                    {error}
                  </div>
                )}

                {/* Loading State */}
                {loadingDetails && (
                  <div className="loading-message">
                    Loading...
                  </div>
                )}

                {/* Matches View */}
                {!loadingDetails && viewMode === 'matches' && selectedBracket && matches.length > 0 && (
                  <>
                    <h2>Matches for {selectedBracket.name}</h2>
                    <div className="matches-grid">
                      {matches.map((match) => renderMatchCard(match))}
                    </div>
                  </>
                )}

                {/* Bracket Visualization View */}
                {!loadingDetails && viewMode === 'bracket' && selectedBracket && (
                  <>
                    <div className="bracket-visualization-header">
                      <button onClick={handleBackToMatches} className="back-button">
                        <FaArrowLeft /> Back to Matches
                      </button>
                      <h2>{selectedBracket.name} - Tournament Bracket</h2>
                    </div>
                    <div className="bracket-info">
                      <p><strong>Event:</strong> {selectedEvent?.name}</p>
                      <p><strong>Sport:</strong> {capitalize(selectedBracket.sport_type)}</p>
                      <p><strong>Type:</strong> {selectedBracket.elimination_type === "single" ? "Single" : "Double"} Elimination</p>
                      <p><strong>Teams:</strong> {selectedBracket.team_count || 0}</p>
                    </div>
                    
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
                  </>
                )}

                {/* No matches state */}
                {!loadingDetails && viewMode === 'matches' && selectedBracket && matches.length === 0 && !error && (
                  <div className="bracket-no-brackets">
                    <p>No matches available for this bracket.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEvents;