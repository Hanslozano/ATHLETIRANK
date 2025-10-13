import React, { useState, useEffect } from "react";
import { FaCheckCircle, FaChevronRight, FaChevronLeft } from "react-icons/fa";
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
    endDate: ""
  });
  const [createdEvent, setCreatedEvent] = useState(null);

  // Step 2: Teams Data
  const [teams, setTeams] = useState([]);
  const [currentTeam, setCurrentTeam] = useState({
    teamName: "",
    sport: "",
    players: []
  });
  const [createdTeams, setCreatedTeams] = useState([]);

  // Step 3: Bracket Data
  const [bracketData, setBracketData] = useState({
    bracketName: "",
    bracketType: "single",
    sport: "",
    selectedTeamIds: []
  });
  const [createdBracket, setCreatedBracket] = useState(null);

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

  // Step 1: Event Creation
  const handleEventInputChange = (e) => {
    const { name, value } = e.target;
    setEventData(prev => ({ ...prev, [name]: value }));
    if (validationError) setValidationError("");
  };

  const handleCreateEvent = async () => {
    if (!eventData.name.trim() || !eventData.startDate || !eventData.endDate) {
      setValidationError("Please fill in all event fields.");
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
        const newEvent = await res.json();
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
    if (createdTeams.length < 2) {
      setValidationError("You need at least 2 teams to create a bracket");
      return;
    }
    setCurrentStep(3);
    setValidationError("");
  };

  // Step 3: Bracket Creation
  const handleBracketInputChange = (e) => {
    const { name, value } = e.target;
    setBracketData(prev => ({ ...prev, [name]: value }));
    if (validationError) setValidationError("");
  };

  const handleTeamSelection = (teamId) => {
    setBracketData(prev => {
      const isSelected = prev.selectedTeamIds.includes(teamId);
      return {
        ...prev,
        selectedTeamIds: isSelected
          ? prev.selectedTeamIds.filter(id => id !== teamId)
          : [...prev.selectedTeamIds, teamId]
      };
    });
  };

  const handleCreateBracket = async () => {
    if (!bracketData.sport) {
      setValidationError("Please select a sport");
      return;
    }

    if (bracketData.selectedTeamIds.length < 2) {
      setValidationError("Please select at least 2 teams");
      return;
    }

    setLoading(true);
    try {
      // Create bracket
      const bracketRes = await fetch("http://localhost:5000/api/brackets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: createdEvent.id,
          name: bracketData.bracketName || `${createdEvent.name} - ${capitalize(bracketData.sport)} Bracket`,
          sport_type: bracketData.sport,
          elimination_type: bracketData.bracketType
        })
      });

      if (!bracketRes.ok) throw new Error("Failed to create bracket");

      const newBracket = await bracketRes.json();

      // Assign teams to bracket
      for (let team_id of bracketData.selectedTeamIds) {
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

      if (!generateRes.ok) throw new Error("Failed to generate matches");

      setCreatedBracket(newBracket);
      setCurrentStep(4);
      setValidationError("");
    } catch (err) {
      console.error("Error creating bracket:", err);
      setValidationError("Error creating bracket: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset entire process
  const handleStartNew = () => {
    setCurrentStep(1);
    setEventData({ name: "", startDate: "", endDate: "" });
    setCreatedEvent(null);
    setCurrentTeam({ teamName: "", sport: "", players: [] });
    setCreatedTeams([]);
    setBracketData({ bracketName: "", bracketType: "single", sport: "", selectedTeamIds: [] });
    setCreatedBracket(null);
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
                  <p className="step-description">Create teams for the tournament (minimum 2 teams required)</p>
                  
                  {/* Created Teams Summary */}
                  {createdTeams.length > 0 && (
                    <div className="created-teams-summary">
                      <h3>Teams Created ({createdTeams.length})</h3>
                      <div className="teams-summary-grid">
                        {createdTeams.map(team => (
                          <div key={team.id} className="team-summary-card">
                            <strong>{team.name}</strong>
                            <span className={`admin-teams-sport-badge admin-teams-sport-${team.sport.toLowerCase()}`}>
                              {capitalize(team.sport)}
                            </span>
                            <span>{team.players.length} players</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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

                    {createdTeams.length >= 2 && (
                      <div className="bracket-form-actions" style={{ marginTop: '20px', borderTop: '2px solid #e0e0e0', paddingTop: '20px' }}>
                        <button 
                          onClick={handleProceedToBracket}
                          className="bracket-submit-btn"
                          style={{ width: '100%' }}
                        >
                          Proceed to Create Bracket
                          <FaChevronRight style={{ marginLeft: '8px' }} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Create Bracket */}
            {currentStep === 3 && (
              <div className="bracket-create-section">
                <div className="bracket-form-container">
                  <h2>Step 3: Create Bracket</h2>
                  <p className="step-description">Set up the tournament bracket</p>
                  
                  <div className="bracket-form">
                    <div className="bracket-form-group">
                      <label htmlFor="bracketName">Bracket Name</label>
                      <input
                        type="text"
                        id="bracketName"
                        name="bracketName"
                        value={bracketData.bracketName}
                        onChange={handleBracketInputChange}
                        placeholder="Leave empty to auto-generate"
                      />
                    </div>

                    <div className="bracket-form-group">
                      <label htmlFor="sport">Sport *</label>
                      <select 
                        id="sport" 
                        name="sport" 
                        value={bracketData.sport} 
                        onChange={handleBracketInputChange}
                      >
                        <option value="">Select sport</option>
                        <option value="basketball">Basketball</option>
                        <option value="volleyball">Volleyball</option>
                      </select>
                    </div>

                    <div className="bracket-form-group">
                      <label htmlFor="bracketType">Bracket Type *</label>
                      <select 
                        id="bracketType" 
                        name="bracketType" 
                        value={bracketData.bracketType} 
                        onChange={handleBracketInputChange}
                      >
                        <option value="single">Single Elimination</option>
                        <option value="double">Double Elimination</option>
                      </select>
                    </div>

                    <div className="bracket-form-group">
                      <label>Select Teams * (Minimum 2 required)</label>
                      <div className="team-selection-grid">
                        {createdTeams
                          .filter(team => !bracketData.sport || team.sport.toLowerCase() === bracketData.sport.toLowerCase())
                          .map(team => (
                            <div 
                              key={team.id} 
                              className={`team-selection-card ${bracketData.selectedTeamIds.includes(team.id) ? 'selected' : ''}`}
                              onClick={() => handleTeamSelection(team.id)}
                            >
                              <input 
                                type="checkbox" 
                                checked={bracketData.selectedTeamIds.includes(team.id)}
                                onChange={() => {}}
                              />
                              <div className="team-selection-info">
                                <strong>{team.name}</strong>
                                <span className={`admin-teams-sport-badge admin-teams-sport-${team.sport.toLowerCase()}`}>
                                  {capitalize(team.sport)}
                                </span>
                                <span>{team.players.length} players</span>
                              </div>
                            </div>
                          ))}
                      </div>
                      <p className="selected-teams-count">
                        {bracketData.selectedTeamIds.length} teams selected
                      </p>
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
                        onClick={handleCreateBracket}
                        className="bracket-submit-btn"
                        disabled={loading || bracketData.selectedTeamIds.length < 2}
                      >
                        {loading ? "Creating..." : "Create Tournament"}
                      </button>
                    </div>
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
                      <strong>Teams:</strong> {createdTeams.length}
                    </div>
                    <div className="summary-item">
                      <strong>Bracket:</strong> {createdBracket?.name}
                    </div>
                    <div className="summary-item">
                      <strong>Type:</strong> {bracketData.bracketType === "single" ? "Single" : "Double"} Elimination
                    </div>
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
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }

        .created-teams-summary h3 {
          margin: 0 0 15px 0;
          font-size: 16px;
        }

        .teams-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
        }

        .team-summary-card {
          background: white;
          padding: 12px;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          font-size: 14px;
        }

        .team-selection-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 15px;
          margin: 15px 0;
        }

        .team-selection-card {
          border: 2px solid #e0e0e0;
          padding: 15px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .team-selection-card:hover {
          border-color: #2196f3;
          background: #f5f9ff;
        }

        .team-selection-card.selected {
          border-color: #2196f3;
          background: #e3f2fd;
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
          background: #f5f5f5;
          padding: 25px;
          border-radius: 8px;
          margin: 30px 0;
          text-align: left;
        }

        .tournament-summary h3 {
          margin: 0 0 20px 0;
          text-align: center;
        }

        .summary-item {
          padding: 10px 0;
          border-bottom: 1px solid #ddd;
          display: flex;
          justify-content: space-between;
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
        }
      `}</style>
    </div>
  );
};

export default TournamentCreator;