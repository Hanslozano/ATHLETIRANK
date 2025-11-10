import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrophy, FaCrown, FaChartBar, FaEye } from "react-icons/fa";
import CustomBracket from "../../components/CustomBracket";
import DoubleEliminationBracket from "../../components/DoubleEliminationBracket";
import TournamentScheduleList from "../../components/TournamentScheduleList";
import RoundRobinBracketDisplay from "../../components/RoundRobin";
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
  const [bracketViewType, setBracketViewType] = useState("bracket"); // Default to "bracket" for staff

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

// Restore context when returning from Stats page or Dashboard
    useEffect(() => {
      const storedContext = sessionStorage.getItem('staffEventsContext');
      
      if (storedContext) {
        try {
          const { 
            selectedEvent: savedEvent, 
            selectedBracket: savedBracket,
            bracketViewType: savedViewType,
            activeTab: savedTab
          } = JSON.parse(storedContext);
          
          if (savedEvent && events.length > 0) {
            const event = events.find(e => e.id === savedEvent.id);
            
            if (event) {
              // If coming from dashboard with just an event (no bracket selected)
              if (savedTab === 'events' && !savedBracket) {
                // Check if event has brackets
                if (event.brackets && event.brackets.length > 0) {
                  // Auto-select the first bracket and show its matches
                  const firstBracket = event.brackets[0];
                  handleBracketSelect(event, firstBracket);
                } else {
                  // No brackets available, just show the events list
                  setSelectedEvent(event);
                  setActiveTab('events');
                  setTimeout(() => {
                    const element = document.querySelector('.awards_standings_table_container');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 100);
                }
              } else if (savedBracket) {
                // Coming from stats page with a specific bracket selected
                const bracket = event.brackets?.find(b => b.id === savedBracket.id);
                if (bracket) {
                  setSelectedEvent(event);
                  
                  if (savedViewType) {
                    setBracketViewType(savedViewType);
                  }
                  
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
    setBracketViewType("bracket"); // Default to bracket view for staff
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

  // Navigate to stats input (for editing)
  const handleInputStats = (match) => {
    sessionStorage.setItem('selectedMatchData', JSON.stringify({
      matchId: match.id,
      eventId: selectedEvent?.id,
      bracketId: selectedBracket?.id,
      match: match
    }));
    
    // Save current context including view type
    sessionStorage.setItem('staffEventsContext', JSON.stringify({
      selectedEvent: selectedEvent,
      selectedBracket: selectedBracket,
      bracketViewType: bracketViewType
    }));
    
    navigate('/StaffDashboard/stats');
  };

  // Navigate to stats view (view-only mode for staff)
  const handleViewStats = (match) => {
    sessionStorage.setItem('selectedMatchData', JSON.stringify({
      matchId: match.id,
      eventId: selectedEvent?.id,
      bracketId: selectedBracket?.id,
      match: match,
      viewOnly: true // Flag to indicate view-only mode
    }));
    
    // Save current context including view type
    sessionStorage.setItem('staffEventsContext', JSON.stringify({
      selectedEvent: selectedEvent,
      selectedBracket: selectedBracket,
      bracketViewType: bracketViewType
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
           <div className="bracket-breadcrumb">
            <button
              className={`breadcrumb-item ${!selectedBracket ? "active" : ""}`}
              onClick={() => {
                setActiveTab("events");
                setSelectedBracket(null);
                setSelectedEvent(null);
              }}
            >
              Select Events & Brackets
            </button>
            {selectedBracket && (
              <>
                <span className="breadcrumb-separator">›</span>
                <span className="breadcrumb-item active">
                  {selectedBracket.name}
                </span>
              </>
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
  {bracket.elimination_type === 'double' 
    ? 'Double Elim.' 
    : bracket.elimination_type === 'round_robin'
      ? 'Round Robin'
      : 'Single Elim.'}
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
                  <h2>{selectedBracket.name}</h2>
                  <div className="event-details-info">
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
                    <FaChartBar /> Live Match Scoring
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
                        {/* View Type Selector */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '24px',
                          flexWrap: 'wrap',
                          gap: '16px'
                        }}>
                          {/* View Toggle Buttons */}
                          <div style={{ 
                            display: 'flex', 
                            gap: '12px',
                            background: 'rgba(51, 65, 85, 0.5)',
                            padding: '6px',
                            borderRadius: '8px',
                            border: '1px solid #334155'
                          }}>
                            <button
                              onClick={() => setBracketViewType("bracket")}
                              style={{
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                background: bracketViewType === "bracket" ? '#3b82f6' : 'transparent',
                                color: bracketViewType === "bracket" ? '#ffffff' : '#cbd5e1',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <FaEye /> Bracket View
                            </button>
                            <button
                              onClick={() => setBracketViewType("list")}
                              style={{
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                background: bracketViewType === "list" ? '#3b82f6' : 'transparent',
                                color: bracketViewType === "list" ? '#ffffff' : '#cbd5e1',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <FaChartBar /> List View
                            </button>
                          </div>
                        </div>

                        {/* Conditional Rendering Based on View Type */}
                           {bracketViewType === "bracket" ? (
  // UPDATED: Handle all three bracket types
  <>
    {selectedBracket.elimination_type === 'single' && (
      <CustomBracket
        matches={bracketMatches}
        eliminationType={selectedBracket.elimination_type}
      />
    )}
    
    {selectedBracket.elimination_type === 'double' && (
      <DoubleEliminationBracket
        matches={bracketMatches}
        eliminationType={selectedBracket.elimination_type}
      />
    )}
    
    {selectedBracket.elimination_type === 'round_robin' && (
      <RoundRobinBracketDisplay
        matches={bracketMatches}
      />
    )}
  </>
) : (
   <TournamentScheduleList
    matches={bracketMatches}
    eventId={selectedEvent?.id}
    bracketId={selectedBracket?.id}
    onViewStats={(match) => handleViewStats(match)}
    onInputStats={(match) => handleInputStats(match)}
    onRefresh={async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/brackets/${selectedBracket.id}/matches`);
        if (res.ok) {
          const data = await res.json();
          const visibleMatches = data.filter(match => match.status !== 'hidden');
          setMatches(visibleMatches);
          setBracketMatches(visibleMatches);
        }
      } catch (err) {
        console.error('Error refreshing matches:', err);
      }
    }}
    isStaffView={true}
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