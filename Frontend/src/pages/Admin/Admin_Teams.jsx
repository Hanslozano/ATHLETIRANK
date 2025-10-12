import React, { useState, useEffect } from "react";
import "../../style/Admin_TeamPage.css";

const TeamsPage = ({ sidebarOpen }) => {
  const [activeTab, setActiveTab] = useState("create");
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    teamName: "",
    sport: "",
    players: [],
  });
  const [expandedTeams, setExpandedTeams] = useState([]);
  const [editingPlayer, setEditingPlayer] = useState(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [sportFilter, setSportFilter] = useState("all");

  // Validation states
  const [validationError, setValidationError] = useState("");
  const [showValidationMessage, setShowValidationMessage] = useState(false);

  // Position options
  const positions = {
    Basketball: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
    Volleyball: ["Setter", "Outside Hitter", "Middle Blocker", "Opposite Hitter", "Libero", "Defensive Specialist"],
  };

  // Fetch teams
  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:5000/api/teams");
        const data = await res.json();
        setTeams(data);
      } catch (err) {
        console.error("Error fetching teams:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  // Filter teams based on search term and sport filter
  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.players.some(player => 
                           player.name.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    
    const matchesSport = sportFilter === "all" || team.sport === sportFilter;
    
    return matchesSearch && matchesSport;
  });

  // Handle form inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Reset players when sport changes
    if (name === "sport") {
      setFormData(prev => ({
        ...prev,
        players: value ? [{ name: "", position: "", jerseyNumber: "" }] : [],
      }));
    }
    
    // Clear validation error when user makes changes
    if (validationError) {
      setValidationError("");
      setShowValidationMessage(false);
    }
  };

  // Player functions
  const addPlayer = () => {
    if (formData.sport && formData.players.length < 15) {
      setFormData(prev => ({
        ...prev,
        players: [...prev.players, { name: "", position: "", jerseyNumber: "" }],
      }));
      
      // Clear validation error when adding players
      if (validationError) {
        setValidationError("");
        setShowValidationMessage(false);
      }
    }
  };

  const removePlayer = (index) => {
    setFormData(prev => ({
      ...prev,
      players: prev.players.filter((_, i) => i !== index),
    }));
    
    // Clear validation error when removing players
    if (validationError) {
      setValidationError("");
      setShowValidationMessage(false);
    }
  };

  const handlePlayerChange = (index, field, value) => {
    const newPlayers = [...formData.players];
    newPlayers[index][field] = value;
    setFormData(prev => ({ ...prev, players: newPlayers }));
    
    // Clear validation error when editing players
    if (validationError) {
      setValidationError("");
      setShowValidationMessage(false);
    }
  };

  // Validate form before submission
  const validateForm = () => {
    if (!formData.teamName.trim()) {
      return "Please enter a team name";
    }
    
    if (!formData.sport) {
      return "Please select a sport";
    }
    
    const validPlayers = formData.players.filter(p => 
      p.name.trim() && p.position && p.jerseyNumber
    );
    
    if (validPlayers.length < 12) {
      return `Team must have at least 12 players. Currently you have ${validPlayers.length} valid players.`;
    }
    
    if (formData.players.length > 15) {
      return "Team cannot have more than 15 players";
    }
    
    // Check for duplicate jersey numbers
    const jerseyNumbers = validPlayers.map(p => p.jerseyNumber);
    const uniqueJerseyNumbers = new Set(jerseyNumbers);
    if (jerseyNumbers.length !== uniqueJerseyNumbers.size) {
      return "Duplicate jersey numbers found. Each player must have a unique jersey number.";
    }
    
    return null;
  };

  // Submit team
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setValidationError(validationError);
      setShowValidationMessage(true);
      return;
    }

    // Clear any previous validation errors
    setValidationError("");
    setShowValidationMessage(false);

    const validPlayers = formData.players.filter(p => 
      p.name.trim() && p.position && p.jerseyNumber
    );

    try {
      const res = await fetch("http://localhost:5000/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.teamName,
          sport: formData.sport,
          players: validPlayers,
        }),
      });
      
      if (res.ok) {
        const newTeam = await res.json();
        setTeams(prev => [...prev, newTeam]);
        setFormData({ teamName: "", sport: "", players: [] });
        setActiveTab("view");
        // Show success message (you can replace this with a toast notification)
        setValidationError("Team created successfully!");
        setShowValidationMessage(true);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setValidationError("");
          setShowValidationMessage(false);
        }, 3000);
      } else {
        setValidationError("Error creating team. Please try again.");
        setShowValidationMessage(true);
      }
    } catch (err) {
      console.error("Error creating team:", err);
      setValidationError("Error creating team. Please check your connection and try again.");
      setShowValidationMessage(true);
    }
  };

  // Delete team
  const handleDeleteTeam = async (id) => {
    if (!window.confirm("Are you sure you want to delete this team?")) return;
    
    try {
      const res = await fetch(`http://localhost:5000/api/teams/${id}`, { method: "DELETE" });
      
      if (res.ok) {
        setTeams(prev => prev.filter(team => team.id !== id));
        // Remove from expanded teams if it was expanded
        setExpandedTeams(prev => prev.filter(teamId => teamId !== id));
        // Show success message
        setValidationError("Team deleted successfully!");
        setShowValidationMessage(true);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setValidationError("");
          setShowValidationMessage(false);
        }, 3000);
      } else {
        setValidationError("Error deleting team");
        setShowValidationMessage(true);
      }
    } catch (err) {
      console.error("Error deleting team:", err);
      setValidationError("Error deleting team");
      setShowValidationMessage(true);
    }
  };

  // Edit player functions
  const startEditPlayer = (teamId, playerIndex, player) => {
    setEditingPlayer({
      teamId,
      playerIndex,
      player: { ...player }
    });
  };

  const cancelEditPlayer = () => {
    setEditingPlayer(null);
  };

  const handleEditPlayerChange = (field, value) => {
    setEditingPlayer(prev => ({
      ...prev,
      player: {
        ...prev.player,
        [field]: value
      }
    }));
  };

  const saveEditedPlayer = async () => {
    if (!editingPlayer.player.name.trim() || !editingPlayer.player.position || !editingPlayer.player.jerseyNumber) {
      setValidationError("Please fill in all player details.");
      setShowValidationMessage(true);
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/teams/${editingPlayer.teamId}/players/${editingPlayer.player.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPlayer.player),
      });

      if (res.ok) {
        const updatedPlayer = await res.json();
        
        // Update the local state
        setTeams(prev => prev.map(team => {
          if (team.id === editingPlayer.teamId) {
            const updatedPlayers = [...team.players];
            updatedPlayers[editingPlayer.playerIndex] = updatedPlayer;
            return { ...team, players: updatedPlayers };
          }
          return team;
        }));

        setEditingPlayer(null);
        setValidationError("Player updated successfully!");
        setShowValidationMessage(true);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setValidationError("");
          setShowValidationMessage(false);
        }, 3000);
      } else {
        setValidationError("Error updating player");
        setShowValidationMessage(true);
      }
    } catch (err) {
      console.error("Error updating player:", err);
      setValidationError("Error updating player");
      setShowValidationMessage(true);
    }
  };

  // Toggle team expansion
  const toggleTeamExpansion = (teamId) => {
    if (expandedTeams.includes(teamId)) {
      setExpandedTeams(expandedTeams.filter(id => id !== teamId));
    } else {
      setExpandedTeams([...expandedTeams, teamId]);
    }
  };

  // Capitalize first letter
  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  // Get valid player count
  const validPlayerCount = formData.players.filter(p => 
    p.name.trim() && p.position && p.jerseyNumber
  ).length;

  return (
    <div className="admin-dashboard">
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-header">
          <h1>Teams Management</h1>
          <p>Create and manage sports teams</p>
        </div>

         <div className="dashboard-main">
          <div className="bracket-content">
            {/* Tabs */}
            <div className="bracket-tabs">
              <button
                 className={`bracket-tab-button ${activeTab === "create" ? "bracket-tab-active" : ""}`}
                onClick={() => setActiveTab("create")}
              >
                Create Team
              </button>
              <button
               className={`bracket-tab-button ${activeTab === "view" ? "bracket-tab-active" : ""}`}
                onClick={() => setActiveTab("view")}
              >
                View Teams ({teams.length})
              </button>
            </div>

            {/* Validation Message */}
            {showValidationMessage && validationError && (
              <div className={`admin-teams-validation-message ${validationError.includes("successfully") ? "admin-teams-success" : "admin-teams-error"}`}>
                {validationError}
                <button 
                  className="admin-teams-close-message"
                  onClick={() => setShowValidationMessage(false)}
                >
                  ×
                </button>
              </div>
            )}

            {/* Create Team */}
            {activeTab === "create" && (
              <div className="admin-teams-create-section">
                <div className="admin-teams-form-container">
                  <h2>Create New Team</h2>
                  <form className="admin-teams-form" onSubmit={handleSubmit}>
                    {/* Team Name */}
                    <div className="admin-teams-form-group">
                      <label htmlFor="teamName">Team Name *</label>
                      <input
                        type="text"
                        id="teamName"
                        name="teamName"
                        value={formData.teamName}
                        onChange={handleInputChange}
                        placeholder="Enter team name"
                        required
                      />
                    </div>

                    {/* Sport Selection */}
                    <div className="admin-teams-form-group">
                      <label htmlFor="sport">Sport *</label>
                      <select
                        id="sport"
                        name="sport"
                        value={formData.sport}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select a sport</option>
                        {Object.keys(positions).map((sport) => (
                          <option key={sport} value={sport}>{sport}</option>
                        ))}
                      </select>
                    </div>

                    {/* Players Section */}
                    {formData.sport && (
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
                            disabled={formData.players.length >= 15}
                          >
                            Add Player
                          </button>
                        </div>

                        {formData.players.length >= 15 && (
                          <div className="admin-teams-max-players-message">
                            Maximum of 15 players reached
                          </div>
                        )}

                        {formData.players.map((player, index) => (
                          <div key={index} className="admin-teams-player-card">
                            <div className="admin-teams-player-input-row">
                              <input
                                type="text"
                                placeholder="Player name"
                                value={player.name}
                                onChange={(e) => handlePlayerChange(index, "name", e.target.value)}
                                required
                                className="admin-teams-player-name-input"
                              />
                              <input
                                type="text"
                                placeholder="Jersey #"
                                value={player.jerseyNumber}
                                onChange={(e) => handlePlayerChange(index, "jerseyNumber", e.target.value)}
                                required
                                className="admin-teams-jersey-input"
                                maxLength="10"
                              />
                              <select
                                value={player.position}
                                onChange={(e) => handlePlayerChange(index, "position", e.target.value)}
                                required
                                className="admin-teams-position-select"
                              >
                                <option value="">Select position</option>
                                {positions[formData.sport].map(pos => (
                                  <option key={pos} value={pos}>{pos}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="admin-teams-delete-btn"
                                onClick={() => removePlayer(index)}
                                disabled={formData.players.length === 1}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}

                        {formData.players.length === 0 && (
                          <div className="admin-teams-no-players-message">
                            Please add at least 12 players to create a team
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="admin-teams-form-actions">
                      <button 
                        type="submit" 
                        className="admin-teams-submit-btn"
                        disabled={validPlayerCount < 12 || formData.players.length > 15}
                      >
                        Create Team
                      </button>
                      <button
                        type="button"
                        className="admin-teams-cancel-btn"
                        onClick={() => {
                          setFormData({ teamName: "", sport: "", players: [] });
                          setValidationError("");
                          setShowValidationMessage(false);
                        }}
                      >
                        Clear Form
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* View Teams */}
            {activeTab === "view" && (
              <div className="admin-teams-view-section">
                <h2>All Teams</h2>
                
                {/* Search and Filter Section */}
                <div className="admin-teams-search-filter">
                  <div className="admin-teams-search-box">
                    <input
                      type="text"
                      placeholder="Search teams or players..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="admin-teams-search-input"
                    />
                  </div>
                  
                  <div className="admin-teams-filter-controls">
                    <select
                      value={sportFilter}
                      onChange={(e) => setSportFilter(e.target.value)}
                      className="admin-teams-sport-filter"
                    >
                      <option value="all">All Sports</option>
                      <option value="Basketball">Basketball</option>
                      <option value="Volleyball">Volleyball</option>
                    </select>
                  </div>
                </div>

                {/* Results Count */}
                <div className="admin-teams-results-info">
                  <p>
                    Showing {filteredTeams.length} of {teams.length} teams
                    {(searchTerm || sportFilter !== "all") && (
                      <span className="admin-teams-filter-indicator">
                        {searchTerm && ` • Searching: "${searchTerm}"`}
                        {sportFilter !== "all" && ` • Sport: ${sportFilter}`}
                      </span>
                    )}
                  </p>
                </div>

                {loading ? (
                  <p>Loading teams...</p>
                ) : filteredTeams.length === 0 ? (
                  <div className="admin-teams-no-teams">
                    {teams.length === 0 ? (
                      <>
                        <p>No teams created yet. Create your first team!</p>
                        <button 
                          className="admin-teams-submit-btn" 
                          onClick={() => setActiveTab("create")}
                        >
                          Create Team
                        </button>
                      </>
                    ) : (
                      <>
                        <p>No teams match your search criteria.</p>
                        <button 
                          className="admin-teams-submit-btn" 
                          onClick={() => {
                            setSearchTerm("");
                            setSportFilter("all");
                          }}
                        >
                          Clear Search
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="admin-teams-grid">
                    {filteredTeams.map(team => {
                      const isExpanded = expandedTeams.includes(team.id);
                      const teamSport = team.sport || 'basketball';
                      
                      return (
                        <div key={team.id} className="admin-teams-card">
                          <div className="admin-teams-card-header">
                            <h3>{team.name}</h3>
                            <span className={`admin-teams-sport-badge admin-teams-sport-${teamSport.toLowerCase()}`}>
                              {capitalize(teamSport)}
                            </span>
                          </div>
                          <div className="admin-teams-card-info">
                            <div><strong>Players:</strong> {team.players.length}</div>
                            <div className="admin-teams-players-list">
                              {team.players.slice(0, isExpanded ? team.players.length : 3).map((player, i) => {
                                const isEditing = editingPlayer && 
                                                editingPlayer.teamId === team.id && 
                                                editingPlayer.playerIndex === i;
                                
                                return isEditing ? (
                                  // Edit Player Form
                                  <div key={i} className="admin-teams-player-edit-form">
                                    <div className="admin-teams-player-edit-inputs">
                                      <input
                                        type="text"
                                        value={editingPlayer.player.name}
                                        onChange={(e) => handleEditPlayerChange("name", e.target.value)}
                                        className="admin-teams-player-edit-input"
                                        placeholder="Player name"
                                      />
                                      <input
                                        type="text"
                                        value={editingPlayer.player.jerseyNumber || editingPlayer.player.jersey_number}
                                        onChange={(e) => handleEditPlayerChange("jerseyNumber", e.target.value)}
                                        className="admin-teams-player-edit-input admin-teams-jersey-edit"
                                        placeholder="Jersey #"
                                        maxLength="10"
                                      />
                                      <select
                                        value={editingPlayer.player.position}
                                        onChange={(e) => handleEditPlayerChange("position", e.target.value)}
                                        className="admin-teams-player-edit-select"
                                      >
                                        <option value="">Select position</option>
                                        {positions[teamSport]?.map(pos => (
                                          <option key={pos} value={pos}>{pos}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="admin-teams-player-edit-actions">
                                      <button 
                                        className="admin-teams-submit-btn admin-teams-save-btn"
                                        onClick={saveEditedPlayer}
                                      >
                                        Save
                                      </button>
                                      <button 
                                        className="admin-teams-cancel-btn"
                                        onClick={cancelEditPlayer}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  // Player Display
                                  <div key={i} className="admin-teams-player-item">
                                    <span className="admin-teams-jersey-number">#{player.jersey_number || player.jerseyNumber}</span>
                                    <span className="admin-teams-player-name">{player.name}</span>
                                    <span className="admin-teams-player-position">({player.position})</span>
                                    <button
                                      className="admin-teams-edit-player-btn"
                                      onClick={() => startEditPlayer(team.id, i, player)}
                                      title="Edit player"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                );
                              })}
                              {!isExpanded && team.players.length > 3 && (
                                <div className="admin-teams-more-players">+{team.players.length - 3} more players</div>
                              )}
                            </div>
                          </div>
                          <div className="admin-teams-card-actions">
                            <button
                              className="admin-teams-view-btn"
                              onClick={() => toggleTeamExpansion(team.id)}
                            >
                              {isExpanded ? 'Show Less' : 'View All Players'}
                            </button>
                            <button
                              className="admin-teams-delete-btn"
                              onClick={() => handleDeleteTeam(team.id)}
                            >
                              Delete Team
                            </button>
                          </div>
                        </div>
                      );
                    })}
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

export default TeamsPage;