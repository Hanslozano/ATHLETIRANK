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
        bracketId: bracket.id,  // Changed from bracket_id
        teamId: parseInt(selectedTeamToAdd)  // Changed from team_id
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `HTTP error! status: ${res.status}`);
    }

    setShowAddTeam(false);
    setSelectedTeamToAdd('');
    
    alert('Team added successfully! Bracket regenerated.');
    
    // Call onAddTeam to trigger refreshTeamsInModal
    await onAddTeam(); 
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

        {editTeamModal.showAddTeam && (
  <div style={{ 
    background: 'rgba(59, 130, 246, 0.1)', 
    padding: '20px', 
    borderRadius: '8px', 
    marginBottom: '20px',
    border: '1px solid rgba(59, 130, 246, 0.2)'
  }}>
    <h4 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>
      <FaPlus style={{ marginRight: '8px' }} /> Add Team to Bracket
    </h4>
    
    {editTeamModal.hasCompletedMatches ? (
      <div style={{
        background: 'rgba(239, 68, 68, 0.1)',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        textAlign: 'center'
      }}>
        <div style={{ color: '#ef4444', fontSize: '14px', fontWeight: '600' }}>
          🔒 Cannot add teams after matches have been completed
        </div>
      </div>
    ) : editTeamModal.availableTeams.length === 0 ? (
      <div style={{
        background: 'rgba(251, 191, 36, 0.1)',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid rgba(251, 191, 36, 0.2)',
        textAlign: 'center'
      }}>
        <div style={{ color: '#f59e0b', fontSize: '14px', fontWeight: '600' }}>
          No available {editTeamModal.bracket.sport_type} teams to add
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
          All matching teams are already assigned to this bracket
        </div>
      </div>
    ) : (
      <div style={{ display: 'flex', gap: '10px', alignItems: 'end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
            Select Team ({editTeamModal.bracket.sport_type})
          </label>
          <select
            value={editTeamModal.selectedTeamToAdd}
            onChange={(e) => setEditTeamModal(prev => ({
              ...prev,
              selectedTeamToAdd: e.target.value
            }))}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid var(--border-color)',
              borderRadius: '6px',
              background: 'var(--background-secondary)',
              color: 'var(--text-primary)',
              fontSize: '14px'
            }}
          >
            <option value="">Choose a team...</option>
            {editTeamModal.availableTeams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.sport?.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={async () => {
            if (!editTeamModal.selectedTeamToAdd) {
              alert('Please select a team');
              return;
            }

            try {
              const res = await fetch('http://localhost:5000/api/bracketTeams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  bracketId: editTeamModal.bracket.id,
                  teamId: parseInt(editTeamModal.selectedTeamToAdd)
                })
              });

              if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to add team');
              }

              alert('Team added successfully!');
              setEditTeamModal(prev => ({
                ...prev,
                selectedTeamToAdd: '',
                showAddTeam: false
              }));
              await refreshTeamsInModal();
            } catch (err) {
              console.error('Error adding team:', err);
              alert('Failed to add team: ' + err.message);
            }
          }}
          style={{
            padding: '10px 20px',
            background: 'var(--success-color)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            whiteSpace: 'nowrap'
          }}
        >
          Add Team
        </button>
      </div>
    )}
  </div>
)}

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