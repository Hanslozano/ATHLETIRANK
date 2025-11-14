import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaFilter, FaDownload, FaTrophy, FaArrowLeft, FaUsers, FaChartBar } from "react-icons/fa";
import "../../style/Admin_Stats.css";

const AdminStats = ({ sidebarOpen, preselectedEvent, preselectedBracket, embedded = false, statsViewMode = "players", onViewModeChange }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(preselectedEvent || null);
  const [selectedBracket, setSelectedBracket] = useState(preselectedBracket || null);
  const [brackets, setBrackets] = useState([]);
  const [matches, setMatches] = useState([]);
  const [playerStats, setPlayerStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sportFilter, setSportFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("brackets");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [cameFromAdminEvents, setCameFromAdminEvents] = useState(false);
  const [selectedRoundFilter, setSelectedRoundFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMatchForModal, setSelectedMatchForModal] = useState(null);
  
  const [sortConfig, setSortConfig] = useState({ key: 'overall_score', direction: 'desc' });

  // Animation state
  const [contentAnimation, setContentAnimation] = useState('fadeIn');
  const [isAnimating, setIsAnimating] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Player and team data
  const [allPlayersData, setAllPlayersData] = useState([]);
  const [allTeamsData, setAllTeamsData] = useState([]);

  // Event statistics state
  const [eventStatistics, setEventStatistics] = useState({
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
  });

  // Animation trigger function
  const triggerContentAnimation = () => {
    setIsAnimating(true);
    setContentAnimation('fadeOut');
    
    setTimeout(() => {
      setContentAnimation('fadeIn');
      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    }, 200);
  };

  // Get current sport type
  const getCurrentSportType = () => {
    return selectedBracket?.sport_type || eventStatistics.sport_type || 'basketball';
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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setShowFilters(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check for session storage data on component mount
  useEffect(() => {
    const checkSessionData = async () => {
      const matchData = sessionStorage.getItem('selectedMatchData');
      const contextData = sessionStorage.getItem('adminEventsContext');
      
      if (matchData && contextData) {
        setCameFromAdminEvents(true);
        try {
          const { matchId, eventId, bracketId, match } = JSON.parse(matchData);
          const { selectedEvent: eventContext, selectedBracket: bracketContext } = JSON.parse(contextData);
          
          setSelectedEvent(eventContext);
          setSelectedBracket(bracketContext);
          
          await handleMatchSelect(match);
        } catch (err) {
          console.error("Error loading session data:", err);
        }
      }
    };
    
    checkSessionData();
  }, []);

  // Use preselected event and bracket if provided
  useEffect(() => {
    if (preselectedEvent && preselectedBracket) {
      setSelectedEvent(preselectedEvent);
      setSelectedBracket(preselectedBracket);
      handleBracketSelect(preselectedBracket);
    }
  }, [preselectedEvent, preselectedBracket]);

  // Auto-load data when statsViewMode changes (controlled by parent)
  useEffect(() => {
    const loadDataForStatsView = async () => {
      if (selectedEvent && selectedBracket && statsViewMode) {
        setLoading(true);
        triggerContentAnimation();
        try {
          if (statsViewMode === "players") {
            await loadAllPlayersData(selectedEvent.id, selectedBracket.id);
          } else if (statsViewMode === "teams") {
            await loadAllTeamsData(selectedEvent.id, selectedBracket.id);
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

  // Fetch events only if no preselected event
  useEffect(() => {
    const fetchEvents = async () => {
      if (preselectedEvent) return;
      
      setLoading(true);
      try {
        const res = await fetch("http://localhost:5000/api/stats/events");
        const data = await res.json();
        setEvents(data);
        if (data.length > 0 && !selectedEvent) {
          handleEventSelect(data[0]);
        }
      } catch (err) {
        console.error("Error fetching events:", err);
        const mockEvents = [
          { 
            id: 1, 
            name: "Automation Day 2025", 
            status: "ongoing", 
            start_date: "2025-09-20", 
            end_date: "2025-10-04",
            archived: "no"
          },
          { 
            id: 2, 
            name: "Volleyball Championship", 
            status: "completed", 
            start_date: "2023-11-01", 
            end_date: "2023-11-03",
            archived: "no"
          }
        ];
        setEvents(mockEvents);
        if (!selectedEvent) {
          handleEventSelect(mockEvents[0]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [preselectedEvent, selectedEvent]);

  // Load event statistics with proper bracket filtering
  const loadEventStatistics = async (eventId, bracketId = null) => {
    try {
      let url = `http://localhost:5000/api/stats/events/${eventId}/statistics`;
      if (bracketId) {
        url += `?bracketId=${bracketId}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      setEventStatistics(data);
    } catch (err) {
      console.error("Error fetching event statistics:", err);
      setEventStatistics({
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
      });
    }
  };

  // Handle event selection
  const handleEventSelect = async (event) => {
    setSelectedEvent(event);
    setSelectedBracket(null);
    setLoading(true);
    setCurrentPage(1);
    triggerContentAnimation();
    try {
      const bracketRes = await fetch(`http://localhost:5000/api/stats/events/${event.id}/brackets`);
      const bracketData = await bracketRes.json();
      setBrackets(bracketData);

      const allMatches = [];
      for (const bracket of bracketData) {
        try {
          const matchRes = await fetch(`http://localhost:5000/api/stats/${bracket.id}/matches`);
          const matchData = await matchRes.json();
          const matchesWithBracket = matchData.map(match => ({
            ...match,
            bracket_name: bracket.name,
            sport_type: bracket.sport_type,
            bracket_type: match.bracket_type || bracket.bracket_type || bracket.elimination_type
          }));
          allMatches.push(...matchesWithBracket);
        } catch (err) {
          console.error(`Error fetching matches for bracket ${bracket.id}:`, err);
        }
      }
      setMatches(allMatches);

      setEventStatistics({
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
      });
      setAllPlayersData([]);
      setAllTeamsData([]);
      
      if (statsViewMode === "players") {
        setActiveTab("players");
      } else if (statsViewMode === "teams") {
        setActiveTab("teams");
      } else {
        setActiveTab("brackets");
      }
    } catch (err) {
      console.error("Error fetching event data:", err);
      
      const mockBrackets = [
        { id: 1, name: "Men's Basketball Bracket", sport_type: "basketball", event_id: 1, elimination_type: "double" },
        { id: 2, name: "Women's Volleyball Bracket", sport_type: "volleyball", event_id: 2, elimination_type: "single" }
      ];
      setBrackets(mockBrackets);
      
      const mockMatches = [
        { 
          id: 1, 
          bracket_id: 1, 
          team1_name: "Team A", 
          team2_name: "Team B", 
          winner_name: "Team A", 
          score_team1: 85, 
          score_team2: 70, 
          status: "completed", 
          round_number: 1, 
          bracket_name: "Men's Basketball Bracket", 
          sport_type: "basketball",
          bracket_type: "winner"
        }
      ];
      setMatches(mockMatches);
      
      if (statsViewMode === "players") {
        setActiveTab("players");
      } else if (statsViewMode === "teams") {
        setActiveTab("teams");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle bracket selection to load specific bracket data
  const handleBracketSelect = async (bracket) => {
    setSelectedBracket(bracket);
    setLoading(true);
    triggerContentAnimation();
    try {
      // Load data based on current view mode
      if (statsViewMode === "players") {
        await loadAllPlayersData(selectedEvent.id, bracket.id);
      } else if (statsViewMode === "teams") {
        await loadAllTeamsData(selectedEvent.id, bracket.id);
      }
      
      const matchRes = await fetch(`http://localhost:5000/api/stats/${bracket.id}/matches`);
      const matchData = await matchRes.json();
      const matchesWithBracket = matchData.map(match => ({
        ...match,
        bracket_name: bracket.name,
        sport_type: bracket.sport_type,
        bracket_type: match.bracket_type || bracket.bracket_type || bracket.elimination_type
      }));
      
      setMatches(matchesWithBracket);
      await loadEventStatistics(selectedEvent.id, bracket.id);
      
    } catch (err) {
      console.error("Error fetching bracket data:", err);
      setEventStatistics({
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
      });
    } finally {
      setLoading(false);
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
      
      setAllPlayersData(sortedData);
    } catch (err) {
      console.error("Error fetching players data:", err);
      setAllPlayersData([]);
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
      
      setAllTeamsData(sortedData);
    } catch (err) {
      console.error("Error fetching teams data:", err);
      setAllTeamsData([]);
    }
  };

  // Handle match selection to view player stats
  const handleMatchSelect = async (match) => {
    setSelectedMatchForModal(match);
    setIsModalOpen(true);
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/stats/matches/${match.id}/stats`);
      const data = await res.json();
      
      const playersWithDetails = data.map((stat) => ({
        ...stat,
        player_name: stat.player_name || "Unknown Player",
        jersey_number: stat.jersey_number || stat.jerseyNumber || "N/A",
        team_name: stat.team_name || "Unknown Team"
      }));
      
      setPlayerStats(playersWithDetails);
    } catch (err) {
      console.error("Error fetching player stats:", err);
      setPlayerStats([]);
    } finally {
      setLoading(false);
    }
  };

  // Add modal close function
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMatchForModal(null);
    setPlayerStats([]);
  };

  // Handle sorting for tables
  const handleSort = (key) => {
    let direction = 'desc';
    
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'desc' ? 'asc' : 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  // Sort and filter all players data
  const sortedPlayers = [...allPlayersData].sort((a, b) => {
    const aValue = a[sortConfig.key] || 0;
    const bValue = b[sortConfig.key] || 0;
    
    if (sortConfig.direction === 'desc') {
      return bValue - aValue;
    } else {
      return aValue - bValue;
    }
  });

  const filteredPlayers = sortedPlayers.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (player.jersey_number && player.jersey_number.toString().includes(searchTerm))
  );

  // Sort and filter all teams data
  const sortedTeams = [...allTeamsData].sort((a, b) => {
    const aValue = a[sortConfig.key] || 0;
    const bValue = b[sortConfig.key] || 0;
    
    if (sortConfig.direction === 'desc') {
      return bValue - aValue;
    } else {
      return aValue - bValue;
    }
  });

  const filteredTeams = sortedTeams.filter(team =>
    team.team_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Performance color coding
  const getPerformanceColor = (value, stat) => {
    const sportType = getCurrentSportType();
    
    if (sportType === 'basketball') {
      const thresholds = {
        ppg: { high: 20, low: 10 },
        rpg: { high: 10, low: 5 },
        apg: { high: 8, low: 4 },
        overall_score: { high: 30, low: 15 }
      };
      
      const threshold = thresholds[stat];
      if (!threshold) return 'text-gray-300';
      
      if (value >= threshold.high) return 'stats-high-value';
      if (value <= threshold.low) return 'stats-low-value';
      return 'stats-medium-value';
    } else {
      const thresholds = {
        kills: { high: 50, low: 20 },
        assists: { high: 40, low: 15 },
        digs: { high: 60, low: 25 },
        blocks: { high: 15, low: 5 },
        service_aces: { high: 10, low: 3 },
        receptions: { high: 80, low: 30 },
        serve_errors: { high: 10, low: 3 },
        attack_errors: { high: 8, low: 2 },
        reception_errors: { high: 6, low: 1 },
        assist_errors: { high: 6, low: 1 },
        blocking_errors: { high: 5, low: 1 },
        ball_handling_errors: { high: 5, low: 1 },
        eff: { high: 80, low: 30 },
        overall_score: { high: 25, low: 12 }
      };
      
      const threshold = thresholds[stat];
      if (!threshold) return 'text-gray-300';
      
      if (stat.includes('errors')) {
        if (value <= threshold.low) return 'stats-high-value';
        if (value >= threshold.high) return 'stats-low-value';
        return 'stats-medium-value';
      }
      
      if (value >= threshold.high) return 'stats-high-value';
      if (value <= threshold.low) return 'stats-low-value';
      return 'stats-medium-value';
    }
  };

  // Export all players data to CSV
  const exportAllPlayersCSV = () => {
    if (allPlayersData.length === 0) return;
    
    const sportType = getCurrentSportType();
    let headers, rows;
    
    if (sportType === 'basketball') {
      headers = ['Rank', 'Player', 'Team', 'Jersey', 'Games Played', 'Overall Score', 'PPG', 'RPG', 'APG', 'BPG', 'Total Points', 'Total Assists', 'Total Rebounds'];
      rows = filteredPlayers.map((player, index) => [
        index + 1,
        player.name,
        player.team_name,
        player.jersey_number,
        player.games_played,
        player.overall_score || 0,
        player.ppg,
        player.rpg,
        player.apg,
        player.bpg,
        player.total_points,
        player.total_assists,
        player.total_rebounds
      ]);
    } else {
      // UPDATED: Add new error columns
      headers = ['Rank', 'Player', 'Team', 'Jersey', 'Games Played', 'Overall Score', 
                'Total Kills', 'Total Assists', 'Total Digs', 'Total Blocks', 'Total Aces', 
                'Total Receptions', 'Service Errors', 'Attack Errors', 'Reception Errors', 
                'Assist Errors', 'Blocking Errors', 'Ball Handling Errors', 'Efficiency'];
      rows = filteredPlayers.map((player, index) => [
        index + 1,
        player.name,
        player.team_name,
        player.jersey_number,
        player.games_played,
        player.overall_score || 0,
        player.kills || 0,
        player.assists || 0,
        player.digs || 0,
        player.blocks || 0,
        player.service_aces || 0,
        player.receptions || 0,
        player.serve_errors || 0,
        player.attack_errors || 0,
        player.reception_errors || 0,
        player.assist_errors || 0,
        player.blocking_errors || 0,  // NEW
        player.ball_handling_errors || 0,  // NEW
        player.eff || 0
      ]);
    }
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${csvContent}`);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedEvent?.name}-all-players-statistics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export all teams data to CSV
  const exportAllTeamsCSV = () => {
    if (allTeamsData.length === 0) return;
    
    const sportType = getCurrentSportType();
    let headers, rows;
    
    if (sportType === 'basketball') {
      headers = ['Rank', 'Team', 'Games Played', 'Overall Score', 'PPG', 'RPG', 'APG', 'BPG', 'Total Points', 'Total Assists', 'Total Rebounds'];
      rows = filteredTeams.map((team, index) => [
        index + 1,
        team.team_name,
        team.games_played,
        team.overall_score || 0,
        team.ppg,
        team.rpg,
        team.apg,
        team.bpg,
        team.total_points,
        team.total_assists,
        team.total_rebounds
      ]);
   } else {
      // UPDATED: Add new error columns
      headers = ['Rank', 'Team', 'Games Played', 'Overall Score', 'Total Kills', 'Total Assists', 
                'Total Digs', 'Total Blocks', 'Total Aces', 'Total Receptions', 'Service Errors', 
                'Attack Errors', 'Reception Errors', 'Assist Errors', 'Blocking Errors', 
                'Ball Handling Errors', 'Efficiency'];
      rows = filteredTeams.map((team, index) => [
        index + 1,
        team.team_name,
        team.games_played,
        team.overall_score || 0,
        team.kills || 0,
        team.assists || 0,
        team.digs || 0,
        team.blocks || 0,
        team.service_aces || 0,
        team.receptions || 0,
        team.serve_errors || 0,
        team.attack_errors || 0,
        team.reception_errors || 0,
        team.assist_errors || 0,
        team.blocking_errors || 0,  // NEW
        team.ball_handling_errors || 0,  // NEW
        team.eff || 0
      ]);
    }
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${csvContent}`);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedEvent?.name}-all-teams-statistics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Go back to Admin Events page with context preserved
  const handleBackToAdminEvents = () => {
    sessionStorage.setItem('adminEventsReturnContext', JSON.stringify({
      selectedEvent: selectedEvent,
      selectedBracket: selectedBracket
    }));
    navigate('/AdminDashboard/events');
  };

  // Filter player stats based on search term
  const filteredPlayerStats = playerStats.filter(player => 
    player.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (player.jersey_number && player.jersey_number.toString().includes(searchTerm)) ||
    (player.jerseyNumber && player.jerseyNumber.toString().includes(searchTerm))
  );

  // Group matches by bracket
  const matchesByBracket = {};
  matches.forEach(match => {
    if (!matchesByBracket[match.bracket_id]) {
      matchesByBracket[match.bracket_id] = [];
    }
    matchesByBracket[match.bracket_id].push(match);
  });

  // Find bracket winners
  const bracketWinners = {};
  brackets.forEach(bracket => {
    if (matchesByBracket[bracket.id]) {
      const finalMatches = matchesByBracket[bracket.id].filter(m => 
        Math.max(...matchesByBracket[bracket.id].map(m => m.round_number)) === m.round_number
      );
      if (finalMatches.length > 0) {
        bracketWinners[bracket.id] = finalMatches[0].winner_name;
      }
    }
  });

  // Pagination logic for players
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPlayers = filteredPlayers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPagesPlayers = Math.ceil(filteredPlayers.length / itemsPerPage);

  // Pagination logic for teams
  const currentTeams = filteredTeams.slice(indexOfFirstItem, indexOfLastItem);
  const totalPagesTeams = Math.ceil(filteredTeams.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to page 1 when filters or items per page changes
 useEffect(() => {
  setCurrentPage(1);
  setSelectedRoundFilter('all');
}, [searchTerm, itemsPerPage]);

  // Render Basketball Players Table Headers
  const renderBasketballPlayerHeaders = () => {
    return (
      <>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('ppg')}
        >
          PPG {sortConfig.key === 'ppg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('rpg')}
        >
          RPG {sortConfig.key === 'rpg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('apg')}
        >
          APG {sortConfig.key === 'apg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('bpg')}
        >
          BPG {sortConfig.key === 'bpg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
      </>
    );
  };

  // Render Volleyball Players Table Headers
const renderVolleyballPlayerHeaders = () => {
  return (
    <>
      <th className="stats-sortable-header" onClick={() => handleSort('kills')}>
        Total Kills {sortConfig.key === 'kills' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('assists')}>
        Total Assists {sortConfig.key === 'assists' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('digs')}>
        Total Digs {sortConfig.key === 'digs' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('blocks')}>
        Total Blocks {sortConfig.key === 'blocks' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('service_aces')}>
        Total Aces {sortConfig.key === 'service_aces' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('receptions')}>
        Total Receptions {sortConfig.key === 'receptions' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('serve_errors')}>
        Service Errors {sortConfig.key === 'serve_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('attack_errors')}>
        Attack Errors {sortConfig.key === 'attack_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('reception_errors')}>
        Reception Errors {sortConfig.key === 'reception_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('assist_errors')}>
        Assist Errors {sortConfig.key === 'assist_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      {/* NEW: Add these two headers */}
      <th className="stats-sortable-header" onClick={() => handleSort('blocking_errors')}>
        Blocking Errors {sortConfig.key === 'blocking_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('ball_handling_errors')}>
        Ball Handling Errors {sortConfig.key === 'ball_handling_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('eff')}>
        Efficiency {sortConfig.key === 'eff' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
    </>
  );
};

  // Render Basketball Players Table Rows
  const renderBasketballPlayerRows = () => {
    return currentPlayers.map((player, index) => (
      <tr key={player.id} className="stats-player-row">
        <td className="stats-rank-cell">
          <div className={`stats-rank-badge ${
            indexOfFirstItem + index === 0 ? 'stats-rank-1' : 
            indexOfFirstItem + index === 1 ? 'stats-rank-2' :
            indexOfFirstItem + index === 2 ? 'stats-rank-3' : 'stats-rank-other'
          }`}>
            {indexOfFirstItem + index + 1}
          </div>
        </td>
        <td className="stats-player-name" style={{ fontSize: '0.95rem' }}>{player.name}</td>
        <td className="stats-team-name" style={{ fontSize: '0.9rem' }}>{player.team_name}</td>
        <td className="stats-jersey-number">{player.jersey_number}</td>
        <td className="stats-games-played">{player.games_played}</td>
        <td className={getPerformanceColor(player.overall_score, 'overall_score')}>
          {player.overall_score || 0}
        </td>
        <td className={getPerformanceColor(player.ppg, 'ppg')}>{player.ppg}</td>
        <td className={getPerformanceColor(player.rpg, 'rpg')}>{player.rpg}</td>
        <td className={getPerformanceColor(player.apg, 'apg')}>{player.apg}</td>
        <td className="stats-bpg">{player.bpg}</td>
      </tr>
    ));
  };

  // Render Volleyball Players Table Rows
const renderVolleyballPlayerRows = () => {
  return currentPlayers.map((player, index) => (
    <tr key={player.id} className="stats-player-row">
      <td className="stats-rank-cell">
        <div className={`stats-rank-badge ${
          indexOfFirstItem + index === 0 ? 'stats-rank-1' : 
          indexOfFirstItem + index === 1 ? 'stats-rank-2' :
          indexOfFirstItem + index === 2 ? 'stats-rank-3' : 'stats-rank-other'
        }`}>
          {indexOfFirstItem + index + 1}
        </div>
      </td>
      <td className="stats-player-name" style={{ fontSize: '0.95rem' }}>{player.name}</td>
      <td className="stats-team-name" style={{ fontSize: '0.9rem' }}>{player.team_name}</td>
      <td className="stats-jersey-number">{player.jersey_number}</td>
      <td className="stats-games-played">{player.games_played}</td>
      <td className={getPerformanceColor(player.overall_score, 'overall_score')}>
        {player.overall_score || 0}
      </td>
      <td className={getPerformanceColor(player.kills, 'kills')}>{player.kills || 0}</td>
      <td className={getPerformanceColor(player.assists, 'assists')}>{player.assists || 0}</td>
      <td className={getPerformanceColor(player.digs, 'digs')}>{player.digs || 0}</td>
      <td className="stats-blocks">{player.blocks || 0}</td>
      <td className="stats-service-aces">{player.service_aces || 0}</td>
      <td className={getPerformanceColor(player.receptions, 'receptions')}>{player.receptions || 0}</td>
      <td className="stats-error">{player.serve_errors || 0}</td>
      <td className="stats-error">{player.attack_errors || 0}</td>
      <td className="stats-error">{player.reception_errors || 0}</td>
      <td className="stats-error">{player.assist_errors || 0}</td>
      {/* NEW: Add these two cells */}
      <td className="stats-error">{player.blocking_errors || 0}</td>
      <td className="stats-error">{player.ball_handling_errors || 0}</td>
      <td className={getPerformanceColor(player.eff, 'eff')}>{player.eff || 0}</td>
    </tr>
  ));
};

  // Render Basketball Teams Table Headers
  const renderBasketballTeamHeaders = () => {
    return (
      <>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('ppg')}
        >
          PPG {sortConfig.key === 'ppg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('rpg')}
        >
          RPG {sortConfig.key === 'rpg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('apg')}
        >
          APG {sortConfig.key === 'apg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('bpg')}
        >
          BPG {sortConfig.key === 'bpg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
      </>
    );
  };

// Render Volleyball Teams Table Headers
const renderVolleyballTeamHeaders = () => {
  return (
    <>
      <th className="stats-sortable-header" onClick={() => handleSort('kills')}>
        Total Kills {sortConfig.key === 'kills' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('assists')}>
        Total Assists {sortConfig.key === 'assists' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('digs')}>
        Total Digs {sortConfig.key === 'digs' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('blocks')}>
        Total Blocks {sortConfig.key === 'blocks' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('service_aces')}>
        Total Aces {sortConfig.key === 'service_aces' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('receptions')}>
        Total Receptions {sortConfig.key === 'receptions' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('serve_errors')}>
        Service Errors {sortConfig.key === 'serve_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('attack_errors')}>
        Attack Errors {sortConfig.key === 'attack_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('reception_errors')}>
        Reception Errors {sortConfig.key === 'reception_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('assist_errors')}>
        Assist Errors {sortConfig.key === 'assist_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      {/* NEW: Add these two headers */}
      <th className="stats-sortable-header" onClick={() => handleSort('blocking_errors')}>
        Blocking Errors {sortConfig.key === 'blocking_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('ball_handling_errors')}>
        Ball Handling Errors {sortConfig.key === 'ball_handling_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('eff')}>
        Efficiency {sortConfig.key === 'eff' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
    </>
  );
};

  
  // Render Basketball Teams Table Rows
  const renderBasketballTeamRows = () => {
    return currentTeams.map((team, index) => (
      <tr key={team.team_id} className="stats-player-row">
        <td className="stats-rank-cell">
          <div className={`stats-rank-badge ${
            indexOfFirstItem + index === 0 ? 'stats-rank-1' : 
            indexOfFirstItem + index === 1 ? 'stats-rank-2' :
            indexOfFirstItem + index === 2 ? 'stats-rank-3' : 'stats-rank-other'
          }`}>
            {indexOfFirstItem + index + 1}
          </div>
        </td>
        <td className="stats-team-name" style={{ fontSize: '0.95rem' }}>{team.team_name}</td>
        <td className="stats-games-played">{team.games_played}</td>
        <td className={getPerformanceColor(team.overall_score, 'overall_score')}>
          {team.overall_score || 0}
        </td>
        <td className={getPerformanceColor(team.ppg, 'ppg')}>{team.ppg}</td>
        <td className={getPerformanceColor(team.rpg, 'rpg')}>{team.rpg}</td>
        <td className={getPerformanceColor(team.apg, 'apg')}>{team.apg}</td>
        <td className="stats-bpg">{team.bpg}</td>
      </tr>
    ));
  };


  // Render Volleyball Teams Table Rows
const renderVolleyballTeamRows = () => {
  return currentTeams.map((team, index) => (
    <tr key={team.team_id} className="stats-player-row">
      <td className="stats-rank-cell">
        <div className={`stats-rank-badge ${
          indexOfFirstItem + index === 0 ? 'stats-rank-1' : 
          indexOfFirstItem + index === 1 ? 'stats-rank-2' :
          indexOfFirstItem + index === 2 ? 'stats-rank-3' : 'stats-rank-other'
        }`}>
          {indexOfFirstItem + index + 1}
        </div>
      </td>
      <td className="stats-team-name" style={{ fontSize: '0.95rem' }}>{team.team_name}</td>
      <td className="stats-games-played">{team.games_played}</td>
      <td className={getPerformanceColor(team.overall_score, 'overall_score')}>
        {team.overall_score || 0}
      </td>
      <td className={getPerformanceColor(team.kills, 'kills')}>{team.kills || 0}</td>
      <td className={getPerformanceColor(team.assists, 'assists')}>{team.assists || 0}</td>
      <td className={getPerformanceColor(team.digs, 'digs')}>{team.digs || 0}</td>
      <td className="stats-blocks">{team.blocks || 0}</td>
      <td className="stats-service-aces">{team.service_aces || 0}</td>
      <td className={getPerformanceColor(team.receptions, 'receptions')}>{team.receptions || 0}</td>
      <td className="stats-error">{team.serve_errors || 0}</td>
      <td className="stats-error">{team.attack_errors || 0}</td>
      <td className="stats-error">{team.reception_errors || 0}</td>
      <td className="stats-error">{team.assist_errors || 0}</td>
      {/* NEW: Add these two cells */}
      <td className="stats-error">{team.blocking_errors || 0}</td>
      <td className="stats-error">{team.ball_handling_errors || 0}</td>
      <td className={getPerformanceColor(team.eff, 'eff')}>
        {team.eff || 0}
      </td>
    </tr>
  ));
};

  // Render All Players Statistics Table
  const renderAllPlayersTable = () => {
    const sportType = getCurrentSportType();
    
    return (
      <div className={`stats-table-container stats-content-animate ${contentAnimation}`} style={{
        padding: '0 20px'
      }}>
        <div className="stats-table-controls">
          <div className="stats-search-container">
            <FaSearch className="stats-search-icon" />
            <input
              type="text"
              placeholder="Search players or teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="stats-search-input"
            />
          </div>
          <button className="stats-export-btn" onClick={exportAllPlayersCSV}>
            <FaDownload /> Export CSV
          </button>
        </div>

        <div className="stats-results-info">
          <div className="stats-results-count">
            {searchTerm ? (
              <>
                Showing {Math.min(itemsPerPage, currentPlayers.length)} of {currentPlayers.length} results
                {searchTerm && <span className="stats-search-indicator"> • Searching: "{searchTerm}"</span>}
              </>
            ) : (
              <>Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredPlayers.length)} of {filteredPlayers.length} players</>
            )}
          </div>
          <div className="stats-items-per-page">
            <label className="stats-items-per-page-label">Show:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="stats-items-per-page-select"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="stats-items-per-page-text">per page</span>
          </div>
        </div>
        
        <div className="stats-table-wrapper">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Team</th>
                <th>Jersey</th>
                <th 
                  className="stats-sortable-header"
                  onClick={() => handleSort('games_played')}
                >
                  GP {sortConfig.key === 'games_played' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                </th>
                <th 
                  className="stats-sortable-header"
                  onClick={() => handleSort('overall_score')}
                >
                  Overall {sortConfig.key === 'overall_score' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                </th>
                {sportType === 'basketball' ? renderBasketballPlayerHeaders() : renderVolleyballPlayerHeaders()}
              </tr>
            </thead>
            <tbody>
              {sportType === 'basketball' ? renderBasketballPlayerRows() : renderVolleyballPlayerRows()}
            </tbody>
          </table>
        </div>

        {filteredPlayers.length === 0 && (
          <div className="stats-empty-state">
            <p>No players found matching your search.</p>
          </div>
        )}

        {totalPagesPlayers > 1 && (
          <div className="stats-pagination-container">
            <div className="stats-pagination-info">
              Page {currentPage} of {totalPagesPlayers}
            </div>
            
            <div className="stats-pagination-controls">
              <button 
                className="stats-pagination-btn"
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              
              <div className="stats-pagination-numbers">
                {[...Array(totalPagesPlayers)].map((_, index) => {
                  const pageNumber = index + 1;
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPagesPlayers ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNumber}
                        className={`stats-pagination-number ${currentPage === pageNumber ? 'active' : ''}`}
                        onClick={() => paginate(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    );
                  } else if (
                    pageNumber === currentPage - 2 ||
                    pageNumber === currentPage + 2
                  ) {
                    return <span key={pageNumber} className="stats-pagination-ellipsis">...</span>;
                  }
                  return null;
                })}
              </div>
              
              <button 
                className="stats-pagination-btn"
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPagesPlayers}
              >
                Next
              </button>
            </div>
          </div>
        )}

        <div className="stats-table-footer">
          <div>Total {filteredPlayers.length} players • Last updated: {new Date().toLocaleString()}</div>
        </div>
      </div>
    );
  };

  // Render All Teams Statistics Table
  const renderAllTeamsTable = () => {
    const sportType = getCurrentSportType();
    
    return (
      <div className={`stats-table-container stats-content-animate ${contentAnimation}`} style={{
        padding: '0 20px'
      }}>
        <div className="stats-table-controls">
          <div className="stats-search-container">
            <FaSearch className="stats-search-icon" />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="stats-search-input"
            />
          </div>
          <button className="stats-export-btn" onClick={exportAllTeamsCSV}>
            <FaDownload /> Export CSV
          </button>
        </div>

        <div className="stats-results-info">
          <div className="stats-results-count">
            {searchTerm ? (
              <>
                Showing {Math.min(itemsPerPage, currentTeams.length)} of {currentTeams.length} results
                {searchTerm && <span className="stats-search-indicator"> • Searching: "{searchTerm}"</span>}
              </>
            ) : (
              <>Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredTeams.length)} of {filteredTeams.length} teams</>
            )}
          </div>
          <div className="stats-items-per-page">
            <label className="stats-items-per-page-label">Show:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="stats-items-per-page-select"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="stats-items-per-page-text">per page</span>
          </div>
        </div>
        
        <div className="stats-table-wrapper">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th 
                  className="stats-sortable-header"
                  onClick={() => handleSort('games_played')}
                >
                  GP {sortConfig.key === 'games_played' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                </th>
                <th 
                  className="stats-sortable-header"
                  onClick={() => handleSort('overall_score')}
                >
                  Overall {sortConfig.key === 'overall_score' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                </th>
                {sportType === 'basketball' ? renderBasketballTeamHeaders() : renderVolleyballTeamHeaders()}
              </tr>
            </thead>
            <tbody>
              {sportType === 'basketball' ? renderBasketballTeamRows() : renderVolleyballTeamRows()}
            </tbody>
          </table>
        </div>

        {filteredTeams.length === 0 && (
          <div className="stats-empty-state">
            <p>No teams found matching your search.</p>
          </div>
        )}

        {totalPagesTeams > 1 && (
          <div className="stats-pagination-container">
            <div className="stats-pagination-info">
              Page {currentPage} of {totalPagesTeams}
            </div>
            
            <div className="stats-pagination-controls">
              <button 
                className="stats-pagination-btn"
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              
              <div className="stats-pagination-numbers">
                {[...Array(totalPagesTeams)].map((_, index) => {
                  const pageNumber = index + 1;
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPagesTeams ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNumber}
                        className={`stats-pagination-number ${currentPage === pageNumber ? 'active' : ''}`}
                        onClick={() => paginate(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    );
                  } else if (
                    pageNumber === currentPage - 2 ||
                    pageNumber === currentPage + 2
                  ) {
                    return <span key={pageNumber} className="stats-pagination-ellipsis">...</span>;
                  }
                  return null;
                })}
              </div>
              
              <button 
                className="stats-pagination-btn"
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPagesTeams}
              >
                Next
              </button>
            </div>
          </div>
        )}

        <div className="stats-table-footer">
          <div>Total {filteredTeams.length} teams • Last updated: {new Date().toLocaleString()}</div>
        </div>
      </div>
    );
  };

  // Render player statistics table for match view
  const renderMatchStatsTable = () => {
    if (playerStats.length === 0) return <p>No statistics available for this match.</p>;
    
    const isBasketball = getCurrentSportType() === "basketball";
    
    return (
      <div className="stats-table-container">
        <div className="stats-table-controls" style={{ justifyContent: 'flex-end' }}>
          <button className="stats-export-btn" onClick={exportToCSV}>
            <FaDownload /> Export CSV
          </button>
        </div>
        
        <div className="stats-table-wrapper">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                <th>Jersey</th>
                {isBasketball ? (
                  <>
                    <th>PTS</th>
                    <th>AST</th>
                    <th>REB</th>
                    <th>STL</th>
                    <th>BLK</th>
                    <th>3PM</th>
                    <th>Fouls</th>
                    <th>TO</th>
                  </>
              ) : (
                <>
                  <th>Kills</th>
                  <th>Assists</th>
                  <th>Digs</th>
                  <th>Blocks</th>
                  <th>Aces</th>
                  <th>Receptions</th>
                  <th>Service Errors</th>
                  <th>Attack Errors</th>
                  <th>Reception Errors</th>
                  <th>Assist Errors</th>
                  <th>Blocking Errors</th>  {/* NEW */}
                  <th>Ball Handling Errors</th>  {/* NEW */}
                  <th>Eff</th>
                </>
              )}
              </tr>
            </thead>
            <tbody>
              {filteredPlayerStats.map((player) => {
                const jerseyNumber = player.jersey_number || player.jerseyNumber || "N/A";
                const totalErrors = (player.serve_errors || 0) + 
                                 (player.attack_errors || 0) + 
                                 (player.reception_errors || 0) + 
                                 (player.assist_errors || 0) +
                                 (player.blocking_errors || 0) +  // NEW
                                 (player.ball_handling_errors || 0);  // NEW
                const efficiency = (player.kills || 0) + 
                                (player.digs || 0) + 
                                (player.volleyball_blocks || 0) + 
                                (player.service_aces || 0) - 
                                totalErrors;
                
                return (
                  <tr key={player.player_id}>
                    <td className="stats-player-name">{player.player_name}</td>
                    <td>{player.team_name}</td>
                    <td className="stats-jersey-number">{jerseyNumber}</td>
                    
                    {isBasketball ? (
                      <>
                        <td className="stats-highlight">{player.points || 0}</td>
                        <td>{player.assists || 0}</td>
                        <td>{player.rebounds || 0}</td>
                        <td>{player.steals || 0}</td>
                        <td>{player.blocks || 0}</td>
                        <td>{player.three_points_made || 0}</td>
                        <td>{player.fouls || 0}</td>
                        <td>{player.turnovers || 0}</td>
                      </>
                    ) : (
                      <>
                        <td className="stats-highlight">{player.kills || 0}</td>
                        <td>{player.volleyball_assists || 0}</td>
                        <td>{player.digs || 0}</td>
                        <td>{player.volleyball_blocks || 0}</td>
                        <td>{player.service_aces || 0}</td>
                        <td>{player.receptions || 0}</td>
                        <td>{player.serve_errors || 0}</td>
                        <td>{player.attack_errors || 0}</td>
                        <td>{player.reception_errors || 0}</td>
                        <td>{player.assist_errors || 0}</td>
                        <td>{player.blocking_errors || 0}</td>  {/* NEW */}
                        <td>{player.ball_handling_errors || 0}</td>  {/* NEW */}
                        <td className={getPerformanceColor(efficiency, 'eff')}>{efficiency}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Export data as CSV
  const exportToCSV = () => {
    if (playerStats.length === 0) return;
    
    const isBasketball = getCurrentSportType() === "basketball";
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (isBasketball) {
      csvContent += "Player,Team,Jersey,PTS,AST,REB,STL,BLK,3PM,Fouls,TO\n";
    } else {
      // UPDATED: Add new error columns
      csvContent += "Player,Team,Jersey,Kills,Assists,Digs,Blocks,Aces,Receptions,Service Errors,Attack Errors,Reception Errors,Assist Errors,Blocking Errors,Ball Handling Errors,Eff\n";
    }

    playerStats.forEach(player => {
      const jerseyNumber = player.jersey_number || player.jerseyNumber || "N/A";
      if (isBasketball) {
        csvContent += `${player.player_name},${player.team_name},${jerseyNumber},${player.points || 0},${player.assists || 0},${player.rebounds || 0},${player.steals || 0},${player.blocks || 0},${player.three_points_made || 0},${player.fouls || 0},${player.turnovers || 0}\n`;
      } else {
        const totalErrors = (player.serve_errors || 0) + 
                         (player.attack_errors || 0) + 
                         (player.reception_errors || 0) + 
                         (player.assist_errors || 0) +
                         (player.blocking_errors || 0) +  // NEW
                         (player.ball_handling_errors || 0);  // NEW
        const efficiency = (player.kills || 0) + 
                        (player.digs || 0) + 
                        (player.volleyball_blocks || 0) + 
                        (player.service_aces || 0) - 
                        totalErrors;
        csvContent += `${player.player_name},${player.team_name},${jerseyNumber},${player.kills || 0},${player.volleyball_assists || 0},${player.digs || 0},${player.volleyball_blocks || 0},${player.service_aces || 0},${player.receptions || 0},${player.serve_errors || 0},${player.attack_errors || 0},${player.reception_errors || 0},${player.assist_errors || 0},${player.blocking_errors || 0},${player.ball_handling_errors || 0},${efficiency}\n`;
      }
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `match_stats.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render sport-specific stats cards (removed View Mode card - now in parent)
  const renderStatsCards = () => {
    const sportType = getCurrentSportType();
    
    return (
      <div className="stats-cards-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        padding: '0 20px',
        marginBottom: '24px'
      }}>
        {/* Statistics Cards */}
        <div className="stats-card stats-card-primary">
          <div className="stats-card-header">
            <span className="stats-card-label">Total Players</span>
            <FaUsers className="stats-card-icon" />
          </div>
          <div className="stats-card-value">
            {eventStatistics.total_players || 0}
          </div>
          <div className="stats-card-subtext">
            Competing
          </div>
        </div>
        
        <div className="stats-card stats-card-success">
          <div className="stats-card-header">
            <span className="stats-card-label">
              {sportType === 'basketball' ? 'Avg PPG' : 'Avg Kills'}
            </span>
            <FaChartBar className="stats-card-icon" />
          </div>
          <div className="stats-card-value">
            {sportType === 'basketball' ? eventStatistics.avg_ppg : eventStatistics.avg_kills}
          </div>
          <div className="stats-card-subtext">
            {sportType === 'basketball' ? 'Points Per Game' : 'Kills Per Game'}
          </div>
        </div>
        
        <div className="stats-card stats-card-info">
          <div className="stats-card-header">
            <span className="stats-card-label">Total Games</span>
            <div className="stats-card-icon">🎯</div>
          </div>
          <div className="stats-card-value">
            {eventStatistics.total_games || 0}
          </div>
          <div className="stats-card-subtext">
            Matches Played
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`stats-admin-dashboard ${embedded ? 'stats-embedded' : ''}`}>
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        {!embedded && (
          <div className="dashboard-header">
            <div>
              <h1>Admin Statistics</h1>
              <p>View player statistics and match results</p>
            </div>
          </div>
        )}

        <div className="dashboard-main">
          <div className="bracket-content">
            {/* Quick Stats Cards - Show for ALL view modes when event and bracket are selected */}
            {selectedEvent && selectedBracket && (
              renderStatsCards()
            )}

            {/* Content based on statsViewMode */}
            <div className={`stats-tab-content stats-content-animate ${contentAnimation}`}>
              {/* Players View */}
              {statsViewMode === "players" && selectedEvent && selectedBracket && (
                <div className="stats-players-section">
                  <div className="stats-section-header">
                    <h2 className="stats-section-title">
                      Player Statistics
                    </h2>
                  </div>

                  {!selectedBracket ? (
                    <div className="stats-empty-state">
                      <p>Please select a bracket from the dropdown above to view player statistics.</p>
                    </div>
                  ) : loading ? (
                    <p className="stats-loading-text">Loading player statistics...</p>
                  ) : allPlayersData.length === 0 ? (
                    <div className="stats-empty-state">
                      <p>No player statistics available for this bracket.</p>
                    </div>
                  ) : (
                    renderAllPlayersTable()
                  )}
                </div>
              )}

              {/* Teams View */}
              {statsViewMode === "teams" && selectedEvent && selectedBracket && (
                <div className="stats-players-section">
                  <div className="stats-section-header">
                    <h2 className="stats-section-title">
                      Team Statistics
                    </h2>
                  </div>

                  {!selectedBracket ? (
                    <div className="stats-empty-state">
                      <p>Please select a bracket from the dropdown above to view team statistics.</p>
                    </div>
                  ) : loading ? (
                    <p className="stats-loading-text">Loading team statistics...</p>
                  ) : allTeamsData.length === 0 ? (
                    <div className="stats-empty-state">
                      <p>No team statistics available for this bracket.</p>
                    </div>
                  ) : (
                    renderAllTeamsTable()
                  )}
                </div>
              )}

              {/* Matches View */}
              {statsViewMode === "matches" && selectedEvent && selectedBracket && (
                <div className="stats-brackets-section">
                  <div className="stats-section-header" style={{
  marginBottom: '24px',
  padding: '0 20px',
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center'
}}>
  <div className="stats-selection-group" style={{ minWidth: '200px' }}>
    <select
      value={selectedRoundFilter}
      onChange={(e) => setSelectedRoundFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
      className="stats-selection-dropdown"
    >
      <option value="all">All Rounds</option>
      {[...new Set(matches.filter(m => m.team1_name && m.team2_name && m.team1_name !== 'TBD' && m.team2_name !== 'TBD').map(m => m.round_number))].sort((a, b) => a - b).map(round => (
        <option key={round} value={round}>
          {formatRoundDisplay({ round_number: round, bracket_type: matches.find(m => m.round_number === round)?.bracket_type })}
        </option>
      ))}
    </select>
  </div>
</div>
                  
                  {loading ? (
  <p className="stats-loading-text">Loading brackets and matches...</p>
) : matches.filter(m => m.team1_name && m.team2_name && m.team1_name !== 'TBD' && m.team2_name !== 'TBD').length === 0 ? (
  <div className="stats-empty-state">
    <p>No completed matches available for this bracket.</p>
  </div>
) : (
                    <div className="stats-brackets-list">
                      <div className="stats-bracket-section">
                        <div 
                          className="stats-bracket-header"
                          style={{
                            background: '#1a2332',
                            padding: '24px',
                            borderRadius: '12px',
                            marginBottom: '24px',
                            border: '1px solid rgba(148, 163, 184, 0.1)',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          <h3 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#f1f5f9',
                            marginBottom: '12px'
                          }}>
                            {selectedBracket.name}
                          </h3>
                          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{
                              padding: '6px 12px',
                              background: 'rgba(59, 130, 246, 0.2)',
                              borderRadius: '20px',
                              fontSize: '0.875rem',
                              color: '#93c5fd',
                              border: '1px solid rgba(59, 130, 246, 0.3)'
                            }}>
                              {selectedBracket.elimination_type === 'double' ? 'Double Elimination' : 'Single Elimination'}
                            </span>
                            <span style={{
                              padding: '6px 12px',
                              background: 'rgba(168, 85, 247, 0.2)',
                              borderRadius: '20px',
                              fontSize: '0.875rem',
                              color: '#d8b4fe',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                              textTransform: 'capitalize'
                            }}>
                              {selectedBracket.sport_type}
                            </span>
                            {bracketWinners[selectedBracket.id] && (
                              <div style={{
                                padding: '6px 12px',
                                background: 'rgba(34, 197, 94, 0.2)',
                                borderRadius: '20px',
                                fontSize: '0.875rem',
                                color: '#86efac',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                <FaTrophy style={{ color: '#fbbf24' }} /> Winner: {bracketWinners[selectedBracket.id]}
                              </div>
                            )}
                          </div>
                        </div>
          
                        {matches.filter(m => {
  const isValidMatch = m.team1_name && m.team2_name && m.team1_name !== 'TBD' && m.team2_name !== 'TBD';
  const matchesRound = selectedRoundFilter === 'all' || m.round_number === selectedRoundFilter;
  return isValidMatch && matchesRound;
}).length > 0 ? (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '20px',
    padding: '0 20px'
  }}>
    {matches.filter(m => {
      const isValidMatch = m.team1_name && m.team2_name && m.team1_name !== 'TBD' && m.team2_name !== 'TBD';
      const matchesRound = selectedRoundFilter === 'all' || m.round_number === selectedRoundFilter;
      return isValidMatch && matchesRound;
    }).map((match) => (
                              <div 
                                key={match.id}
                                onClick={() => handleMatchSelect(match)}
                                style={{
                                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                                  borderRadius: '12px',
                                  padding: '20px',
                                  border: '1px solid rgba(148, 163, 184, 0.2)',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  position: 'relative',
                                  overflow: 'hidden'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-4px)';
                                  e.currentTarget.style.boxShadow = '0 12px 24px -4px rgba(0, 0, 0, 0.5)';
                                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = 'none';
                                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)';
                                }}
                              >
                                {/* Round Badge */}
                                <div style={{
                                  position: 'absolute',
                                  top: '16px',
                                  left: '16px',
                                  background: 'rgba(59, 130, 246, 0.2)',
                                  padding: '6px 14px',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  color: '#93c5fd',
                                  border: '1px solid rgba(59, 130, 246, 0.3)'
                                }}>
                                  {formatRoundDisplay(match)}
                                </div>

                                {/* Teams Section */}
                                <div style={{ marginTop: '48px', marginBottom: '16px' }}>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    marginBottom: '12px',
                                    padding: '12px',
                                    background: match.winner_id === match.team1_id 
                                      ? 'rgba(34, 197, 94, 0.15)' 
                                      : 'rgba(51, 65, 85, 0.5)',
                                    borderRadius: '8px',
                                    border: match.winner_id === match.team1_id 
                                      ? '2px solid rgba(34, 197, 94, 0.4)' 
                                      : '1px solid rgba(71, 85, 105, 0.3)',
                                    transition: 'all 0.2s ease'
                                  }}>
                                    {match.winner_id === match.team1_id && (
                                      <FaTrophy style={{ color: '#fbbf24', fontSize: '1rem' }} />
                                    )}
                                    <span style={{
                                      flex: 1,
                                      fontSize: '1rem',
                                      fontWeight: match.winner_id === match.team1_id ? '600' : '500',
                                      color: match.winner_id === match.team1_id ? '#86efac' : '#cbd5e1'
                                    }}>
                                      {match.team1_name}
                                    </span>
                                    <span style={{
                                      fontSize: '1.25rem',
                                      fontWeight: '700',
                                      color: match.winner_id === match.team1_id ? '#86efac' : '#94a3b8',
                                      minWidth: '32px',
                                      textAlign: 'center'
                                    }}>
                                      {match.score_team1}
                                    </span>
                                  </div>

                                  <div style={{
                                    textAlign: 'center',
                                    margin: '8px 0',
                                    fontSize: '0.75rem',
                                    color: '#64748b',
                                    fontWeight: '600'
                                  }}>
                                    VS
                                  </div>

                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px',
                                    background: match.winner_id === match.team2_id 
                                      ? 'rgba(34, 197, 94, 0.15)' 
                                      : 'rgba(51, 65, 85, 0.5)',
                                    borderRadius: '8px',
                                    border: match.winner_id === match.team2_id 
                                      ? '2px solid rgba(34, 197, 94, 0.4)' 
                                      : '1px solid rgba(71, 85, 105, 0.3)',
                                    transition: 'all 0.2s ease'
                                  }}>
                                    {match.winner_id === match.team2_id && (
                                      <FaTrophy style={{ color: '#fbbf24', fontSize: '1rem' }} />
                                    )}
                                    <span style={{
                                      flex: 1,
                                      fontSize: '1rem',
                                      fontWeight: match.winner_id === match.team2_id ? '600' : '500',
                                      color: match.winner_id === match.team2_id ? '#86efac' : '#cbd5e1'
                                    }}>
                                      {match.team2_name}
                                    </span>
                                    <span style={{
                                      fontSize: '1.25rem',
                                      fontWeight: '700',
                                      color: match.winner_id === match.team2_id ? '#86efac' : '#94a3b8',
                                      minWidth: '32px',
                                      textAlign: 'center'
                                    }}>
                                      {match.score_team2}
                                    </span>
                                  </div>
                                </div>

                                {/* Action Button */}
                                <button
                                  style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    marginTop: '12px'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                                    e.currentTarget.style.transform = 'scale(1.02)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                  }}
                                >
                                  View Detailed Stats →
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="stats-no-matches">No matches available for the selected round.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Match Statistics View */}
              {statsViewMode === "matches" && activeTab === "statistics" && (
                <div className="stats-player-section">
                  <div className="stats-player-header">
                    {selectedMatch && (
                      <div className="stats-match-info">
                        <h2 className="stats-section-title">{selectedMatch.team1_name} vs {selectedMatch.team2_name}</h2>
                        <p className="stats-match-details">
                          {selectedEvent?.name} - {formatRoundDisplay(selectedMatch)}
                        </p>
                        <p className="stats-bracket-details">
                          <strong>Bracket:</strong> {selectedBracket?.name || selectedMatch.bracket_name} | 
                          <strong> Type:</strong> {selectedBracket?.elimination_type === 'double' ? 'Double Elimination' : 'Single Elimination'} |
                          <strong> Sport:</strong> {getCurrentSportType()}
                        </p>
                      </div>
                    )}
                  </div>

                  {loading ? (
                    <p className="stats-loading-text">Loading statistics...</p>
                  ) : (
                    renderMatchStatsTable()
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL COMPONENT - PLACED RIGHT BEFORE THE FINAL CLOSING DIV */}
      {isModalOpen && selectedMatchForModal && (
        <div className="stats-modal-overlay" onClick={handleCloseModal}>
          <div className="stats-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="stats-modal-header">
              <h2 className="stats-modal-title">
                {selectedMatchForModal.team1_name} vs {selectedMatchForModal.team2_name}
              </h2>
              <button className="stats-modal-close" onClick={handleCloseModal}>
                &times;
              </button>
            </div>
            <div className="stats-modal-body">
              <div className="stats-match-details" style={{ marginBottom: '20px', padding: '0 20px' }}>
                <p style={{ color: '#94a3b8', marginBottom: '8px' }}>
                  {selectedEvent?.name} - {formatRoundDisplay(selectedMatchForModal)}
                </p>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  <strong>Bracket:</strong> {selectedBracket?.name || selectedMatchForModal.bracket_name} | 
                  <strong> Type:</strong> {selectedBracket?.elimination_type === 'double' ? 'Double Elimination' : 'Single Elimination'} |
                  <strong> Sport:</strong> {getCurrentSportType()}
                </p>
              </div>
              
              {loading ? (
                <p className="stats-loading-text">Loading statistics...</p>
              ) : (
                renderMatchStatsTable()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStats;