import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import {
  FaPlus,
  FaMinus,
  FaRedo,
  FaSave,
  FaArrowLeft,
  FaArrowRight,
  FaChevronDown,
  FaChevronUp,
  FaTrophy,
  FaCrown,
  FaExchangeAlt,
  FaEye,
  FaEyeSlash,
  FaClock,
  FaTimes,
  FaUsers,
  // ============================================
  // 1. ADDED OFFLINE ICONS
  // ============================================
  FaWifi, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaCloudUploadAlt
} from "react-icons/fa";
import "../../style/Staff_Stats.css";

const StaffStats = ({ sidebarOpen }) => {
  const navigate = useNavigate();
  const [cameFromStaffEvents, setCameFromStaffEvents] = useState(false);
  const [events, setEvents] = useState([]);
  const [brackets, setBrackets] = useState([]);
  const [teams, setTeams] = useState([]);
  const [games, setGames] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedBracket, setSelectedBracket] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [playerStats, setPlayerStats] = useState([]);
  const [teamScores, setTeamScores] = useState({
    team1: [0, 0, 0, 0],
    team2: [0, 0, 0, 0],
  });
  const [overtimeScores, setOvertimeScores] = useState({
    team1: [],
    team2: []
  });
  const [currentQuarter, setCurrentQuarter] = useState(0);
  const [currentOvertime, setCurrentOvertime] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);
  const [overtimePeriods, setOvertimePeriods] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRounds, setExpandedRounds] = useState(new Set([1]));
  const [startingPlayers, setStartingPlayers] = useState({
    team1: [],
    team2: []
  });
  const [activeTeamView, setActiveTeamView] = useState('team1');
  const [showBothTeams, setShowBothTeams] = useState(false);
  const [showBenchPlayers, setShowBenchPlayers] = useState({
    team1: true,
    team2: true
  });

  // ============================================
  // 2. ADDED OFFLINE STATES
  // ============================================
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showConnectionNotif, setShowConnectionNotif] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const STORAGE_KEYS = {
    PENDING_SYNCS: 'staff_stats_pending_syncs',
    OFFLINE_DATA: 'staff_stats_offline_data',
    LAST_SYNC: 'staff_stats_last_sync'
  };

  // QuickScore States
  const [isQuickScoreExpanded, setIsQuickScoreExpanded] = useState(true);
  const [selectedQuickScorePlayer, setSelectedQuickScorePlayer] = useState(null);
  const [hideButtons, setHideButtons] = useState(true);

  const basketballStatsTemplate = {
    points: [0, 0, 0, 0],
    assists: [0, 0, 0, 0],
    rebounds: [0, 0, 0, 0],
    two_points_made: [0, 0, 0, 0],
    three_points_made: [0, 0, 0, 0],
    free_throws_made: [0, 0, 0, 0],
    steals: [0, 0, 0, 0],
    blocks: [0, 0, 0, 0],
    fouls: [0, 0, 0, 0],
    turnovers: [0, 0, 0, 0],
    isStarting: false,
    isOnCourt: false
  };

  const volleyballStatsTemplate = {
  kills: [0, 0, 0, 0, 0],
  attack_attempts: [0, 0, 0, 0, 0],
  attack_errors: [0, 0, 0, 0, 0],
  serves: [0, 0, 0, 0, 0],
  service_aces: [0, 0, 0, 0, 0],
  serve_errors: [0, 0, 0, 0, 0],
  receptions: [0, 0, 0, 0, 0], // RECEPTIONS ADDED
  reception_errors: [0, 0, 0, 0, 0],
  digs: [0, 0, 0, 0, 0],
  volleyball_assists: [0, 0, 0, 0, 0],
  volleyball_blocks: [0, 0, 0, 0, 0],
  isStarting: false,
  isOnCourt: false
};

  // QuickScore Configuration
  const basketballStatButtons = [
    { key: 'two_points_made', label: '+2 PTS', color: 'bg-blue-600 hover:bg-blue-700', points: 2 },
    { key: 'three_points_made', label: '+3 PTS', color: 'bg-purple-600 hover:bg-purple-700', points: 3 },
    { key: 'free_throws_made', label: 'FT', color: 'bg-green-600 hover:bg-green-700', points: 1 },
    { key: 'rebounds', label: 'REB', color: 'bg-orange-600 hover:bg-orange-700', points: 0 },
    { key: 'assists', label: 'AST', color: 'bg-teal-600 hover:bg-teal-700', points: 0 },
    { key: 'steals', label: 'STL', color: 'bg-yellow-600 hover:bg-yellow-700', points: 0 },
    { key: 'blocks', label: 'BLK', color: 'bg-red-600 hover:bg-red-700', points: 0 },
    { key: 'fouls', label: 'FOUL', color: 'bg-gray-600 hover:bg-gray-700', points: 0 },
    { key: 'turnovers', label: 'TO', color: 'bg-pink-600 hover:bg-pink-700', points: 0 }
  ];

  const volleyballStatButtons = [
  { key: 'kills', label: 'KILL', color: 'bg-red-600 hover:bg-red-700', points: 1 },
  { key: 'service_aces', label: 'ACE', color: 'bg-yellow-600 hover:bg-yellow-700', points: 1 },
  { key: 'volleyball_blocks', label: 'BLOCK', color: 'bg-purple-600 hover:bg-purple-700', points: 1 },
  { key: 'volleyball_assists', label: 'ASSIST', color: 'bg-blue-600 hover:bg-blue-700', points: 0 },
  { key: 'digs', label: 'DIG', color: 'bg-green-600 hover:bg-green-700', points: 0 },
  // ADDED: Reception buttons
  { key: 'receptions', label: 'REC', color: 'bg-teal-600 hover:bg-teal-700', points: 0 },
  // ADDED: Error buttons
  { key: 'serve_errors', label: 'SRV ERR', color: 'bg-pink-600 hover:bg-pink-700', points: 0 },
  { key: 'attack_errors', label: 'ATK ERR', color: 'bg-orange-600 hover:bg-orange-700', points: 0 },
  { key: 'reception_errors', label: 'REC ERR', color: 'bg-red-800 hover:bg-red-900', points: 0 }
];

  // ============================================
  // 3. ADDED OFFLINE HELPER FUNCTIONS
  // ============================================

  // Load pending syncs from localStorage
  const loadPendingSyncs = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PENDING_SYNCS);
      if (stored) {
        const syncs = JSON.parse(stored);
        setPendingSyncs(syncs);
        console.log(`Loaded ${syncs.length} pending syncs`);
      }
    } catch (err) {
      console.error('Error loading pending syncs:', err);
    }
  };

  // Save data to localStorage when offline
  const saveToLocalStorage = (matchId, data, action = 'save_stats') => {
    try {
      const syncItem = {
        id: `${action}_${matchId}_${Date.now()}`,
        matchId,
        action,
        data,
        timestamp: new Date().toISOString(),
        attempts: 0
      };

      const currentSyncs = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_SYNCS) || '[]');
      currentSyncs.push(syncItem);
      localStorage.setItem(STORAGE_KEYS.PENDING_SYNCS, JSON.stringify(currentSyncs));
      setPendingSyncs(currentSyncs);

      console.log('Data saved to localStorage for later sync:', syncItem);
      return true;
    } catch (err) {
      console.error('Error saving to localStorage:', err);
      alert('Failed to save data offline. Storage might be full.');
      return false;
    }
  };

  // Sync pending data when connection is restored
  const syncPendingData = async () => {
    const syncs = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_SYNCS) || '[]');
    
    if (syncs.length === 0) {
      console.log('No pending syncs');
      return;
    }

    setIsSyncing(true);
    console.log(`Starting sync of ${syncs.length} items...`);

    const failedSyncs = [];
    let successCount = 0;

    for (const sync of syncs) {
      try {
        if (sync.action === 'save_stats') {
          const response = await fetch(
            `http://localhost:5000/api/stats/matches/${sync.matchId}/stats`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(sync.data),
            }
          );

          if (!response.ok) {
            throw new Error(`Sync failed: ${response.status}`);
          }

          // Complete the match
          await fetch(
            `http://localhost:5000/api/brackets/matches/${sync.matchId}/complete`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(sync.data.bracketData),
            }
          );

          successCount++;
          console.log(`Synced item ${sync.id}`);
        }
      } catch (err) {
        console.error(`Failed to sync item ${sync.id}:`, err);
        sync.attempts = (sync.attempts || 0) + 1;
        if (sync.attempts < 3) {
          failedSyncs.push(sync);
        }
      }
    }

    // Update localStorage with only failed syncs
    localStorage.setItem(STORAGE_KEYS.PENDING_SYNCS, JSON.stringify(failedSyncs));
    setPendingSyncs(failedSyncs);
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

    setIsSyncing(false);

    if (successCount > 0) {
      alert(`✅ Successfully synced ${successCount} saved statistics!`);
    }
    if (failedSyncs.length > 0) {
      alert(`⚠️ ${failedSyncs.length} items failed to sync. Will retry later.`);
    }
  };

  // ============================================
  // 4. ADDED CONNECTION STATUS COMPONENT
  // ============================================
  const ConnectionStatus = () => {
    if (!showConnectionNotif && isOnline && pendingSyncs.length === 0) return null;

    return (
      <div className="connection-status-container">
        {/* Offline Warning */}
        {!isOnline && (
          <div className="connection-notification offline">
            <FaExclamationTriangle />
            <span>No Internet Connection - Working Offline</span>
          </div>
        )}

        {/* Online Notification */}
        {showConnectionNotif && isOnline && (
          <div className="connection-notification online">
            <FaCheckCircle />
            <span>Connection Restored</span>
          </div>
        )}

        {/* Syncing Status */}
        {isSyncing && (
          <div className="connection-notification syncing">
            <FaCloudUploadAlt className="spinning" />
            <span>Syncing data...</span>
          </div>
        )}

        {/* Pending Syncs Badge */}
        {pendingSyncs.length > 0 && !isSyncing && (
          <div className="pending-syncs-badge">
            <FaCloudUploadAlt />
            <span>{pendingSyncs.length} pending sync{pendingSyncs.length > 1 ? 's' : ''}</span>
            {isOnline && (
              <button onClick={syncPendingData} className="sync-now-button">
                Sync Now
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // 5. ADDED CONNECTION MONITORING useEffect
  // ============================================
  useEffect(() => {
    const handleOnline = () => {
      console.log('Connection restored');
      setIsOnline(true);
      setShowConnectionNotif(true);
      setTimeout(() => setShowConnectionNotif(false), 5000);
      syncPendingData();
    };

    const handleOffline = () => {
      console.log('Connection lost');
      setIsOnline(false);
      setShowConnectionNotif(true);
      setTimeout(() => setShowConnectionNotif(false), 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    loadPendingSyncs();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Function to calculate current score for QuickScore
  const calculateQuickScoreCurrentScore = (player) => {
    if (selectedGame?.sport_type === 'basketball') {
      let twoPoints, threePoints, freeThrows;
      
      if (isOvertime && currentOvertime >= 0) {
        twoPoints = player.overtime_two_points_made ? player.overtime_two_points_made[currentOvertime] || 0 : 0;
        threePoints = player.overtime_three_points_made ? player.overtime_three_points_made[currentOvertime] || 0 : 0;
        freeThrows = player.overtime_free_throws_made ? player.overtime_free_throws_made[currentOvertime] || 0 : 0;
      } else {
        twoPoints = player.two_points_made ? player.two_points_made[currentQuarter] || 0 : 0;
        threePoints = player.three_points_made ? player.three_points_made[currentQuarter] || 0 : 0;
        freeThrows = player.free_throws_made ? player.free_throws_made[currentQuarter] || 0 : 0;
      }
      
      return (twoPoints * 2) + (threePoints * 3) + freeThrows;
    } else {
      // Volleyball scoring
      const kills = player.kills?.[currentQuarter] || 0;
      const aces = player.service_aces?.[currentQuarter] || 0;
      const blocks = player.volleyball_blocks?.[currentQuarter] || 0;
      return kills + aces + blocks;
    }
  };

  // QuickScore stat click handler
  const handleQuickScoreStatClick = (playerId, statKey) => {
    const playerIndex = playerStats.findIndex(p => p.player_id === playerId);
    if (playerIndex === -1) return;

    const newStats = [...playerStats];
    let currentValue;
    
    if (isOvertime && statKey.startsWith("overtime_")) {
      const overtimeStatName = statKey;
      currentValue = newStats[playerIndex][overtimeStatName]?.[currentOvertime] || 0;
      const newValue = currentValue + 1;
      
      if (!newStats[playerIndex][overtimeStatName]) {
        newStats[playerIndex][overtimeStatName] = [];
      }
      newStats[playerIndex][overtimeStatName][currentOvertime] = newValue;
    } else if (isOvertime) {
      const overtimeStatName = `overtime_${statKey}`;
      currentValue = newStats[playerIndex][overtimeStatName]?.[currentOvertime] || 0;
      const newValue = currentValue + 1;
      
      if (!newStats[playerIndex][overtimeStatName]) {
        newStats[playerIndex][overtimeStatName] = [];
      }
      newStats[playerIndex][overtimeStatName][currentOvertime] = newValue;
    } else {
      currentValue = newStats[playerIndex][statKey][currentQuarter] || 0;
      const newValue = currentValue + 1;
      newStats[playerIndex][statKey][currentQuarter] = newValue;
    }
    
    // Handle volleyball scoring
    if (selectedGame?.sport_type === "volleyball") {
      const player = newStats[playerIndex];
      const isTeam1 = player.team_id === selectedGame.team1_id;
      
      if (statKey === "serve_errors" || statKey === "attack_errors") {
        if (isTeam1) {
          setTeamScores(prev => {
            const newTeam2Scores = [...prev.team2];
            const currentScore = newTeam2Scores[currentQuarter] || 0;
            newTeam2Scores[currentQuarter] = currentScore + 1;
            return {
              ...prev,
              team2: newTeam2Scores
            };
          });
        } else {
          setTeamScores(prev => {
            const newTeam1Scores = [...prev.team1];
            const currentScore = newTeam1Scores[currentQuarter] || 0;
            newTeam1Scores[currentQuarter] = currentScore + 1;
            return {
              ...prev,
              team1: newTeam1Scores
            };
          });
        }
      } else if (statKey === "service_aces" || statKey === "kills" || statKey === "volleyball_blocks") {
        if (isTeam1) {
          setTeamScores(prev => {
            const newTeam1Scores = [...prev.team1];
            const currentScore = newTeam1Scores[currentQuarter] || 0;
            newTeam1Scores[currentQuarter] = currentScore + 1;
            return {
              ...prev,
              team1: newTeam1Scores
            };
          });
        } else {
          setTeamScores(prev => {
            const newTeam2Scores = [...prev.team2];
            const currentScore = newTeam2Scores[currentQuarter] || 0;
            newTeam2Scores[currentQuarter] = currentScore + 1;
            return {
              ...prev,
              team2: newTeam2Scores
            };
          });
        }
      }
    }
    
    setPlayerStats(newStats);

    // Recalculate team scores for basketball
    if (selectedGame?.sport_type === "basketball" && 
        (statKey.includes("points_made") || statKey.includes("free_throws"))) {
      const scores = calculateTeamScores(newStats, selectedGame.team1_id, selectedGame.team2_id, selectedGame.sport_type);
      setTeamScores(scores);
      setOvertimeScores(scores.overtime);
    }
  };

  // Get players for QuickScore based on current view
  const getQuickScorePlayers = () => {
    if (!selectedGame) return [];
    
    const onCourtPlayers = playerStats.filter(p => p.isOnCourt);
    
    if (showBothTeams) {
      return onCourtPlayers;
    } else {
      const activeTeamId = activeTeamView === 'team1' ? selectedGame.team1_id : selectedGame.team2_id;
      return onCourtPlayers.filter(p => p.team_id === activeTeamId);
    }
  };

  // QuickScore Component
  const QuickScoreBar = () => {
    if (!selectedGame) return null;

    const quickScorePlayers = getQuickScorePlayers();
    const statButtons = selectedGame.sport_type === 'basketball' ? basketballStatButtons : volleyballStatButtons;
    const periodName = selectedGame.sport_type === 'basketball' ? 'Quarter' : 'Set';

    return (
      <div className="quick-score-bar">
        {/* Header */}
        <div className="quick-score-header">
          <div className="quick-score-title">
            <FaUsers className="quick-score-icon" />
            <h2>Quick Score</h2>
            <span className="quick-score-subtitle">
              {periodName} {currentQuarter + 1} - Tap player → Select stat
            </span>
          </div>
          <button
            onClick={() => setIsQuickScoreExpanded(!isQuickScoreExpanded)}
            className="quick-score-toggle"
          >
            {isQuickScoreExpanded ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </div>

        {/* Player Cards - Collapsible */}
        {isQuickScoreExpanded && (
          <div className="quick-score-content">
            <div className="quick-score-players-grid">
              {quickScorePlayers.map((player) => (
                <button
                  key={player.player_id}
                  onClick={() => setSelectedQuickScorePlayer(
                    selectedQuickScorePlayer?.player_id === player.player_id ? null : player
                  )}
                  className={`quick-score-player-card ${
                    selectedQuickScorePlayer?.player_id === player.player_id ? 'selected' : ''
                  }`}
                >
                  <div className="quick-score-player-content">
                    <div className="quick-score-player-number">#{player.jersey_number}</div>
                    <div className="quick-score-player-name">{player.player_name}</div>
                    <div className="quick-score-player-position">{player.position}</div>
                    <div className="quick-score-player-team">{player.team_name}</div>
                    <div className="quick-score-player-points">
                      {calculateQuickScoreCurrentScore(player)}
                    </div>
                    <div className="quick-score-player-points-label">points this {periodName.toLowerCase()}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Stat Buttons - Appears when player selected */}
            {selectedQuickScorePlayer && (
              <div className="quick-score-stats">
                <div className="quick-score-stats-header">
                  <h3>Recording for: #{selectedQuickScorePlayer.jersey_number} {selectedQuickScorePlayer.player_name}</h3>
                  <button
                    onClick={() => setSelectedQuickScorePlayer(null)}
                    className="quick-score-close"
                  >
                    <FaTimes />
                  </button>
                </div>
                 <div className="quick-score-stats-grid">
                  {statButtons.map((stat) => {
                    const colorMap = {
                      'bg-blue-600': '#2563eb',
                      'bg-purple-600': '#9333ea',
                      'bg-green-600': '#16a34a',
                      'bg-orange-600': '#ea580c',
                      'bg-teal-600': '#0d9488',
                      'bg-yellow-600': '#ca8a04',
                      'bg-red-600': '#dc2626',
                      'bg-red-800': '#991b1b',  // ADDED for reception errors
                      'bg-gray-600': '#4b5563',
                      'bg-pink-600': '#db2777'
                    };
                    const bgColor = colorMap[stat.color.split(' ')[0]] || '#4b5563';
                    
                    return (
                      <button
                        key={stat.key}
                        onClick={() => handleQuickScoreStatClick(selectedQuickScorePlayer.player_id, stat.key)}
                        className="quick-score-stat-button"
                        style={{
                          background: `linear-gradient(135deg, ${bgColor}, ${bgColor}dd)`
                        }}
                      >
                        <div>{stat.label}</div>
                        <div className="quick-score-stat-count">
                          {isOvertime 
                            ? (selectedQuickScorePlayer[`overtime_${stat.key}`]?.[currentOvertime] || 0)
                            : (selectedQuickScorePlayer[stat.key]?.[currentQuarter] || 0)
                          }
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Control Bar Component - UPDATED with centered layout
  const ControlBar = () => {
    if (!selectedGame) return null;

    return (
      <div className="control-bar">
        <button 
          onClick={shiftTeamView}
          className="control-bar-button"
        >
          <FaExchangeAlt /> Switch Team View
        </button>
        
        <div className="current-view-display">
          Current View: 
          <span className="view-indicator">
            {showBothTeams ? 'Both Teams' : (activeTeamView === 'team1' ? selectedGame.team1_name : selectedGame.team2_name)}
          </span>
        </div>
        
        <label className="control-bar-checkbox">
          <input
            type="checkbox"
            checked={showBothTeams}
            onChange={() => setShowBothTeams(!showBothTeams)}
          />
          Show Both Teams
        </label>
        
        <label className="control-bar-checkbox">
          <input
            type="checkbox"
            checked={hideButtons}
            onChange={() => setHideButtons(!hideButtons)}
          />
          Hide Buttons
        </label>
      </div>
    );
  };

  // Function to calculate total points from shooting stats (including overtime)
  const calculateTotalPoints = (player) => {
    const twoPoints = player.two_points_made ? player.two_points_made.reduce((a, b) => a + b, 0) : 0;
    const threePoints = player.three_points_made ? player.three_points_made.reduce((a, b) => a + b, 0) : 0;
    const freeThrows = player.free_throws_made ? player.free_throws_made.reduce((a, b) => a + b, 0) : 0;
    
    // Add overtime points if they exist
    const overtimeTwoPoints = player.overtime_two_points_made ? player.overtime_two_points_made.reduce((a, b) => a + b, 0) : 0;
    const overtimeThreePoints = player.overtime_three_points_made ? player.overtime_three_points_made.reduce((a, b) => a + b, 0) : 0;
    const overtimeFreeThrows = player.overtime_free_throws_made ? player.overtime_free_throws_made.reduce((a, b) => a + b, 0) : 0;
    
    return (twoPoints * 2) + (threePoints * 3) + freeThrows + 
           (overtimeTwoPoints * 2) + (overtimeThreePoints * 3) + overtimeFreeThrows;
  };

  // Function to calculate current period points for basketball
  const calculateCurrentPeriodPoints = (player) => {
    if (selectedGame?.sport_type === "basketball") {
      let twoPoints, threePoints, freeThrows;
      
      if (isOvertime && currentOvertime >= 0) {
        twoPoints = player.overtime_two_points_made ? player.overtime_two_points_made[currentOvertime] || 0 : 0;
        threePoints = player.overtime_three_points_made ? player.overtime_three_points_made[currentOvertime] || 0 : 0;
        freeThrows = player.overtime_free_throws_made ? player.overtime_free_throws_made[currentOvertime] || 0 : 0;
      } else {
        twoPoints = player.two_points_made ? player.two_points_made[currentQuarter] || 0 : 0;
        threePoints = player.three_points_made ? player.three_points_made[currentQuarter] || 0 : 0;
        freeThrows = player.free_throws_made ? player.free_throws_made[currentQuarter] || 0 : 0;
      }
      
      return (twoPoints * 2) + (threePoints * 3) + freeThrows;
    } else if (selectedGame?.sport_type === "volleyball") {
      // Volleyball scoring: kills + aces + blocks
      const kills = player.kills ? player.kills[currentQuarter] || 0 : 0;
      const aces = player.service_aces ? player.service_aces[currentQuarter] || 0 : 0;
      const blocks = player.volleyball_blocks ? player.volleyball_blocks[currentQuarter] || 0 : 0;
      return kills + aces + blocks;
    }
    return 0;
  };

  // Function to handle team view shifting
  const shiftTeamView = () => {
    setActiveTeamView(prev => prev === 'team1' ? 'team2' : 'team1');
  };

  const getMaxStartingPlayers = (sportType) => {
    return sportType === "volleyball" ? 6 : 5;
  };

  // Function to check if a position is already taken in the starting lineup
  const isPositionTaken = (teamKey, playerId, position) => {
    if (!position || position === "N/A") return false;
    
    const currentStarters = startingPlayers[teamKey];
    return currentStarters.some(starterId => {
      const starter = playerStats.find(p => p.player_id === starterId);
      return starter && starter.player_id !== playerId && starter.position === position;
    });
  };

  // Function to get available positions for a team
  const getAvailablePositions = (teamKey) => {
    const currentStarters = startingPlayers[teamKey];
    const takenPositions = new Set();
    
    currentStarters.forEach(starterId => {
      const starter = playerStats.find(p => p.player_id === starterId);
      if (starter && starter.position && starter.position !== "N/A") {
        takenPositions.add(starter.position);
      }
    });
    
    return takenPositions;
  };

  const initializeStartingPlayers = (stats, team1Id, team2Id, sportType) => {
    const maxStarters = getMaxStartingPlayers(sportType);
    
    if (sportType === "basketball") {
      const team1Players = stats.filter(p => p.team_id === team1Id);
      const team2Players = stats.filter(p => p.team_id === team2Id);
      
      const team1Starters = [];
      const usedPositionsTeam1 = new Set();
      
      team1Players.forEach(player => {
        if (team1Starters.length < maxStarters && player.position && player.position !== "N/A") {
          if (!usedPositionsTeam1.has(player.position)) {
            team1Starters.push(player.player_id);
            usedPositionsTeam1.add(player.position);
          }
        }
      });
      
      team1Players.forEach(player => {
        if (team1Starters.length < maxStarters && !team1Starters.includes(player.player_id)) {
          team1Starters.push(player.player_id);
        }
      });
      
      const team2Starters = [];
      const usedPositionsTeam2 = new Set();
      
      team2Players.forEach(player => {
        if (team2Starters.length < maxStarters && player.position && player.position !== "N/A") {
          if (!usedPositionsTeam2.has(player.position)) {
            team2Starters.push(player.player_id);
            usedPositionsTeam2.add(player.position);
          }
        }
      });
      
      team2Players.forEach(player => {
        if (team2Starters.length < maxStarters && !team2Starters.includes(player.player_id)) {
          team2Starters.push(player.player_id);
        }
      });
      
      setStartingPlayers({
        team1: team1Starters,
        team2: team2Starters
      });

      const updatedStats = stats.map(player => ({
        ...player,
        isStarting: team1Starters.includes(player.player_id) || 
                   team2Starters.includes(player.player_id),
        isOnCourt: team1Starters.includes(player.player_id) || 
                   team2Starters.includes(player.player_id)
      }));

      setPlayerStats(updatedStats);
    } else {
      // VOLLEYBALL: Auto-assign positions for starting 6
      const team1Players = stats.filter(p => p.team_id === team1Id);
      const team2Players = stats.filter(p => p.team_id === team2Id);
      
      // Define the required positions in order
      const requiredPositions = [
        "Opposite Hitter",
        "Middle Blocker", 
        "Outside Hitter",
        "Libero",
        "Setter",
        "Outside Hitter"
      ];
      
      // Function to assign positions to a team
      const assignVolleyballPositions = (players) => {
        const starters = [];
        const usedPlayerIds = new Set();
        const assignedPositions = [];
        
        // First pass: try to match players with their actual positions
        requiredPositions.forEach(position => {
          // Find a player who already has this position
          const matchingPlayer = players.find(p => 
            !usedPlayerIds.has(p.player_id) && 
            p.position && 
            p.position.toLowerCase() === position.toLowerCase()
          );
          
          if (matchingPlayer) {
            starters.push(matchingPlayer.player_id);
            usedPlayerIds.add(matchingPlayer.player_id);
            assignedPositions.push({ playerId: matchingPlayer.player_id, position });
          } else {
            // If no player has this position, find any available player
            const availablePlayer = players.find(p => !usedPlayerIds.has(p.player_id));
            if (availablePlayer) {
              starters.push(availablePlayer.player_id);
              usedPlayerIds.add(availablePlayer.player_id);
              assignedPositions.push({ playerId: availablePlayer.player_id, position });
            }
          }
        });
        
        // If we don't have enough players, fill with what we have
        if (starters.length < maxStarters) {
          const remainingPlayers = players.filter(p => !usedPlayerIds.has(p.player_id));
          remainingPlayers.slice(0, maxStarters - starters.length).forEach(player => {
            starters.push(player.player_id);
            usedPlayerIds.add(player.player_id);
            // Assign the next available position
            const nextPosition = requiredPositions[assignedPositions.length] || "Outside Hitter";
            assignedPositions.push({ playerId: player.player_id, position: nextPosition });
          });
        }
        
        return { starters, assignedPositions };
      };
      
      // Assign positions for both teams
      const team1Assignment = assignVolleyballPositions(team1Players);
      const team2Assignment = assignVolleyballPositions(team2Players);
      
      // Update player positions based on assignment
      const updatedStats = stats.map(player => {
        // Check if player is in team1 starting lineup
        const team1Starter = team1Assignment.assignedPositions.find(ap => ap.playerId === player.player_id);
        if (team1Starter) {
          return { 
            ...player, 
            position: team1Starter.position,
            isStarting: true,
            isOnCourt: true
          };
        }
        
        // Check if player is in team2 starting lineup
        const team2Starter = team2Assignment.assignedPositions.find(ap => ap.playerId === player.player_id);
        if (team2Starter) {
          return { 
            ...player, 
            position: team2Starter.position,
            isStarting: true,
            isOnCourt: true
          };
        }
        
        // Bench players
        return {
          ...player,
          isStarting: false,
          isOnCourt: false
        };
      });
      
      setStartingPlayers({
        team1: team1Assignment.starters,
        team2: team2Assignment.starters
      });

      setPlayerStats(updatedStats);
    }
  };

  const handleStartingPlayerToggle = (playerId, teamId) => {
    const sportType = selectedGame?.sport_type;
    const maxStarters = getMaxStartingPlayers(sportType);
    const teamKey = teamId === selectedGame.team1_id ? 'team1' : 'team2';
    const currentStarters = [...startingPlayers[teamKey]];
    const player = playerStats.find(p => p.player_id === playerId);
    
    if (sportType === "basketball" && player && player.position && player.position !== "N/A") {
      if (isPositionTaken(teamKey, playerId, player.position)) {
        alert(`Position "${player.position}" is already taken in the starting lineup. Please select a player with a different position.`);
        return;
      }
    }
    
    if (currentStarters.includes(playerId)) {
      const updatedStarters = currentStarters.filter(id => id !== playerId);
      setStartingPlayers(prev => ({
        ...prev,
        [teamKey]: updatedStarters
      }));
      
      setPlayerStats(prev => prev.map(p => 
        p.player_id === playerId ? { ...p, isStarting: false, isOnCourt: false } : p
      ));
    } else {
      if (currentStarters.length >= maxStarters) {
        const playerToRemove = currentStarters[0];
        
        const updatedStarters = currentStarters.map(starterId => 
          starterId === playerToRemove ? playerId : starterId
        );
        
        setStartingPlayers(prev => ({
          ...prev,
          [teamKey]: updatedStarters
        }));
        
        setPlayerStats(prev => prev.map(p => {
          if (p.player_id === playerId) {
            return { ...p, isStarting: true, isOnCourt: true };
          }
          if (p.player_id === playerToRemove) {
            return { ...p, isStarting: false, isOnCourt: false };
          }
          return p;
        }));
      } else {
        const updatedStarters = [...currentStarters, playerId];
        setStartingPlayers(prev => ({
          ...prev,
          [teamKey]: updatedStarters
        }));
        
        setPlayerStats(prev => prev.map(p => 
          p.player_id === playerId ? { ...p, isStarting: true, isOnCourt: true } : p
        ));
      }
    }
  };

  const getSortedTeamPlayers = (teamId) => {
    const teamPlayers = playerStats.filter(player => player.team_id === teamId);
    
    return teamPlayers.sort((a, b) => {
      if (a.isOnCourt && !b.isOnCourt) return -1;
      if (!a.isOnCourt && b.isOnCourt) return 1;
      return a.player_name.localeCompare(b.player_name);
    });
  };

  const calculateHittingPercentage = (player) => {
    const kills = player.kills ? player.kills.reduce((a, b) => a + b, 0) : 0;
    const attempts = player.attack_attempts ? player.attack_attempts.reduce((a, b) => a + b, 0) : 0;
    const errors = player.attack_errors ? player.attack_errors.reduce((a, b) => a + b, 0) : 0;
    
    if (attempts === 0) return "0.00%";
    return (((kills - errors) / attempts) * 100).toFixed(2) + "%";
  };

  const isPlayerFouledOut = (player) => {
    const totalFouls = player.fouls ? player.fouls.reduce((a, b) => a + b, 0) : 0;
    const overtimeFouls = player.overtime_fouls ? player.overtime_fouls.reduce((a, b) => a + b, 0) : 0;
    return (totalFouls + overtimeFouls) >= 5;
  };

  const groupGamesByRound = (games) => {
    const grouped = {};
    
    const singleEliminationGames = games.filter(game => game.elimination_type === 'single');
    const doubleEliminationGames = games.filter(game => game.elimination_type === 'double');
    
    if (singleEliminationGames.length > 0) {
      const maxRound = Math.max(...singleEliminationGames.map(game => game.round_number));
      const finalRoundGames = singleEliminationGames.filter(game => game.round_number === maxRound);
      
      if (finalRoundGames.length > 0) {
        grouped['Championship'] = {
          'Tournament Final': finalRoundGames
        };
        
        singleEliminationGames
          .filter(game => game.round_number !== maxRound)
          .forEach(game => {
            const roundKey = `Round ${game.round_number}`;
            
            if (!grouped[roundKey]) {
              grouped[roundKey] = {};
            }
            
            const bracketKey = `${game.bracket_name || 'Main Bracket'}`;
            if (!grouped[roundKey][bracketKey]) {
              grouped[roundKey][bracketKey] = [];
            }
            
            grouped[roundKey][bracketKey].push(game);
          });
      }
    }
    
    if (doubleEliminationGames.length > 0) {
      const winnerGames = doubleEliminationGames.filter(game => game.bracket_type === 'winner');
      const loserGames = doubleEliminationGames.filter(game => game.bracket_type === 'loser');
      const championshipGames = doubleEliminationGames.filter(game => game.bracket_type === 'championship');
      
      const grandFinalGames = championshipGames.filter(game => game.round_number === 200);
      const resetFinalGames = championshipGames.filter(game => game.round_number === 201);
      
      winnerGames.forEach(game => {
        const roundKey = `Round ${game.round_number}`;
        
        if (!grouped[roundKey]) {
          grouped[roundKey] = {};
        }
        
        const bracketKey = `${game.bracket_name || 'Main Bracket'} - Winner's Bracket`;
        if (!grouped[roundKey][bracketKey]) {
          grouped[roundKey][bracketKey] = [];
        }
        
        grouped[roundKey][bracketKey].push(game);
      });
      
      loserGames.forEach(game => {
        const loserRound = game.round_number - 100;
        const roundKey = `LB Round ${loserRound}`;
        
        if (!grouped[roundKey]) {
          grouped[roundKey] = {};
        }
        
        const bracketKey = `${game.bracket_name || 'Main Bracket'} - Loser's Bracket`;
        if (!grouped[roundKey][bracketKey]) {
          grouped[roundKey][bracketKey] = [];
        }
        
        grouped[roundKey][bracketKey].push(game);
      });
      
      if (grandFinalGames.length > 0 || resetFinalGames.length > 0) {
        grouped['Championship'] = {};
        
        if (grandFinalGames.length > 0) {
          grouped['Championship']['Grand Final'] = grandFinalGames;
        }
        
        if (resetFinalGames.length > 0 && resetFinalGames[0].status !== 'hidden') {
          grouped['Championship']['Reset Final'] = resetFinalGames;
        }
      }
    }

    return grouped;
  };

  useEffect(() => {
    const storedMatchData = sessionStorage.getItem('selectedMatchData');
    
    if (storedMatchData) {
      setCameFromStaffEvents(true);
      try {
        const matchData = JSON.parse(storedMatchData);
        
        const loadFromSession = async () => {
          if (matchData.eventId) {
            const eventRes = await fetch(`http://localhost:5000/api/stats/events`);
            const eventsData = await eventRes.json();
            const event = eventsData.find(e => e.id === matchData.eventId);
            
            if (event) {
              setSelectedEvent(event);
              
              const bracketRes = await fetch(`http://localhost:5000/api/stats/events/${event.id}/brackets`);
              const bracketsData = await bracketRes.json();
              setBrackets(bracketsData);
              
              const bracket = bracketsData.find(b => b.id === matchData.bracketId);
              if (bracket) {
                setSelectedBracket(bracket);
                
                const matchRes = await fetch(`http://localhost:5000/api/stats/${bracket.id}/matches`);
                const matchesData = await matchRes.json();
                const matches = matchesData.filter(m => m.status !== 'hidden');
                setGames(matches);
                
                const match = matches.find(m => m.id === matchData.matchId);
                if (match) {
                  handleGameSelect(match);
                }
              }
            }
          }
          
          sessionStorage.removeItem('selectedMatchData');
        };
        
        loadFromSession();
      } catch (err) {
        console.error('Error loading match from session:', err);
        sessionStorage.removeItem('selectedMatchData');
      }
    }
  }, []);

  const sortRounds = (rounds) => {
    return Object.entries(rounds).sort(([a], [b]) => {
      if (a === 'Championship') return 1;
      if (b === 'Championship') return -1;
      
      const aIsLB = a.startsWith('LB Round');
      const bIsLB = b.startsWith('LB Round');
      
      if (aIsLB && !bIsLB) return 1;
      if (!aIsLB && bIsLB) return -1;
      
      const getRoundNumber = (roundName) => {
        if (roundName.startsWith('LB Round')) {
          return parseInt(roundName.split(' ')[2]) + 1000;
        }
        if (roundName.startsWith('Round')) {
          return parseInt(roundName.split(' ')[1]);
        }
        return 0;
      };
      
      const aNum = getRoundNumber(a);
      const bNum = getRoundNumber(b);
      
      return aNum - bNum;
    });
  };

  const renderGameCard = (game, roundName) => {
    const isResetFinal = game.round_number === 201;
    const isChampionship = roundName === 'Championship';
    
    return (
      <div className={`match-card ${isResetFinal ? 'reset-final' : ''}`} key={game.id}>
        <div className="match-header">
          <div className="match-teams">
            <h4>
              {game.team1_name || "Team 1"} vs {game.team2_name || "Team 2"}
              {isResetFinal && <span className="reset-final-badge">RESET FINAL</span>}
              {game.winner_id && isChampionship && (
                <FaCrown className="champion-icon" title="Tournament Champion" />
              )}
            </h4>
            <div className="match-badges">
              <span className="round-badge">{game.sport_type}</span>
              {game.elimination_type === 'double' && (
                <span className="bracket-type-badge">
                  {isResetFinal ? 'Reset Final' : 
                   game.bracket_type ? game.bracket_type.charAt(0).toUpperCase() + game.bracket_type.slice(1) : 'Winner'} 
                  {!isResetFinal && ' Bracket'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="match-info">
          <p><strong>Type:</strong> {game.elimination_type === 'double' ? 'Double Elimination' : 'Single Elimination'}</p>
          <p>
            <strong>Status:</strong> <span className={`match-status status-${game.status}`}>{game.status}</span>
          </p>
          {game.status === "completed" && (
            <div className="match-score">{game.score_team1} - {game.score_team2}</div>
          )}
          {game.winner_name && (
            <p>
              <strong>Winner:</strong> 
              <span className="winner-name">
                {game.winner_name}
                {(isResetFinal || game.round_number === 200) && <FaTrophy className="trophy-icon" />}
              </span>
            </p>
          )}
        </div>
        <button 
          onClick={() => handleGameSelect(game)}
          className="btn-input-stats"
        >
          {game.status === "completed" ? "Edit Statistics" : "Record Statistics"}
        </button>
      </div>
    );
  };

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:5000/api/stats/events");
        const data = await res.json();
        setEvents(data);
        
        if (data.length === 1) {
          handleEventSelect(data[0]);
        }
      } catch (err) {
        setError("Failed to load events");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Function to calculate team scores including overtime
  const calculateTeamScores = (stats, team1Id, team2Id, sportType) => {
    const team1Scores = sportType === "basketball" ? [0, 0, 0, 0] : [0, 0, 0, 0, 0];
    const team2Scores = sportType === "basketball" ? [0, 0, 0, 0] : [0, 0, 0, 0, 0];
    const team1OvertimeScores = [];
    const team2OvertimeScores = [];

    stats.forEach(player => {
      const playerTeamId = player.team_id;
      
      if (playerTeamId === team1Id) {
        // Regulation scoring
        for (let i = 0; i < team1Scores.length; i++) {
          if (sportType === "basketball") {
            const twoPoints = player.two_points_made ? player.two_points_made[i] || 0 : 0;
            const threePoints = player.three_points_made ? player.three_points_made[i] || 0 : 0;
            const freeThrows = player.free_throws_made ? player.free_throws_made[i] || 0 : 0;
            team1Scores[i] += (twoPoints * 2) + (threePoints * 3) + freeThrows;
          } else {
            // Volleyball scoring: kills, aces, and volleyball_blocks score points
            // Also account for errors giving points to the other team
            const kills = player.kills ? player.kills[i] || 0 : 0;
            const aces = player.service_aces ? player.service_aces[i] || 0 : 0;
            const blocks = player.volleyball_blocks ? player.volleyball_blocks[i] || 0 : 0;
            
            // Team1 gets points from their kills, aces, and blocks
            team1Scores[i] += kills + aces + blocks;
            
            // Team2 gets points from Team1's errors (this is handled separately in adjustPlayerStat)
            // But we need to account for it when loading existing data
          }
        }
        
        // Overtime scoring
        if (sportType === "basketball" && player.overtime_two_points_made) {
          for (let i = 0; i < player.overtime_two_points_made.length; i++) {
            const twoPoints = player.overtime_two_points_made[i] || 0;
            const threePoints = player.overtime_three_points_made ? player.overtime_three_points_made[i] || 0 : 0;
            const freeThrows = player.overtime_free_throws_made ? player.overtime_free_throws_made[i] || 0 : 0;
            
            if (team1OvertimeScores.length <= i) {
              team1OvertimeScores.push(0);
            }
            team1OvertimeScores[i] += (twoPoints * 2) + (threePoints * 3) + freeThrows;
          }
        }
      } else if (playerTeamId === team2Id) {
        // Regulation scoring
        for (let i = 0; i < team2Scores.length; i++) {
          if (sportType === "basketball") {
            const twoPoints = player.two_points_made ? player.two_points_made[i] || 0 : 0;
            const threePoints = player.three_points_made ? player.three_points_made[i] || 0 : 0;
            const freeThrows = player.free_throws_made ? player.free_throws_made[i] || 0 : 0;
            team2Scores[i] += (twoPoints * 2) + (threePoints * 3) + freeThrows;
          } else {
            // Volleyball scoring: kills, aces, and volleyball_blocks score points
            const kills = player.kills ? player.kills[i] || 0 : 0;
            const aces = player.service_aces ? player.service_aces[i] || 0 : 0;
            const blocks = player.volleyball_blocks ? player.volleyball_blocks[i] || 0 : 0;
            
            // Team2 gets points from their kills, aces, and blocks
            team2Scores[i] += kills + aces + blocks;
            
            // Team1 gets points from Team2's errors (this is handled separately in adjustPlayerStat)
          }
        }
        
        // Overtime scoring
        if (sportType === "basketball" && player.overtime_two_points_made) {
          for (let i = 0; i < player.overtime_two_points_made.length; i++) {
            const twoPoints = player.overtime_two_points_made[i] || 0;
            const threePoints = player.overtime_three_points_made ? player.overtime_three_points_made[i] || 0 : 0;
            const freeThrows = player.overtime_free_throws_made ? player.overtime_free_throws_made[i] || 0 : 0;
            
            if (team2OvertimeScores.length <= i) {
              team2OvertimeScores.push(0);
            }
            team2OvertimeScores[i] += (twoPoints * 2) + (threePoints * 3) + freeThrows;
          }
        }
      }
    });

    return { 
      team1: team1Scores, 
      team2: team2Scores,
      overtime: {
        team1: team1OvertimeScores,
        team2: team2OvertimeScores
      }
    };
  };

  // NEW FUNCTION: Calculate volleyball scores from errors
  const calculateVolleyballScoresFromErrors = (stats, team1Id, team2Id) => {
    const team1Scores = [0, 0, 0, 0, 0];
    const team2Scores = [0, 0, 0, 0, 0];

    stats.forEach(player => {
      const playerTeamId = player.team_id;
      
      if (playerTeamId === team1Id) {
        // Team2 gets points from Team1's errors
        for (let i = 0; i < team2Scores.length; i++) {
          const serveErrors = player.serve_errors ? player.serve_errors[i] || 0 : 0;
          const attackErrors = player.attack_errors ? player.attack_errors[i] || 0 : 0;
          team2Scores[i] += serveErrors + attackErrors;
        }
      } else if (playerTeamId === team2Id) {
        // Team1 gets points from Team2's errors
        for (let i = 0; i < team1Scores.length; i++) {
          const serveErrors = player.serve_errors ? player.serve_errors[i] || 0 : 0;
          const attackErrors = player.attack_errors ? player.attack_errors[i] || 0 : 0;
          team1Scores[i] += serveErrors + attackErrors;
        }
      }
    });

    return { team1: team1Scores, team2: team2Scores };
  };

  // NEW FUNCTION: Combine volleyball scores from positive plays and errors
  const calculateCombinedVolleyballScores = (stats, team1Id, team2Id) => {
    const positiveScores = calculateTeamScores(stats, team1Id, team2Id, "volleyball");
    const errorScores = calculateVolleyballScoresFromErrors(stats, team1Id, team2Id);
    
    const combinedTeam1Scores = positiveScores.team1.map((score, index) => 
      score + (errorScores.team1[index] || 0)
    );
    
    const combinedTeam2Scores = positiveScores.team2.map((score, index) => 
      score + (errorScores.team2[index] || 0)
    );
    
    return {
      team1: combinedTeam1Scores,
      team2: combinedTeam2Scores,
      overtime: positiveScores.overtime
    };
  };

  const toggleRoundExpansion = (roundNumber) => {
    const newExpandedRounds = new Set(expandedRounds);
    if (newExpandedRounds.has(roundNumber)) {
      newExpandedRounds.delete(roundNumber);
    } else {
      newExpandedRounds.add(roundNumber);
    }
    setExpandedRounds(newExpandedRounds);
  };

  const handleEventSelect = async (event) => {
    if (!event) return;
    
    setSelectedEvent(event);
    setSelectedBracket(null);
    setSelectedGame(null);
    setPlayerStats([]);
    setTeamScores({ team1: [0, 0, 0, 0], team2: [0, 0, 0, 0] });
    setOvertimeScores({ team1: [], team2: [] });
    setCurrentQuarter(0);
    setCurrentOvertime(0);
    setIsOvertime(false);
    setOvertimePeriods(0);
    setExpandedRounds(new Set([1]));
    setActiveTeamView('team1');
    setShowBothTeams(false);
    setShowBenchPlayers({ team1: false, team2: false });
    setLoading(true);
    setError(null);

    try {
      const bracketRes = await fetch(`http://localhost:5000/api/stats/events/${event.id}/brackets`);
      
      if (!bracketRes.ok) {
        throw new Error(`HTTP error! status: ${bracketRes.status}`);
      }
      
      const bracketData = await bracketRes.json();
      setBrackets(bracketData);

      if (bracketData.length === 0) {
        setError("No brackets found for this event.");
        setGames([]);
        setTeams([]);
      } else if (bracketData.length === 1) {
        handleBracketSelect(bracketData[0]);
      }

    } catch (err) {
      setError("Failed to load event data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBracketSelect = async (bracket) => {
    if (!bracket) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const allMatches = [];
      const allTeams = [];

      const matchRes = await fetch(`http://localhost:5000/api/stats/${bracket.id}/matches`);
      
      if (!matchRes.ok) {
        throw new Error(`Failed to load matches for ${bracket.name}`);
      }
      
      const matchData = await matchRes.json();
      const visibleMatches = matchData.filter(match => match.status !== 'hidden');
      
      const matchesWithBracket = visibleMatches.map(match => ({
        ...match,
        bracket_name: bracket.name,
        sport_type: bracket.sport_type,
        bracket_id: bracket.id,
        elimination_type: bracket.elimination_type
      }));
      
      allMatches.push(...matchesWithBracket);

      try {
        const teamRes = await fetch(`http://localhost:5000/api/stats/${bracket.id}/teams`);
        
        if (teamRes.ok) {
          const teamData = await teamRes.json();
          teamData.forEach(team => {
            if (!allTeams.find(t => t.id === team.id)) {
              allTeams.push(team);
            }
          });
        }
      } catch (teamErr) {
        console.error(`Error fetching teams:`, teamErr);
      }

      allMatches.sort((a, b) => {
        if (a.bracket_type === 'championship' && b.bracket_type !== 'championship') return 1;
        if (b.bracket_type === 'championship' && a.bracket_type !== 'championship') return -1;
        return a.round_number - b.round_number;
      });
      
      setGames(allMatches);
      setTeams(allTeams);
      setSelectedBracket(bracket);

      if (allMatches.length === 0) {
        setError("No matches found for this bracket.");
      }

    } catch (err) {
      setError("Failed to load bracket data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to add overtime period
  const addOvertimePeriod = () => {
    if (selectedGame?.sport_type !== "basketball") {
      alert("Overtime is only available for basketball games.");
      return;
    }

    if (overtimePeriods >= 5) {
      alert("Maximum of 5 overtime periods allowed.");
      return;
    }

    const newOvertimeCount = overtimePeriods + 1;
    
    // Initialize overtime arrays for all players
    const updatedStats = playerStats.map(player => ({
      ...player,
      overtime_two_points_made: [...(player.overtime_two_points_made || []), 0],
      overtime_three_points_made: [...(player.overtime_three_points_made || []), 0],
      overtime_free_throws_made: [...(player.overtime_free_throws_made || []), 0],
      overtime_assists: [...(player.overtime_assists || []), 0],
      overtime_rebounds: [...(player.overtime_rebounds || []), 0],
      overtime_steals: [...(player.overtime_steals || []), 0],
      overtime_blocks: [...(player.overtime_blocks || []), 0],
      overtime_fouls: [...(player.overtime_fouls || []), 0],
      overtime_turnovers: [...(player.overtime_turnovers || []), 0]
    }));

    setPlayerStats(updatedStats);
    setOvertimePeriods(newOvertimeCount);
    setOvertimeScores(prev => ({
      team1: [...prev.team1, 0],
      team2: [...prev.team2, 0]
    }));
    setIsOvertime(true);
    setCurrentOvertime(newOvertimeCount - 1);
  };

  // Function to remove overtime period
  const removeOvertimePeriod = (overtimeIndex) => {
    if (selectedGame?.sport_type !== "basketball") {
      alert("Overtime is only available for basketball games.");
      return;
    }

    if (overtimePeriods === 0) {
      return;
    }

    const newOvertimeCount = overtimePeriods - 1;
    
    // Remove overtime period from all players
    const updatedStats = playerStats.map(player => ({
      ...player,
      overtime_two_points_made: player.overtime_two_points_made ? player.overtime_two_points_made.filter((_, index) => index !== overtimeIndex) : [],
      overtime_three_points_made: player.overtime_three_points_made ? player.overtime_three_points_made.filter((_, index) => index !== overtimeIndex) : [],
      overtime_free_throws_made: player.overtime_free_throws_made ? player.overtime_free_throws_made.filter((_, index) => index !== overtimeIndex) : [],
      overtime_assists: player.overtime_assists ? player.overtime_assists.filter((_, index) => index !== overtimeIndex) : [],
      overtime_rebounds: player.overtime_rebounds ? player.overtime_rebounds.filter((_, index) => index !== overtimeIndex) : [],
      overtime_steals: player.overtime_steals ? player.overtime_steals.filter((_, index) => index !== overtimeIndex) : [],
      overtime_blocks: player.overtime_blocks ? player.overtime_blocks.filter((_, index) => index !== overtimeIndex) : [],
      overtime_fouls: player.overtime_fouls ? player.overtime_fouls.filter((_, index) => index !== overtimeIndex) : [],
      overtime_turnovers: player.overtime_turnovers ? player.overtime_turnovers.filter((_, index) => index !== overtimeIndex) : []
    }));

    setPlayerStats(updatedStats);
    setOvertimePeriods(newOvertimeCount);
    setOvertimeScores(prev => ({
      team1: prev.team1.filter((_, index) => index !== overtimeIndex),
      team2: prev.team2.filter((_, index) => index !== overtimeIndex)
    }));

    // Adjust current overtime if needed
    if (currentOvertime >= newOvertimeCount) {
      if (newOvertimeCount > 0) {
        setCurrentOvertime(newOvertimeCount - 1);
      } else {
        setIsOvertime(false);
        setCurrentQuarter(3); // Go back to last regulation quarter
      }
    }
  };

  // Function to switch to overtime period
  const switchToOvertime = (overtimeIndex) => {
    if (selectedGame?.sport_type !== "basketball") return;
    
    setIsOvertime(true);
    setCurrentOvertime(overtimeIndex);
  };

  // Function to switch back to regulation
  const switchToRegulation = (quarterIndex) => {
    setIsOvertime(false);
    setCurrentQuarter(quarterIndex);
  };

  // FIXED: Adjust player stat function to properly handle volleyball scoring rules
  const adjustPlayerStat = (playerIndex, statName, increment) => {
    const newStats = [...playerStats];
    let currentValue;
    
    if (isOvertime && statName.startsWith("overtime_")) {
      // Handle overtime stats
      const overtimeStatName = statName;
      currentValue = newStats[playerIndex][overtimeStatName]?.[currentOvertime] || 0;
      const newValue = Math.max(0, currentValue + (increment ? 1 : -1));
      
      if (!newStats[playerIndex][overtimeStatName]) {
        newStats[playerIndex][overtimeStatName] = [];
      }
      newStats[playerIndex][overtimeStatName][currentOvertime] = newValue;
    } else if (isOvertime) {
      // Convert regular stat names to overtime stat names
      const overtimeStatName = `overtime_${statName}`;
      currentValue = newStats[playerIndex][overtimeStatName]?.[currentOvertime] || 0;
      const newValue = Math.max(0, currentValue + (increment ? 1 : -1));
      
      if (!newStats[playerIndex][overtimeStatName]) {
        newStats[playerIndex][overtimeStatName] = [];
      }
      newStats[playerIndex][overtimeStatName][currentOvertime] = newValue;
    } else {
      // Handle regulation stats
      currentValue = newStats[playerIndex][statName][currentQuarter] || 0;
      const newValue = Math.max(0, currentValue + (increment ? 1 : -1));
      newStats[playerIndex][statName][currentQuarter] = newValue;
    }
    
    // FIXED: Handle volleyball scoring - properly handle both increment and decrement for errors
    if (selectedGame?.sport_type === "volleyball") {
      const player = newStats[playerIndex];
      const isTeam1 = player.team_id === selectedGame.team1_id;
      
      if (statName === "serve_errors" || statName === "attack_errors") {
        // When adding/removing an error, add/remove a point from the opponent
        if (isTeam1) {
          // Player is from team1, error gives point to team2
          setTeamScores(prev => {
            const newTeam2Scores = [...prev.team2];
            const currentScore = newTeam2Scores[currentQuarter] || 0;
            newTeam2Scores[currentQuarter] = Math.max(0, currentScore + (increment ? 1 : -1));
            return {
              ...prev,
              team2: newTeam2Scores
            };
          });
        } else {
          // Player is from team2, error gives point to team1
          setTeamScores(prev => {
            const newTeam1Scores = [...prev.team1];
            const currentScore = newTeam1Scores[currentQuarter] || 0;
            newTeam1Scores[currentQuarter] = Math.max(0, currentScore + (increment ? 1 : -1));
            return {
              ...prev,
              team1: newTeam1Scores
            };
          });
        }
      } else if (statName === "service_aces" || statName === "kills" || statName === "volleyball_blocks") {
        // When adding/removing a kill, ace, or block, add/remove a point to the player's team
        if (isTeam1) {
          setTeamScores(prev => {
            const newTeam1Scores = [...prev.team1];
            const currentScore = newTeam1Scores[currentQuarter] || 0;
            newTeam1Scores[currentQuarter] = Math.max(0, currentScore + (increment ? 1 : -1));
            return {
              ...prev,
              team1: newTeam1Scores
            };
          });
        } else {
          setTeamScores(prev => {
            const newTeam2Scores = [...prev.team2];
            const currentScore = newTeam2Scores[currentQuarter] || 0;
            newTeam2Scores[currentQuarter] = Math.max(0, currentScore + (increment ? 1 : -1));
            return {
              ...prev,
              team2: newTeam2Scores
            };
          });
        }
      }
    }
    
    setPlayerStats(newStats);

    // Recalculate team scores for basketball
    if (selectedGame?.sport_type === "basketball" && 
        (statName.includes("points_made") || statName.includes("free_throws"))) {
      const scores = calculateTeamScores(newStats, selectedGame.team1_id, selectedGame.team2_id, selectedGame.sport_type);
      setTeamScores(scores);
      setOvertimeScores(scores.overtime);
    }
  };

  // Change period function to handle overtime navigation
  const changePeriod = (direction) => {
    if (isOvertime) {
      // Navigating overtime periods
      if (direction === "next" && currentOvertime < overtimePeriods - 1) {
        setCurrentOvertime(currentOvertime + 1);
      } else if (direction === "prev" && currentOvertime > 0) {
        setCurrentOvertime(currentOvertime - 1);
      } else if (direction === "prev" && currentOvertime === 0) {
        // Go back to last regulation quarter
        setIsOvertime(false);
        setCurrentQuarter(3);
      }
    } else {
      // Navigating regulation periods
      const maxPeriod = selectedGame.sport_type === "basketball" ? 3 : 4;
      if (direction === "next" && currentQuarter < maxPeriod) {
        setCurrentQuarter(currentQuarter + 1);
      } else if (direction === "prev" && currentQuarter > 0) {
        setCurrentQuarter(currentQuarter - 1);
      } else if (direction === "next" && currentQuarter === maxPeriod && 
                 selectedGame.sport_type === "basketball" && 
                 teamScores.team1.reduce((a, b) => a + b, 0) === teamScores.team2.reduce((a, b) => a + b, 0)) {
        // Automatically add overtime if game is tied at end of regulation
        addOvertimePeriod();
      }
    }
  };

  const initializePlayerStats = async (game) => {
    try {
      const res1 = await fetch(`http://localhost:5000/api/stats/teams/${game.team1_id}/players`);
      const team1Players = await res1.json();

      const res2 = await fetch(`http://localhost:5000/api/stats/teams/${game.team2_id}/players`);
      const team2Players = await res2.json();

      const template = game.sport_type === "basketball" ? basketballStatsTemplate : volleyballStatsTemplate;

      const initialStats = [
        ...team1Players.map((p) => ({
          player_id: p.id,
          player_name: p.name,
          jersey_number: p.jersey_number || p.jerseyNumber || "N/A",
          position: p.position || "N/A",
          team_id: game.team1_id,
          team_name: teams.find((t) => t.id === game.team1_id)?.name,
          ...JSON.parse(JSON.stringify(template)),
          // Initialize empty overtime arrays
          overtime_two_points_made: [],
          overtime_three_points_made: [],
          overtime_free_throws_made: [],
          overtime_assists: [],
          overtime_rebounds: [],
          overtime_steals: [],
          overtime_blocks: [],
          overtime_fouls: [],
          overtime_turnovers: []
        })),
        ...team2Players.map((p) => ({
          player_id: p.id,
          player_name: p.name,
          jersey_number: p.jersey_number || p.jerseyNumber || "N/A",
          position: p.position || "N/A",
          team_id: game.team2_id,
          team_name: teams.find((t) => t.id === game.team2_id)?.name,
          ...JSON.parse(JSON.stringify(template)),
          // Initialize empty overtime arrays
          overtime_two_points_made: [],
          overtime_three_points_made: [],
          overtime_free_throws_made: [],
          overtime_assists: [],
          overtime_rebounds: [],
          overtime_steals: [],
          overtime_blocks: [],
          overtime_fouls: [],
          overtime_turnovers: []
        })),
      ];
      
      setPlayerStats(initialStats);
      initializeStartingPlayers(initialStats, game.team1_id, game.team2_id, game.sport_type);

      // Calculate initial scores based on sport type
      let scores;
      if (game.sport_type === "basketball") {
        scores = calculateTeamScores(initialStats, game.team1_id, game.team2_id, game.sport_type);
      } else {
        // For volleyball, use the combined scoring function
        scores = calculateCombinedVolleyballScores(initialStats, game.team1_id, game.team2_id);
      }
      
      setTeamScores(scores);
      setOvertimeScores(scores.overtime);

      try {
        const resStats = await fetch(`http://localhost:5000/api/stats/matches/${game.id}/stats`);
        const existingStats = await resStats.json();
        
        if (existingStats.length > 0) {
          const merged = initialStats.map((p) => {
            const found = existingStats.find((s) => s.player_id === p.player_id);
            if (found) {
              const mergedPlayer = { ...p };
              
              if (game.sport_type === "basketball") {
                // Load regulation stats
                mergedPlayer.two_points_made = found.two_points_made ? [found.two_points_made, 0, 0, 0] : [0, 0, 0, 0];
                mergedPlayer.three_points_made = found.three_points_made ? [found.three_points_made, 0, 0, 0] : [0, 0, 0, 0];
                mergedPlayer.free_throws_made = found.free_throws_made ? [found.free_throws_made, 0, 0, 0] : [0, 0, 0, 0];
                
                mergedPlayer.assists = found.assists ? [found.assists, 0, 0, 0] : [0, 0, 0, 0];
                mergedPlayer.rebounds = found.rebounds ? [found.rebounds, 0, 0, 0] : [0, 0, 0, 0];
                mergedPlayer.steals = found.steals ? [found.steals, 0, 0, 0] : [0, 0, 0, 0];
                mergedPlayer.blocks = found.blocks ? [found.blocks, 0, 0, 0] : [0, 0, 0, 0];
                mergedPlayer.fouls = found.fouls ? [found.fouls, 0, 0, 0] : [0, 0, 0, 0];
                mergedPlayer.turnovers = found.turnovers ? [found.turnovers, 0, 0, 0] : [0, 0, 0, 0];
                
                // Load overtime stats if they exist
                if (found.overtime_periods > 0) {
                  setOvertimePeriods(found.overtime_periods);
                  setIsOvertime(true);
                  setCurrentOvertime(found.overtime_periods - 1);
                  
                  mergedPlayer.overtime_two_points_made = found.overtime_two_points_made || [];
                  mergedPlayer.overtime_three_points_made = found.overtime_three_points_made || [];
                  mergedPlayer.overtime_free_throws_made = found.overtime_free_throws_made || [];
                  mergedPlayer.overtime_assists = found.overtime_assists || [];
                  mergedPlayer.overtime_rebounds = found.overtime_rebounds || [];
                  mergedPlayer.overtime_steals = found.overtime_steals || [];
                  mergedPlayer.overtime_blocks = found.overtime_blocks || [];
                  mergedPlayer.overtime_fouls = found.overtime_fouls || [];
                  mergedPlayer.overtime_turnovers = found.overtime_turnovers || [];
                }
              } else {
                // Volleyball stats - FIXED: Load per-period stats properly
                // Use per_set arrays if available, otherwise use the single values spread across sets
                if (found.kills_per_set && found.kills_per_set.length > 0) {
                  mergedPlayer.kills = [...found.kills_per_set];
                } else {
                  mergedPlayer.kills = found.kills ? [found.kills, 0, 0, 0, 0] : [0, 0, 0, 0, 0];
                }
                
                if (found.attack_attempts_per_set && found.attack_attempts_per_set.length > 0) {
                  mergedPlayer.attack_attempts = [...found.attack_attempts_per_set];
                } else {
                  mergedPlayer.attack_attempts = found.attack_attempts ? [found.attack_attempts, 0, 0, 0, 0] : [0, 0, 0, 0, 0];
                }
                
                if (found.attack_errors_per_set && found.attack_errors_per_set.length > 0) {
                  mergedPlayer.attack_errors = [...found.attack_errors_per_set];
                } else {
                  mergedPlayer.attack_errors = found.attack_errors ? [found.attack_errors, 0, 0, 0, 0] : [0, 0, 0, 0, 0];
                }
                
                if (found.serves_per_set && found.serves_per_set.length > 0) {
                  mergedPlayer.serves = [...found.serves_per_set];
                } else {
                  mergedPlayer.serves = found.serves ? [found.serves, 0, 0, 0, 0] : [0, 0, 0, 0, 0];
                }
                
                if (found.service_aces_per_set && found.service_aces_per_set.length > 0) {
                  mergedPlayer.service_aces = [...found.service_aces_per_set];
                } else {
                  mergedPlayer.service_aces = found.service_aces ? [found.service_aces, 0, 0, 0, 0] : [0, 0, 0, 0, 0];
                }
                
                if (found.serve_errors_per_set && found.serve_errors_per_set.length > 0) {
                  mergedPlayer.serve_errors = [...found.serve_errors_per_set];
                } else {
                  mergedPlayer.serve_errors = found.serve_errors ? [found.serve_errors, 0, 0, 0, 0] : [0, 0, 0, 0, 0];
                }
                
                if (found.receptions_per_set && found.receptions_per_set.length > 0) {
                  mergedPlayer.receptions = [...found.receptions_per_set];
                } else {
                  mergedPlayer.receptions = found.receptions ? [found.receptions, 0, 0, 0, 0] : [0, 0, 0, 0, 0];
                }
                
                if (found.reception_errors_per_set && found.reception_errors_per_set.length > 0) {
                  mergedPlayer.reception_errors = [...found.reception_errors_per_set];
                } else {
                  mergedPlayer.reception_errors = found.reception_errors ? [found.reception_errors, 0, 0, 0, 0] : [0, 0, 0, 0, 0];
                }
                
                if (found.digs_per_set && found.digs_per_set.length > 0) {
                  mergedPlayer.digs = [...found.digs_per_set];
                } else {
                  mergedPlayer.digs = found.digs ? [found.digs, 0, 0, 0, 0] : [0, 0, 0, 0, 0];
                }
                
                if (found.volleyball_assists_per_set && found.volleyball_assists_per_set.length > 0) {
                  mergedPlayer.volleyball_assists = [...found.volleyball_assists_per_set];
                } else {
                  mergedPlayer.volleyball_assists = found.volleyball_assists ? [found.volleyball_assists, 0, 0, 0, 0] : [0, 0, 0, 0, 0];
                }
                
                if (found.volleyball_blocks_per_set && found.volleyball_blocks_per_set.length > 0) {
                  mergedPlayer.volleyball_blocks = [...found.volleyball_blocks_per_set];
                } else {
                  mergedPlayer.volleyball_blocks = found.volleyball_blocks ? [found.volleyball_blocks, 0, 0, 0, 0] : [0, 0, 0, 0, 0];
                }
              }
              
              return mergedPlayer;
            }
            return p;
          });
          
          setPlayerStats(merged);
          
          // FIXED: Recalculate scores after loading existing stats
          let loadedScores;
          if (game.sport_type === "basketball") {
            loadedScores = calculateTeamScores(merged, game.team1_id, game.team2_id, game.sport_type);
          } else {
            // For volleyball, use the combined scoring function
            loadedScores = calculateCombinedVolleyballScores(merged, game.team1_id, game.team2_id);
          }
          
          setTeamScores(loadedScores);
          setOvertimeScores(loadedScores.overtime);
        }
      } catch (statsErr) {
        console.log("No existing stats found");
      }
    } catch (err) {
      setError("Failed to load players/stats: " + err.message);
    }
  };

  const handleGameSelect = async (game) => {
  setSelectedGame(game);
  setLoading(true);
  setActiveTeamView('team1');
  setShowBothTeams(false);
  setShowBenchPlayers({ team1: true, team2: true });
  setCurrentQuarter(0);
    setCurrentOvertime(0);
    setIsOvertime(false);
    setOvertimePeriods(0);
    
    const initialScores = game.sport_type === "basketball"
      ? { team1: [0, 0, 0, 0], team2: [0, 0, 0, 0] }
      : { team1: [0, 0, 0, 0, 0], team2: [0, 0, 0, 0, 0] };
    
    setTeamScores(initialScores);
    setOvertimeScores({ team1: [], team2: [] });

    await initializePlayerStats(game);
    setLoading(false);
  };

  // ============================================
  // 6. UPDATED saveStatistics FUNCTION WITH OFFLINE SUPPORT
  // ============================================
  const saveStatistics = async () => {
    if (!selectedGame) return;
    setLoading(true);

    try {
      // Calculate totals (keep your existing calculation code)
      const regulationTeam1Total = teamScores.team1.reduce((a, b) => a + b, 0);
      const regulationTeam2Total = teamScores.team2.reduce((a, b) => a + b, 0);
      const overtimeTeam1Total = overtimeScores.team1.reduce((a, b) => a + b, 0);
      const overtimeTeam2Total = overtimeScores.team2.reduce((a, b) => a + b, 0);
      
      const team1TotalScore = regulationTeam1Total + overtimeTeam1Total;
      const team2TotalScore = regulationTeam2Total + overtimeTeam2Total;
      
      let winner_id;
      if (team1TotalScore > team2TotalScore) {
        winner_id = selectedGame.team1_id;
      } else if (team2TotalScore > team1TotalScore) {
        winner_id = selectedGame.team2_id;
      } else {
        const addMoreOvertime = window.confirm(
          "The game is still tied! Would you like to add another overtime period?"
        );
        if (addMoreOvertime) {
          addOvertimePeriod();
          setLoading(false);
          return;
        } else {
          alert("The game remains tied. Please add more overtime periods or adjust scores.");
          setLoading(false);
          return;
        }
      }

      const statsData = {
        team1_id: selectedGame.team1_id,
        team2_id: selectedGame.team2_id,
        players: playerStats.map((p) => ({
          player_id: p.player_id,
          team_id: p.team_id,
          points: calculateTotalPoints(p),
          assists: (p.assists?.reduce((a, b) => a + b, 0) || 0) + 
                  (p.overtime_assists?.reduce((a, b) => a + b, 0) || 0),
          rebounds: (p.rebounds?.reduce((a, b) => a + b, 0) || 0) + 
                   (p.overtime_rebounds?.reduce((a, b) => a + b, 0) || 0),
          two_points_made: (p.two_points_made?.reduce((a, b) => a + b, 0) || 0) + 
                          (p.overtime_two_points_made?.reduce((a, b) => a + b, 0) || 0),
          three_points_made: (p.three_points_made?.reduce((a, b) => a + b, 0) || 0) + 
                            (p.overtime_three_points_made?.reduce((a, b) => a + b, 0) || 0),
          free_throws_made: (p.free_throws_made?.reduce((a, b) => a + b, 0) || 0) + 
                           (p.overtime_free_throws_made?.reduce((a, b) => a + b, 0) || 0),
          steals: (p.steals?.reduce((a, b) => a + b, 0) || 0) + 
                 (p.overtime_steals?.reduce((a, b) => a + b, 0) || 0),
          blocks: (p.blocks?.reduce((a, b) => a + b, 0) || 0) + 
                 (p.overtime_blocks?.reduce((a, b) => a + b, 0) || 0),
          fouls: (p.fouls?.reduce((a, b) => a + b, 0) || 0) + 
                (p.overtime_fouls?.reduce((a, b) => a + b, 0) || 0),
          turnovers: (p.turnovers?.reduce((a, b) => a + b, 0) || 0) + 
                    (p.overtime_turnovers?.reduce((a, b) => a + b, 0) || 0),
          overtime_periods: overtimePeriods,
          overtime_two_points_made: p.overtime_two_points_made || [],
          overtime_three_points_made: p.overtime_three_points_made || [],
          overtime_free_throws_made: p.overtime_free_throws_made || [],
          overtime_assists: p.overtime_assists || [],
          overtime_rebounds: p.overtime_rebounds || [],
          overtime_steals: p.overtime_steals || [],
          overtime_blocks: p.overtime_blocks || [],
          overtime_fouls: p.overtime_fouls || [],
          overtime_turnovers: p.overtime_turnovers || [],
          kills: p.kills?.reduce((a, b) => a + b, 0) || 0,
          kills_per_set: p.kills || [0, 0, 0, 0, 0],
          attack_attempts: p.attack_attempts?.reduce((a, b) => a + b, 0) || 0,
          attack_attempts_per_set: p.attack_attempts || [0, 0, 0, 0, 0],
          attack_errors: p.attack_errors?.reduce((a, b) => a + b, 0) || 0,
          attack_errors_per_set: p.attack_errors || [0, 0, 0, 0, 0],
          serves: p.serves?.reduce((a, b) => a + b, 0) || 0,
          serves_per_set: p.serves || [0, 0, 0, 0, 0],
          service_aces: p.service_aces?.reduce((a, b) => a + b, 0) || 0,
          service_aces_per_set: p.service_aces || [0, 0, 0, 0, 0],
          serve_errors: p.serve_errors?.reduce((a, b) => a + b, 0) || 0,
          serve_errors_per_set: p.serve_errors || [0, 0, 0, 0, 0],
          receptions: p.receptions?.reduce((a, b) => a + b, 0) || 0,
          receptions_per_set: p.receptions || [0, 0, 0, 0, 0],
          reception_errors: p.reception_errors?.reduce((a, b) => a + b, 0) || 0,
          reception_errors_per_set: p.reception_errors || [0, 0, 0, 0, 0],
          digs: p.digs?.reduce((a, b) => a + b, 0) || 0,
          digs_per_set: p.digs || [0, 0, 0, 0, 0],
          volleyball_assists: p.volleyball_assists?.reduce((a, b) => a + b, 0) || 0,
          volleyball_assists_per_set: p.volleyball_assists || [0, 0, 0, 0, 0],
          volleyball_blocks: p.volleyball_blocks?.reduce((a, b) => a + b, 0) || 0,
          volleyball_blocks_per_set: p.volleyball_blocks || [0, 0, 0, 0, 0],
        })),
        bracketData: {
          winner_id: winner_id,
          scores: {
            team1: team1TotalScore,
            team2: team2TotalScore,
            regulation: {
              team1: regulationTeam1Total,
              team2: regulationTeam2Total
            },
            overtime: {
              team1: overtimeTeam1Total,
              team2: overtimeTeam2Total,
              periods: overtimePeriods
            }
          }
        }
      };

      // IF OFFLINE: Save to localStorage
      if (!isOnline) {
        const saved = saveToLocalStorage(selectedGame.id, statsData, 'save_stats');
        if (saved) {
          alert(`📱 No connection detected.\n\nStatistics saved locally and will sync automatically when connection is restored.\n\nPending syncs: ${pendingSyncs.length + 1}`);
        }
        setLoading(false);
        return;
      }

      // IF ONLINE: Save to server
      const statsRes = await fetch(
        `http://localhost:5000/api/stats/matches/${selectedGame.id}/stats`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(statsData),
        }
      );
      
      if (!statsRes.ok) {
        throw new Error(`Failed to save stats: ${statsRes.status}`);
      }

      const bracketRes = await fetch(
        `http://localhost:5000/api/brackets/matches/${selectedGame.id}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(statsData.bracketData),
        }
      );
      
      if (!bracketRes.ok) {
        throw new Error(`Failed to complete match: ${bracketRes.status}`);
      }
      
      const bracketData = await bracketRes.json();
      
      let message = "✅ Statistics saved successfully!";
      if (overtimePeriods > 0) {
        message += ` Game went to ${overtimePeriods} overtime period${overtimePeriods > 1 ? 's' : ''}.`;
      }
      
      if (bracketData.bracketReset) {
        message = "🚨 BRACKET RESET! 🚨\n\nThe Loser's Bracket winner has defeated the Winner's Bracket winner!\nA Reset Final has been scheduled - both teams start fresh!";
      } else if (bracketData.advanced) {
        if (selectedGame.elimination_type === 'double') {
          if (selectedGame.bracket_type === 'winner') {
            message += " Winner advanced in winner's bracket!";
          } else if (selectedGame.bracket_type === 'loser') {
            message += " Winner advanced in loser's bracket!";
          } else if (selectedGame.bracket_type === 'championship') {
            message += selectedGame.round_number === 201 ? " Tournament champion determined!" : " Grand Final completed!";
          }
        } else {
          message += " Winner advanced to next round!";
        }
      }
      
      alert(message);
      
      // Navigate back (keep your existing navigation code)
      sessionStorage.setItem('staffEventsContext', JSON.stringify({
        selectedEvent: selectedEvent,
        selectedBracket: selectedBracket
      }));
      
      // Navigate back to StaffEvents with the same context
      navigate('/StaffDashboard/events');
      
    } catch (err) {
      // If save fails, offer to save offline
      if (confirm(`Failed to save: ${err.message}\n\nWould you like to save offline and sync later?`)) {
        saveToLocalStorage(selectedGame.id, statsData, 'save_stats');
        alert('📱 Statistics saved offline. Will sync when connection is restored.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset statistics to include overtime
  const resetStatistics = () => {
    if (window.confirm("Are you sure you want to reset all statistics including overtime?")) {
      initializePlayerStats(selectedGame);
      const initialScores = selectedGame.sport_type === "basketball"
        ? { team1: [0, 0, 0, 0], team2: [0, 0, 0, 0] }
        : { team1: [0, 0, 0, 0, 0], team2: [0, 0, 0, 0, 0] };
      setTeamScores(initialScores);
      setOvertimeScores({ team1: [], team2: [] });
      setCurrentQuarter(0);
      setCurrentOvertime(0);
      setIsOvertime(false);
      setOvertimePeriods(0);
    }
  };

  // Period navigation component to show overtime
  const renderPeriodNavigation = () => {
    const isBasketball = selectedGame.sport_type === "basketball";
    
    return (
      <div className="stats-period-nav">
        <button
          onClick={() => changePeriod("prev")}
          disabled={(!isOvertime && currentQuarter === 0) || (isOvertime && currentOvertime === 0 && currentQuarter === 0)}
          className="stats-period-button"
        >
          <FaArrowLeft />
        </button>
        
        <div className="stats-period-display">
          {isOvertime ? (
            <div className="overtime-period-display">
              <FaClock className="overtime-icon" />
              OT {currentOvertime + 1}
              {overtimePeriods > 1 && ` of ${overtimePeriods}`}
            </div>
          ) : isBasketball ? (
            `Quarter ${currentQuarter + 1}`
          ) : (
            `Set ${currentQuarter + 1}`
          )}
        </div>

        <button
          onClick={() => changePeriod("next")}
          disabled={(!isOvertime && currentQuarter === (isBasketball ? 3 : 4)) || (isOvertime && currentOvertime === overtimePeriods - 1)}
          className="stats-period-button"
        >
          <FaArrowRight />
        </button>
      </div>
    );
  };

  // Scores display to show overtime totals
  const renderScores = () => {
    const currentTeam1Score = isOvertime 
      ? overtimeScores.team1[currentOvertime] || 0
      : teamScores.team1[currentQuarter];
    
    const currentTeam2Score = isOvertime 
      ? overtimeScores.team2[currentOvertime] || 0
      : teamScores.team2[currentQuarter];

    const totalTeam1Score = teamScores.team1.reduce((a, b) => a + b, 0) + overtimeScores.team1.reduce((a, b) => a + b, 0);
    const totalTeam2Score = teamScores.team2.reduce((a, b) => a + b, 0) + overtimeScores.team2.reduce((a, b) => a + b, 0);

    return (
      <div className="stats-scores">
        <div className="stats-score-box team1">
          <h3>{selectedGame.team1_name}</h3>
          <div className="stats-score-value">
            {currentTeam1Score}
          </div>
          <div className="stats-total-score">
            Total: {totalTeam1Score}
          </div>
        </div>
        
        <div className="stats-score-separator">-</div>
        
        <div className="stats-score-box team2">
          <h3>{selectedGame.team2_name}</h3>
          <div className="stats-score-value">
            {currentTeam2Score}
          </div>
          <div className="stats-total-score">
            Total: {totalTeam2Score}
          </div>
        </div>
      </div>
    );
  };

  // Overtime controls component
  const renderOvertimeControls = () => {
    if (selectedGame?.sport_type !== "basketball") return null;

    return (
      <div className="stats-overtime-controls">
        <button
          onClick={addOvertimePeriod}
          className="stats-overtime-button"
          disabled={overtimePeriods >= 5}
        >
          <FaPlus /> Add Overtime Period
        </button>
        
        {overtimePeriods > 0 && (
          <div className="overtime-period-selector">
            <span>Overtime Periods:</span>
            {Array.from({ length: overtimePeriods }, (_, i) => (
              <div key={i} className="overtime-period-tab-container">
                <button
                  onClick={() => switchToOvertime(i)}
                  className={`overtime-period-tab ${isOvertime && currentOvertime === i ? 'active' : ''}`}
                >
                  OT {i + 1}
                </button>
                <button
                  onClick={() => removeOvertimePeriod(i)}
                  className="overtime-remove-button"
                  title="Remove this overtime period"
                >
                  <FaTimes />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {isOvertime && (
          <button
            onClick={() => switchToRegulation(currentQuarter)}
            className="stats-regulation-button"
          >
            Back to Regulation
          </button>
        )}
      </div>
    );
  };

  // Player table to handle overtime stats
  const renderPlayerTable = (teamId, teamName) => {
    const teamPlayers = getSortedTeamPlayers(teamId);
    const isBasketball = selectedGame.sport_type === "basketball";
    const maxStarters = getMaxStartingPlayers(selectedGame.sport_type);
    
    // Separate starters and bench players
    const starters = teamPlayers.filter(player => player.isOnCourt);
    const benchPlayers = teamPlayers.filter(player => !player.isOnCourt);
    
    const teamKey = teamId === selectedGame.team1_id ? 'team1' : 'team2';
    const isBenchVisible = showBenchPlayers[teamKey];

    // Get taken positions for this team
    const takenPositions = getAvailablePositions(teamKey);

    return (
      <div className="stats-team-table">
        <div className="stats-team-header">
          <div className="stats-team-title-section">
            <h3>{teamName}</h3>
            <span className="stats-team-hint">
              Max {maxStarters} starters - Click checkbox to set lineup
              {isBasketball && takenPositions.size > 0 && (
                <span className="stats-positions-taken">
                  Positions taken: {Array.from(takenPositions).join(', ')}
                </span>
              )}
            </span>
          </div>
          {benchPlayers.length > 0 && (
            <button 
              onClick={() => setShowBenchPlayers(prev => ({
                ...prev,
                [teamKey]: !prev[teamKey]
              }))}
              className="stats-show-bench-button"
            >
              {isBenchVisible ? <FaEyeSlash /> : <FaEye />}
              {isBenchVisible ? " Hide Bench" : " Show Bench"}
            </button>
          )}
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="stats-table">
            <thead>
              <tr>
                <th className="col-start">Start</th>
                <th className="col-player">Player</th>
                <th className="col-number">#</th>
                <th className="col-position">Position</th>
                <th className="col-status">Status</th>
                {isBasketball ? (
                  <>
                    <th className="col-score">Score</th>
                    <th className="col-stat">2PM</th>
                    <th className="col-stat">3PM</th>
                    <th className="col-stat">FT</th>
                    <th className="col-stat">AST</th>
                    <th className="col-stat">REB</th>
                    <th className="col-stat">STL</th>
                    <th className="col-stat">BLK</th>
                    <th className="col-stat">Fouls</th>
                    <th className="col-stat">TO</th>
                  </>
                ) : (
                  <>
                    <th className="col-score">Score</th>
                    <th className="col-stat">Kills</th>
                    <th className="col-stat">Ast</th>
                    <th className="col-stat">Digs</th>
                    <th className="col-stat">Blocks</th>
                    <th className="col-stat">Ace</th>
                    <th className="col-stat">Rec</th>
                    <th className="col-stat">S.Err</th>
                    <th className="col-stat">A.Err</th>
                    <th className="col-stat">R.Err</th>
                    <th className="col-stat">Hit%</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {/* Starters - Always visible */}
              {starters.map((player) => {
                const globalIndex = playerStats.findIndex(p => p.player_id === player.player_id);
                const isStarter = startingPlayers[teamKey].includes(player.player_id);
                const positionTaken = isBasketball && player.position && player.position !== "N/A" && 
                  takenPositions.has(player.position) && !isStarter;
                
                return (
                  <tr key={player.player_id} className={player.isOnCourt ? 'on-court' : ''}>
                    <td className="col-start">
                      <input
                        type="checkbox"
                        checked={isStarter}
                        onChange={() => handleStartingPlayerToggle(player.player_id, teamId)}
                        disabled={positionTaken}
                        title={positionTaken ? `Position ${player.position} is already taken` : ''}
                      />
                    </td>
                    <td className="col-player">
                      {player.player_name}
                      {isPlayerFouledOut(player) && (
                        <span className="stats-fouled-out">FO</span>
                      )}
                      {positionTaken && (
                        <span className="stats-position-taken" title={`Position ${player.position} is already taken`}>
                          ⚠️
                        </span>
                      )}
                    </td>
                    <td className="col-number">#{player.jersey_number}</td>
                    <td className="col-position">{player.position}</td>
                    <td className="col-status">
                      <span className={`stats-player-status ${player.isOnCourt ? 'on-court' : 'on-bench'}`}>
                        {player.isOnCourt ? 'On Court' : 'Bench'}
                      </span>
                    </td>
                    
                    {isBasketball ? (
                      <>
                        <td className="col-score">
                          <div className="stats-score-display">
                            <div className="stats-current-score">
                              {calculateCurrentPeriodPoints(player)}
                            </div>
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "two_points_made", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_two_points_made?.[currentOvertime] || 0)
                                : (player.two_points_made?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "two_points_made", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "three_points_made", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_three_points_made?.[currentOvertime] || 0)
                                : (player.three_points_made?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "three_points_made", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "free_throws_made", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_free_throws_made?.[currentOvertime] || 0)
                                : (player.free_throws_made?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "free_throws_made", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "assists", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_assists?.[currentOvertime] || 0)
                                : (player.assists?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "assists", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "rebounds", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_rebounds?.[currentOvertime] || 0)
                                : (player.rebounds?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "rebounds", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "steals", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_steals?.[currentOvertime] || 0)
                                : (player.steals?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "steals", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "blocks", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_blocks?.[currentOvertime] || 0)
                                : (player.blocks?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "blocks", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "fouls", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_fouls?.[currentOvertime] || 0)
                                : (player.fouls?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "fouls", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "turnovers", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_turnovers?.[currentOvertime] || 0)
                                : (player.turnovers?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "turnovers", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="col-score">
                          <div className="stats-score-display">
                            <div className="stats-current-score">
                              {calculateCurrentPeriodPoints(player)}
                            </div>
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "kills", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.kills[currentQuarter]}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "kills", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "volleyball_assists", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.volleyball_assists[currentQuarter]}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "volleyball_assists", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "digs", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.digs[currentQuarter]}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "digs", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "volleyball_blocks", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.volleyball_blocks ? player.volleyball_blocks[currentQuarter] : 0}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "volleyball_blocks", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "service_aces", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.service_aces[currentQuarter]}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "service_aces", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "receptions", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.receptions[currentQuarter]}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "receptions", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "serve_errors", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.serve_errors[currentQuarter]}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "serve_errors", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "attack_errors", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.attack_errors[currentQuarter]}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "attack_errors", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "reception_errors", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.reception_errors[currentQuarter]}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "reception_errors", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          {calculateHittingPercentage(player)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              
              {/* Bench Players - Conditionally visible */}
              {isBenchVisible && benchPlayers.map((player) => {
                const globalIndex = playerStats.findIndex(p => p.player_id === player.player_id);
                const isStarter = startingPlayers[teamKey].includes(player.player_id);
                const positionTaken = isBasketball && player.position && player.position !== "N/A" && 
                  takenPositions.has(player.position) && !isStarter;
                
                return (
                  <tr key={player.player_id} className="bench-player">
                    <td className="col-start">
                      <input
                        type="checkbox"
                        checked={isStarter}
                        onChange={() => handleStartingPlayerToggle(player.player_id, teamId)}
                        disabled={positionTaken}
                        title={positionTaken ? `Position ${player.position} is already taken` : ''}
                      />
                    </td>
                    <td className="col-player">
                      {player.player_name}
                      {isPlayerFouledOut(player) && (
                        <span className="stats-fouled-out">FO</span>
                      )}
                      {positionTaken && (
                        <span className="stats-position-taken" title={`Position ${player.position} is already taken`}>
                          
                        </span>
                      )}
                    </td>
                    <td className="col-number">#{player.jersey_number}</td>
                    <td className="col-position">{player.position}</td>
                    <td className="col-status">
                      <span className={`stats-player-status ${player.isOnCourt ? 'on-court' : 'on-bench'}`}>
                        {player.isOnCourt ? 'On Court' : 'Bench'}
                      </span>
                    </td>
                    
                    {isBasketball ? (
                      <>
                        <td className="col-score">
                          <div className="stats-score-display">
                            <div className="stats-current-score">
                              {calculateCurrentPeriodPoints(player)}
                            </div>
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "two_points_made", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_two_points_made?.[currentOvertime] || 0)
                                : (player.two_points_made?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "two_points_made", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "three_points_made", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_three_points_made?.[currentOvertime] || 0)
                                : (player.three_points_made?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "three_points_made", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "free_throws_made", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_free_throws_made?.[currentOvertime] || 0)
                                : (player.free_throws_made?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "free_throws_made", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "assists", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_assists?.[currentOvertime] || 0)
                                : (player.assists?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "assists", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "rebounds", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_rebounds?.[currentOvertime] || 0)
                                : (player.rebounds?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "rebounds", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "steals", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_steals?.[currentOvertime] || 0)
                                : (player.steals?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "steals", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "blocks", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_blocks?.[currentOvertime] || 0)
                                : (player.blocks?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "blocks", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "fouls", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_fouls?.[currentOvertime] || 0)
                                : (player.fouls?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "fouls", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "turnovers", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_turnovers?.[currentOvertime] || 0)
                                : (player.turnovers?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "turnovers", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="col-score">
                          <div className="stats-score-display">
                            <div className="stats-current-score">
                              {calculateCurrentPeriodPoints(player)}
                            </div>
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "kills", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.kills[currentQuarter]}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "kills", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "volleyball_assists", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.volleyball_assists[currentQuarter]}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "volleyball_assists", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "digs", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.digs[currentQuarter]}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "digs", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "volleyball_blocks", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.volleyball_blocks ? player.volleyball_blocks[currentQuarter] : 0}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "volleyball_blocks", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "service_aces", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.service_aces[currentQuarter]}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "service_aces", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "receptions", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.receptions[currentQuarter]}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "receptions", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "serve_errors", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.serve_errors[currentQuarter]}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "serve_errors", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "attack_errors", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.attack_errors[currentQuarter]}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "attack_errors", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "reception_errors", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.reception_errors[currentQuarter]}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "reception_errors", true)} className="stats-control-button">
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          {calculateHittingPercentage(player)}
                        </td>
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
    <div className="admin-dashboard">
      {/* ============================================ */}
      {/* 7. ADDED ConnectionStatus COMPONENT */}
      {/* ============================================ */}
      <ConnectionStatus />
      
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-header">
          <h1>Match Scoring</h1>
          <p>Record player statistics for matches</p>
        </div>

        <div className="dashboard-main">
          {!selectedGame && (
            <div className="quick-selectors">
              <div className="selector-group">
                <label>Select Event</label>
                <select 
                  value={selectedEvent?.id || ''} 
                  onChange={(e) => {
                    const event = events.find(ev => ev.id === parseInt(e.target.value));
                    handleEventSelect(event);
                  }}
                  className="selector-dropdown"
                >
                  <option value="">Choose an event...</option>
                  {events.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.status})
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedEvent && brackets.length > 0 && (
                <div className="selector-group">
                  <label>Select Bracket</label>
                  <select 
                    value={selectedBracket?.id || ''} 
                    onChange={(e) => {
                      const bracket = brackets.find(b => b.id === parseInt(e.target.value));
                      handleBracketSelect(bracket);
                    }}
                    className="selector-dropdown"
                >
                    <option value="">Choose a bracket...</option>
                    {brackets.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.sport_type} - {b.elimination_type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedEvent && selectedBracket && (
                <div className="selected-context">
                  <div className="context-item">
                    <div className="context-label">Event</div>
                    <div className="context-value">{selectedEvent.name}</div>
                  </div>
                  <div className="context-divider"></div>
                  <div className="context-item">
                    <div className="context-label">Bracket</div>
                    <div className="context-value">{selectedBracket.name}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bracket-error">
              {error}
            </div>
          )}

          {loading && !selectedGame && (
            <div className="loading-message">
              Loading...
            </div>
          )}

          {!selectedGame && selectedBracket && games.length > 0 && (
            <div className="bracket-content">
              {sortRounds(groupGamesByRound(games)).map(([roundName, brackets]) => {
                const roundNumber = roundName === "Championship" ? 999 : 
                  roundName.startsWith("LB Round") ? 
                  parseInt(roundName.split(' ')[2]) + 100 : 
                  parseInt(roundName.split(' ')[1]);
                const isExpanded = expandedRounds.has(roundNumber) || roundName === "Championship";
                const roundGames = Object.values(brackets).flat();
                const completedGames = roundGames.filter(g => g.status === 'completed').length;
                const totalGames = roundGames.length;
                
                return (
                  <div key={roundName} className="stats-round">
                    <div 
                      onClick={() => toggleRoundExpansion(roundNumber)}
                      className={`stats-round-header ${roundName === 'Championship' ? 'championship' : ''}`}
                    >
                      <div className="stats-round-title">
                        <h3>
                          {roundName === 'Championship' && <FaTrophy style={{ color: '#ffd700' }} />}
                          {roundName}
                        </h3>
                        <div>
                          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                        </div>
                      </div>
                      <div className="stats-round-progress">
                        {completedGames}/{totalGames} matches completed
                      </div>
                      <div className="stats-progress-bar">
                        <div className="stats-progress-fill" style={{ 
                          width: `${totalGames > 0 ? (completedGames / totalGames) * 100 : 0}%`
                        }}></div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div>
                        {Object.entries(brackets).map(([bracketName, bracketGames]) => (
                          <div key={bracketName} style={{ marginBottom: '20px' }}>
                            <h4 style={{ 
                              fontSize: '16px', 
                              fontWeight: '600', 
                              marginBottom: '15px',
                              color: '#cbd5e0',
                              paddingLeft: '10px',
                              borderLeft: '3px solid #3182ce'
                            }}>
                              {bracketName}
                            </h4>
                            <div className="stats-game-grid">
                              {bracketGames.map((game) => renderGameCard(game, roundName))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {selectedGame && (
            <div className="stats-recording">
              <div className="stats-game-info-box">
                <div className="stats-game-info-header">
                  <h2>
                    {selectedGame.team1_name} vs {selectedGame.team2_name}
                    {selectedGame.round_number === 201 && (
                      <span className="reset-final-badge">RESET FINAL</span>
                    )}
                    {overtimePeriods > 0 && (
                      <span className="overtime-badge">
                        <FaClock /> {overtimePeriods} OT
                      </span>
                    )}
                  </h2>
                 <button 
                    onClick={() => {
                      if (cameFromStaffEvents) {
                        sessionStorage.setItem('staffEventsContext', JSON.stringify({
                          selectedEvent: selectedEvent,
                          selectedBracket: selectedBracket
                        }));
                        navigate('/StaffDashboard/events');
                      } else {
                        setSelectedGame(null);
                      }
                    }}
                    className="stats-back-button"
                  >
                    Back to Games
                  </button>  
                </div>
                <div className="stats-game-meta">
                  <span><strong>Sport:</strong> {selectedGame.sport_type}</span>
                  <span><strong>Bracket:</strong> {selectedGame.bracket_name}</span>
                  <span><strong>Round:</strong> {selectedGame.round_number}</span>
                  {selectedGame.elimination_type === 'double' && (
                    <span>
                      <strong>Type:</strong> {selectedGame.round_number === 201 ? 'Reset Final' : 
                       selectedGame.bracket_type ? selectedGame.bracket_type.charAt(0).toUpperCase() + selectedGame.bracket_type.slice(1) : 'Winner'} Bracket
                    </span>
                  )}
                </div>
              </div>

              {/* Period Navigation */}
              {renderPeriodNavigation()}

              {/* Overtime Controls */}
              {renderOvertimeControls()}

              {/* Scores Display */}
              {renderScores()}

              {/* Action Buttons */}
              {selectedGame.status !== 'completed' && (
                <div className="stats-actions">
                  <button 
                    onClick={resetStatistics}
                    className="stats-action-button stats-action-reset"
                  >
                    <FaRedo /> Reset All
                  </button>
                  <button
                    onClick={saveStatistics}
                    disabled={loading}
                    className="stats-action-button stats-action-save"
                  >
                    <FaSave /> {loading ? "Saving..." : "Save Statistics"}
                  </button>
                </div>
              )}

              {/* Control Bar */}
              <ControlBar />

              {/* QuickScore Bar */}
              <QuickScoreBar />

              {loading ? (
                <div className="loading-message">
                  Loading player data...
                </div>
              ) : (
                <div>
                  {showBothTeams ? (
                    <>
                      {renderPlayerTable(selectedGame.team1_id, selectedGame.team1_name)}
                      {renderPlayerTable(selectedGame.team2_id, selectedGame.team2_name)}
                    </>
                  ) : (
                    renderPlayerTable(
                      activeTeamView === 'team1' ? selectedGame.team1_id : selectedGame.team2_id,
                      activeTeamView === 'team1' ? selectedGame.team1_name : selectedGame.team2_name
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffStats;