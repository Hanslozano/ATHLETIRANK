import React, { useState, useEffect } from "react";
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaEye, FaChevronLeft, FaChevronRight, FaSearch, FaCheckCircle, FaChevronDown, FaChevronUp } from "react-icons/fa";
import "../../style/Admin_TeamPage.css";

const TeamsPage = ({ sidebarOpen }) => {
  const [activeTab, setActiveTab] = useState("view");
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Updated form state to match TournamentCreator
  const [currentTeam, setCurrentTeam] = useState({
    teamName: "",
    sport: "",
    players: []
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

  // NEW: State for expanded team details in view modal
  const [expandedTeams, setExpandedTeams] = useState({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // CSV Import states
  const [importingCSV, setImportingCSV] = useState(false);
  const fileInputRef = React.useRef(null);

  // Position options
  const positions = {
    Basketball: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
    Volleyball: ["Setter", "Outside Hitter", "Middle Blocker", "Opposite Hitter", "Libero", "Defensive Specialist"],
  };

  // Position limits - Maximum 3 per position
  const getPositionLimits = (teamSize, sport) => {
    if (sport === "Basketball") {
      const limits = {};
      positions.Basketball.forEach(position => {
        limits[position] = 3;
      });
      return limits;
    } else if (sport === "Volleyball") {
      const limits = {};
      positions.Volleyball.forEach(position => {
        limits[position] = 3;
      });
      return limits;
    }
    return {};
  };

  // Get available positions for a player based on current team composition
  const getAvailablePositions = (currentIndex) => {
    if (!currentTeam.sport) return [];

    const positionLimits = getPositionLimits(currentTeam.players.length, currentTeam.sport);
    const positionCounts = {};
    
    // Count current assignments (excluding the current player being edited)
    currentTeam.players.forEach((player, index) => {
      if (index !== currentIndex && player.position) {
        positionCounts[player.position] = (positionCounts[player.position] || 0) + 1;
      }
    });

    // Filter positions that haven't reached their limit
    return positions[currentTeam.sport].filter(position => {
      const currentCount = positionCounts[position] || 0;
      const maxAllowed = positionLimits[position] || 0;
      return currentCount < maxAllowed;
    });
  };

  // Check if a position is available
  const isPositionAvailable = (position, currentIndex) => {
    if (!currentTeam.sport || !position) return true;
    
    const availablePositions = getAvailablePositions(currentIndex);
    return availablePositions.includes(position);
  };

  // Get position count display
  const getPositionCounts = () => {
    if (!currentTeam.sport) return {};
    
    const positionLimits = getPositionLimits(currentTeam.players.length, currentTeam.sport);
    const positionCounts = {};
    
    currentTeam.players.forEach(player => {
      if (player.position) {
        positionCounts[player.position] = (positionCounts[player.position] || 0) + 1;
      }
    });

    const result = {};
    positions[currentTeam.sport].forEach(position => {
      result[position] = {
        current: positionCounts[position] || 0,
        max: positionLimits[position] || 0
      };
    });
    
    return result;
  };

  // Check for stored sport filter on component mount
  useEffect(() => {
    const storedSportFilter = sessionStorage.getItem('teamSportFilter');
    if (storedSportFilter) {
      setSportFilter(storedSportFilter);
      // Clear the stored filter so it doesn't persist on refresh
      sessionStorage.removeItem('teamSportFilter');
    }
  }, []);

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

  // Handle form inputs - UPDATED to match TournamentCreator
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

  // Player functions - UPDATED to match TournamentCreator
  const handlePlayerChange = (index, field, value) => {
    let finalValue = value;
    
    // For player names: remove any non-letter, non-space, non-hyphen characters
    if (field === "name") {
      finalValue = value.replace(/[^a-zA-Z\s-]/g, '');
      // Don't trim here - allow spaces between names
    }
    
    // For jersey numbers: remove any non-digit characters
    if (field === "jerseyNumber") {
      finalValue = value.replace(/[^0-9]/g, '');
    }
    
    const newPlayers = [...currentTeam.players];
    
    // If changing position, validate it's available
    if (field === "position") {
      if (!isPositionAvailable(finalValue, index)) {
        setValidationError(`Cannot assign more than ${getPositionLimits(currentTeam.players.length, currentTeam.sport)[finalValue]} players to ${finalValue}`);
        return;
      }
    }
    
    newPlayers[index][field] = finalValue;
    setCurrentTeam(prev => ({ ...prev, players: newPlayers }));
    
    // Clear validation error if it was about position limits
    if (field === "position" && validationError && validationError.includes("Cannot assign more than")) {
      setValidationError("");
    }
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

  // Validation functions
  const isValidPlayerName = (name) => {
    const trimmed = name.trim();
    return /^[a-zA-Z\s-]+$/.test(trimmed) && trimmed.length > 0;
  };

  const isValidJerseyNumber = (jersey) => {
    const trimmed = jersey.trim();
    return /^\d+$/.test(trimmed) && trimmed.length > 0;
  };

  const validateTeam = () => {
    if (!currentTeam.teamName.trim()) return "Please enter a team name";
    if (!currentTeam.sport) return "Please select a sport";
    
    // Check if we have between 12-15 players with complete information
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
    const invalidNames = validPlayers.filter(p => {
      return !isValidPlayerName(p.name);
    });
    if (invalidNames.length > 0) {
      return "Player names must contain only letters and spaces. Please check all player names.";
    }
    
    // Check for invalid jersey numbers (must be numbers only)
    const invalidJerseys = validPlayers.filter(p => {
      return !isValidJerseyNumber(p.jerseyNumber);
    });
    if (invalidJerseys.length > 0) {
      return "Jersey numbers must contain only numbers. Please check all jersey numbers.";
    }
    
    // Check for duplicate jersey numbers (only among valid players)
    const jerseyNumbers = validPlayers.map(p => p.jerseyNumber.trim());
    const uniqueJerseyNumbers = new Set(jerseyNumbers);
    if (jerseyNumbers.length !== uniqueJerseyNumbers.size) {
      return "Duplicate jersey numbers found. Each player must have a unique jersey number.";
    }
    
    // Check position limits (maximum 3 per position)
    const positionCounts = {};
    validPlayers.forEach(player => {
      positionCounts[player.position] = (positionCounts[player.position] || 0) + 1;
    });
    
    const positionLimits = getPositionLimits(currentTeam.players.length, currentTeam.sport);
    for (const [position, count] of Object.entries(positionCounts)) {
      const maxAllowed = positionLimits[position];
      if (maxAllowed && count > maxAllowed) {
        return `Too many players assigned to ${position}. Maximum allowed is ${maxAllowed} per position.`;
      }
    }
    
    return null;
  };

  // Submit team - UPDATED to match TournamentCreator
  const handleAddTeam = async () => {
    const error = validateTeam();
    if (error) {
      setValidationError(error);
      return;
    }

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
        setTeams(prev => [...prev, newTeam]);
        setCurrentTeam({ teamName: "", sport: "", players: [] });
        setValidationError("Team created successfully!");
        setShowValidationMessage(true);
        
        setTimeout(() => {
          setValidationError("");
          setShowValidationMessage(false);
        }, 3000);
      } else {
        setValidationError("Failed to create team");
      }
    } catch (err) {
      console.error("Error saving team:", err);
      setValidationError("Error saving team");
    } finally {
      setLoading(false);
    }
  };

  // CSV Import Functions - UPDATED to match TournamentCreator
  const handleCSVImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!currentTeam.sport) {
      setValidationError("Please select a sport first before importing players.");
      event.target.value = '';
      return;
    }

    setImportingCSV(true);
    setValidationError("");

    try {
      const text = await file.text();
      const Papa = await import('papaparse');
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => {
          const normalized = header.trim().toLowerCase();
          if (normalized.includes('player') && normalized.includes('name')) return 'Player Name';
          if (normalized.includes('jersey') && normalized.includes('number')) return 'Jersey Number';
          if (normalized.includes('position')) return 'Position';
          return header;
        },
        complete: (results) => {
          const data = results.data;
          
          if (data.length === 0) {
            setValidationError("CSV file is empty or invalid.");
            setImportingCSV(false);
            return;
          }

          const importedPlayers = data.slice(0, 15).map(row => {
            const playerName = (row['Player Name'] || row['player name'] || row['name'] || '').trim();
            const jerseyNumber = (row['Jersey Number'] || row['jersey number'] || row['number'] || '').toString().trim();
            const position = (row['Position'] || row['position'] || '').trim();

            return {
              name: playerName,
              jerseyNumber: jerseyNumber,
              position: position
            };
          });

          const validImports = importedPlayers.filter(p => p.name || p.jerseyNumber || p.position);
          
          if (validImports.length === 0) {
            setValidationError("No valid player data found in CSV. Please check the file format.");
            setImportingCSV(false);
            return;
          }

          while (importedPlayers.length < 12) {
            importedPlayers.push({ name: "", position: "", jerseyNumber: "" });
          }

          setCurrentTeam(prev => ({
            ...prev,
            players: importedPlayers
          }));

          setValidationError(`Successfully imported ${validImports.length} player(s) from CSV.`);
          setImportingCSV(false);
          event.target.value = '';
        },
        error: (error) => {
          setValidationError(`Error parsing CSV: ${error.message}`);
          setImportingCSV(false);
          event.target.value = '';
        }
      });
    } catch (err) {
      setValidationError(`Error reading file: ${err.message}`);
      setImportingCSV(false);
      event.target.value = '';
    }
  };

  // Download CSV Template - UPDATED to match TournamentCreator
  const handleDownloadTemplate = () => {
    const template = `Player Name,Jersey Number,Position
John Doe,23,${currentTeam.sport === 'Basketball' ? 'Point Guard' : 'Setter'}
Jane Smith,12,${currentTeam.sport === 'Basketball' ? 'Shooting Guard' : 'Outside Hitter'}`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `players_template_${currentTeam.sport.toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
        [field]: value,
        // If jerseyNumber is being changed, also update jersey_number for backend compatibility
        ...(field === 'jerseyNumber' ? { jersey_number: value } : {})
      }
    }));
  };

  const saveEditedPlayer = async () => {
    if (!editingPlayer.player.name.trim() || !editingPlayer.player.position || 
        !(editingPlayer.player.jerseyNumber || editingPlayer.player.jersey_number)) {
      setValidationError("Please fill in all player details.");
      setShowValidationMessage(true);
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/teams/${viewModal.team.id}/players/${editingPlayer.player.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingPlayer.player.name,
          position: editingPlayer.player.position,
          jerseyNumber: editingPlayer.player.jerseyNumber || editingPlayer.player.jersey_number,
          jersey_number: editingPlayer.player.jersey_number || editingPlayer.player.jerseyNumber
        }),
      });

      if (res.ok) {
        const updatedPlayer = await res.json();
        
        // Update teams state
        setTeams(prev => prev.map(team => {
          if (team.id === viewModal.team.id) {
            const updatedPlayers = [...team.players];
            updatedPlayers[editingPlayer.index] = {
              ...updatedPlayer,
              jerseyNumber: updatedPlayer.jersey_number || updatedPlayer.jerseyNumber
            };
            return { ...team, players: updatedPlayers };
          }
          return team;
        }));

        // Update modal state
        setViewModal(prev => {
          const updatedPlayers = [...prev.team.players];
          updatedPlayers[editingPlayer.index] = {
            ...updatedPlayer,
            jerseyNumber: updatedPlayer.jersey_number || updatedPlayer.jerseyNumber
          };
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

  // NEW: Toggle team details expansion
  const toggleTeamDetails = (teamId) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  // Capitalize first letter
  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  // Calculate valid player count (12-15 must be valid)
  const validPlayerCount = currentTeam.players.filter(p => 
    p.name.trim() && p.position && p.jerseyNumber.trim()
  ).length;

  // Get position counts for display
  const positionCounts = getPositionCounts();

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
            <div className="bracket-breadcrumb">
              <button
                className={`breadcrumb-item ${activeTab === "view" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("view");
                  setCurrentTeam({ teamName: "", sport: "", players: [] });
                  setValidationError("");
                  setShowValidationMessage(false);
                }}
              >
                View Teams
              </button>
              {activeTab === "create" && (
                <>
                  <span className="breadcrumb-separator">›</span>
                  <span className="breadcrumb-item active">
                    Create Team
                  </span>
                </>
              )}
            </div>

            {/* Validation Message */}
            {validationError && (
              <div className={`admin-teams-validation-message ${validationError.includes("Successfully") || validationError.includes("successfully") ? "admin-teams-success" : "admin-teams-error"}`}>
                {validationError}
                <button 
                  className="admin-teams-close-message"
                  onClick={() => setValidationError("")}
                >
                  ×
                </button>
              </div>
            )}

            {/* View Teams */}
            {activeTab === "view" && (
              <div className="bracket-view-section purple-background">
                {/* Search Container */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: '1', minWidth: '300px' }}>
                    <input
                      type="text"
                      placeholder="Search teams or players..."
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
                      value={sportFilter}
                      onChange={(e) => setSportFilter(e.target.value)}
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
                      <option value="all">All Sports</option>
                      <option value="Basketball">Basketball</option>
                      <option value="Volleyball">Volleyball</option>
                    </select>
                  </div>
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
                                  <span 
                                    className="bracket-sport-badge"
                                    style={{ 
                                      fontSize: '13px', 
                                      padding: '8px 14px',
                                      background: teamSport === 'Volleyball' ? '#4ecdc4' : '#ff6b35',
                                      color: 'white',
                                      borderRadius: '16px',
                                      fontWeight: '700',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px'
                                    }}
                                  >
                                    {teamSport}
                                  </span>
                                </td>
                                <td style={{ fontSize: '15px', fontWeight: '600' }}>{team.players.length}</td>
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

            {/* Create Team - UPDATED to match TournamentCreator Step 2 */}
            {activeTab === "create" && (
              <div className="bracket-create-section">
                <div className="bracket-form-container">
                  <h2>Create New Team</h2>
                 
                  
                  <div className="bracket-form">
                    {/* Team Name and Sport Selection - Same layout as TournamentCreator */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div className="bracket-form-group">
                        <label htmlFor="teamName">Team Name *</label>
                        <input
                          type="text"
                          id="teamName"
                          name="teamName"
                          value={currentTeam.teamName}
                          onChange={handleTeamInputChange}
                          placeholder="Enter team name"
                          style={{ fontSize: '16px' }}
                        />
                      </div>

                      <div className="bracket-form-group">
                        <label htmlFor="sport">Sport *</label>
                        <select
                          id="sport"
                          name="sport"
                          value={currentTeam.sport}
                          onChange={handleTeamInputChange}
                          style={{ fontSize: '16px' }}
                        >
                          <option value="">Select a sport</option>
                          {Object.keys(positions).map((sport) => (
                            <option key={sport} value={sport}>{sport}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Players Section - Same as TournamentCreator */}
                    {currentTeam.sport && (
                      <div className="admin-teams-players-section">
                        <div className="admin-teams-players-header">
                          <h3>Players ({validPlayerCount}/{currentTeam.players.length})</h3>
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

                        {/* Show only SUCCESS messages here (CSV import success) */}
                        {validationError && (validationError.includes("Successfully") || validationError.includes("successfully")) && (
                          <div 
                            className="admin-teams-validation-message admin-teams-success validation-message-animated"
                            style={{ marginTop: '15px', marginBottom: '15px' }}
                          >
                            {validationError}
                            <button 
                              className="admin-teams-close-message"
                              onClick={() => setValidationError("")}
                            >
                              ×
                            </button>
                          </div>
                        )}

                        <div className="csv-import-section">
                          <div className="csv-import-buttons">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".csv"
                              onChange={handleCSVImport}
                              style={{ display: 'none' }}
                            />
                            <button
                              type="button"
                              className="csv-import-btn"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={importingCSV}
                            >
                              {importingCSV ? "Importing..." : "📁 Import Players from CSV"}
                            </button>
                            <button
                              type="button"
                              className="csv-template-btn"
                              onClick={handleDownloadTemplate}
                            >
                              ⬇ Download CSV Template
                            </button>
                          </div>
                          <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px', display: 'block' }}>
                            CSV format: Player Name, Jersey Number, Position
                          </small>
                        </div>

                        {/* Position Limits Display */}
                        <div className="position-limits-display">
                          <h4>Position Limits (Maximum 3 per position)</h4>
                          <div className="position-limits-grid">
                            {Object.entries(positionCounts).map(([position, counts]) => (
                              <div key={position} className="position-limit-item">
                                <span className="position-name">{position}</span>
                                <span className={`position-count ${counts.current >= counts.max ? 'limit-reached' : ''}`}>
                                  {counts.current}/{counts.max}
                                </span>
                              </div>
                            ))}
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
                                style={{ fontSize: '16px' }}
                                required
                              />
                              <input
                                type="text"
                                placeholder="Jersey #"
                                value={player.jerseyNumber}
                                onChange={(e) => handlePlayerChange(index, "jerseyNumber", e.target.value)}
                                className="admin-teams-jersey-input"
                                style={{ fontSize: '16px' }}
                                maxLength="10"
                                required
                              />
                              <select
                                value={player.position}
                                onChange={(e) => handlePlayerChange(index, "position", e.target.value)}
                                className={`admin-teams-position-select ${
                                  !isPositionAvailable(player.position, index) ? 'position-unavailable' : ''
                                }`}
                                style={{ fontSize: '16px' }}
                                required
                              >
                                <option value="">Select position</option>
                                {getAvailablePositions(index).map(pos => (
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
                            {/* Position availability warning */}
                            {player.position && !isPositionAvailable(player.position, index) && (
                              <div className="position-warning">
                                Maximum {getPositionLimits(currentTeam.players.length, currentTeam.sport)[player.position]} {player.position} players allowed
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {/* Add More Players Button */}
                        {currentTeam.players.length < 15 && (
                          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px', marginBottom: '15px' }}>
                            <button
                              type="button"
                              className="add-player-btn"
                              onClick={handleAddPlayer}
                              style={{ fontSize: '16px' }}
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
                          fontSize: '14px',
                          color: '#93c5fd'
                        }}>
                          <strong>Note:</strong> Minimum 12 players required, maximum 15 players allowed. No duplicate jersey numbers allowed. Player names must contain only letters and spaces. 
                          <br />
                          <strong>Position Limits:</strong> Maximum 3 players per position. Not all positions need to be filled.
                        </div>
                      </div>
                    )}

                    <div className="bracket-form-actions" style={{ marginTop: '20px' }}>
                      {/* Only show Add Team button when 12 valid players are complete */}
                      {validPlayerCount >= 12 && validPlayerCount <= 15 && (
                        <button 
                          onClick={handleAddTeam}
                          className="bracket-submit-btn"
                          disabled={loading}
                        >
                          {loading ? "Adding..." : "Add Team"}
                        </button>
                      )}
                      
                      {/* Only show Clear Form button if user has started entering data */}
                      {(currentTeam.teamName.trim() || 
                        currentTeam.sport || 
                        currentTeam.players.some(p => p.name.trim() || p.position || p.jerseyNumber.trim())) && (
                        <button
                          type="button"
                          className="bracket-cancel-btn"
                          onClick={() => {
                            setCurrentTeam({ teamName: "", sport: "", players: [] });
                            setValidationError("");
                          }}
                        >
                          Clear Form
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Back to Teams button */}
                  <div className="bracket-form-actions" style={{ marginTop: '20px', borderTop: '2px solid rgba(255, 255, 255, 0.1)', paddingTop: '20px' }}>
                    <button 
                      onClick={() => setActiveTab("view")}
                      className="bracket-cancel-btn"
                    >
                      <FaChevronLeft style={{ marginRight: '8px' }} />
                      Back to Teams
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Team Modal */}
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
              <span 
                style={{ 
                  padding: '6px 12px',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  background: viewModal.team.sport === 'Volleyball' ? '#4ecdc4' : '#ff6b35',
                  color: 'white'
                }}
              >
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
                    // Editing style
                    <div 
                      key={index} 
                      style={{
                        background: '#1a2332',
                        padding: '16px 24px',
                        borderRadius: '12px',
                        border: '2px solid #2d3748',
                        marginBottom: '12px'
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: '16px', alignItems: 'end' }}>
                        {/* Name Input */}
                        <div>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '8px', 
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#e2e8f0'
                          }}>
                            Name *
                          </label>
                          <input
                            type="text"
                            value={editingPlayer.player.name}
                            onChange={(e) => handleEditPlayerChange("name", e.target.value)}
                            placeholder="Player name"
                            style={{ 
                              width: '100%', 
                              padding: '12px 16px', 
                              border: '2px solid #2d3748', 
                              borderRadius: '8px',
                              background: '#0f172a',
                              color: '#e2e8f0',
                              fontSize: '14px',
                              outline: 'none',
                              transition: 'border-color 0.2s ease'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#2d3748'}
                          />
                        </div>

                        {/* Jersey Number Input */}
                        <div>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '8px', 
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#e2e8f0'
                          }}>
                            Jersey # *
                          </label>
                          <input
                            type="text"
                            value={editingPlayer.player.jerseyNumber || editingPlayer.player.jersey_number}
                            onChange={(e) => handleEditPlayerChange("jerseyNumber", e.target.value)}
                            placeholder="Jersey #"
                            maxLength="10"
                            style={{ 
                              width: '100%', 
                              padding: '12px 16px', 
                              border: '2px solid #2d3748',
                              borderRadius: '8px',
                              background: '#0f172a',
                              color: '#e2e8f0',
                              fontSize: '14px',
                              outline: 'none',
                              transition: 'border-color 0.2s ease'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#2d3748'}
                          />
                        </div>

                        {/* Position Select */}
                        <div>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '8px', 
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#e2e8f0'
                          }}>
                            Position *
                          </label>
                          <select
                            value={editingPlayer.player.position}
                            onChange={(e) => handleEditPlayerChange("position", e.target.value)}
                            style={{ 
                              width: '100%', 
                              padding: '12px 16px', 
                              border: '2px solid #2d3748', 
                              borderRadius: '8px',
                              background: '#0f172a',
                              color: '#e2e8f0',
                              fontSize: '14px',
                              cursor: 'pointer',
                              outline: 'none',
                              transition: 'border-color 0.2s ease'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#2d3748'}
                          >
                            <option value="">Select position</option>
                            {positions[teamSport]?.map(pos => (
                              <option key={pos} value={pos}>{pos}</option>
                            ))}
                          </select>
                        </div>

                        {/* Save Button */}
                        <button 
                          onClick={saveEditedPlayer} 
                          style={{ 
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            height: '48px',
                            marginTop: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <FaSave /> Save
                        </button>

                        {/* Cancel Button */}
                        <button 
                          onClick={cancelEditPlayer} 
                          style={{ 
                            padding: '12px 24px',
                            background: '#2d3748',
                            color: '#e2e8f0',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            height: '48px',
                            marginTop: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <FaTimes /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Normal display mode
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