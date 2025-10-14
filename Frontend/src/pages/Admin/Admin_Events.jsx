import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrophy, FaCrown, FaChartBar, FaEye, FaEdit, FaTrash, FaPlus, FaSave, FaTimes } from "react-icons/fa";
import CustomBracket from "../../components/CustomBracket";
import DoubleEliminationBracket from "../../components/DoubleEliminationBracket";
import "../../style/Admin_Events.css";

const AdminEvents = ({ sidebarOpen }) => {
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
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: '', id: null, name: '' });

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Edit modal state
  const [editModal, setEditModal] = useState({ show: false, event: null });
  const [editingEventName, setEditingEventName] = useState("");
  const [editingStartDate, setEditingStartDate] = useState("");
  const [editingEndDate, setEditingEndDate] = useState("");

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


  useEffect(() => {
  const checkReturnContext = async () => {
    const returnContext = sessionStorage.getItem('adminEventsReturnContext');
    
    if (returnContext) {
      try {
        const { selectedEvent: eventContext, selectedBracket: bracketContext } = JSON.parse(returnContext);
        
        if (eventContext && bracketContext) {
          // Set the selected event and bracket
          setSelectedEvent(eventContext);
          setSelectedBracket(bracketContext);
          setActiveTab("results");
          setContentTab("matches");
          setLoadingDetails(true);
          
          // Load the matches for the bracket
          try {
            const res = await fetch(`http://localhost:5000/api/brackets/${bracketContext.id}/matches`);
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
        }
      } catch (err) {
        console.error("Error loading return context:", err);
      } finally {
        // Clear the return context
        sessionStorage.removeItem('adminEventsReturnContext');
      }
    }
  };
  
  checkReturnContext();
  }, []);
  
  // Check for return context from AdminStats
useEffect(() => {
  const checkReturnContext = async () => {
    const returnContext = sessionStorage.getItem('adminEventsReturnContext');
    
    if (returnContext) {
      try {
        const { selectedEvent: eventContext, selectedBracket: bracketContext } = JSON.parse(returnContext);
        
        if (eventContext && bracketContext) {
          // Set the selected event and bracket
          setSelectedEvent(eventContext);
          setSelectedBracket(bracketContext);
          setActiveTab("results");
          setContentTab("matches");
          setLoadingDetails(true);
          
          // Load the matches for the bracket
          try {
            const res = await fetch(`http://localhost:5000/api/brackets/${bracketContext.id}/matches`);
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
        }
      } catch (err) {
        console.error("Error loading return context:", err);
      } finally {
        // Clear the return context
        sessionStorage.removeItem('adminEventsReturnContext');
      }
    }
  };
  
  checkReturnContext();
}, []);

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

  // Edit handlers
  const handleEditEvent = (event) => {
    setEditModal({ 
      show: true, 
      event: { ...event } 
    });
    setEditingEventName(event.name);
    setEditingStartDate(event.start_date);
    setEditingEndDate(event.end_date);
  };

  const handleEditBracket = (bracket) => {
    console.log("Edit bracket:", bracket);
  };

  const handleEditMatch = (match) => {
    console.log("Edit match:", match);
  };

  // Save edited event
  const saveEventEdit = async () => {
    if (!editingEventName.trim()) {
      alert("Event name cannot be empty");
      return;
    }

    if (!editingStartDate || !editingEndDate) {
      alert("Please select both start and end dates");
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/events/${editModal.event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingEventName,
          start_date: editingStartDate,
          end_date: editingEndDate
        }),
      });

      if (res.ok) {
        const updatedEvent = await res.json();
        
        // Update events state
        setEvents(prev => prev.map(event => 
          event.id === editModal.event.id ? { ...event, ...updatedEvent } : event
        ));

        // Update selected event if it's the one being edited
        if (selectedEvent && selectedEvent.id === editModal.event.id) {
          setSelectedEvent(prev => ({ ...prev, ...updatedEvent }));
        }

        setEditModal({ show: false, event: null });
        setEditingEventName("");
        setEditingStartDate("");
        setEditingEndDate("");
        
        alert("Event updated successfully!");
      } else {
        alert("Error updating event");
      }
    } catch (err) {
      console.error("Error updating event:", err);
      alert("Error updating event");
    }
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditModal({ show: false, event: null });
    setEditingEventName("");
    setEditingStartDate("");
    setEditingEndDate("");
  };

  // Create bracket handler
  const handleCreateBracket = (event) => {
    console.log("Create bracket for event:", event);
  };

  // Delete handlers
  const handleDeleteEvent = (event) => {
    setDeleteConfirm({
      show: true,
      type: 'event',
      id: event.id,
      name: event.name
    });
  };

  const handleDeleteBracket = (bracket) => {
    setDeleteConfirm({
      show: true,
      type: 'bracket',
      id: bracket.id,
      name: bracket.name
    });
  };

  const handleDeleteMatch = (match) => {
    setDeleteConfirm({
      show: true,
      type: 'match',
      id: match.id,
      name: `${match.team1_name || 'TBD'} vs ${match.team2_name || 'TBD'}`
    });
  };

  const confirmDelete = async () => {
    const { type, id } = deleteConfirm;
    
    try {
      let endpoint = '';
      if (type === 'event') endpoint = `http://localhost:5000/api/events/${id}`;
      else if (type === 'bracket') endpoint = `http://localhost:5000/api/brackets/${id}`;
      else if (type === 'match') endpoint = `http://localhost:5000/api/matches/${id}`;

      const res = await fetch(endpoint, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');

      // Refresh data
      if (type === 'event') {
        await fetchEvents();
        setActiveTab("events");
        setSelectedEvent(null);
        setSelectedBracket(null);
      } else if (type === 'bracket') {
        await fetchEvents();
        if (selectedBracket?.id === id) {
          setActiveTab("events");
          setSelectedBracket(null);
        }
      } else if (type === 'match') {
        await handleBracketSelect(selectedEvent, selectedBracket);
      }

      setDeleteConfirm({ show: false, type: '', id: null, name: '' });
    } catch (err) {
      alert(`Failed to delete ${type}: ${err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    return <span className={`match-status status-${status}`}>{status}</span>;
  };

  return (
    <div className="admin-dashboard">
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-header">
          <h1>Events & Matches</h1>
          <p>View and manage sports events, brackets, and matches</p>
        </div>

        <div className="dashboard-main">
          <div className="bracket-content">
            {/* Tabs */}
            <div className="bracket-tabs">
              <button
                className={`bracket-tab-button ${activeTab === "events" ? "bracket-tab-active" : ""}`}
                onClick={() => setActiveTab("events")}
              >
                Manage Events & Brackets
              </button>
              {selectedBracket && (
                <button
                  className={`bracket-tab-button ${activeTab === "results" ? "bracket-tab-active" : ""}`}
                  onClick={() => setActiveTab("results")}
                >
                  {selectedBracket.name} - Manage Matches
                </button>
              )}
            </div>

            {/* Events Selection Tab */}
            {activeTab === "events" && (
              <div className="bracket-view-section">
                {/* Search Container - Same design as Teams Page */}
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
                  <button 
                    className="awards_standings_export_btn" 
                    onClick={() => console.log('Create new event')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <FaPlus /> Create Event
                  </button>
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
                      <>
                        <p>No events found. Create an event first to view matches.</p>
                        <button 
                          className="bracket-view-btn" 
                          onClick={() => console.log('Create new event')}
                        >
                          Create Event
                        </button>
                      </>
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
                          <th style={{ textAlign: 'center', width: '240px', fontSize: '15px' }}>Actions</th>
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
                                    {idx === 0 && (
                                      <>
                                        <button
                                          onClick={() => handleEditEvent(event)}
                                          className="bracket-view-btn"
                                          style={{ fontSize: '13px', padding: '8px 14px', background: 'var(--purple-color)', flex: '1 1 auto', minWidth: '55px' }}
                                          title="Edit Event"
                                        >
                                          <FaEdit />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteEvent(event)}
                                          className="bracket-view-btn"
                                          style={{ fontSize: '13px', padding: '8px 14px', background: 'var(--error-color)', flex: '1 1 auto', minWidth: '55px' }}
                                          title="Delete Event"
                                        >
                                          <FaTrash />
                                        </button>
                                      </>
                                    )}
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
                              <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>
                                No brackets available for this event
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                  <button
                                    onClick={() => handleEditEvent(event)}
                                    className="bracket-view-btn"
                                    style={{ fontSize: '13px', padding: '8px 14px', background: 'var(--purple-color)', flex: '1 1 auto', minWidth: '55px' }}
                                    title="Edit Event"
                                  >
                                    <FaEdit />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEvent(event)}
                                    className="bracket-view-btn"
                                    style={{ fontSize: '13px', padding: '8px 14px', background: 'var(--error-color)', flex: '1 1 auto', minWidth: '55px' }}
                                    title="Delete Event"
                                  >
                                    <FaTrash />
                                  </button>
                                  <button
                                    onClick={() => handleCreateBracket(event)}
                                    className="bracket-view-btn"
                                    style={{ fontSize: '13px', padding: '8px 14px', background: 'var(--success-color)', flex: '1 1 auto', minWidth: '55px' }}
                                    title="Create Bracket"
                                  >
                                    <FaPlus />
                                  </button>
                                </div>
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
                    <FaChartBar /> Manage Matches
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
                                  <th style={{ textAlign: 'center', width: '180px', fontSize: '15px' }}>Actions</th>
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
                                            onClick={() => handleViewStats(match)}
                                            className="bracket-view-btn"
                                            style={{ fontSize: '13px', padding: '8px 12px', flex: '1 1 auto', minWidth: '50px' }}
                                            title="View Stats"
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
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '24px' }}>
                          <button
                            onClick={() => handleEditBracket(selectedBracket)}
                            style={{ 
                              fontSize: '13px', 
                              padding: '10px 16px', 
                              background: 'var(--purple-color)', 
                              color: 'white',
                              border: 'none',
                              borderRadius: 'var(--border-radius)',
                              cursor: 'pointer',
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '8px', 
                              width: 'auto',
                              whiteSpace: 'nowrap',
                              transition: 'var(--transition)'
                            }}
                            title="Edit Bracket"
                          >
                            <FaEdit /> Edit Bracket
                          </button>
                          <button
                            onClick={() => handleDeleteBracket(selectedBracket)}
                            style={{ 
                              fontSize: '13px', 
                              padding: '10px 16px', 
                              background: 'var(--error-color)', 
                              color: 'white',
                              border: 'none',
                              borderRadius: 'var(--border-radius)',
                              cursor: 'pointer',
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '8px', 
                              width: 'auto',
                              whiteSpace: 'nowrap',
                              transition: 'var(--transition)'
                            }}
                            title="Delete Bracket"
                          >
                            <FaTrash /> Delete Bracket
                          </button>
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
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Event Modal - Similar to Teams Page Modal */}
      {editModal.show && editModal.event && (
        <div className="admin-teams-modal-overlay" onClick={closeEditModal}>
          <div className="admin-teams-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="admin-teams-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <h2 style={{ margin: 0 }}>Edit Event</h2>
              </div>
              <button onClick={closeEditModal} className="admin-teams-modal-close">
                <FaTimes />
              </button>
            </div>
            
            <div className="admin-teams-modal-body">
              <div className="admin-teams-form-group" style={{ marginBottom: '20px' }}>
                <label htmlFor="eventName">Event Name *</label>
                <input
                  type="text"
                  id="eventName"
                  value={editingEventName}
                  onChange={(e) => setEditingEventName(e.target.value)}
                  placeholder="Enter event name"
                  className="admin-teams-modal-name-input"
                  style={{ width: '100%', marginTop: '8px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div className="admin-teams-form-group">
                  <label htmlFor="startDate">Start Date *</label>
                  <input
                    type="date"
                    id="startDate"
                    value={editingStartDate}
                    onChange={(e) => setEditingStartDate(e.target.value)}
                    className="admin-teams-form-group input"
                    style={{ width: '100%', marginTop: '8px', padding: '12px' }}
                  />
                </div>

                <div className="admin-teams-form-group">
                  <label htmlFor="endDate">End Date *</label>
                  <input
                    type="date"
                    id="endDate"
                    value={editingEndDate}
                    onChange={(e) => setEditingEndDate(e.target.value)}
                    className="admin-teams-form-group input"
                    style={{ width: '100%', marginTop: '8px', padding: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px' }}>
                <button
                  onClick={closeEditModal}
                  className="admin-teams-cancel-btn"
                  style={{ padding: '12px 24px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveEventEdit}
                  className="admin-teams-submit-btn"
                  style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <FaSave /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'var(--background-card)',
            border: '2px solid var(--error-color)',
            borderRadius: 'var(--border-radius-lg)',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: 'var(--shadow-large)'
          }}>
            <h3 style={{ color: 'var(--error-color)', marginBottom: '16px', fontSize: '24px' }}>
              Confirm Delete
            </h3>
            <p style={{ color: 'var(--text-primary)', marginBottom: '24px', fontSize: '16px' }}>
              Are you sure you want to delete this {deleteConfirm.type}?
            </p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px', fontWeight: '600' }}>
              "{deleteConfirm.name}"
            </p>
            <p style={{ color: 'var(--warning-color)', marginBottom: '24px', fontSize: '14px' }}>
              ⚠️ This action cannot be undone!
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm({ show: false, type: '', id: null, name: '' })}
                className="bracket-view-btn"
                style={{ background: 'var(--text-muted)', padding: '10px 20px' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="bracket-view-btn"
                style={{ background: 'var(--error-color)', padding: '10px 20px' }}
              >
                <FaTrash /> Delete {deleteConfirm.type}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEvents;