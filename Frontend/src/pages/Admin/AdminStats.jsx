import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaFilter, FaDownload, FaTrophy, FaArrowLeft, FaUsers, FaChartBar } from "react-icons/fa";
import "../../style/Admin_Stats.css";

const AdminStats = ({ sidebarOpen, preselectedEvent, preselectedBracket, embedded = false }) => {
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
  
  // Updated states for view modes
  const [viewMode, setViewMode] = useState("allPlayers");
  const [sortConfig, setSortConfig] = useState({ key: 'overall_score', direction: 'desc' });

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
    avg_kpg: 0,
    avg_dpg: 0,
    avg_hitting_percentage: 0
  });

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

  // Fetch events only if no preselected event
  useEffect(() => {
    const fetchEvents = async () => {
      if (preselectedEvent) return; // Skip if we have a preselected event
      
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
        avg_kpg: 0,
        avg_dpg: 0,
        avg_hitting_percentage: 0
      });
    }
  };

  // Handle event selection
  const handleEventSelect = async (event) => {
    setSelectedEvent(event);
    setSelectedBracket(null);
    setLoading(true);
    setCurrentPage(1);
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
        avg_kpg: 0,
        avg_dpg: 0,
        avg_hitting_percentage: 0
      });
      setAllPlayersData([]);
      setAllTeamsData([]);
      
      if (viewMode === "allPlayers") {
        setActiveTab("players");
      } else if (viewMode === "teams") {
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
      
      if (viewMode === "allPlayers") {
        setActiveTab("players");
      } else if (viewMode === "teams") {
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
    try {
      // Load data based on current view mode
      if (viewMode === "allPlayers") {
        await loadAllPlayersData(selectedEvent.id, bracket.id);
      } else if (viewMode === "teams") {
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
        avg_kpg: 0,
        avg_dpg: 0,
        avg_hitting_percentage: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // FIX: Automatically reload data when viewMode changes and a bracket is selected
  useEffect(() => {
    const reloadDataForViewMode = async () => {
      if (selectedEvent && selectedBracket) {
        setLoading(true);
        try {
          if (viewMode === "allPlayers") {
            await loadAllPlayersData(selectedEvent.id, selectedBracket.id);
            setActiveTab("players");
          } else if (viewMode === "teams") {
            await loadAllTeamsData(selectedEvent.id, selectedBracket.id);
            setActiveTab("teams");
          } else {
            setActiveTab("brackets");
          }
          
          await loadEventStatistics(selectedEvent.id, selectedBracket.id);
        } catch (err) {
          console.error("Error reloading data for view mode:", err);
        } finally {
          setLoading(false);
        }
      } else if (selectedEvent) {
        // If no bracket selected but event is selected, update the active tab
        if (viewMode === "allPlayers") {
          setActiveTab("players");
        } else if (viewMode === "teams") {
          setActiveTab("teams");
        } else {
          setActiveTab("brackets");
        }
      }
    };

    reloadDataForViewMode();
  }, [viewMode, selectedEvent, selectedBracket]);

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
    setSelectedMatch(match);
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
      setActiveTab("statistics");
    } catch (err) {
      console.error("Error fetching player stats:", err);
      setPlayerStats([]);
    } finally {
      setLoading(false);
    }
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
        fg: { high: 50, low: 40 },
        overall_score: { high: 30, low: 15 }
      };
      
      const threshold = thresholds[stat];
      if (!threshold) return 'text-gray-300';
      
      if (value >= threshold.high) return 'stats-high-value';
      if (value <= threshold.low) return 'stats-low-value';
      return 'stats-medium-value';
    } else {
      // Volleyball thresholds
      const thresholds = {
        kpg: { high: 15, low: 8 },
        apg: { high: 10, low: 5 },
        dpg: { high: 12, low: 6 },
        bpg: { high: 3, low: 1 },
        hitting_percentage: { high: 40, low: 20 },
        overall_score: { high: 25, low: 12 }
      };
      
      const threshold = thresholds[stat];
      if (!threshold) return 'text-gray-300';
      
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
      headers = ['Rank', 'Player', 'Team', 'Jersey', 'Games Played', 'Overall Score', 'PPG', 'RPG', 'APG', 'BPG', 'FG%', 'Total Points', 'Total Assists', 'Total Rebounds'];
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
        player.fg,
        player.total_points,
        player.total_assists,
        player.total_rebounds
      ]);
    } else {
      // Volleyball
      headers = ['Rank', 'Player', 'Team', 'Jersey', 'Games Played', 'Overall Score', 'KPG', 'APG', 'DPG', 'BPG', 'SAPG', 'Hit%', 'Total Kills', 'Total Assists', 'Total Digs'];
      rows = filteredPlayers.map((player, index) => [
        index + 1,
        player.name,
        player.team_name,
        player.jersey_number,
        player.games_played,
        player.overall_score || 0,
        player.kpg,
        player.apg,
        player.dpg,
        player.bpg,
        player.sapg,
        player.hitting_percentage,
        player.total_kills,
        player.total_volleyball_assists,
        player.total_digs
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
      headers = ['Rank', 'Team', 'Games Played', 'Overall Score', 'PPG', 'RPG', 'APG', 'BPG', 'FG%', 'Total Points', 'Total Assists', 'Total Rebounds'];
      rows = filteredTeams.map((team, index) => [
        index + 1,
        team.team_name,
        team.games_played,
        team.overall_score || 0,
        team.ppg,
        team.rpg,
        team.apg,
        team.bpg,
        team.fg,
        team.total_points,
        team.total_assists,
        team.total_rebounds
      ]);
    } else {
      // Volleyball
      headers = ['Rank', 'Team', 'Games Played', 'Overall Score', 'KPG', 'APG', 'DPG', 'BPG', 'SAPG', 'Hit%', 'Total Kills', 'Total Assists', 'Total Digs'];
      rows = filteredTeams.map((team, index) => [
        index + 1,
        team.team_name,
        team.games_played,
        team.overall_score || 0,
        team.kpg,
        team.apg,
        team.dpg,
        team.bpg,
        team.sapg,
        team.hitting_percentage,
        team.total_kills,
        team.total_volleyball_assists,
        team.total_digs
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
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('fg')}
        >
          FG% {sortConfig.key === 'fg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
      </>
    );
  };

  // Render Volleyball Players Table Headers
  const renderVolleyballPlayerHeaders = () => {
    return (
      <>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('kpg')}
        >
          KPG {sortConfig.key === 'kpg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('apg')}
        >
          APG {sortConfig.key === 'apg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('dpg')}
        >
          DPG {sortConfig.key === 'dpg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('bpg')}
        >
          BPG {sortConfig.key === 'bpg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('sapg')}
        >
          SAPG {sortConfig.key === 'sapg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('hitting_percentage')}
        >
          Hit% {sortConfig.key === 'hitting_percentage' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
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
        <td className="stats-player-name">{player.name}</td>
        <td className="stats-team-name">{player.team_name}</td>
        <td className="stats-jersey-number">{player.jersey_number}</td>
        <td className="stats-games-played">{player.games_played}</td>
        <td className={getPerformanceColor(player.overall_score, 'overall_score')}>
          {player.overall_score || 0}
        </td>
        <td className={getPerformanceColor(player.ppg, 'ppg')}>{player.ppg}</td>
        <td className={getPerformanceColor(player.rpg, 'rpg')}>{player.rpg}</td>
        <td className={getPerformanceColor(player.apg, 'apg')}>{player.apg}</td>
        <td className="stats-bpg">{player.bpg}</td>
        <td className={getPerformanceColor(player.fg, 'fg')}>{player.fg}%</td>
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
        <td className="stats-player-name">{player.name}</td>
        <td className="stats-team-name">{player.team_name}</td>
        <td className="stats-jersey-number">{player.jersey_number}</td>
        <td className="stats-games-played">{player.games_played}</td>
        <td className={getPerformanceColor(player.overall_score, 'overall_score')}>
          {player.overall_score || 0}
        </td>
        <td className={getPerformanceColor(player.kpg, 'kpg')}>{player.kpg}</td>
        <td className={getPerformanceColor(player.apg, 'apg')}>{player.apg}</td>
        <td className={getPerformanceColor(player.dpg, 'dpg')}>{player.dpg}</td>
        <td className="stats-bpg">{player.bpg}</td>
        <td className="stats-sapg">{player.sapg}</td>
        <td className={getPerformanceColor(player.hitting_percentage, 'hitting_percentage')}>
          {player.hitting_percentage}%
        </td>
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
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('fg')}
        >
          FG% {sortConfig.key === 'fg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
      </>
    );
  };

  // Render Volleyball Teams Table Headers
  const renderVolleyballTeamHeaders = () => {
    return (
      <>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('kpg')}
        >
          KPG {sortConfig.key === 'kpg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('apg')}
        >
          APG {sortConfig.key === 'apg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('dpg')}
        >
          DPG {sortConfig.key === 'dpg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('bpg')}
        >
          BPG {sortConfig.key === 'bpg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('sapg')}
        >
          SAPG {sortConfig.key === 'sapg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
        </th>
        <th 
          className="stats-sortable-header"
          onClick={() => handleSort('hitting_percentage')}
        >
          Hit% {sortConfig.key === 'hitting_percentage' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
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
        <td className="stats-team-name">{team.team_name}</td>
        <td className="stats-games-played">{team.games_played}</td>
        <td className={getPerformanceColor(team.overall_score, 'overall_score')}>
          {team.overall_score || 0}
        </td>
        <td className={getPerformanceColor(team.ppg, 'ppg')}>{team.ppg}</td>
        <td className={getPerformanceColor(team.rpg, 'rpg')}>{team.rpg}</td>
        <td className={getPerformanceColor(team.apg, 'apg')}>{team.apg}</td>
        <td className="stats-bpg">{team.bpg}</td>
        <td className={getPerformanceColor(team.fg, 'fg')}>{team.fg}%</td>
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
        <td className="stats-team-name">{team.team_name}</td>
        <td className="stats-games-played">{team.games_played}</td>
        <td className={getPerformanceColor(team.overall_score, 'overall_score')}>
          {team.overall_score || 0}
        </td>
        <td className={getPerformanceColor(team.kpg, 'kpg')}>{team.kpg}</td>
        <td className={getPerformanceColor(team.apg, 'apg')}>{team.apg}</td>
        <td className={getPerformanceColor(team.dpg, 'dpg')}>{team.dpg}</td>
        <td className="stats-bpg">{team.bpg}</td>
        <td className="stats-sapg">{team.sapg}</td>
        <td className={getPerformanceColor(team.hitting_percentage, 'hitting_percentage')}>
          {team.hitting_percentage}%
        </td>
      </tr>
    ));
  };

  // Render All Players Statistics Table
  const renderAllPlayersTable = () => {
    const sportType = getCurrentSportType();
    
    return (
      <div className="stats-table-container">
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
      <div className="stats-table-container">
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
                    <th>Serve Err</th>
                    <th>Att Err</th>
                    <th>Rec Err</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredPlayerStats.map((player) => {
                const jerseyNumber = player.jersey_number || player.jerseyNumber || "N/A";
                
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
                        <td>{player.blocks || 0}</td>
                        <td>{player.service_aces || 0}</td>
                        <td>{player.serve_errors || 0}</td>
                        <td>{player.attack_errors || 0}</td>
                        <td>{player.reception_errors || 0}</td>
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
      csvContent += "Player,Team,Jersey,Kills,Assists,Digs,Blocks,Aces,Serve Err,Att Err,Rec Err\n";
    }
    
    playerStats.forEach(player => {
      const jerseyNumber = player.jersey_number || player.jerseyNumber || "N/A";
      if (isBasketball) {
        csvContent += `${player.player_name},${player.team_name},${jerseyNumber},${player.points || 0},${player.assists || 0},${player.rebounds || 0},${player.steals || 0},${player.blocks || 0},${player.three_points_made || 0},${player.fouls || 0},${player.turnovers || 0}\n`;
      } else {
        csvContent += `${player.player_name},${player.team_name},${jerseyNumber},${player.kills || 0},${player.volleyball_assists || 0},${player.digs || 0},${player.blocks || 0},${player.service_aces || 0},${player.serve_errors || 0},${player.attack_errors || 0},${player.reception_errors || 0}\n`;
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

  // Render sport-specific stats cards with View Mode dropdown integrated
  const renderStatsCards = () => {
    const sportType = getCurrentSportType();
    
    return (
      <div className="stats-cards-grid">
        {/* View Mode Card - First in the grid */}
        <div className="stats-card stats-view-mode-card">
          <div className="stats-card-header">
            <span className="stats-card-label">View Mode</span>
            <FaChartBar className="stats-card-icon" />
          </div>
          <select 
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="stats-view-mode-select"
          >
            <option value="allPlayers">All Players Statistics</option>
            <option value="teams">Team Statistics</option>
            <option value="match">Match-by-Match View</option>
          </select>
          <div className="stats-card-subtext">
            Change data view
          </div>
        </div>
        
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
              {sportType === 'basketball' ? 'Avg PPG' : 'Avg KPG'}
            </span>
            <FaChartBar className="stats-card-icon" />
          </div>
          <div className="stats-card-value">
            {sportType === 'basketball' ? eventStatistics.avg_ppg : eventStatistics.avg_kpg}
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
    <div className="stats-admin-dashboard">
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

            {/* Tabs Navigation */}
            <div className="stats-tabs-navigation">
              {viewMode === "allPlayers" && selectedEvent && selectedBracket && (
                <button
                  className={`stats-tab-btn ${activeTab === "players" ? "stats-tab-active" : ""}`}
                  onClick={() => setActiveTab("players")}
                >
                  All Players Statistics
                </button>
              )}
              {viewMode === "teams" && selectedEvent && selectedBracket && (
                <button
                  className={`stats-tab-btn ${activeTab === "teams" ? "stats-tab-active" : ""}`}
                  onClick={() => setActiveTab("teams")}
                >
                  Team Statistics
                </button>
              )}
              {viewMode === "match" && selectedEvent && selectedBracket && (
                <button
                  className={`stats-tab-btn ${activeTab === "brackets" ? "stats-tab-active" : ""}`}
                  onClick={() => setActiveTab("brackets")}
                >
                  Brackets & Matches
                </button>
              )}
              {playerStats.length > 0 && viewMode === "match" && (
                <button
                  className={`stats-tab-btn ${activeTab === "statistics" ? "stats-tab-active" : ""}`}
                  onClick={() => setActiveTab("statistics")}
                >
                  Match Statistics
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="stats-tab-content">
              {/* All Players Statistics Tab */}
              {activeTab === "players" && viewMode === "allPlayers" && (
                <div className="stats-players-section">
                  <div className="stats-section-header">
                    <h2 className="stats-section-title">
                      Player Statistics
                    </h2>
                    <p className="stats-section-subtitle">
                      {selectedBracket 
                        ? `Showing players ranked by performance in ${selectedBracket.name} (${getCurrentSportType()})`
                        : 'Please select a bracket to view player statistics'
                      }
                    </p>
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

              {/* Team Statistics Tab */}
              {activeTab === "teams" && viewMode === "teams" && (
                <div className="stats-players-section">
                  <div className="stats-section-header">
                    <h2 className="stats-section-title">
                      Team Statistics
                    </h2>
                    <p className="stats-section-subtitle">
                      {selectedBracket 
                        ? `Showing teams ranked by overall performance in ${selectedBracket.name} (${getCurrentSportType()})`
                        : 'Please select a bracket to view team statistics'
                      }
                    </p>
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

              {/* Brackets & Matches Tab */}
              {activeTab === "brackets" && viewMode === "match" && selectedEvent && selectedBracket && (
                <div className="stats-brackets-section">
                  {loading ? (
                    <p className="stats-loading-text">Loading brackets and matches...</p>
                  ) : matches.length === 0 ? (
                    <div className="stats-empty-state">
                      <p>No matches available for this bracket.</p>
                    </div>
                  ) : (
                    <div className="stats-brackets-list">
                      <div className="stats-bracket-section">
                        <div className="stats-bracket-header">
                          <h3>
                            {selectedBracket.name} - {selectedBracket.elimination_type === 'double' ? 'Double Elimination' : 'Single Elimination'} ({selectedBracket.sport_type})
                          </h3>
                          {bracketWinners[selectedBracket.id] && (
                            <div className="stats-bracket-winner">
                              <FaTrophy /> Winner: {bracketWinners[selectedBracket.id]}
                            </div>
                          )}
                        </div>
                        
                        {matches.length > 0 ? (
                          <div className="stats-matches-grid">
                            {matches.map((match) => (
                              <div 
                                key={match.id} 
                                className="stats-match-card"
                                onClick={() => handleMatchSelect(match)}
                              >
                                <div className="stats-match-teams">
                                  <div className={`stats-match-team ${match.winner_id === match.team1_id ? "stats-match-winner" : ""}`}>
                                    {match.team1_name}
                                  </div>
                                  <div className="stats-match-vs">vs</div>
                                  <div className={`stats-match-team ${match.winner_id === match.team2_id ? "stats-match-winner" : ""}`}>
                                    {match.team2_name}
                                  </div>
                                </div>
                                <div className="stats-match-score">
                                  {match.score_team1} - {match.score_team2}
                                </div>
                                <div className="stats-match-info">
                                  <span>{formatRoundDisplay(match)}</span>
                                  {match.winner_name && (
                                    <span className="stats-match-winner-tag">
                                      Winner: {match.winner_name}
                                    </span>
                                  )}
                                </div>
                                <div className="stats-match-actions">
                                  <button className="stats-view-btn">
                                    View Stats
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="stats-no-matches">No matches available for this bracket.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Match Statistics Tab */}
              {activeTab === "statistics" && viewMode === "match" && (
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
    </div>
  );
};

export default AdminStats;