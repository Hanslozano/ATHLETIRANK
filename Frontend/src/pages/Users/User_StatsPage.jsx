import React, { useState, useEffect } from "react";
import { FaSearch, FaUsers, FaChartLine, FaTrophy, FaArrowLeft, FaChartBar, FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import '../../style/User_StatsPage.css'

const UserStatsPage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedBracket, setSelectedBracket] = useState(null);
  const [brackets, setBrackets] = useState([]);
  const [standings, setStandings] = useState([]);
  const [allPlayersData, setAllPlayersData] = useState([]);
  const [allTeamsData, setAllTeamsData] = useState([]);
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("events");
  const [viewMode, setViewMode] = useState("standings");
  const [sortConfig, setSortConfig] = useState({ key: 'overall_score', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Event filters
  const [eventSearchTerm, setEventSearchTerm] = useState("");
  const [sportFilter, setSportFilter] = useState("all");

  // Recent matches state
  const [recentMatches, setRecentMatches] = useState([]);
  const [recentTournament, setRecentTournament] = useState(null);
  const [recentBrackets, setRecentBrackets] = useState([]);
  const [selectedRecentBracket, setSelectedRecentBracket] = useState(null);

  // Fix for the flash error - initialize state properly
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasVolleyballData, setHasVolleyballData] = useState(true);

  const getCurrentSportType = () => {
    return selectedBracket?.sport_type || eventStatistics.sport_type || 'basketball';
  };

  useEffect(() => {
    fetchEvents();
    fetchRecentMatches();
    setIsInitialized(true);
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Fetch ongoing events
      const ongoingRes = await fetch("http://localhost:5000/api/events");
      const ongoingData = await ongoingRes.json();
      
      // Fetch completed events
      const completedRes = await fetch("http://localhost:5000/api/awards/events/completed");
      const completedData = await completedRes.json();
      
      // Combine both ongoing and completed events
      const allEvents = [...ongoingData, ...completedData];
      
      // Remove duplicates based on event ID
      const uniqueEvents = allEvents.filter((event, index, self) => 
        index === self.findIndex(e => e.id === event.id)
      );
      
      // Sort by creation date (most recent first)
      const sortedEvents = uniqueEvents.sort((a, b) => {
        const dateA = new Date(a.created_at || a.id);
        const dateB = new Date(b.created_at || b.id);
        return dateB - dateA;
      });

      // Fetch brackets for each event
      const eventsWithBrackets = await Promise.all(
        sortedEvents.map(async (event) => {
          try {
            // Try to fetch brackets from events endpoint first
            let bracketsRes;
            try {
              bracketsRes = await fetch(`http://localhost:5000/api/events/${event.id}/brackets`);
            } catch (err) {
              // Fallback to completed brackets endpoint
              bracketsRes = await fetch(`http://localhost:5000/api/awards/events/${event.id}/completed-brackets`);
            }
            
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
      setError("Failed to load events");
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recent matches for the top containers
  const fetchRecentMatches = async () => {
    try {
      // Get the most recently created event (ongoing or completed)
      const ongoingRes = await fetch("http://localhost:5000/api/events");
      const ongoingData = await ongoingRes.json();
      
      const completedRes = await fetch("http://localhost:5000/api/awards/events/completed");
      const completedData = await completedRes.json();
      
      const allEvents = [...ongoingData, ...completedData];
      
      if (allEvents.length > 0) {
        // Sort by creation date to get the most recent
        const sortedEvents = allEvents.sort((a, b) => {
          const dateA = new Date(a.created_at || a.id);
          const dateB = new Date(b.created_at || b.id);
          return dateB - dateA;
        });
        
        const recentEvent = sortedEvents[0];
        setRecentTournament(recentEvent);
        
        // Fetch brackets for this event
        let brackets;
        try {
          const bracketsRes = await fetch(`http://localhost:5000/api/events/${recentEvent.id}/brackets`);
          brackets = await bracketsRes.json();
        } catch (err) {
          const bracketsRes = await fetch(`http://localhost:5000/api/awards/events/${recentEvent.id}/completed-brackets`);
          brackets = await bracketsRes.json();
        }
        
        setRecentBrackets(brackets || []);
        
        if (brackets && brackets.length > 0) {
          setSelectedRecentBracket(brackets[0]);
          await loadRecentBracketData(recentEvent, brackets[0]);
        }
      } else {
        console.log("No events found for recent tournament");
      }
    } catch (err) {
      console.error("Error fetching recent matches:", err);
    }
  };

  const loadRecentBracketData = async (event, bracket) => {
    try {
      // Clear previous data
      setStandings([]);
      setAllPlayersData([]);
      setAllTeamsData([]);

      // Load standings
      await loadStandingsData(bracket.id);
      
      // Load players data
      await loadRecentPlayersData(event.id, bracket.id);
      
      // Load teams data
      await loadRecentTeamsData(event.id, bracket.id);
    } catch (err) {
      console.error("Error loading recent bracket data:", err);
    }
  };

  const loadStandingsData = async (bracketId) => {
    try {
      console.log(`Loading standings for bracket ${bracketId}`);
      const standingsRes = await fetch(`http://localhost:5000/api/awards/brackets/${bracketId}/standings`);
      
      if (!standingsRes.ok) {
        if (standingsRes.status === 500) {
          console.warn(`Server error (500) loading standings for bracket ${bracketId}. This might be a volleyball standings issue.`);
          setStandings([]);
          setHasVolleyballData(false);
          return;
        }
        throw new Error(`HTTP ${standingsRes.status}: ${standingsRes.statusText}`);
      }
      
      const standingsData = await standingsRes.json();
      console.log(`Standings data received for bracket ${bracketId}:`, standingsData);
      
      if (standingsData.standings && Array.isArray(standingsData.standings)) {
        // Validate and clean up the standings data
        const validatedStandings = standingsData.standings.map((team, index) => ({
          position: team.position || index + 1,
          team: team.team || 'Unknown Team',
          wins: team.wins || 0,
          losses: team.losses || 0,
          points_for: team.points_for || 0,
          points_against: team.points_against || 0,
          point_diff: team.point_diff || 0,
          sets_for: team.sets_for || 0,
          sets_against: team.sets_against || 0,
          set_ratio: team.set_ratio || 0,
          win_percentage: team.win_percentage || '0.0%'
        }));
        
        setStandings(validatedStandings);
        setHasVolleyballData(true);
      } else {
        console.warn(`No standings array in response for bracket ${bracketId}`);
        setStandings([]);
        setHasVolleyballData(false);
      }
    } catch (err) {
      console.error(`Error loading standings for bracket ${bracketId}:`, err);
      setStandings([]);
      setHasVolleyballData(false);
    }
  };

  const loadRecentPlayersData = async (eventId, bracketId = null) => {
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
      console.error("Error fetching recent players data:", err);
    }
  };

  const loadRecentTeamsData = async (eventId, bracketId = null) => {
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
      console.error("Error fetching recent teams data:", err);
    }
  };

  const handleEventSelect = async (event, bracket = null) => {
    setSelectedEvent(event);
    setBrackets(event.brackets || []);
    
    // Clear recent data when a specific event is selected
    setStandings([]);
    setAllPlayersData([]);
    setAllTeamsData([]);
    
    // Use the provided bracket if available, otherwise use the first bracket
    const targetBracket = bracket || (event.brackets && event.brackets.length > 0 ? event.brackets[0] : null);
    
    if (targetBracket) {
      setSelectedBracket(targetBracket);
      await loadBracketData(event, targetBracket);
    } else {
      setSelectedBracket(null);
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
    
    setActiveTab("results");
    setViewMode("standings");
  };

  const handleBracketChange = async (bracketId) => {
    const bracket = brackets.find(b => b.id === bracketId);
    if (bracket) {
      setSelectedBracket(bracket);
      await loadBracketData(selectedEvent, bracket);
    }
  };

  const loadBracketData = async (event, bracket) => {
    setLoading(true);
    setError(null);

    try {
      // Clear any existing data
      setStandings([]);
      setAllPlayersData([]);
      setAllTeamsData([]);

      // Load standings
      await loadStandingsData(bracket.id);

      // Load event statistics
      await loadEventStatistics(event.id, bracket.id);
      
      // Load players data
      await loadAllPlayersData(event.id, bracket.id);
      
      // Load teams data
      await loadAllTeamsData(event.id, bracket.id);
    } catch (err) {
      setError("Failed to load data: " + err.message);
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleBackToHome = () => {
    navigate("/");
  };

  const handleBackToEvents = () => {
    setSelectedEvent(null);
    setSelectedBracket(null);
    setBrackets([]);
    setActiveTab("events");
    setViewMode("standings");
    setSearchTerm("");
    setCurrentPage(1);
    
    // Reload recent matches when going back to events
    fetchRecentMatches();
  };

  const handleSort = (key) => {
    let direction = 'desc';
    
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'desc' ? 'asc' : 'desc';
    }
    
    setSortConfig({ key, direction });
  };

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
      if (!threshold) return '';
      
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
        total_errors: { high: 20, low: 8 },
        eff: { high: 80, low: 30 },
        overall_score: { high: 25, low: 12 },
        total_receptions: { high: 80, low: 30 },
        service_errors: { high: 8, low: 2 },
        attack_errors: { high: 15, low: 5 },
        reception_errors: { high: 12, low: 3 }
      };
      
      const threshold = thresholds[stat];
      if (!threshold) return '';
      
      if (stat === 'total_errors' || stat === 'service_errors' || stat === 'attack_errors' || stat === 'reception_errors') {
        if (value <= threshold.low) return 'stats-high-value';
        if (value >= threshold.high) return 'stats-low-value';
        return 'stats-medium-value';
      }
      
      if (value >= threshold.high) return 'stats-high-value';
      if (value <= threshold.low) return 'stats-low-value';
      return 'stats-medium-value';
    }
  };

  // Filter and sort players
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
    (player.name && player.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (player.team_name && player.team_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (player.jersey_number && player.jersey_number.toString().includes(searchTerm))
  );

  // Filter and sort teams
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
    team.team_name && team.team_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStandings = standings.filter(team =>
    team.team && team.team.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter events
  const getFilteredEvents = () => {
    return events.filter(event => {
      const matchesSearch = event.name && event.name.toLowerCase().includes(eventSearchTerm.toLowerCase());
      let matchesSport = sportFilter === "all";
      if (!matchesSport && event.brackets) {
        matchesSport = event.brackets.some(bracket => 
          bracket.sport_type === sportFilter
        );
      }
      return matchesSearch && matchesSport;
    });
  };

  const filteredEvents = getFilteredEvents();

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPlayers = filteredPlayers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPagesPlayers = Math.ceil(filteredPlayers.length / itemsPerPage);
  const currentTeams = filteredTeams.slice(indexOfFirstItem, indexOfLastItem);
  const totalPagesTeams = Math.ceil(filteredTeams.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage, viewMode]);

  // Render Volleyball Player Headers with additional stats
  const renderVolleyballPlayerHeaders = () => (
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
      <th className="stats-sortable-header" onClick={() => handleSort('total_errors')}>
        Total Errors {sortConfig.key === 'total_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('total_receptions')}>
        Total Receptions {sortConfig.key === 'total_receptions' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('service_errors')}>
        Service Errors {sortConfig.key === 'service_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('attack_errors')}>
        Attack Errors {sortConfig.key === 'attack_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('reception_errors')}>
        Reception Errors {sortConfig.key === 'reception_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('eff')}>
        Efficiency {sortConfig.key === 'eff' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
    </>
  );

  // Render Volleyball Team Headers with additional stats
  const renderVolleyballTeamHeaders = () => (
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
      <th className="stats-sortable-header" onClick={() => handleSort('total_errors')}>
        Total Errors {sortConfig.key === 'total_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('total_receptions')}>
        Total Receptions {sortConfig.key === 'total_receptions' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('service_errors')}>
        Service Errors {sortConfig.key === 'service_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('attack_errors')}>
        Attack Errors {sortConfig.key === 'attack_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('reception_errors')}>
        Reception Errors {sortConfig.key === 'reception_errors' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('eff')}>
        Efficiency {sortConfig.key === 'eff' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
    </>
  );

  // Render Basketball Headers
  const renderBasketballPlayerHeaders = () => (
    <>
      <th className="stats-sortable-header" onClick={() => handleSort('ppg')}>
        PPG {sortConfig.key === 'ppg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('rpg')}>
        RPG {sortConfig.key === 'rpg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('apg')}>
        APG {sortConfig.key === 'apg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('bpg')}>
        BPG {sortConfig.key === 'bpg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
    </>
  );

  const renderBasketballTeamHeaders = () => (
    <>
      <th className="stats-sortable-header" onClick={() => handleSort('ppg')}>
        PPG {sortConfig.key === 'ppg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('rpg')}>
        RPG {sortConfig.key === 'rpg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('apg')}>
        APG {sortConfig.key === 'apg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
      <th className="stats-sortable-header" onClick={() => handleSort('bpg')}>
        BPG {sortConfig.key === 'bpg' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
      </th>
    </>
  );

  // Render recent tournament containers
  const renderRecentTournamentContainers = () => {
    // Don't show recent containers when a specific event is selected
    if (selectedEvent) return null;

    if (!recentTournament) {
      return (
        <div className="recent-tournament-section">
          <h2>Recent Tournament</h2>
          <div className="empty-state">
            <p>No recent tournaments available.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="recent-tournament-section">
        <h2>Recent Tournament</h2>
        
        {/* Container 1: Tournament Name and Bracket Selector */}
        <div className="recent-container container-1">
          <div className="container-header">
            <h3>Tournament Overview</h3>
          </div>
          <div className="container-content">
            <div className="tournament-info">
              <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="info-label">Tournament Name:</span>
                  <span className="info-value">{recentTournament.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="info-label">Select Bracket:</span>
                  <select 
                    value={selectedRecentBracket?.id || ''}
                    onChange={(e) => {
                      const bracketId = parseInt(e.target.value);
                      const bracket = recentBrackets.find(b => b.id === bracketId);
                      if (bracket) {
                        setSelectedRecentBracket(bracket);
                        loadRecentBracketData(recentTournament, bracket);
                      }
                    }}
                    className="bracket-select"
                    style={{ margin: 0 }}
                  >
                    {recentBrackets.map(bracket => (
                      <option key={bracket.id} value={bracket.id}>
                        {bracket.name} ({bracket.sport_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Container 2: Team Standing */}
        <div className="recent-container container-2">
          <div className="container-header">
            <h3>Team Standing</h3>
            {selectedRecentBracket?.sport_type === 'volleyball' && !hasVolleyballData && (
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px', fontStyle: 'italic' }}>
                Volleyball standings are not available for this tournament
              </div>
            )}
          </div>
          <div className="container-content">
            {selectedRecentBracket?.sport_type === 'volleyball' && !hasVolleyballData ? (
              <div className="empty-state">
                <p>Volleyball standings data is not available.</p>
                <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                  This is expected for volleyball tournaments - player and team statistics are still available.
                </p>
              </div>
            ) : (
              <>
                <div className="stats-table-container">
                  <table className="stats-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Team</th>
                        <th>W</th>
                        <th>L</th>
                        {selectedRecentBracket?.sport_type === "basketball" ? (
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
                      {standings.slice(0, 10).map((team, index) => (
                        <tr key={index} className={team.position <= 3 ? `awards_standings_podium_${team.position}` : ""}>
                          <td className="stats-rank-cell">
                            <div className={`stats-rank-badge ${
                              team.position === 1 ? 'stats-rank-1' : 
                              team.position === 2 ? 'stats-rank-2' :
                              team.position === 3 ? 'stats-rank-3' : 'stats-rank-other'
                            }`}>
                              {team.position === 1 && <span className="awards_standings_medal">🥇</span>}
                              {team.position === 2 && <span className="awards_standings_medal">🥈</span>}
                              {team.position === 3 && <span className="awards_standings_medal">🥉</span>}
                              {team.position > 3 && (team.position || index + 1)}
                            </div>
                          </td>
                          <td className="stats-team-name">
                            <strong>{team.team || 'Unknown Team'}</strong>
                          </td>
                          <td>{team.wins || 0}</td>
                          <td>{team.losses || 0}</td>
                          {selectedRecentBracket?.sport_type === "basketball" ? (
                            <>
                              <td>{team.points_for || 0}</td>
                              <td>{team.points_against || 0}</td>
                              <td className={String(team.point_diff || 0).startsWith('+') ? 'stats-high-value' : String(team.point_diff || 0).startsWith('-') ? 'stats-low-value' : ''}>
                                {team.point_diff || 0}
                              </td>
                            </>
                          ) : (
                            <>
                              <td>{team.sets_for || 0}</td>
                              <td>{team.sets_against || 0}</td>
                              <td>{team.set_ratio || 0}</td>
                            </>
                          )}
                          <td>{team.win_percentage || '0.0%'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {standings.length === 0 && (
                  <div className="empty-state">
                    <p>No standings data available.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Container 3: Player Stats */}
        <div className="recent-container container-3">
          <div className="container-header">
            <h3>Player Stats</h3>
          </div>
          <div className="container-content">
            <div className="stats-table-container">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Team</th>
                    <th>Jersey</th>
                    <th>GP</th>
                    <th>Overall</th>
                    {selectedRecentBracket?.sport_type === 'basketball' ? (
                      <>
                        <th>PPG</th>
                        <th>RPG</th>
                        <th>APG</th>
                        <th>BPG</th>
                      </>
                    ) : (
                      <>
                        <th>Kills</th>
                        <th>Assists</th>
                        <th>Digs</th>
                        <th>Blocks</th>
                        <th>Aces</th>
                        <th>Errors</th>
                        <th>Receptions</th>
                        <th>Svc Errors</th>
                        <th>Att Errors</th>
                        <th>Rec Errors</th>
                        <th>Eff</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {allPlayersData.slice(0, 10).map((player, index) => (
                    <tr key={player.id || index} className="stats-player-row">
                      <td className="stats-rank-cell">
                        <div className={`stats-rank-badge ${
                          index === 0 ? 'stats-rank-1' : 
                          index === 1 ? 'stats-rank-2' :
                          index === 2 ? 'stats-rank-3' : 'stats-rank-other'
                        }`}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="stats-player-name">{player.name || 'Unknown Player'}</td>
                      <td className="stats-team-name">{player.team_name || 'Unknown Team'}</td>
                      <td className="stats-jersey-number">{player.jersey_number || ''}</td>
                      <td className="stats-games-played">{player.games_played || 0}</td>
                      <td className={getPerformanceColor(player.overall_score, 'overall_score')}>
                        {player.overall_score || 0}
                      </td>
                      {selectedRecentBracket?.sport_type === 'basketball' ? (
                        <>
                          <td className={getPerformanceColor(player.ppg, 'ppg')}>{player.ppg || 0}</td>
                          <td className={getPerformanceColor(player.rpg, 'rpg')}>{player.rpg || 0}</td>
                          <td className={getPerformanceColor(player.apg, 'apg')}>{player.apg || 0}</td>
                          <td className="stats-bpg">{player.bpg || 0}</td>
                        </>
                      ) : (
                        <>
                          <td className={getPerformanceColor(player.kills, 'kills')}>{player.kills || 0}</td>
                          <td className={getPerformanceColor(player.assists, 'assists')}>{player.assists || 0}</td>
                          <td className={getPerformanceColor(player.digs, 'digs')}>{player.digs || 0}</td>
                          <td className="stats-blocks">{player.blocks || 0}</td>
                          <td className="stats-service-aces">{player.service_aces || 0}</td>
                          <td className={getPerformanceColor(player.total_errors, 'total_errors')}>
                            {player.total_errors || 0}
                          </td>
                          <td className={getPerformanceColor(player.total_receptions, 'total_receptions')}>
                            {player.total_receptions || 0}
                          </td>
                          <td className={getPerformanceColor(player.service_errors, 'service_errors')}>
                            {player.service_errors || 0}
                          </td>
                          <td className={getPerformanceColor(player.attack_errors, 'attack_errors')}>
                            {player.attack_errors || 0}
                          </td>
                          <td className={getPerformanceColor(player.reception_errors, 'reception_errors')}>
                            {player.reception_errors || 0}
                          </td>
                          <td className={getPerformanceColor(player.eff, 'eff')}>
                            {player.eff || 0}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {allPlayersData.length === 0 && (
              <div className="empty-state">
                <p>No player statistics available.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Calculate flattened rows for events table
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

  if (!isInitialized) {
    return (
      <div className="user-teams-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-teams-page">
      <div className="teams-header">
        <div className="header-content">
          <div className="header-top">
            <button className="back-btn" onClick={handleBackToHome}>
              <FaArrowLeft className="back-arrow" />
              Back to Home
            </button>
          </div>
          <div className="header-center">
            <h1><FaChartLine className="header-icon" /> Team Statistics</h1>
            <p>Explore team performance and player statistics</p>
          </div>
        </div>
      </div>

      <div className="teams-container">
        <div className="content">
          {error && (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={() => setError(null)} className="error-close">×</button>
            </div>
          )}

          {/* Recent Tournament Containers - Only shown when no specific event is selected */}
          {renderRecentTournamentContainers()}

          {/* Event Selection Tab */}
          {activeTab === "events" && (
            <div className="bracket-view-section purple-background">
              {/* Search Container */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: '1', minWidth: '300px' }}>
                  <input
                    type="text"
                    placeholder="Search tournaments..."
                    value={eventSearchTerm}
                    onChange={(e) => setEventSearchTerm(e.target.value)}
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
                    <option value="basketball">Basketball</option>
                    <option value="volleyball">Volleyball</option>
                  </select>
                </div>
              </div>

              {/* Results Info & Items Per Page */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  {(eventSearchTerm || sportFilter !== "all") && (
                    <>
                      Showing {currentRows.length} of {totalRows} results
                      {eventSearchTerm && <span style={{ color: 'var(--primary-color)', marginLeft: '5px' }}> • Searching: "{eventSearchTerm}"</span>}
                      {sportFilter !== "all" && <span style={{ color: 'var(--primary-color)', marginLeft: '5px' }}> • Sport: {sportFilter}</span>}
                    </>
                  )}
                  {!eventSearchTerm && sportFilter === "all" && (
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
                  <p>Loading tournaments...</p>
                </div>
              ) : totalRows === 0 ? (
                <div className="bracket-no-brackets">
                  {events.length === 0 ? (
                    <p>No tournaments found.</p>
                  ) : (
                    <>
                      <p>No tournaments match your search criteria.</p>
                      <button 
                        className="bracket-view-btn" 
                        onClick={() => {
                          setEventSearchTerm("");
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
                          <th style={{ fontSize: '15px' }}>Event Name</th>
                          <th style={{ fontSize: '15px' }}>Status</th>
                          <th style={{ fontSize: '15px' }}>Dates</th>
                          <th style={{ fontSize: '15px' }}>Bracket</th>
                          <th style={{ fontSize: '15px' }}>Sport</th>
                          <th style={{ fontSize: '15px' }}>Type</th>
                          <th style={{ fontSize: '15px' }}>Teams</th>
                          <th style={{ textAlign: 'center', width: '200px', fontSize: '15px' }}>Actions</th>
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
                                      {event.status || 'ongoing'}
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
                                    onClick={() => handleEventSelect(event, bracket)}
                                    className="bracket-view-btn"
                                    style={{ fontSize: '13px', padding: '8px 14px', flex: '1 1 auto', minWidth: '120px' }}
                                    title="View Stats"
                                  >
                                    <FaEye /> View Stats
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <tr key={event.id}>
                              <td style={{ fontWeight: '600', fontSize: '16px' }}>{event.name}</td>
                              <td>
                                <span className={`bracket-sport-badge ${event.status === "ongoing" ? "bracket-sport-basketball" : "bracket-sport-volleyball"}`} style={{ fontSize: '13px', padding: '8px 14px' }}>
                                  {event.status || 'ongoing'}
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
                                  <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No data</span>
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
                          ← Previous
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
                          Next →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Results Tab */}
          {activeTab === "results" && selectedEvent && (
            <div className="view-section">
              <div className="section-header" style={{ marginBottom: '1.5rem' }}>
                <div>
                  <button className="back-btn" onClick={handleBackToEvents} style={{ marginBottom: '1rem' }}>
                    <FaArrowLeft className="back-arrow" />
                    Back to Events
                  </button>
                  <h2>{selectedEvent.name}</h2>
                  
                  {selectedBracket && (
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      <span><strong>Sport:</strong> {selectedBracket.sport_type}</span>
                      <span><strong>Champion:</strong> {selectedBracket.winner_team_name}</span>
                      <span><strong>Type:</strong> {selectedBracket.elimination_type === 'double' ? 'Double Elimination' : 'Single Elimination'}</span>
                    </div>
                  )}
                </div>
              </div>

              {!selectedBracket ? (
                <div className="empty-state">
                  <p>No brackets available for this event.</p>
                </div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div className="stats-cards-grid" style={{ marginBottom: '2rem' }}>
                    <div className="stats-card stats-view-mode-card">
                      <div className="stats-card-header">
                        <span className="stats-card-label">View Mode</span>
                        <FaChartBar className="stats-card-icon" />
                      </div>
                      <select 
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value)}
                        className="stats-view-mode-select"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '2px solid var(--border-color)',
                          borderRadius: '6px',
                          fontSize: '14px',
                          backgroundColor: 'var(--background-secondary)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          fontWeight: '500',
                          outline: 'none',
                          transition: 'var(--transition)',
                          marginTop: '0.5rem'
                        }}
                      >
                        <option value="standings">🏆 Team Standings</option>
                        <option value="players">👤 Player Statistics</option>
                        <option value="teams">🏀 Team Statistics</option>
                      </select>
                      <div className="stats-card-subtext">
                        Change data view
                      </div>
                    </div>
                    
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
                          {getCurrentSportType() === 'basketball' ? 'Avg PPG' : 'Avg Kills'}
                        </span>
                        <FaChartBar className="stats-card-icon" />
                      </div>
                      <div className="stats-card-value">
                        {getCurrentSportType() === 'basketball' ? eventStatistics.avg_ppg : eventStatistics.avg_kills}
                      </div>
                      <div className="stats-card-subtext">
                        {getCurrentSportType() === 'basketball' ? 'Points Per Game' : 'Kills Per Game'}
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

                  {loading ? (
                    <div className="loading-state">
                      <div className="loading-spinner"></div>
                      <p>Loading data...</p>
                    </div>
                  ) : (
                    <>
                      {/* Team Standings View */}
                      {viewMode === "standings" && (
                        <div className="stats-tab-content">
                          <div className="stats-section-header" style={{ marginBottom: '1.5rem' }}>
                            <h2 className="stats-section-title">Team Standings</h2>
                            <p className="stats-section-subtitle">
                              Final standings for {selectedBracket.name}
                            </p>
                            {selectedBracket.sport_type === 'volleyball' && !hasVolleyballData && (
                              <div style={{ fontSize: '14px', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
                                Volleyball standings are not available for this tournament
                              </div>
                            )}
                          </div>

                          <div className="stats-table-controls">
                            <div className="stats-search-container">
                              <FaSearch className="stats-search-icon" />
                              <input
                                type="text"
                                className="stats-search-input"
                                placeholder="Search teams..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                              />
                            </div>
                          </div>

                          {selectedBracket.sport_type === 'volleyball' && !hasVolleyballData ? (
                            <div className="empty-state">
                              <p>Volleyball standings data is not available.</p>
                              <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                                This is expected for volleyball tournaments - player and team statistics are still available.
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="stats-table-container">
                                <table className="stats-table">
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
                                        <td className="stats-rank-cell">
                                          <div className={`stats-rank-badge ${
                                            team.position === 1 ? 'stats-rank-1' : 
                                            team.position === 2 ? 'stats-rank-2' :
                                            team.position === 3 ? 'stats-rank-3' : 'stats-rank-other'
                                          }`}>
                                            {team.position === 1 && <span className="awards_standings_medal">🥇</span>}
                                            {team.position === 2 && <span className="awards_standings_medal">🥈</span>}
                                            {team.position === 3 && <span className="awards_standings_medal">🥉</span>}
                                            {team.position > 3 && (team.position || index + 1)}
                                          </div>
                                        </td>
                                        <td className="stats-team-name">
                                          <strong>{team.team || 'Unknown Team'}</strong>
                                        </td>
                                        <td>{team.wins || 0}</td>
                                        <td>{team.losses || 0}</td>
                                        {selectedBracket.sport_type === "basketball" ? (
                                          <>
                                            <td>{team.points_for || 0}</td>
                                            <td>{team.points_against || 0}</td>
                                            <td className={String(team.point_diff || 0).startsWith('+') ? 'stats-high-value' : String(team.point_diff || 0).startsWith('-') ? 'stats-low-value' : ''}>
                                              {team.point_diff || 0}
                                            </td>
                                          </>
                                        ) : (
                                          <>
                                            <td>{team.sets_for || 0}</td>
                                            <td>{team.sets_against || 0}</td>
                                            <td>{team.set_ratio || 0}</td>
                                          </>
                                        )}
                                        <td>{team.win_percentage || '0.0%'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {filteredStandings.length === 0 && (
                                <div className="empty-state">
                                  <p>No standings data available.</p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Player Statistics View */}
                      {viewMode === "players" && (
                        <div className="stats-tab-content">
                          <div className="stats-section-header" style={{ marginBottom: '1.5rem' }}>
                            <h2 className="stats-section-title">Player Statistics</h2>
                            <p className="stats-section-subtitle">
                              Players ranked by performance in {selectedBracket.name}
                            </p>
                          </div>

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
                          
                          <div className="stats-table-container">
                            <table className="stats-table">
                              <thead>
                                <tr>
                                  <th>Rank</th>
                                  <th>Player</th>
                                  <th>Team</th>
                                  <th>Jersey</th>
                                  <th className="stats-sortable-header" onClick={() => handleSort('games_played')}>
                                    GP {sortConfig.key === 'games_played' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                                  </th>
                                  <th className="stats-sortable-header" onClick={() => handleSort('overall_score')}>
                                    Overall {sortConfig.key === 'overall_score' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                                  </th>
                                  {getCurrentSportType() === 'basketball' ? renderBasketballPlayerHeaders() : renderVolleyballPlayerHeaders()}
                                </tr>
                              </thead>
                              <tbody>
                                {getCurrentSportType() === 'basketball' ? 
                                  currentPlayers.map((player, index) => (
                                    <tr key={player.id || index} className="stats-player-row">
                                      <td className="stats-rank-cell">
                                        <div className={`stats-rank-badge ${
                                          indexOfFirstItem + index === 0 ? 'stats-rank-1' : 
                                          indexOfFirstItem + index === 1 ? 'stats-rank-2' :
                                          indexOfFirstItem + index === 2 ? 'stats-rank-3' : 'stats-rank-other'
                                        }`}>
                                          {indexOfFirstItem + index + 1}
                                        </div>
                                      </td>
                                      <td className="stats-player-name">{player.name || 'Unknown Player'}</td>
                                      <td className="stats-team-name">{player.team_name || 'Unknown Team'}</td>
                                      <td className="stats-jersey-number">{player.jersey_number || ''}</td>
                                      <td className="stats-games-played">{player.games_played || 0}</td>
                                      <td className={getPerformanceColor(player.overall_score, 'overall_score')}>
                                        {player.overall_score || 0}
                                      </td>
                                      <td className={getPerformanceColor(player.ppg, 'ppg')}>{player.ppg || 0}</td>
                                      <td className={getPerformanceColor(player.rpg, 'rpg')}>{player.rpg || 0}</td>
                                      <td className={getPerformanceColor(player.apg, 'apg')}>{player.apg || 0}</td>
                                      <td className="stats-bpg">{player.bpg || 0}</td>
                                    </tr>
                                  )) : 
                                  currentPlayers.map((player, index) => (
                                    <tr key={player.id || index} className="stats-player-row">
                                      <td className="stats-rank-cell">
                                        <div className={`stats-rank-badge ${
                                          indexOfFirstItem + index === 0 ? 'stats-rank-1' : 
                                          indexOfFirstItem + index === 1 ? 'stats-rank-2' :
                                          indexOfFirstItem + index === 2 ? 'stats-rank-3' : 'stats-rank-other'
                                        }`}>
                                          {indexOfFirstItem + index + 1}
                                        </div>
                                      </td>
                                      <td className="stats-player-name">{player.name || 'Unknown Player'}</td>
                                      <td className="stats-team-name">{player.team_name || 'Unknown Team'}</td>
                                      <td className="stats-jersey-number">{player.jersey_number || ''}</td>
                                      <td className="stats-games-played">{player.games_played || 0}</td>
                                      <td className={getPerformanceColor(player.overall_score, 'overall_score')}>
                                        {player.overall_score || 0}
                                      </td>
                                      <td className={getPerformanceColor(player.kills, 'kills')}>{player.kills || 0}</td>
                                      <td className={getPerformanceColor(player.assists, 'assists')}>{player.assists || 0}</td>
                                      <td className={getPerformanceColor(player.digs, 'digs')}>{player.digs || 0}</td>
                                      <td className="stats-blocks">{player.blocks || 0}</td>
                                      <td className="stats-service-aces">{player.service_aces || 0}</td>
                                      <td className={getPerformanceColor(player.total_errors, 'total_errors')}>
                                        {player.total_errors || 0}
                                      </td>
                                      <td className={getPerformanceColor(player.total_receptions, 'total_receptions')}>
                                        {player.total_receptions || 0}
                                      </td>
                                      <td className={getPerformanceColor(player.service_errors, 'service_errors')}>
                                        {player.service_errors || 0}
                                      </td>
                                      <td className={getPerformanceColor(player.attack_errors, 'attack_errors')}>
                                        {player.attack_errors || 0}
                                      </td>
                                      <td className={getPerformanceColor(player.reception_errors, 'reception_errors')}>
                                        {player.reception_errors || 0}
                                      </td>
                                      <td className={getPerformanceColor(player.eff, 'eff')}>
                                        {player.eff || 0}
                                      </td>
                                    </tr>
                                  ))
                                }
                              </tbody>
                            </table>
                          </div>

                          {filteredPlayers.length === 0 && (
                            <div className="empty-state">
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
                      )}

                      {/* Team Statistics View */}
                      {viewMode === "teams" && (
                        <div className="stats-tab-content">
                          <div className="stats-section-header" style={{ marginBottom: '1.5rem' }}>
                            <h2 className="stats-section-title">Team Statistics</h2>
                            <p className="stats-section-subtitle">
                              Teams ranked by overall performance in {selectedBracket.name}
                            </p>
                          </div>

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
                          
                          <div className="stats-table-container">
                            <table className="stats-table">
                              <thead>
                                <tr>
                                  <th>Rank</th>
                                  <th>Team</th>
                                  <th className="stats-sortable-header" onClick={() => handleSort('games_played')}>
                                    GP {sortConfig.key === 'games_played' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                                  </th>
                                  <th className="stats-sortable-header" onClick={() => handleSort('overall_score')}>
                                    Overall {sortConfig.key === 'overall_score' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                                  </th>
                                  {getCurrentSportType() === 'basketball' ? renderBasketballTeamHeaders() : renderVolleyballTeamHeaders()}
                                </tr>
                              </thead>
                              <tbody>
                                {getCurrentSportType() === 'basketball' ? 
                                  currentTeams.map((team, index) => (
                                    <tr key={team.team_id || index} className="stats-player-row">
                                      <td className="stats-rank-cell">
                                        <div className={`stats-rank-badge ${
                                          indexOfFirstItem + index === 0 ? 'stats-rank-1' : 
                                          indexOfFirstItem + index === 1 ? 'stats-rank-2' :
                                          indexOfFirstItem + index === 2 ? 'stats-rank-3' : 'stats-rank-other'
                                        }`}>
                                          {indexOfFirstItem + index + 1}
                                        </div>
                                      </td>
                                      <td className="stats-team-name">{team.team_name || 'Unknown Team'}</td>
                                      <td className="stats-games-played">{team.games_played || 0}</td>
                                      <td className={getPerformanceColor(team.overall_score, 'overall_score')}>
                                        {team.overall_score || 0}
                                      </td>
                                      <td className={getPerformanceColor(team.ppg, 'ppg')}>{team.ppg || 0}</td>
                                      <td className={getPerformanceColor(team.rpg, 'rpg')}>{team.rpg || 0}</td>
                                      <td className={getPerformanceColor(team.apg, 'apg')}>{team.apg || 0}</td>
                                      <td className="stats-bpg">{team.bpg || 0}</td>
                                    </tr>
                                  )) : 
                                  currentTeams.map((team, index) => (
                                    <tr key={team.team_id || index} className="stats-player-row">
                                      <td className="stats-rank-cell">
                                        <div className={`stats-rank-badge ${
                                          indexOfFirstItem + index === 0 ? 'stats-rank-1' : 
                                          indexOfFirstItem + index === 1 ? 'stats-rank-2' :
                                          indexOfFirstItem + index === 2 ? 'stats-rank-3' : 'stats-rank-other'
                                        }`}>
                                          {indexOfFirstItem + index + 1}
                                        </div>
                                      </td>
                                      <td className="stats-team-name">{team.team_name || 'Unknown Team'}</td>
                                      <td className="stats-games-played">{team.games_played || 0}</td>
                                      <td className={getPerformanceColor(team.overall_score, 'overall_score')}>
                                        {team.overall_score || 0}
                                      </td>
                                      <td className={getPerformanceColor(team.kills, 'kills')}>{team.kills || 0}</td>
                                      <td className={getPerformanceColor(team.assists, 'assists')}>{team.assists || 0}</td>
                                      <td className={getPerformanceColor(team.digs, 'digs')}>{team.digs || 0}</td>
                                      <td className="stats-blocks">{team.blocks || 0}</td>
                                      <td className="stats-service-aces">{team.service_aces || 0}</td>
                                      <td className={getPerformanceColor(team.total_errors, 'total_errors')}>
                                        {team.total_errors || 0}
                                      </td>
                                      <td className={getPerformanceColor(team.total_receptions, 'total_receptions')}>
                                        {team.total_receptions || 0}
                                      </td>
                                      <td className={getPerformanceColor(team.service_errors, 'service_errors')}>
                                        {team.service_errors || 0}
                                      </td>
                                      <td className={getPerformanceColor(team.attack_errors, 'attack_errors')}>
                                        {team.attack_errors || 0}
                                      </td>
                                      <td className={getPerformanceColor(team.reception_errors, 'reception_errors')}>
                                        {team.reception_errors || 0}
                                      </td>
                                      <td className={getPerformanceColor(team.eff, 'eff')}>
                                        {team.eff || 0}
                                      </td>
                                    </tr>
                                  ))
                                }
                              </tbody>
                            </table>
                          </div>

                          {filteredTeams.length === 0 && (
                            <div className="empty-state">
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
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserStatsPage;