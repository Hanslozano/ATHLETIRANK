import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrophy, FaCrown, FaChartBar, FaEye, FaArrowLeft } from "react-icons/fa";
import CustomBracket from "../../components/CustomBracket";
import DoubleEliminationBracket from "../../components/DoubleEliminationBracket";
import "../../style/Staff_Events.css";

const StaffEvents = ({ sidebarOpen }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [brackets, setBrackets] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedBracket, setSelectedBracket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('matches'); // 'matches' or 'bracket'
  const [bracketMatches, setBracketMatches] = useState([]);

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:5000/api/events");
        const data = await res.json();
        setEvents(data);
        
        if (data.length === 1) {
          handleEventSelect(data[0]);
        }
      } catch (err) {
        setError("Failed to load events");
      } finally {
        setLoading(false);
      }
    };
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
            
            // Fetch brackets for the saved event
            fetch(`http://localhost:5000/api/events/${event.id}/brackets`)
              .then(res => res.json())
              .then(data => {
                setBrackets(data);
                
                if (savedBracket) {
                  const bracket = data.find(b => b.id === savedBracket.id);
                  if (bracket) {
                    handleBracketSelect(bracket);
                  }
                }
              })
              .catch(err => console.error('Error restoring brackets:', err));
          }
          
          // Clear the context after restoring
          sessionStorage.removeItem('staffEventsContext');
        }
      } catch (err) {
        console.error('Error restoring context:', err);
        sessionStorage.removeItem('staffEventsContext');
      }
    }
  }, [events]);

  // Handle event selection
  const handleEventSelect = async (event) => {
    if (!event) return;
    
    setSelectedEvent(event);
    setSelectedBracket(null);
    setMatches([]);
    setViewMode('matches');
    setLoading(true);
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
      setLoading(false);
    }
  };

  // Handle bracket selection
  const handleBracketSelect = async (bracket) => {
    if (!bracket) return;
    
    setSelectedBracket(bracket);
    setViewMode('matches');
    setLoading(true);
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
      setLoading(false);
    }
  };

  // Navigate to bracket view
  const handleViewBracket = () => {
    setViewMode('bracket');
  };

  // Navigate to stats input
  const handleInputStats = (match) => {
    // Store match info in sessionStorage for the stats page
    sessionStorage.setItem('selectedMatchData', JSON.stringify({
      matchId: match.id,
      eventId: selectedEvent?.id,
      bracketId: selectedBracket?.id,
      match: match
    }));
    
    // Store the current selections for return navigation
    sessionStorage.setItem('staffEventsContext', JSON.stringify({
      selectedEvent: selectedEvent,
      selectedBracket: selectedBracket
    }));
    
    // Navigate to stats page using React Router - correct path
    navigate('/StaffDashboard/stats');
  };

  // Back to matches view
  const handleBackToMatches = () => {
    setViewMode('matches');
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
              <span className="round-badge">Round {match.round_number}</span>
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
          {match.winner_name && (
            <p>
              <strong>Winner:</strong>{' '}
              <span className="winner-name">
                {match.winner_name}
                {isChampionship && <FaTrophy className="trophy-icon" />}
              </span>
            </p>
          )}
          {match.scheduled_at && (
            <p>
              <strong>Scheduled:</strong>{' '}
              {new Date(match.scheduled_at).toLocaleString()}
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
            onClick={() => handleInputStats(match)}
            className={`btn-input-stats ${match.status === 'completed' ? 'btn-edit' : ''}`}
          >
            <FaChartBar /> {match.status === 'completed' ? 'Edit Stats' : 'Input Stats'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-dashboard">
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-header">
          <h1>Staff Events</h1>
          <p>View events, brackets, and manage match statistics</p>
        </div>

        <div className="dashboard-main">
          {/* Quick Selectors - Only show when in matches view */}
          {viewMode === 'matches' && (
            <div className="quick-selectors">
              <div className="selector-group">
                <label>Select Event</label>
                <select 
                  value={selectedEvent?.id || ''} 
                  onChange={(e) => {
                    const event = events.find(ev => ev.id === parseInt(e.target.value));
                    handleEventSelect(event);
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
          )}

          {/* Error Message */}
          {error && (
            <div className="bracket-error">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="loading-message">
              Loading...
            </div>
          )}

          {/* Matches View */}
          {!loading && viewMode === 'matches' && selectedBracket && matches.length > 0 && (
            <div className="bracket-content">
              <div className="bracket-view-section">
                <h2>Matches for {selectedBracket.name}</h2>
                <div className="matches-grid">
                  {matches.map((match) => renderMatchCard(match))}
                </div>
              </div>
            </div>
          )}

          {/* Bracket Visualization View */}
          {!loading && viewMode === 'bracket' && selectedBracket && (
            <div className="bracket-content">
              <div className="bracket-view-section">
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
              </div>
            </div>
          )}

          {/* No matches state */}
          {!loading && viewMode === 'matches' && selectedBracket && matches.length === 0 && !error && (
            <div className="bracket-no-brackets">
              <p>No matches available for this bracket.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffEvents;