import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSearch, FaTrophy, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaMedal, FaFilter } from "react-icons/fa";
import '../../style/User_SchedulePage.css';

const UserSchedulePage = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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
  const [selectedStatus, setSelectedStatus] = useState("all");

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
        await fetchBracketsForRecentEvent(mostRecent.id);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
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
    const matchesSearch = 
      (match.team1_name && match.team1_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (match.team2_name && match.team2_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSport = selectedSport === "all" || 
      (match.sport_type && match.sport_type.toLowerCase() === selectedSport.toLowerCase());
    
    const status = getScheduleStatus(match.date, match.time);
    const matchesStatus = selectedStatus === "all" || status === selectedStatus;
    
    return matchesSearch && matchesSport && matchesStatus;
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

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  const getStatusBadge = (status) => {
    const badges = {
      upcoming: { className: 'status-upcoming', label: 'Upcoming' },
      scheduled: { className: 'status-scheduled', label: 'Scheduled' },
      completed: { className: 'status-completed', label: 'Completed' }
    };
    const badge = badges[status] || badges.scheduled;
    return (
      <span className={`match-status-badge ${badge.className}`}>
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
        <div className="filter-matches-container">
  <div className="filter-matches-header">
    <FaFilter className="filter-matches-icon" />
    <span className="filter-matches-title">FILTER MATCHES</span>
  </div>
  
  <div className="filter-matches-content">
    {/* Tournament and Bracket Row */}
    <div className="filter-matches-row">
      <div className="filter-matches-group">
        <div className="filter-matches-label">
          <FaTrophy className="filter-matches-label-icon" />
          <span>TOURNAMENT</span>
        </div>
        <select
          value={selectedRecentEvent?.id || ""}
          onChange={(e) => handleRecentEventChange(e.target.value)}
          className="filter-matches-select"
        >
          {recentEvents.map(event => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-matches-group">
        <div className="filter-matches-label">
          <FaMedal className="filter-matches-label-icon" />
          <span>BRACKET</span>
        </div>
        <select
          value={selectedRecentBracket?.id || ""}
          onChange={(e) => handleRecentBracketChange(e.target.value)}
          className="filter-matches-select"
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

    {/* Sport Selection Row */}
 

    {/* Status Buttons Row */}
    <div className="filter-matches-row">
      <div className="filter-matches-group full-width">
        <div className="filter-matches-label">
          <FaClock className="filter-matches-label-icon" />
          <span>STATUS</span>
        </div>
        <div className="filter-status-buttons">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`filter-status-btn ${selectedStatus === 'all' ? 'active' : ''}`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedStatus('upcoming')}
            className={`filter-status-btn ${selectedStatus === 'upcoming' ? 'active' : ''}`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setSelectedStatus('completed')}
            className={`filter-status-btn ${selectedStatus === 'completed' ? 'active' : ''}`}
          >
            Completed
          </button>
        </div>
      </div>
    </div>

    {/* Search Row */}

  </div>
</div>

        {/* Matches Section */}
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading matches...</p>
          </div>
        ) : Object.keys(matchesByBracket).length > 0 ? (
          <div className="matches-section">
            {Object.entries(matchesByBracket).map(([bracket, bracketMatches]) => {
              // Paginate within each bracket
              const startIdx = (currentPage - 1) * matchesPerPage;
              const endIdx = startIdx + matchesPerPage;
              const paginatedMatches = bracketMatches.slice(startIdx, endIdx);
              
              return (
                <div key={bracket} className="bracket-section">
                  <div className="bracket-header">
                    <FaMedal className="bracket-icon" />
                    <h2 className="bracket-title">{bracket}</h2>
                    <span className="bracket-count">
                      ({bracketMatches.length} {bracketMatches.length === 1 ? 'match' : 'matches'})
                    </span>
                  </div>

                  <div className="matches-grid">
                    {paginatedMatches.map(match => {
                      const matchDateTime = formatScheduleDateTime(match.date, match.time);
                      const status = getScheduleStatus(match.date, match.time);
                      
                      return (
                        <div key={match.id} className={`match-card ${status}`}>
                          {/* Match Header */}
                          <div className="match-card-header">
                            <div className="match-info">
                              <FaTrophy className="info-icon" />
                              <span className="tournament-name">{selectedRecentEvent?.name}</span>
                              <span className="info-divider">•</span>
                              <span className="round-name">{formatRoundDisplay(match)}</span>
                            </div>
                            {getStatusBadge(status)}
                          </div>

                          {/* Match Body */}
                          <div className="match-card-body">
                            <div className="teams-container">
                              {/* Team 1 */}
                              <div className="team-side team-left">
                                <span className="team-logo">
                                  {match.sport_type === 'basketball' ? '🏀' : '🏐'}
                                </span>
                                <div className="team-details">
                                  <h3 className="team-name">{match.team1_name || "TBD"}</h3>
                                  <p className="team-record">{formatTeamRecord(match.team1_name)}</p>
                                </div>
                              </div>

                              {/* Score/VS */}
                              <div className="match-center">
                                {status === 'completed' ? (
                                  <div className="score-container completed">
                                    <div className="final-score">
                                      <span className="score-number">{match.score_team1 || 0}</span>
                                      <span className="score-divider">-</span>
                                      <span className="score-number">{match.score_team2 || 0}</span>
                                    </div>
                                    <div className="final-label">Final Score</div>
                                    <div className="match-datetime">
                                      <div className="datetime-item">
                                        <FaCalendarAlt className="datetime-icon" />
                                        <span>{matchDateTime.date}</span>
                                      </div>
                                      <div className="datetime-item">
                                        <FaClock className="datetime-icon" />
                                        <span>{matchDateTime.time}</span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="score-container upcoming">
                                    <div className="vs-text">VS</div>
                                    <div className="match-datetime scheduled">
                                      <div className="datetime-item">
                                        <FaCalendarAlt className="datetime-icon" />
                                        <span>{matchDateTime.date}</span>
                                      </div>
                                      <div className="datetime-item">
                                        <FaClock className="datetime-icon" />
                                        <span>{matchDateTime.time}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Team 2 */}
                              <div className="team-side team-right">
                                <div className="team-details">
                                  <h3 className="team-name">{match.team2_name || "TBD"}</h3>
                                  <p className="team-record">{formatTeamRecord(match.team2_name)}</p>
                                </div>
                                <span className="team-logo">
                                  {match.sport_type === 'basketball' ? '🏀' : '🏐'}
                                </span>
                              </div>
                            </div>

                            {/* Match Footer */}
                            <div className="match-card-footer">
                              <div className="venue-info">
                                <FaMapMarkerAlt className="venue-icon" />
                                <span>{match.venue || 'Venue TBD'}</span>
                              </div>
                              {status === 'completed' && (
                                <button 
                                  className="view-stats-btn"
                                  onClick={() => handleViewStats(match)}
                                >
                                  View Stats →
                                </button>
                              )}
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
              <div className="pagination-container">
                <div className="pagination-info">
                  Page {currentPage} of {totalPages}
                </div>
                
                <div className="pagination-controls">
                  <button 
                    className="pagination-btn"
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  
                  <div className="pagination-numbers">
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
                            className={`pagination-number ${currentPage === pageNumber ? 'active' : ''}`}
                            onClick={() => paginate(pageNumber)}
                          >
                            {pageNumber}
                          </button>
                        );
                      } else if (
                        pageNumber === currentPage - 2 ||
                        pageNumber === currentPage + 2
                      ) {
                        return <span key={pageNumber} className="pagination-ellipsis">...</span>;
                      }
                      return null;
                    })}
                  </div>
                  
                  <button 
                    className="pagination-btn"
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            <div className="matches-info">
              Showing {indexOfFirstMatch + 1}-{Math.min(indexOfLastMatch, filteredMatches.length)} of {filteredMatches.length} matches
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <FaTrophy className="empty-icon" />
            <h3>No matches found</h3>
            <p>Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Stats Modal */}
      {showStatsModal && (
        <div className="modal-overlay" onClick={handleCloseStatsModal}>
          <div className="modal-content stats-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <h2>Match Statistics</h2>
                {selectedMatchStats && (
                  <div className="match-title">
                    {selectedMatchStats.team1_name} vs {selectedMatchStats.team2_name}
                    <div className="match-date-time-modal">
                      {formatScheduleDateTime(selectedMatchStats.date, selectedMatchStats.time).full}
                    </div>
                  </div>
                )}
              </div>
              <button className="close-btn" onClick={handleCloseStatsModal}>
                ×
              </button>
            </div>
            
            <div className="modal-body stats-modal-body">
              {statsLoading ? (
                <div className="stats-loading">
                  <div className="loading-spinner"></div>
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