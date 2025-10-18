import React, { useState, useEffect } from "react";
import { FaCheckCircle, FaChevronRight, FaChevronLeft, FaSearch, FaPlus, FaTrash, FaChevronDown, FaChevronUp } from "react-icons/fa";
import "../../style/Admin_Events.css";
import "../../style/Admin_TeamPage.css";
import "../../style/Admin_BracketPage.css";

const TournamentCreator = ({ sidebarOpen }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  
  // Step 1: Event Data
  const [eventData, setEventData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    numberOfBrackets: 1
  });
  const [createdEvent, setCreatedEvent] = useState(null);

  // Step 2: Teams Data
  const [teams, setTeams] = useState([]);
  const [teamMode, setTeamMode] = useState("create");
  const [sportFilter, setSportFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTeam, setCurrentTeam] = useState({
    teamName: "",
    sport: "",
    players: []
  });
  const [createdTeams, setCreatedTeams] = useState([]);
  const [teamBracketAssignments, setTeamBracketAssignments] = useState({});

  // Step 3: Multiple Brackets Data
  const [brackets, setBrackets] = useState([]);
  const [createdBrackets, setCreatedBrackets] = useState([]);

  // NEW: State for expanded team details in Step 3
  const [expandedTeams, setExpandedTeams] = useState({});

  // Position options
  const positions = {
    Basketball: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
    Volleyball: ["Setter", "Outside Hitter", "Middle Blocker", "Opposite Hitter", "Libero", "Defensive Specialist"],
  };

  // Validation functions
  const isValidPlayerName = (name) => {
    const trimmed = name.trim();
    return /^[a-zA-Z\s-]+$/.test(trimmed) && trimmed.length > 0;
  };

  const isValidJerseyNumber = (jersey) => {
    const trimmed = jersey.trim();
    return /^\d+$/.test(trimmed) && trimmed.length > 0;
  };

  // Fetch existing teams
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/teams");
        const data = await res.json();
        setTeams(data);
      } catch (err) {
        console.error("Error fetching teams:", err);
      }
    };
    fetchTeams();
  }, []);

  // Initialize brackets when moving to step 3 and pre-assign teams
  useEffect(() => {
    if (currentStep === 3) {
      const initialBrackets = Array.from({ length: eventData.numberOfBrackets }, (_, index) => ({
        id: `bracket-${index + 1}`,
        bracketName: "",
        bracketType: "single",
        sport: "",
        selectedTeamIds: []
      }));
      
      console.log("Team Bracket Assignments:", teamBracketAssignments);
      console.log("Created Teams:", createdTeams);
      
      // Pre-assign teams to brackets based on teamBracketAssignments
      const updatedBrackets = initialBrackets.map(bracket => {
        let assignedTeamIds = Object.entries(teamBracketAssignments)
          .filter(([teamId, bracketId]) => bracketId === bracket.id)
          .map(([teamId]) => teamId);
        
        // SPECIAL CASE: If only 1 bracket and no assignments, assign ALL teams to bracket-1
        if (eventData.numberOfBrackets === 1 && bracket.id === 'bracket-1' && assignedTeamIds.length === 0) {
          assignedTeamIds = createdTeams.map(t => String(t.id));
          console.log(`Single bracket mode - Auto-assigning all ${assignedTeamIds.length} teams to bracket-1`);
        }
        
        console.log(`Bracket ${bracket.id} - Assigned Team IDs:`, assignedTeamIds);
        
        // AUTO-DETECT SPORT: If teams are assigned, get the sport from the first team
        let detectedSport = "";
        if (assignedTeamIds.length > 0) {
          // Try to find team by both string and number ID
          const firstTeam = createdTeams.find(t => 
            String(t.id) === String(assignedTeamIds[0]) || 
            Number(t.id) === Number(assignedTeamIds[0])
          );
          if (firstTeam) {
            detectedSport = firstTeam.sport;
            console.log(`Bracket ${bracket.id} - Detected Sport:`, detectedSport);
          }
        }
        
        return {
          ...bracket,
          sport: detectedSport,
          selectedTeamIds: assignedTeamIds
        };
      });
      
      console.log("Final Updated Brackets:", updatedBrackets);
      setBrackets(updatedBrackets);
    }
  }, [currentStep, eventData.numberOfBrackets, teamBracketAssignments, createdTeams]);

  // NEW: Toggle team details expansion
  const toggleTeamDetails = (teamId) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  // Step 1: Event Creation
  const handleEventInputChange = (e) => {
    const { name, value } = e.target;
    setEventData(prev => ({ 
      ...prev, 
      [name]: name === 'numberOfBrackets' ? parseInt(value) : value 
    }));
    if (validationError) setValidationError("");
  };

  const handleCreateEvent = async () => {
    if (!eventData.name.trim() || !eventData.startDate || !eventData.endDate) {
      setValidationError("Please fill in all event fields.");
      return;
    }

    if (eventData.numberOfBrackets < 1 || eventData.numberOfBrackets > 5) {
      setValidationError("Number of brackets must be between 1 and 5.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: eventData.name,
          start_date: eventData.startDate,
          end_date: eventData.endDate
        })
      });
      
      if (res.ok) {
        const response = await res.json();
        const newEvent = {
          id: response.id || response.eventId,
          name: eventData.name,
          start_date: eventData.startDate,
          end_date: eventData.endDate
        };
        
        setCreatedEvent(newEvent);
        setCurrentStep(2);
        setValidationError("");
      } else {
        const error = await res.json();
        setValidationError(error.message || "Failed to create event");
      }
    } catch (err) {
      console.error("Error creating event:", err);
      setValidationError("Error creating event");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Team Creation
  const handleTeamInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentTeam(prev => ({ ...prev, [name]: value }));

    // When sport is selected, create exactly 12 empty player slots
    if (name === "sport" && value) {
      setCurrentTeam(prev => ({
        ...prev,
        players: Array.from({ length: 12 }, (_, index) => ({ 
          name: "", 
          position: "", 
          jerseyNumber: "" 
        }))
      }));
    }
    
    if (validationError) setValidationError("");
  };

  const handlePlayerChange = (index, field, value) => {
    let finalValue = value;
    
    // For player names: remove any non-letter, non-space, non-hyphen characters
    if (field === "name") {
      finalValue = value.replace(/[^a-zA-Z\s-]/g, '');
    }
    
    // For jersey numbers: remove any non-digit characters
    if (field === "jerseyNumber") {
      finalValue = value.replace(/[^0-9]/g, '');
    }
    
    // Trim whitespace from name and jersey number
    if (field === "name" || field === "jerseyNumber") {
      finalValue = finalValue.trim();
    }
    
    const newPlayers = [...currentTeam.players];
    newPlayers[index][field] = finalValue;
    setCurrentTeam(prev => ({ ...prev, players: newPlayers }));
  };

  // Add new player (up to 15 maximum)
  const handleAddPlayer = () => {
    if (currentTeam.players.length < 15) {
      setCurrentTeam(prev => ({
        ...prev,
        players: [...prev.players, { name: "", position: "", jerseyNumber: "" }]
      }));
    }
  };

  // Remove player (minimum 12 players required)
  const handleRemovePlayer = (index) => {
    if (currentTeam.players.length > 12) {
      const newPlayers = [...currentTeam.players];
      newPlayers.splice(index, 1);
      setCurrentTeam(prev => ({ ...prev, players: newPlayers }));
    }
  };

  const validateTeam = () => {
    if (!currentTeam.teamName.trim()) return "Please enter a team name";
    if (!currentTeam.sport) return "Please select a sport";
    
    // Check if we have between 12-15 players
    const validPlayers = currentTeam.players.filter(p => 
      p.name.trim() && p.position && p.jerseyNumber.trim()
    );
    
    if (validPlayers.length < 12) {
      return `Minimum 12 players required. Currently you have ${validPlayers.length} valid players.`;
    }

    if (validPlayers.length > 15) {
      return `Maximum 15 players allowed. Currently you have ${validPlayers.length} valid players.`;
    }
    
    // Check for invalid player names (must be letters only)
    const invalidNames = currentTeam.players.filter(p => {
      if (!p.name.trim()) return false;
      return !isValidPlayerName(p.name);
    });
    if (invalidNames.length > 0) {
      return "Player names must contain only letters and spaces. Please check all player names.";
    }
    
    // Check for invalid jersey numbers (must be numbers only)
    const invalidJerseys = currentTeam.players.filter(p => {
      if (!p.jerseyNumber.trim()) return false;
      return !isValidJerseyNumber(p.jerseyNumber);
    });
    if (invalidJerseys.length > 0) {
      return "Jersey numbers must contain only numbers. Please check all jersey numbers.";
    }
    
    // Check for duplicate jersey numbers
    const jerseyNumbers = validPlayers.map(p => p.jerseyNumber.trim());
    const uniqueJerseyNumbers = new Set(jerseyNumbers);
    if (jerseyNumbers.length !== uniqueJerseyNumbers.size) {
      return "Duplicate jersey numbers found. Each player must have a unique jersey number.";
    }
    
    // Check for duplicate player names
    const playerNames = validPlayers.map(p => p.name.trim().toLowerCase());
    const uniquePlayerNames = new Set(playerNames);
    if (playerNames.length !== uniquePlayerNames.size) {
      return "Duplicate player names found. Each player must have a unique name.";
    }
    
    // Check for blank spaces in names
    const hasBlankNames = currentTeam.players.some(p => p.name.trim() === "");
    if (hasBlankNames) {
      return "All players must have names. Please fill in all player names.";
    }
    
    // Check for blank jersey numbers
    const hasBlankJerseyNumbers = currentTeam.players.some(p => p.jerseyNumber.trim() === "");
    if (hasBlankJerseyNumbers) {
      return "All players must have jersey numbers. Please fill in all jersey numbers.";
    }
    
    return null;
  };

  const handleAddTeam = async () => {
    const error = validateTeam();
    if (error) {
      setValidationError(error);
      return;
    }

    // Trim all player data before submitting
    const trimmedPlayers = currentTeam.players.map(player => ({
      name: player.name.trim(),
      position: player.position,
      jerseyNumber: player.jerseyNumber.trim()
    }));

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: currentTeam.teamName.trim(),
          sport: currentTeam.sport,
          players: trimmedPlayers
        })
      });
      
      if (res.ok) {
        const newTeam = await res.json();
        setCreatedTeams(prev => [...prev, newTeam]);
        setCurrentTeam({ teamName: "", sport: "", players: [] });
        setValidationError("");
      } else {
        setValidationError("Failed to create team");
      }
    } catch (err) {
      console.error("Error creating team:", err);
      setValidationError("Error creating team");
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToBracket = () => {
    if (createdTeams.length < 2) {
      setValidationError("You need at least 2 teams to create brackets");
      return;
    }
    // Reset brackets state to force re-initialization with new teams
    setBrackets([]);
    setCurrentStep(3);
    setValidationError("");
  };

  // Handle selecting existing team with bracket assignment
  const handleSelectExistingTeam = (teamId, bracketId = null) => {
    const team = teams.find(t => t.id === teamId);
    if (team && !createdTeams.find(t => t.id === team.id)) {
      setCreatedTeams(prev => [...prev, team]);
      
      // If bracketId is provided, assign the team to that bracket
      if (bracketId) {
        setTeamBracketAssignments(prev => ({
          ...prev,
          [teamId]: bracketId
        }));
      }
      
      setValidationError("");
    }
  };

  // Handle bracket assignment for existing teams
  const handleAssignTeamToBracket = (teamId, bracketId) => {
    setTeamBracketAssignments(prev => ({
      ...prev,
      [teamId]: bracketId
    }));
  };

  // Handle removing team assignment
  const handleRemoveTeamAssignment = (teamId) => {
    setTeamBracketAssignments(prev => {
      const newAssignments = { ...prev };
      delete newAssignments[teamId];
      return newAssignments;
    });
  };

  const handleRemoveTeam = (teamId) => {
    setCreatedTeams(prev => prev.filter(t => t.id !== teamId));
    handleRemoveTeamAssignment(teamId);
  };

  const getFilteredTeams = () => {
    let filtered = teams.filter(team => !createdTeams.find(ct => ct.id === team.id));
    
    if (sportFilter !== "all") {
      filtered = filtered.filter(team => team.sport.toLowerCase() === sportFilter.toLowerCase());
    }
    
    if (searchTerm.trim()) {
      filtered = filtered.filter(team => 
        team.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  // Get bracket options for team assignment
  const getBracketOptions = () => {
    return Array.from({ length: eventData.numberOfBrackets }, (_, index) => ({
      id: `bracket-${index + 1}`,
      name: `Bracket ${index + 1}`
    }));
  };

  // Get assigned bracket name for a team
  const getAssignedBracketName = (teamId) => {
    const bracketId = teamBracketAssignments[teamId];
    if (!bracketId) return "Not assigned";
    
    const bracketNumber = bracketId.split('-')[1];
    return `Bracket ${bracketNumber}`;
  };

  // Step 3: Multiple Brackets Creation
  const handleBracketInputChange = (bracketId, field, value) => {
    setBrackets(prev => prev.map(bracket => 
      bracket.id === bracketId 
        ? { ...bracket, [field]: value }
        : bracket
    ));
    if (validationError) setValidationError("");
  };

  const handleTeamSelectionForBracket = (bracketId, teamId) => {
    setBrackets(prev => prev.map(bracket => {
      if (bracket.id === bracketId) {
        const isSelected = bracket.selectedTeamIds.includes(teamId);
        return {
          ...bracket,
          selectedTeamIds: isSelected
            ? bracket.selectedTeamIds.filter(id => id !== teamId)
            : [...bracket.selectedTeamIds, teamId]
        };
      }
      return bracket;
    }));
  };

  const getAvailableTeamsForBracket = (bracketId) => {
    const currentBracket = brackets.find(b => b.id === bracketId);
    if (!currentBracket) return [];

    // If no sport selected yet, return empty
    if (!currentBracket.sport) return [];

    const otherBracketsTeams = brackets
      .filter(b => b.id !== bracketId)
      .flatMap(b => b.selectedTeamIds);

    // Return teams that match the sport AND (are not in other brackets OR are already selected in this bracket)
    return createdTeams.filter(team => 
      team.sport.toLowerCase() === currentBracket.sport.toLowerCase() &&
      (!otherBracketsTeams.includes(team.id) || currentBracket.selectedTeamIds.includes(team.id))
    );
  };

  const handleCreateAllBrackets = async () => {
    console.log("=== CREATING MULTIPLE BRACKETS ===");
    
    if (!createdEvent || !createdEvent.id) {
      setValidationError("Event information is missing. Please go back to Step 1.");
      return;
    }

    // Validate all brackets
    for (let i = 0; i < brackets.length; i++) {
      const bracket = brackets[i];
      console.log(`Validating Bracket ${i + 1}:`, bracket);
      
      if (!bracket.sport || bracket.sport.trim() === '') {
        setValidationError(`Bracket ${i + 1}: Please select a sport.`);
        return;
      }
      if (bracket.selectedTeamIds.length < 2) {
        setValidationError(`Bracket ${i + 1}: Please select at least 2 teams.`);
        return;
      }
      if (!bracket.bracketType) {
        setValidationError(`Bracket ${i + 1}: Please select a bracket type.`);
        return;
      }
    }

    setLoading(true);
    const createdBracketsList = [];

    try {
      for (let i = 0; i < brackets.length; i++) {
        const bracket = brackets[i];
        const sportType = bracket.sport.toLowerCase();
        const bracketName = bracket.bracketName || 
          `${createdEvent.name} - ${capitalize(bracket.sport)} Bracket`;
        
        const requestBody = {
          event_id: createdEvent.id,
          name: bracketName,
          sport_type: sportType,
          elimination_type: bracket.bracketType
        };

        console.log(`Creating bracket ${i + 1}:`, requestBody);
        
        const bracketRes = await fetch("http://localhost:5000/api/brackets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        });

        if (!bracketRes.ok) {
          const errorData = await bracketRes.json();
          throw new Error(`Bracket ${i + 1}: ${errorData.error || "Failed to create bracket"}`);
        }

        const newBracket = await bracketRes.json();
        console.log(`Bracket ${i + 1} created:`, newBracket);

        // Add teams to bracket
        for (let team_id of bracket.selectedTeamIds) {
          await fetch("http://localhost:5000/api/bracketTeams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bracket_id: newBracket.id,
              team_id
            })
          });
        }

        // Generate matches
        const generateRes = await fetch(`http://localhost:5000/api/brackets/${newBracket.id}/generate`, {
          method: "POST"
        });

        if (!generateRes.ok) {
          const errorData = await generateRes.json();
          throw new Error(`Bracket ${i + 1}: ${errorData.error || "Failed to generate matches"}`);
        }

        createdBracketsList.push({
          ...newBracket,
          selectedTeams: bracket.selectedTeamIds.length
        });
      }

      setCreatedBrackets(createdBracketsList);
      setCurrentStep(4);
      setValidationError("");
    } catch (err) {
      console.error("Error creating brackets:", err);
      setValidationError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNew = () => {
    setCurrentStep(1);
    setEventData({ name: "", startDate: "", endDate: "", numberOfBrackets: 1 });
    setCreatedEvent(null);
    setCurrentTeam({ teamName: "", sport: "", players: [] });
    setCreatedTeams([]);
    setTeamBracketAssignments({});
    setBrackets([]);
    setCreatedBrackets([]);
    setExpandedTeams({});
    setValidationError("");
  };

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  // Calculate valid player count (12-15 must be valid)
  const validPlayerCount = currentTeam.players.filter(p => 
    p.name.trim() && p.position && p.jerseyNumber.trim()
  ).length;

  return (
    <div className="admin-dashboard">
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-header">
          <h1>Create Tournament</h1>
          <p>Complete tournament setup in 3 easy steps</p>
        </div>

        <div className="dashboard-main">
          <div className="bracket-content">
            {/* Progress Steps */}
            <div className="tournament-progress">
              <div className={`progress-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
                <div className="step-circle">
                  {currentStep > 1 ? <FaCheckCircle /> : "1"}
                </div>
                <div className="step-label">Create Event</div>
              </div>
              <div className="progress-line"></div>
              <div className={`progress-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
                <div className="step-circle">
                  {currentStep > 2 ? <FaCheckCircle /> : "2"}
                </div>
                <div className="step-label">Add Teams</div>
              </div>
              <div className="progress-line"></div>
              <div className={`progress-step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
                <div className="step-circle">
                  {currentStep > 3 ? <FaCheckCircle /> : "3"}
                </div>
                <div className="step-label">Create Brackets</div>
              </div>
            </div>

            {/* Validation Message */}
            {validationError && (
              <div className={`admin-teams-validation-message ${validationError.includes("successfully") ? "admin-teams-success" : "admin-teams-error"}`}>
                {validationError}
                <button 
                  className="admin-teams-close-message"
                  onClick={() => setValidationError("")}
                >
                  ×
                </button>
              </div>
            )}

            {/* Step 1: Create Event */}
            {currentStep === 1 && (
              <div className="bracket-create-section">
                <div className="bracket-form-container">
                  <h2>Step 1: Create Event</h2>
                  <p className="step-description">Set up your tournament event details</p>
                  
                  <div className="bracket-form">
                    <div className="bracket-form-group">
                      <label htmlFor="name">Event Name *</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={eventData.name}
                        onChange={handleEventInputChange}
                        placeholder="Enter event name"
                        required
                      />
                    </div>

                    <div className="bracket-form-group">
                      <label htmlFor="startDate">Start Date *</label>
                      <input
                        type="date"
                        id="startDate"
                        name="startDate"
                        value={eventData.startDate}
                        onChange={handleEventInputChange}
                        required
                      />
                    </div>

                    <div className="bracket-form-group">
                      <label htmlFor="endDate">End Date *</label>
                      <input
                        type="date"
                        id="endDate"
                        name="endDate"
                        value={eventData.endDate}
                        onChange={handleEventInputChange}
                        required
                      />
                    </div>

                    <div className="bracket-form-group">
                      <label htmlFor="numberOfBrackets">Number of Brackets *</label>
                      <select
                        id="numberOfBrackets"
                        name="numberOfBrackets"
                        value={eventData.numberOfBrackets}
                        onChange={handleEventInputChange}
                        required
                      >
                        <option value={1}>1 Bracket</option>
                        <option value={2}>2 Brackets</option>
                        <option value={3}>3 Brackets</option>
                        <option value={4}>4 Brackets</option>
                        <option value={5}>5 Brackets</option>
                      </select>
                      <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                        You can create up to 5 brackets per event (e.g., Men's Basketball, Women's Basketball, etc.)
                      </small>
                    </div>

                    <div className="bracket-form-actions">
                      <button 
                        onClick={handleCreateEvent}
                        className="bracket-submit-btn"
                        disabled={loading}
                      >
                        {loading ? "Creating..." : "Create Event & Continue"}
                        <FaChevronRight style={{ marginLeft: '8px' }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Add Teams */}
            {currentStep === 2 && (
              <div className="bracket-create-section">
                <div className="bracket-form-container">
                  <h2>Step 2: Add Teams</h2>
                  <p className="step-description">
                    Create new teams or select from existing teams (minimum 2 teams required)
                    {eventData.numberOfBrackets > 1 && (
                      <span style={{color: '#fbbf24', display: 'block', marginTop: '5px'}}>
                        You can assign teams to specific brackets in the next step
                      </span>
                    )}
                  </p>
                  
                  {/* Team Mode Toggle */}
                  <div className="team-mode-toggle">
                    <button
                      className={`mode-toggle-btn ${teamMode === "create" ? "active" : ""}`}
                      onClick={() => setTeamMode("create")}
                    >
                      Create New Team
                    </button>
                    <button
                      className={`mode-toggle-btn ${teamMode === "select" ? "active" : ""}`}
                      onClick={() => setTeamMode("select")}
                    >
                      Select Existing Team
                    </button>
                  </div>

                  {/* Created/Selected Teams Summary */}
                  {createdTeams.length > 0 && (
                    <div className="created-teams-summary">
                      <h3>Selected Teams ({createdTeams.length})</h3>
                      <div className="teams-summary-grid">
                        {createdTeams.map(team => (
                          <div key={team.id} className="team-summary-card">
                            <div className="team-summary-content">
                              <div className="team-info-top">
                                <strong>{team.name}</strong>
                                <button
                                  className="remove-team-btn"
                                  onClick={() => handleRemoveTeam(team.id)}
                                  title="Remove team"
                                >
                                  ×
                                </button>
                              </div>
                              <span className={`admin-teams-sport-badge admin-teams-sport-${team.sport.toLowerCase()}`}>
                                {capitalize(team.sport)}
                              </span>
                              <span>{team.players?.length || 0} players</span>
                              {/* Bracket Assignment Dropdown */}
                              {eventData.numberOfBrackets > 1 && (
                                <select
                                  value={teamBracketAssignments[team.id] || ""}
                                  onChange={(e) => handleAssignTeamToBracket(team.id, e.target.value)}
                                  className="bracket-assignment-select"
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    marginTop: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: '#1a2332',
                                    color: '#e2e8f0',
                                    fontSize: '12px'
                                  }}
                                >
                                  <option value="">Assign to bracket...</option>
                                  {getBracketOptions().map(bracket => (
                                    <option key={bracket.id} value={bracket.id}>
                                      {bracket.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Create New Team Mode */}
                  {teamMode === "create" && (
                    <div className="bracket-form">
                      <div className="bracket-form-group">
                        <label htmlFor="teamName">Team Name *</label>
                        <input
                          type="text"
                          id="teamName"
                          name="teamName"
                          value={currentTeam.teamName}
                          onChange={handleTeamInputChange}
                          placeholder="Enter team name"
                        />
                      </div>

                      <div className="bracket-form-group">
                        <label htmlFor="sport">Sport *</label>
                        <select
                          id="sport"
                          name="sport"
                          value={currentTeam.sport}
                          onChange={handleTeamInputChange}
                        >
                          <option value="">Select a sport</option>
                          {Object.keys(positions).map((sport) => (
                            <option key={sport} value={sport}>{sport}</option>
                          ))}
                        </select>
                      </div>

                      {/* Players Section */}
                      {currentTeam.sport && (
                        <div className="admin-teams-players-section">
                          <div className="admin-teams-players-header">
                            <h3>Players ({currentTeam.players.length}/15)</h3>
                            <div className="admin-teams-player-count">
                              {validPlayerCount} / 12-15 players
                              {validPlayerCount < 12 && (
                                <span className="admin-teams-count-warning"> (Minimum 12 players required)</span>
                              )}
                              {validPlayerCount >= 12 && validPlayerCount <= 15 && (
                                <span className="admin-teams-count-success"> ✓ Valid team size</span>
                              )}
                            </div>
                          </div>

                          {currentTeam.players.map((player, index) => (
                            <div key={index} className="admin-teams-player-card">
                              <div className="admin-teams-player-input-row">
                                <div className="player-number-badge">
                                  {index + 1}
                                </div>
                                <input
                                  type="text"
                                  placeholder="Player name"
                                  value={player.name}
                                  onChange={(e) => handlePlayerChange(index, "name", e.target.value)}
                                  className="admin-teams-player-name-input"
                                  required
                                />
                                <input
                                  type="text"
                                  placeholder="Jersey #"
                                  value={player.jerseyNumber}
                                  onChange={(e) => handlePlayerChange(index, "jerseyNumber", e.target.value)}
                                  className="admin-teams-jersey-input"
                                  maxLength="10"
                                  required
                                />
                                <select
                                  value={player.position}
                                  onChange={(e) => handlePlayerChange(index, "position", e.target.value)}
                                  className="admin-teams-position-select"
                                  required
                                >
                                  <option value="">Select position</option>
                                  {positions[currentTeam.sport].map(pos => (
                                    <option key={pos} value={pos}>{pos}</option>
                                  ))}
                                </select>
                                {currentTeam.players.length > 12 && (
                                  <button
                                    type="button"
                                    className="remove-player-btn"
                                    onClick={() => handleRemovePlayer(index)}
                                    title="Remove player"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {/* Add More Players Button */}
                          {currentTeam.players.length < 15 && (
                            <div className="add-players-section">
                              <button
                                type="button"
                                className="add-player-btn"
                                onClick={handleAddPlayer}
                              >
                                <FaPlus style={{ marginRight: '8px' }} />
                                Add More Players ({15 - currentTeam.players.length} slots available)
                              </button>
                            </div>
                          )}
                          
                          {/* Information message */}
                          <div style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '6px',
                            padding: '12px',
                            marginTop: '15px',
                            fontSize: '13px',
                            color: '#93c5fd'
                          }}>
                            <strong>Note:</strong> Minimum 12 players required, maximum 15 players allowed. No duplicate names or jersey numbers allowed. Player names must contain only letters and spaces. Jersey numbers must contain only numbers.
                          </div>
                        </div>
                      )}

                      <div className="bracket-form-actions" style={{ marginTop: '20px' }}>
                        <button 
                          onClick={handleAddTeam}
                          className="bracket-submit-btn"
                          disabled={loading || validPlayerCount < 12 || validPlayerCount > 15}
                        >
                          {loading ? "Adding..." : "Add Team"}
                        </button>
                        <button
                          type="button"
                          className="bracket-cancel-btn"
                          onClick={() => setCurrentTeam({ teamName: "", sport: "", players: [] })}
                        >
                          Clear Form
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Select Existing Team Mode */}
                  {teamMode === "select" && (
                    <div className="bracket-form">
                      {/* Compact Search & Filter Bar */}
                      <div className="team-search-filter-bar">
                        <div className="search-input-wrapper">
                          <FaSearch className="search-icon" />
                          <input
                            type="text"
                            placeholder="Search teams..."
                            className="team-search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                        <select 
                          className="team-sport-filter"
                          value={sportFilter}
                          onChange={(e) => setSportFilter(e.target.value)}
                        >
                          <option value="all">All Sports ({teams.filter(t => !createdTeams.find(ct => ct.id === t.id)).length})</option>
                          <option value="basketball">Basketball ({teams.filter(t => t.sport.toLowerCase() === "basketball" && !createdTeams.find(ct => ct.id === t.id)).length})</option>
                          <option value="volleyball">Volleyball ({teams.filter(t => t.sport.toLowerCase() === "volleyball" && !createdTeams.find(ct => ct.id === t.id)).length})</option>
                        </select>
                      </div>

                      {/* Tabular Team List */}
                      <div className="teams-table-container">
                        {teams.length === 0 ? (
                          <p className="empty-state">
                            No teams available in database. Create a new team first.
                          </p>
                        ) : getFilteredTeams().length === 0 ? (
                          <p className="empty-state">
                            {sportFilter === "all" 
                              ? "All available teams have been selected." 
                              : `No ${capitalize(sportFilter)} teams available.`}
                          </p>
                        ) : (
                          <table className="teams-table">
                            <thead>
                              <tr>
                                <th>Team Name</th>
                                <th>Sport</th>
                                <th>Players</th>
                                {eventData.numberOfBrackets > 1 && <th>Assign to Bracket</th>}
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getFilteredTeams().map(team => (
                                <tr key={team.id}>
                                  <td className="team-name-cell">
                                    <strong>{team.name}</strong>
                                  </td>
                                  <td>
                                    <span className={`bracket-sport-badge ${team.sport.toLowerCase() === 'volleyball' ? 'bracket-sport-volleyball' : 'bracket-sport-basketball'}`}>
                                      {capitalize(team.sport)}
                                    </span>
                                  </td>
                                  <td>{team.players?.length || 0} players</td>
                                  {/* Bracket Assignment Column */}
                                  {eventData.numberOfBrackets > 1 && (
                                    <td>
                                      <select
                                        value={teamBracketAssignments[team.id] || ""}
                                        onChange={(e) => {
                                          const bracketId = e.target.value;
                                          if (bracketId) {
                                            handleSelectExistingTeam(team.id, bracketId);
                                          }
                                        }}
                                        className="bracket-assignment-select"
                                        style={{
                                          padding: '6px 10px',
                                          borderRadius: '4px',
                                          border: '1px solid rgba(255,255,255,0.2)',
                                          background: '#1a2332',
                                          color: '#e2e8f0',
                                          fontSize: '12px',
                                          width: '100%'
                                        }}
                                      >
                                        <option value="">Select bracket first</option>
                                        {getBracketOptions().map(bracket => (
                                          <option key={bracket.id} value={bracket.id}>
                                            {bracket.name}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                  )}
                                  <td>
                                    <button
                                      className="add-team-btn"
                                      onClick={() => handleSelectExistingTeam(team.id)}
                                      disabled={eventData.numberOfBrackets > 1}
                                      title={eventData.numberOfBrackets > 1 ? "Please select a bracket first" : "Add Team"}
                                    >
                                      {eventData.numberOfBrackets > 1 ? "Select Bracket" : "Add Team"}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}

                  {createdTeams.length >= 2 && (
                    <div className="bracket-form-actions" style={{ marginTop: '20px', borderTop: '2px solid rgba(255, 255, 255, 0.1)', paddingTop: '20px' }}>
                      <button 
                        onClick={handleProceedToBracket}
                        className="bracket-submit-btn"
                        style={{ width: '100%' }}
                      >
                        Proceed to Create Brackets
                        <FaChevronRight style={{ marginLeft: '8px' }} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Create Multiple Brackets */}
            {currentStep === 3 && (
              <div className="bracket-create-section">
                <div className="bracket-form-container">
                  <h2>Step 3: Create Brackets</h2>
                  <p className="step-description">Set up {eventData.numberOfBrackets} bracket{eventData.numberOfBrackets > 1 ? 's' : ''} for your tournament</p>
                  
                  {brackets.map((bracket, index) => (
                    <div key={bracket.id} className="multi-bracket-section">
                      <div className="bracket-section-header">
                        <h3>Bracket {index + 1}</h3>
                        {/* Show pre-assigned teams count */}
                        {bracket.selectedTeamIds.length > 0 && (
                          <div style={{ 
                            color: '#10b981', 
                            fontSize: '14px', 
                            marginTop: '5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <FaCheckCircle size={12} />
                            {bracket.selectedTeamIds.length} team(s) pre-assigned from previous step
                          </div>
                        )}
                      </div>

                      <div className="bracket-form">
                        <div className="bracket-form-group">
                          <label htmlFor={`bracketName-${bracket.id}`}>Bracket Name</label>
                          <input
                            type="text"
                            id={`bracketName-${bracket.id}`}
                            name="bracketName"
                            value={bracket.bracketName}
                            onChange={(e) => handleBracketInputChange(bracket.id, 'bracketName', e.target.value)}
                            placeholder={`Leave empty to auto-generate (e.g., ${createdEvent?.name} - Basketball Bracket ${index + 1})`}
                          />
                        </div>

                        <div className="bracket-form-group">
                          <label htmlFor={`sport-${bracket.id}`}>Sport *</label>
                          <select
                            id={`sport-${bracket.id}`}
                            name="sport"
                            value={bracket.sport}
                            onChange={(e) => handleBracketInputChange(bracket.id, 'sport', e.target.value)}
                            disabled={bracket.selectedTeamIds.length > 0} // Disable if teams already assigned
                          >
                            <option value="">Select a sport</option>
                            {Object.keys(positions).map((sport) => (
                              <option key={sport} value={sport}>{sport}</option>
                            ))}
                          </select>
                          {bracket.selectedTeamIds.length > 0 && (
                            <small style={{ color: '#10b981', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                              Sport auto-detected from assigned teams
                            </small>
                          )}
                        </div>

                        <div className="bracket-form-group">
                          <label htmlFor={`bracketType-${bracket.id}`}>Bracket Type *</label>
                          <select 
                            id={`bracketType-${bracket.id}`}
                            name="bracketType"
                            value={bracket.bracketType}
                            onChange={(e) => handleBracketInputChange(bracket.id, 'bracketType', e.target.value)}
                          >
                            <option value="single">Single Elimination</option>
                            <option value="double">Double Elimination</option>
                          </select>
                        </div>

                        <div className="bracket-form-group">
                          <label>Assigned Teams</label>
                          {bracket.selectedTeamIds.length === 0 ? (
                            <p style={{ color: '#fbbf24', fontSize: '14px', marginTop: '10px' }}>
                              No teams assigned to this bracket. Please go back to Step 2 and assign teams.
                            </p>
                          ) : (
                            <>
                              <div className="assigned-teams-list">
                                {bracket.selectedTeamIds.length > 0 && createdTeams
                                  .filter(team => bracket.selectedTeamIds.includes(String(team.id)) || bracket.selectedTeamIds.includes(Number(team.id)))
                                  .length === 0 ? (
                                  <p style={{ color: '#fbbf24', fontSize: '14px', padding: '10px', textAlign: 'center' }}>
                                    Loading team details...
                                  </p>
                                ) : (
                                  createdTeams
                                    .filter(team => bracket.selectedTeamIds.includes(String(team.id)) || bracket.selectedTeamIds.includes(Number(team.id)))
                                    .map((team, idx) => (
                                      <div key={team.id} className="assigned-team-item">
                                        <div className="team-number">{idx + 1}</div>
                                        <div className="assigned-team-details">
                                          <div className="team-name-row">
                                            <strong>{team.name}</strong>
                                            <span className={`bracket-sport-badge ${team.sport.toLowerCase() === 'volleyball' ? 'bracket-sport-volleyball' : 'bracket-sport-basketball'}`}>
                                              {capitalize(team.sport)}
                                            </span>
                                            <button 
                                              className="team-expand-btn"
                                              onClick={() => toggleTeamDetails(team.id)}
                                            >
                                              {expandedTeams[team.id] ? <FaChevronUp /> : <FaChevronDown />}
                                            </button>
                                          </div>
                                          <div className="team-meta">
                                            {team.players?.length || 0} players registered
                                          </div>
                                        </div>

                                        {/* Team Players Dropdown */}
                                        {expandedTeams[team.id] && (
                                          <div className="team-players-dropdown">
                                            <div className="players-dropdown-header">
                                              <h4>Players in {team.name}</h4>
                                              <span className="players-count">
                                                {team.players?.length || 0} players
                                              </span>
                                            </div>
                                            <div className="players-table-container">
                                              <table className="players-table">
                                                <thead>
                                                  <tr>
                                                    <th>Jersey #</th>
                                                    <th>Player Name</th>
                                                    <th>Position</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {team.players && team.players.length > 0 ? (
                                                    team.players.map((player, playerIndex) => (
                                                      <tr key={playerIndex}>
                                                        <td className="jersey-cell">
                                                          <span className="jersey-number">
                                                            {player.jerseyNumber}
                                                          </span>
                                                        </td>
                                                        <td className="player-name-cell">
                                                          {player.name}
                                                        </td>
                                                        <td className="position-cell">
                                                          <span className="position-badge">
                                                            {player.position}
                                                          </span>
                                                        </td>
                                                      </tr>
                                                    ))
                                                  ) : (
                                                    <tr>
                                                      <td colSpan="3" className="no-players-message">
                                                        No players registered for this team
                                                      </td>
                                                    </tr>
                                                  )}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="bracket-form-actions">
                    <button 
                      onClick={() => setCurrentStep(2)}
                      className="bracket-cancel-btn"
                    >
                      <FaChevronLeft style={{ marginRight: '8px' }} />
                      Back to Teams
                    </button>
                    <button 
                      onClick={handleCreateAllBrackets}
                      className="bracket-submit-btn"
                      disabled={loading}
                    >
                      {loading 
                        ? "Creating..." 
                        : eventData.numberOfBrackets === 1 
                          ? "Create Bracket" 
                          : "Create Brackets"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Success */}
            {currentStep === 4 && (
              <div className="bracket-create-section">
                <div className="bracket-form-container success-container">
                  <div className="success-icon">
                    <FaCheckCircle size={80} color="#4caf50" />
                  </div>
                  <h2>Tournament Created Successfully!</h2>
                  <p className="step-description">Your tournament has been set up and is ready to go.</p>
                  
                  <div className="tournament-summary">
                    <h3>Tournament Summary</h3>
                    <div className="summary-item">
                      <strong>Event:</strong> {createdEvent?.name}
                    </div>
                    <div className="summary-item">
                      <strong>Duration:</strong> {new Date(createdEvent?.start_date).toLocaleDateString()} - {new Date(createdEvent?.end_date).toLocaleDateString()}
                    </div>
                    <div className="summary-item">
                      <strong>Total Teams:</strong> {createdTeams.length}
                    </div>
                    <div className="summary-item">
                      <strong>Brackets Created:</strong> {createdBrackets.length}
                    </div>
                    
                    {createdBrackets.map((bracket, index) => (
                      <div key={bracket.id} className="bracket-summary-item">
                        <strong>Bracket {index + 1}:</strong> {bracket.name} ({bracket.selectedTeams || bracket.selectedTeamIds?.length || 0} teams)
                      </div>
                    ))}
                  </div>

                  <div className="bracket-form-actions" style={{ marginTop: '30px' }}>
                    <button 
                      onClick={handleStartNew}
                      className="bracket-submit-btn"
                      style={{ width: '100%' }}
                    >
                      Create Another Tournament
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .admin-teams-player-card {
          position: relative;
        }

        .player-number-badge {
          width: 30px;
          height: 30px;
          background: #2196f3;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
          margin-right: 12px;
        }

        .remove-player-btn {
          background: #dc2626;
          color: white;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
          margin-left: 8px;
        }

        .remove-player-btn:hover {
          background: #b91c1c;
          transform: scale(1.1);
        }

        .add-players-section {
          margin-top: 15px;
          padding: 15px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 6px;
          text-align: center;
        }

        .add-player-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
        }

        .add-player-btn:hover {
          background: #059669;
          transform: translateY(-1px);
        }

        .admin-teams-count-success {
          color: #10b981;
          font-weight: 600;
        }

        .admin-teams-count-warning {
          color: #fbbf24;
        }

        .assigned-teams-list {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 15px;
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .assigned-team-item {
          display: flex;
          flex-direction: column;
          gap: 0;
          padding: 12px;
          background: #1a2332;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .assigned-team-item:hover {
          background: rgba(33, 150, 243, 0.1);
          border-color: rgba(33, 150, 243, 0.3);
        }

        .team-number {
          width: 32px;
          height: 32px;
          background: #2196f3;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          flex-shrink: 0;
        }

        .assigned-team-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .team-name-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .team-name-row strong {
          color: #e2e8f0;
          font-size: 15px;
          flex: 1;
        }

        .team-meta {
          color: #94a3b8;
          font-size: 13px;
        }

        .team-expand-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #e2e8f0;
          width: 28px;
          height: 28px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .team-expand-btn:hover {
          background: rgba(33, 150, 243, 0.3);
          border-color: #2196f3;
        }

        .team-players-dropdown {
          margin-top: 15px;
          padding: 15px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .players-dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .players-dropdown-header h4 {
          margin: 0;
          color: #e2e8f0;
          font-size: 16px;
        }

        .players-count {
          color: #94a3b8;
          font-size: 14px;
          background: rgba(255, 255, 255, 0.1);
          padding: 4px 8px;
          border-radius: 12px;
        }

        .players-table-container {
          overflow-x: auto;
        }

        .players-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .players-table th {
          background: rgba(0, 0, 0, 0.4);
          color: #e2e8f0;
          padding: 12px 15px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        }

        .players-table td {
          padding: 12px 15px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          color: #cbd5e1;
        }

        .players-table tr:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .jersey-cell {
          width: 80px;
        }

        .jersey-number {
          display: inline-block;
          background: #2196f3;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 12px;
        }

        .player-name-cell {
          color: #e2e8f0;
          font-weight: 500;
        }

        .position-cell {
          width: 150px;
        }

        .position-badge {
          display: inline-block;
          background: rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .no-players-message {
          text-align: center;
          color: #94a3b8;
          font-style: italic;
          padding: 20px;
        }

        .multi-bracket-section {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 25px;
        }

        .bracket-section-header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 15px;
          margin-bottom: 20px;
        }

        .bracket-section-header h3 {
          margin: 0;
          color: #e2e8f0;
          font-size: 18px;
        }

        .bracket-summary-item {
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
          display: flex;
          justify-content: space-between;
        }

        .bracket-summary-item:last-child {
          border-bottom: none;
        }

        /* Rest of the existing styles remain the same */
        .tournament-progress {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 30px 0 40px;
          padding: 0 20px;
        }

        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          opacity: 0.4;
          transition: all 0.3s ease;
        }

        .progress-step.active {
          opacity: 1;
        }

        .progress-step.completed {
          opacity: 1;
        }

        .step-circle {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 20px;
          transition: all 0.3s ease;
        }

        .progress-step.active .step-circle {
          background: #2196f3;
          color: white;
        }

        .progress-step.completed .step-circle {
          background: #4caf50;
          color: white;
        }

        .step-label {
          font-size: 14px;
          font-weight: 500;
          text-align: center;
        }

        .progress-line {
          width: 100px;
          height: 2px;
          background: #e0e0e0;
          margin: 0 10px;
        }

        .step-description {
          color: #666;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .created-teams-summary {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }

        .created-teams-summary h3 {
          margin: 0 0 15px 0;
          font-size: 16px;
          color: #e2e8f0;
        }

        .teams-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
        }

        .team-summary-card {
          background: #1a2332;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 12px;
          border-radius: 6px;
          font-size: 14px;
          color: #e2e8f0;
          position: relative;
        }

        .team-summary-content {
          display: flex;
          flex-direction: column;
          gap: 5px;
          width: 100%;
        }

        .team-summary-card .remove-team-btn {
          background: #dc2626;
          color: white;
          border: none;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 10;
        }

        .team-summary-card .remove-team-btn:hover {
          background: #b91c1c;
        }

        .remove-team-btn {
          background: #dc2626;
          color: white;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .remove-team-btn:hover {
          background: #b91c1c;
          transform: scale(1.1);
        }

        .team-mode-toggle {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          background: rgba(0, 0, 0, 0.2);
          padding: 5px;
          border-radius: 8px;
        }

        .mode-toggle-btn {
          flex: 1;
          padding: 12px 20px;
          background: transparent;
          color: #94a3b8;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .mode-toggle-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #e2e8f0;
        }

        .mode-toggle-btn.active {
          background: #2196f3;
          color: white;
        }

        .team-search-filter-bar {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
          align-items: stretch;
        }

        .search-input-wrapper {
          position: relative;
          flex: 1;
          min-width: 0;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 14px;
          pointer-events: none;
          z-index: 2;
        }

        .team-search-input {
          width: 100%;
          padding: 10px 12px 10px 36px;
          background: #1a2332;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #e2e8f0;
          font-size: 14px;
          box-sizing: border-box;
        }

        .team-search-input:focus {
          outline: none;
          border-color: #2196f3;
        }

        .team-sport-filter {
          padding: 10px 15px;
          background: #1a2332;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #e2e8b8;
          font-size: 14px;
          cursor: pointer;
          min-width: 180px;
        }

        .team-sport-filter:focus {
          outline: none;
          border-color: #2196f3;
        }

        .teams-table-container {
          background: #1a2332;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          overflow: hidden;
          max-height: 500px;
          overflow-y: auto;
        }

        .teams-table {
          width: 100%;
          border-collapse: collapse;
        }

        .teams-table thead {
          background: #0a0f1c;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .teams-table th {
          padding: 15px;
          text-align: left;
          font-weight: 600;
          color: #e2e8f0;
          font-size: 14px;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
          background: #0a0f1c;
        }

        .teams-table td {
          padding: 15px;
          color: #cbd5e1;
          font-size: 14px;
        }

        .team-name-cell {
          color: #e2e8f0;
        }

        .sport-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .sport-basketball {
          background: rgba(255, 152, 0, 0.2);
          color: #ff9800;
          border: 1px solid rgba(255, 152, 0, 0.3);
        }

        .sport-volleyball {
          background: rgba(33, 150, 243, 0.2);
          color: #2196f3;
          border: 1px solid rgba(33, 150, 243, 0.3);
        }

        .add-team-btn {
          padding: 8px 16px;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          font-size: 13px;
          transition: all 0.2s ease;
        }

        .add-team-btn:hover {
          background: #1976d2;
          transform: translateY(-1px);
        }

        .add-team-btn:disabled {
          background: #64748b;
          cursor: not-allowed;
          transform: none;
        }

        .empty-state {
          text-align: center;
          color: #94a3b8;
          padding: 40px 20px;
          font-size: 14px;
        }

        .team-selection-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 15px;
          margin: 15px 0;
        }

        .team-selection-card {
          border: 2px solid rgba(255, 255, 255, 0.2);
          padding: 15px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #1a2332;
          color: #e2e8f0;
        }

        .team-selection-card:hover {
          border-color: #2196f3;
          background: rgba(33, 150, 243, 0.1);
        }

        .team-selection-card.selected {
          border-color: #2196f3;
          background: rgba(33, 150, 243, 0.2);
        }

        .team-selection-card input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }

        .team-selection-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
          font-size: 14px;
          color: #e2e8f0;
        }

        .team-selection-info strong {
          color: #fff;
        }

        .selected-teams-count {
          margin-top: 10px;
          font-weight: 500;
          color: #2196f3;
        }

        .success-container {
          text-align: center;
          padding: 40px 20px;
        }

        .success-icon {
          margin-bottom: 20px;
        }

        .tournament-summary {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 25px;
          border-radius: 8px;
          margin: 30px 0;
          text-align: left;
        }

        .tournament-summary h3 {
          margin: 0 0 20px 0;
          text-align: center;
          color: #e2e8f0;
        }

        .summary-item {
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: space-between;
          color: #e2e8f0;
        }

        .summary-item:last-child {
          border-bottom: none;
        }

        @media (max-width: 768px) {
          .tournament-progress {
            flex-direction: column;
            gap: 20px;
          }

          .progress-line {
            width: 2px;
            height: 30px;
            margin: 0;
          }

          .team-selection-grid {
            grid-template-columns: 1fr;
          }

          .teams-summary-grid {
            grid-template-columns: 1fr;
          }

          .team-search-filter-bar {
            flex-direction: column;
          }

          .team-sport-filter {
            width: 100%;
          }

          .teams-table {
            font-size: 12px;
          }

          .teams-table th,
          .teams-table td {
            padding: 10px 8px;
          }

          .multi-bracket-section {
            padding: 15px;
          }

          .team-name-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .team-expand-btn {
            align-self: flex-end;
          }

          .players-table th,
          .players-table td {
            padding: 8px 10px;
            font-size: 12px;
          }

          .player-number-badge {
            position: static;
            transform: none;
            margin-right: 8px;
            margin-bottom: 5px;
          }

          .admin-teams-player-input-row {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
};

export default TournamentCreator;