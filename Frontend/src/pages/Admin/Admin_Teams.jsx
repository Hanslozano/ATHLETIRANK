import React, { useState, useEffect } from "react";
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaEye, FaChevronLeft, FaChevronRight, FaSearch } from "react-icons/fa";
import "../../style/Admin_TeamPage.css";

const TeamsPage = ({ sidebarOpen }) => {
  const [activeTab, setActiveTab] = useState("view");
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    teamName: "",
    sport: "",
    players: [],
  });
  const [viewModal, setViewModal] = useState({ show: false, team: null });
  const [editingTeamName, setEditingTeamName] = useState(null);
  const [editingPlayer, setEditingPlayer] = useState(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [sportFilter, setSportFilter] = useState("all");

  // Validation states
  const [validationError, setValidationError] = useState("");
  const [showValidationMessage, setShowValidationMessage] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: '', id: null, name: '' });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Check for stored sport filter on component mount
  useEffect(() => {
    const storedSportFilter = sessionStorage.getItem('teamSportFilter');
    if (storedSportFilter) {
      setSportFilter(storedSportFilter);
      // Clear the stored filter so it doesn't persist on refresh
      sessionStorage.removeItem('teamSportFilter');
    }
  }, []);

  // Position options
  const positions = {
    Basketball: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
    Volleyball: ["Setter", "Outside Hitter", "Middle Blocker", "Opposite Hitter", "Libero", "Defensive Specialist"],
  };

  // Position limits - Maximum 3 per position
  const getPositionLimits = (teamSize, sport) => {
    const limits = {};
    if (sport === "Basketball") {
      positions.Basketball.forEach(position => {
        limits[position] = 3;
      });
    } else if (sport === "Volleyball") {
      positions.Volleyball.forEach(position => {
        limits[position] = 3;
      });
    }
    return limits;
  };

  // Get available positions for a player based on current team composition
  const getAvailablePositions = (currentIndex) => {
    if (!formData.sport) return [];

    const positionLimits = getPositionLimits(formData.players.length, formData.sport);
    const positionCounts = {};
    
    // Count current assignments (excluding the current player being edited)
    formData.players.forEach((player, index) => {
      if (index !== currentIndex && player.position) {
        positionCounts[player.position] = (positionCounts[player.position] || 0) + 1;
      }
    });

    // Filter positions that haven't reached their limit
    return positions[formData.sport].filter(position => {
      const currentCount = positionCounts[position] || 0;
      const maxAllowed = positionLimits[position] || 0;
      return currentCount < maxAllowed;
    });
  };

  // Check if a position is available
  const isPositionAvailable = (position, currentIndex) => {
    if (!formData.sport || !position) return true;
    
    const availablePositions = getAvailablePositions(currentIndex);
    return availablePositions.includes(position);
  };

  // Get position count display
  const getPositionCounts = () => {
    if (!formData.sport) return {};
    
    const positionLimits = getPositionLimits(formData.players.length, formData.sport);
    const positionCounts = {};
    
    formData.players.forEach(player => {
      if (player.position) {
        positionCounts[player.position] = (positionCounts[player.position] || 0) + 1;
      }
    });

    const result = {};
    positions[formData.sport].forEach(position => {
      result[position] = {
        current: positionCounts[position] || 0,
        max: positionLimits[position] || 0
      };
    });
    
    return result;
  };

  // Fetch teams with brackets
  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:5000/api/teams");
        const data = await res.json();
        
        // Fetch bracket information for each team
        const teamsWithBrackets = await Promise.all(
          data.map(async (team) => {
            try {
              const bracketRes = await fetch(`http://localhost:5000/api/teams/${team.id}/brackets`);
              const brackets = await bracketRes.json();
              return { ...team, brackets: brackets || [] };
            } catch (err) {
              console.error(`Error fetching brackets for team ${team.id}:`, err);
              return { ...team, brackets: [] };
            }
          })
        );
        
        setTeams(teamsWithBrackets);
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

  // Pagination calculations
  const totalTeams = filteredTeams.length;
  const totalPages = Math.ceil(totalTeams / itemsPerPage);
  const indexOfLastTeam = currentPage * itemsPerPage;
  const indexOfFirstTeam = indexOfLastTeam - itemsPerPage;
  const currentTeams = filteredTeams.slice(indexOfFirstTeam, indexOfLastTeam);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sportFilter, itemsPerPage]);

  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Handle form inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // When sport is selected, create exactly 12 empty player slots
    if (name === "sport" && value) {
      setFormData(prev => ({
        ...prev,
        players: Array.from({ length: 12 }, () => ({ 
          name: "", 
          position: "", 
          jerseyNumber: "" 
        }))
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
      
      if (validationError) {
        setValidationError("");
        setShowValidationMessage(false);
      }
    }
  };

  const removePlayer = (index) => {
    if (formData.players.length > 12) {
      setFormData(prev => ({
        ...prev,
        players: prev.players.filter((_, i) => i !== index),
      }));
      
      if (validationError) {
        setValidationError("");
        setShowValidationMessage(false);
      }
    }
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
    
    const newPlayers = [...formData.players];
    
    // If changing position, validate it's available
    if (field === "position") {
      if (!isPositionAvailable(finalValue, index)) {
        setValidationError(`Cannot assign more than ${getPositionLimits(formData.players.length, formData.sport)[finalValue]} players to ${finalValue}`);
        setShowValidationMessage(true);
        return;
      }
    }
    
    newPlayers[index][field] = finalValue;
    setFormData(prev => ({ ...prev, players: newPlayers }));
    
    // Clear validation error if it was about position limits
    if (field === "position" && validationError && validationError.includes("Cannot assign more than")) {
      setValidationError("");
      setShowValidationMessage(false);
    }
    
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
    
    // Check for invalid player names (must be letters only)
    const invalidNames = validPlayers.filter(p => {
      return !/^[a-zA-Z\s-]+$/.test(p.name.trim());
    });
    if (invalidNames.length > 0) {
      return "Player names must contain only letters and spaces. Please check all player names.";
    }
    
    // Check for invalid jersey numbers (must be numbers only)
    const invalidJerseys = validPlayers.filter(p => {
      return !/^\d+$/.test(p.jerseyNumber.trim());
    });
    if (invalidJerseys.length > 0) {
      return "Jersey numbers must contain only numbers. Please check all jersey numbers.";
    }
    
    const jerseyNumbers = validPlayers.map(p => p.jerseyNumber);
    const uniqueJerseyNumbers = new Set(jerseyNumbers);
    if (jerseyNumbers.length !== uniqueJerseyNumbers.size) {
      return "Duplicate jersey numbers found. Each player must have a unique jersey number.";
    }
    
    // Check position limits (maximum 3 per position)
    const positionCounts = {};
    validPlayers.forEach(player => {
      positionCounts[player.position] = (positionCounts[player.position] || 0) + 1;
    });
    
    const positionLimits = getPositionLimits(formData.players.length, formData.sport);
    for (const [position, count] of Object.entries(positionCounts)) {
      const maxAllowed = positionLimits[position];
      if (maxAllowed && count > maxAllowed) {
        return `Too many players assigned to ${position}. Maximum allowed is ${maxAllowed} per position.`;
      }
    }
    
    return null;
  };

  // Submit team
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setValidationError(validationError);
      setShowValidationMessage(true);
      return;
    }

    setValidationError("");
    setShowValidationMessage(false);

    const validPlayers = formData.players.filter(p => 
      p.name.trim() && p.position && p.jerseyNumber
    );

    // Trim all player data before submitting
    const trimmedPlayers = validPlayers.map(player => ({
      name: player.name.trim(),
      position: player.position,
      jerseyNumber: player.jerseyNumber.trim()
    }));

    try {
      const res = await fetch("http://localhost:5000/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.teamName.trim(),
          sport: formData.sport,
          players: trimmedPlayers,
        }),
      });
      
      if (res.ok) {
        const newTeam = await res.json();
        setTeams(prev => [...prev, newTeam]);
        setFormData({ teamName: "", sport: "", players: [] });
        setActiveTab("view");
        setValidationError("Team created successfully!");
        setShowValidationMessage(true);
        
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

  // Open view modal
  const openViewModal = (team) => {
    setViewModal({ show: true, team: { ...team } });
    setEditingTeamName(null);
    setEditingPlayer(null);
  };

  // Close view modal
  const closeViewModal = () => {
    setViewModal({ show: false, team: null });
    setEditingTeamName(null);
    setEditingPlayer(null);
  };

  // Edit team name in modal
  const startEditTeamName = () => {
    setEditingTeamName(viewModal.team.name);
  };

  const cancelEditTeamName = () => {
    setEditingTeamName(null);
  };

  const saveTeamName = async () => {
    if (!editingTeamName.trim()) {
      setValidationError("Team name cannot be empty");
      setShowValidationMessage(true);
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/teams/${viewModal.team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingTeamName }),
      });

      if (res.ok) {
        const updatedTeam = await res.json();
        setTeams(prev => prev.map(team => 
          team.id === viewModal.team.id ? { ...team, name: updatedTeam.name } : team
        ));
        setViewModal(prev => ({ ...prev, team: { ...prev.team, name: updatedTeam.name } }));
        setEditingTeamName(null);
        setValidationError("Team name updated successfully!");
        setShowValidationMessage(true);
        
        setTimeout(() => {
          setValidationError("");
          setShowValidationMessage(false);
        }, 3000);
      } else {
        setValidationError("Error updating team name");
        setShowValidationMessage(true);
      }
    } catch (err) {
      console.error("Error updating team:", err);
      setValidationError("Error updating team name");
      setShowValidationMessage(true);
    }
  };

  // Edit player in modal
  const startEditPlayer = (index) => {
    setEditingPlayer({
      index,
      player: { ...viewModal.team.players[index] }
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
      const res = await fetch(`http://localhost:5000/api/teams/${viewModal.team.id}/players/${editingPlayer.player.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPlayer.player),
      });

      if (res.ok) {
        const updatedPlayer = await res.json();
        
        // Update teams state
        setTeams(prev => prev.map(team => {
          if (team.id === viewModal.team.id) {
            const updatedPlayers = [...team.players];
            updatedPlayers[editingPlayer.index] = updatedPlayer;
            return { ...team, players: updatedPlayers };
          }
          return team;
        }));

        // Update modal state
        setViewModal(prev => {
          const updatedPlayers = [...prev.team.players];
          updatedPlayers[editingPlayer.index] = updatedPlayer;
          return { ...prev, team: { ...prev.team, players: updatedPlayers } };
        });

        setEditingPlayer(null);
        setValidationError("Player updated successfully!");
        setShowValidationMessage(true);
        
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

  // Delete team
  const handleDeleteTeam = async (team) => {
    try {
      // First check if team is used anywhere
      const checkRes = await fetch(`http://localhost:5000/api/teams/${team.id}/usage`);
      const usageData = await checkRes.json();
      
      if (usageData.totalUsage > 0) {
        // Get detailed usage information
        const detailsRes = await fetch(`http://localhost:5000/api/teams/${team.id}/usage-details`);
        const usageDetails = await detailsRes.json();
        
        let errorMessage = `Cannot delete team "${team.name}" because it is currently used in:\n\n`;
        
        if (usageDetails.winnerBrackets.length > 0) {
          errorMessage += `• Winner of ${usageDetails.winnerBrackets.length} bracket(s)\n`;
        }
        
        if (usageDetails.teamMatches.length > 0) {
          errorMessage += `• Participant in ${usageDetails.teamMatches.length} match(es)\n`;
        }
        
        if (usageDetails.bracketRegistrations.length > 0) {
          errorMessage += `• Registered in ${usageDetails.bracketRegistrations.length} bracket(s)\n`;
        }
        
        errorMessage += "\nPlease remove the team from all brackets and matches first.";
        
        setValidationError(errorMessage);
        setShowValidationMessage(true);
        return;
      }

      // If no usage, proceed with deletion confirmation
      setDeleteConfirm({
        show: true,
        type: 'team',
        id: team.id,
        name: team.name
      });
    } catch (err) {
      console.error("Error checking team usage:", err);
      setValidationError("Error checking team usage. Please try again.");
      setShowValidationMessage(true);
    }
  };

  const confirmDelete = async () => {
    const { type, id } = deleteConfirm;
    
    try {
      const res = await fetch(`http://localhost:5000/api/teams/${id}`, { 
        method: "DELETE" 
      });
      
      if (res.ok) {
        setTeams(prev => prev.filter(team => team.id !== id));
        setValidationError("Team deleted successfully!");
        setShowValidationMessage(true);
        
        // Close modal if we're viewing the deleted team
        if (viewModal.show && viewModal.team.id === id) {
          closeViewModal();
        }
        
        setTimeout(() => {
          setValidationError("");
          setShowValidationMessage(false);
        }, 3000);
      } else {
        const errorData = await res.json();
        setValidationError(errorData.error || "Error deleting team");
        setShowValidationMessage(true);
      }
    } catch (err) {
      console.error("Error deleting team:", err);
      setValidationError("Error deleting team. Please try again.");
      setShowValidationMessage(true);
    }
    
    setDeleteConfirm({ show: false, type: '', id: null, name: '' });
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
                className={`bracket-tab-button ${activeTab === "view" ? "bracket-tab-active" : ""}`}
                onClick={() => setActiveTab("view")}
              >
                View Teams ({teams.length})
              </button>
              <button
                className={`bracket-tab-button ${activeTab === "create" ? "bracket-tab-active" : ""}`}
                onClick={() => setActiveTab("create")}
              >
                Create Team
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

            {/* View Teams */}
            {activeTab === "view" && (
              <div className="bracket-view-section purple-background">
                {/* Updated Search Container - Matching Events Page Style */}
                <div style={{ 
                  background: '#1a2332', 
                  padding: '24px', 
                  borderRadius: '12px', 
                  marginBottom: '24px', 
                  border: '1px solid #2d3748' 
                }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search Input with Icon */}
                    <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
                      <FaSearch style={{ 
                        position: 'absolute', 
                        left: '12px', 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        color: '#64748b', 
                        width: '18px', 
                        height: '18px' 
                      }} />
                      <input 
                        type="text" 
                        placeholder="Search teams or players..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        style={{ 
                          width: '100%', 
                          padding: '12px 16px 12px 45px', 
                          border: '2px solid #2d3748', 
                          borderRadius: '10px', 
                          fontSize: '14px', 
                          backgroundColor: '#0f172a', 
                          color: '#e2e8f0', 
                          outline: 'none',
                          fontWeight: '500'
                        }} 
                      />
                    </div>

                    {/* Sport Filter */}
                    <select 
                      value={sportFilter} 
                      onChange={(e) => setSportFilter(e.target.value)} 
                      style={{ 
                        padding: '12px 16px', 
                        border: '2px solid #2d3748', 
                        borderRadius: '10px', 
                        fontSize: '14px', 
                        backgroundColor: '#0f172a', 
                        color: '#e2e8f0', 
                        minWidth: '150px', 
                        outline: 'none',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">All Sports</option>
                      <option value="Basketball">Basketball</option>
                      <option value="Volleyball">Volleyball</option>
                    </select>

                    {/* Create Team Button */}
                    <button 
                      className="awards_standings_export_btn" 
                      onClick={() => setActiveTab("create")}
                      style={{ 
                        padding: '12px 24px', 
                        border: 'none', 
                        borderRadius: '10px', 
                        fontSize: '14px', 
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                        color: 'white', 
                        cursor: 'pointer', 
                        fontWeight: '700', 
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
                      }}
                    >
                      <FaPlus /> Create Team
                    </button>
                  </div>
                </div>

                {/* Results Info & Items Per Page */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {(searchTerm || sportFilter !== "all") && (
                      <>
                        Showing {currentTeams.length} of {totalTeams} results
                        {searchTerm && <span style={{ color: 'var(--primary-color)', marginLeft: '5px' }}> • Searching: "{searchTerm}"</span>}
                        {sportFilter !== "all" && <span style={{ color: 'var(--primary-color)', marginLeft: '5px' }}> • Sport: {sportFilter}</span>}
                      </>
                    )}
                    {!searchTerm && sportFilter === "all" && (
                      <>Showing {indexOfFirstTeam + 1}-{Math.min(indexOfLastTeam, totalTeams)} of {totalTeams} teams</>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Show:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      style={{
                        padding: '8px 12px',
                        border: '2px solid var(--border-color)',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'var(--background-secondary)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>per page</span>
                  </div>
                </div>

                {loading ? (
                  <div className="awards_standings_loading">
                    <div className="awards_standings_spinner"></div>
                    <p>Loading teams...</p>
                  </div>
                ) : totalTeams === 0 ? (
                  <div className="bracket-no-brackets">
                    {teams.length === 0 ? (
                      <>
                        <p>No teams created yet. Create your first team!</p>
                        <button 
                          className="bracket-view-btn" 
                          onClick={() => setActiveTab("create")}
                        >
                          Create Team
                        </button>
                      </>
                    ) : (
                      <>
                        <p>No teams match your search criteria.</p>
                        <button 
                          className="bracket-view-btn" 
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
                  <>
                    <div className="awards_standings_table_container">
                      <table className="awards_standings_table">
                        <thead>
                          <tr>
                            <th style={{ fontSize: '15px', minWidth: '200px' }}>Team Name</th>
                            <th style={{ fontSize: '15px' }}>Sport</th>
                            <th style={{ fontSize: '15px' }}>Players</th>
                            <th style={{ fontSize: '15px' }}>Brackets</th>
                            <th style={{ textAlign: 'center', width: '180px', fontSize: '15px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentTeams.map(team => {
                            const teamSport = team.sport || 'Basketball';
                            
                            return (
                              <tr key={team.id}>
                                <td style={{ fontWeight: '600', fontSize: '16px' }}>
                                  {team.name}
                                </td>
                                <td>
                                  <span className={`bracket-sport-badge ${teamSport === 'Volleyball' ? 'bracket-sport-volleyball' : 'bracket-sport-basketball'}`} style={{ fontSize: '13px', padding: '8px 14px' }}>
                                    {teamSport}
                                  </span>
                                </td>
                                <td style={{ fontSize: '15px', fontWeight: '600' }}>{team.players.length}</td>
                               <td>
  {team.brackets && team.brackets.length > 0 ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {team.brackets.map((bracket, idx) => {
        // Extract just the bracket name part (after last dash)
        const fullBracketName = bracket.bracket_name;
        const bracketNameOnly = fullBracketName.includes(' - ')
          ? fullBracketName.split(' - ').pop()
          : fullBracketName;
        
        return (
          <span 
            key={idx}
            className="admin-teams-bracket-badge"
            title={`${bracket.event_name} - ${fullBracketName}`}
          >
            {bracket.event_name} - {bracketNameOnly}
          </span>
        );
      })}
    </div>
  ) : (
    <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Not in any bracket</span>
  )}
</td>

                                <td>
                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button
                                      onClick={() => openViewModal(team)}
                                      className="bracket-view-btn"
                                      style={{ fontSize: '13px', padding: '8px 12px', flex: '1 1 auto', minWidth: '45px' }}
                                      title="View All Players"
                                    >
                                      <FaEye />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTeam(team)}
                                      className="bracket-view-btn"
                                      style={{ fontSize: '13px', padding: '8px 12px', background: 'var(--error-color)', flex: '1 1 auto', minWidth: '45px' }}
                                      title="Delete Team"
                                    >
                                      <FaTrash />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '30px',
                        padding: '20px',
                        background: 'var(--background-secondary)',
                        borderRadius: '8px',
                        flexWrap: 'wrap',
                        gap: '15px'
                      }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                          Page {currentPage} of {totalPages}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <button
                            onClick={goToPrevPage}
                            disabled={currentPage === 1}
                            style={{
                              padding: '10px 16px',
                              background: currentPage === 1 ? 'var(--text-muted)' : 'var(--primary-color)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '14px',
                              opacity: currentPage === 1 ? 0.5 : 1,
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <FaChevronLeft /> Previous
                          </button>

                          {/* Page Numbers */}
                          <div style={{ display: 'flex', gap: '5px' }}>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }

                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => goToPage(pageNum)}
                                  style={{
                                    padding: '10px 14px',
                                    background: currentPage === pageNum ? 'var(--primary-color)' : 'var(--background-card)',
                                    color: currentPage === pageNum ? 'white' : 'var(--text-primary)',
                                    border: currentPage === pageNum ? 'none' : '2px solid var(--border-color)',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: currentPage === pageNum ? '600' : '400',
                                    minWidth: '40px',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages}
                            style={{
                              padding: '10px 16px',
                              background: currentPage === totalPages ? 'var(--text-muted)' : 'var(--primary-color)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '14px',
                              opacity: currentPage === totalPages ? 0.5 : 1,
                              transition: 'all 0.2s ease'
                            }}
                          >
                            Next <FaChevronRight />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
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
                          <h3>Players ({formData.players.length}/15)</h3>
                          <div className="admin-teams-player-count">
                            {validPlayerCount} / 12-15 players
                            {validPlayerCount < 12 && (
                              <span className="admin-teams-count-warning"> (Minimum 12 required)</span>
                            )}
                            {validPlayerCount >= 12 && validPlayerCount <= 15 && (
                              <span className="admin-teams-count-success"> ✓ Valid team size</span>
                            )}
                          </div>
                        </div>

                        {/* Position Limits Display */}
                        <div className="position-limits-display">
                          <h4>Position Limits (Maximum 3 per position)</h4>
                          <div className="position-limits-grid">
                            {Object.entries(getPositionCounts()).map(([position, counts]) => (
                              <div key={position} className="position-limit-item">
                                <span className="position-name">{position}</span>
                                <span className={`position-count ${counts.current >= counts.max ? 'limit-reached' : ''}`}>
                                  {counts.current}/{counts.max}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {formData.players.map((player, index) => (
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
                                className={`admin-teams-position-select ${
                                  !isPositionAvailable(player.position, index) ? 'position-unavailable' : ''
                                }`}
                              >
                                <option value="">Select position</option>
                                {getAvailablePositions(index).map(pos => (
                                  <option key={pos} value={pos}>{pos}</option>
                                ))}
                              </select>
                              {formData.players.length > 12 && (
                                <button
                                  type="button"
                                  className="remove-player-btn"
                                  onClick={() => removePlayer(index)}
                                  title="Remove player"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                            {/* Position availability warning */}
                            {player.position && !isPositionAvailable(player.position, index) && (
                              <div className="position-warning">
                                Maximum {getPositionLimits(formData.players.length, formData.sport)[player.position]} {player.position} players allowed
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Add More Players Button */}
                        {formData.players.length < 15 && (
                          <div className="add-players-section">
                            <button
                              type="button"
                              className="add-player-btn"
                              onClick={addPlayer}
                            >
                              <FaPlus style={{ marginRight: '8px' }} />
                              Add More Players ({15 - formData.players.length} slots available)
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
                          fontSize: '14px',
                          color: '#93c5fd'
                        }}>
                          <strong>Note:</strong> Minimum 12 players required, maximum 15 players allowed. No duplicate jersey numbers allowed. Player names must contain only letters and spaces. 
                          <br />
                          <strong>Position Limits:</strong> Maximum 3 players per position. Not all positions need to be filled.
                        </div>
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
          </div>
        </div>
      </div>

      {/* View Team Modal - Updated to match Events edit modal design */}
      {viewModal.show && viewModal.team && (
        <div 
          onClick={closeViewModal}
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0, 0, 0, 0.7)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 9999, 
            padding: '20px' 
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              background: 'var(--background-card)', 
              borderRadius: '12px', 
              width: '100%', 
              maxWidth: '800px', 
              border: '1px solid var(--border-color)', 
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)' 
            }}
          >
            {/* Modal Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '24px', 
              borderBottom: '1px solid var(--border-color)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <FaEye style={{ width: '24px', height: '24px', color: 'var(--primary-color)' }} />
                {editingTeamName !== null ? (
                  <>
                    <input
                      type="text"
                      value={editingTeamName}
                      onChange={(e) => setEditingTeamName(e.target.value)}
                      style={{ 
                        flex: '1',
                        padding: '8px 12px',
                        border: '2px solid var(--border-color)',
                        borderRadius: '6px',
                        fontSize: '16px',
                        fontWeight: '600',
                        background: 'var(--background-secondary)',
                        color: 'var(--text-primary)',
                        outline: 'none'
                      }}
                      autoFocus
                    />
                    <button 
                      onClick={saveTeamName} 
                      style={{ 
                        background: 'var(--success-color)', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '6px', 
                        padding: '8px 12px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}
                    >
                      <FaSave /> Save
                    </button>
                    <button 
                      onClick={cancelEditTeamName} 
                      style={{ 
                        background: 'var(--text-muted)', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '6px', 
                        padding: '8px 12px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}
                    >
                      <FaTimes /> Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '24px', fontWeight: '600' }}>
                      {viewModal.team.name}
                    </h2>
                    <button 
                      onClick={startEditTeamName} 
                      style={{ 
                        background: 'var(--primary-color)', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '6px', 
                        padding: '8px 12px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}
                    >
                      <FaEdit /> Edit Name
                    </button>
                  </>
                )}
              </div>
              <button 
                onClick={closeViewModal}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-muted)', 
                  cursor: 'pointer', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  transition: 'all 0.2s ease' 
                }}
              >
                <FaTimes style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
            
            {/* Team Info */}
            <div style={{ 
              background: 'rgba(72, 187, 120, 0.1)', 
              padding: '16px 24px', 
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              flexWrap: 'wrap'
            }}>
              <span className={`bracket-sport-badge ${viewModal.team.sport === 'Volleyball' ? 'bracket-sport-volleyball' : 'bracket-sport-basketball'}`}>
                {viewModal.team.sport}
              </span>
              <span style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600' }}>
                <strong>{viewModal.team.players.length}</strong> Players
              </span>
              {viewModal.team.brackets && viewModal.team.brackets.length > 0 && (
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  <strong>{viewModal.team.brackets.length}</strong> Brackets
                </span>
              )}
            </div>

            {/* Brackets List */}
            {viewModal.team.brackets && viewModal.team.brackets.length > 0 && (
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
                  Active Brackets
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {viewModal.team.brackets.map((bracket, idx) => {
                    const fullBracketName = bracket.bracket_name;
                    const bracketNameOnly = fullBracketName.includes(' - ')
                      ? fullBracketName.split(' - ').pop()
                      : fullBracketName;
                    
                    return (
                      <div 
                        key={idx}
                        style={{
                          background: 'var(--background-secondary)',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px' }}>
                          {bracket.event_name}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                          {bracketNameOnly}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Players List */}
            <div style={{ padding: '24px', maxHeight: '400px', overflowY: 'auto' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
                Players List
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {viewModal.team.players.map((player, index) => {
                  const isEditing = editingPlayer && editingPlayer.index === index;
                  const teamSport = viewModal.team.sport || 'Basketball';
                  
                  return isEditing ? (
                    <div 
                      key={index} 
                      style={{
                        background: 'var(--primary-color)',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid rgba(59, 130, 246, 0.3)'
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: '10px', alignItems: 'end' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'white', fontWeight: '600' }}>Name *</label>
                          <input
                            type="text"
                            value={editingPlayer.player.name}
                            onChange={(e) => handleEditPlayerChange("name", e.target.value)}
                            placeholder="Player name"
                            style={{ 
                              width: '100%', 
                              padding: '8px 12px', 
                              border: '1px solid white', 
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.9)',
                              color: 'var(--text-primary)'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'white', fontWeight: '600' }}>Jersey # *</label>
                          <input
                            type="text"
                            value={editingPlayer.player.jerseyNumber || editingPlayer.player.jersey_number}
                            onChange={(e) => handleEditPlayerChange("jerseyNumber", e.target.value)}
                            placeholder="Jersey #"
                            maxLength="10"
                            style={{ 
                              width: '100%', 
                              padding: '8px 12px', 
                              border: '1px solid white', 
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.9)',
                              color: 'var(--text-primary)'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'white', fontWeight: '600' }}>Position *</label>
                          <select
                            value={editingPlayer.player.position}
                            onChange={(e) => handleEditPlayerChange("position", e.target.value)}
                            style={{ 
                              width: '100%', 
                              padding: '8px 12px', 
                              border: '1px solid white', 
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.9)',
                              color: 'var(--text-primary)'
                            }}
                          >
                            <option value="">Select position</option>
                            {positions[teamSport]?.map(pos => (
                              <option key={pos} value={pos}>{pos}</option>
                            ))}
                          </select>
                        </div>
                        <button 
                          onClick={saveEditedPlayer} 
                          style={{ 
                            padding: '8px 16px',
                            background: 'var(--success-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                            height: 'fit-content',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <FaSave /> Save
                        </button>
                        <button 
                          onClick={cancelEditPlayer} 
                          style={{ 
                            padding: '8px 16px',
                            background: 'var(--text-muted)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                            height: 'fit-content',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <FaTimes /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      key={index} 
                      style={{
                        background: 'var(--background-secondary)',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px'
                      }}
                    >
                      <span 
                        style={{ 
                          background: 'var(--primary-color)', 
                          color: 'white', 
                          width: '36px', 
                          height: '36px', 
                          borderRadius: '8px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontWeight: '700',
                          fontSize: '14px'
                        }}
                      >
                        #{player.jersey_number || player.jerseyNumber}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '16px' }}>
                          {player.name}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
                          {player.position}
                        </div>
                      </div>
                      <button 
                        onClick={() => startEditPlayer(index)}
                        style={{ 
                          padding: '8px 12px', 
                          background: 'var(--purple-color)', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '6px', 
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <FaEdit /> Edit
                      </button>
                    </div>
                  );
                })}
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
              ⚠️ This action cannot be undone and will delete all players in this team!
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

export default TeamsPage;