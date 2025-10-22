import React, { useState, useEffect } from 'react';
import { Search, Calendar, Clock, Plus, X, Edit, Trash2 } from 'lucide-react';

const TournamentScheduleList = ({ matches = [], eventId, bracketId, onRefresh, onViewStats, isStaffView, onInputStats }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRound, setFilterRound] = useState('all');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    startTime: '',
    endTime: ''
  });
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState([]);

  // Set CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', '#3b82f6');
    root.style.setProperty('--error-color', '#ef4444');
    root.style.setProperty('--success-color', '#48bb78');
    root.style.setProperty('--background-primary', '#0a0f1c');
    root.style.setProperty('--background-secondary', '#1a2332');
    root.style.setProperty('--background-card', '#0f172a');
    root.style.setProperty('--text-primary', '#e2e8f0');
    root.style.setProperty('--text-secondary', '#94a3b8');
    root.style.setProperty('--text-muted', '#64748b');
    root.style.setProperty('--border-color', '#2d3748');
  }, []);

  // Fetch schedules
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

  // Format round display
  const formatRoundDisplay = (match) => {
    if (!match) return '';
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

  const formatScheduleDisplay = (schedule) => {
    if (!schedule || !schedule.date) return null;
    
    const date = new Date(schedule.date + 'T00:00:00');
    const dateStr = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
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
    const endDisplay = endTime ? ` to ${formatTime(endTime)}` : '';
    
    return `${dateStr} - ${startDisplay}${endDisplay}`;
  };

  const getScheduleForMatch = (matchId) => {
    return schedules.find(s => s.matchId === matchId);
  };

  // Get unique rounds
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

  // Filter matches
  const filteredMatches = matches.filter(match => {
    const matchesSearch = 
      match.team1_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.team2_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.id.toString().includes(searchTerm);
    
    const matchesStatus = filterStatus === 'all' || match.status === filterStatus;
    const matchesRound = filterRound === 'all' || match.round_number.toString() === filterRound;
    
    return matchesSearch && matchesStatus && matchesRound;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'status-completed';
      case 'ongoing': return 'status-ongoing';
      case 'scheduled': return 'status-scheduled';
      default: return 'status-scheduled';
    }
  };

  const handleAddSchedule = (match) => {
    setSelectedMatch(match);
    const existingSchedule = getScheduleForMatch(match.id);
    
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
    // Store match data in sessionStorage
    sessionStorage.setItem('selectedMatchData', JSON.stringify({
      matchId: match.id,
      eventId: eventId,
      bracketId: bracketId,
      match: match
    }));
    
    // Notify parent component
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

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', padding: '0' }}>
      {/* Search and Filters */}
      <div style={{ 
        background: '#1a2332',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '30px',
        border: '1px solid #2d3748'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', width: '16px', height: '16px' }} />
            <input type="text" placeholder="Search matches..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '12px 16px 12px 40px', border: '1px solid #2d3748', borderRadius: '8px', fontSize: '14px', backgroundColor: '#0f172a', color: '#e2e8f0', outline: 'none' }} />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '12px 16px', border: '1px solid #2d3748', borderRadius: '8px', fontSize: '14px', backgroundColor: '#0f172a', color: '#e2e8f0', minWidth: '150px', outline: 'none' }}>
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
          <select value={filterRound} onChange={(e) => setFilterRound(e.target.value)} style={{ padding: '12px 16px', border: '1px solid #2d3748', borderRadius: '8px', fontSize: '14px', backgroundColor: '#0f172a', color: '#e2e8f0', minWidth: '150px', outline: 'none' }}>
            <option value="all">All Rounds</option>
            {rounds.map(round => (<option key={round.value} value={round.value}>{round.label}</option>))}
          </select>
        </div>
      </div>

      <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
        Showing {filteredMatches.length} of {matches.length} matches
      </div>

      {/* Matches Table */}
      <div style={{ borderRadius: '12px', border: '1px solid #2d3748', overflow: 'hidden', background: '#1a2332' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1a2332' }}>
          <thead>
            <tr style={{ background: '#0a0f1c', borderBottom: '1px solid #2d3748' }}>
              <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600', fontSize: '15px' }}>Round</th>
              <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600', fontSize: '15px' }}>Match</th>
              <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600', fontSize: '15px' }}>Status</th>
              <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600', fontSize: '15px' }}>Winner</th>
              <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600', fontSize: '15px' }}>Schedule</th>
              <th style={{ padding: '15px', textAlign: 'center', color: '#e2e8f0', fontWeight: '600', fontSize: '15px', width: '150px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMatches.length === 0 ? (
              <tr><td colSpan="8" style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', fontSize: '16px', background: '#1a2332' }}>No matches found</td></tr>
            ) : (
              filteredMatches.map((match, index) => {
                const schedule = getScheduleForMatch(match.id);
                const scheduleDisplay = formatScheduleDisplay(schedule);
                const isResetFinal = match.round_number === 201;
                const isChampionship = match.round_number === 200 || match.round_number === 201;
                const hasStats = match.status === 'completed' && (match.score_team1 !== null || match.mvp_name);

                return (
                  <tr key={match.id} style={{ borderBottom: '1px solid #2d3748', background: '#1a2332' }}>
                    {/* Round */}
                    <td style={{ padding: '15px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ background: 'rgba(99, 102, 241, 0.3)', color: '#a5b4fc', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', display: 'inline-block', width: 'fit-content' }}>
                          {formatRoundDisplay(match)}
                        </span>
                        {isResetFinal && (
                          <span style={{ background: '#ff6b35', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', display: 'inline-block', width: 'fit-content' }}>
                            RESET
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Match */}
                    <td style={{ padding: '15px', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#e2e8f0' }}>
                        {match.team1_name || 'TBD'} vs {match.team2_name || 'TBD'}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '15px', verticalAlign: 'middle' }}>
                      <span className={`match-status ${getStatusColor(match.status)}`} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', display: 'inline-block' }}>
                        {match.status}
                      </span>
                    </td>

                    {/* Winner */}
                    <td style={{ padding: '15px', verticalAlign: 'middle' }}>
                      {match.winner_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#48bb78', fontWeight: '600', fontSize: '15px' }}>
                            {match.winner_name}
                          </span>
                          {isChampionship && <span style={{ fontSize: '16px' }}>👑</span>}
                        </div>
                      ) : (
                        <span style={{ color: '#64748b' }}>-</span>
                      )}
                    </td>

                    {/* Schedule */}
                    <td style={{ padding: '15px', verticalAlign: 'middle' }}>
                      {scheduleDisplay ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar style={{ width: '16px', height: '16px', color: '#3b82f6', flexShrink: 0 }} />
                          <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
                            {scheduleDisplay}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '14px' }}>Not scheduled</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '15px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {/* Input Stats button - only visible for staff */}
                        {isStaffView && (
                          <button
                            onClick={() => onInputStats && onInputStats(match)}
                            disabled={loading}
                            style={{
                              padding: '8px 12px',
                              background: loading ? '#64748b' : '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s ease',
                              opacity: loading ? 0.6 : 1,
                              whiteSpace: 'nowrap'
                            }}
                            title="Input Match Statistics"
                          >
                            Input Stats
                          </button>
                        )}
                        
                        {/* View Stats button - visible for everyone when stats exist */}
                        {hasStats && (
                          <button
                            onClick={() => handleViewStats(match)}
                            disabled={loading}
                            style={{
                              padding: '8px 12px',
                              background: loading ? '#64748b' : '#8b5cf6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s ease',
                              opacity: loading ? 0.6 : 1,
                              whiteSpace: 'nowrap'
                            }}
                            title="View Match Statistics"
                          >
                            View Match Stats
                          </button>
                        )}
                        
                        {/* Only show schedule buttons if NOT staff view */}
                        {!isStaffView && (
                          <>
                            {scheduleDisplay ? (
                              <>
                                <button
                                  onClick={() => handleAddSchedule(match)}
                                  disabled={loading}
                                  style={{
                                    padding: '8px 12px',
                                    background: loading ? '#64748b' : '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s ease',
                                    opacity: loading ? 0.6 : 1
                                  }}
                                  title="Edit Schedule"
                                >
                                  <Edit style={{ width: '14px', height: '14px' }} />
                                </button>
                                <button
                                  onClick={() => handleDeleteSchedule(match)}
                                  disabled={loading}
                                  style={{
                                    padding: '8px 12px',
                                    background: loading ? '#64748b' : '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s ease',
                                    opacity: loading ? 0.6 : 1
                                  }}
                                  title="Delete Schedule"
                                >
                                  <Trash2 style={{ width: '14px', height: '14px' }} />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleAddSchedule(match)}
                                disabled={loading}
                                style={{
                                  padding: '8px 14px',
                                  background: loading ? '#64748b' : '#48bb78',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  cursor: loading ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  transition: 'all 0.2s ease',
                                  opacity: loading ? 0.6 : 1,
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
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div onClick={() => !loading && setShowScheduleModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#0f172a', borderRadius: '12px', width: '100%', maxWidth: '600px', border: '1px solid #2d3748', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', borderBottom: '1px solid #2d3748' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Calendar style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
                <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: '24px', fontWeight: '600' }}>{getScheduleForMatch(selectedMatch?.id) ? 'Edit Schedule' : 'Add Schedule'}</h2>
              </div>
              <button onClick={() => !loading && setShowScheduleModal(false)} disabled={loading} style={{ background: 'none', border: 'none', color: '#64748b', cursor: loading ? 'not-allowed' : 'pointer', padding: '8px', borderRadius: '4px', transition: 'all 0.2s ease', opacity: loading ? 0.5 : 1 }}><X style={{ width: '20px', height: '20px' }} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Match #{filteredMatches.findIndex(m => m.id === selectedMatch?.id) + 1} - {formatRoundDisplay(selectedMatch)}</div>
                <div style={{ color: '#94a3b8', fontSize: '14px' }}>{selectedMatch?.team1_name || 'TBD'} vs {selectedMatch?.team2_name || 'TBD'}</div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#e2e8f0', fontWeight: '600', fontSize: '14px' }}>Date *</label>
                  <input type="date" value={scheduleForm.date} onChange={(e) => setScheduleForm({...scheduleForm, date: e.target.value})} disabled={loading} style={{ width: '100%', padding: '12px 16px', border: '2px solid #2d3748', borderRadius: '8px', background: '#1a2332', color: '#e2e8f0', fontSize: '14px', outline: 'none', opacity: loading ? 0.6 : 1 }} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#e2e8f0', fontWeight: '600', fontSize: '14px' }}>Start Time *</label>
                    <input type="time" value={scheduleForm.startTime} onChange={(e) => setScheduleForm({...scheduleForm, startTime: e.target.value})} disabled={loading} style={{ width: '100%', padding: '12px 16px', border: '2px solid #2d3748', borderRadius: '8px', background: '#1a2332', color: '#e2e8f0', fontSize: '14px', outline: 'none', opacity: loading ? 0.6 : 1 }} />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#e2e8f0', fontWeight: '600', fontSize: '14px' }}>End Time (Optional)</label>
                    <input type="time" value={scheduleForm.endTime} onChange={(e) => setScheduleForm({...scheduleForm, endTime: e.target.value})} disabled={loading} style={{ width: '100%', padding: '12px 16px', border: '2px solid #2d3748', borderRadius: '8px', background: '#1a2332', color: '#e2e8f0', fontSize: '14px', outline: 'none', opacity: loading ? 0.6 : 1 }} />
                  </div>
                </div>
              </div>

              {/* Preview */}
              {scheduleForm.date && scheduleForm.startTime && (
                <div style={{ background: 'rgba(72, 187, 120, 0.1)', padding: '16px', borderRadius: '8px', marginTop: '20px', border: '1px solid rgba(72, 187, 120, 0.2)' }}>
                  <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '4px' }}>Schedule Preview:</div>
                  <div style={{ color: '#48bb78', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock style={{ width: '18px', height: '18px' }} />
                    {formatScheduleDisplay({ 
                      date: scheduleForm.date, 
                      time: scheduleForm.startTime,
                      endTime: scheduleForm.endTime
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #2d3748' }}>
                <button onClick={() => setShowScheduleModal(false)} disabled={loading} style={{ padding: '12px 24px', background: '#1a2332', color: '#e2e8f0', border: '2px solid #2d3748', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', opacity: loading ? 0.6 : 1 }}>Cancel</button>
                <button onClick={handleSaveSchedule} disabled={loading} style={{ padding: '12px 24px', background: loading ? '#64748b' : '#48bb78', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', opacity: loading ? 0.6 : 1 }}>{loading ? 'Saving...' : 'Save Schedule'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .match-status { display: inline-block; } 
        .status-scheduled { background: #f97316; color: white; } 
        .status-ongoing { background: #3b82f6; color: white; } 
        .status-completed { background: #22c55e; color: white; } 
      `}</style>
    </div>
  );
};

export default TournamentScheduleList;