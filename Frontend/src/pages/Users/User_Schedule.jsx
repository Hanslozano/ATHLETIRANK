import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MdSchedule } from "react-icons/md";
import '../../style/User_SchedulePage.css';

const UserSchedulePage = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [events, setEvents] = useState([]);
  
  // Recent matches state
  const [recentEvents, setRecentEvents] = useState([]);
  const [selectedRecentEvent, setSelectedRecentEvent] = useState(null);
  const [recentBrackets, setRecentBrackets] = useState([]);
  const [selectedRecentBracket, setSelectedRecentBracket] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);

  // All tournaments state
  const [allEvents, setAllEvents] = useState([]);
  const [allBrackets, setAllBrackets] = useState([]);
  const [selectedAllBracket, setSelectedAllBracket] = useState(null);
  const [allMatches, setAllMatches] = useState([]);
  const [allSportFilter, setAllSportFilter] = useState("all");

  // Pagination state
  const [currentRecentPage, setCurrentRecentPage] = useState(1);
  const [currentSchedulePage, setCurrentSchedulePage] = useState(1);
  const [matchesPerPage] = useState(2);
  const [schedulesPerPage] = useState(6);

  // Stats modal state
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedMatchStats, setSelectedMatchStats] = useState(null);
  const [playerStats, setPlayerStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const sports = ["Basketball", "Volleyball"];

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
      // Handle different date formats
      let dateObj;
      if (date.includes('-')) {
        // Format: YYYY-MM-DD
        const [year, month, day] = date.split('-');
        const [hours, minutes] = time.split(':');
        dateObj = new Date(year, month - 1, day, hours, minutes);
      } else if (date.includes('/')) {
        // Format: MM/DD/YYYY or similar
        dateObj = new Date(`${date} ${time}`);
      } else {
        // Try direct parsing
        dateObj = new Date(`${date} ${time}`);
      }
      
      // Check if date is valid
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

  // Enhanced function to get schedule data for matches
  const getScheduleDataForMatch = (match) => {
    if (!match || !schedules.length) return null;
    
    // Try multiple matching strategies
    
    // 1. Direct match by match ID
    const directMatch = schedules.find(schedule => 
      schedule.matchId === match.id
    );
    if (directMatch) return directMatch;
    
    // 2. Match by bracket and teams
    const bracketTeamMatch = schedules.find(schedule => 
      schedule.bracketId === match.bracket_id &&
      (
        (schedule.team1_name === match.team1_name && schedule.team2_name === match.team2_name) ||
        (schedule.team1_name === match.team2_name && schedule.team2_name === match.team1_name)
      )
    );
    if (bracketTeamMatch) return bracketTeamMatch;
    
    // 3. Match by teams only (case insensitive)
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

  // Fetch all events
  const fetchAllEvents = async () => {
    try {
      const ongoingRes = await fetch("http://localhost:5000/api/events");
      const ongoingData = await ongoingRes.json();
      
      const completedRes = await fetch("http://localhost:5000/api/awards/events/completed");
      const completedData = await completedRes.json();
      
      const allEventsData = [...ongoingData, ...completedData];
      
      // Remove duplicates based on event ID
      const uniqueEvents = allEventsData.reduce((acc, current) => {
        const x = acc.find(item => item.id === current.id);
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, []);
      
      // Sort by creation date (most recent first)
      const sortedEvents = uniqueEvents.sort((a, b) => {
        const dateA = new Date(a.created_at || a.id);
        const dateB = new Date(b.created_at || b.id);
        return dateB - dateA;
      });

      setAllEvents(sortedEvents);
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

  // Fetch brackets for events
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

  // Enhanced function to fetch matches with proper schedule data
  const fetchMatchesForRecentBracket = async (bracketId) => {
    try {
      const matchRes = await fetch(`http://localhost:5000/api/stats/${bracketId}/matches`);
      const matchData = await matchRes.json();
      
      // Enhance matches with schedule data
      const enhancedMatches = matchData.map(match => {
        const scheduleData = getScheduleDataForMatch(match);
        
        // Use schedule date/time if available, otherwise check match data
        let finalDate = scheduleData?.date || match.date;
        let finalTime = scheduleData?.time || match.time;
        
        // If both are still TBD, check scheduled_at field
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
          scheduleData: scheduleData // Keep reference to full schedule data
        };
      });
      
      // Sort matches by date and time (most recent first)
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
      setCurrentRecentPage(1);
    } catch (err) {
      console.error("Error fetching recent matches:", err);
      setRecentMatches([]);
    }
  };

  // Handle recent event change
  const handleRecentEventChange = async (eventId) => {
    const event = recentEvents.find(e => e.id === parseInt(eventId));
    if (event) {
      setSelectedRecentEvent(event);
      await fetchBracketsForRecentEvent(event.id);
    }
  };

  // Handle recent bracket change
  const handleRecentBracketChange = async (bracketId) => {
    const bracket = recentBrackets.find(b => b.id === parseInt(bracketId));
    if (bracket) {
      setSelectedRecentBracket(bracket);
      await fetchMatchesForRecentBracket(bracket.id);
    }
  };

  // Handle view stats button click
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

  // Close stats modal
  const handleCloseStatsModal = () => {
    setShowStatsModal(false);
    setSelectedMatchStats(null);
    setPlayerStats([]);
  };

  // Pagination logic for recent matches
  const recentIndexOfLastMatch = currentRecentPage * matchesPerPage;
  const recentIndexOfFirstMatch = recentIndexOfLastMatch - matchesPerPage;
  const currentRecentMatches = recentMatches.slice(recentIndexOfFirstMatch, recentIndexOfLastMatch);
  const recentTotalPages = Math.ceil(recentMatches.length / matchesPerPage);

  // Pagination logic for schedules
  const scheduleIndexOfLastMatch = currentSchedulePage * schedulesPerPage;
  const scheduleIndexOfFirstMatch = scheduleIndexOfLastMatch - schedulesPerPage;

  const paginateRecent = (pageNumber) => {
    setCurrentRecentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const paginateSchedule = (pageNumber) => {
    setCurrentSchedulePage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        
        // Sort schedules by creation date (most recent first)
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

  const getScheduleStatus = (date, time) => {
    if (!date || !time || date === 'Date TBD' || time === 'Time TBD') return 'past';
    
    try {
      const scheduleDateTime = new Date(`${date} ${time}`);
      const now = new Date();
      return scheduleDateTime > now ? 'upcoming' : 'past';
    } catch (error) {
      return 'past';
    }
  };

  // Filter schedules based on search and filters
  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = 
      (schedule.team1_name && schedule.team1_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (schedule.team2_name && schedule.team2_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (schedule.event_name && schedule.event_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (schedule.venue && schedule.venue.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSport = selectedSport === "" || schedule.sport_type === selectedSport.toLowerCase();
    
    return matchesSearch && matchesSport;
  });

  // Get current schedules for pagination
  const currentSchedules = filteredSchedules.slice(scheduleIndexOfFirstMatch, scheduleIndexOfLastMatch);
  const scheduleTotalPages = Math.ceil(filteredSchedules.length / schedulesPerPage);

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  const handleViewSchedule = (schedule) => {
    setSelectedSchedule(schedule);
  };

  const handleCloseModal = () => {
    setSelectedSchedule(null);
  };

  // Render match cards component - ENHANCED with schedule data
  const renderMatchCards = (matches, paginateFunction, currentPage, totalPages, indexOfFirstMatch, indexOfLastMatch, totalMatches) => {
    return (
      <div className="match-by-match-view">
        {/* Matches Grid - Single Column Rectangle Layout */}
        <div className="recent-matches-grid-single">
          {matches.map((match) => {
            const matchDateTime = formatScheduleDateTime(match.date, match.time);
            const status = getScheduleStatus(match.date, match.time);
            
            return (
              <div key={match.id} className={`recent-match-card-rectangle ${status}`}>
                {/* Header with Sport, Date, Time and Status */}
                <div className="match-card-header-rectangle">
                  <div className="match-sport-info-rectangle">
                    <span className="sport-type-rectangle">
                      {match.sport_type ? capitalize(match.sport_type) : "Unknown Sport"}
                    </span>
                    <span className={`match-status-badge-rectangle ${status}`}>
                      {status === 'upcoming' ? 'Upcoming' : 'Completed'}
                    </span>
                  </div>
                  <div className="match-date-time-rectangle">
                    <div className="date-time-display">
                      <span className="match-date-rectangle">
                        📅 {matchDateTime.date}
                      </span>
                      <span className="match-time-rectangle">
                        ⏰ {matchDateTime.time}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Teams and Score Row */}
                <div className="match-teams-row-rectangle">
                  <div className="team-info-rectangle">
                    <span className="team-name-rectangle">{match.team1_name || "TBD"}</span>
                    <span className="team-record-rectangle">{formatTeamRecord(match.team1_name)}</span>
                  </div>

                  <div className="match-vs-rectangle">
                    <span className="vs-text-rectangle">VS</span>
                    <span className="match-score-rectangle">
                      {match.score_team1 || 0} - {match.score_team2 || 0}
                    </span>
                  </div>

                  <div className="team-info-rectangle">
                    <span className="team-name-rectangle">{match.team2_name || "TBD"}</span>
                    <span className="team-record-rectangle">{formatTeamRecord(match.team2_name)}</span>
                  </div>
                </div>

                {/* Footer with View Stats Button */}
                <div className="match-card-footer-rectangle">
                  <button 
                    className="view-stats-btn-rectangle"
                    onClick={() => handleViewStats(match)}
                  >
                    View Stats
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="recent-matches-pagination">
            <button 
              className="pagination-btn"
              onClick={() => paginateFunction(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            
            <div className="pagination-info">
              Page {currentPage} of {totalPages}
            </div>
            
            <button 
              className="pagination-btn"
              onClick={() => paginateFunction(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}

        {/* Results Info */}
        <div className="recent-matches-info">
          Showing {indexOfFirstMatch + 1}-{Math.min(indexOfLastMatch, totalMatches)} of {totalMatches} matches
        </div>
      </div>
    );
  };

  // Render schedule cards with pagination
  const renderScheduleCards = () => {
    return (
      <div className="schedule-view">
        {/* Schedule Grid */}
        <div className="schedule-grid-new">
          {currentSchedules.map(schedule => {
            const dateTime = formatScheduleDateTime(schedule.date, schedule.time);
            const status = getScheduleStatus(schedule.date, schedule.time);
            
            return (
              <div key={schedule.id} className={`schedule-card-new ${status}`}>
                <div className="schedule-card-header-new">
                  <div className="match-sport-info">
                    <span className="sport-type-new">{schedule.sport_type ? capitalize(schedule.sport_type) : "Unknown"}</span>
                    <span className={`status-badge-new ${status}`}>
                      {status === 'upcoming' ? 'Upcoming' : 'Completed'}
                    </span>
                  </div>
                  <div className="match-date-new">
                    <span className="date-day">{dateTime.dayOfWeek}</span>
                    <span className="date-full">{dateTime.shortDate} • {dateTime.time}</span>
                  </div>
                </div>
                
                <div className="schedule-card-body-new">
                  <div className="teams-container-new">
                    <div className="team-new">
                      <div className="team-name-new">{schedule.team1_name || "TBD"}</div>
                      <div className="team-record">
                        {formatTeamRecord(schedule.team1_name)}
                      </div>
                    </div>
                    
                    <div className="vs-section-new">
                      <span className="vs-text">vs</span>
                    </div>
                    
                    <div className="team-new">
                      <div className="team-name-new">{schedule.team2_name || "TBD"}</div>
                      <div className="team-record">
                        {formatTeamRecord(schedule.team2_name)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="match-details-new">
                    <div className="detail-row">
                      <span className="detail-icon">🏆</span>
                      <span className="detail-text">{schedule.event_name || "Unknown Event"}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-icon">📍</span>
                      <span className="detail-text">{schedule.venue || "Venue TBD"}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-icon">📋</span>
                      <span className="detail-text">{formatRoundDisplay(schedule)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Controls for Schedules */}
        {scheduleTotalPages > 1 && (
          <div className="schedule-pagination">
            <button 
              className="pagination-btn"
              onClick={() => paginateSchedule(currentSchedulePage - 1)}
              disabled={currentSchedulePage === 1}
            >
              Previous
            </button>
            
            <div className="pagination-info">
              Page {currentSchedulePage} of {scheduleTotalPages}
            </div>
            
            <button 
              className="pagination-btn"
              onClick={() => paginateSchedule(currentSchedulePage + 1)}
              disabled={currentSchedulePage === scheduleTotalPages}
            >
              Next
            </button>
          </div>
        )}

        {/* Results Info for Schedules */}
        <div className="schedule-info">
          Showing {scheduleIndexOfFirstMatch + 1}-{Math.min(scheduleIndexOfLastMatch, filteredSchedules.length)} of {filteredSchedules.length} scheduled matches
        </div>
      </div>
    );
  };

  // Render match stats table
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
      <div className="schedule-header">
        <div className="header-content">
          <div className="header-top">
            <button className="back-btn" onClick={handleBackToHome}>
              <span className="back-arrow">←</span>
              Back to Home
            </button>
          </div>
          
          <div className="header-title-section">
            <h1><MdSchedule className="header-icon"/>Match Schedule</h1>
            <p>View all upcoming and past tournament matches</p>
          </div>
        </div>
      </div>

      <div className="schedule-container">
        {/* Recent Matches Section - Now with tournament dropdown */}
        <div className="recent-matches-section">
          <div className="recent-container-1">
            <div className="recent-filter-row">
              <div className="filter-group">
                <label>Tournament</label>
                <select
                  value={selectedRecentEvent?.id || ""}
                  onChange={(e) => handleRecentEventChange(e.target.value)}
                  className="recent-select"
                >
                  {recentEvents.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label>Bracket</label>
                <select
                  value={selectedRecentBracket?.id || ""}
                  onChange={(e) => handleRecentBracketChange(e.target.value)}
                  className="recent-select"
                  disabled={recentBrackets.length === 0}
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

          {/* Match-by-Match View with Pagination */}
          {loading ? (
            <div className="recent-loading">
              <div className="loading-spinner"></div>
              <p>Loading recent matches...</p>
            </div>
          ) : recentMatches.length === 0 ? (
            <div className="recent-empty">
              <p>No matches found for the selected bracket</p>
            </div>
          ) : (
            renderMatchCards(
              currentRecentMatches, 
              paginateRecent, 
              currentRecentPage, 
              recentTotalPages, 
              recentIndexOfFirstMatch, 
              recentIndexOfLastMatch, 
              recentMatches.length
            )
          )}

          {/* "Match Schedules" Text Outside the Matches Container */}
          <div className="match-schedules-title">
            <h2>Match Schedules</h2>
          </div>

          {/* All Scheduled Games Section - Now under Recent Matches */}
          <div className="schedule-section-under-recent">
            <div className="schedule-controls">
              <div className="search-section">
                <input
                  type="text"
                  placeholder="Search teams, events, or venues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="filter-section">
                <select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className="sport-filter"
                >
                  <option value="">All Sports</option>
                  {sports.map(sport => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="schedule-content">
              {loading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Loading schedules...</p>
                </div>
              ) : filteredSchedules.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📅</div>
                  <h3>No schedules found</h3>
                  <p>
                    {searchTerm || selectedSport
                      ? "Try adjusting your search or filter criteria" 
                      : "No matches have been scheduled yet"
                    }
                  </p>
                </div>
              ) : (
                <>
                  <div className="schedule-stats">
                    <span className="stats-text">
                      Showing {filteredSchedules.length} of {schedules.length} matches
                    </span>
                  </div>
                  {renderScheduleCards()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Detail Modal */}
      {selectedSchedule && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <h2>Match Details</h2>
                <span className={`sport-badge sport-${selectedSchedule.sport_type || "default"}`}>
                  {selectedSchedule.sport_type ? capitalize(selectedSchedule.sport_type) : "Unknown"}
                </span>
              </div>
              <button className="close-btn" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="match-details">
                <div className="teams-display">
                  <div className="team-side">
                    <h3>{selectedSchedule.team1_name || "TBD"}</h3>
                    <div className="team-record-modal">
                      {formatTeamRecord(selectedSchedule.team1_name)}
                    </div>
                    <span className="team-label">Team 1</span>
                  </div>
                  <div className="vs-divider">VS</div>
                  <div className="team-side">
                    <h3>{selectedSchedule.team2_name || "TBD"}</h3>
                    <div className="team-record-modal">
                      {formatTeamRecord(selectedSchedule.team2_name)}
                    </div>
                    <span className="team-label">Team 2</span>
                  </div>
                </div>
                
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Event</span>
                    <span className="detail-value">{selectedSchedule.event_name || "Unknown"}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Bracket</span>
                    <span className="detail-value">{selectedSchedule.bracket_name || "Unknown"}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Round</span>
                    <span className="detail-value">{formatRoundDisplay(selectedSchedule)}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Date & Time</span>
                    <span className="detail-value">
                      {formatScheduleDateTime(selectedSchedule.date, selectedSchedule.time).full}
                    </span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Venue</span>
                    <span className="detail-value">{selectedSchedule.venue}</span>
                  </div>
                  
                  {selectedSchedule.description && (
                    <div className="detail-item full-width">
                      <span className="detail-label">Additional Notes</span>
                      <span className="detail-value">{selectedSchedule.description}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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