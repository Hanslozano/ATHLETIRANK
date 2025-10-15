import React, { useState, useEffect } from "react";
import { FaCheckCircle, FaChevronRight, FaChevronLeft, FaSearch } from "react-icons/fa";
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
    bracketCount: 1
  });
  const [createdEvent, setCreatedEvent] = useState(null);

  // Step 2: Teams Data
  const [teams, setTeams] = useState([]);
  const [teamMode, setTeamMode] = useState("create");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTeam, setCurrentTeam] = useState({
    teamName: "",
    sport: "",
    players: []
  });
  const [createdTeams, setCreatedTeams] = useState([]);
  const [teamBracketAssignment, setTeamBracketAssignment] = useState({}); // {teamId: bracketIndex}

  // Step 3: Bracket Data
  const [bracketConfigs, setBracketConfigs] = useState([]); // Array of bracket configurations
  const [createdBrackets, setCreatedBrackets] = useState([]);

  // Position options
  const positions = {
    Basketball: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
    Volleyball: ["Setter", "Outside Hitter", "Middle Blocker", "Opposite Hitter", "Libero", "Defensive Specialist"],
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

  // Initialize bracket configurations when moving to step 3
  useEffect(() => {
    if (currentStep === 3 && eventData.bracketCount > 0) {
      const initialBracketConfigs = Array.from({ length: eventData.bracketCount }, (_, i) => ({
        bracketNumber: i + 1,
        bracketName: `Bracket ${i + 1}`,
        bracketType: "single",
        sport: "",
        teams: []
      }));
      setBracketConfigs(initialBracketConfigs);
      
      // Debug: Log the team bracket assignments
      console.log("Team Bracket Assignments:", teamBracketAssignment);
      console.log("Created Teams:", createdTeams);
    }
  }, [currentStep, eventData.bracketCount]);

  // Auto-detect sports for each bracket based on assigned teams - FIXED VERSION
  useEffect(() => {
    if (currentStep === 3 && bracketConfigs.length > 0) {
      console.log("Updating bracket configs with team assignments...");
      
      const updatedConfigs = bracketConfigs.map(config => {
        // Convert bracket number to string for comparison since select values are strings
        const bracketNumberStr = config.bracketNumber.toString();
        
        const bracketTeams = createdTeams.filter(team => {
          const assignedBracket = teamBracketAssignment[team.id];
          console.log(`Team ${team.name} (ID: ${team.id}) assigned to bracket:`, assignedBracket, "Config bracket:", bracketNumberStr);
          return assignedBracket === bracketNumberStr;
        });
        
        console.log(`Bracket ${config.bracketNumber} teams:`, bracketTeams);

        if (bracketTeams.length > 0) {
          const firstTeamSport = bracketTeams[0].sport;
          const allSameSport = bracketTeams.every(team => team.sport === firstTeamSport);
          
          return {
            ...config,
            teams: bracketTeams,
            sport: allSameSport ? firstTeamSport.toLowerCase() : "mixed"
          };
        }
        return {
          ...config,
          teams: [],
          sport: ""
        };
      });
      
      console.log("Updated bracket configs:", updatedConfigs);
      setBracketConfigs(updatedConfigs);
    }
  }, [currentStep, createdTeams, teamBracketAssignment, bracketConfigs.length]);

  // Get selected teams by sport
  const getSelectedTeamsBySport = (sport) => {
    return createdTeams.filter(team => team.sport.toLowerCase() === sport.toLowerCase());
  };

  // Step 1: Event Creation
  const handleEventInputChange = (e) => {
    const { name, value } = e.target;
    setEventData(prev => ({ 
      ...prev, 
      [name]: name === 'bracketCount' ? parseInt(value) || 1 : value 
    }));
    if (validationError) setValidationError("");
  };

  const handleCreateEvent = async () => {
    if (!eventData.name.trim() || !eventData.startDate || !eventData.endDate) {
      setValidationError("Please fill in all event fields.");
      return;
    }

    if (eventData.bracketCount < 1) {
      setValidationError("Number of brackets must be at least 1.");
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
        console.log("Event creation response:", response);
        
        const newEvent = {
          id: response.id || response.eventId,
          name: eventData.name,
          start_date: eventData.startDate,
          end_date: eventData.endDate
        };
        
        console.log("Normalized event object:", newEvent);
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

    if (name === "sport") {
      setCurrentTeam(prev => ({
        ...prev,
        players: value ? [{ name: "", position: "", jerseyNumber: "" }] : []
      }));
    }
    
    if (validationError) setValidationError("");
  };

  const addPlayer = () => {
    if (currentTeam.sport && currentTeam.players.length < 15) {
      setCurrentTeam(prev => ({
        ...prev,
        players: [...prev.players, { name: "", position: "", jerseyNumber: "" }]
      }));
    }
  };

  const removePlayer = (index) => {
    setCurrentTeam(prev => ({
      ...prev,
      players: prev.players.filter((_, i) => i !== index)
    }));
  };

  const handlePlayerChange = (index, field, value) => {
    const newPlayers = [...currentTeam.players];
    newPlayers[index][field] = value;
    setCurrentTeam(prev => ({ ...prev, players: newPlayers }));
  };

  const validateTeam = () => {
    if (!currentTeam.teamName.trim()) return "Please enter a team name";
    if (!currentTeam.sport) return "Please select a sport";
    
    const validPlayers = currentTeam.players.filter(p => 
      p.name.trim() && p.position && p.jerseyNumber
    );
    
    if (validPlayers.length < 12) {
      return `Team must have at least 12 players. Currently you have ${validPlayers.length} valid players.`;
    }
    
    const jerseyNumbers = validPlayers.map(p => p.jerseyNumber);
    const uniqueJerseyNumbers = new Set(jerseyNumbers);
    if (jerseyNumbers.length !== uniqueJerseyNumbers.size) {
      return "Duplicate jersey numbers found.";
    }
    
    return null;
  };

  const handleAddTeam = async () => {
    const error = validateTeam();
    if (error) {
      setValidationError(error);
      return;
    }

    const validPlayers = currentTeam.players.filter(p => 
      p.name.trim() && p.position && p.jerseyNumber
    );

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: currentTeam.teamName,
          sport: currentTeam.sport,
          players: validPlayers
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
    // Check if we have at least 2 teams per bracket
    const bracketTeamCounts = {};
    createdTeams.forEach(team => {
      const bracket = teamBracketAssignment[team.id];
      if (bracket) {
        bracketTeamCounts[bracket] = (bracketTeamCounts[bracket] || 0) + 1;
      }
    });

    const bracketsWithInsufficientTeams = Object.entries(bracketTeamCounts)
      .filter(([_, count]) => count < 2)
      .map(([bracket]) => bracket);

    if (bracketsWithInsufficientTeams.length > 0) {
      setValidationError(`Brackets ${bracketsWithInsufficientTeams.join(', ')} need at least 2 teams assigned.`);
      return;
    }

    // Check if all teams are assigned to brackets when multiple brackets exist
    if (eventData.bracketCount > 1) {
      const unassignedTeams = createdTeams.filter(team => !teamBracketAssignment[team.id]);
      if (unassignedTeams.length > 0) {
        setValidationError(`All teams must be assigned to a bracket. ${unassignedTeams.length} teams are unassigned.`);
        return;
      }
    }

    setCurrentStep(3);
    setValidationError("");
  };

  // Handle selecting existing team from database
  const handleSelectExistingTeam = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (team && !createdTeams.find(t => t.id === team.id)) {
      setCreatedTeams(prev => [...prev, team]);
      setValidationError("");
    }
  };

  // Handle removing a team from selected teams
  const handleRemoveTeam = (teamId) => {
    setCreatedTeams(prev => prev.filter(t => t.id !== teamId));
    setTeamBracketAssignment(prev => {
      const newAssignment = { ...prev };
      delete newAssignment[teamId];
      return newAssignment;
    });
  };

  // Handle bracket assignment for teams - FIXED: Ensure string values
  const handleBracketAssignment = (teamId, bracketValue) => {
    // Store as string to match select value
    setTeamBracketAssignment(prev => ({
      ...prev,
      [teamId]: bracketValue
    }));
  };

  // Get filtered teams based on search
  const getFilteredTeams = () => {
    let filtered = teams.filter(team => !createdTeams.find(ct => ct.id === team.id));
    
    if (searchTerm.trim()) {
      filtered = filtered.filter(team => 
        team.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  // Get teams by sport for the containers
  const getTeamsBySport = (sport) => {
    return getFilteredTeams().filter(team => team.sport.toLowerCase() === sport.toLowerCase());
  };

  // Step 3: Bracket Configuration
  const handleBracketConfigChange = (bracketIndex, field, value) => {
    setBracketConfigs(prev => {
      const newConfigs = [...prev];
      newConfigs[bracketIndex] = {
        ...newConfigs[bracketIndex],
        [field]: value
      };
      return newConfigs;
    });
  };

  const handleCreateBrackets = async () => {
    // Validate all brackets
    for (const config of bracketConfigs) {
      if (config.teams.length < 2) {
        setValidationError(`Bracket ${config.bracketNumber} needs at least 2 teams.`);
        return;
      }
      if (!config.sport || config.sport === "mixed") {
        setValidationError(`Bracket ${config.bracketNumber} needs teams of the same sport.`);
        return;
      }
    }

    setLoading(true);
    try {
      const bracketPromises = bracketConfigs.map(async (config) => {
        const bracketName = config.bracketName || `${createdEvent.name} - Bracket ${config.bracketNumber}`;
        
        const requestBody = {
          event_id: createdEvent.id,
          name: bracketName,
          sport_type: config.sport.toLowerCase(),
          elimination_type: config.bracketType
        };

        console.log("Creating bracket:", requestBody);
        
        const bracketRes = await fetch("http://localhost:5000/api/brackets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        });

        if (!bracketRes.ok) {
          const errorData = await bracketRes.json();
          throw new Error(errorData.error || `Failed to create bracket ${config.bracketNumber}`);
        }

        const newBracket = await bracketRes.json();
        console.log("Bracket created successfully:", newBracket);

        // Add teams to bracket
        for (let team of config.teams) {
          await fetch("http://localhost:5000/api/bracketTeams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bracket_id: newBracket.id,
              team_id: team.id
            })
          });
        }

        // Generate matches
        const generateRes = await fetch(`http://localhost:5000/api/brackets/${newBracket.id}/generate`, {
          method: "POST"
        });

        if (!generateRes.ok) {
          const errorData = await generateRes.json();
          throw new Error(errorData.error || `Failed to generate matches for bracket ${config.bracketNumber}`);
        }

        return newBracket;
      });

      const createdBrackets = await Promise.all(bracketPromises);
      setCreatedBrackets(createdBrackets);
      setCurrentStep(4);
      setValidationError("");
    } catch (err) {
      console.error("Error creating brackets:", err);
      setValidationError("Error creating brackets: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset entire process
  const handleStartNew = () => {
    setCurrentStep(1);
    setEventData({ name: "", startDate: "", endDate: "", bracketCount: 1 });
    setCreatedEvent(null);
    setCurrentTeam({ teamName: "", sport: "", players: [] });
    setCreatedTeams([]);
    setTeamBracketAssignment({});
    setBracketConfigs([]);
    setCreatedBrackets([]);
    setValidationError("");
  };

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  const validPlayerCount = currentTeam.players.filter(p => 
    p.name.trim() && p.position && p.jerseyNumber
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
                <div className="step-label">Create Bracket</div>
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
                      <label htmlFor="bracketCount">Number of Brackets *</label>
                      <input
                        type="number"
                        id="bracketCount"
                        name="bracketCount"
                        value={eventData.bracketCount}
                        onChange={handleEventInputChange}
                        min="1"
                        max="10"
                        placeholder="Enter number of brackets"
                        required
                      />
                      <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                        How many brackets do you want to create for this tournament?
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
                    Create new teams or select from existing teams (minimum 2 teams per bracket required)
                    {eventData.bracketCount > 1 && ` - Assign teams to specific brackets`}
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

                  {/* Created/Selected Teams Summary - SEPARATED BY SPORT */}
                  {createdTeams.length > 0 && (
                    <div className="created-teams-summary">
                      <h3>Selected Teams ({createdTeams.length})</h3>
                      {eventData.bracketCount > 1 && (
                        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '15px' }}>
                          Assign teams to brackets using the dropdown below
                        </p>
                      )}
                      
                      {/* Basketball Selected Teams */}
                      {getSelectedTeamsBySport('basketball').length > 0 && (
                        <div className="selected-sport-section">
                          <h4 className="selected-sport-title">
                            <span className="sport-icon basketball">🏀</span>
                            Basketball Teams
                            <span className="team-count">({getSelectedTeamsBySport('basketball').length})</span>
                          </h4>
                          <div className="teams-summary-grid">
                            {getSelectedTeamsBySport('basketball').map(team => (
                              <div key={team.id} className="team-summary-card">
                                <div className="team-summary-content">
                                  <strong>{team.name}</strong>
                                  <span className={`admin-teams-sport-badge admin-teams-sport-${team.sport.toLowerCase()}`}>
                                    {capitalize(team.sport)}
                                  </span>
                                  <span>{team.players?.length || 0} players</span>
                                  
                                  {/* Bracket Assignment Dropdown */}
                                  {eventData.bracketCount > 1 && (
                                    <div className="bracket-assignment">
                                      <label>Assign to Bracket:</label>
                                      <select
                                        value={teamBracketAssignment[team.id] || ""}
                                        onChange={(e) => handleBracketAssignment(team.id, e.target.value)}
                                        className="bracket-assign-select"
                                      >
                                        <option value="">Select Bracket</option>
                                        {Array.from({ length: eventData.bracketCount }, (_, i) => (
                                          <option key={i + 1} value={(i + 1).toString()}>
                                            Bracket {i + 1}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </div>
                                <button
                                  className="remove-team-btn"
                                  onClick={() => handleRemoveTeam(team.id)}
                                  title="Remove team"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Volleyball Selected Teams */}
                      {getSelectedTeamsBySport('volleyball').length > 0 && (
                        <div className="selected-sport-section">
                          <h4 className="selected-sport-title">
                            <span className="sport-icon volleyball">🏐</span>
                            Volleyball Teams
                            <span className="team-count">({getSelectedTeamsBySport('volleyball').length})</span>
                          </h4>
                          <div className="teams-summary-grid">
                            {getSelectedTeamsBySport('volleyball').map(team => (
                              <div key={team.id} className="team-summary-card">
                                <div className="team-summary-content">
                                  <strong>{team.name}</strong>
                                  <span className={`admin-teams-sport-badge admin-teams-sport-${team.sport.toLowerCase()}`}>
                                    {capitalize(team.sport)}
                                  </span>
                                  <span>{team.players?.length || 0} players</span>
                                  
                                  {/* Bracket Assignment Dropdown */}
                                  {eventData.bracketCount > 1 && (
                                    <div className="bracket-assignment">
                                      <label>Assign to Bracket:</label>
                                      <select
                                        value={teamBracketAssignment[team.id] || ""}
                                        onChange={(e) => handleBracketAssignment(team.id, e.target.value)}
                                        className="bracket-assign-select"
                                      >
                                        <option value="">Select Bracket</option>
                                        {Array.from({ length: eventData.bracketCount }, (_, i) => (
                                          <option key={i + 1} value={(i + 1).toString()}>
                                            Bracket {i + 1}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </div>
                                <button
                                  className="remove-team-btn"
                                  onClick={() => handleRemoveTeam(team.id)}
                                  title="Remove team"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
                            <h3>Players</h3>
                            <div className="admin-teams-player-count">
                              {validPlayerCount} / 12-15 players
                              {validPlayerCount < 12 && (
                                <span className="admin-teams-count-warning"> (Minimum 12 required)</span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="admin-teams-submit-btn"
                              onClick={addPlayer}
                              disabled={currentTeam.players.length >= 15}
                            >
                              Add Player
                            </button>
                          </div>

                          {currentTeam.players.map((player, index) => (
                            <div key={index} className="admin-teams-player-card">
                              <div className="admin-teams-player-input-row">
                                <input
                                  type="text"
                                  placeholder="Player name"
                                  value={player.name}
                                  onChange={(e) => handlePlayerChange(index, "name", e.target.value)}
                                  className="admin-teams-player-name-input"
                                />
                                <input
                                  type="text"
                                  placeholder="Jersey #"
                                  value={player.jerseyNumber}
                                  onChange={(e) => handlePlayerChange(index, "jerseyNumber", e.target.value)}
                                  className="admin-teams-jersey-input"
                                  maxLength="10"
                                />
                                <select
                                  value={player.position}
                                  onChange={(e) => handlePlayerChange(index, "position", e.target.value)}
                                  className="admin-teams-position-select"
                                >
                                  <option value="">Select position</option>
                                  {positions[currentTeam.sport].map(pos => (
                                    <option key={pos} value={pos}>{pos}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  className="admin-teams-delete-btn"
                                  onClick={() => removePlayer(index)}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="bracket-form-actions" style={{ marginTop: '20px' }}>
                        <button 
                          onClick={handleAddTeam}
                          className="bracket-submit-btn"
                          disabled={loading || validPlayerCount < 12}
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

                  {/* Select Existing Team Mode - SPORT CONTAINERS */}
                  {teamMode === "select" && (
                    <div className="bracket-form">
                      {/* Search Bar */}
                      <div className="team-search-filter-bar">
                        <div className="search-input-wrapper">
                          
                          <input
                            type="text"
                            placeholder="Search teams..."
                            className="team-search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Sport Containers */}
                      <div className="sport-containers">
                        {/* Basketball Container */}
                        <div className="sport-container">
                          <h3 className="sport-container-title">
                            <span className="sport-icon basketball">🏀</span>
                            Basketball Teams
                            <span className="team-count">({getTeamsBySport('basketball').length})</span>
                          </h3>
                          <div className="sport-teams-grid">
                            {getTeamsBySport('basketball').length === 0 ? (
                              <p className="empty-sport-state">No basketball teams available</p>
                            ) : (
                              getTeamsBySport('basketball').map(team => (
                                <div key={team.id} className="sport-team-card">
                                  <div className="sport-team-info">
                                    <strong>{team.name}</strong>
                                    <span>{team.players?.length || 0} players</span>
                                  </div>
                                  <button
                                    className="add-team-btn"
                                    onClick={() => handleSelectExistingTeam(team.id)}
                                  >
                                    Add Team
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Volleyball Container */}
                        <div className="sport-container">
                          <h3 className="sport-container-title">
                            <span className="sport-icon volleyball">🏐</span>
                            Volleyball Teams
                            <span className="team-count">({getTeamsBySport('volleyball').length})</span>
                          </h3>
                          <div className="sport-teams-grid">
                            {getTeamsBySport('volleyball').length === 0 ? (
                              <p className="empty-sport-state">No volleyball teams available</p>
                            ) : (
                              getTeamsBySport('volleyball').map(team => (
                                <div key={team.id} className="sport-team-card">
                                  <div className="sport-team-info">
                                    <strong>{team.name}</strong>
                                    <span>{team.players?.length || 0} players</span>
                                  </div>
                                  <button
                                    className="add-team-btn"
                                    onClick={() => handleSelectExistingTeam(team.id)}
                                  >
                                    Add Team
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
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
                        Proceed to Configure Brackets
                        <FaChevronRight style={{ marginLeft: '8px' }} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Configure Brackets */}
            {currentStep === 3 && (
              <div className="bracket-create-section">
                <div className="bracket-form-container">
                  <h2>Step 3: Configure Brackets</h2>
                  <p className="step-description">
                    Configure each bracket with elimination type and review assigned teams
                  </p>
                  
                  <div className="brackets-configuration">
                    {bracketConfigs.map((config, index) => (
                      <div key={config.bracketNumber} className="bracket-config-card">
                        <h3>Bracket {config.bracketNumber}</h3>
                        
                        <div className="bracket-config-fields">
                          <div className="bracket-form-group">
                            <label htmlFor={`bracketName-${config.bracketNumber}`}>Bracket Name</label>
                            <input
                              type="text"
                              id={`bracketName-${config.bracketNumber}`}
                              value={config.bracketName}
                              onChange={(e) => handleBracketConfigChange(index, 'bracketName', e.target.value)}
                              placeholder={`Bracket ${config.bracketNumber}`}
                            />
                          </div>

                          <div className="bracket-form-group">
                            <label htmlFor={`sport-${config.bracketNumber}`}>Sport</label>
                            <input
                              type="text"
                              id={`sport-${config.bracketNumber}`}
                              value={config.sport === "mixed" ? "Mixed Sports" : capitalize(config.sport)}
                              readOnly
                              disabled
                              className="disabled-input"
                            />
                            <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                              {config.sport === "mixed" 
                                ? "Teams from different sports detected" 
                                : "Auto-detected from assigned teams"}
                            </small>
                          </div>

                          <div className="bracket-form-group">
                            <label htmlFor={`bracketType-${config.bracketNumber}`}>Elimination Type *</label>
                            <select 
                              id={`bracketType-${config.bracketNumber}`}
                              value={config.bracketType}
                              onChange={(e) => handleBracketConfigChange(index, 'bracketType', e.target.value)}
                            >
                              <option value="single">Single Elimination</option>
                              <option value="double">Double Elimination</option>
                            </select>
                          </div>
                        </div>

                        {/* Assigned Teams Preview */}
                        <div className="assigned-teams-section">
                          <h4>Assigned Teams ({config.teams.length})</h4>
                          {config.teams.length === 0 ? (
                            <p className="no-teams-warning">No teams assigned to this bracket</p>
                          ) : config.teams.length < 2 ? (
                            <p className="insufficient-teams-warning">
                              ⚠️ Needs at least 2 teams (currently {config.teams.length})
                            </p>
                          ) : config.sport === "mixed" ? (
                            <p className="insufficient-teams-warning">
                              ⚠️ Mixed sports detected - all teams must be from the same sport
                            </p>
                          ) : (
                            <p className="sufficient-teams-success">
                              ✓ Ready to create ({config.teams.length} teams)
                            </p>
                          )}
                          
                          <div className="assigned-teams-list">
                            {config.teams.map(team => (
                              <div key={team.id} className="assigned-team-item">
                                <span className="team-name">{team.name}</span>
                                <span className={`sport-badge sport-${team.sport.toLowerCase()}`}>
                                  {capitalize(team.sport)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bracket-form-actions">
                    <button 
                      onClick={() => setCurrentStep(2)}
                      className="bracket-cancel-btn"
                    >
                      <FaChevronLeft style={{ marginRight: '8px' }} />
                      Back to Teams
                    </button>
                    <button 
                      onClick={handleCreateBrackets}
                      className="bracket-submit-btn"
                      disabled={loading}
                    >
                      {loading ? "Creating Brackets..." : "Create All Brackets"}
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
                    <div className="summary-item">
                      <strong>Sports:</strong> {Array.from(new Set(createdTeams.map(t => t.sport))).join(', ')}
                    </div>
                  </div>

                  <div className="created-brackets-list">
                    <h4>Created Brackets:</h4>
                    {createdBrackets.map((bracket, index) => (
                      <div key={bracket.id} className="bracket-summary-item">
                        <strong>{bracket.name}</strong>
                        <span>Type: {bracketConfigs[index]?.bracketType === "single" ? "Single" : "Double"} Elimination</span>
                        <span>Teams: {bracketConfigs[index]?.teams.length || 0}</span>
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
        /* All your existing CSS styles remain the same */
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

        .selected-sport-section {
          margin-bottom: 25px;
        }

        .selected-sport-section:last-child {
          margin-bottom: 0;
        }

        .selected-sport-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 0 15px 0;
          font-size: 16px;
          color: #e2e8f0;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 10px;
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
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: #e2e8f0;
        }

        .team-summary-content {
          display: flex;
          flex-direction: column;
          gap: 5px;
          flex: 1;
        }

        .bracket-assignment {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .bracket-assignment label {
          display: block;
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 4px;
        }

        .bracket-assign-select {
          width: 100%;
          padding: 6px 8px;
          background: #0a0f1c;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          color: #e2e8f0;
          font-size: 12px;
        }

        .bracket-assign-select:focus {
          outline: none;
          border-color: #2196f3;
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

        /* Sport Containers */
        .sport-containers {
          display: flex;
          flex-direction: column;
          gap: 25px;
          margin-top: 20px;
        }

        .sport-container {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
        }

        .sport-container-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 0 20px 0;
          font-size: 18px;
          color: #e2e8f0;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 10px;
        }

        .sport-icon {
          font-size: 24px;
        }

        .team-count {
          background: #2196f3;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          margin-left: auto;
        }

        .sport-teams-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 12px;
        }

        .sport-team-card {
          background: #1a2332;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 15px;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s ease;
        }

        .sport-team-card:hover {
          border-color: #2196f3;
          background: rgba(33, 150, 243, 0.05);
        }

        .sport-team-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .sport-team-info strong {
          color: #e2e8f0;
          font-size: 14px;
        }

        .sport-team-info span {
          color: #94a3b8;
          font-size: 12px;
        }

        .empty-sport-state {
          text-align: center;
          color: #94a3b8;
          padding: 30px 20px;
          font-style: italic;
          grid-column: 1 / -1;
        }

        /* Search Bar */
        .team-search-filter-bar {
          margin-bottom: 20px;
        }

        .search-input-wrapper {
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 14px;
        }

        .team-search-input {
          width: 100%;
          padding: 12px 12px 12px 40px;
          background: #1a2332;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 14px;
        }

        .team-search-input:focus {
          outline: none;
          border-color: #2196f3;
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
          white-space: nowrap;
        }

        .add-team-btn:hover {
          background: #1976d2;
          transform: translateY(-1px);
        }

        /* Bracket Configuration */
        .brackets-configuration {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 30px;
        }

        .bracket-config-card {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 25px;
          border-radius: 12px;
        }

        .bracket-config-card h3 {
          margin: 0 0 20px 0;
          color: #e2e8f0;
          font-size: 20px;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 10px;
        }

        .bracket-config-fields {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 25px;
        }

        .disabled-input {
          background: #2d3748 !important;
          cursor: not-allowed !important;
          opacity: 0.7 !important;
        }

        .assigned-teams-section {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px;
          border-radius: 8px;
        }

        .assigned-teams-section h4 {
          margin: 0 0 15px 0;
          color: #e2e8f0;
          font-size: 16px;
        }

        .no-teams-warning,
        .insufficient-teams-warning,
        .sufficient-teams-success {
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 15px;
          font-size: 14px;
        }

        .no-teams-warning {
          background: rgba(255, 152, 0, 0.1);
          color: #ff9800;
          border: 1px solid rgba(255, 152, 0, 0.3);
        }

        .insufficient-teams-warning {
          background: rgba(255, 152, 0, 0.1);
          color: #ff9800;
          border: 1px solid rgba(255, 152, 0, 0.3);
        }

        .sufficient-teams-success {
          background: rgba(76, 175, 80, 0.1);
          color: #4caf50;
          border: 1px solid rgba(76, 175, 80, 0.3);
        }

        .assigned-teams-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .assigned-team-item {
          background: #1a2332;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 8px 12px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }

        .team-name {
          color: #e2e8f0;
          font-weight: 500;
        }

        .sport-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 10px;
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

        /* Success Page */
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

        .created-brackets-list {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }

        .created-brackets-list h4 {
          margin: 0 0 15px 0;
          text-align: center;
          color: #e2e8f0;
        }

        .bracket-summary-item {
          background: #1a2332;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #e2e8f0;
        }

        .bracket-summary-item:last-child {
          margin-bottom: 0;
        }

        .bracket-summary-item strong {
          color: #fff;
        }

        .bracket-summary-item span {
          font-size: 13px;
          color: #94a3b8;
        }

        .bracket-form-actions {
          display: flex;
          gap: 15px;
          justify-content: space-between;
        }

        .bracket-submit-btn {
          background: #2196f3;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bracket-submit-btn:hover:not(:disabled) {
          background: #1976d2;
          transform: translateY(-1px);
        }

        .bracket-submit-btn:disabled {
          background: #666;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .bracket-cancel-btn {
          background: transparent;
          color: #94a3b8;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bracket-cancel-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #e2e8f0;
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

          .teams-summary-grid {
            grid-template-columns: 1fr;
          }

          .sport-teams-grid {
            grid-template-columns: 1fr;
          }

          .bracket-config-fields {
            grid-template-columns: 1fr;
          }

          .bracket-form-actions {
            flex-direction: column;
          }

          .assigned-teams-list {
            flex-direction: column;
          }

          .bracket-summary-item {
            flex-direction: column;
            gap: 8px;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default TournamentCreator;