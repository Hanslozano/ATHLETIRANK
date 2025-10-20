import React, { useState, useEffect } from 'react';
import { Search, Calendar, Clock, MapPin, User, Plus, X, Edit, Trash2 } from 'lucide-react';

const TournamentScheduleList = ({ matches = [], eventId, bracketId, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRound, setFilterRound] = useState('all');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    time: '',
    venue: '',
    referee: ''
  });
  const [loading, setLoading] = useState(false);

  // Set CSS variables and body background
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', '#3b82f6');
    root.style.setProperty('--primary-hover', '#2563eb');
    root.style.setProperty('--error-color', '#ef4444');
    root.style.setProperty('--success-color', '#48bb78');
    root.style.setProperty('--success-hover', '#38a169');
    root.style.setProperty('--background-primary', '#0a0f1c');
    root.style.setProperty('--background-secondary', '#1a2332');
    root.style.setProperty('--background-card', '#0f172a');
    root.style.setProperty('--text-primary', '#e2e8f0');
    root.style.setProperty('--text-secondary', '#94a3b8');
    root.style.setProperty('--text-muted', '#64748b');
    root.style.setProperty('--border-color', '#2d3748');
  }, []);

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
    if (match.scheduled_at || match.venue || match.referee) {
      const schedDate = match.scheduled_at ? new Date(match.scheduled_at) : new Date();
      setScheduleForm({
        date: match.scheduled_at ? schedDate.toISOString().split('T')[0] : '',
        time: match.scheduled_at ? schedDate.toTimeString().slice(0, 5) : '',
        venue: match.venue || '',
        referee: match.referee || ''
      });
    } else {
      setScheduleForm({ date: '', time: '', venue: '', referee: '' });
    }
    setShowScheduleModal(true);
  };

  const handleDeleteSchedule = async (match) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/matches/${match.id}/schedule`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      alert('Schedule deleted successfully!');
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForm.date || !scheduleForm.time || !scheduleForm.venue) {
      alert('Please fill in all required fields (Date, Time, Venue)');
      return;
    }

    setLoading(true);
    try {
      const scheduledAt = `${scheduleForm.date}T${scheduleForm.time}:00`;

      const response = await fetch(`http://localhost:5000/api/matches/${selectedMatch.id}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_at: scheduledAt,
          venue: scheduleForm.venue,
          referee: scheduleForm.referee || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save schedule');
      }

      alert('Schedule saved successfully!');
      setShowScheduleModal(false);
      setSelectedMatch(null);
      setScheduleForm({ date: '', time: '', venue: '', referee: '' });
      
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Failed to save schedule: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const rounds = getUniqueRounds();

  return (
    <div style={{ background: 'var(--background-card)', minHeight: '100vh', padding: '0' }}>
      {/* Search and Filters */}
      <div style={{ 
        background: 'var(--background-secondary)',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '30px',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', width: '16px', height: '16px' }} />
            <input type="text" placeholder="Search matches..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '12px 16px 12px 40px', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '14px', backgroundColor: 'var(--background-card)', color: '#e2e8f0', outline: 'none' }} />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '14px', backgroundColor: 'var(--background-card)', color: '#e2e8f0', minWidth: '150px', outline: 'none' }}>
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
          <select value={filterRound} onChange={(e) => setFilterRound(e.target.value)} style={{ padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '14px', backgroundColor: 'var(--background-card)', color: '#e2e8f0', minWidth: '150px', outline: 'none' }}>
            <option value="all">All Rounds</option>
            {rounds.map(round => (<option key={round.value} value={round.value}>{round.label}</option>))}
          </select>
        </div>
      </div>

      <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
        Showing {filteredMatches.length} of {matches.length} matches
      </div>

      {/* Matches Table */}
      <div style={{ borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', background: 'var(--background-secondary)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--background-card)' }}>
          <thead>
            <tr style={{ background: 'var(--background-primary)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600', fontSize: '15px' }}>Match Details</th>
              <th style={{ padding: '15px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600', fontSize: '15px', width: '45%' }}>Schedule</th>
            </tr>
          </thead>
          <tbody>
            {filteredMatches.length === 0 ? (
              <tr><td colSpan="2" style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', fontSize: '16px', background: 'var(--background-card)' }}>No matches found</td></tr>
            ) : (
              filteredMatches.map((match) => (
                <tr key={match.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s ease', background: 'var(--background-card)' }}>
                  <td style={{ padding: '20px 15px', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ background: '#3b82f6', color: 'white', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>Match #{match.id}</span>
                        <span style={{ background: 'rgba(99, 102, 241, 0.3)', color: '#a5b4fc', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>{formatRoundDisplay(match)}</span>
                        <span className={`match-status ${getStatusColor(match.status)}`} style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>{match.status}</span>
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#e2e8f0' }}>{match.team1_name || 'TBD'} vs {match.team2_name || 'TBD'}</div>
                      {match.status === 'completed' && (<div style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f0' }}>Score: {match.score_team1} - {match.score_team2}</div>)}
                      {match.winner_name && (<div style={{ color: '#48bb78', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><span>🏆</span> Winner: {match.winner_name}</div>)}
                    </div>
                  </td>
                  <td style={{ padding: '20px 15px', verticalAlign: 'top', borderLeft: '1px solid var(--border-color)' }}>
                    {match.scheduled_at || match.venue ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 12px' }}>
                          {match.scheduled_at && (<><Calendar style={{ width: '16px', height: '16px', color: '#3b82f6' }} /><span style={{ color: '#e2e8f0', fontSize: '14px' }}>{new Date(match.scheduled_at).toLocaleDateString()}</span><Clock style={{ width: '16px', height: '16px', color: '#f59e0b' }} /><span style={{ color: '#e2e8f0', fontSize: '14px' }}>{new Date(match.scheduled_at).toLocaleTimeString()}</span></>)}
                          {match.venue && (<><MapPin style={{ width: '16px', height: '16px', color: '#10b981' }} /><span style={{ color: '#e2e8f0', fontSize: '14px' }}>{match.venue}</span></>)}
                          {match.referee && (<><User style={{ width: '16px', height: '16px', color: '#8b5cf6' }} /><span style={{ color: '#e2e8f0', fontSize: '14px' }}>{match.referee}</span></>)}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button onClick={() => handleAddSchedule(match)} disabled={loading} style={{ padding: '8px 14px', background: loading ? '#64748b' : '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease', opacity: loading ? 0.6 : 1 }}><Edit style={{ width: '14px', height: '14px' }} />Edit</button>
                          <button onClick={() => handleDeleteSchedule(match)} disabled={loading} style={{ padding: '8px 14px', background: loading ? '#64748b' : '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease', opacity: loading ? 0.6 : 1 }}><Trash2 style={{ width: '14px', height: '14px' }} />Delete</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', gap: '12px' }}>
                        <div style={{ color: '#64748b', fontSize: '14px', textAlign: 'center' }}>No schedule set for this match</div>
                        <button onClick={() => handleAddSchedule(match)} disabled={loading} style={{ padding: '10px 16px', background: loading ? '#64748b' : '#48bb78', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease', opacity: loading ? 0.6 : 1 }}><Plus style={{ width: '16px', height: '16px' }} />Add Schedule</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div onClick={() => !loading && setShowScheduleModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--background-card)', borderRadius: '12px', width: '100%', maxWidth: '600px', border: '1px solid var(--border-color)', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '24px', fontWeight: '600' }}>{selectedMatch?.scheduled_at ? 'Edit Schedule' : 'Add Schedule'}</h2>
              <button onClick={() => !loading && setShowScheduleModal(false)} disabled={loading} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: loading ? 'not-allowed' : 'pointer', padding: '8px', borderRadius: '4px', transition: 'all 0.2s ease', opacity: loading ? 0.5 : 1 }}><X style={{ width: '20px', height: '20px' }} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <div style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Match #{selectedMatch?.id} - {formatRoundDisplay(selectedMatch)}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{selectedMatch?.team1_name || 'TBD'} vs {selectedMatch?.team2_name || 'TBD'}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div><label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px' }}>Date *</label><input type="date" value={scheduleForm.date} onChange={(e) => setScheduleForm({...scheduleForm, date: e.target.value})} disabled={loading} style={{ width: '100%', padding: '12px 16px', border: '2px solid var(--border-color)', borderRadius: '8px', background: 'var(--background-secondary)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', opacity: loading ? 0.6 : 1 }} /></div>
                <div><label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px' }}>Time *</label><input type="time" value={scheduleForm.time} onChange={(e) => setScheduleForm({...scheduleForm, time: e.target.value})} disabled={loading} style={{ width: '100%', padding: '12px 16px', border: '2px solid var(--border-color)', borderRadius: '8px', background: 'var(--background-secondary)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', opacity: loading ? 0.6 : 1 }} /></div>
                <div><label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px' }}>Venue *</label><input type="text" value={scheduleForm.venue} onChange={(e) => setScheduleForm({...scheduleForm, venue: e.target.value})} placeholder="e.g., Main Court A" disabled={loading} style={{ width: '100%', padding: '12px 16px', border: '2px solid var(--border-color)', borderRadius: '8px', background: 'var(--background-secondary)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', opacity: loading ? 0.6 : 1 }} /></div>
                <div><label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px' }}>Referee (Optional)</label><input type="text" value={scheduleForm.referee} onChange={(e) => setScheduleForm({...scheduleForm, referee: e.target.value})} placeholder="e.g., John Martinez" disabled={loading} style={{ width: '100%', padding: '12px 16px', border: '2px solid var(--border-color)', borderRadius: '8px', background: 'var(--background-secondary)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', opacity: loading ? 0.6 : 1 }} /></div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                <button onClick={() => setShowScheduleModal(false)} disabled={loading} style={{ padding: '12px 24px', background: 'var(--background-secondary)', color: 'var(--text-primary)', border: '2px solid var(--border-color)', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', opacity: loading ? 0.6 : 1 }}>Cancel</button>
                <button onClick={handleSaveSchedule} disabled={loading} style={{ padding: '12px 24px', background: loading ? 'var(--text-muted)' : 'var(--success-color)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', opacity: loading ? 0.6 : 1 }}>{loading ? 'Saving...' : 'Save Schedule'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`.match-status { display: inline-block; } .status-scheduled { background: #f97316; color: white; } .status-ongoing { background: #3b82f6; color: white; } .status-completed { background: #22c55e; color: white; } table tbody tr:hover { background: var(--background-secondary) !important; }`}</style>
    </div>
  );
};

export default TournamentScheduleList;