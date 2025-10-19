import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrophy, FaCrown, FaChartBar, FaEye, FaEdit, FaTrash, FaPlus, FaSave, FaTimes, FaChevronLeft, FaChevronRight, FaUsers, FaUserPlus, FaUserEdit, FaMedal, FaStar, FaDownload, FaSearch } from "react-icons/fa";
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

  // Events pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Matches pagination states
  const [currentMatchesPage, setCurrentMatchesPage] = useState(1);
  const [matchesPerPage, setMatchesPerPage] = useState(10);

  // Edit modal state
  const [editModal, setEditModal] = useState({ show: false, event: null });
  const [editingEventName, setEditingEventName] = useState("");
  const [editingStartDate, setEditingStartDate] = useState("");
  const [editingEndDate, setEditingEndDate] = useState("");

  // Round filter state for matches
  const [roundFilter, setRoundFilter] = useState("all");

  // Edit Team modal state
  const [editTeamModal, setEditTeamModal] = useState({ 
    show: false, 
    bracket: null, 
    teams: [], 
    loading: false,
    selectedTeam: null,
    editingPlayer: null,
    newPlayer: { name: '', position: '', jersey_number: '' }
  });

  // Awards & Standings states
  const [standings, setStandings] = useState([]);
  const [mvpData, setMvpData] = useState(null);
  const [awards, setAwards] = useState(null);
  const [loadingAwards, setLoadingAwards] = useState(false);
  const [errorAwards, setErrorAwards] = useState(null);
  const [searchTermStandings, setSearchTermStandings] = useState("");
  const [awardsTab, setAwardsTab] = useState("standings");

  const safeNumber = (value, decimals = 1) => {
    const num = Number(value);
    return isNaN(num) ? 0 : Number(num.toFixed(decimals));
  };

  // Sport position mappings
  const sportPositions = {
    basketball: [
      'Point Guard',
      'Shooting Guard', 
      'Small Forward',
      'Power Forward',
      'Center'
    ],
    volleyball: [
      'Setter',
      'Outside Hitter',
      'Opposite Hitter',
      'Middle Blocker',
      'Libero',
      'Defensive Specialist'
    ],
    football: [
      'Quarterback',
      'Running Back',
      'Wide Receiver',
      'Tight End',
      'Offensive Lineman',
      'Defensive Lineman',
      'Linebacker',
      'Cornerback',
      'Safety',
      'Kicker',
      'Punter'
    ],
    soccer: [
      'Goalkeeper',
      'Defender',
      'Center Back',
      'Full Back',
      'Midfielder',
      'Defensive Midfielder',
      'Attacking Midfielder',
      'Winger',
      'Forward',
      'Striker'
    ],
    baseball: [
      'Pitcher',
      'Catcher',
      'First Baseman',
      'Second Baseman',
      'Third Baseman',
      'Shortstop',
      'Left Fielder',
      'Center Fielder',
      'Right Fielder',
      'Designated Hitter'
    ]
  };

  // Get positions for current bracket sport
  const getPositionsForSport = (sportType) => {
    const sport = sportType?.toLowerCase() || 'basketball';
    return sportPositions[sport] || sportPositions.basketball;
  };

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

  // Get unique rounds for filter dropdown
  const getUniqueRounds = () => {
    const rounds = matches.map(match => match.round_number);
    const uniqueRounds = [...new Set(rounds)].sort((a, b) => a - b);
    return uniqueRounds.map(round => ({
      value: round,
      label: formatRoundDisplay({ round_number: round, bracket_type: matches.find(m => m.round_number === round)?.bracket_type })
    }));
  };

  // Filter matches by selected round
  const filteredMatches = roundFilter === "all" 
    ? matches 
    : matches.filter(match => match.round_number === parseInt(roundFilter));

  // Filter standings by search term
  const filteredStandings = standings.filter(team =>
    team.team.toLowerCase().includes(searchTermStandings.toLowerCase())
  );

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

  // Check for return context from AdminStats
  useEffect(() => {
    const checkReturnContext = async () => {
      const returnContext = sessionStorage.getItem('adminEventsReturnContext');
      
      if (returnContext) {
        try {
          const { selectedEvent: eventContext, selectedBracket: bracketContext } = JSON.parse(returnContext);
          
          if (eventContext && bracketContext) {
            setSelectedEvent(eventContext);
            setSelectedBracket(bracketContext);
            setActiveTab("results");
            setContentTab("matches");
            setLoadingDetails(true);
            
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

  // Calculate flattened rows (each event-bracket pair is a row)
  const getFlattenedRows = () => {
    const rows = [];
    filteredEvents.forEach(event => {
      if (event.brackets && event.brackets.length > 0) {
        event.brackets.forEach(bracket => {
          rows.push({ event, bracket });
        });
      } else {
        rows.push({ event, bracket: null });
      }
    });
    return rows;
  };

  const flattenedRows = getFlattenedRows();

  // Events pagination calculations
  const totalRows = flattenedRows.length;
  const totalPages = Math.ceil(totalRows / itemsPerPage);
  const indexOfLastRow = currentPage * itemsPerPage;
  const indexOfFirstRow = indexOfLastRow - itemsPerPage;
  const currentRows = flattenedRows.slice(indexOfFirstRow, indexOfLastRow);

  // Matches pagination calculations
  const indexOfLastMatch = currentMatchesPage * matchesPerPage;
  const indexOfFirstMatch = indexOfLastMatch - matchesPerPage;
  const currentMatches = filteredMatches.slice(indexOfFirstMatch, indexOfLastMatch);
  const totalMatchesPages = Math.ceil(filteredMatches.length / matchesPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, itemsPerPage]);

  // Reset matches page when matches or round filter changes
  useEffect(() => {
    setCurrentMatchesPage(1);
  }, [matches, roundFilter]);

  // Events pagination handlers
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Matches pagination handlers
  const goToMatchesPage = (page) => {
    setCurrentMatchesPage(Math.max(1, Math.min(page, totalMatchesPages)));
  };

  const goToNextMatchesPage = () => {
    if (currentMatchesPage < totalMatchesPages) setCurrentMatchesPage(currentMatchesPage + 1);
  };

  const goToPrevMatchesPage = () => {
    if (currentMatchesPage > 1) setCurrentMatchesPage(currentMatchesPage - 1);
  };

  // Handle bracket selection
  const handleBracketSelect = async (event, bracket) => {
    setSelectedEvent(event);
    setSelectedBracket(bracket);
    setActiveTab("results");
    setContentTab("matches");
    setLoadingDetails(true);
    setError(null);
    setRoundFilter("all"); // Reset round filter when selecting new bracket

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

  // Load awards data when awards tab is selected
  useEffect(() => {
    const loadAwardsData = async () => {
      if (contentTab === "awards" && selectedBracket) {
        setLoadingAwards(true);
        setErrorAwards(null);

        try {
          const standingsRes = await fetch(`http://localhost:5000/api/awards/brackets/${selectedBracket.id}/standings`);
          const standingsData = await standingsRes.json();
          setStandings(standingsData.standings || []);

          const awardsRes = await fetch(`http://localhost:5000/api/awards/brackets/${selectedBracket.id}/mvp-awards`);
          const awardsData = await awardsRes.json();
          
          setMvpData(awardsData.awards?.mvp || null);
          setAwards(awardsData.awards || null);
        } catch (err) {
          setErrorAwards("Failed to load awards data: " + err.message);
          console.error("Error loading awards:", err);
        } finally {
          setLoadingAwards(false);
        }
      }
    };

    loadAwardsData();
  }, [contentTab, selectedBracket]);

  // Export standings to CSV
  const exportStandings = () => {
    if (standings.length === 0 || !selectedBracket) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (selectedBracket.sport_type === "basketball") {
      csvContent += "Position,Team,Wins,Losses,Points For,Points Against,Point Diff,Win%\n";
      standings.forEach(team => {
        csvContent += `${team.position},${team.team},${team.wins},${team.losses},${team.points_for},${team.points_against},${team.point_diff},${team.win_percentage}\n`;
      });
    } else {
      csvContent += "Position,Team,Wins,Losses,Sets For,Sets Against,Set Ratio,Win%\n";
      standings.forEach(team => {
        csvContent += `${team.position},${team.team},${team.wins},${team.losses},${team.sets_for},${team.sets_against},${team.set_ratio},${team.win_percentage}\n`;
      });
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedEvent?.name}_${selectedBracket?.name}_standings.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get awards for display
  const getAwardsForDisplay = () => {
    if (!awards || !selectedBracket) return [];
    
    const awardsArray = [];
    
    if (selectedBracket.sport_type === "basketball") {
      if (awards.mvp) {
        awardsArray.push({
          category: "Most Valuable Player",
          winner: awards.mvp.player_name || 'Unknown',
          team: awards.mvp.team_name || 'Unknown',
          stat: `${safeNumber(awards.mvp.ppg)} PPG`
        });
      }
      if (awards.best_playmaker) {
        awardsArray.push({
          category: "Best Playmaker",
          winner: awards.best_playmaker.player_name || 'Unknown',
          team: awards.best_playmaker.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_playmaker.apg)} APG`
        });
      }
      if (awards.best_defender) {
        awardsArray.push({
          category: "Best Defender",
          winner: awards.best_defender.player_name || 'Unknown',
          team: awards.best_defender.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_defender.spg)} SPG`
        });
      }
      if (awards.best_rebounder) {
        awardsArray.push({
          category: "Best Rebounder",
          winner: awards.best_rebounder.player_name || 'Unknown',
          team: awards.best_rebounder.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_rebounder.rpg)} RPG`
        });
      }
      if (awards.best_blocker) {
        awardsArray.push({
          category: "Best Blocker",
          winner: awards.best_blocker.player_name || 'Unknown',
          team: awards.best_blocker.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_blocker.bpg)} BPG`
        });
      }
    } else {
      if (awards.mvp) {
        awardsArray.push({
          category: "Most Valuable Player",
          winner: awards.mvp.player_name || 'Unknown',
          team: awards.mvp.team_name || 'Unknown',
          stat: `${safeNumber(awards.mvp.kpg)} K/G`
        });
      }
      if (awards.best_blocker) {
        awardsArray.push({
          category: "Best Blocker",
          winner: awards.best_blocker.player_name || 'Unknown',
          team: awards.best_blocker.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_blocker.bpg)} BPG, ${safeNumber(awards.best_blocker.hitting_percentage)}% Hit`
        });
      }
      if (awards.best_setter) {
        awardsArray.push({
          category: "Best Setter",
          winner: awards.best_setter.player_name || 'Unknown',
          team: awards.best_setter.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_setter.apg)} A/G`
        });
      }
      if (awards.best_libero) {
        awardsArray.push({
          category: "Best Libero",
          winner: awards.best_libero.player_name || 'Unknown',
          team: awards.best_libero.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_libero.dpg)} D/G, ${safeNumber(awards.best_libero.reception_percentage)}% Rec`
        });
      }
      if (awards.best_server) {
        awardsArray.push({
          category: "Best Server",
          winner: awards.best_server.player_name || 'Unknown',
          team: awards.best_server.team_name || 'Unknown',
          stat: `${safeNumber(awards.best_server.acepg)} ACE/G, ${safeNumber(awards.best_server.service_percentage)}% Srv`
        });
      }
    }
    
    return awardsArray.filter(a => a.winner && a.winner !== 'Unknown');
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

  // Edit Team handler
  const handleEditTeam = async (bracket) => {
    setEditTeamModal({ 
      show: true, 
      bracket: bracket, 
      teams: [], 
      loading: true,
      selectedTeam: null,
      editingPlayer: null,
      newPlayer: { name: '', position: '', jersey_number: '' }
    });

    try {
      // Fetch teams in this bracket
      const teamsRes = await fetch(`http://localhost:5000/api/bracketTeams/bracket/${bracket.id}`);
      
      if (!teamsRes.ok) {
        throw new Error(`HTTP error! status: ${teamsRes.status}`);
      }
      
      const teams = await teamsRes.json();
      
      // Fetch players for each team
      const teamsWithPlayers = await Promise.all(
        teams.map(async (team) => {
          try {
            const playersRes = await fetch(`http://localhost:5000/api/teams/${team.id}`);
            if (playersRes.ok) {
              const teamWithPlayers = await playersRes.json();
              return { ...team, players: teamWithPlayers.players || [] };
            }
            return { ...team, players: [] };
          } catch (err) {
            console.error(`Error fetching players for team ${team.id}:`, err);
            return { ...team, players: [] };
          }
        })
      );
      
      setEditTeamModal(prev => ({
        ...prev,
        teams: teamsWithPlayers,
        loading: false,
        error: null
      }));
    } catch (err) {
      console.error('Error fetching teams:', err);
      setEditTeamModal(prev => ({
        ...prev,
        loading: false,
        error: `Failed to load teams: ${err.message}`
      }));
    }
  };

  // Select a team to manage players
  const handleSelectTeam = (team) => {
    setEditTeamModal(prev => ({
      ...prev,
      selectedTeam: team,
      editingPlayer: null,
      newPlayer: { name: '', position: '', jersey_number: '' }
    }));
  };

  // Back to team list
  const handleBackToTeams = () => {
    setEditTeamModal(prev => ({
      ...prev,
      selectedTeam: null,
      editingPlayer: null,
      newPlayer: { name: '', position: '', jersey_number: '' }
    }));
  };

  // Start editing a player
  const handleEditPlayer = (player) => {
    setEditTeamModal(prev => ({
      ...prev,
      editingPlayer: { ...player },
      newPlayer: { name: '', position: '', jersey_number: '' }
    }));
  };

  // Cancel editing player
  const handleCancelEditPlayer = () => {
    setEditTeamModal(prev => ({
      ...prev,
      editingPlayer: null,
      newPlayer: { name: '', position: '', jersey_number: '' }
    }));
  };

  // Update player
  const handleUpdatePlayer = async () => {
    const { editingPlayer, selectedTeam } = editTeamModal;
    
    if (!editingPlayer.name || !editingPlayer.position || !editingPlayer.jersey_number) {
      alert("Please fill in all player fields");
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/teams/${selectedTeam.id}/players/${editingPlayer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingPlayer.name,
          position: editingPlayer.position,
          jerseyNumber: editingPlayer.jersey_number
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // Update the UI immediately
      setEditTeamModal(prev => {
        const updatedTeams = prev.teams.map(team => {
          if (team.id === selectedTeam.id) {
            const updatedPlayers = team.players.map(player => 
              player.id === editingPlayer.id ? { ...editingPlayer } : player
            );
            return { ...team, players: updatedPlayers };
          }
          return team;
        });

        // Also update selectedTeam if it's the current one
        const updatedSelectedTeam = updatedTeams.find(team => team.id === selectedTeam.id);

        return {
          ...prev,
          teams: updatedTeams,
          selectedTeam: updatedSelectedTeam,
          editingPlayer: null
        };
      });

      alert("Player updated successfully!");
    } catch (err) {
      console.error('Error updating player:', err);
      alert('Failed to update player: ' + err.message);
    }
  };

  // Add new player
  const handleAddPlayer = async () => {
    const { newPlayer, selectedTeam } = editTeamModal;
    
    if (!newPlayer.name || !newPlayer.position || !newPlayer.jersey_number) {
      alert("Please fill in all player fields");
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/teams/${selectedTeam.id}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlayer.name,
          position: newPlayer.position,
          jerseyNumber: newPlayer.jersey_number
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const newPlayerData = await res.json();

      // Update the UI immediately
      setEditTeamModal(prev => {
        const updatedTeams = prev.teams.map(team => {
          if (team.id === selectedTeam.id) {
            const updatedPlayers = [...team.players, { ...newPlayerData }];
            return { ...team, players: updatedPlayers };
          }
          return team;
        });

        // Also update selectedTeam if it's the current one
        const updatedSelectedTeam = updatedTeams.find(team => team.id === selectedTeam.id);

        return {
          ...prev,
          teams: updatedTeams,
          selectedTeam: updatedSelectedTeam,
          newPlayer: { name: '', position: '', jersey_number: '' }
        };
      });

      alert("Player added successfully!");
    } catch (err) {
      console.error('Error adding player:', err);
      alert('Failed to add player: ' + err.message);
    }
  };

  // Delete player
  const handleDeletePlayer = async (playerId) => {
    if (!confirm('Are you sure you want to delete this player?')) {
      return;
    }

    const { selectedTeam } = editTeamModal;

    try {
      const res = await fetch(`http://localhost:5000/api/teams/${selectedTeam.id}/players/${playerId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // Update the UI immediately
      setEditTeamModal(prev => {
        const updatedTeams = prev.teams.map(team => {
          if (team.id === selectedTeam.id) {
            const updatedPlayers = team.players.filter(player => player.id !== playerId);
            return { ...team, players: updatedPlayers };
          }
          return team;
        });

        // Also update selectedTeam if it's the current one
        const updatedSelectedTeam = updatedTeams.find(team => team.id === selectedTeam.id);

        return {
          ...prev,
          teams: updatedTeams,
          selectedTeam: updatedSelectedTeam
        };
      });

      alert("Player deleted successfully!");
    } catch (err) {
      console.error('Error deleting player:', err);
      alert('Failed to delete player: ' + err.message);
    }
  };

  // Close edit team modal
  const closeEditTeamModal = () => {
    setEditTeamModal({ 
      show: false, 
      bracket: null, 
      teams: [], 
      loading: false,
      selectedTeam: null,
      editingPlayer: null,
      newPlayer: { name: '', position: '', jersey_number: '' }
    });
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
        
        setEvents(prev => prev.map(event => 
          event.id === editModal.event.id ? { ...event, ...updatedEvent } : event
        ));

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
    sessionStorage.setItem('selectedEventForBracket', JSON.stringify({
      id: event.id,
      name: event.name,
      start_date: event.start_date,
      end_date: event.end_date
    }));
    
    navigate('/AdminDashboard/tournament-creator', { 
      state: { 
        selectedEvent: event,
        fromEvents: true 
      } 
    });
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

  const confirmDelete = async () => {
    const { type, id } = deleteConfirm;
    
    try {
      let endpoint = '';
      if (type === 'event') endpoint = `http://localhost:5000/api/events/${id}`;
      else if (type === 'bracket') endpoint = `http://localhost:5000/api/brackets/${id}`;

      const res = await fetch(endpoint, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');

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
      }

      setDeleteConfirm({ show: false, type: '', id: null, name: '' });
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`);
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

            {/* Events Selection Tab - WITH PURPLE BACKGROUND */}
            {activeTab === "events" && (
              <div className="bracket-view-section purple-background">
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
                  <button 
                    className="awards_standings_export_btn" 
                    onClick={() => navigate('/AdminDashboard/tournament-creator')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <FaPlus /> Create Event
                  </button>
                </div>

                {/* Results Info & Items Per Page */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {(searchTerm || statusFilter !== "all") && (
                      <>
                        Showing {currentRows.length} of {totalRows} results
                        {searchTerm && <span style={{ color: 'var(--primary-color)', marginLeft: '5px' }}> • Searching: "{searchTerm}"</span>}
                        {statusFilter !== "all" && <span style={{ color: 'var(--primary-color)', marginLeft: '5px' }}> • Status: {statusFilter}</span>}
                      </>
                    )}
                    {!searchTerm && statusFilter === "all" && (
                      <>Showing {indexOfFirstRow + 1}-{Math.min(indexOfLastRow, totalRows)} of {totalRows} entries</>
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
                    <p>Loading events...</p>
                  </div>
                ) : totalRows === 0 ? (
                  <div className="bracket-no-brackets">
                    {events.length === 0 ? (
                      <>
                        <p>No events found. Create an event first to view matches.</p>
                        <button 
                          className="bracket-view-btn" 
                          onClick={() => navigate('/AdminDashboard/tournament-creator')}
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
                  <>
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
                          {currentRows.map((row, index) => {
                            const { event, bracket } = row;
                            const isFirstBracketOfEvent = index === 0 || currentRows[index - 1].event.id !== event.id;
                            const bracketsInEvent = currentRows.filter(r => r.event.id === event.id).length;
                            
                            return bracket ? (
                              <tr key={`${event.id}-${bracket.id}`}>
                                {isFirstBracketOfEvent && (
                                  <>
                                    <td rowSpan={bracketsInEvent} style={{ fontWeight: '600', borderRight: '1px solid var(--border-color)', fontSize: '16px' }}>
                                      {event.name}
                                    </td>
                                    <td rowSpan={bracketsInEvent} style={{ borderRight: '1px solid var(--border-color)' }}>
                                      <span className={`bracket-sport-badge ${event.status === "ongoing" ? "bracket-sport-basketball" : "bracket-sport-volleyball"}`} style={{ fontSize: '13px', padding: '8px 14px' }}>
                                        {event.status}
                                      </span>
                                    </td>
                                    <td rowSpan={bracketsInEvent} style={{ fontSize: '15px', borderRight: '1px solid var(--border-color)' }}>
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
                                    <button
                                      onClick={() => handleEditEvent(event)}
                                      className="bracket-view-btn"
                                      style={{ fontSize: '13px', padding: '8px 14px', background: 'var(--primary-color)', flex: '1 1 auto', minWidth: '55px' }}
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
                                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px', fontStyle: 'italic' }}>
                                  No brackets available for this event
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button
                                      onClick={() => handleEditEvent(event)}
                                      className="bracket-view-btn"
                                      style={{ fontSize: '13px', padding: '8px 14px', background: 'var(--primary-color)', flex: '1 1 auto', minWidth: '55px' }}
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
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Events Pagination Controls */}
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
                    <FaChartBar /> Manage Matches
                  </button>
                  <button
                    className={`awards_standings_tab_button ${contentTab === "bracket" ? "awards_standings_tab_active" : ""}`}
                    onClick={() => setContentTab("bracket")}
                  >
                    <FaEye /> Bracket View
                  </button>
                  <button
                    className={`awards_standings_tab_button ${contentTab === "awards" ? "awards_standings_tab_active" : ""}`}
                    onClick={() => setContentTab("awards")}
                  >
                    <FaTrophy /> Awards & Standings
                  </button>
                </div>

                {loadingDetails ? (
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
                        {/* Round Filter Only - Removed Show per page */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '30px' }}>
                          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', minWidth: '200px' }}>
                            <label style={{ 
                              fontSize: '14px', 
                              color: 'var(--text-secondary)',
                              whiteSpace: 'nowrap'
                            }}>
                              Sort Rounds:
                            </label>
                            <select
                              value={roundFilter}
                              onChange={(e) => setRoundFilter(e.target.value)}
                              style={{
                                padding: '12px 16px',
                                border: '2px solid var(--border-color)',
                                borderRadius: '8px',
                                fontSize: '14px',
                                backgroundColor: 'var(--background-secondary)',
                                color: 'var(--text-primary)',
                                minWidth: '200px',
                              }}
                            >
                              <option value="all">All Rounds</option>
                              {getUniqueRounds().map(round => (
                                <option key={round.value} value={round.value}>
                                  {round.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Matches Count Info */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            {roundFilter === "all" ? (
                              <>Showing {indexOfFirstMatch + 1}-{Math.min(indexOfLastMatch, filteredMatches.length)} of {filteredMatches.length} matches</>
                            ) : (
                              <>Showing {indexOfFirstMatch + 1}-{Math.min(indexOfLastMatch, filteredMatches.length)} of {filteredMatches.length} matches in {getUniqueRounds().find(r => r.value === parseInt(roundFilter))?.label}</>
                            )}
                          </div>
                        </div>

                        {filteredMatches.length === 0 ? (
                          <div className="bracket-no-brackets">
                            <p>No matches available {roundFilter !== "all" ? "for the selected round" : "for this bracket"}.</p>
                            {roundFilter !== "all" && (
                              <button 
                                className="bracket-view-btn" 
                                onClick={() => setRoundFilter("all")}
                              >
                                Show All Rounds
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
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
                                  {currentMatches.map((match) => {
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

                            {/* Matches Pagination Controls */}
                            {totalMatchesPages > 1 && (
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
                                  Page {currentMatchesPage} of {totalMatchesPages}
                                </div>
                                
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                  <button
                                    onClick={goToPrevMatchesPage}
                                    disabled={currentMatchesPage === 1}
                                    style={{
                                      padding: '10px 16px',
                                      background: currentMatchesPage === 1 ? 'var(--text-muted)' : 'var(--primary-color)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: currentMatchesPage === 1 ? 'not-allowed' : 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      fontSize: '14px',
                                      opacity: currentMatchesPage === 1 ? 0.5 : 1,
                                      transition: 'all 0.2s ease'
                                    }}
                                  >
                                    <FaChevronLeft /> Previous
                                  </button>

                                  {/* Page Numbers */}
                                  <div style={{ display: 'flex', gap: '5px' }}>
                                    {Array.from({ length: Math.min(5, totalMatchesPages) }, (_, i) => {
                                      let pageNum;
                                      if (totalMatchesPages <= 5) {
                                        pageNum = i + 1;
                                      } else if (currentMatchesPage <= 3) {
                                        pageNum = i + 1;
                                      } else if (currentMatchesPage >= totalMatchesPages - 2) {
                                        pageNum = totalMatchesPages - 4 + i;
                                      } else {
                                        pageNum = currentMatchesPage - 2 + i;
                                      }

                                      return (
                                        <button
                                          key={pageNum}
                                          onClick={() => goToMatchesPage(pageNum)}
                                          style={{
                                            padding: '10px 14px',
                                            background: currentMatchesPage === pageNum ? 'var(--primary-color)' : 'var(--background-card)',
                                            color: currentMatchesPage === pageNum ? 'white' : 'var(--text-primary)',
                                            border: currentMatchesPage === pageNum ? 'none' : '2px solid var(--border-color)',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: currentMatchesPage === pageNum ? '600' : '400',
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
                                    onClick={goToNextMatchesPage}
                                    disabled={currentMatchesPage === totalMatchesPages}
                                    style={{
                                      padding: '10px 16px',
                                      background: currentMatchesPage === totalMatchesPages ? 'var(--text-muted)' : 'var(--primary-color)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: currentMatchesPage === totalMatchesPages ? 'not-allowed' : 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      fontSize: '14px',
                                      opacity: currentMatchesPage === totalMatchesPages ? 0.5 : 1,
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

                    {contentTab === "bracket" && (
                      <div className="awards_standings_tab_content">
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '24px' }}>
                          <button
                            onClick={() => handleEditTeam(selectedBracket)}
                            style={{ 
                              fontSize: '13px', 
                              padding: '10px 16px', 
                              background: 'var(--success-color)', 
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
                            title="Manage Team Players"
                          >
                            <FaUsers /> Edit Teams
                          </button>
                          <button
                            onClick={() => handleEditBracket(selectedBracket)}
                            style={{ 
                              fontSize: '13px', 
                              padding: '10px 16px', 
                              background: 'var(--primary-color)', 
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

                    {contentTab === "awards" && (
                      <div className="awards_standings_tab_content">
                        {loadingAwards ? (
                          <div className="awards_standings_loading">
                            <div className="awards_standings_spinner"></div>
                            <p>Loading awards data...</p>
                          </div>
                        ) : errorAwards ? (
                          <div className="bracket-error"><p>{errorAwards}</p></div>
                        ) : (
                          <>
                            <div className="awards_standings_tabs">
                              <button
                                className={`awards_standings_tab_button ${awardsTab === "standings" ? "awards_standings_tab_active" : ""}`}
                                onClick={() => setAwardsTab("standings")}
                              >
                                <FaTrophy /> Team Standings
                              </button>
                              <button
                                className={`awards_standings_tab_button ${awardsTab === "mvp" ? "awards_standings_tab_active" : ""}`}
                                onClick={() => setAwardsTab("mvp")}
                              >
                                <FaCrown /> Tournament MVP
                              </button>
                              <button
                                className={`awards_standings_tab_button ${awardsTab === "awards" ? "awards_standings_tab_active" : ""}`}
                                onClick={() => setAwardsTab("awards")}
                              >
                                <FaMedal /> Awards
                              </button>
                            </div>

                            {awardsTab === "standings" && (
                              <div className="awards_standings_tab_content">
                                <div className="awards_standings_toolbar">
                                  <div className="awards_standings_search_container">
                                    <FaSearch className="awards_standings_search_icon" />
                                    <input
                                      type="text"
                                      className="awards_standings_search_input"
                                      placeholder="Search teams..."
                                      value={searchTermStandings}
                                      onChange={(e) => setSearchTermStandings(e.target.value)}
                                    />
                                  </div>
                                  <button className="awards_standings_export_btn" onClick={exportStandings}>
                                    <FaDownload /> Export CSV
                                  </button>
                                </div>

                                <div className="awards_standings_table_container">
                                  <table className="awards_standings_table">
                                    <thead>
                                      <tr>
                                        <th>Rank</th>
                                        <th>Team</th>
                                        <th>W</th>
                                        <th>L</th>
                                        {selectedBracket.sport_type === "basketball" ? (
                                          <>
                                            <th>PF</th>
                                            <th>PA</th>
                                            <th>Diff</th>
                                          </>
                                        ) : (
                                          <>
                                            <th>SF</th>
                                            <th>SA</th>
                                            <th>Ratio</th>
                                          </>
                                        )}
                                        <th>Win%</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {filteredStandings.map((team, index) => (
                                        <tr key={index} className={team.position <= 3 ? `awards_standings_podium_${team.position}` : ""}>
                                          <td className="awards_standings_rank">
                                            {team.position <= 3 && (
                                              <span className="awards_standings_medal">
                                                {team.position === 1 ? "🥇" : team.position === 2 ? "🥈" : "🥉"}
                                              </span>
                                            )}
                                            {team.position}
                                          </td>
                                          <td className="awards_standings_team_name">
                                            <strong>{team.team}</strong>
                                          </td>
                                          <td>{team.wins}</td>
                                          <td>{team.losses}</td>
                                          {selectedBracket.sport_type === "basketball" ? (
                                            <>
                                              <td>{team.points_for}</td>
                                              <td>{team.points_against}</td>
                                              <td className={String(team.point_diff).startsWith('+') ? 'awards_standings_positive' : String(team.point_diff).startsWith('-') ? 'awards_standings_negative' : ''}>
                                                {team.point_diff}
                                              </td>
                                            </>
                                          ) : (
                                            <>
                                              <td>{team.sets_for}</td>
                                              <td>{team.sets_against}</td>
                                              <td>{team.set_ratio}</td>
                                            </>
                                          )}
                                          <td>{team.win_percentage}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {awardsTab === "mvp" && (
                              <div className="awards_standings_tab_content">
                                {!mvpData ? (
                                  <div className="bracket-no-brackets">
                                    <p>No MVP data available. Make sure player statistics have been recorded for completed matches.</p>
                                  </div>
                                ) : (
                                  <div className="awards_standings_mvp_section">
                                    <div className="awards_standings_mvp_header">
                                      <div className="awards_standings_mvp_crown">
                                        <FaCrown />
                                      </div>
                                      <h2>Tournament Most Valuable Player</h2>
                                    </div>
                                    
                                    <div className="awards_standings_mvp_card">
                                      <div className="awards_standings_mvp_info">
                                        <div className="awards_standings_mvp_name_section">
                                          <h3>{mvpData.player_name || 'Unknown Player'}</h3>
                                          <span className="awards_standings_mvp_team">{mvpData.team_name || 'Unknown Team'}</span>
                                          <span className="awards_standings_mvp_jersey">#{mvpData.jersey_number || 'N/A'}</span>
                                        </div>
                                        
                                        <div className="awards_standings_mvp_stats_grid">
                                          <div className="awards_standings_stat_card">
                                            <div className="awards_standings_stat_value">{mvpData.games_played || 0}</div>
                                            <div className="awards_standings_stat_label">Games Played</div>
                                          </div>

                                          {selectedBracket.sport_type === "basketball" ? (
                                            <>
                                              <div className="awards_standings_stat_card awards_standings_highlight">
                                                <div className="awards_standings_stat_value">{safeNumber(mvpData.ppg)}</div>
                                                <div className="awards_standings_stat_label">PPG</div>
                                              </div>
                                              <div className="awards_standings_stat_card">
                                                <div className="awards_standings_stat_value">{safeNumber(mvpData.apg)}</div>
                                                <div className="awards_standings_stat_label">APG</div>
                                              </div>
                                              <div className="awards_standings_stat_card">
                                                <div className="awards_standings_stat_value">{safeNumber(mvpData.rpg)}</div>
                                                <div className="awards_standings_stat_label">RPG</div>
                                              </div>
                                              <div className="awards_standings_stat_card">
                                                <div className="awards_standings_stat_value">{safeNumber(mvpData.spg)}</div>
                                                <div className="awards_standings_stat_label">SPG</div>
                                              </div>
                                              <div className="awards_standings_stat_card">
                                                <div className="awards_standings_stat_value">{safeNumber(mvpData.bpg)}</div>
                                                <div className="awards_standings_stat_label">BPG</div>
                                              </div>
                                              <div className="awards_standings_stat_card awards_standings_highlight">
                                                <div className="awards_standings_stat_value">{safeNumber(mvpData.mvp_score, 2)}</div>
                                                <div className="awards_standings_stat_label">MVP Score</div>
                                              </div>
                                            </>
                                          ) : (
                                            <>
                                              <div className="awards_standings_stat_card awards_standings_highlight">
                                                <div className="awards_standings_stat_value">{safeNumber(mvpData.kpg)}</div>
                                                <div className="awards_standings_stat_label">K/G</div>
                                              </div>
                                              <div className="awards_standings_stat_card">
                                                <div className="awards_standings_stat_value">{safeNumber(mvpData.apg)}</div>
                                                <div className="awards_standings_stat_label">A/G</div>
                                              </div>
                                              <div className="awards_standings_stat_card">
                                                <div className="awards_standings_stat_value">{safeNumber(mvpData.dpg)}</div>
                                                <div className="awards_standings_stat_label">D/G</div>
                                              </div>
                                              <div className="awards_standings_stat_card">
                                                <div className="awards_standings_stat_value">{safeNumber(mvpData.bpg)}</div>
                                                <div className="awards_standings_stat_label">B/G</div>
                                              </div>
                                              <div className="awards_standings_stat_card">
                                                <div className="awards_standings_stat_value">{safeNumber(mvpData.acepg)}</div>
                                                <div className="awards_standings_stat_label">Ace/G</div>
                                              </div>
                                              <div className="awards_standings_stat_card awards_standings_highlight">
                                                <div className="awards_standings_stat_value">{safeNumber(mvpData.mvp_score, 2)}</div>
                                                <div className="awards_standings_stat_label">MVP Score</div>
                                              </div>
                                            </>
                                          )}
                                        </div>

                                        {selectedBracket.sport_type === "volleyball" && (
                                          <div className="awards_standings_percentage_section">
                                            <h4>Performance Percentages</h4>
                                            <div className="awards_standings_percentage_grid">
                                              <div className="awards_standings_percentage_card">
                                                <div className="awards_standings_percentage_bar">
                                                  <div 
                                                    className="awards_standings_percentage_fill"
                                                    style={{ width: `${Math.min(Math.max(mvpData.hitting_percentage || 0, 0), 100)}%` }}
                                                  ></div>
                                                </div>
                                                <div className="awards_standings_percentage_label">
                                                  <span>Hitting %</span>
                                                  <strong>{safeNumber(mvpData.hitting_percentage)}%</strong>
                                                </div>
                                              </div>
                                              <div className="awards_standings_percentage_card">
                                                <div className="awards_standings_percentage_bar">
                                                  <div 
                                                    className="awards_standings_percentage_fill"
                                                    style={{ width: `${Math.min(Math.max(mvpData.service_percentage || 0, 0), 100)}%` }}
                                                  ></div>
                                                </div>
                                                <div className="awards_standings_percentage_label">
                                                  <span>Service %</span>
                                                  <strong>{safeNumber(mvpData.service_percentage)}%</strong>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {awardsTab === "awards" && (
                              <div className="awards_standings_tab_content">
                                {!awards || getAwardsForDisplay().length === 0 ? (
                                  <div className="bracket-no-brackets">
                                    <p>No awards data available. Make sure player statistics have been recorded for completed matches.</p>
                                  </div>
                                ) : (
                                  <div className="awards_standings_awards_section">
                                    <h2>Tournament Awards</h2>
                                    <div className="awards_standings_table_container">
                                      <table className="awards_standings_table">
                                        <thead>
                                          <tr>
                                            <th style={{ width: '60px', textAlign: 'center' }}></th>
                                            <th>Award Category</th>
                                            <th>Winner</th>
                                            <th>Team</th>
                                            <th>Statistics</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {getAwardsForDisplay().map((award, index) => (
                                            <tr key={index}>
                                              <td style={{ textAlign: 'center' }}>
                                                {index === 0 ? (
                                                  <FaCrown style={{ color: '#fbbf24', fontSize: '24px' }} />
                                                ) : (
                                                  <FaStar style={{ color: '#3b82f6', fontSize: '20px' }} />
                                                )}
                                              </td>
                                              <td style={{ fontWeight: '600' }}>{award.category}</td>
                                              <td style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)' }}>{award.winner}</td>
                                              <td>{award.team}</td>
                                              <td style={{ color: '#3b82f6', fontWeight: '600' }}>{award.stat}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
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

      {/* Edit Event Modal */}
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
                  style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--primary-color)' }}
                >
                  <FaSave /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {editTeamModal.show && editTeamModal.bracket && (
        <div className="admin-teams-modal-overlay" onClick={closeEditTeamModal}>
          <div className="admin-teams-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '90vh' }}>
            <div className="admin-teams-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <FaUsers style={{ color: 'var(--success-color)' }} />
                <h2 style={{ margin: 0 }}>
                  {editTeamModal.selectedTeam 
                    ? `Manage Players - ${editTeamModal.selectedTeam.name}` 
                    : `Manage Teams - ${editTeamModal.bracket.name}`}
                </h2>
              </div>
              <button onClick={closeEditTeamModal} className="admin-teams-modal-close">
                <FaTimes />
              </button>
            </div>
            
            <div className="admin-teams-modal-body" style={{ overflow: 'auto' }}>
              {editTeamModal.loading ? (
                <div className="awards_standings_loading">
                  <div className="awards_standings_spinner"></div>
                  <p>Loading teams...</p>
                </div>
              ) : editTeamModal.error ? (
                <div className="bracket-error">
                  <p>{editTeamModal.error}</p>
                  <button 
                    onClick={() => handleEditTeam(editTeamModal.bracket)}
                    className="bracket-view-btn"
                    style={{ marginTop: '10px' }}
                  >
                    Try Again
                  </button>
                </div>
              ) : !editTeamModal.selectedTeam ? (
                // Team Selection View
                <div>
                  <h3 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>
                    Select a Team to Manage Players ({editTeamModal.teams.length})
                  </h3>
                  {editTeamModal.teams.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                      No teams assigned to this bracket yet.
                    </p>
                  ) : (
                    <div className="awards_standings_table_container">
                      <table className="awards_standings_table">
                        <thead>
                          <tr>
                            <th>Team Name</th>
                            <th>Sport</th>
                            <th>Players</th>
                            <th style={{ width: '150px', textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editTeamModal.teams.map(team => (
                            <tr key={team.assignment_id || team.id}>
                              <td style={{ fontWeight: '600' }}>{team.name}</td>
                              <td>
                                <span className={`bracket-sport-badge ${team.sport === 'volleyball' ? 'bracket-sport-volleyball' : 'bracket-sport-basketball'}`}>
                                  {team.sport?.toUpperCase() || 'N/A'}
                                </span>
                              </td>
                              <td>{team.players?.length || 0} players</td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  onClick={() => handleSelectTeam(team)}
                                  className="bracket-view-btn"
                                  style={{ 
                                    fontSize: '12px', 
                                    padding: '6px 12px', 
                                    background: 'var(--primary-color)',
                                    width: '100%'
                                  }}
                                  title="Manage Players"
                                >
                                  <FaUserEdit /> Manage Players
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                // Player Management View
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <button
                      onClick={handleBackToTeams}
                      className="bracket-player-management-back-btn"
                      style={{ 
                        fontSize: '12px', 
                        padding: '6px 12px',
                        background: 'var(--text-muted)'
                      }}
                    >
                      ← Back to Teams
                    </button>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                      {editTeamModal.selectedTeam.name} - Players ({editTeamModal.selectedTeam.players?.length || 0})
                    </h3>
                  </div>

                  {/* Sport Info */}
                  <div style={{ 
                    background: 'var(--primary-color)', 
                    color: 'white',
                    padding: '12px 16px', 
                    borderRadius: '6px', 
                    marginBottom: '20px',
                    fontSize: '14px'
                  }}>
                    <strong>Sport:</strong> {editTeamModal.bracket.sport_type?.toUpperCase() || 'BASKETBALL'}
                  </div>

                  {/* Add New Player Form */}
                  <div style={{ background: 'var(--background-secondary)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                    <h4 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>
                      <FaUserPlus style={{ marginRight: '8px' }} /> Add New Player
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Name *</label>
                        <input
                          type="text"
                          value={editTeamModal.newPlayer.name}
                          onChange={(e) => setEditTeamModal(prev => ({
                            ...prev,
                            newPlayer: { ...prev.newPlayer, name: e.target.value }
                          }))}
                          placeholder="Player name"
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Position *</label>
                        <select
                          value={editTeamModal.newPlayer.position}
                          onChange={(e) => setEditTeamModal(prev => ({
                            ...prev,
                            newPlayer: { ...prev.newPlayer, position: e.target.value }
                          }))}
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                        >
                          <option value="">Select Position</option>
                          {getPositionsForSport(editTeamModal.bracket.sport_type).map(position => (
                            <option key={position} value={position}>{position}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Jersey Number *</label>
                        <input
                          type="number"
                          value={editTeamModal.newPlayer.jersey_number}
                          onChange={(e) => setEditTeamModal(prev => ({
                            ...prev,
                            newPlayer: { ...prev.newPlayer, jersey_number: e.target.value }
                          }))}
                          placeholder="e.g., 23"
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                        />
                      </div>
                      <button
                        onClick={handleAddPlayer}
                        className="bracket-view-btn"
                        style={{ 
                          padding: '8px 16px',
                          background: 'var(--success-color)',
                          height: 'fit-content'
                        }}
                      >
                        <FaPlus /> Add
                      </button>
                    </div>
                  </div>

                  {/* Edit Player Form */}
                  {editTeamModal.editingPlayer && (
                    <div style={{ background: 'var(--primary-color)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                      <h4 style={{ marginBottom: '15px', color: 'white' }}>
                        <FaUserEdit style={{ marginRight: '8px' }} /> Edit Player
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: '10px', alignItems: 'end' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'white' }}>Name *</label>
                          <input
                            type="text"
                            value={editTeamModal.editingPlayer.name}
                            onChange={(e) => setEditTeamModal(prev => ({
                              ...prev,
                              editingPlayer: { ...prev.editingPlayer, name: e.target.value }
                            }))}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid white', borderRadius: '4px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'white' }}>Position *</label>
                          <select
                            value={editTeamModal.editingPlayer.position}
                            onChange={(e) => setEditTeamModal(prev => ({
                              ...prev,
                              editingPlayer: { ...prev.editingPlayer, position: e.target.value }
                            }))}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid white', borderRadius: '4px' }}
                          >
                            <option value="">Select Position</option>
                            {getPositionsForSport(editTeamModal.bracket.sport_type).map(position => (
                              <option key={position} value={position}>{position}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'white' }}>Jersey Number *</label>
                          <input
                            type="number"
                            value={editTeamModal.editingPlayer.jersey_number}
                            onChange={(e) => setEditTeamModal(prev => ({
                              ...prev,
                              editingPlayer: { ...prev.editingPlayer, jersey_number: e.target.value }
                            }))}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid white', borderRadius: '4px' }}
                          />
                        </div>
                        <button
                          onClick={handleUpdatePlayer}
                          className="bracket-view-btn"
                          style={{ 
                            padding: '8px 16px',
                            background: 'var(--success-color)',
                            height: 'fit-content'
                          }}
                        >
                          <FaSave /> Save
                        </button>
                        <button
                          onClick={handleCancelEditPlayer}
                          className="bracket-view-btn"
                          style={{ 
                            padding: '8px 16px',
                            background: 'var(--text-muted)',
                            height: 'fit-content'
                          }}
                        >
                          <FaTimes /> Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Players List */}
                  <div className="awards_standings_table_container">
                    <table className="awards_standings_table">
                      <thead>
                        <tr>
                          <th>Jersey #</th>
                          <th>Name</th>
                          <th>Position</th>
                          <th style={{ width: '150px', textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editTeamModal.selectedTeam.players?.length === 0 ? (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                              No players found. Add players using the form above.
                            </td>
                          </tr>
                        ) : (
                          editTeamModal.selectedTeam.players?.map(player => (
                            <tr key={player.id}>
                              <td style={{ fontWeight: '600', fontSize: '16px' }}>#{player.jersey_number}</td>
                              <td style={{ fontWeight: '600' }}>{player.name}</td>
                              <td>
                                <span style={{
                                  background: 'var(--primary-color)',
                                  color: 'white',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '600'
                                }}>
                                  {player.position}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => handleEditPlayer(player)}
                                    className="bracket-view-btn"
                                    style={{ 
                                      fontSize: '11px', 
                                      padding: '4px 8px', 
                                      background: 'var(--primary-color)'
                                    }}
                                    title="Edit Player"
                                  >
                                    <FaEdit />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePlayer(player.id)}
                                    className="bracket-view-btn"
                                    style={{ 
                                      fontSize: '11px', 
                                      padding: '4px 8px', 
                                      background: 'var(--error-color)'
                                    }}
                                    title="Delete Player"
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  onClick={closeEditTeamModal}
                  className="admin-teams-cancel-btn"
                  style={{ padding: '12px 24px' }}
                >
                  Close
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