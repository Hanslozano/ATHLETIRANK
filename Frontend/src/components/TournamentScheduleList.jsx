import React, { useState, useEffect } from 'react';
import { Search, Calendar, Clock, Plus, X, Edit, Trash2, BarChart3, Zap, CheckCircle, Trophy, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

const TournamentScheduleList = ({ matches = [], eventId, bracketId, onRefresh, onViewStats, isStaffView, onInputStats }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRound, setFilterRound] = useState('all');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showBulkScheduleModal, setShowBulkScheduleModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showTBDMatches, setShowTBDMatches] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    startTime: '',
    endTime: ''
  });
  const [bulkScheduleForm, setBulkScheduleForm] = useState({
    date: '',
    startTime: '09:00',
    matchDuration: 60,
    breakDuration: 15,
    scheduleMode: 'single',
    roundDates: {}
  });
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [showStandings, setShowStandings] = useState(false);
  const [groupByRound, setGroupByRound] = useState(true);
  const [collapsedRounds, setCollapsedRounds] = useState({});

  const getUniqueRoundsForScheduling = () => {
    const rounds = [...new Set(unscheduledMatches.map(m => m.round_number))].sort((a, b) => a - b);
    return rounds;
  };

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', '#3b82f6');
    root.style.setProperty('--error-color', '#ef4444');
    root.style.setProperty('--success-color', '#10b981');
    root.style.setProperty('--warning-color', '#f59e0b');
    root.style.setProperty('--background-primary', '#0a0f1c');
    root.style.setProperty('--background-secondary', '#1a2332');
    root.style.setProperty('--background-card', '#0f172a');
    root.style.setProperty('--text-primary', '#e2e8f0');
    root.style.setProperty('--text-secondary', '#94a3b8');
    root.style.setProperty('--text-muted', '#64748b');
    root.style.setProperty('--border-color', '#2d3748');
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [matches, bracketId]);

  const fetchSchedules = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/schedules');
      if (res.ok) {
        const data = await res.json();
        const filteredSchedules = data.filter(s => s.bracketId === bracketId);
        setSchedules(filteredSchedules);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    }
  };

  const formatRoundDisplay = (match) => {
    if (!match) return '';
    const roundNum = match.round_number;
    
    if (match.bracket_type === 'round_robin') {
      return `Round ${roundNum}`;
    }
    
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

  const formatScheduleDisplay = (schedule) => {
    if (!schedule || !schedule.date) return null;
    
    const date = new Date(schedule.date + 'T00:00:00');
    const dateStr = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
    
    const startTime = schedule.time;
    const endTime = schedule.endTime;
    
    if (!startTime) return dateStr;
    
    const formatTime = (time) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };
    
    const startDisplay = formatTime(startTime);
    const endDisplay = endTime ? `-${formatTime(endTime)}` : '';
    
    return `${dateStr} • ${startDisplay}${endDisplay}`;
  };

  const getScheduleForMatch = (matchId) => {
    return schedules.find(s => s.matchId === matchId);
  };

  const getUniqueRounds = () => {
    const rounds = matches.map(match => match.round_number);
    const uniqueRounds = [...new Set(rounds)].sort((a, b) => a - b);
    return uniqueRounds.map(round => ({
      value: round,
      label: formatRoundDisplay({ 
        round_number: round, 
        bracket_type: matches.find(m => m.round_number === round)?.bracket_type 
      })
    }));
  };

  const filteredMatches = matches.filter(match => {
    if (!showTBDMatches && (!match.team1_name || !match.team2_name)) {
      return false;
    }
    
    const matchesSearch = 
      match.team1_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.team2_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.id.toString().includes(searchTerm);
    
    const matchesStatus = filterStatus === 'all' || match.status === filterStatus;
    const matchesRound = filterRound === 'all' || match.round_number.toString() === filterRound;
    
    return matchesSearch && matchesStatus && matchesRound;
  });

  const getStatusColor = (status, hasSchedule) => {
    if (!hasSchedule && status === 'scheduled') {
      return 'status-pending';
    }
    
    switch(status) {
      case 'completed': return 'status-completed';
      case 'scheduled': return 'status-scheduled';
      case 'bye': return 'status-bye';
      default: return 'status-pending';
    }
  };
  
  const getStatusDisplay = (match, schedule) => {
    if (match.status === 'bye') return { text: 'BYE', icon: null };
    if (match.status === 'completed') return { text: 'COMPLETED', icon: <CheckCircle style={{ width: '12px', height: '12px' }} /> };
    if (match.status === 'scheduled' && !schedule) {
      return { text: 'PENDING', icon: <AlertCircle style={{ width: '12px', height: '12px' }} /> };
    }
    if (schedule) return { text: 'SCHEDULED', icon: <Calendar style={{ width: '12px', height: '12px' }} /> };
    return { text: 'PENDING', icon: <AlertCircle style={{ width: '12px', height: '12px' }} /> };
  };

  const isRoundRobin = matches.length > 0 && matches[0].bracket_type === 'round_robin';
  
  const unscheduledMatches = matches.filter(m => 
    m.status !== 'bye' && 
    m.team1_name && 
    m.team2_name && 
    !getScheduleForMatch(m.id)
  );

  const canBulkSchedule = isRoundRobin && unscheduledMatches.length > 0;

  const calculateStandings = () => {
    if (!isRoundRobin) return [];
    
    const standings = {};
    const teamsSet = new Set();
    
    matches.forEach(match => {
      if (match.team1_name) teamsSet.add(match.team1_name);
      if (match.team2_name) teamsSet.add(match.team2_name);
    });
    
    teamsSet.forEach(team => {
      standings[team] = {
        team: team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0
      };
    });

    matches.forEach(match => {
      if (match.status === 'completed' && match.team1_name && match.team2_name) {
        const team1 = match.team1_name;
        const team2 = match.team2_name;
        const score1 = match.score_team1 || 0;
        const score2 = match.score_team2 || 0;

        standings[team1].played++;
        standings[team2].played++;
        standings[team1].goalsFor += score1;
        standings[team1].goalsAgainst += score2;
        standings[team2].goalsFor += score2;
        standings[team2].goalsAgainst += score1;

        if (match.winner_id === match.team1_id) {
          standings[team1].won++;
          standings[team1].points += 3;
          standings[team2].lost++;
        } else if (match.winner_id === match.team2_id) {
          standings[team2].won++;
          standings[team2].points += 3;
          standings[team1].lost++;
        } else if (score1 === score2) {
          standings[team1].drawn++;
          standings[team2].drawn++;
          standings[team1].points += 1;
          standings[team2].points += 1;
        }

        standings[team1].goalDifference = standings[team1].goalsFor - standings[team1].goalsAgainst;
        standings[team2].goalDifference = standings[team2].goalsFor - standings[team2].goalsAgainst;
      }
    });

    return Object.values(standings).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  };

  const standings = calculateStandings();
  const allMatchesCompleted = matches.every(m => m.status === 'completed' || m.status === 'bye');

  // Group matches by round
  const groupedMatches = filteredMatches.reduce((acc, match) => {
    const round = match.round_number;
    if (!acc[round]) {
      acc[round] = [];
    }
    acc[round].push(match);
    return acc;
  }, {});

  const sortedRounds = Object.keys(groupedMatches).sort((a, b) => Number(a) - Number(b));

  const toggleRound = (roundNumber) => {
    setCollapsedRounds(prev => ({
      ...prev,
      [roundNumber]: !prev[roundNumber]
    }));
  };

  const calculateBulkScheduleTimes = () => {
    if (bulkScheduleForm.scheduleMode === 'single') {
      if (!bulkScheduleForm.date || !bulkScheduleForm.startTime) return [];
      
      const times = [];
      let currentTime = bulkScheduleForm.startTime;
      
      unscheduledMatches.forEach((match) => {
        const [hours, minutes] = currentTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + parseInt(bulkScheduleForm.matchDuration);
        const nextStartMinutes = endMinutes + parseInt(bulkScheduleForm.breakDuration);
        
        const formatTimeFromMinutes = (mins) => {
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };
        
        times.push({
          match,
          date: bulkScheduleForm.date,
          startTime: currentTime,
          endTime: formatTimeFromMinutes(endMinutes)
        });
        
        currentTime = formatTimeFromMinutes(nextStartMinutes);
      });
      
      return times;
    } else {
      const rounds = getUniqueRoundsForScheduling();
      const allRoundsFilled = rounds.every(r => bulkScheduleForm.roundDates[r]);
      
      if (!allRoundsFilled || !bulkScheduleForm.startTime) return [];
      
      const times = [];
      
      rounds.forEach(roundNum => {
        const roundMatches = unscheduledMatches.filter(m => m.round_number === roundNum);
        let currentTime = bulkScheduleForm.startTime;
        
        roundMatches.forEach(match => {
          const [hours, minutes] = currentTime.split(':').map(Number);
          const startMinutes = hours * 60 + minutes;
          const endMinutes = startMinutes + parseInt(bulkScheduleForm.matchDuration);
          const nextStartMinutes = endMinutes + parseInt(bulkScheduleForm.breakDuration);
          
          const formatTimeFromMinutes = (mins) => {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          };
          
          times.push({
            match,
            date: bulkScheduleForm.roundDates[roundNum],
            startTime: currentTime,
            endTime: formatTimeFromMinutes(endMinutes)
          });
          
          currentTime = formatTimeFromMinutes(nextStartMinutes);
        });
      });
      
      return times;
    }
  };

  const handleBulkSchedule = async () => {
    const isValid = bulkScheduleForm.scheduleMode === 'single' 
      ? (bulkScheduleForm.date && bulkScheduleForm.startTime)
      : (bulkScheduleForm.startTime && getUniqueRoundsForScheduling().every(r => bulkScheduleForm.roundDates[r]));
    
    if (!isValid) {
      alert('Please fill in all required fields');
      return;
    }

    const scheduleTimes = calculateBulkScheduleTimes();
    
    setLoading(true);
    try {
      const promises = scheduleTimes.map(({ match, date, startTime, endTime }) => 
        fetch('http://localhost:5000/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: eventId,
            bracketId: bracketId,
            matchId: match.id,
            date: date,
            time: startTime,
            endTime: endTime
          })
        })
      );

      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.ok);
      
      if (failed.length > 0) {
        throw new Error(`Failed to schedule ${failed.length} matches`);
      }

      await fetchSchedules();
      if (onRefresh) await onRefresh();
      setShowBulkScheduleModal(false);
      setBulkScheduleForm({ date: '', startTime: '09:00', matchDuration: 60, breakDuration: 15, scheduleMode: 'single', roundDates: {} });
      alert(`Successfully scheduled ${scheduleTimes.length} matches!`);
    } catch (error) {
      console.error('Error bulk scheduling:', error);
      alert('Failed to schedule matches: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = (match) => {
    setSelectedMatch(match);
    const existingSchedule = getScheduleForMatch(match.id);

    if (match.status === 'bye') {
      alert('Cannot schedule a BYE match');
      return;
    }

    if (!match.team1_name || !match.team2_name) {
      alert('Cannot schedule matches with TBD teams. Wait for previous round to complete.');
      return;
    }
    
    if (existingSchedule) {
      setScheduleForm({
        date: existingSchedule.date,
        startTime: existingSchedule.time || '',
        endTime: existingSchedule.endTime || ''
      });
    } else {
      setScheduleForm({
        date: '',
        startTime: '',
        endTime: ''
      });
    }
    setShowScheduleModal(true);
  };

  const handleDeleteSchedule = async (match) => {
    const schedule = getScheduleForMatch(match.id);
    if (!schedule) return;

    if (!window.confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/schedules/${schedule.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      await fetchSchedules();
      if (onRefresh) await onRefresh();
      alert('Schedule deleted successfully!');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewStats = (match) => {
    sessionStorage.setItem('selectedMatchData', JSON.stringify({
      matchId: match.id,
      eventId: eventId,
      bracketId: bracketId,
      match: match
    }));
    
    if (onViewStats) {
      onViewStats(match);
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForm.date || !scheduleForm.startTime) {
      alert('Please fill in date and start time');
      return;
    }

    setLoading(true);
    try {
      const existingSchedule = getScheduleForMatch(selectedMatch.id);
      
      if (existingSchedule) {
        const res = await fetch(`http://localhost:5000/api/schedules/${existingSchedule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: scheduleForm.date,
            time: scheduleForm.startTime,
            endTime: scheduleForm.endTime
          })
        });

        if (!res.ok) throw new Error('Failed to update schedule');
      } else {
        const res = await fetch('http://localhost:5000/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: eventId,
            bracketId: bracketId,
            matchId: selectedMatch.id,
            date: scheduleForm.date,
            time: scheduleForm.startTime,
            endTime: scheduleForm.endTime
          })
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || 'Failed to create schedule');
        }
      }

      await fetchSchedules();
      if (onRefresh) await onRefresh();
      setShowScheduleModal(false);
      setSelectedMatch(null);
      setScheduleForm({ date: '', startTime: '', endTime: '' });
      alert('Schedule saved successfully!');
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Failed to save schedule: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const rounds = getUniqueRounds();
  const bulkScheduleTimes = calculateBulkScheduleTimes();

  // Get match index (numbering)
  const getMatchNumber = (matchId) => {
    return matches.findIndex(m => m.id === matchId) + 1;
  };

  const renderMatchCard = (match, index) => {
    const schedule = getScheduleForMatch(match.id);
    const scheduleDisplay = formatScheduleDisplay(schedule);
    const isResetFinal = match.round_number === 201;
    const isChampionship = match.round_number === 200 || match.round_number === 201;
    const hasStats = match.status === 'completed' && match.status !== 'bye' && (match.score_team1 !== null || match.mvp_name);
    const isTBD = !match.team1_name || !match.team2_name;
    const canSchedule = !isTBD && match.status !== 'bye';
    const statusInfo = getStatusDisplay(match, schedule);
    const matchNumber = getMatchNumber(match.id);

    const getRowBackground = () => {
      if (match.status === 'bye') return 'rgba(148, 163, 184, 0.05)';
      if (match.status === 'completed') return 'rgba(16, 185, 129, 0.05)';
      if (schedule) return 'rgba(249, 115, 22, 0.05)';
      return 'transparent';
    };

    const getRowBorder = () => {
      if (match.status === 'completed') return '1px solid rgba(16, 185, 129, 0.2)';
      return '1px solid #2d3748';
    };

    return (
      <div
        key={match.id}
        style={{
          background: getRowBackground(),
          border: getRowBorder(),
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '12px',
          opacity: isTBD ? 0.6 : 1,
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          if (!isTBD) {
            e.currentTarget.style.transform = 'translateX(4px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateX(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          {/* Match Number */}
          <div style={{ 
            minWidth: '50px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px'
          }}>
            <div style={{ 
              background: 'rgba(99, 102, 241, 0.2)', 
              color: '#a5b4fc',
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '16px'
            }}>
              #{matchNumber}
            </div>
          </div>

          {/* Teams & Score */}
          <div style={{ flex: 1, minWidth: '250px' }}>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>
              <span style={{ color: match.winner_id === match.team1_id ? '#10b981' : '#e2e8f0' }}>
                {match.team1_name || 'TBD'}
              </span>
              {match.status === 'completed' && match.score_team1 !== null && (
                <span style={{ 
                  color: '#3b82f6', 
                  fontWeight: '800',
                  margin: '0 8px',
                  fontSize: '18px'
                }}>
                  [{match.score_team1}]
                </span>
              )}
              <span style={{ color: '#64748b', margin: '0 8px', fontWeight: '500' }}>vs</span>
              {match.status === 'completed' && match.score_team2 !== null && (
                <span style={{ 
                  color: '#3b82f6', 
                  fontWeight: '800',
                  margin: '0 8px',
                  fontSize: '18px'
                }}>
                  [{match.score_team2}]
                </span>
              )}
              <span style={{ color: match.winner_id === match.team2_id ? '#10b981' : '#e2e8f0' }}>
                {match.team2_name || 'TBD'}
              </span>
            </div>
            {isTBD && (
              <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⏳ Waiting for previous round
              </div>
            )}
            {match.winner_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <Trophy style={{ width: '14px', height: '14px', color: '#f59e0b' }} />
                <span style={{ color: '#10b981', fontWeight: '600', fontSize: '14px' }}>
                  {match.winner_name}
                  {isChampionship && ' 👑'}
                  {match.status === 'bye' && ' (BYE)'}
                </span>
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div style={{ minWidth: '130px', display: 'flex', justifyContent: 'center' }}>
            <div className={`match-status ${getStatusColor(match.status, schedule)}`} style={{ 
              padding: '8px 16px', 
              borderRadius: '20px', 
              fontSize: '12px', 
              fontWeight: '700', 
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minWidth: '120px',
              justifyContent: 'center'
            }}>
              {statusInfo.icon}
              {statusInfo.text}
            </div>
          </div>

          {/* Schedule Info */}
          <div style={{ minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {scheduleDisplay ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar style={{ width: '14px', height: '14px', color: '#3b82f6', flexShrink: 0 }} />
                  <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '600' }}>
                    {scheduleDisplay}
                  </span>
                </div>
              </>
            ) : (
              <span style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic' }}>
                {match.status === 'bye' ? 'N/A' : isTBD ? 'Cannot schedule' : 'Not scheduled'}
              </span>
            )}
          </div>

          {/* Actions */}
          <div style={{ minWidth: '160px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            {isStaffView && match.status !== 'completed' && match.status !== 'bye' && !isTBD && (
              <button 
                onClick={() => onInputStats && onInputStats(match)} 
                disabled={loading} 
                style={{ 
                  padding: '10px 16px', 
                  background: loading ? '#64748b' : '#10b981', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  cursor: loading ? 'not-allowed' : 'pointer', 
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }} 
                title="Input Match Statistics"
              >
                Input Stats
              </button>
            )}
            {hasStats && (
              <button 
                onClick={() => handleViewStats(match)} 
                disabled={loading} 
                style={{ 
                  padding: '10px 14px', 
                  background: loading ? '#64748b' : '#8b5cf6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }} 
                title="View Stats"
              >
                <BarChart3 style={{ width: '16px', height: '16px' }} />
              </button>
            )}
            {!isStaffView && canSchedule && (
              <>
                {scheduleDisplay ? (
                  <>
                    <button 
                      onClick={() => handleAddSchedule(match)} 
                      disabled={loading} 
                      style={{ 
                        padding: '10px 14px', 
                        background: loading ? '#64748b' : '#3b82f6', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        fontSize: '13px', 
                        fontWeight: '600', 
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }} 
                      title="Edit Schedule"
                    >
                      <Edit style={{ width: '16px', height: '16px' }} />
                    </button>
                    <button 
                      onClick={() => handleDeleteSchedule(match)} 
                      disabled={loading} 
                      style={{ 
                        padding: '10px 14px', 
                        background: loading ? '#64748b' : '#ef4444', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        fontSize: '13px', 
                        fontWeight: '600', 
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }} 
                      title="Delete Schedule"
                    >
                      <Trash2 style={{ width: '16px', height: '16px' }} />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => handleAddSchedule(match)} 
                    disabled={loading} 
                    style={{ 
                      padding: '10px 16px', 
                      background: loading ? '#64748b' : '#10b981', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '8px', 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap'
                    }} 
                    title="Add Schedule"
                  >
                    <Plus style={{ width: '16px', height: '16px' }} />
                    Schedule
                  </button>
                )}
              </>
            )}
            {!isStaffView && isTBD && (
              <span style={{ 
                padding: '10px 16px', 
                background: '#2d3748', 
                color: '#64748b', 
                borderRadius: '8px', 
                fontSize: '13px', 
                fontWeight: '600',
                whiteSpace: 'nowrap'
              }}>
                🔒 Locked
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', padding: '0' }}>
      {/* Filter Bar */}
      <div style={{ background: '#1a2332', padding: '24px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #2d3748' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', width: '18px', height: '18px' }} />
            <input 
              type="text" 
              placeholder="Search teams or match #..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={{ 
                width: '100%', 
                padding: '12px 16px 12px 45px', 
                border: '2px solid #2d3748', 
                borderRadius: '10px', 
                fontSize: '14px', 
                backgroundColor: '#0f172a', 
                color: '#e2e8f0', 
                outline: 'none',
                fontWeight: '500'
              }} 
            />
          </div>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            style={{ 
              padding: '12px 16px', 
              border: '2px solid #2d3748', 
              borderRadius: '10px', 
              fontSize: '14px', 
              backgroundColor: '#0f172a', 
              color: '#e2e8f0', 
              minWidth: '150px', 
              outline: 'none',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Status</option>
            <option value="pending">⏳ Pending</option>
            <option value="scheduled">📅 Scheduled</option>
            <option value="completed">✅ Completed</option>
          </select>
          <select 
            value={filterRound} 
            onChange={(e) => setFilterRound(e.target.value)} 
            style={{ 
              padding: '12px 16px', 
              border: '2px solid #2d3748', 
              borderRadius: '10px', 
              fontSize: '14px', 
              backgroundColor: '#0f172a', 
              color: '#e2e8f0', 
              minWidth: '150px', 
              outline: 'none',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Rounds</option>
            {rounds.map(round => (
              <option key={round.value} value={round.value}>{round.label}</option>
            ))}
          </select>
          {!isRoundRobin && (
            <button 
              onClick={() => setShowTBDMatches(!showTBDMatches)} 
              style={{ 
                padding: '12px 20px', 
                border: '2px solid #2d3748', 
                borderRadius: '10px', 
                fontSize: '14px', 
                backgroundColor: showTBDMatches ? '#3b82f6' : '#0f172a', 
                color: '#e2e8f0', 
                cursor: 'pointer', 
                fontWeight: '700', 
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {showTBDMatches ? '✓ Show TBD' : 'Hide TBD'}
            </button>
          )}
          <button 
            onClick={() => setGroupByRound(!groupByRound)} 
            style={{ 
              padding: '12px 20px', 
              border: '2px solid #2d3748', 
              borderRadius: '10px', 
              fontSize: '14px', 
              backgroundColor: groupByRound ? '#8b5cf6' : '#0f172a', 
              color: '#e2e8f0', 
              cursor: 'pointer', 
              fontWeight: '700', 
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            {groupByRound ? '📊 Grouped' : '📋 List'}
          </button>
          {canBulkSchedule && !isStaffView && (
            <button 
              onClick={() => setShowBulkScheduleModal(true)} 
              style={{ 
                padding: '12px 24px', 
                border: 'none', 
                borderRadius: '10px', 
                fontSize: '14px', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                color: 'white', 
                cursor: 'pointer', 
                fontWeight: '700', 
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
            >
              <Zap style={{ width: '18px', height: '18px' }} />
              Schedule All ({unscheduledMatches.length})
            </button>
          )}
          {isRoundRobin && (
            <button 
              onClick={() => setShowStandings(!showStandings)} 
              style={{ 
                padding: '12px 24px', 
                border: 'none', 
                borderRadius: '10px', 
                fontSize: '14px', 
                background: showStandings 
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                  : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                color: 'white', 
                cursor: 'pointer', 
                fontWeight: '700', 
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: showStandings 
                  ? '0 4px 15px rgba(245, 158, 11, 0.4)' 
                  : '0 4px 15px rgba(59, 130, 246, 0.4)'
              }}
            >
              <BarChart3 style={{ width: '18px', height: '18px' }} />
              {showStandings ? 'Hide Standings' : 'Show Standings'}
            </button>
          )}
        </div>
      </div>

      {/* Match Count Info */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        padding: '16px 20px',
        background: '#1a2332',
        borderRadius: '10px',
        border: '1px solid #2d3748'
      }}>
        <div style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '600' }}>
          Showing {filteredMatches.length} of {matches.length} matches
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', fontWeight: '600' }}>
          <span style={{ color: '#10b981' }}>
            ✅ {matches.filter(m => m.status === 'completed').length} Completed
          </span>
          <span style={{ color: '#f59e0b' }}>
            📅 {matches.filter(m => getScheduleForMatch(m.id) && m.status !== 'completed').length} Scheduled
          </span>
          <span style={{ color: '#64748b' }}>
            ⏳ {matches.filter(m => !getScheduleForMatch(m.id) && m.status !== 'completed' && m.status !== 'bye').length} Pending
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: showStandings && isRoundRobin ? '1fr 400px' : '1fr', gap: '20px' }}>
        <div>
          {filteredMatches.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '80px 20px',
              background: '#1a2332',
              borderRadius: '12px',
              border: '1px solid #2d3748'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <div style={{ color: '#64748b', fontSize: '18px', fontWeight: '600' }}>No matches found</div>
              <div style={{ color: '#475569', fontSize: '14px', marginTop: '8px' }}>
                Try adjusting your filters
              </div>
            </div>
          ) : groupByRound ? (
            // Grouped by Round View
            sortedRounds.map(roundNumber => {
              const roundMatches = groupedMatches[roundNumber];
              const sampleMatch = roundMatches[0];
              const roundLabel = formatRoundDisplay(sampleMatch);
              const isCollapsed = collapsedRounds[roundNumber];
              
              return (
                <div key={roundNumber} style={{ marginBottom: '32px' }}>
                  <div 
                    onClick={() => toggleRound(roundNumber)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      marginBottom: '16px',
                      padding: '16px 20px',
                      background: '#0a0f1c', 
                      borderRadius: '10px',
                     border: '1px solid #2d3748',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    
                  >
                    {isCollapsed ? (
                      <ChevronDown style={{ width: '20px', height: '20px', color: '#a5b4fc' }} />
                    ) : (
                      <ChevronUp style={{ width: '20px', height: '20px', color: '#a5b4fc' }} />
                    )}
                    <div style={{ 
                      background: '#1a2332',  
                      color: '#e2e8f0',  
                      padding: '8px 20px',
                      borderRadius: '8px',
                      fontWeight: '800',
                      fontSize: '16px',
                      letterSpacing: '0.5px'
                    }}>
                      {roundLabel}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '600' }}>
                      {roundMatches.length} {roundMatches.length === 1 ? 'match' : 'matches'}
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', fontSize: '13px', fontWeight: '600' }}>
                      <span style={{ color: '#10b981' }}>
                        ✅ {roundMatches.filter(m => m.status === 'completed').length}
                      </span>
                      <span style={{ color: '#f59e0b' }}>
                        📅 {roundMatches.filter(m => getScheduleForMatch(m.id) && m.status !== 'completed').length}
                      </span>
                      <span style={{ color: '#64748b' }}>
                        ⏳ {roundMatches.filter(m => !getScheduleForMatch(m.id) && m.status !== 'completed' && m.status !== 'bye').length}
                      </span>
                    </div>
                  </div>
                  {!isCollapsed && roundMatches.map((match, index) => renderMatchCard(match, index))}
                </div>
              );
            })
          ) : (
            // Flat List View
            filteredMatches.map((match, index) => renderMatchCard(match, index))
          )}
        </div>

        {/* Standings Sidebar */}
        {showStandings && isRoundRobin && (
          <div style={{ 
            borderRadius: '12px', 
            border: '1px solid #2d3748', 
            overflow: 'hidden', 
            background: '#1a2332', 
            maxHeight: 'fit-content', 
            position: 'sticky', 
            top: '20px' 
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
              padding: '20px', 
              borderBottom: '1px solid #2d3748' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ 
                  margin: 0, 
                  color: 'white', 
                  fontSize: '18px', 
                  fontWeight: '700', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px' 
                }}>
                  <Trophy style={{ width: '20px', height: '20px' }} />
                  Team Standings
                </h3>
                {allMatchesCompleted && standings.length > 0 && (
                  <span style={{ 
                    background: 'rgba(255, 255, 255, 0.2)', 
                    padding: '6px 12px', 
                    borderRadius: '6px', 
                    fontSize: '11px', 
                    fontWeight: '800',
                    color: 'white',
                    letterSpacing: '1px'
                  }}>
                    FINAL
                  </span>
                )}
              </div>
            </div>

            <div style={{ padding: '20px' }}>
              {standings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <BarChart3 style={{ width: '48px', height: '48px', margin: '0 auto 12px', opacity: 0.3 }} />
                  <p>No standings available yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {standings.map((team, index) => (
                    <div 
                      key={team.team} 
                      style={{
                        background: index === 0 && allMatchesCompleted 
                          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%)' 
                          : 'rgba(15, 23, 42, 0.5)',
                        border: index === 0 && allMatchesCompleted 
                          ? '2px solid rgba(245, 158, 11, 0.4)' 
                          : '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '10px',
                        padding: '16px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        marginBottom: '12px' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ 
                            background: index === 0 && allMatchesCompleted 
                              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                              : 'rgba(99, 102, 241, 0.3)',
                            color: 'white',
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: '16px',
                            boxShadow: index === 0 && allMatchesCompleted 
                              ? '0 4px 12px rgba(245, 158, 11, 0.4)' 
                              : 'none'
                          }}>
                            {index === 0 && allMatchesCompleted ? '👑' : index + 1}
                          </span>
                          <div>
                            <div style={{ 
                              color: '#e2e8f0', 
                              fontWeight: '800', 
                              fontSize: '16px' 
                            }}>
                              {team.team}
                            </div>
                            <div style={{ 
                              color: '#64748b', 
                              fontSize: '12px', 
                              marginTop: '2px',
                              fontWeight: '600'
                            }}>
                              {team.played} {team.played === 1 ? 'match' : 'matches'}
                            </div>
                          </div>
                        </div>
                        <div style={{ 
                          background: 'rgba(16, 185, 129, 0.2)', 
                          padding: '10px 18px', 
                          borderRadius: '8px',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          <div style={{ 
                            color: '#10b981', 
                            fontWeight: '800', 
                            fontSize: '22px', 
                            textAlign: 'center',
                            lineHeight: '1'
                          }}>
                            {team.points}
                          </div>
                          <div style={{ 
                            color: '#6ee7b7', 
                            fontSize: '10px', 
                            textAlign: 'center', 
                            fontWeight: '700',
                            marginTop: '4px',
                            letterSpacing: '1px'
                          }}>
                            PTS
                          </div>
                        </div>
                      </div>

                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(2, 1fr)', 
                        gap: '8px'
                      }}>
                        <div style={{ 
                          background: 'rgba(16, 185, 129, 0.1)', 
                          padding: '10px', 
                          borderRadius: '8px', 
                          textAlign: 'center', 
                          border: '1px solid rgba(16, 185, 129, 0.2)' 
                        }}>
                          <div style={{ 
                            color: '#10b981', 
                            fontWeight: '800', 
                            fontSize: '18px' 
                          }}>
                            {team.won}
                          </div>
                          <div style={{ 
                            color: '#6ee7b7', 
                            fontSize: '10px', 
                            fontWeight: '700',
                            letterSpacing: '0.5px'
                          }}>
                            WINS
                          </div>
                        </div>
                        <div style={{ 
                          background: 'rgba(239, 68, 68, 0.1)', 
                          padding: '10px', 
                          borderRadius: '8px', 
                          textAlign: 'center', 
                          border: '1px solid rgba(239, 68, 68, 0.2)' 
                        }}>
                          <div style={{ 
                            color: '#ef4444', 
                            fontWeight: '800', 
                            fontSize: '18px' 
                          }}>
                            {team.lost}
                          </div>
                          <div style={{ 
                            color: '#fca5a5', 
                            fontSize: '10px', 
                            fontWeight: '700',
                            letterSpacing: '0.5px'
                          }}>
                            LOSSES
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals remain the same */}
      {showScheduleModal && (
        <div onClick={() => !loading && setShowScheduleModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#0f172a', borderRadius: '16px', width: '100%', maxWidth: '600px', border: '1px solid #2d3748', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px', borderBottom: '1px solid #2d3748' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <Calendar style={{ width: '28px', height: '28px', color: '#3b82f6' }} />
                <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: '26px', fontWeight: '700' }}>
                  {getScheduleForMatch(selectedMatch?.id) ? 'Edit Schedule' : 'Add Schedule'}
                </h2>
              </div>
              <button 
                onClick={() => !loading && setShowScheduleModal(false)} 
                disabled={loading} 
                style={{ 
                  background: 'rgba(100, 116, 139, 0.2)', 
                  border: 'none', 
                  color: '#94a3b8', 
                  cursor: loading ? 'not-allowed' : 'pointer', 
                  padding: '10px', 
                  borderRadius: '8px', 
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X style={{ width: '22px', height: '22px' }} />
              </button>
            </div>
            <div style={{ padding: '28px' }}>
              <div style={{ 
                background: 'rgba(59, 130, 246, 0.1)', 
                padding: '18px', 
                borderRadius: '12px', 
                marginBottom: '28px', 
                border: '1px solid rgba(59, 130, 246, 0.3)' 
              }}>
                <div style={{ color: '#e2e8f0', fontSize: '17px', fontWeight: '700', marginBottom: '6px' }}>
                  Match #{getMatchNumber(selectedMatch?.id)} - {formatRoundDisplay(selectedMatch)}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '15px', fontWeight: '600' }}>
                  {selectedMatch?.team1_name || 'TBD'} vs {selectedMatch?.team2_name || 'TBD'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '10px', color: '#e2e8f0', fontWeight: '700', fontSize: '15px' }}>
                    Date *
                  </label>
                  <input 
                    type="date" 
                    value={scheduleForm.date} 
                    onChange={(e) => setScheduleForm({...scheduleForm, date: e.target.value})} 
                    disabled={loading} 
                    style={{ 
                      width: '100%', 
                      padding: '14px 18px', 
                      border: '2px solid #2d3748', 
                      borderRadius: '10px', 
                      background: '#1a2332', 
                      color: '#e2e8f0', 
                      fontSize: '15px', 
                      outline: 'none',
                      fontWeight: '600'
                    }} 
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '10px', color: '#e2e8f0', fontWeight: '700', fontSize: '15px' }}>
                      Start Time *
                    </label>
                    <input 
                      type="time" 
                      value={scheduleForm.startTime} 
                      onChange={(e) => setScheduleForm({...scheduleForm, startTime: e.target.value})} 
                      disabled={loading} 
                      style={{ 
                        width: '100%', 
                        padding: '14px 18px', 
                        border: '2px solid #2d3748', 
                        borderRadius: '10px', 
                        background: '#1a2332', 
                        color: '#e2e8f0', 
                        fontSize: '15px', 
                        outline: 'none',
                        fontWeight: '600'
                      }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '10px', color: '#e2e8f0', fontWeight: '700', fontSize: '15px' }}>
                      End Time
                    </label>
                    <input 
                      type="time" 
                      value={scheduleForm.endTime} 
                      onChange={(e) => setScheduleForm({...scheduleForm, endTime: e.target.value})} 
                      disabled={loading} 
                      style={{ 
                        width: '100%', 
                        padding: '14px 18px', 
                        border: '2px solid #2d3748', 
                        borderRadius: '10px', 
                        background: '#1a2332', 
                        color: '#e2e8f0', 
                        fontSize: '15px', 
                        outline: 'none',
                        fontWeight: '600'
                      }} 
                    />
                  </div>
                </div>
              </div>
              {scheduleForm.date && scheduleForm.startTime && (
                <div style={{ 
                  background: 'rgba(16, 185, 129, 0.1)', 
                  padding: '18px', 
                  borderRadius: '12px', 
                  marginTop: '24px', 
                  border: '1px solid rgba(16, 185, 129, 0.3)' 
                }}>
                  <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '6px', fontWeight: '700', letterSpacing: '0.5px' }}>
                    PREVIEW:
                  </div>
                  <div style={{ 
                    color: '#10b981', 
                    fontSize: '18px', 
                    fontWeight: '800', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px' 
                  }}>
                    <Clock style={{ width: '20px', height: '20px' }} />
                    {formatScheduleDisplay({ date: scheduleForm.date, time: scheduleForm.startTime, endTime: scheduleForm.endTime })}
                  </div>
                </div>
              )}
              <div style={{ 
                display: 'flex', 
                gap: '14px', 
                justifyContent: 'flex-end', 
                marginTop: '32px', 
                paddingTop: '24px', 
                borderTop: '1px solid #2d3748' 
              }}>
                <button 
                  onClick={() => setShowScheduleModal(false)} 
                  disabled={loading} 
                  style={{ 
                    padding: '14px 28px', 
                    background: '#1a2332', 
                    color: '#e2e8f0', 
                    border: '2px solid #2d3748', 
                    borderRadius: '10px', 
                    fontSize: '15px', 
                    fontWeight: '700', 
                    cursor: loading ? 'not-allowed' : 'pointer', 
                    transition: 'all 0.2s ease'
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveSchedule} 
                  disabled={loading} 
                  style={{ 
                    padding: '14px 28px', 
                    background: loading ? '#64748b' : '#10b981', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '10px', 
                    fontSize: '15px', 
                    fontWeight: '700', 
                    cursor: loading ? 'not-allowed' : 'pointer', 
                    transition: 'all 0.2s ease'
                  }}
                >
                  {loading ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkScheduleModal && (
        <div onClick={() => !loading && setShowBulkScheduleModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#0f172a', borderRadius: '12px', width: '100%', maxWidth: '700px', border: '1px solid #2d3748', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', borderBottom: '1px solid #2d3748', position: 'sticky', top: 0, background: '#0f172a', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Zap style={{ width: '24px', height: '24px', color: '#667eea' }} />
                <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: '24px', fontWeight: '600' }}>Schedule All Matches</h2>
              </div>
              <button onClick={() => !loading && setShowBulkScheduleModal(false)} disabled={loading} style={{ background: 'none', border: 'none', color: '#64748b', cursor: loading ? 'not-allowed' : 'pointer', padding: '8px', borderRadius: '4px', transition: 'all 0.2s ease', opacity: loading ? 0.5 : 1 }}><X style={{ width: '20px', height: '20px' }} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ background: 'rgba(102, 126, 234, 0.1)', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
                <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                  Scheduling {unscheduledMatches.length} Matches
                </div>
                <div style={{ color: '#94a3b8', fontSize: '14px' }}>
                  All matches will be scheduled automatically with time intervals
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '12px', color: '#e2e8f0', fontWeight: '600', fontSize: '14px' }}>Schedule Mode</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    onClick={() => setBulkScheduleForm({...bulkScheduleForm, scheduleMode: 'single', roundDates: {}})}
                    disabled={loading}
                    style={{
                      padding: '16px',
                      border: `2px solid ${bulkScheduleForm.scheduleMode === 'single' ? '#667eea' : '#2d3748'}`,
                      borderRadius: '8px',
                      background: bulkScheduleForm.scheduleMode === 'single' ? 'rgba(102, 126, 234, 0.1)' : '#1a2332',
                      color: '#e2e8f0',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '4px', color: bulkScheduleForm.scheduleMode === 'single' ? '#667eea' : '#e2e8f0' }}>Single Day</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>All matches on one date</div>
                  </button>
                  <button
                    onClick={() => setBulkScheduleForm({...bulkScheduleForm, scheduleMode: 'perRound', date: ''})}
                    disabled={loading}
                    style={{
                      padding: '16px',
                      border: `2px solid ${bulkScheduleForm.scheduleMode === 'perRound' ? '#667eea' : '#2d3748'}`,
                      borderRadius: '8px',
                      background: bulkScheduleForm.scheduleMode === 'perRound' ? 'rgba(102, 126, 234, 0.1)' : '#1a2332',
                      color: '#e2e8f0',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '4px', color: bulkScheduleForm.scheduleMode === 'perRound' ? '#667eea' : '#e2e8f0' }}>Per Round</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Different date per round</div>
                  </button>
                </div>
              </div>

              {bulkScheduleForm.scheduleMode === 'single' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#e2e8f0', fontWeight: '600', fontSize: '14px' }}>Date *</label>
                    <input type="date" value={bulkScheduleForm.date} onChange={(e) => setBulkScheduleForm({...bulkScheduleForm, date: e.target.value})} disabled={loading} style={{ width: '100%', padding: '12px 16px', border: '2px solid #2d3748', borderRadius: '8px', background: '#1a2332', color: '#e2e8f0', fontSize: '14px', outline: 'none', opacity: loading ? 0.6 : 1 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#e2e8f0', fontWeight: '600', fontSize: '14px' }}>Start Time *</label>
                    <input type="time" value={bulkScheduleForm.startTime} onChange={(e) => setBulkScheduleForm({...bulkScheduleForm, startTime: e.target.value})} disabled={loading} style={{ width: '100%', padding: '12px 16px', border: '2px solid #2d3748', borderRadius: '8px', background: '#1a2332', color: '#e2e8f0', fontSize: '14px', outline: 'none', opacity: loading ? 0.6 : 1 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#e2e8f0', fontWeight: '600', fontSize: '14px' }}>Match Duration (minutes)</label>
                    <input type="number" value={bulkScheduleForm.matchDuration} onChange={(e) => setBulkScheduleForm({...bulkScheduleForm, matchDuration: e.target.value})} disabled={loading} min="15" max="180" style={{ width: '100%', padding: '12px 16px', border: '2px solid #2d3748', borderRadius: '8px', background: '#1a2332', color: '#e2e8f0', fontSize: '14px', outline: 'none', opacity: loading ? 0.6 : 1 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#e2e8f0', fontWeight: '600', fontSize: '14px' }}>Break Duration (minutes)</label>
                    <input type="number" value={bulkScheduleForm.breakDuration} onChange={(e) => setBulkScheduleForm({...bulkScheduleForm, breakDuration: e.target.value})} disabled={loading} min="0" max="60" style={{ width: '100%', padding: '12px 16px', border: '2px solid #2d3748', borderRadius: '8px', background: '#1a2332', color: '#e2e8f0', fontSize: '14px', outline: 'none', opacity: loading ? 0.6 : 1 }} />
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#e2e8f0', fontWeight: '600', fontSize: '14px' }}>Start Time *</label>
                      <input type="time" value={bulkScheduleForm.startTime} onChange={(e) => setBulkScheduleForm({...bulkScheduleForm, startTime: e.target.value})} disabled={loading} style={{ width: '100%', padding: '12px 16px', border: '2px solid #2d3748', borderRadius: '8px', background: '#1a2332', color: '#e2e8f0', fontSize: '14px', outline: 'none', opacity: loading ? 0.6 : 1 }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#e2e8f0', fontWeight: '600', fontSize: '14px' }}>Match Duration (min)</label>
                      <input type="number" value={bulkScheduleForm.matchDuration} onChange={(e) => setBulkScheduleForm({...bulkScheduleForm, matchDuration: e.target.value})} disabled={loading} min="15" max="180" style={{ width: '100%', padding: '12px 16px', border: '2px solid #2d3748', borderRadius: '8px', background: '#1a2332', color: '#e2e8f0', fontSize: '14px', outline: 'none', opacity: loading ? 0.6 : 1 }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#e2e8f0', fontWeight: '600', fontSize: '14px' }}>Break Duration (min)</label>
                      <input type="number" value={bulkScheduleForm.breakDuration} onChange={(e) => setBulkScheduleForm({...bulkScheduleForm, breakDuration: e.target.value})} disabled={loading} min="0" max="60" style={{ width: '100%', padding: '12px 16px', border: '2px solid #2d3748', borderRadius: '8px', background: '#1a2332', color: '#e2e8f0', fontSize: '14px', outline: 'none', opacity: loading ? 0.6 : 1 }} />
                    </div>
                  </div>
                  
                  <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid #2d3748' }}>
                    <label style={{ display: 'block', marginBottom: '12px', color: '#e2e8f0', fontWeight: '600', fontSize: '14px' }}>Round Dates *</label>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {getUniqueRoundsForScheduling().map(roundNum => {
                        const roundMatches = unscheduledMatches.filter(m => m.round_number === roundNum);
                        return (
                          <div key={roundNum} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', alignItems: 'center' }}>
                            <div style={{ 
                              background: 'rgba(99, 102, 241, 0.3)', 
                              color: '#a5b4fc', 
                              padding: '8px 12px', 
                              borderRadius: '6px', 
                              fontSize: '13px', 
                              fontWeight: '600',
                              textAlign: 'center'
                            }}>
                              Round {roundNum}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input 
                                type="date" 
                                value={bulkScheduleForm.roundDates[roundNum] || ''} 
                                onChange={(e) => setBulkScheduleForm({
                                  ...bulkScheduleForm, 
                                  roundDates: {...bulkScheduleForm.roundDates, [roundNum]: e.target.value}
                                })} 
                                disabled={loading} 
                                style={{ 
                                  flex: 1,
                                  padding: '10px 12px', 
                                  border: '2px solid #2d3748', 
                                  borderRadius: '6px', 
                                  background: '#1a2332', 
                                  color: '#e2e8f0', 
                                  fontSize: '13px', 
                                  outline: 'none', 
                                  opacity: loading ? 0.6 : 1 
                                }} 
                              />
                              <span style={{ color: '#64748b', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                ({roundMatches.length} {roundMatches.length === 1 ? 'match' : 'matches'})
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {bulkScheduleForm.startTime && bulkScheduleTimes.length > 0 && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '20px', maxHeight: '300px', overflowY: 'auto' }}>
                  <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '12px', fontWeight: '600' }}>Schedule Preview:</div>
                  {bulkScheduleTimes.map(({ match, date, startTime, endTime }, index) => {
                    const displayMatchNumber = index + 1;
                    const dateObj = new Date(date + 'T00:00:00');
                    const dateDisplay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    
                    return (
                      <div key={match.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '6px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                          <span style={{ color: '#667eea', fontWeight: '600', fontSize: '13px', minWidth: '90px' }}>
                            Match {displayMatchNumber}
                          </span>
                          <span style={{ color: '#e2e8f0', fontSize: '13px' }}>{match.team1_name} vs {match.team2_name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>{dateDisplay}</span>
                          <div style={{ color: '#10b981', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock style={{ width: '14px', height: '14px' }} />
                            {startTime} - {endTime}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #2d3748' }}>
                <button onClick={() => setShowBulkScheduleModal(false)} disabled={loading} style={{ padding: '12px 24px', background: '#1a2332', color: '#e2e8f0', border: '2px solid #2d3748', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', opacity: loading ? 0.6 : 1 }}>Cancel</button>
                <button onClick={handleBulkSchedule} disabled={loading || (bulkScheduleForm.scheduleMode === 'single' ? (!bulkScheduleForm.date || !bulkScheduleForm.startTime) : (!bulkScheduleForm.startTime || !getUniqueRoundsForScheduling().every(r => bulkScheduleForm.roundDates[r])))} style={{ padding: '12px 24px', background: loading ? '#64748b' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: (loading || (bulkScheduleForm.scheduleMode === 'single' ? (!bulkScheduleForm.date || !bulkScheduleForm.startTime) : (!bulkScheduleForm.startTime || !getUniqueRoundsForScheduling().every(r => bulkScheduleForm.roundDates[r])))) ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', opacity: (loading || (bulkScheduleForm.scheduleMode === 'single' ? (!bulkScheduleForm.date || !bulkScheduleForm.startTime) : (!bulkScheduleForm.startTime || !getUniqueRoundsForScheduling().every(r => bulkScheduleForm.roundDates[r])))) ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {loading ? 'Scheduling...' : `Schedule All (${unscheduledMatches.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .match-status { display: inline-block; } 
        .status-pending { background: #475569; color: #cbd5e1; }
        .status-scheduled { background: #f97316; color: white; } 
        .status-completed { background: #10b981; color: white; } 
        .status-bye { background: #94a3b8; color: white; }
      `}</style>
    </div>
  );
};

export default TournamentScheduleList;