import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaTrophy, FaCalendarAlt, FaClock, FaMedal, FaFilter } from "react-icons/fa";
import '../../style/User_SchedulePage.css';

const UserSchedulePage = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState("all");
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [events, setEvents] = useState([]);
  
  // Recent matches state
  const [recentEvents, setRecentEvents] = useState([]);
  const [selectedRecentEvent, setSelectedRecentEvent] = useState(null);
  const [recentBrackets, setRecentBrackets] = useState([]);
  const [selectedRecentBracket, setSelectedRecentBracket] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [matchesPerPage] = useState(10);

  // Stats modal state
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedMatchStats, setSelectedMatchStats] = useState(null);
  const [playerStats, setPlayerStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // Filter state
  const [tournamentPeriod, setTournamentPeriod] = useState(null);
  const [dateRangeFilter, setDateRangeFilter] = useState('all');

  const sports = ["all", "Basketball", "Volleyball"];

  const handleBackToHome = () => {
    navigate("/");
  };

  const formatRoundDisplay = (schedule) => {
    if (!schedule || !schedule.round_number) return "Unknown Round";
    
    const roundNum = schedule.round_number;
    const bracketType = schedule.bracket_type;
    
    if (roundNum === 200) return 'Grand Final';
    if (roundNum === 201) return 'Bracket Reset';
    if (roundNum >= 200 && bracketType === 'championship') {
      return `Championship Round ${roundNum - 199}`;
    }
    
    if (bracketType === 'loser' || (roundNum >= 101 && roundNum < 200)) {
      return `LB Round ${roundNum - 100}`;
    }
    
    if (bracketType === 'winner' || roundNum < 100) {
      return `Round ${roundNum}`;
    }
    
    return `Round ${roundNum}`;
  };

  const formatScheduleDateTime = (date, time) => {
    if (!date || !time || date === 'Date TBD' || time === 'Time TBD') return {
      full: 'Date TBD',
      date: 'Date TBD',
      time: 'Time TBD',
      dayOfWeek: 'TBD',
      shortDate: 'TBD'
    };
    
    try {
      let dateObj;
      if (date.includes('-')) {
        const [year, month, day] = date.split('-');
        const [hours, minutes] = time.split(':');
        dateObj = new Date(year, month - 1, day, hours, minutes);
      } else if (date.includes('/')) {
        dateObj = new Date(`${date} ${time}`);
      } else {
        dateObj = new Date(`${date} ${time}`);
      }
      
      if (isNaN(dateObj.getTime())) {
        return {
          full: 'Date TBD',
          date: 'Date TBD',
          time: 'Time TBD',
          dayOfWeek: 'TBD',
          shortDate: 'TBD'
        };
      }
      
      return {
        full: dateObj.toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        date: dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        time: dateObj.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        dayOfWeek: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
        shortDate: dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })
      };
    } catch (error) {
      console.error('Error formatting date:', error);
      return {
        full: 'Date TBD',
        date: 'Date TBD',
        time: 'Time TBD',
        dayOfWeek: 'TBD',
        shortDate: 'TBD'
      };
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/user-stats/teams");
      if (!response.ok) {
        throw new Error("Failed to fetch teams");
      }
      const data = await response.json();
      setTeams(data);
    } catch (err) {
      console.error("Error fetching teams:", err);
    }
  };

  const getScheduleDataForMatch = (match) => {
    if (!match || !schedules.length) return null;
    
    const directMatch = schedules.find(schedule => 
      schedule.matchId === match.id
    );
    if (directMatch) return directMatch;
    
    const bracketTeamMatch = schedules.find(schedule => 
      schedule.bracketId === match.bracket_id &&
      (
        (schedule.team1_name === match.team1_name && schedule.team2_name === match.team2_name) ||
        (schedule.team1_name === match.team2_name && schedule.team2_name === match.team1_name)
      )
    );
    if (bracketTeamMatch) return bracketTeamMatch;
    
    const teamMatch = schedules.find(schedule => 
      schedule.team1_name && schedule.team2_name &&
      match.team1_name && match.team2_name &&
      (
        (schedule.team1_name.toLowerCase() === match.team1_name.toLowerCase() && 
         schedule.team2_name.toLowerCase() === match.team2_name.toLowerCase()) ||
        (schedule.team1_name.toLowerCase() === match.team2_name.toLowerCase() && 
         schedule.team2_name.toLowerCase() === match.team1_name.toLowerCase())
      )
    );
    
    return teamMatch || null;
  };

  const fetchAllEvents = async () => {
    try {
      const ongoingRes = await fetch("http://localhost:5000/api/events");
      const ongoingData = await ongoingRes.json();
      
      const completedRes = await fetch("http://localhost:5000/api/awards/events/completed");
      const completedData = await completedRes.json();
      
      const allEventsData = [...ongoingData, ...completedData];
      
      const uniqueEvents = allEventsData.reduce((acc, current) => {
        const x = acc.find(item => item.id === current.id);
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, []);
      
      const sortedEvents = uniqueEvents.sort((a, b) => {
        const dateA = new Date(a.created_at || a.id);
        const dateB = new Date(b.created_at || b.id);
        return dateB - dateA;
      });

      setRecentEvents(sortedEvents);
      
      if (sortedEvents.length > 0) {
        const mostRecent = sortedEvents[0];
        setSelectedRecentEvent(mostRecent);
        await fetchTournamentPeriod(mostRecent.id);
        await fetchBracketsForRecentEvent(mostRecent.id);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  };

  const fetchTournamentPeriod = async (eventId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/events/${eventId}`);
      const data = await res.json();
      setTournamentPeriod({
        start: data.start_date,
        end: data.end_date
      });
    } catch (err) {
      console.error("Error fetching tournament period:", err);
    }
  };

  const fetchBracketsForRecentEvent = async (eventId) => {
    try {
      let bracketsRes;
      try {
        bracketsRes = await fetch(`http://localhost:5000/api/events/${eventId}/brackets`);
      } catch (err) {
        bracketsRes = await fetch(`http://localhost:5000/api/awards/events/${eventId}/completed-brackets`);
      }
      
      const brackets = await bracketsRes.json();
      setRecentBrackets(brackets || []);
      
      if (brackets && brackets.length > 0) {
        setSelectedRecentBracket(brackets[0]);
        await fetchMatchesForRecentBracket(brackets[0].id);
      } else {
        setRecentMatches([]);
      }
    } catch (err) {
      console.error("Error fetching recent brackets:", err);
      setRecentBrackets([]);
      setRecentMatches([]);
    }
  };

  const fetchMatchesForRecentBracket = async (bracketId) => {
    try {
      const matchRes = await fetch(`http://localhost:5000/api/stats/${bracketId}/matches`);
      const matchData = await matchRes.json();
      
      const enhancedMatches = matchData.map(match => {
        const scheduleData = getScheduleDataForMatch(match);
        
        let finalDate = scheduleData?.date || match.date;
        let finalTime = scheduleData?.time || match.time;
        
        if ((!finalDate || finalDate === 'Date TBD') && match.scheduled_at) {
          try {
            const scheduledDate = new Date(match.scheduled_at);
            if (!isNaN(scheduledDate.getTime())) {
              finalDate = scheduledDate.toISOString().split('T')[0];
              finalTime = scheduledDate.toTimeString().slice(0, 5);
            }
          } catch (e) {
            console.error('Error parsing scheduled_at:', e);
          }
        }
        
        return {
          ...match,
          date: finalDate,
          time: finalTime,
          sport_type: scheduleData?.sport_type || match.sport_type,
          scheduleData: scheduleData
        };
      });
      
      const sortedMatches = enhancedMatches.sort((a, b) => {
        try {
          const dateA = a.date && a.time ? new Date(`${a.date} ${a.time}`) : new Date(0);
          const dateB = b.date && b.time ? new Date(`${b.date} ${b.time}`) : new Date(0);
          return dateB - dateA;
        } catch (error) {
          return 0;
        }
      });
      
      setRecentMatches(sortedMatches || []);
      setCurrentPage(1);
    } catch (err) {
      console.error("Error fetching recent matches:", err);
      setRecentMatches([]);
    }
  };

  const handleRecentEventChange = async (eventId) => {
    const event = recentEvents.find(e => e.id === parseInt(eventId));
    if (event) {
      setSelectedRecentEvent(event);
      setDateRangeFilter('all');
      await fetchTournamentPeriod(event.id);
      await fetchBracketsForRecentEvent(event.id);
    }
  };

  const handleRecentBracketChange = async (bracketId) => {
    const bracket = recentBrackets.find(b => b.id === parseInt(bracketId));
    if (bracket) {
      setSelectedRecentBracket(bracket);
      await fetchMatchesForRecentBracket(bracket.id);
    }
  };

  const getDateRangeFilters = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch(dateRangeFilter) {
      case 'today':
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        return { start: weekStart, end: weekEnd };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { start: monthStart, end: monthEnd };
      default:
        return null;
    }
  };

  const isMatchInDateRange = (match) => {
    if (dateRangeFilter === 'all') return true;
    
    const dateRange = getDateRangeFilters();
    if (!dateRange) return true;
    
    if (!match.date || match.date === 'Date TBD') return false;
    
    try {
      const matchDate = new Date(match.date);
      return matchDate >= dateRange.start && matchDate <= dateRange.end;
    } catch (error) {
      return false;
    }
  };

  const handleViewStats = async (match) => {
    setStatsLoading(true);
    setSelectedMatchStats(match);
    setShowStatsModal(true);
    
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
      setStatsLoading(false);
    }
  };

  const handleCloseStatsModal = () => {
    setShowStatsModal(false);
    setSelectedMatchStats(null);
    setPlayerStats([]);
  };

  const getScheduleStatus = (date, time) => {
    if (!date || !time || date === 'Date TBD' || time === 'Time TBD') return 'scheduled';
    
    try {
      const scheduleDateTime = new Date(`${date} ${time}`);
      const now = new Date();
      return scheduleDateTime > now ? 'upcoming' : 'completed';
    } catch (error) {
      return 'scheduled';
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [schedulesRes, eventsRes] = await Promise.all([
          fetch("http://localhost:5000/api/schedules"),
          fetch("http://localhost:5000/api/events")
        ]);
        
        const schedulesData = await schedulesRes.json();
        const eventsData = await eventsRes.json();
        
        const sortedSchedules = schedulesData.sort((a, b) => {
          const dateA = new Date(a.created_at || a.id);
          const dateB = new Date(b.created_at || b.id);
          return dateB - dateA;
        });
        
        setSchedules(sortedSchedules);
        setEvents(eventsData);
        
        await fetchTeams();
        await fetchAllEvents();
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getTeamRecord = (teamName) => {
    if (!teamName) return { wins: 0, losses: 0 };
    
    const team = teams.find(t => 
      t.name.toLowerCase() === teamName.toLowerCase()
    );
    
    return {
      wins: team?.wins || 0,
      losses: team?.losses || 0
    };
  };

  const formatTeamRecord = (teamName) => {
    const record = getTeamRecord(teamName);
    return `(${record.wins} - ${record.losses})`;
  };

  // Filter matches
  const filteredMatches = recentMatches.filter(match => {
    const matchesSport = selectedSport === "all" || 
      (match.sport_type && match.sport_type.toLowerCase() === selectedSport.toLowerCase());
    
    const matchesDateRange = isMatchInDateRange(match);
    
    return matchesSport && matchesDateRange;
  });

  // Group matches by bracket
  const matchesByBracket = filteredMatches.reduce((acc, match) => {
    const bracketName = match.bracket_name || selectedRecentBracket?.name || "Unknown Bracket";
    if (!acc[bracketName]) {
      acc[bracketName] = [];
    }
    acc[bracketName].push(match);
    return acc;
  }, {});

  // Pagination
  const indexOfLastMatch = currentPage * matchesPerPage;
  const indexOfFirstMatch = indexOfLastMatch - matchesPerPage;
  const totalPages = Math.ceil(filteredMatches.length / matchesPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusBadge = (status) => {
    const badges = {
      upcoming: { className: 'stats-status-upcoming', label: 'Upcoming' },
      scheduled: { className: 'stats-status-scheduled', label: 'Scheduled' },
      completed: { className: 'stats-status-completed', label: 'Completed' }
    };
    const badge = badges[status] || badges.scheduled;
    return (
      <span className={`stats-match-status-badge ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const renderMatchStatsTable = () => {
    if (playerStats.length === 0) return <p>No statistics available for this match.</p>;
    
    const isBasketball = selectedMatchStats?.sport_type === "basketball";
    
    return (
      <div className="stats-table-container">
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
                    <th>Eff</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {playerStats.map((player) => {
                const jerseyNumber = player.jersey_number || player.jerseyNumber || "N/A";
                const totalErrors = (player.serve_errors || 0) + (player.attack_errors || 0) + (player.reception_errors || 0);
                const efficiency = (player.kills || 0) + (player.digs || 0) + (player.volleyball_blocks || 0) + (player.service_aces || 0) - totalErrors;
                
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
                        <td>{efficiency}</td>
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

  return (
    <div className="user-schedule-page">
      {/* Header */}
      <div className="schedule-header">
        <div className="header-content">
          <div className="header-top">
            <button className="back-btn" onClick={handleBackToHome}>
              <FaArrowLeft className="back-arrow" />
              Back to Home
            </button>
          </div>
          <div className="header-center">
            <h1><FaCalendarAlt className="header-icon" /> Match Schedule</h1>
            <p>View all upcoming and past tournament matches</p>
          </div>
        </div>
      </div>

      <div className="schedule-container">
        {/* Filter Container */}
        <div className="stats-filter-matches-container">
          <div className="stats-filter-matches-header">
            <FaFilter className="stats-filter-matches-icon" />
            <span className="stats-filter-matches-title">FILTER MATCHES</span>
          </div>
          
          <div className="stats-filter-matches-content">
            {/* Tournament and Bracket Row */}
            <div className="stats-filter-matches-row">
              <div className="stats-filter-matches-group">
                <div className="stats-filter-matches-label">
                  <FaTrophy className="stats-filter-matches-label-icon" />
                  <span>TOURNAMENT</span>
                </div>
                <select
                  value={selectedRecentEvent?.id || ""}
                  onChange={(e) => handleRecentEventChange(e.target.value)}
                  className="stats-filter-matches-select"
                >
                  {recentEvents.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="stats-filter-matches-group">
                <div className="stats-filter-matches-label">
                  <FaMedal className="stats-filter-matches-label-icon" />
                  <span>BRACKET</span>
                </div>
                <select
                  value={selectedRecentBracket?.id || ""}
                  onChange={(e) => handleRecentBracketChange(e.target.value)}
                  className="stats-filter-matches-select"
                  disabled={recentBrackets.length === 0}
                >
                  {recentBrackets.map(bracket => (
                    <option key={bracket.id} value={bracket.id}>
                      {bracket.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tournament Period and Date Range in One Row */}
            <div className="stats-filter-matches-row">
              {/* Tournament Period */}
              {tournamentPeriod && (
                <div className="stats-filter-matches-group">
                  <div className="stats-filter-matches-label">
                    <FaCalendarAlt className="stats-filter-matches-label-icon" />
                    <span>TOURNAMENT PERIOD</span>
                  </div>
                  <div className="stats-period-display">
                    <span className="stats-period-date">
                      {new Date(tournamentPeriod.start).toLocaleDateString('en-US', { 
                        month: 'short', day: 'numeric', year: 'numeric' 
                      })}
                    </span>
                    <span className="stats-period-separator">→</span>
                    <span className="stats-period-date">
                      {new Date(tournamentPeriod.end).toLocaleDateString('en-US', { 
                        month: 'short', day: 'numeric', year: 'numeric' 
                      })}
                    </span>
                  </div>
                </div>
              )}

              {/* Date Range Filter */}
              <div className="stats-filter-matches-group">
                <div className="stats-filter-matches-label">
                  <FaCalendarAlt className="stats-filter-matches-label-icon" />
                  <span>DATE RANGE</span>
                </div>
                <div className="stats-filter-date-range-buttons">
                  <button
                    onClick={() => setDateRangeFilter('all')}
                    className={`stats-filter-date-btn ${dateRangeFilter === 'all' ? 'active' : ''}`}
                  >
                    All Dates
                  </button>
                  <button
                    onClick={() => setDateRangeFilter('today')}
                    className={`stats-filter-date-btn ${dateRangeFilter === 'today' ? 'active' : ''}`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setDateRangeFilter('week')}
                    className={`stats-filter-date-btn ${dateRangeFilter === 'week' ? 'active' : ''}`}
                  >
                    This Week
                  </button>
                  <button
                    onClick={() => setDateRangeFilter('month')}
                    className={`stats-filter-date-btn ${dateRangeFilter === 'month' ? 'active' : ''}`}
                  >
                    This Month
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Matches Section */}
        {loading ? (
          <div className="stats-loading-state">
            <div className="stats-loading-spinner"></div>
            <p>Loading matches...</p>
          </div>
        ) : Object.keys(matchesByBracket).length > 0 ? (
          <div className="stats-matches-section">
            {Object.entries(matchesByBracket).map(([bracket, bracketMatches]) => {
              // Paginate within each bracket
              const startIdx = (currentPage - 1) * matchesPerPage;
              const endIdx = startIdx + matchesPerPage;
              const paginatedMatches = bracketMatches.slice(startIdx, endIdx);
              
              return (
                <div key={bracket} className="stats-bracket-section">
                  <div className="stats-bracket-header">
                    <FaMedal className="stats-bracket-icon" />
                    <h2 className="stats-bracket-title">{bracket}</h2>
                    <span className="stats-bracket-count">
                      ({bracketMatches.length} {bracketMatches.length === 1 ? 'match' : 'matches'})
                    </span>
                  </div>

                  <div className="stats-matches-grid">
                    {paginatedMatches.map(match => {
                      const matchDateTime = formatScheduleDateTime(match.date, match.time);
                      const status = getScheduleStatus(match.date, match.time);
                      
                      return (
                        <div key={match.id} className={`stats-match-card stats-match-card-compact ${status}`}>
                          {/* Match Header */}
                          <div className="stats-match-card-header">
                            <div className="stats-match-info">
                              <FaTrophy className="stats-info-icon" />
                              <span className="stats-tournament-name">{selectedRecentEvent?.name}</span>
                              <span className="stats-info-divider">•</span>
                              <span className="stats-round-name">{formatRoundDisplay(match)}</span>
                            </div>
                            {getStatusBadge(status)}
                          </div>

                          {/* Match Body */}
                          <div className="stats-match-card-body stats-match-card-body-compact">
                            <div className="stats-teams-container stats-teams-container-compact">
                              {/* Team 1 */}
                              <div className="stats-team-side stats-team-left">
                                <span className="stats-team-logo stats-team-logo-compact">
                                  {match.sport_type === 'basketball' ? '🏀' : '🏐'}
                                </span>
                                <div className="stats-team-details">
                                  <h3 className="stats-team-name">{match.team1_name || "TBD"}</h3>
                                  <p className="stats-team-record">{formatTeamRecord(match.team1_name)}</p>
                                </div>
                              </div>

                              {/* Score/VS */}
                              <div className="stats-match-center stats-match-center-compact">
                                {status === 'completed' ? (
                                  <div className="stats-score-container stats-score-container-compact completed">
                                    <div className="stats-final-score">
                                      <span className="stats-score-number stats-score-number-compact">{match.score_team1 || 0}</span>
                                      <span className="stats-score-divider">-</span>
                                      <span className="stats-score-number stats-score-number-compact">{match.score_team2 || 0}</span>
                                    </div>
                                    <div className="stats-final-label">Final</div>
                                    <div className="stats-match-datetime stats-match-datetime-compact">
                                      <div className="stats-datetime-item stats-datetime-item-compact">
                                        <FaCalendarAlt className="stats-datetime-icon" />
                                        <span>{matchDateTime.shortDate}</span>
                                      </div>
                                      <div className="stats-datetime-item stats-datetime-item-compact">
                                        <FaClock className="stats-datetime-icon" />
                                        <span>{matchDateTime.time}</span>
                                      </div>
                                    </div>
                                    {status === 'completed' && (
                                      <button 
                                        className="stats-view-stats-btn stats-view-stats-btn-compact"
                                        onClick={() => handleViewStats(match)}
                                      >
                                        View Stats
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="stats-score-container stats-score-container-compact upcoming">
                                    <div className="stats-vs-text stats-vs-text-compact">VS</div>
                                    <div className="stats-match-datetime stats-match-datetime-compact scheduled">
                                      <div className="stats-datetime-item stats-datetime-item-compact">
                                        <FaCalendarAlt className="stats-datetime-icon" />
                                        <span>{matchDateTime.shortDate}</span>
                                      </div>
                                      <div className="stats-datetime-item stats-datetime-item-compact">
                                        <FaClock className="stats-datetime-icon" />
                                        <span>{matchDateTime.time}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Team 2 */}
                              <div className="stats-team-side stats-team-right">
                                <div className="stats-team-details">
                                  <h3 className="stats-team-name">{match.team2_name || "TBD"}</h3>
                                  <p className="stats-team-record">{formatTeamRecord(match.team2_name)}</p>
                                </div>
                                <span className="stats-team-logo stats-team-logo-compact">
                                  {match.sport_type === 'basketball' ? '🏀' : '🏐'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="stats-pagination-container">
                <div className="stats-pagination-info">
                  Page {currentPage} of {totalPages}
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
                    {[...Array(totalPages)].map((_, index) => {
                      const pageNumber = index + 1;
                      if (
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
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
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            <div className="stats-matches-info">
              Showing {indexOfFirstMatch + 1}-{Math.min(indexOfLastMatch, filteredMatches.length)} of {filteredMatches.length} matches
            </div>
          </div>
        ) : (
          <div className="stats-empty-state">
            <FaTrophy className="stats-empty-icon" />
            <h3>No matches found</h3>
            <p>Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Stats Modal */}
      {showStatsModal && (
        <div className="stats-modal-overlay" onClick={handleCloseStatsModal}>
          <div className="stats-modal-content stats-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="stats-modal-header">
              <div className="stats-modal-title">
                <h2>Match Statistics</h2>
                {selectedMatchStats && (
                  <div className="stats-match-title">
                    {selectedMatchStats.team1_name} vs {selectedMatchStats.team2_name}
                    <div className="stats-match-date-time-modal">
                      {formatScheduleDateTime(selectedMatchStats.date, selectedMatchStats.time).full}
                    </div>
                  </div>
                )}
              </div>
              <button className="stats-close-btn" onClick={handleCloseStatsModal}>
                ×
              </button>
            </div>
            
            <div className="stats-modal-body stats-modal-body">
              {statsLoading ? (
                <div className="stats-stats-loading">
                  <div className="stats-loading-spinner"></div>
                  <p>Loading statistics...</p>
                </div>
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

export default UserSchedulePage;