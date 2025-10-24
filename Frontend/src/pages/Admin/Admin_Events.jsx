import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrophy, FaCrown, FaChartBar, FaEye, FaEdit, FaTrash, FaPlus, FaSave, FaTimes, FaChevronLeft, FaChevronRight, FaUsers, FaUserPlus, FaUserEdit, FaMedal, FaStar, FaDownload, FaSearch } from "react-icons/fa";
import CustomBracket from "../../components/CustomBracket";
import DoubleEliminationBracket from "../../components/DoubleEliminationBracket";
import "../../style/Admin_Events.css";
import TournamentScheduleList from "../../components/TournamentScheduleList";
import RoundRobinBracketDisplay from "../../components/RoundRobin"; // ADD THIS
import AdminStats from "./AdminStats";

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

  const [bracketViewType, setBracketViewType] = useState("bracket"); // "bracket" or "list"

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



   // 1. STATE (Add this to your AdminEvents component state section)
const [editTeamModal, setEditTeamModal] = useState({ 
  show: false, 
  bracket: null, 
  teams: [], 
  loading: false,
  selectedTeam: null,
  editingPlayer: null,
  newPlayer: { name: '', position: '', jersey_number: '' },
  error: null
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
        const { 
          selectedEvent: eventContext, 
          selectedBracket: bracketContext,
          contentTab: tabContext,
          bracketViewType: viewTypeContext
        } = JSON.parse(returnContext);
        
        if (eventContext && bracketContext) {
          setSelectedEvent(eventContext);
          setSelectedBracket(bracketContext);
          setActiveTab("results");
          
          // Set content tab (default to "matches" if not specified)
          setContentTab(tabContext || "matches");
          
          // Set bracket view type (default to "bracket" if not specified)
          if (viewTypeContext) {
            setBracketViewType(viewTypeContext);
          }
          
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
    setBracketViewType("list"); // Default to list view - ADD THIS LIN
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

  // Navigate to stats view - REMOVED since stats is now integrated
  const handleViewStats = (match) => {
    // Set the selected match and switch to statistics tab
    sessionStorage.setItem('selectedMatchData', JSON.stringify({
      matchId: match.id,
      eventId: selectedEvent?.id,
      bracketId: selectedBracket?.id,
      match: match
    }));
    
    // Switch to statistics tab
    setContentTab("statistics");
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
          <h1>Event Management</h1>
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
                                      onClick={() => handleEditEvent(event)}
                                      className="bracket-view-btn"
                                      style={{ fontSize: '13px', padding: '8px 14px', background: 'var(--success-color)', flex: '1 1 auto', minWidth: '55px' }}
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
                    <span><strong>Type:</strong> {
  selectedBracket.elimination_type === 'double' 
    ? 'Double Elimination' 
    : selectedBracket.elimination_type === 'round_robin'
      ? 'Round Robin'
      : 'Single Elimination'
}</span>
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
                    className={`awards_standings_tab_button ${contentTab === "awards" ? "awards_standings_tab_active" : ""}`}
                    onClick={() => setContentTab("awards")}
                  >
                    <FaTrophy /> Awards & Standings
                  </button>
                  <button
                    className={`awards_standings_tab_button ${contentTab === "statistics" ? "awards_standings_tab_active" : ""}`}
                    onClick={() => setContentTab("statistics")}
                  >
                    <FaChartBar /> Statistics
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

      {/* Action Buttons */}
      <div style={{ 
  display: 'flex', 
  gap: '12px',

  padding: '6px',
  borderRadius: '8px',

}}>
  <button
    onClick={() => handleEditTeam(selectedBracket)}
    style={{ 
      padding: '10px 20px',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      background: 'var(--success-color)',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      whiteSpace: 'nowrap'
    }}
    title="Manage Team Players"
  >
    <FaUsers /> Edit Teams
  </button>
  <button
    onClick={() => handleEditBracket(selectedBracket)}
    style={{ 
      padding: '10px 20px',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      background: 'var(--primary-color)',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      whiteSpace: 'nowrap'
    }}
    title="Edit Bracket"
  >
    <FaEdit /> Edit Bracket
  </button>
  <button
    onClick={() => handleDeleteBracket(selectedBracket)}
    style={{ 
      padding: '10px 20px',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      background: 'var(--error-color)',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      whiteSpace: 'nowrap'
    }}
    title="Delete Bracket"
  >
    <FaTrash /> Delete Bracket
  </button>
</div>
    </div>

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
    onViewStats={(match) => {
      sessionStorage.setItem('selectedMatchData', JSON.stringify({
        matchId: match.id,
        eventId: selectedEvent?.id,
        bracketId: selectedBracket?.id,
        match: match
      }));
      setContentTab("statistics");
    }}
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
                              {/* Awards View Selector */}
               {/* Awards View Selector */}
                 {/* Awards View Selector */}
                <div style={{ 
                  padding: '20px 40px', 
                  borderBottom: '1px solid var(--border-color)',
                  background: 'var(--background-card)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', maxWidth: '380px' }}>
                    <label style={{ 
                      color: 'var(--text-primary)', 
                      fontWeight: '600',
                      fontSize: '14px',
                      whiteSpace: 'nowrap'
                    }}>
                      View:
                    </label>
                    <select
                      value={awardsTab}
                      onChange={(e) => setAwardsTab(e.target.value)}
                      style={{
                        flex: '1',
                        padding: '8px 12px',
                        border: '2px solid var(--border-color)',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'var(--background-secondary)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: '500',
                        outline: 'none',
                        transition: 'var(--transition)'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    >
                      <option value="standings">🏆 Team Standings</option>
                      <option value="mvp">👑 Tournament MVP</option>
                      <option value="awards">🏅 Awards</option>
                    </select>
                  </div>
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

                    {/* Statistics Tab - Integrated AdminStats */}
                    {contentTab === "statistics" && (
                      <div className="awards_standings_tab_content">
                        <AdminStats 
                          sidebarOpen={sidebarOpen}
                          preselectedEvent={selectedEvent}
                          preselectedBracket={selectedBracket}
                          embedded={true}
                        />
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
        <div 
          onClick={closeEditModal}
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
              maxWidth: '600px', 
              border: '1px solid var(--border-color)', 
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)' 
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '24px', 
              borderBottom: '1px solid var(--border-color)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FaEdit style={{ width: '24px', height: '24px', color: 'var(--success-color)' }} />
                <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '24px', fontWeight: '600' }}>
                  Edit Event
                </h2>
              </div>
              <button 
                onClick={closeEditModal}
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
            
            <div style={{ padding: '24px' }}>
              <div style={{ 
                background: 'rgba(72, 187, 120, 0.1)', 
                padding: '16px', 
                borderRadius: '8px', 
                marginBottom: '24px', 
                border: '1px solid rgba(72, 187, 120, 0.2)' 
              }}>
                <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>
                  Event: {editModal.event.name}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label 
                  htmlFor="eventName" 
                  style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    color: 'var(--text-primary)', 
                    fontWeight: '600', 
                    fontSize: '14px' 
                  }}
                >
                  Event Name *
                </label>
                <input
                  type="text"
                  id="eventName"
                  value={editingEventName}
                  onChange={(e) => setEditingEventName(e.target.value)}
                  placeholder="Enter event name"
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    border: '2px solid var(--border-color)', 
                    borderRadius: '8px', 
                    background: 'var(--background-secondary)', 
                    color: 'var(--text-primary)', 
                    fontSize: '14px', 
                    outline: 'none' 
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label 
                    htmlFor="startDate"
                    style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      color: 'var(--text-primary)', 
                      fontWeight: '600', 
                      fontSize: '14px' 
                    }}
                  >
                    Start Date *
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={editingStartDate}
                    onChange={(e) => setEditingStartDate(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px', 
                      border: '2px solid var(--border-color)', 
                      borderRadius: '8px', 
                      background: 'var(--background-secondary)', 
                      color: 'var(--text-primary)', 
                      fontSize: '14px', 
                      outline: 'none' 
                    }}
                  />
                </div>

                <div>
                  <label 
                    htmlFor="endDate"
                    style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      color: 'var(--text-primary)', 
                      fontWeight: '600', 
                      fontSize: '14px' 
                    }}
                  >
                    End Date *
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={editingEndDate}
                    onChange={(e) => setEditingEndDate(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px', 
                      border: '2px solid var(--border-color)', 
                      borderRadius: '8px', 
                      background: 'var(--background-secondary)', 
                      color: 'var(--text-primary)', 
                      fontSize: '14px', 
                      outline: 'none' 
                    }}
                  />
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                justifyContent: 'flex-end', 
                marginTop: '30px', 
                paddingTop: '20px', 
                borderTop: '1px solid var(--border-color)' 
              }}>
                <button
                  onClick={closeEditModal}
                  style={{ 
                    padding: '12px 24px', 
                    background: 'var(--background-secondary)', 
                    color: 'var(--text-primary)', 
                    border: '2px solid var(--border-color)', 
                    borderRadius: '8px', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s ease' 
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveEventEdit}
                  style={{ 
                    padding: '12px 24px', 
                    background: 'var(--success-color)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
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
      {/* MODAL HEADER */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '24px', 
        borderBottom: '1px solid var(--border-color)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <FaUsers style={{ width: '24px', height: '24px', color: 'var(--success-color)' }} />
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '24px', fontWeight: '600' }}>
            {editTeamModal.selectedTeam 
              ? `Manage Players - ${editTeamModal.selectedTeam.name}` 
              : `Manage Teams - ${editTeamModal.bracket.name}`}
          </h2>
        </div>
        <button 
          onClick={closeEditTeamModal} 
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
      
      {/* MODAL BODY */}
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
          // ========== TEAM SELECTION VIEW ==========
          <div style={{ padding: '24px' }}>
            {/* Event/Bracket Info Card */}
            <div style={{ 
              background: 'rgba(72, 187, 120, 0.1)', 
              padding: '16px', 
              borderRadius: '8px', 
              marginBottom: '24px', 
              border: '1px solid rgba(72, 187, 120, 0.2)' 
            }}>
              <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                Event: {selectedEvent?.name || 'Unknown Event'}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
                Bracket: {editTeamModal.bracket.name}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <span className={`bracket-sport-badge ${editTeamModal.bracket.sport_type === 'volleyball' ? 'bracket-sport-volleyball' : 'bracket-sport-basketball'}`} style={{ fontSize: '11px', padding: '4px 8px' }}>
                  {editTeamModal.bracket.sport_type?.toUpperCase()}
                </span>
                <span className="bracket-sport-badge bracket-sport-basketball" style={{ fontSize: '11px', padding: '4px 8px', background: '#6366f1' }}>
                  {editTeamModal.bracket.elimination_type === 'double' ? 'Double Elim.' : 
                   editTeamModal.bracket.elimination_type === 'round_robin' ? 'Round Robin' : 'Single Elim.'}
                </span>
              </div>
            </div>

            {/* Restrictions Warning Card */}
            <div style={{ 
              background: 'rgba(251, 191, 36, 0.1)', 
              padding: '16px', 
              borderRadius: '8px', 
              border: '1px solid rgba(251, 191, 36, 0.2)',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '20px', marginTop: '2px' }}>!</span>
                <div>
                  <div style={{ color: '#fbbf24', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    Team Editing Restrictions:
                  </div>
                  {editTeamModal.bracket.elimination_type === 'single' && (
                    <ul style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, paddingLeft: '20px' }}>
                      <li style={{ marginBottom: '6px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Safe to Edit:</strong> Before Round 1 starts
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        <strong style={{ color: '#fbbf24' }}>Risky:</strong> During Round 1 but no completed matches yet
                      </li>
                      <li>
                        <strong style={{ color: '#ef4444' }}>Not Allowed:</strong> After any Round 1 match is completed
                      </li>
                    </ul>
                  )}
                  {editTeamModal.bracket.elimination_type === 'double' && (
                    <ul style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, paddingLeft: '20px' }}>
                      <li style={{ marginBottom: '6px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Safe to Edit:</strong> Before Winner's Bracket Round 1 starts
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        <strong style={{ color: '#fbbf24' }}>Risky:</strong> During WB Round 1 but no winner yet
                      </li>
                      <li>
                        <strong style={{ color: '#ef4444' }}>Not Allowed:</strong> After any WB Round 1 match is completed
                      </li>
                    </ul>
                  )}
                  {editTeamModal.bracket.elimination_type === 'round_robin' && (
                    <ul style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, paddingLeft: '20px' }}>
                      <li style={{ marginBottom: '6px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Safe to Edit:</strong> Before Round 1 starts
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        <strong style={{ color: '#fbbf24' }}>Risky:</strong> During Round 1 but no completed matches yet
                      </li>
                      <li>
                        <strong style={{ color: '#ef4444' }}>Not Allowed:</strong> After any Round 1 match is completed
                      </li>
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Teams List Header */}
            <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600' }}>
              Select a Team to Manage Players ({editTeamModal.teams.length})
            </h3>

            {/* Teams Table */}
            {editTeamModal.teams.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px',
                background: 'var(--background-secondary)',
                borderRadius: '8px',
                border: '2px dashed var(--border-color)'
              }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                  No teams assigned to this bracket yet.
                </p>
              </div>
            ) : (
              <div className="awards_standings_table_container">
                <table className="awards_standings_table">
                  <thead>
                    <tr>
                      <th style={{ fontSize: '14px' }}>Team Name</th>
                      <th style={{ fontSize: '14px' }}>Sport</th>
                      <th style={{ fontSize: '14px' }}>Players</th>
                      <th style={{ width: '150px', textAlign: 'center', fontSize: '14px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editTeamModal.teams.map(team => (
                      <tr key={team.assignment_id || team.id}>
                        <td style={{ fontWeight: '600', fontSize: '15px' }}>{team.name}</td>
                        <td>
                          <span className={`bracket-sport-badge ${team.sport === 'volleyball' ? 'bracket-sport-volleyball' : 'bracket-sport-basketball'}`} style={{ fontSize: '12px', padding: '6px 10px' }}>
                            {team.sport?.toUpperCase() || 'N/A'}
                          </span>
                        </td>
                        <td style={{ fontSize: '14px' }}>{team.players?.length || 0} players</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => handleSelectTeam(team)}
                            className="bracket-view-btn"
                            style={{ 
                              fontSize: '13px', 
                              padding: '8px 16px', 
                              background: 'var(--primary-color)',
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px'
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
          // ========== PLAYER MANAGEMENT VIEW ==========
          <div>
            {/* Back Button and Header */}
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

            {/* Edit Player Form (shown when editing) */}
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

            {/* Players List Table */}
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

        {/* Modal Footer - Close Button */}
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
        <div 
          onClick={() => setDeleteConfirm({ show: false, type: '', id: null, name: '' })}
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
              maxWidth: '500px', 
              border: '1px solid var(--border-color)', 
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)' 
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '24px', 
              borderBottom: '1px solid var(--border-color)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FaTrash style={{ width: '24px', height: '24px', color: 'var(--error-color)' }} />
                <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '24px', fontWeight: '600' }}>
                  Confirm Delete
                </h2>
              </div>
              <button 
                onClick={() => setDeleteConfirm({ show: false, type: '', id: null, name: '' })}
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
            
            <div style={{ padding: '24px' }}>
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                padding: '16px', 
                borderRadius: '8px', 
                marginBottom: '24px', 
                border: '1px solid rgba(239, 68, 68, 0.2)' 
              }}>
                <div style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '8px' }}>
                  Are you sure you want to delete this {deleteConfirm.type}?
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: '600' }}>
                  "{deleteConfirm.name}"
                </div>
              </div>

              <div style={{ 
                background: 'rgba(251, 191, 36, 0.1)', 
                padding: '12px 16px', 
                borderRadius: '8px', 
                border: '1px solid rgba(251, 191, 36, 0.2)',
                marginBottom: '24px'
              }}>
                <div style={{ color: '#fbbf24', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>⚠️</span>
                  <span>This action cannot be undone!</span>
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                justifyContent: 'flex-end', 
                paddingTop: '20px', 
                borderTop: '1px solid var(--border-color)' 
              }}>
                <button
                  onClick={() => setDeleteConfirm({ show: false, type: '', id: null, name: '' })}
                  style={{ 
                    padding: '12px 24px', 
                    background: 'var(--background-secondary)', 
                    color: 'var(--text-primary)', 
                    border: '2px solid var(--border-color)', 
                    borderRadius: '8px', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s ease' 
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  style={{ 
                    padding: '12px 24px', 
                    background: 'var(--error-color)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <FaTrash /> Delete {deleteConfirm.type}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEvents;