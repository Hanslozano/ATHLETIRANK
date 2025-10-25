import React, { useState } from 'react';
import { FaPlus, FaTrash, FaUsers, FaUserEdit } from 'react-icons/fa';

// This is the ADD/REMOVE TEAMS section to add to your Edit Team Modal
const AddRemoveTeamsSection = ({ 
  bracket, 
  teams, 
  availableTeams, 
  onAddTeam, 
  onRemoveTeam 
}) => {
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [selectedTeamToAdd, setSelectedTeamToAdd] = useState('');

  const handleAddTeam = async () => {
  if (!selectedTeamToAdd) {
    alert('Please select a team to add');
    return;
  }

  try {
    const res = await fetch('http://localhost:5000/api/bracketTeams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bracket_id: bracket.id,
        team_id: parseInt(selectedTeamToAdd)
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    setShowAddTeam(false);
    setSelectedTeamToAdd('');
    
    // CRITICAL: Call onAddTeam to trigger refreshTeamsInModal which regenerates bracket
    await onAddTeam(); 
    
    alert('Team added successfully! Bracket regenerated.');
  } catch (err) {
    console.error('Error adding team:', err);
    alert('Failed to add team: ' + err.message);
  }
};

  const handleRemoveTeam = async (assignmentId, teamName) => {
    if (!confirm(`Are you sure you want to remove "${teamName}" from this bracket?`)) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/bracketTeams/${assignmentId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      alert('Team removed successfully!');
      onRemoveTeam(); // Refresh teams list
    } catch (err) {
      console.error('Error removing team:', err);
      alert('Failed to remove team: ' + err.message);
    }
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Add Team Section */}
      <div style={{ 
        background: 'var(--background-secondary)', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>
            <FaPlus style={{ marginRight: '8px' }} /> Add/Remove Teams
          </h4>
          <button
            onClick={() => setShowAddTeam(!showAddTeam)}
            style={{
              padding: '8px 16px',
              background: 'var(--success-color)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaPlus /> {showAddTeam ? 'Cancel' : 'Add Team'}
          </button>
        </div>

        {showAddTeam && (
          <div style={{ 
            background: 'var(--background-card)', 
            padding: '15px', 
            borderRadius: '6px',
            border: '2px solid var(--border-color)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                  Select Team *
                </label>
                <select
                  value={selectedTeamToAdd}
                  onChange={(e) => setSelectedTeamToAdd(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'var(--background-secondary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="">-- Select a team --</option>
                  {availableTeams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.sport?.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAddTeam}
                style={{
                  padding: '10px 20px',
                  background: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  height: 'fit-content',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FaPlus /> Add
              </button>
            </div>
            {availableTeams.length === 0 && (
              <p style={{ 
                color: 'var(--text-muted)', 
                fontSize: '13px', 
                marginTop: '10px',
                marginBottom: 0 
              }}>
                No available teams matching this bracket's sport type.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Current Teams List with Remove Option */}
      <div>
        <h4 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>
          Current Teams ({teams.length})
        </h4>
        <div style={{ display: 'grid', gap: '10px' }}>
          {teams.map(team => (
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
                  <div style={{ fontWeight: '600', fontSize: '15px' }}>{team.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {team.players?.length || 0} players
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRemoveTeam(team.assignment_id || team.id, team.name)}
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
                  gap: '6px'
                }}
              >
                <FaTrash /> Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AddRemoveTeamsSection;