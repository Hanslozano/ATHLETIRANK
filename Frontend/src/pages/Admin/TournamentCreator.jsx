import React, { useState, useEffect } from "react";
import { FaCheckCircle, FaChevronRight, FaChevronLeft, FaPlus, FaTrash, FaChevronDown, FaChevronUp } from "react-icons/fa";
import "../../style/Admin_Events.css";
import "../../style/Admin_TeamPage.css";
import "../../style/Admin_BracketPage.css";
import Papa from 'papaparse'; // Make sure papaparse is imported


const TournamentCreator = ({ sidebarOpen }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const validationMessageRef = React.useRef(null);
  const dashboardContentRef = React.useRef(null);
  
  // Scroll to validation message when error appears
 useEffect(() => {
  if (validationError) {
    // Only scroll to top for error messages, not success messages
    const isSuccessMessage = validationError.includes("Successfully") || validationError.includes("successfully");
    
    if (!isSuccessMessage) {
      // Scroll to top for errors
      setTimeout(() => {
        if (validationMessageRef.current) {
          validationMessageRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        } else if (dashboardContentRef.current) {
          dashboardContentRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 100);
    }
    // For success messages, don't scroll - let them appear naturally in the Players section
  }
}, [validationError]);

    const [editingTeamId, setEditingTeamId] = useState(null);

  // Add this useEffect to fetch teams already in brackets from database
  useEffect(() => {
    const fetchTeamsInBrackets = async () => {
      try {
        const bracketsRes = await fetch("http://localhost:5000/api/brackets");
        const brackets = await bracketsRes.json();

        const assignedTeamIds = new Set();
        
        for (let bracket of brackets) {
          const teamsRes = await fetch(`http://localhost:5000/api/bracketTeams/bracket/${bracket.id}`);
          const teamsInBracket = await teamsRes.json();
          
          teamsInBracket.forEach(team => {
            assignedTeamIds.add(team.id);
          });
        }

        setTeamsInBracketsFromDB(Array.from(assignedTeamIds));
      } catch (err) {
        console.error("Error fetching teams in brackets:", err);
      }
    };

    fetchTeamsInBrackets();
  }, [currentStep]);

  const [teamsInBracketsFromDB, setTeamsInBracketsFromDB] = useState([]);
  const [importingCSV, setImportingCSV] = useState(false);
const fileInputRef = React.useRef(null);
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

  // Position options with limits
  const positions = {
    Basketball: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
    Volleyball: ["Setter", "Outside Hitter", "Middle Blocker", "Opposite Hitter", "Libero", "Defensive Specialist"],
  };

  // NEW: Position limits based on team size
const getPositionLimits = (teamSize, sport) => {
  if (sport === "Basketball") {
    // For basketball: Maximum 3 per position regardless of team size (12-15 players)
    const limits = {};
    positions.Basketball.forEach(position => {
      limits[position] = 3;
    });
    return limits;
  } else if (sport === "Volleyball") {
    // For volleyball: Maximum 3 per position regardless of team size (12-15 players)
    const limits = {};
    positions.Volleyball.forEach(position => {
      limits[position] = 3;
    });
    return limits;
  }
  return {};
};

  // NEW: Get available positions for a player based on current team composition
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

  // NEW: Check if a position is available
  const isPositionAvailable = (position, currentIndex) => {
    if (!currentTeam.sport || !position) return true;
    
    const availablePositions = getAvailablePositions(currentIndex);
    return availablePositions.includes(position);
  };

  // NEW: Get position count display
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

  const handleContinueToTeams = () => {
  if (!eventData.name.trim() || !eventData.startDate || !eventData.endDate) {
    setValidationError("Please fill in all event fields.");
    return;
  }

  if (eventData.numberOfBrackets < 1 || eventData.numberOfBrackets > 5) {
    setValidationError("Number of brackets must be between 1 and 5.");
    return;
  }

  // Just move to next step, don't create event yet
  setCurrentStep(2);
  setValidationError("");
};

  // Step 2: Team Creation
  const handleTeamInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentTeam(prev => ({ ...prev, [name]: value }));

    // When sport is selected, create exactly 12 empty player slots
   if (name === "sport" && value && !editingTeamId) {
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
  // Handle CSV Import
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

// Download CSV Template
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
  
  // NEW: If changing position, validate it's available
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
  
  // NEW: Check position limits (maximum 3 per position)
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

  const handleEditTeam = (teamId) => {
  const teamToEdit = createdTeams.find(t => t.id === teamId);
  if (!teamToEdit) {
    setValidationError("Team not found");
    return;
  }
  
  console.log("Editing team:", teamToEdit);
  console.log("Team players:", teamToEdit.players);
  
  // Set editing state and mode first
  setEditingTeamId(teamId);
  setTeamMode("create");
  
  // Clear validation error
  setValidationError("");
  
  // Show loading state
  setLoading(true);
  
  // Fetch the full team details from the database to ensure we have all player data
  fetch(`http://localhost:5000/api/teams/${teamId}`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(fullTeamData => {
      console.log("Full team data from API:", fullTeamData);
      
      if (!fullTeamData || !fullTeamData.players) {
        throw new Error("Invalid team data received");
      }
      
      const mappedPlayers = [];
      const existingPlayers = fullTeamData.players || [];
      
      // Map existing players with proper field names
      for (let i = 0; i < existingPlayers.length; i++) {
        const p = existingPlayers[i];
        const jerseyNum = p.jersey_number || p.jerseyNumber || "";
        
        mappedPlayers.push({
          name: p.name || "",
          position: p.position || "",
          jerseyNumber: jerseyNum.toString()
        });
      }
      
      // Fill remaining slots with empty players up to 12
      while (mappedPlayers.length < 12) {
        mappedPlayers.push({ name: "", position: "", jerseyNumber: "" });
      }
      
      console.log("Mapped players for editing:", mappedPlayers);
      
      // Set team data
      setCurrentTeam({
        teamName: fullTeamData.name,
        sport: fullTeamData.sport,
        players: mappedPlayers
      });
      
      setLoading(false);
      
      // Scroll to form after data is loaded
      setTimeout(() => {
        const formElement = document.querySelector('.bracket-form');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    })
    .catch(err => {
      console.error("Error fetching team details:", err);
      setValidationError(`Failed to load team details: ${err.message}`);
      setLoading(false);
      setEditingTeamId(null);
    });
};

const handleAddTeam = async () => {
  if (createdTeams.length >= 10 && !editingTeamId) {
    setValidationError("Maximum 10 teams allowed per tournament. Please remove a team before adding a new one.");
    return;
  }

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
    if (editingTeamId) {
      // Update existing team
      const res = await fetch(`http://localhost:5000/api/teams/${editingTeamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: currentTeam.teamName.trim(),
          sport: currentTeam.sport,
          players: trimmedPlayers
        })
      });
      
      if (res.ok) {
        const updatedTeam = await res.json();
        setCreatedTeams(prev => prev.map(t => t.id === editingTeamId ? updatedTeam : t));
        setCurrentTeam({ teamName: "", sport: "", players: [] });
        setEditingTeamId(null);
        setValidationError("");
      } else {
        setValidationError("Failed to update team");
      }
    } else {
      // Create new team
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
    }
  } catch (err) {
    console.error("Error saving team:", err);
    setValidationError("Error saving team");
  } finally {
    setLoading(false);
  }
};

  const handleProceedToBracket = () => {
    if (createdTeams.length < 2) {
      setValidationError("You need at least 2 teams to create brackets");
      return;
    }

     if (createdTeams.length > 10) {
    setValidationError("Maximum 10 teams allowed per tournament");
    return;
  }

    // Validate sport consistency for each bracket
    if (eventData.numberOfBrackets === 1) {
      // For single bracket, all teams must be the same sport
      const sports = [...new Set(createdTeams.map(t => t.sport.toLowerCase()))];
      if (sports.length > 1) {
        setValidationError(`All teams must be the same sport for a single bracket tournament. Currently you have: ${sports.map(s => capitalize(s)).join(', ')}. Please remove teams of different sports.`);
        return;
      }
    } else {
      // For multiple brackets, validate each bracket assignment
      const bracketOptions = getBracketOptions();
      
      for (let bracket of bracketOptions) {
        // Get teams assigned to this bracket
        const teamsInBracket = Object.entries(teamBracketAssignments)
          .filter(([teamId, bracketId]) => bracketId === bracket.id)
          .map(([teamId]) => teamId);
        
        if (teamsInBracket.length > 0) {
          // Check if all teams in this bracket have the same sport
          const sportsInBracket = teamsInBracket.map(teamId => {
            const team = createdTeams.find(t => String(t.id) === String(teamId));
            return team ? team.sport.toLowerCase() : null;
          }).filter(sport => sport !== null);
          
          const uniqueSports = [...new Set(sportsInBracket)];
          
          if (uniqueSports.length > 1) {
            setValidationError(`${bracket.name} has mixed sports (${uniqueSports.map(s => capitalize(s)).join(', ')}). All teams in a bracket must be the same sport. Please reassign teams or remove teams of different sports.`);
            return;
          }
        }
      }
      
      // Check if all teams are assigned to a bracket
      const assignedTeams = Object.keys(teamBracketAssignments);
      const unassignedTeams = createdTeams.filter(team => 
        !assignedTeams.includes(String(team.id))
      );
      
      if (unassignedTeams.length > 0) {
        setValidationError(`Please assign all teams to a bracket before proceeding. ${unassignedTeams.length} team(s) are not assigned: ${unassignedTeams.map(t => t.name).join(', ')}`);
        return;
      }
    }
    
    // Reset brackets state to force re-initialization with new teams
    setBrackets([]);
    setCurrentStep(3);
    setValidationError("");
  };

  // Handle selecting existing team with bracket assignment
  const handleSelectExistingTeam = (teamId, bracketId = null) => {
     if (createdTeams.length >= 10) {
    setValidationError("Maximum 10 teams allowed per tournament. Please remove a team before adding a new one.");
    return;
  }
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
    const createdTeamIds = createdTeams.map(ct => ct.id);
    
    let filtered = teams.filter(team => {
      // Check if team is already selected in current session
      if (createdTeamIds.includes(team.id)) {
        return false;
      }
      
      // Check if team is already in a bracket (from database)
      if (teamsInBracketsFromDB.includes(team.id)) {
        return false;
      }
      
      // Check if team is assigned to a bracket in current session
      if (teamBracketAssignments[team.id]) {
        return false;
      }
      
      return true;
    });
    
    if (sportFilter !== "all") {
      filtered = filtered.filter(team => 
        team.sport.toLowerCase() === sportFilter.toLowerCase()
      );
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
  console.log("=== CREATING EVENT AND BRACKETS ===");
  
  // Validate event data
  if (!eventData.name.trim() || !eventData.startDate || !eventData.endDate) {
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
    // STEP 1: Create the event FIRST (existing code)
    console.log("Creating event:", eventData);
    const eventRes = await fetch("http://localhost:5000/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: eventData.name,
        start_date: eventData.startDate,
        end_date: eventData.endDate
      })
    });
    
    if (!eventRes.ok) {
      const error = await eventRes.json();
      throw new Error(error.message || "Failed to create event");
    }

    const eventResponse = await eventRes.json();
    const newEvent = {
      id: eventResponse.id || eventResponse.eventId,
      name: eventData.name,
      start_date: eventData.startDate,
      end_date: eventData.endDate
    };
    
    console.log("Event created:", newEvent);
    setCreatedEvent(newEvent);

    // STEP 2: Create all brackets for the event
    for (let i = 0; i < brackets.length; i++) {
      const bracket = brackets[i];
      const sportType = bracket.sport.toLowerCase();
      const bracketName = bracket.bracketName || 
        `${newEvent.name} - ${capitalize(bracket.sport)} Bracket`;
      
      const requestBody = {
        event_id: newEvent.id,
        name: bracketName,
        sport_type: sportType,
        elimination_type: bracket.bracketType // This will now include 'round_robin'
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

      // UPDATED: Route to correct endpoint based on bracket type
      let generateEndpoint;
      if (bracket.bracketType === 'round_robin') {
        generateEndpoint = `http://localhost:5000/api/round-robin/${newBracket.id}/generate`;
      } else {
        generateEndpoint = `http://localhost:5000/api/brackets/${newBracket.id}/generate`;
      }

      console.log(`Generating matches for ${bracket.bracketType} bracket at: ${generateEndpoint}`);

      const generateRes = await fetch(generateEndpoint, {
        method: "POST"
      });

      if (!generateRes.ok) {
        const errorData = await generateRes.json();
        throw new Error(`Bracket ${i + 1}: ${errorData.error || "Failed to generate matches"}`);
      }

      const generateData = await generateRes.json();
      console.log(`Generated ${generateData.matches?.length || 0} matches for bracket ${i + 1}`);

      createdBracketsList.push({
        ...newBracket,
        selectedTeams: bracket.selectedTeamIds.length,
        team_count: bracket.selectedTeamIds.length,
        bracket_type: bracket.bracketType // Store bracket type for reference
      });
    }

    setCreatedBrackets(createdBracketsList);
    setCurrentStep(4);
    setValidationError("");
  } catch (err) {
    console.error("Error creating tournament:", err);
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

  // NEW: Get position counts for display
  const positionCounts = getPositionCounts();

  return (
    <div className="admin-dashboard">
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`} ref={dashboardContentRef}>
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
           {validationError && !validationError.includes("Successfully") && !validationError.includes("successfully") && (
  <div 
    ref={validationMessageRef}
    className={`admin-teams-validation-message admin-teams-error validation-message-animated`}
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
                      onClick={handleContinueToTeams}
                      className="bracket-submit-btn"
                    >
                      Continue to Teams
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
                   Create new teams or select from existing teams (minimum 2 teams, maximum 10 teams required)
                    {eventData.numberOfBrackets > 1 && (
                      <span style={{color: '#fbbf24', display: 'block', marginTop: '5px'}}>
                        Since you have multiple brackets, please assign each team to a bracket after adding them.
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
                      <h3>Selected Teams ({createdTeams.length}/10)</h3>
                      {createdTeams.length >= 10 && (
                        <div style={{
                          background: 'rgba(251, 191, 36, 0.1)',
                          border: '1px solid rgba(251, 191, 36, 0.3)',
                          borderRadius: '6px',
                          padding: '10px',
                          marginBottom: '15px',
                          color: '#fbbf24',
                          fontSize: '14px',
                          textAlign: 'center'
                        }}>
                          ⚠️ Maximum team limit reached (10/10). Remove a team to add another.
                        </div>
                      )}

                      <div className="teams-summary-grid">
                        {createdTeams.map(team => (
                          <div key={team.id} className="team-summary-card">
                            <div className="team-summary-content">
                              <div className="team-info-top">
                                <strong>{team.name}</strong>
                                <div className="team-actions">
                                  <button
                                    className="edit-team-btn"
                                    onClick={() => handleEditTeam(team.id)}
                                    title="Edit team"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    className="remove-team-btn"
                                    onClick={() => handleRemoveTeam(team.id)}
                                    title="Remove team"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                              <span style={{ color: '#ffffffff', fontSize: '16px' }}>{capitalize(team.sport)}</span>
                              <span>{team.players?.length || 0} players</span>
                              {/* Bracket Assignment Dropdown */}
                              {eventData.numberOfBrackets > 1 && (
                                <select
                                  value={teamBracketAssignments[team.id] || ""}
                                  onChange={(e) => handleAssignTeamToBracket(team.id, e.target.value)}
                                  className="bracket-assignment-select"
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    marginTop: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: '#1a2332',
                                    color: '#e2e8f0',
                                    fontSize: '14px'
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
                      {editingTeamId && (
                        <div className="editing-banner">
                          <span>✎ Editing Team</span>
                          <button 
                            onClick={() => {
                              setEditingTeamId(null);
                              setCurrentTeam({ teamName: "", sport: "", players: [] });
                            }}
                            className="cancel-edit-btn"
                          >
                            Cancel Edit
                          </button>
                        </div>
                      )}
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
                        disabled={editingTeamId !== null}
                        style={{ fontSize: '16px', opacity: editingTeamId !== null ? 0.6 : 1 }}
                      >
                          <option value="">Select a sport</option>
                          {Object.keys(positions).map((sport) => (
                            <option key={sport} value={sport}>{sport}</option>
                          ))}
                      </select>
                        {editingTeamId && (
                          <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                            Sport cannot be changed when editing a team
                          </small>
                        )}
                      </div>
                    {/* Players Section */}
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
                          {/* NEW: Position Limits Display */}
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
                                  value={player.jerseyNumber || player.jersey_number || ""}
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
                              {/* NEW: Position availability warning */}
                              {player.position && !isPositionAvailable(player.position, index) && (
                                <div className="position-warning">
                                  Maximum {getPositionLimits(currentTeam.players.length, currentTeam.sport)[player.position]} {player.position} players allowed
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {/* Add More Players Button */}
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
                        <button 
                          onClick={handleAddTeam}
                          className="bracket-submit-btn"
                          disabled={loading || validPlayerCount < 12 || validPlayerCount > 15 || (createdTeams.length >= 10 && !editingTeamId)}
                        >
                          {loading ? (editingTeamId ? "Updating..." : "Adding...") : 
                          editingTeamId ? "Update Team" :
                          createdTeams.length >= 10 ? "Team Limit Reached (10/10)" : "Add Team"}
                        </button>
                        <button
                          type="button"
                          className="bracket-cancel-btn"
                          onClick={() => {
                            setCurrentTeam({ teamName: "", sport: "", players: [] });
                            setEditingTeamId(null);
                          }}
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
                          <input
                            type="text"
                            placeholder="Search teams..."
                            className="team-search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ fontSize: '16px' }}
                          />
                        </div>
                        <select 
                          className="team-sport-filter"
                          value={sportFilter}
                          onChange={(e) => setSportFilter(e.target.value)}
                          style={{ fontSize: '16px' }}
                        >
                          <option value="all">All Sports ({teams.filter(t => !createdTeams.find(ct => ct.id === t.id)).length})</option>
                          <option value="basketball">Basketball ({teams.filter(t => t.sport.toLowerCase() === "basketball" && !createdTeams.find(ct => ct.id === t.id)).length})</option>
                          <option value="volleyball">Volleyball ({teams.filter(t => t.sport.toLowerCase() === "volleyball" && !createdTeams.find(ct => ct.id === t.id)).length})</option>
                        </select>
                      </div>

                      {/* Tabular Team List */}
                      <div className="teams-table-container">
                        {teams.length === 0 ? (
                          <p className="empty-state" style={{ fontSize: '16px' }}>
                            No teams available in database. Create a new team first.
                          </p>
                        ) : getFilteredTeams().length === 0 ? (
                          <p className="empty-state" style={{ fontSize: '16px' }}>
                            {sportFilter === "all" 
                              ? "All available teams have been selected." 
                              : `No ${capitalize(sportFilter)} teams available.`}
                          </p>
                        ) : (
                          <table className="teams-table">
                            <thead>
                              <tr>
                                <th style={{ fontSize: '16px' }}>Team Name</th>
                                <th style={{ fontSize: '16px' }}>Sport</th>
                                <th style={{ fontSize: '16px' }}>Players</th>
                                {eventData.numberOfBrackets > 1 && <th style={{ fontSize: '16px' }}>Assign to Bracket</th>}
                                {eventData.numberOfBrackets === 1 && <th style={{ fontSize: '16px' }}>Action</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {getFilteredTeams().map(team => (
                                <tr key={team.id}>
                                  <td className="team-name-cell" style={{ fontSize: '16px' }}>
                                    <strong>{team.name}</strong>
                                  </td>
                                  <td style={{ fontSize: '16px' }}>
                                    <span className={`bracket-sport-badge bracket-sport-${team.sport.toLowerCase() === 'volleyball' ? 'volleyball' : 'basketball'}`}>
                                      {capitalize(team.sport)}
                                    </span>
                                  </td>
                                  <td style={{ fontSize: '16px' }}>{team.players?.length || 0} players</td>
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
                                         disabled={createdTeams.length >= 10}
                                        className="bracket-assignment-select"
                                        style={{
                                          padding: '8px 12px',
                                          borderRadius: '4px',
                                          border: '1px solid rgba(255,255,255,0.2)',
                                          background: '#1a2332',
                                          color: '#e2e8f0',
                                          fontSize: '16px',
                                          width: '100%',
                                          opacity: createdTeams.length >= 10 ? 0.5 : 1,  // ADD THIS
                                          cursor: createdTeams.length >= 10 ? 'not-allowed' : 'pointer'  // ADD THIS
                                        }}
                                      >
                                         <option value="">{createdTeams.length >= 10 ? "Team limit reached" : "Select bracket first"}</option>  // CHANGE THIS
                                          {createdTeams.length < 10 && getBracketOptions().map(bracket => (
                                          <option key={bracket.id} value={bracket.id}>
                                            {bracket.name}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                  )}
                                  {eventData.numberOfBrackets === 1 && (
                                    <td>
                                      <button
                                        className="add-team-btn"
                                          onClick={() => handleSelectExistingTeam(team.id)}
                                          disabled={createdTeams.length >= 10}  // ADD THIS
                                          title={createdTeams.length >= 10 ? "Maximum team limit reached" : "Add Team"}  // ADD THIS
                                          style={{ fontSize: '16px' }}
                                        >
                                        {createdTeams.length >= 10 ? "Limit Reached" : "Add Team"}   
                                      </button>
                                    </td>
                                  )}
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
                            fontSize: '16px', 
                            marginTop: '5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <FaCheckCircle size={16} />
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
                            style={{ fontSize: '16px' }}
                          />
                        </div>

                        <div className="bracket-form-group">
                          <label htmlFor={`sport-${bracket.id}`}>Sport *</label>
                          <select
                            id={`sport-${bracket.id}`}
                            name="sport"
                            value={bracket.sport}
                            onChange={(e) => handleBracketInputChange(bracket.id, 'sport', e.target.value)}
                            disabled={bracket.selectedTeamIds.length > 0}
                            style={{ fontSize: '16px' }}
                          >
                            <option value="">Select a sport</option>
                            {Object.keys(positions).map((sport) => (
                              <option key={sport} value={sport}>{sport}</option>
                            ))}
                          </select>
                          {bracket.selectedTeamIds.length > 0 && bracket.sport && (
                            <small style={{ color: '#10b981', fontSize: '14px', marginTop: '5px', display: 'block' }}>
                              ✓ Sport auto-detected from assigned teams: {capitalize(bracket.sport)}
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
                            style={{ fontSize: '16px' }}
                          >
                            <option value="single">Single Elimination</option>
                            <option value="double">Double Elimination</option>
                            <option value="round_robin">Round Robin</option>
                          </select>
                          
                        {bracket.bracketType === 'single' && (
                            <small style={{ color: '#94a3b8', fontSize: '14px', marginTop: '5px', display: 'block' }}>
                              One loss eliminates a team from the tournament
                            </small>
                          )}
                          {bracket.bracketType === 'double' && (
                            <small style={{ color: '#94a3b8', fontSize: '14px', marginTop: '5px', display: 'block' }}>
                              Teams must lose twice to be eliminated from the tournament
                            </small>
                          )}
                          {bracket.bracketType === 'round_robin' && (
                            <small style={{ color: '#94a3b8', fontSize: '14px', marginTop: '5px', display: 'block' }}>
                              All teams play each other once - winner determined by standings
                            </small>
                          )}
                        </div>
                        <div className="bracket-form-group">
                          <label>Assigned Teams</label>
                          {bracket.selectedTeamIds.length === 0 ? (
                            <p style={{ color: '#fbbf24', fontSize: '16px', marginTop: '10px' }}>
                              No teams assigned to this bracket. Please go back to Step 2 and assign teams.
                            </p>
                          ) : (
                            <>
                              <div className="assigned-teams-list">
                                {bracket.selectedTeamIds.length > 0 && createdTeams
                                  .filter(team => bracket.selectedTeamIds.includes(String(team.id)) || bracket.selectedTeamIds.includes(Number(team.id)))
                                  .length === 0 ? (
                                  <p style={{ color: '#fbbf24', fontSize: '16px', padding: '10px', textAlign: 'center' }}>
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
                                            <strong style={{ fontSize: '16px' }}>{team.name}</strong>
                                            <span className={`bracket-sport-badge bracket-sport-${team.sport.toLowerCase() === 'volleyball' ? 'volleyball' : 'basketball'}`}>
                                              {capitalize(team.sport)}
                                            </span>
                                            <button 
                                              className="team-expand-btn"
                                              onClick={() => toggleTeamDetails(team.id)}
                                            >
                                              {expandedTeams[team.id] ? <FaChevronUp /> : <FaChevronDown />}
                                            </button>
                                          </div>
                                          <div className="team-meta" style={{ fontSize: '14px' }}>
                                            {team.players?.length || 0} players registered
                                          </div>
                                        </div>

                                        {/* Team Players Dropdown */}
                                        {expandedTeams[team.id] && (
                                          <div className="team-players-dropdown">
                                            <div className="players-dropdown-header">
                                              <h4 style={{ fontSize: '16px' }}>Players in {team.name}</h4>
                                              <span className="players-count" style={{ fontSize: '14px' }}>
                                                {team.players?.length || 0} players
                                              </span>
                                            </div>
                                            <div className="players-table-container-new">
                                              <table className="players-table-new">
                                                <thead>
                                                  <tr>
                                                <th style={{ fontSize: '16px', width: '80px' }}>Jersey #</th>
<th style={{ fontSize: '16px' }}>Player Name</th>
<th style={{ fontSize: '16px', width: '180px' }}>Position</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {team.players && team.players.length > 0 ? (
                                                    team.players.map((player, playerIndex) => (
                                                      <tr key={playerIndex}>
                                                        <td className="jersey-cell" style={{ fontSize: '16px' }}>
                                                          <span className="jersey-number">
                                                            {player.jersey_number || player.jerseyNumber}
                                                          </span>
                                                        </td>
                                                        <td className="player-name-cell" style={{ fontSize: '16px' }}>
                                                          {player.name}
                                                        </td>
                                                        <td className="position-cell" style={{ fontSize: '16px' }}>
                                                          <span className="position-badge">
                                                            {player.position}
                                                          </span>
                                                        </td>
                                                      </tr>
                                                    ))
                                                  ) : (
                                                    <tr>
                                                      <td colSpan="3" className="no-players-message" style={{ fontSize: '16px' }}>
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
                        ? "Creating Tournament..." 
                        : eventData.numberOfBrackets === 1 
                          ? "Create Tournament" 
                          : "Create Tournament"}
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
                    <div className="summary-item" style={{ fontSize: '16px' }}>
                      <strong>Event:</strong> {createdEvent?.name}
                    </div>
                    <div className="summary-item" style={{ fontSize: '16px' }}>
                      <strong>Duration:</strong> {new Date(createdEvent?.start_date).toLocaleDateString()} - {new Date(createdEvent?.end_date).toLocaleDateString()}
                    </div>
                    <div className="summary-item" style={{ fontSize: '16px' }}>
                      <strong>Total Teams:</strong> {createdTeams.length}
                    </div>
                    <div className="summary-item" style={{ fontSize: '16px' }}>
                      <strong>Brackets Created:</strong> {createdBrackets.length}
                    </div>
                    
                    {createdBrackets.map((bracket, index) => (
                      <div key={bracket.id} className="bracket-summary-item" style={{ fontSize: '16px' }}>
                        <strong>Bracket ${index + 1}:</strong> {bracket.name} ({bracket.selectedTeams || bracket.selectedTeamIds?.length || 0} teams)
                      </div>
                    ))}
                  </div>

                  <div className="bracket-form-actions" style={{ marginTop: '30px', gap: '15px' }}>
                     <button 
                      onClick={() => {
                        // Store context in sessionStorage for AdminEvents to load
                        if (createdEvent && createdBrackets.length > 0) {
                          sessionStorage.setItem('adminEventsReturnContext', JSON.stringify({
                            selectedEvent: createdEvent,
                            selectedBracket: createdBrackets[0], // Navigate to first bracket
                            contentTab: 'matches', // Go to Manage Matches tab
                            bracketViewType: 'list' // Set to list view
                          }));
                        }
                        window.location.href = '/AdminDashboard/events';
                      }}
                      className="bracket-submit-btn"
                      style={{ 
                        width: '100%', 
                        background: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      Go to Event Schedules
                      <FaChevronRight />
                    </button>
                                        <button 
                      onClick={handleStartNew}
                      className="bracket-submit-btn"
                      style={{ 
                        width: '100%',
                        background: '#10b981'  // Green color for success action
                      }}
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
        .validation-message-animated {
          animation: slideInDown 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-30px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .admin-teams-validation-message {
          position: relative;
          padding: 16px 45px 16px 20px;
          border-radius: 8px;
          margin-bottom: 25px;
          font-size: 16px;
          line-height: 1.6;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all 0.3s ease;
        }

        .admin-teams-error {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%);
          border: 2px solid rgba(239, 68, 68, 0.4);
          color: #fca5a5;
        }

        .admin-teams-success {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.15) 100%);
          border: 2px solid rgba(34, 197, 94, 0.4);
          color: #86efac;
        }

        .admin-teams-close-message {
          position: absolute;
          top: 50%;
          right: 15px;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: inherit;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .admin-teams-close-message:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-50%) scale(1.1);
        }

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
          font-size: 14px;
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

        .add-player-btn {
          background: #2196f3;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          margin-top: 15px;
        }

        .add-player-btn:hover {
          background: #1976d2;
          transform: translateY(-1px);
        }


        .admin-teams-count-success {
          color: #10b981;
          font-weight: 600;
          font-size: 16px;
        }

        .admin-teams-count-warning {
          color: #fbbf24;
          font-size: '16px';
        }

        /* NEW: Position Limits Styles */
       .position-limits-display {
  background: transparent; /* Remove background */
  border: none; /* Remove border */
  border-radius: 0;
  padding: 0 0 15px 0; /* Keep bottom padding only */
  margin-bottom: 20px;
}

        .position-limits-display h4 {
          margin: 0 0 10px 0;
          color: #e2e8f0;
          font-size: 16px;
        }

        .position-limits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 8px;
        }

        .position-limit-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .position-name {
          color: #e2e8f0;
          font-size: 14px;
        }

        .position-count {
          color: #10b981;
          font-weight: 600;
          font-size: 14px;
          padding: 2px 6px;
          border-radius: 12px;
          background: rgba(16, 185, 129, 0.2);
        }

        .position-count.limit-reached {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.2);
        }

        .position-unavailable {
          border-color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.1) !important;
        }

        .position-warning {
          color: #ef4444;
          font-size: 12px;
          margin-top: 5px;
          padding: 4px 8px;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 4px;
          border-left: 3px solid #ef4444;
        }

       .assigned-teams-list {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 15px;
  align-items: start; /* ADD THIS LINE */
}


       .assigned-team-item {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 20px;
  background: #1a2332;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  transition: all 0.2s ease;
  min-width: 350px;
  align-self: flex-start; /* ADD THIS LINE */
}

        .assigned-team-item:hover {
          background: rgba(33, 150, 243, 0.1);
          border-color: rgba(33, 150, 243, 0.3);
        }

        .team-number {
          width: 40px;
          height: 40px;
          background: #2196f3;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 18px;
          flex-shrink: 0;
        }

        .assigned-team-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .team-name-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .team-name-row strong {
          color: #e2e8f0;
          flex: 1;
          font-size: 18px;
        }

        .team-meta {
          color: #94a3b8;
          font-size: 15px;
        }


     .team-expand-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #e2e8f0;
        width: 36px;
        height: 36px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
        font-size: 16px;
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
  min-height: 40px;
}

.players-dropdown-header h4 {
  margin: 0;
  color: #e2e8f0;
  font-size: 16px;
  flex: 1;
}

.players-count {
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 14px;
  white-space: nowrap;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
  height: 28px;
}

.players-table-container-new {
  width: 100%;
  max-width: 100%;
  overflow: visible;
}

.players-table-new {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}

.players-table-new thead {
  background: #0a0f1c;
  position: sticky;
  top: 0;
  z-index: 10;
}

.players-table-new th {
  background: rgba(0, 0, 0, 0.4);
  color: #e2e8f0;
  padding: 12px 10px;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  font-size: 16px;
  height: 50px;
  vertical-align: middle;
  white-space: nowrap;
}

/* ADD THESE SPECIFIC ALIGNMENTS */
.players-table-new th:first-child {
  text-align: center; /* Center Jersey # header */
}

.players-table-new th:nth-child(2) {
  text-align: left;
  padding-left: 15px; /* Align Player Name header with content */
}

.players-table-new th:last-child {
  text-align: center; /* Center Position header */
}

.players-table-new td {
  padding: 12px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
  font-size: 16px;
  height: 60px;
  vertical-align: middle;
}

.players-table-new tr {
  height: 60px;
}

.players-table-new tbody tr:hover {
  background: rgba(255, 255, 255, 0.05);
}
}

        .players-table tr:hover {
          background: rgba(255, 255, 255, 0.05);
        }

 .jersey-cell {
  width: 100px;
  text-align: center;
  padding: 12px 10px !important; /* Ensure consistent padding */
}

     .jersey-number {
  display: inline-flex;
  background: #2196f3;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.player-name-cell {
  color: #e2e8f0;
  font-weight: 500;
  padding-left: 15px !important;
  text-align: left;
}

.position-cell {
  width: 180px;
  text-align: center;
  padding: 12px 10px !important; /* Ensure consistent padding */
}

       .position-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  white-space: nowrap;
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
          font-size: 20px;
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
          font-size: 16px;
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
          font-size: 16px;
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
          font-size: 18px;
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
          color: #e2e8f0;
          position: relative;
        }

        .team-summary-content {
          display: flex;
          flex-direction: column;
          gap: 5px;
          width: 100%;
        }

        .team-info-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
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
          padding: 16px 24px;
          background: transparent;
          color: #94a3b8;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          font-size: 16px;
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

        .team-search-input {
          width: 100%;
          padding: 12px 15px;
          background: #1a2332;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #e2e8f0;
          box-sizing: border-box;
        }

        .team-search-input:focus {
          outline: none;
          border-color: #2196f3;
        }

        .team-sport-filter {
          padding: 12px 15px;
          background: #1a2332;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #e2e8f0;
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
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
          background: #0a0f1c;
        }

        .teams-table td {
          padding: 15px;
          color: #cbd5e1;
        }

        .team-name-cell {
          color: #e2e8f0;
        }

        .bracket-sport-badge {
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 0.8em;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          white-space: nowrap;
          display: inline-block;
        }

        .bracket-sport-basketball {
          background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
          color: white;
        }

        .bracket-sport-volleyball {
          background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
          color: white;
        }

        .add-team-btn {
          padding: 10px 16px;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
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
          font-size: 20px;
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

        .team-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .edit-team-btn {
          background: #10b981;
          color: white;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          font-size: 16px;
          font-weight: bold;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          padding: 0;
        }

        .edit-team-btn:hover {
          background: #059669;
          transform: scale(1.1);
        }

        .editing-banner {
          background: linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(21, 101, 192, 0.2) 100%);
          border: 2px solid rgba(33, 150, 243, 0.4);
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #64b5f6;
          font-weight: 600;
          font-size: 16px;
        }

        .editing-banner span {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cancel-edit-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #e2e8f0;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .cancel-edit-btn:hover {
          background: rgba(255, 255, 255, 0.2);
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

          .team-search-filter-bar {
            flex-direction: column;
          }

          .team-sport-filter {
            width: '100%';
          }

          .teams-table {
            font-size: 14px;
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
            font-size: 14px;
          }

          .admin-teams-player-input-row {
            flex-wrap: wrap;
          }

          .position-limits-grid {
            grid-template-columns: 1fr;
          }

        
        }
           .csv-import-section {
            background: rgba(33, 150, 243, 0.1);
            border: 1px solid rgba(33, 150, 243, 0.3);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
          }

          .csv-import-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }

          .csv-import-btn, .csv-template-btn {
            padding: 12px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 16px; /* Change this to 18px or bigger */
          }

          .csv-import-btn {
            background: #2196f3;
            color: white;
            flex: 1;
            min-width: 200px;
          }

          .csv-import-btn:hover:not(:disabled) {
            background: #1976d2;
            transform: translateY(-1px);
          }

          .csv-import-btn:disabled {
            background: #64748b;
            cursor: not-allowed;
            opacity: 0.7;
          }

          .csv-template-btn {
            background: rgba(255, 255, 255, 0.1);
            color: #e2e8f0;
            border: 1px solid rgba(255, 255, 255, 0.2);
            flex: 1;
            min-width: 200px;
          }

          .csv-template-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-1px);
          }
      `}</style>
    </div>
  );
};

export default TournamentCreator;