import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaTrophy, FaMedal, FaStar, FaCrown, FaChartBar, 
  FaEye, FaEdit, FaTrash, FaPlus, FaSave, FaTimes, 
  FaChevronLeft, FaChevronRight, FaUsers, FaUserPlus, 
  FaUserEdit, FaDownload, FaSearch,
  FaEyeSlash  // Add this
} from "react-icons/fa";
import CustomBracket from "../../components/CustomBracket";
import DoubleEliminationBracket from "../../components/DoubleEliminationBracket";
import "../../style/Admin_Events.css";
import TournamentScheduleList from "../../components/TournamentScheduleList";
import RoundRobinBracketDisplay from "../../components/RoundRobin";
import AdminStats from "./AdminStats";
import AddRemoveTeamsSection from "../../components/addRemoveTeams"; // Adjust path as needed

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

  const [bracketViewType, setBracketViewType] = useState("bracket");

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

  // Consolidated stats view mode
  const [statsViewMode, setStatsViewMode] = useState("players"); // "players" | "teams" | "matches"
  const [sortConfig, setSortConfig] = useState({ key: 'overall_score', direction: 'desc' });

  // Edit Team Modal state
const [editTeamModal, setEditTeamModal] = useState({ 
  show: false, 
  bracket: null, 
  teams: [], 
  loading: false,
  selectedTeam: null,
  editingPlayer: null,
  newPlayer: { name: '', position: '', jersey_number: '' },
  error: null,
  showAddTeam: false,
  selectedTeamToAdd: '',
  availableTeams: [],
  hasCompletedMatches: false,
  editingBracket: {
    name: '',
    sport_type: '',
    elimination_type: ''
  },
  activeModalTab: 'details' // 'details', 'teams', 'players'
});

  // Awards & Standings states
  const [standings, setStandings] = useState([]);
  const [mvpData, setMvpData] = useState(null);
  const [awards, setAwards] = useState(null);
  const [loadingAwards, setLoadingAwards] = useState(false);
  const [errorAwards, setErrorAwards] = useState(null);
  const [searchTermStandings, setSearchTermStandings] = useState("");
  const [awardsTab, setAwardsTab] = useState("standings");

  // Add state for expanded events
  const [expandedEvents, setExpandedEvents] = useState({});

  // Toggle function for expanding events
  const toggleEventExpansion = (eventId) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  const safeNumber = (value, decimals = 1) => {
  const num = Number(value);
  if (isNaN(num)) return 0;
  
  // For efficiency, always use 2 decimal places
  if (typeof value === 'string' && value.includes('Eff')) {
    return Number(num.toFixed(2));
  }
  
  return Number(num.toFixed(decimals));
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
    
    // Use a Set to remove duplicates based on event ID
    const uniqueEvents = eventsWithBrackets.reduce((acc, event) => {
      const existingIndex = acc.findIndex(e => e.id === event.id);
      if (existingIndex === -1) {
        acc.push(event);
      } else {
        // If event already exists, merge the brackets
        acc[existingIndex].brackets = [
          ...new Map(
            [...acc[existingIndex].brackets, ...event.brackets]
              .map(b => [b.id, b])
          ).values()
        ];
      }
      return acc;
    }, []);
    
    setEvents(uniqueEvents);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
 useEffect(() => {
  fetchEvents();
}, []);

// Handle navigation from dashboard - expand specific event
useEffect(() => {
  const checkDashboardContext = () => {
    const dashboardContext = sessionStorage.getItem('adminEventsReturnContext');
    
    if (dashboardContext) {
      try {
        const { expandEventId, scrollToEvent } = JSON.parse(dashboardContext);
        
        if (expandEventId) {
          // Expand the specific event
          setExpandedEvents(prev => ({
            ...prev,
            [expandEventId]: true
          }));
          
          // Scroll to event after a short delay to ensure rendering
          if (scrollToEvent) {
            setTimeout(() => {
              const eventElement = document.querySelector(`[data-event-id="${expandEventId}"]`);
              if (eventElement) {
                eventElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 300);
          }
        }
      } catch (err) {
        console.error("Error loading dashboard context:", err);
      } finally {
        // Clear the context after using it
        sessionStorage.removeItem('adminEventsReturnContext');
      }
    }
  };
  
  // Only check after events are loaded
  if (!loading && events.length > 0) {
    checkDashboardContext();
  }
}, [loading, events]);
  // Check for return context from AdminStats
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
          bracketViewType: viewTypeContext,
          refreshEvents // Check for this flag
        } = JSON.parse(returnContext);
        
        // Refresh events first if flag is set
        if (refreshEvents) {
          await fetchEvents();
        }
        
        if (eventContext && bracketContext) {
          setSelectedEvent(eventContext);
          setSelectedBracket(bracketContext);
          setActiveTab("results");
          
          setContentTab(tabContext || "matches");
          
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


  // Auto-load data when statsViewMode changes
  useEffect(() => {
    const loadDataForStatsView = async () => {
      if (selectedEvent && selectedBracket) {
        setLoading(true);
        try {
          if (statsViewMode === "players") {
            await loadAllPlayersData(selectedEvent.id, selectedBracket.id);
          } else if (statsViewMode === "teams") {
            await loadAllTeamsData(selectedEvent.id, selectedBracket.id);
          } else if (statsViewMode === "matches") {
            // Matches are already loaded in handleBracketSelect
          }
          await loadEventStatistics(selectedEvent.id, selectedBracket.id);
        } catch (err) {
          console.error("Error loading data for stats view:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    loadDataForStatsView();
  }, [statsViewMode, selectedEvent, selectedBracket]);

  // Filter events based on search term and status filter
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Events pagination calculations - UPDATED for grouped events
  const totalRows = filteredEvents.length; // Changed from flattenedRows.length
  const totalPages = Math.ceil(totalRows / itemsPerPage);
  const indexOfLastRow = currentPage * itemsPerPage;
  const indexOfFirstRow = indexOfLastRow - itemsPerPage;
  const currentEvents = filteredEvents.slice(indexOfFirstRow, indexOfLastRow); // Use this for display

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
    setBracketViewType("list");
    setLoadingDetails(true);
    setError(null);
    setRoundFilter("all");

    try {
      // Use correct endpoint based on bracket type
      let matchesEndpoint;
      if (bracket.elimination_type === 'round_robin') {
        matchesEndpoint = `http://localhost:5000/api/round-robin/${bracket.id}/matches`;
      } else {
        matchesEndpoint = `http://localhost:5000/api/brackets/${bracket.id}/matches`;
      }
      
      const res = await fetch(matchesEndpoint);
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

  // Load event statistics with proper bracket filtering
  const loadEventStatistics = async (eventId, bracketId = null) => {
    try {
      let url = `http://localhost:5000/api/stats/events/${eventId}/statistics`;
      if (bracketId) {
        url += `?bracketId=${bracketId}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Error fetching event statistics:", err);
      return {
        total_players: 0,
        total_games: 0,
        sport_type: 'basketball',
        avg_ppg: 0,
        avg_rpg: 0,
        avg_apg: 0,
        avg_bpg: 0,
        avg_kills: 0,
        avg_digs: 0,
        avg_total_errors: 0
      };
    }
  };

  // Load all players data for the event
  const loadAllPlayersData = async (eventId, bracketId = null) => {
    try {
      let url = `http://localhost:5000/api/stats/events/${eventId}/players-statistics`;
      if (bracketId) {
        url += `?bracketId=${bracketId}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      
      const sortedData = data.sort((a, b) => {
        const scoreA = a.overall_score || 0;
        const scoreB = b.overall_score || 0;
        return scoreB - scoreA;
      });
      
      return sortedData;
    } catch (err) {
      console.error("Error fetching players data:", err);
      return [];
    }
  };

  // Load all teams data for the event
  const loadAllTeamsData = async (eventId, bracketId = null) => {
    try {
      let url = `http://localhost:5000/api/stats/events/${eventId}/teams-statistics`;
      if (bracketId) {
        url += `?bracketId=${bracketId}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      
      const sortedData = data.sort((a, b) => {
        const scoreA = a.overall_score || 0;
        const scoreB = b.overall_score || 0;
        return scoreB - scoreA;
      });
      
      return sortedData;
    } catch (err) {
      console.error("Error fetching teams data:", err);
      return [];
    }
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
  // Update the getAwardsForDisplay function to show totals instead of averages
  // Update the getAwardsForDisplay function to show totals instead of averages
const getAwardsForDisplay = () => {
  if (!awards || !selectedBracket) return [];
  
  const awardsArray = [];
  
  if (selectedBracket.sport_type === "basketball") {
    // Basketball: Show Mythical 5 (top 5 players after MVP based on MVP score)
    if (awards.mythical_five && awards.mythical_five.length > 0) {
      awards.mythical_five.forEach((player, index) => {
        awardsArray.push({
          rank: index + 1,
          category: "MYTHICAL 5",
          winner: player.player_name || 'Unknown',
          team: player.team_name || 'Unknown',
          stat: `${safeNumber(player.ppg)} PPG, ${safeNumber(player.rpg)} RPG, ${safeNumber(player.apg)} APG`,
          overall: safeNumber(player.mvp_score, 1)
        });
      });
    }
  } else {
    // Volleyball Awards (6 position-based awards)
    if (awards.best_setter) {
      awardsArray.push({
        category: "Best Setter",
        winner: awards.best_setter.player_name || 'Unknown',
        team: awards.best_setter.team_name || 'Unknown',
        stat: `${safeNumber(awards.best_setter.total_assists)} Assists`
      });
    }
    if (awards.best_libero) {
      awardsArray.push({
        category: "Best Libero",
        winner: awards.best_libero.player_name || 'Unknown',
        team: awards.best_libero.team_name || 'Unknown',
        stat: `${safeNumber(awards.best_libero.total_digs)} Digs, ${safeNumber(awards.best_libero.total_receptions)} Receptions`
      });
    }
    if (awards.best_outside_hitter) {
      awardsArray.push({
        category: "Best Outside Hitter",
        winner: awards.best_outside_hitter.player_name || 'Unknown',
        team: awards.best_outside_hitter.team_name || 'Unknown',
        stat: `${safeNumber(awards.best_outside_hitter.total_kills)} Kills, ${safeNumber(awards.best_outside_hitter.total_aces)} Aces, ${safeNumber(awards.best_outside_hitter.total_blocks)} Blocks`
      });
    }
    if (awards.best_opposite_hitter) {
      awardsArray.push({
        category: "Best Opposite Hitter",
        winner: awards.best_opposite_hitter.player_name || 'Unknown',
        team: awards.best_opposite_hitter.team_name || 'Unknown',
        stat: `${safeNumber(awards.best_opposite_hitter.total_kills)} Kills, ${safeNumber(awards.best_opposite_hitter.total_blocks)} Blocks, ${safeNumber(awards.best_opposite_hitter.total_aces)} Aces`
      });
    }
    if (awards.best_middle_blocker) {
      awardsArray.push({
        category: "Best Middle Blocker",
        winner: awards.best_middle_blocker.player_name || 'Unknown',
        team: awards.best_middle_blocker.team_name || 'Unknown',
        stat: `${safeNumber(awards.best_middle_blocker.total_blocks)} Blocks, ${safeNumber(awards.best_middle_blocker.total_kills)} Kills`
      });
    }
  }
  
  return awardsArray.filter(a => a.winner && a.winner !== 'Unknown');
};

  // Edit handlers
  const handleEditEvent = (event) => {
  // Format dates to YYYY-MM-DD for date inputs
  const formattedStartDate = event.start_date ? event.start_date.split('T')[0] : '';
  const formattedEndDate = event.end_date ? event.end_date.split('T')[0] : '';
  
  // Set all states together to ensure they're properly initialized
  setEditingEventName(event.name || '');
  setEditingStartDate(formattedStartDate);
  setEditingEndDate(formattedEndDate);
  setEditModal({ 
    show: true, 
    event: { ...event } 
  });
};

const handleEditBracket = async (bracket) => {
  // Check if any matches are completed
  try {
    const matchesRes = await fetch(`http://localhost:5000/api/brackets/${bracket.id}/matches`);
    const matches = await matchesRes.json();
    const hasCompletedMatches = matches.some(m => m.status === 'completed');
    
    setEditTeamModal({ 
      show: true, 
      bracket: bracket, 
      teams: [], 
      loading: true,
      selectedTeam: null,
      editingPlayer: null,
      newPlayer: { name: '', position: '', jersey_number: '' },
      showAddTeam: false,
      selectedTeamToAdd: '',
      availableTeams: [],
      hasCompletedMatches: hasCompletedMatches,
      editingBracket: {
        name: bracket.name,
        sport_type: bracket.sport_type,
        elimination_type: bracket.elimination_type
      },
      activeModalTab: 'details'
    });

    const teamsRes = await fetch(`http://localhost:5000/api/bracketTeams/bracket/${bracket.id}`);
    const teams = await teamsRes.json();
    
    const availableTeamsRes = await fetch(`http://localhost:5000/api/bracketTeams/bracket/${bracket.id}/available`);
    const availableTeams = await availableTeamsRes.json();

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
    
    console.log('📊 Assigned Team IDs:', teams.map(t => t.id));
    console.log('📋 Available Teams (already filtered by backend):', availableTeams.length);

    setEditTeamModal(prev => ({
      ...prev,
      teams: teamsWithPlayers,
      availableTeams: availableTeams,  // Use backend response directly
      loading: false,
      error: null
    }));
  } catch (err) {
    console.error('Error loading bracket data:', err);
    setEditTeamModal(prev => ({
      ...prev,
      loading: false,
      error: `Failed to load bracket data: ${err.message}`
    }));
  }
};

  // Add this function to check for completed matches
const checkCompletedMatches = async (bracketId) => {
  try {
    const res = await fetch(`http://localhost:5000/api/brackets/${bracketId}/matches`);
    if (!res.ok) return false;
    
    const matches = await res.json();
    return matches.some(m => m.status === 'completed');
  } catch (err) {
    console.error('Error checking matches:', err);
    return false;
  }
};
  
  // Save bracket details
const handleSaveBracketDetails = async () => {
  if (!editTeamModal.editingBracket.name.trim()) {
    alert('Bracket name cannot be empty');
    return;
  }

  try {
    setEditTeamModal(prev => ({ ...prev, loading: true }));
    
    const oldSport = editTeamModal.bracket.sport_type;
    const newSport = editTeamModal.editingBracket.sport_type;
    
    // Check for completed matches before allowing sport change
    if (oldSport !== newSport) {
      const hasCompleted = await checkCompletedMatches(editTeamModal.bracket.id);
      if (hasCompleted) {
        alert('Cannot change sport type after matches have been completed!');
        setEditTeamModal(prev => ({ ...prev, loading: false }));
        return;
      }
      
      if (editTeamModal.teams.length > 0) {
        if (!confirm(`Changing the sport type will remove all ${editTeamModal.teams.length} assigned teams. Continue?`)) {
          setEditTeamModal(prev => ({ ...prev, loading: false }));
          return;
        }
        
        // Delete all team assignments
        await Promise.all(
          editTeamModal.teams.map(team => 
            fetch(`http://localhost:5000/api/bracketTeams/${team.assignment_id || team.id}`, {
              method: 'DELETE'
            })
          )
        );
      }
    }
    
    // Update bracket details
    const res = await fetch(`http://localhost:5000/api/brackets/${editTeamModal.bracket.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editTeamModal.editingBracket.name,
        sport_type: editTeamModal.editingBracket.sport_type,
        elimination_type: editTeamModal.editingBracket.elimination_type
      })
    });

    if (!res.ok) {
      throw new Error('Failed to update bracket');
    }

    // Clear all matches after sport change
    if (oldSport !== newSport) {
      try {
        const clearEndpoint = editTeamModal.bracket.elimination_type === 'round_robin'
          ? `http://localhost:5000/api/round-robin/${editTeamModal.bracket.id}/reset`
          : `http://localhost:5000/api/brackets/${editTeamModal.bracket.id}/reset`;
        
        const clearRes = await fetch(clearEndpoint, { method: 'POST' });
        
        if (!clearRes.ok) {
          console.error('Failed to clear matches');
        }
        
        // IMPORTANT: Clear matches in the main view immediately
        if (selectedBracket?.id === editTeamModal.bracket.id) {
          setMatches([]);
          setBracketMatches([]);
          console.log('✅ Matches cleared after sport change');
        }
      } catch (err) {
        console.error('Error clearing matches:', err);
      }
    }

    // Refresh bracket data and available teams
    await fetchEvents();
    
    // Refresh teams with new sport filter
    const teamsRes = await fetch(`http://localhost:5000/api/bracketTeams/bracket/${editTeamModal.bracket.id}`);
    const teams = await teamsRes.json();
    
    const availableTeamsRes = await fetch(`http://localhost:5000/api/bracketTeams/bracket/${editTeamModal.bracket.id}/available`);
    const availableTeams = await availableTeamsRes.json();
    
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
    
    // Update selected bracket if this is the current one
    if (selectedBracket && selectedBracket.id === editTeamModal.bracket.id) {
      setSelectedBracket(prev => ({
        ...prev,
        name: editTeamModal.editingBracket.name,
        sport_type: editTeamModal.editingBracket.sport_type,
        elimination_type: editTeamModal.editingBracket.elimination_type,
        team_count: teams.length
      }));
    }
    
    setEditTeamModal(prev => ({
      ...prev,
      bracket: {
        ...prev.bracket,
        name: prev.editingBracket.name,
        sport_type: prev.editingBracket.sport_type,
        elimination_type: prev.editingBracket.elimination_type
      },
      teams: teamsWithPlayers,
      availableTeams: availableTeams,
      loading: false,
      activeModalTab: 'teams' // Switch to teams tab after saving
    }));
    
    alert('Bracket updated successfully!');
  } catch (err) {
    console.error('Error updating bracket:', err);
    alert('Failed to update bracket: ' + err.message);
    setEditTeamModal(prev => ({ ...prev, loading: false }));
  }
};

  // Regenerate bracket after team changes
  const regenerateBracket = async (bracketId, eliminationType) => {
    try {
      let endpoint;
      if (eliminationType === 'round_robin') {
        endpoint = `http://localhost:5000/api/roundRobin/${bracketId}/generate`;
      } else {
        endpoint = `http://localhost:5000/api/brackets/${bracketId}/generate`;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to regenerate bracket');
      }

      return true;
    } catch (err) {
      console.error('Error regenerating bracket:', err);
      throw err;
    }
  };

  // Edit Team handler
  // Edit Team handler
  const handleEditTeam = async (bracket) => {
    handleEditBracket(bracket);
  };

  // Toggle awards disclosure status
const toggleAwardsDisclosure = async (bracketId, currentStatus) => {
  const newStatus = !currentStatus;
  
  try {
    const response = await fetch(`http://localhost:5000/api/awards/brackets/${bracketId}/awards-disclosure`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ awards_disclosed: newStatus })
    });

    if (!response.ok) {
      throw new Error('Failed to update disclosure status');
    }

    // Refresh the events list to show updated disclosure status
    await fetchEvents();
    
    // If this was the selected bracket, update it
    if (selectedBracket && selectedBracket.id === bracketId) {
      setSelectedBracket(prev => ({ ...prev, awards_disclosed: newStatus }));
    }

    alert(`Awards ${newStatus ? 'disclosed to public' : 'hidden from public'} successfully!`);
  } catch (err) {
    console.error('Error updating awards disclosure:', err);
    alert('Failed to update awards disclosure status');
  }
};

 const refreshTeamsInModal = async () => {
  if (!editTeamModal.bracket) return;
  
  try {
    const teamsRes = await fetch(`http://localhost:5000/api/bracketTeams/bracket/${editTeamModal.bracket.id}`);
    const teams = await teamsRes.json();
    
    console.log('🔄 Refreshing teams for bracket:', editTeamModal.bracket.id);
    console.log('📊 Currently assigned teams:', teams.length, teams.map(t => ({ id: t.id, name: t.name })));
    
    const availableTeamsRes = await fetch(`http://localhost:5000/api/bracketTeams/bracket/${editTeamModal.bracket.id}/available`);
      const availableTeams = await availableTeamsRes.json();

      console.log('📋 Available teams from API (already filtered by backend):', availableTeams.length, availableTeams.map(t => ({ id: t.id, name: t.name })));
      console.log('✅ Using backend-filtered teams directly');
      if (teams.length >= 2) {
        try {
          let generateEndpoint;
          if (editTeamModal.bracket.elimination_type === 'round_robin') {
           generateEndpoint = `http://localhost:5000/api/round-robin/${editTeamModal.bracket.id}/generate`;
          } else {
            generateEndpoint = `http://localhost:5000/api/brackets/${editTeamModal.bracket.id}/generate`;
          }
          
          const response = await fetch(generateEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            let errorMessage;
            try {
              const error = await response.json();
              errorMessage = error.error || error.message || 'Failed to regenerate bracket';
            } catch (e) {
              const errorText = await response.text();
              console.error('Server returned HTML instead of JSON:', errorText.substring(0, 200));
              errorMessage = `Server error (${response.status}). Check console for details.`;
            }
            throw new Error(errorMessage);
          }
          
          await response.json();
        } catch (err) {
          console.error('Failed to regenerate bracket:', err);
          alert('Failed to regenerate bracket: ' + err.message);
          return;
        }
      } else if (teams.length === 1 || teams.length === 0) {
        try {
          const clearEndpoint = editTeamModal.bracket.elimination_type === 'round_robin'
           ? `http://localhost:5000/api/round-robin/${editTeamModal.bracket.id}/reset`
    : `http://localhost:5000/api/brackets/${editTeamModal.bracket.id}/reset`;
          
          await fetch(clearEndpoint, { method: 'POST' });
        } catch (err) {
          console.error('Error clearing matches:', err);
        }
      }
      
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
            return { ...team, players: [] };
          }
        })
      );
      
      setEditTeamModal(prev => ({
        ...prev,
        teams: teamsWithPlayers,
        availableTeams: availableTeams  // Use backend-filtered teams directly
      }));
      
        if (selectedBracket && selectedBracket.id === editTeamModal.bracket.id) {
        // If no teams or only 1 team, clear matches immediately
        if (teams.length <= 1) {
          setMatches([]);
          setBracketMatches([]);
          console.log('Matches cleared - not enough teams');
        } else {
          // Otherwise fetch updated matches
          let matchesEndpoint;
          if (editTeamModal.bracket.elimination_type === 'round_robin') {
            matchesEndpoint = `http://localhost:5000/api/round-robin/${selectedBracket.id}/matches`;
          } else {
            matchesEndpoint = `http://localhost:5000/api/brackets/${selectedBracket.id}/matches`;
          }
          
          const matchesRes = await fetch(matchesEndpoint);
          if (matchesRes.ok) {
            const updatedMatches = await matchesRes.json();
            const visibleMatches = updatedMatches.filter(match => match.status !== 'hidden');
            setMatches(visibleMatches);
            setBracketMatches(visibleMatches);
            console.log('Matches updated:', visibleMatches.length);
          }
        }
        
        setSelectedBracket(prev => ({
          ...prev,
          team_count: teams.length
        }));
      }
      
      await fetchEvents();
      
    } catch (err) {
      console.error('Error refreshing teams:', err);
      alert('Error updating bracket: ' + err.message);
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

    // Check if changing to a position that's already full (excluding current player)
    const positionCount = selectedTeam.players?.filter(
      p => p.position === editingPlayer.position && p.id !== editingPlayer.id
    ).length || 0;
    
    if (positionCount >= 3) {
      alert(`Cannot change to ${editingPlayer.position}. Maximum 3 players per position.`);
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

    // Check if team already has 15 players
    if (selectedTeam.players?.length >= 15) {
      alert("Cannot add more players. Maximum 15 players per team.");
      return;
    }

    // Check if position already has 3 players
    const positionCount = selectedTeam.players?.filter(
      p => p.position === newPlayer.position
    ).length || 0;
    
    if (positionCount >= 3) {
      alert(`Cannot add more ${newPlayer.position}. Maximum 3 players per position.`);
      return;
    }

    // Proceed with adding player
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

      setEditTeamModal(prev => {
        const updatedTeams = prev.teams.map(team => {
          if (team.id === selectedTeam.id) {
            const updatedPlayers = [...team.players, { ...newPlayerData }];
            return { ...team, players: updatedPlayers };
          }
          return team;
        });

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

      setEditTeamModal(prev => {
        const updatedTeams = prev.teams.map(team => {
          if (team.id === selectedTeam.id) {
            const updatedPlayers = team.players.filter(player => player.id !== playerId);
            return { ...team, players: updatedPlayers };
          }
          return team;
        });

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
  // Close edit team modal
const closeEditTeamModal = () => {
  setEditTeamModal({ 
    show: false, 
    bracket: null, 
    teams: [], 
    loading: false,
    selectedTeam: null,
    editingPlayer: null,
    newPlayer: { name: '', position: '', jersey_number: '' },
    showAddTeam: false,
    selectedTeamToAdd: '',
    availableTeams: [],
    hasCompletedMatches: false,
    editingBracket: {
      name: '',
      sport_type: '',
      elimination_type: ''
    },
    activeModalTab: 'details'
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
        // Refresh events to update bracket counts
        await fetchEvents();
        
        // Only clear selected bracket if it was the one deleted
        // Stay on events tab, don't clear selectedEvent
        if (selectedBracket?.id === id) {
          setSelectedBracket(null);
          setActiveTab("events");
        }
        // If we're on events tab, just refresh the view
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
      <div className="bracket-breadcrumb">
        <button
          className={`breadcrumb-item ${!selectedBracket ? "active" : ""}`}
          onClick={() => {
            setActiveTab("events");
            setSelectedBracket(null);
            setSelectedEvent(null);
          }}
        >
          Events & Brackets
        </button>
        {selectedBracket && (
          <>
           <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-item active">
              {selectedBracket.name}
            </span>
          </>
        )}
      </div>
            {/* Events Selection Tab */}
            {activeTab === "events" && (
                <div className="bracket-view-section purple-background">
                
                    {/* Search Container - Matching TeamsPage Design */}
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
    <FaPlus /> Create Event
  </button>
</div>

{/* Results Info & Items Per Page */}
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
  <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
    {(searchTerm || statusFilter !== "all") && (
      <>
        Showing {currentEvents.length} of {totalRows} results
        {searchTerm && <span style={{ color: 'var(--primary-color)', marginLeft: '5px' }}> • Searching: "{searchTerm}"</span>}
        {statusFilter !== "all" && <span style={{ color: 'var(--primary-color)', marginLeft: '5px' }}> • Status: {statusFilter}</span>}
      </>
    )}
    {!searchTerm && statusFilter === "all" && (
      <>Showing {indexOfFirstRow + 1}-{Math.min(indexOfLastRow, totalRows)} of {totalRows} events</>
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
                    {/* NEW GROUPED EVENTS STRUCTURE */}
                    <div className="events-list-container">
                     {currentEvents.map(event => (
                        <div key={event.id} className="event-group-container" data-event-id={event.id}>
                          {/* Event Header Row */}
                          <div className="event-group-header">
                            <div className="event-header-left">
                              <button
                                onClick={() => toggleEventExpansion(event.id)}
                                className="event-expand-button"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer',
                                  padding: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  fontSize: '18px'
                                }}
                              >
                                {expandedEvents[event.id] ? '▼' : '▶'}
                              </button>
                              
                              <div className="event-header-info">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    Event: {event.name}
                                  </h3>
                                  <span className={`bracket-sport-badge ${event.status === "ongoing" ? "bracket-sport-basketball" : "bracket-sport-volleyball"}`} 
                                        style={{ fontSize: '11px', padding: '4px 10px' }}>
                                    {event.status}
                                  </span>
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                  {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                                </div>
                              </div>
                            </div>

                            <div className="event-header-actions">
  <span style={{ 
    fontSize: '14px', 
    color: 'var(--text-muted)',
    marginRight: '16px',
    fontWeight: '600'
  }}>
    [{event.brackets?.length || 0} Bracket{event.brackets?.length !== 1 ? 's' : ''}]
  </span>
  
  {/* Edit Event Button */}
 
  
  {/* Delete Event Button */}
  <button
    onClick={() => handleDeleteEvent(event)}
    className="bracket-view-btn"
    style={{ 
      fontSize: '13px', 
      padding: '8px 14px',
      background: 'var(--error-color)',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      whiteSpace: 'nowrap'
    }}
    title="Delete Event"
  >
    <FaTrash />
  </button>
  
  {/* Add Bracket Button */}
  <button
    onClick={() => handleCreateBracket(event)}
    className="bracket-view-btn"
    style={{ 
      fontSize: '13px', 
      padding: '8px 16px',
      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      whiteSpace: 'nowrap',
      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
    }}
    title="Add Bracket"
  >
    <FaPlus /> Add Bracket
  </button>
</div>
                          </div>

                          {/* Brackets Table (Expandable) */}
                          {expandedEvents[event.id] && (
                            <div className="event-brackets-table-container" style={{
                              animation: 'fadeInDown 0.3s ease-out'
                            }}>
                              {event.brackets && event.brackets.length > 0 ? (
                                <table className="awards_standings_table" style={{ marginBottom: 0 }}>
                                  <thead>
                                    <tr style={{ background: '#1a2332' }}>
                                      <th style={{ fontSize: '14px', padding: '12px 20px' }}>Bracket Name</th>
                                      <th style={{ fontSize: '14px' }}>Sport</th>
                                      <th style={{ fontSize: '14px' }}>Type</th>
                                      <th style={{ fontSize: '14px' }}>Teams</th>
                                      <th style={{ textAlign: 'center', width: '220px', fontSize: '14px' }}>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {event.brackets.map((bracket, index) => (
                                      <tr key={bracket.id} style={{
                                        animation: `fadeInRow 0.3s ease-out ${index * 0.05}s backwards`
                                      }}>
                                        <td style={{ fontWeight: '600', fontSize: '15px', padding: '12px 20px' }}>
                                          {bracket.name}
                                        </td>
                                        <td>
                                          <span className={`bracket-sport-badge ${bracket.sport_type === 'volleyball' ? 'bracket-sport-volleyball' : 'bracket-sport-basketball'}`} 
                                                style={{ fontSize: '12px', padding: '6px 12px' }}>
                                            {bracket.sport_type?.toUpperCase() || 'N/A'}
                                          </span>
                                        </td>
                                        <td style={{ fontSize: '14px' }}>
                                          {bracket.elimination_type === 'double' 
                                            ? 'Double Elim.' 
                                            : bracket.elimination_type === 'round_robin'
                                              ? 'Round Robin'
                                              : 'Single Elim.'}
                                        </td>
                                        <td style={{ fontSize: '14px', fontWeight: '600' }}>
                                          {bracket.team_count || 0}
                                        </td>
                                        <td>
  <div style={{ 
    display: 'flex', 
    gap: '6px', 
    justifyContent: 'center', 
    alignItems: 'center',  // ADD THIS
    flexWrap: 'nowrap'     // CHANGE from 'wrap' to 'nowrap'
  }}>
                                           <button
      onClick={() => handleEditEvent(event)}
      className="bracket-view-btn"
      style={{ fontSize: '13px', padding: '8px 14px', background: 'var(--success-color)' }}
      title="Edit Event"
    >
      <FaEdit />
    </button>
                                            <button
                                              onClick={() => handleDeleteBracket(bracket)}
                                              className="bracket-view-btn"
                                              style={{ fontSize: '12px', padding: '6px 12px', background: 'var(--error-color)', minWidth: '45px' }}
                                              title="Delete Bracket"
                                            >
                                              <FaTrash />
                                            </button>
                                            
                                            <button
                                              onClick={() => handleBracketSelect(event, bracket)}
                                              className="bracket-view-btn"
                                              style={{ fontSize: '12px', padding: '6px 12px', minWidth: '45px' }}
                                              title="View Matches"
                                            >
                                              <FaEye />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div style={{
                                  padding: '40px',
                                  textAlign: 'center',
                                  color: 'var(--text-muted)',
                                  fontSize: '14px',
                                  background: 'rgba(0, 0, 0, 0.2)',
                                  borderRadius: '0 0 8px 8px'
                                }}>
                                  <p style={{ margin: '0 0 16px 0' }}>No brackets created for this event yet.</p>
                                  <button
                                    onClick={() => handleCreateBracket(event)}
                                    className="bracket-view-btn"
                                    style={{ 
                                      fontSize: '13px', 
                                      padding: '8px 16px',
                                      background: 'var(--success-color)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}
                                  >
                                    <FaPlus /> Create First Bracket
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
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
                    {/* ADD THIS SPAN */}
                   
                    {/* END OF NEW SPAN */}
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
      {/* Action Buttons */}
<div style={{ 
  display: 'flex', 
  gap: '12px',
  padding: '6px',
  borderRadius: '8px',
}}>
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
</div>
    </div>

    {bracketViewType === "bracket" ? (
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
    match: match,
    viewOnly: true,
    fromAdmin: true
  }));
  
  // Save context for returning to admin events
  sessionStorage.setItem('adminEventsContext', JSON.stringify({
    selectedEvent: selectedEvent,
    selectedBracket: selectedBracket,
    bracketViewType: bracketViewType,
    activeTab: activeTab,
    contentTab: contentTab
  }));
  
  // Redirect to Admin Stats Viewer (using same component)
  navigate('/AdminDashboard/stats-viewer');
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
        {/* ADD THIS SECTION */}
       
                          <div style={{ 
  padding: '20px 40px', 
  borderBottom: '1px solid var(--border-color)',
  background: 'transparent',
  display: 'flex',
  justifyContent: 'center'
}}>
 <div style={{ 
  display: 'flex', 
  gap: '12px',
  background: 'transparent',
  padding: '6px',
  borderRadius: '8px',
  border: 'none'
}}>

    <button
      onClick={() => setAwardsTab("standings")}
      style={{
        padding: '14px 32px',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        background: awardsTab === "standings" ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent',
        color: awardsTab === "standings" ? '#ffffff' : '#cbd5e1',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: awardsTab === "standings" ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
        whiteSpace: 'nowrap'
      }}
    >
      🏆 Team Standings
    </button>
    
    <button
      onClick={() => setAwardsTab("mvp")}
      style={{
        padding: '14px 32px',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        background: awardsTab === "mvp" ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
        color: awardsTab === "mvp" ? '#ffffff' : '#cbd5e1',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: awardsTab === "mvp" ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
        whiteSpace: 'nowrap'
      }}
    >
      👑 Tournament MVP{selectedBracket.sport_type === "basketball" ? " & Mythical 5" : ""}
    </button>
    
    {/* Only show Awards button for Volleyball */}
    {selectedBracket.sport_type === "volleyball" && (
      <button
        onClick={() => setAwardsTab("awards")}
        style={{
          padding: '14px 32px',
          border: 'none',
          borderRadius: '8px',
          fontSize: '15px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          background: awardsTab === "awards" ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'transparent',
          color: awardsTab === "awards" ? '#ffffff' : '#cbd5e1',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: awardsTab === "awards" ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none',
          whiteSpace: 'nowrap'
        }}
      >
        🏅 Volleyball Awards
      </button>
    )}
  </div>
</div>

                            {awardsTab === "standings" && (
                              <div className="awards_standings_tab_content">
                               <div className="awards_standings_toolbar">
                                {/* ADD THIS NEW BUTTON BEFORE Export CSV */}
                                <button 
                                  onClick={() => toggleAwardsDisclosure(selectedBracket.id, selectedBracket.awards_disclosed)}
                                  className="awards_standings_export_btn"
                                  style={{ 
                                    background: selectedBracket.awards_disclosed 
                                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                                      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}
                                  title={selectedBracket.awards_disclosed ? 'Awards are public' : 'Awards are hidden'}
                                >
                                  {selectedBracket.awards_disclosed ? <FaEye /> : <FaEyeSlash />}
                                  {selectedBracket.awards_disclosed ? 'Awards Public' : 'Awards Hidden'}
                                </button>
                                
                                {/* Keep existing Export CSV button */}
                                <button 
                                  className="awards_standings_export_btn" 
                                  onClick={exportStandings}
                                  style={{ marginLeft: 'auto' }}
                                >
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
                  {/* BASKETBALL - Show per-game averages */}
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
                    <div className="awards_standings_stat_label">Overall</div>
                  </div>
                </>
              ) : (
                <>
                  {/* VOLLEYBALL - Show totals with receptions and overall score */}
                  <div className="awards_standings_stat_card awards_standings_highlight">
                    <div className="awards_standings_stat_value">{safeNumber(mvpData.total_kills)}</div>
                    <div className="awards_standings_stat_label">Kills</div>
                  </div>
                  <div className="awards_standings_stat_card">
                    <div className="awards_standings_stat_value">{safeNumber(mvpData.total_assists)}</div>
                    <div className="awards_standings_stat_label">Assists</div>
                  </div>
                  <div className="awards_standings_stat_card">
                    <div className="awards_standings_stat_value">{safeNumber(mvpData.total_digs)}</div>
                    <div className="awards_standings_stat_label">Digs</div>
                  </div>
                  <div className="awards_standings_stat_card">
                    <div className="awards_standings_stat_value">{safeNumber(mvpData.total_blocks)}</div>
                    <div className="awards_standings_stat_label">Blocks</div>
                  </div>
                  <div className="awards_standings_stat_card">
                    <div className="awards_standings_stat_value">{safeNumber(mvpData.total_aces)}</div>
                    <div className="awards_standings_stat_label">Aces</div>
                  </div>
                  <div className="awards_standings_stat_card">
                    <div className="awards_standings_stat_value">{safeNumber(mvpData.total_receptions)}</div>
                    <div className="awards_standings_stat_label">Receptions</div>
                  </div>
                  <div className="awards_standings_stat_card awards_standings_highlight">
                    <div className="awards_standings_stat_value">
                      {mvpData.efficiency !== null && mvpData.efficiency !== undefined 
                        ? Number(mvpData.efficiency).toFixed(1)
                        : '0.0'
                      }
                    </div>
                    <div className="awards_standings_stat_label">Overall</div>
                  </div>
                  
                </>
              )}
            </div>
          </div>
          
        </div>
        {/* Mythical 5 Section - Only for Basketball */}
{selectedBracket.sport_type === "basketball" && awards.mythical_five && awards.mythical_five.length > 0 && (
  <div style={{ marginTop: '40px' }}>
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px',
      marginBottom: '24px'
    }}>
      <FaMedal style={{ color: '#fbbf24', fontSize: '28px' }} />
      <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
        Mythical Five
      </h2>
    </div>

    <div className="awards_standings_table_container">
      <table className="awards_standings_table">
        <thead>
          <tr>
            <th style={{ width: '60px', textAlign: 'center' }}>RANK</th>
            <th>PLAYER</th>
            <th>TEAM</th>
            <th style={{ textAlign: 'center' }}>G</th>
            <th style={{ textAlign: 'center' }}>PPG</th>
            <th style={{ textAlign: 'center' }}>RPG</th>
            <th style={{ textAlign: 'center' }}>APG</th>
            <th style={{ textAlign: 'center' }}>SPG</th>
            <th style={{ textAlign: 'center' }}>BPG</th>
            <th style={{ textAlign: 'center', background: 'rgba(59, 130, 246, 0.1)' }}>OVERALL</th>
          </tr>
        </thead>
        <tbody>
          {awards.mythical_five.map((player, index) => (
            <tr key={index} style={{ 
              background: index < 3 ? 'rgba(251, 191, 36, 0.05)' : 'transparent'
            }}>
              <td style={{ textAlign: 'center', fontWeight: '700', fontSize: '18px' }}>
                {index === 0 && <span style={{ color: '#fbbf24' }}>🥇</span>}
                {index === 1 && <span style={{ color: '#94a3b8' }}>🥈</span>}
                {index === 2 && <span style={{ color: '#cd7f32' }}>🥉</span>}
                {index > 2 && <span style={{ color: 'var(--text-muted)' }}>{index + 1}</span>}
              </td>
              <td style={{ fontWeight: '700', fontSize: '16px' }}>
                {player.player_name || 'Unknown'}
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>
                  #{player.jersey_number || 'N/A'} • {player.position || 'N/A'}
                </div>
              </td>
              <td style={{ fontWeight: '600' }}>{player.team_name || 'Unknown'}</td>
              <td style={{ textAlign: 'center' }}>{player.games_played || 0}</td>
              <td style={{ textAlign: 'center', fontWeight: '600' }}>{safeNumber(player.ppg)}</td>
              <td style={{ textAlign: 'center' }}>{safeNumber(player.rpg)}</td>
              <td style={{ textAlign: 'center' }}>{safeNumber(player.apg)}</td>
              <td style={{ textAlign: 'center' }}>{safeNumber(player.spg)}</td>
              <td style={{ textAlign: 'center' }}>{safeNumber(player.bpg)}</td>
              <td style={{ 
                textAlign: 'center', 
                fontWeight: '700', 
                fontSize: '16px',
                color: '#3b82f6',
                background: 'rgba(59, 130, 246, 0.1)'
              }}>
                {safeNumber(player.mvp_score, 1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
      </div>
    )}
  </div>
)}
                            

                       {awardsTab === "awards" && selectedBracket.sport_type === "volleyball" && (
  <div className="awards_standings_tab_content">
    {!awards || getAwardsForDisplay().length === 0 ? (
      <div className="bracket-no-brackets">
        <p>No awards data available. Make sure player statistics have been recorded for completed matches.</p>
      </div>
    ) : (
      <div className="awards_standings_awards_section">
        {/* Export CSV Button - Right Aligned */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <button 
            className="awards_standings_export_btn" 
            onClick={() => {
              if (getAwardsForDisplay().length === 0 || !selectedBracket) return;
              
              let csvContent = "data:text/csv;charset=utf-8,";
              csvContent += "Award Category,Winner,Team,Statistics\n";
              
              getAwardsForDisplay().forEach(award => {
                csvContent += `${award.category},${award.winner},${award.team},${award.stat}\n`;
              });
              
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `${selectedEvent?.name}_${selectedBracket?.name}_volleyball_awards.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            style={{ marginLeft: 'auto' }}
          >
            <FaDownload /> Export CSV
          </button>
        </div>

        {/* Awards Table - Title Removed */}
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
                    <FaStar style={{ color: '#3b82f6', fontSize: '20px' }} />
                  </td>
                  <td style={{ fontWeight: '600' }}>{award.category}</td>
                  <td style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)' }}>
                    {award.winner}
                  </td>
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
                        {/* VIEW SWITCHER - Prominent buttons */}
                        <div className="stats-view-mode-wrapper">
                          <div className="stats-view-mode-container">
                              <button
                                        onClick={() => setStatsViewMode("players")}
                                        style={{
                                          padding: '14px 32px',
                                          border: 'none',
                                          borderRadius: '8px',
                                          fontSize: '15px',
                                          fontWeight: '600',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s ease',
                                          background: statsViewMode === "players" ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent',
                                          color: statsViewMode === "players" ? '#ffffff' : '#cbd5e1',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          boxShadow: statsViewMode === "players" ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
                                        }}
                                      >
                                        <FaUsers /> Players
                                      </button>
                          <button
                            onClick={() => setStatsViewMode("teams")}
                            style={{
                              padding: '14px 32px',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '15px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              background: statsViewMode === "teams" ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                              color: statsViewMode === "teams" ? '#ffffff' : '#cbd5e1',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              boxShadow: statsViewMode === "teams" ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
                            }}
                          >
                            <FaChartBar /> Teams
                          </button>
                          <button
                            onClick={() => setStatsViewMode("matches")}
                            style={{
                              padding: '14px 32px',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '15px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              background: statsViewMode === "matches" ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'transparent',
                              color: statsViewMode === "matches" ? '#ffffff' : '#cbd5e1',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              boxShadow: statsViewMode === "matches" ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none'
                            }}
                          >
                            <FaTrophy /> Matches
                          </button>
                          
                              </div>
                                
  </div>

                        <AdminStats 
                          sidebarOpen={sidebarOpen}
                          preselectedEvent={selectedEvent}
                          preselectedBracket={selectedBracket}
                          embedded={true}
                          statsViewMode={statsViewMode}
                          onViewModeChange={setStatsViewMode}
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
      {/* Edit Bracket Modal (Combined with Teams & Players) */}
{editTeamModal.show && editTeamModal.bracket && (
  <div className="admin-teams-modal-overlay" onClick={closeEditTeamModal}>
    <div className="admin-teams-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', maxHeight: '90vh' }}>
      {/* Modal Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '24px', 
        borderBottom: '1px solid var(--border-color)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <FaEdit style={{ width: '24px', height: '24px', color: 'var(--primary-color)' }} />
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '24px', fontWeight: '600' }}>
            Edit Bracket - {editTeamModal.bracket.name}
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

      {/* Modal Tabs */}
      <div style={{ 
        display: 'flex', 
        background: '#1a2332', 
        borderBottom: '2px solid var(--border-color)',
        padding: '0 24px'
      }}>
        <button
          onClick={() => setEditTeamModal(prev => ({ ...prev, activeModalTab: 'details', selectedTeam: null }))}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '15px 24px',
            color: editTeamModal.activeModalTab === 'details' ? 'var(--primary-color)' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontWeight: editTeamModal.activeModalTab === 'details' ? '600' : '500',
            fontSize: '15px',
            borderBottom: editTeamModal.activeModalTab === 'details' ? '3px solid var(--primary-color)' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaEdit /> Bracket Details
        </button>
        <button
          onClick={() => setEditTeamModal(prev => ({ ...prev, activeModalTab: 'teams', selectedTeam: null }))}
          disabled={editTeamModal.hasCompletedMatches}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '15px 24px',
            color: editTeamModal.hasCompletedMatches ? 'var(--text-muted)' : 
                   editTeamModal.activeModalTab === 'teams' ? 'var(--primary-color)' : 'var(--text-muted)',
            cursor: editTeamModal.hasCompletedMatches ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            fontWeight: editTeamModal.activeModalTab === 'teams' ? '600' : '500',
            fontSize: '15px',
            borderBottom: editTeamModal.activeModalTab === 'teams' ? '3px solid var(--primary-color)' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: editTeamModal.hasCompletedMatches ? 0.5 : 1
          }}
          title={editTeamModal.hasCompletedMatches ? 'Cannot manage teams after matches are completed' : ''}
        >
          <FaUsers /> Manage Teams {editTeamModal.hasCompletedMatches && '🔒'}
        </button>
        <button
          onClick={() => setEditTeamModal(prev => ({ ...prev, activeModalTab: 'players', selectedTeam: prev.teams[0] || null }))}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '15px 24px',
            color: editTeamModal.activeModalTab === 'players' ? 'var(--primary-color)' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontWeight: editTeamModal.activeModalTab === 'players' ? '600' : '500',
            fontSize: '15px',
            borderBottom: editTeamModal.activeModalTab === 'players' ? '3px solid var(--primary-color)' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaUserEdit /> Manage Players
        </button>
      </div>
      
      <div className="admin-teams-modal-body" style={{ overflow: 'auto' }}>
        {editTeamModal.loading ? (
          <div className="awards_standings_loading">
            <div className="awards_standings_spinner"></div>
            <p>Loading bracket data...</p>
          </div>
        ) : editTeamModal.error ? (
          <div className="bracket-error">
            <p>{editTeamModal.error}</p>
            <button 
              onClick={() => handleEditBracket(editTeamModal.bracket)}
              className="bracket-view-btn"
              style={{ marginTop: '10px' }}
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* BRACKET DETAILS TAB */}
            {editTeamModal.activeModalTab === 'details' && (
              <div style={{ padding: '24px' }}>
                <div style={{ 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  marginBottom: '24px', 
                  border: '1px solid rgba(59, 130, 246, 0.2)' 
                }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    Event: {selectedEvent?.name || 'Unknown Event'}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
                    Current Bracket: {editTeamModal.bracket.name}
                  </div>
                  {editTeamModal.hasCompletedMatches && (
                    <div style={{ 
                      color: '#f59e0b', 
                      fontSize: '13px', 
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: '600'
                    }}>
                      🔒 Some fields are locked because matches have been completed
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      color: 'var(--text-primary)', 
                      fontWeight: '600', 
                      fontSize: '14px' 
                    }}>
                      Bracket Name *
                    </label>
                    <input
                      type="text"
                      value={editTeamModal.editingBracket.name}
                      onChange={(e) => setEditTeamModal(prev => ({
                        ...prev,
                        editingBracket: { ...prev.editingBracket, name: e.target.value }
                      }))}
                      placeholder="Enter bracket name"
                      style={{ 
                        width: '100%', 
                        padding: '12px 16px', 
                        border: '2px solid var(--border-color)', 
                        borderRadius: '8px', 
                        background: 'var(--background-secondary)', 
                        color: 'var(--text-primary)', 
                        fontSize: '14px', 
                        outline: 'none',
                        fontWeight: '500'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '8px', 
                        color: 'var(--text-primary)', 
                        fontWeight: '600', 
                        fontSize: '14px' 
                      }}>
                        Sport Type *
                      </label>
                      <select
                        value={editTeamModal.editingBracket.sport_type}
                        onChange={(e) => setEditTeamModal(prev => ({
                          ...prev,
                          editingBracket: { ...prev.editingBracket, sport_type: e.target.value }
                        }))}
                        disabled={editTeamModal.hasCompletedMatches}
                        style={{ 
                          width: '100%', 
                          padding: '12px 16px', 
                          border: '2px solid var(--border-color)', 
                          borderRadius: '8px', 
                          background: editTeamModal.hasCompletedMatches ? '#1a2332' : 'var(--background-secondary)', 
                          color: 'var(--text-primary)', 
                          fontSize: '14px', 
                          outline: 'none',
                          fontWeight: '500',
                          cursor: editTeamModal.hasCompletedMatches ? 'not-allowed' : 'pointer',
                          opacity: editTeamModal.hasCompletedMatches ? 0.6 : 1
                        }}
                      >
                        <option value="basketball">Basketball</option>
                        <option value="volleyball">Volleyball</option>
                      </select>
                      {editTeamModal.hasCompletedMatches && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                          🔒 Locked after match completion
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '8px', 
                        color: 'var(--text-primary)', 
                        fontWeight: '600', 
                        fontSize: '14px' 
                      }}>
                        Elimination Type *
                      </label>
                      <select
                        value={editTeamModal.editingBracket.elimination_type}
                        onChange={(e) => setEditTeamModal(prev => ({
                          ...prev,
                          editingBracket: { ...prev.editingBracket, elimination_type: e.target.value }
                        }))}
                        disabled={editTeamModal.hasCompletedMatches}
                        style={{ 
                          width: '100%', 
                          padding: '12px 16px', 
                          border: '2px solid var(--border-color)', 
                          borderRadius: '8px', 
                          background: editTeamModal.hasCompletedMatches ? '#1a2332' : 'var(--background-secondary)', 
                          color: 'var(--text-primary)', 
                          fontSize: '14px', 
                          outline: 'none',
                          fontWeight: '500',
                          cursor: editTeamModal.hasCompletedMatches ? 'not-allowed' : 'pointer',
                          opacity: editTeamModal.hasCompletedMatches ? 0.6 : 1
                        }}
                      >
                        <option value="single">Single Elimination</option>
                        <option value="double">Double Elimination</option>
                        <option value="round_robin">Round Robin</option>
                      </select>
                      {editTeamModal.hasCompletedMatches && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                          🔒 Locked after match completion
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ 
                    background: 'rgba(245, 158, 11, 0.1)', 
                    padding: '16px', 
                    borderRadius: '8px', 
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    marginTop: '8px'
                  }}>
                    <div style={{ 
                      color: '#f59e0b', 
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '16px' }}>⚠️</span>
                      <span>
                        <strong>Warning:</strong> Changing the sport type will remove all assigned teams that don't match the new sport.
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  justifyContent: 'space-between', 
                  marginTop: '32px', 
                  paddingTop: '24px', 
                  borderTop: '1px solid var(--border-color)' 
                }}>
                  <button
                    onClick={async () => {
                      if (!confirm(`Are you sure you want to delete this bracket? This action cannot be undone.`)) {
                        return;
                      }
                      try {
                        const res = await fetch(`http://localhost:5000/api/brackets/${editTeamModal.bracket.id}`, { 
                          method: 'DELETE' 
                        });
                        if (!res.ok) throw new Error('Delete failed');
                        
                        await fetchEvents();
                        if (selectedBracket?.id === editTeamModal.bracket.id) {
                          setActiveTab("events");
                          setSelectedBracket(null);
                        }
                        closeEditTeamModal();
                        alert('Bracket deleted successfully');
                      } catch (err) {
                        alert('Failed to delete bracket: ' + err.message);
                      }
                    }}
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
                    <FaTrash /> Delete Bracket
                  </button>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={closeEditTeamModal}
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
                      onClick={handleSaveBracketDetails}
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
            )}

            {/* MANAGE TEAMS TAB */}
           {/* MANAGE TEAMS TAB */}
{/* MANAGE TEAMS TAB */}
{editTeamModal.activeModalTab === 'teams' && (
  <div style={{ padding: '24px' }}>
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
      {editTeamModal.hasCompletedMatches && (
        <div style={{ 
          color: '#f59e0b', 
          fontSize: '13px', 
          marginTop: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: '600',
          background: 'rgba(245, 158, 11, 0.1)',
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid rgba(245, 158, 11, 0.3)'
        }}>
          <span style={{ fontSize: '16px' }}>🔒</span>
          <span>Teams are locked - matches have been completed</span>
        </div>
      )}
    </div>

    {editTeamModal.hasCompletedMatches ? (
      <div>
        <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600' }}>
          Assigned Teams ({editTeamModal.teams.length})
        </h3>
        
        {editTeamModal.teams.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            background: 'var(--background-secondary)',
            borderRadius: '8px',
            border: '2px dashed var(--border-color)'
          }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              No teams assigned to this bracket.
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
                  <th style={{ width: '120px', textAlign: 'center', fontSize: '14px' }}>Actions</th>
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
                        onClick={() => {
                          setEditTeamModal(prev => ({
                            ...prev,
                            selectedTeam: team,
                            activeModalTab: 'players'
                          }));
                        }}
                        className="bracket-view-btn"
                        style={{ 
                          fontSize: '13px', 
                          padding: '8px 16px', 
                          background: 'var(--primary-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          margin: '0 auto'
                        }}
                        title="View Players"
                      >
                        <FaUserEdit /> View
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
      <div>
        <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600' }}>
          Manage Teams
        </h3>

        {/* Add Team Section */}
        <div style={{ 
          background: 'var(--background-secondary)', 
          padding: '20px', 
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid var(--border-color)'
          }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaPlus /> Add Team to Bracket
            </h4>
          </div>

          {editTeamModal.availableTeams.length === 0 ? (
            <div style={{
              background: 'rgba(251, 191, 36, 0.1)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid rgba(251, 191, 36, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ color: '#f59e0b', fontSize: '14px', fontWeight: '600' }}>
                No available {editTeamModal.bracket.sport_type} teams to add
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                All matching teams are already assigned to this bracket
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Select Team ({editTeamModal.bracket.sport_type})
                </label>
                <select
                  value={editTeamModal.selectedTeamToAdd}
                  onChange={(e) => setEditTeamModal(prev => ({
                    ...prev,
                    selectedTeamToAdd: e.target.value
                  }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid var(--border-color)',
                    borderRadius: '6px',
                    background: 'var(--background-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="">Choose a team...</option>
                  {editTeamModal.availableTeams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.sport?.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={async () => {
                  if (!editTeamModal.selectedTeamToAdd) {
                    alert('Please select a team');
                    return;
                  }

                  try {
                    const res = await fetch('http://localhost:5000/api/bracketTeams', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        bracketId: editTeamModal.bracket.id,
                        teamId: parseInt(editTeamModal.selectedTeamToAdd)
                      })
                    });

                    if (!res.ok) {
                      const error = await res.json();
                      throw new Error(error.error || 'Failed to add team');
                    }

                    alert('Team added successfully!');
                    setEditTeamModal(prev => ({
                      ...prev,
                      selectedTeamToAdd: ''
                    }));
                    await refreshTeamsInModal();
                  } catch (err) {
                    console.error('Error adding team:', err);
                    alert('Failed to add team: ' + err.message);
                  }
                }}
                style={{
                  padding: '10px 20px',
                  background: 'var(--success-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FaPlus /> Add Team
              </button>
            </div>
          )}
        </div>

        {/* Current Teams List */}
        <div>
          <h4 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>
            Current Teams ({editTeamModal.teams.length})
          </h4>
          {editTeamModal.teams.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 20px',
              background: 'var(--background-secondary)',
              borderRadius: '8px',
              border: '2px dashed var(--border-color)'
            }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                No teams assigned yet. Add teams using the form above.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {editTeamModal.teams.map(team => (
                <div
                  key={team.assignment_id || team.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'var(--background-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FaUsers style={{ color: 'var(--primary-color)', fontSize: '20px' }} />
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)' }}>{team.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {team.players?.length || 0} players
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm(`Are you sure you want to remove "${team.name}" from this bracket?`)) {
                        return;
                      }

                      try {
                        const res = await fetch(`http://localhost:5000/api/bracketTeams/${team.assignment_id || team.id}`, {
                          method: 'DELETE'
                        });

                        if (!res.ok) {
                          throw new Error(`HTTP error! status: ${res.status}`);
                        }

                        alert('Team removed successfully!');
                        await refreshTeamsInModal();
                      } catch (err) {
                        console.error('Error removing team:', err);
                        alert('Failed to remove team: ' + err.message);
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--error-color)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: '600'
                    }}
                  >
                    <FaTrash /> Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}
  </div>
)}

            {/* MANAGE PLAYERS TAB */}
            {editTeamModal.activeModalTab === 'players' && (
              <div style={{ padding: '24px' }}>
                {editTeamModal.teams.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    background: 'var(--background-secondary)',
                    borderRadius: '8px',
                    border: '2px dashed var(--border-color)'
                  }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
                      No teams available. Please add teams first.
                    </p>
                    <button
                      onClick={() => setEditTeamModal(prev => ({ ...prev, activeModalTab: 'teams' }))}
                      style={{
                        padding: '10px 20px',
                        background: 'var(--success-color)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <FaUsers /> Go to Teams
                    </button>
                  </div>
                ) : !editTeamModal.selectedTeam ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    background: 'var(--background-secondary)',
                    borderRadius: '8px',
                    border: '2px dashed var(--border-color)'
                  }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
                      Select a team to manage players
                    </p>
                    <select
                      value={editTeamModal.selectedTeam?.id || ''}
                      onChange={(e) => {
                        const team = editTeamModal.teams.find(t => t.id === parseInt(e.target.value));
                        setEditTeamModal(prev => ({ ...prev, selectedTeam: team }));
                      }}
                      style={{
                        padding: '10px 20px',
                        background: 'var(--background-secondary)',
                        color: 'var(--text-primary)',
                        border: '2px solid var(--border-color)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        minWidth: '200px'
                      }}
                    >
                      <option value="">Select a team...</option>
                      {editTeamModal.teams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    {/* Team Selection and Info */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginBottom: '20px',
                      padding: '16px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <select
                          value={editTeamModal.selectedTeam?.id || ''}
                          onChange={(e) => {
                            const team = editTeamModal.teams.find(t => t.id === parseInt(e.target.value));
                            setEditTeamModal(prev => ({ 
                              ...prev, 
                              selectedTeam: team,
                              editingPlayer: null 
                            }));
                          }}
                          style={{
                            padding: '10px 16px',
                            background: 'var(--background-secondary)',
                            color: 'var(--text-primary)',
                            border: '2px solid var(--border-color)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            minWidth: '200px'
                          }}
                        >
                          {editTeamModal.teams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                          ))}
                        </select>
                        <div style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                          <strong>{editTeamModal.selectedTeam.players?.length || 0}</strong> players
                        </div>
                      </div>
                      <div style={{ 
                        background: 'var(--primary-color)', 
                        color: 'white',
                        padding: '8px 16px', 
                        borderRadius: '6px', 
                        fontSize: '13px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {editTeamModal.bracket.sport_type}
                      </div>
                    </div>

                    {/* Add New Player Form */}
                    {/* Add New Player Form */}
                  <div style={{ 
  background: '#1a2332', 
  padding: '16px 24px', 
  borderRadius: '12px', 
  marginBottom: '24px',
  border: '1px solid #2d3748'
}}>
  <div style={{ display: 'flex', alignItems: 'end', gap: '16px' }}>
    {/* Name Input */}
    <div style={{ flex: 1 }}>
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
        value={editTeamModal.newPlayer.name}
        onChange={(e) => setEditTeamModal(prev => ({
          ...prev,
          newPlayer: { ...prev.newPlayer, name: e.target.value }
        }))}
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

    {/* Position Select */}
    <div style={{ flex: 1 }}>
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
        value={editTeamModal.newPlayer.position}
        onChange={(e) => setEditTeamModal(prev => ({
          ...prev,
          newPlayer: { ...prev.newPlayer, position: e.target.value }
        }))}
        style={{ 
          width: '100%', 
          padding: '12px 16px', 
          border: '2px solid #2d3748', 
          borderRadius: '8px',
          background: '#0f172a',
          color: '#e2e8f0',
          fontSize: '14px',
          outline: 'none',
          cursor: 'pointer',
          transition: 'border-color 0.2s ease'
        }}
        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
        onBlur={(e) => e.target.style.borderColor = '#2d3748'}
      >
        <option value="" style={{ background: '#1a2332' }}>Select Position</option>
        {getPositionsForSport(editTeamModal.bracket.sport_type).map(position => (
          <option key={position} value={position} style={{ background: '#1a2332' }}>
            {position}
          </option>
        ))}
      </select>
    </div>

    {/* Jersey Number Input */}
    <div style={{ flex: 1 }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '8px', 
        fontSize: '13px',
        fontWeight: '600',
        color: '#e2e8f0'
      }}>
        Jersey Number *
      </label>
      <input
        type="number"
        value={editTeamModal.newPlayer.jersey_number}
        onChange={(e) => setEditTeamModal(prev => ({
          ...prev,
          newPlayer: { ...prev.newPlayer, jersey_number: e.target.value }
        }))}
        placeholder="e.g., 23"
        min="0"
        max="99"
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

    {/* Add Button */}
    <button
      onClick={async () => {
        const { newPlayer, selectedTeam } = editTeamModal;
        
        if (!newPlayer.name || !newPlayer.position || !newPlayer.jersey_number) {
          alert("Please fill in all player fields");
          return;
        }

        // Check if team already has 15 players
        if (selectedTeam.players?.length >= 15) {
          alert("Cannot add more players. Maximum 15 players per team.");
          return;
        }

        // Check if position already has 3 players
        const positionCount = selectedTeam.players?.filter(
          p => p.position === newPlayer.position
        ).length || 0;
        
        if (positionCount >= 3) {
          alert(`Cannot add more ${newPlayer.position}. Maximum 3 players per position.`);
          return;
        }

        // Proceed with adding player
        handleAddPlayer();
      }}
      disabled={
        !editTeamModal.newPlayer.name || 
        !editTeamModal.newPlayer.position || 
        !editTeamModal.newPlayer.jersey_number ||
        (editTeamModal.selectedTeam?.players?.length >= 15) ||
        ((editTeamModal.selectedTeam?.players?.filter(
          p => p.position === editTeamModal.newPlayer.position
        ).length || 0) >= 3)
      }
      style={{ 
        padding: '12px 24px',
        background: (
          !editTeamModal.newPlayer.name || 
          !editTeamModal.newPlayer.position || 
          !editTeamModal.newPlayer.jersey_number ||
          (editTeamModal.selectedTeam?.players?.length >= 15) ||
          ((editTeamModal.selectedTeam?.players?.filter(
            p => p.position === editTeamModal.newPlayer.position
          ).length || 0) >= 3)
        ) 
          ? '#475569' 
          : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: (
          !editTeamModal.newPlayer.name || 
          !editTeamModal.newPlayer.position || 
          !editTeamModal.newPlayer.jersey_number ||
          (editTeamModal.selectedTeam?.players?.length >= 15) ||
          ((editTeamModal.selectedTeam?.players?.filter(
            p => p.position === editTeamModal.newPlayer.position
          ).length || 0) >= 3)
        ) 
          ? 'not-allowed' 
          : 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        opacity: (
          !editTeamModal.newPlayer.name || 
          !editTeamModal.newPlayer.position || 
          !editTeamModal.newPlayer.jersey_number ||
          (editTeamModal.selectedTeam?.players?.length >= 15) ||
          ((editTeamModal.selectedTeam?.players?.filter(
            p => p.position === editTeamModal.newPlayer.position
          ).length || 0) >= 3)
        ) 
          ? 0.6 
          : 1,
        transition: 'all 0.2s ease',
        boxShadow: (
          !editTeamModal.newPlayer.name || 
          !editTeamModal.newPlayer.position || 
          !editTeamModal.newPlayer.jersey_number ||
          (editTeamModal.selectedTeam?.players?.length >= 15) ||
          ((editTeamModal.selectedTeam?.players?.filter(
            p => p.position === editTeamModal.newPlayer.position
          ).length || 0) >= 3)
        )
          ? 'none'
          : '0 4px 12px rgba(16, 185, 129, 0.3)',
        whiteSpace: 'nowrap',
        height: '48px',
        marginTop: '30px'
      }}
    >
      <FaPlus /> Add Player
    </button>
  </div>

  {/* Player Limitations Info */}
  <div style={{ 
    marginTop: '12px',
    padding: '12px',
    background: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '6px',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    fontSize: '13px',
    color: '#94a3b8'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
      <span>Players: {editTeamModal.selectedTeam?.players?.length || 0}/15</span>
      {editTeamModal.newPlayer.position && (
        <span>
          {editTeamModal.newPlayer.position}: {
            editTeamModal.selectedTeam?.players?.filter(
              p => p.position === editTeamModal.newPlayer.position
            ).length || 0
          }/3
        </span>
      )}
    </div>
    {editTeamModal.selectedTeam?.players?.length >= 15 && (
      <div style={{ color: '#ef4444', fontWeight: '600', marginTop: '4px' }}>
        ⚠️ Maximum players reached (15)
      </div>
    )}
    {editTeamModal.newPlayer.position && 
     (editTeamModal.selectedTeam?.players?.filter(
       p => p.position === editTeamModal.newPlayer.position
     ).length || 0) >= 3 && (
      <div style={{ color: '#f59e0b', fontWeight: '600', marginTop: '4px' }}>
        ⚠️ Maximum {editTeamModal.newPlayer.position} positions filled (3)
      </div>
    )}
  </div>
</div>

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

                    {editTeamModal.editingPlayer && (
  <div style={{ 
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#1a2332',
    padding: '28px',
    borderRadius: '12px',
    border: '2px solid #2d3748',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    zIndex: 10000,
    minWidth: '600px'
  }}>
    <h4 style={{ 
      marginBottom: '24px', 
      color: '#e2e8f0', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '10px',
      fontSize: '18px',
      fontWeight: '700'
    }}>
      <FaEdit style={{ color: '#3b82f6' }} /> Edit Player
    </h4>
    
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
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
          value={editTeamModal.editingPlayer.name}
          onChange={(e) => setEditTeamModal(prev => ({
            ...prev,
            editingPlayer: { ...prev.editingPlayer, name: e.target.value }
          }))}
          style={{ 
            width: '100%', 
            padding: '12px 16px', 
            border: '2px solid #2d3748', 
            borderRadius: '8px', 
            background: '#0f172a', 
            color: '#e2e8f0', 
            fontSize: '14px',
            outline: 'none'
          }}
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
          value={editTeamModal.editingPlayer.position}
          onChange={(e) => setEditTeamModal(prev => ({
            ...prev,
            editingPlayer: { ...prev.editingPlayer, position: e.target.value }
          }))}
          style={{ 
            width: '100%', 
            padding: '12px 16px', 
            border: '2px solid #2d3748', 
            borderRadius: '8px', 
            background: '#0f172a', 
            color: '#e2e8f0', 
            fontSize: '14px',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          {getPositionsForSport(editTeamModal.bracket.sport_type).map(position => (
            <option key={position} value={position} style={{ background: '#1a2332' }}>
              {position}
            </option>
          ))}
        </select>
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
          Jersey Number *
        </label>
        <input
          type="number"
          value={editTeamModal.editingPlayer.jersey_number}
          onChange={(e) => setEditTeamModal(prev => ({
            ...prev,
            editingPlayer: { ...prev.editingPlayer, jersey_number: e.target.value }
          }))}
          min="0"
          max="99"
          style={{ 
            width: '100%', 
            padding: '12px 16px', 
            border: '2px solid #2d3748', 
            borderRadius: '8px', 
            background: '#0f172a', 
            color: '#e2e8f0', 
            fontSize: '14px',
            outline: 'none'
          }}
        />
      </div>
    </div>

    {/* Action Buttons */}
    <div style={{ 
      display: 'flex', 
      gap: '12px', 
      justifyContent: 'flex-end', 
      marginTop: '24px',
      paddingTop: '20px',
      borderTop: '1px solid #2d3748'
    }}>
      <button
        onClick={handleCancelEditPlayer}
        style={{ 
          padding: '12px 24px',
          background: '#2d3748',
          color: '#e2e8f0',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '14px',
          transition: 'all 0.2s ease'
        }}
      >
        Cancel
      </button>
      <button
        onClick={handleUpdatePlayer}
        style={{ 
          padding: '12px 24px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
          transition: 'all 0.2s ease'
        }}
      >
          <FaSave /> Save Changes
        </button>
      </div>
    </div>
  )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Modal Footer - Close Button */}
        
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