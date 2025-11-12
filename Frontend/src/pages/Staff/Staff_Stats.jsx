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
  FaEdit,
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
  const [cameFromAdmin, setCameFromAdmin] = useState(false);
  const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
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
  const [toasts, setToasts] = useState([]);


  const STORAGE_KEYS = {
    PENDING_SYNCS: 'staff_stats_pending_syncs',
    OFFLINE_DATA: 'staff_stats_offline_data',
    LAST_SYNC: 'staff_stats_last_sync'
  };

   const addToast = (message, type = 'success', playerName = '') => {
    const id = Date.now();
    const newToast = { id, message, type, playerName };
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove toast - longer duration for important messages
    const duration = playerName ? 2000 : 4000; // 4 seconds for admin success message
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  const getStatLabel = (statKey) => {
    const labels = {
      two_points_made: '+2 Points',
      three_points_made: '+3 Points',
      free_throws_made: '+1 Free Throw',
      assists: '+1 Assist',
      rebounds: '+1 Rebound',
      steals: '+1 Steal',
      blocks: '+1 Block',
      fouls: '+1 Foul',
      technical_fouls: '+1 Technical Foul',
      turnovers: '+1 Turnover',
      kills: '+1 Kill',
      service_aces: '+1 Ace',
      volleyball_blocks: '+1 Block',
      volleyball_assists: '+1 Assist',
      digs: '+1 Dig',
      receptions: '+1 Reception',
      serve_errors: '+1 Serve Error',
      attack_errors: '+1 Attack Error',
      reception_errors: '+1 Reception Error',
      assist_errors: '+1 Assist Error' // ADDED: Assist errors label
    };
    return labels[statKey] || '+1 Stat';
  };

  const getStatColor = (statKey) => {
    const colors = {
      two_points_made: '#3b82f6',
      three_points_made: '#9333ea',
      free_throws_made: '#16a34a',
      assists: '#0d9488',
      rebounds: '#ea580c',
      steals: '#ca8a04',
      blocks: '#dc2626',
      fouls: '#4b5563',
      technical_fouls: '#991b1b',
      turnovers: '#db2777',
      kills: '#dc2626',
      service_aces: '#ca8a04',
      volleyball_blocks: '#9333ea',
      volleyball_assists: '#3b82f6',
      digs: '#16a34a',
      receptions: '#0d9488',
      serve_errors: '#db2777',
      attack_errors: '#ea580c',
      reception_errors: '#991b1b',
      assist_errors: '#ef4444' // ADDED: Assist errors color
    };
    return colors[statKey] || '#3b82f6';
  };

  // SUCCESS PAGE STATES
const [showSuccessPage, setShowSuccessPage] = useState(false);
const [savedMatchData, setSavedMatchData] = useState(null);

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
    technical_fouls: [0, 0, 0, 0], // ADDED: Technical fouls tracking
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
  assist_errors: [0, 0, 0, 0, 0], // ADDED: Assist errors array
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
    { key: 'technical_fouls', label: 'TECH', color: 'bg-red-800 hover:bg-red-900', points: 0 }, // ADDED: Technical foul button
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
  { key: 'reception_errors', label: 'REC ERR', color: 'bg-red-800 hover:bg-red-900', points: 0 },
  { key: 'assist_errors', label: 'AST ERR', color: 'bg-red-800 hover:bg-red-900', points: 0 } // ADDED: Assist errors button
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
  // TOAST NOTIFICATIONS COMPONENT
  // ============================================
  const ToastNotifications = () => {
    if (toasts.length === 0) return null;

    return (
      <div className="toast-container">
        {toasts.map((toast) => {
          const isAdminSuccess = !toast.playerName && toast.message.includes('updated successfully');
          const backgroundColor = isAdminSuccess 
            ? '#48bb78' // Green for admin success
            : getStatColor(toast.message.toLowerCase().replace(/[^a-z_]/g, '_').replace(/\+/g, '').replace(/\s/g, '_'));
          
          return (
            <div 
              key={toast.id} 
              className={`toast toast-${toast.type} ${isAdminSuccess ? 'toast-admin-success' : ''}`}
              style={{
                backgroundColor: backgroundColor,
              }}
            >
              <div className="toast-content">
                {toast.playerName && <div className="toast-player">{toast.playerName}</div>}
                <div className="toast-message">{toast.message}</div>
              </div>
            </div>
          );
        })}
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

  // ============================================
  // NEW FUNCTION: Check if player is fouled out
  // ============================================
  const isPlayerFouledOut = (player) => {
    if (selectedGame?.sport_type !== "basketball") return false;
    
    const totalFouls = player.fouls ? player.fouls.reduce((a, b) => a + b, 0) : 0;
    const overtimeFouls = player.overtime_fouls ? player.overtime_fouls.reduce((a, b) => a + b, 0) : 0;
    const totalTechnicalFouls = player.technical_fouls ? player.technical_fouls.reduce((a, b) => a + b, 0) : 0;
    const overtimeTechnicalFouls = player.overtime_technical_fouls ? player.overtime_technical_fouls.reduce((a, b) => a + b, 0) : 0;
    
    const allFouls = totalFouls + overtimeFouls;
    const allTechnicalFouls = totalTechnicalFouls + overtimeTechnicalFouls;
    
    return allFouls >= 5 || allTechnicalFouls >= 2;
  };
const hasMoreMatches = () => {
  if (!selectedBracket) return false;
  
  // You can make this async by using useEffect, but for simplicity:
  // We'll check if there are any scheduled/pending matches
  return games.some(m => 
    m.bracket_id === selectedBracket.id && 
    (m.status === 'pending' || m.status === 'scheduled') &&
    m.id !== selectedGame?.id
  );
};
  // ============================================
  // NEW FUNCTION: Check if player should be disabled
  // ============================================
  const isPlayerDisabled = (player) => {
    return isPlayerFouledOut(player);
  };

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

  // QuickScore stat click handler - UPDATED with foul check
  const handleQuickScoreStatClick = (playerId, statKey) => {
    const playerIndex = playerStats.findIndex(p => p.player_id === playerId);
    if (playerIndex === -1) return;

    const player = playerStats[playerIndex];
    
    // Check if player is fouled out before allowing stat changes
    if (isPlayerDisabled(player)) {
      alert(`⚠️ ${player.player_name} has fouled out and cannot record more stats!`);
      return;
    }

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
    
    addToast(getStatLabel(statKey), 'success', player.player_name);

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

  // QuickScore Component - UPDATED with disabled state
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
              {quickScorePlayers.map((player) => {
                const isDisabled = isPlayerDisabled(player);
                const totalFouls = player.fouls ? player.fouls.reduce((a, b) => a + b, 0) : 0;
                const overtimeFouls = player.overtime_fouls ? player.overtime_fouls.reduce((a, b) => a + b, 0) : 0;
                const totalTechnicalFouls = player.technical_fouls ? player.technical_fouls.reduce((a, b) => a + b, 0) : 0;
                const overtimeTechnicalFouls = player.overtime_technical_fouls ? player.overtime_technical_fouls.reduce((a, b) => a + b, 0) : 0;
                
                const allFouls = totalFouls + overtimeFouls;
                const allTechnicalFouls = totalTechnicalFouls + overtimeTechnicalFouls;

                return (
                  <button
                    key={player.player_id}
                    onClick={() => {
                      if (isDisabled) {
                        alert(`⚠️ ${player.player_name} has fouled out and cannot record more stats!\n\nFouls: ${allFouls}/5\nTechnical Fouls: ${allTechnicalFouls}/2`);
                        return;
                      }
                      setSelectedQuickScorePlayer(
                        selectedQuickScorePlayer?.player_id === player.player_id ? null : player
                      );
                    }}
                    className={`quick-score-player-card ${
                      selectedQuickScorePlayer?.player_id === player.player_id ? 'selected' : ''
                    } ${isDisabled ? 'disabled' : ''}`}
                    disabled={isDisabled}
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
                      {isDisabled && (
                        <div className="quick-score-fouled-out-badge">
                          FOULED OUT
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
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
                      'bg-red-800': '#991b1b',
                      'bg-gray-600': '#4b5563',
                      'bg-pink-600': '#db2777'
                    };
                    const bgColor = colorMap[stat.color.split(' ')[0]] || '#4b5563';
                    
                    const isDisabled = isPlayerDisabled(selectedQuickScorePlayer);
                    
                    return (
                      <button
                        key={stat.key}
                        onClick={() => {
                          if (isDisabled) {
                            alert(`⚠️ ${selectedQuickScorePlayer.player_name} has fouled out and cannot record more stats!`);
                            return;
                          }
                          handleQuickScoreStatClick(selectedQuickScorePlayer.player_id, stat.key);
                        }}
                        className={`quick-score-stat-button ${isDisabled ? 'disabled' : ''}`}
                        style={{
                          background: `linear-gradient(135deg, ${bgColor}, ${bgColor}dd)`,
                          opacity: isDisabled ? 0.5 : 1
                        }}
                        disabled={isDisabled}
                      >
                        <div>{stat.label}</div>
                        <div className="quick-score-stat-count">
                          {isOvertime 
                            ? (selectedQuickScorePlayer[`overtime_${stat.key}`]?.[currentOvertime] || 0)
                            : (selectedQuickScorePlayer[stat.key]?.[currentQuarter] || 0)
                          }
                        </div>
                        {isDisabled && (
                          <div className="quick-score-stat-disabled-overlay">
                            DISABLED
                          </div>
                        )}
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
 // Control Bar Component - UPDATED with centered layout
const ControlBar = () => {
  if (!selectedGame) return null;
  
  // Don't show control bar at all in admin edit mode
  if (isEditMode && cameFromAdmin) return null;

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
      
      {!isViewOnlyMode && (
        <label className="control-bar-checkbox">
          <input
            type="checkbox"
            checked={hideButtons}
            onChange={() => setHideButtons(!hideButtons)}
          />
          Hide Buttons
        </label>
      )}
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
      const kills = player.kills?.[currentQuarter] || 0;
      const aces = player.service_aces?.[currentQuarter] || 0;
      const blocks = player.volleyball_blocks?.[currentQuarter] || 0;
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
  return false; // Always return false - no position restrictions
};

  // Function to get available positions for a team
  const getAvailablePositions = (teamKey) => {
  return new Set(); // Return empty set - no positions are "taken"
};

  const initializeStartingPlayers = (stats, team1Id, team2Id, sportType) => {
    const maxStarters = getMaxStartingPlayers(sportType);
    
    if (sportType === "basketball") {
      const team1Players = stats.filter(p => p.team_id === team1Id);
      const team2Players = stats.filter(p => p.team_id === team2Id);
      
      // SIMPLIFIED: Just take first maxStarters players, no position restrictions
      const team1Starters = team1Players.slice(0, maxStarters).map(p => p.player_id);
      const team2Starters = team2Players.slice(0, maxStarters).map(p => p.player_id);
      
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
  const adminContext = sessionStorage.getItem('adminEventsContext');
  
  if (storedMatchData) {
    try {
      const matchData = JSON.parse(storedMatchData);
      
      // Check if coming from admin
      if (matchData.fromAdmin && adminContext) {
        setCameFromAdmin(true);
        setIsViewOnlyMode(true);
        setIsEditMode(false);
      } else if (matchData.viewOnly) {
        // Staff clicked "View Stats" - enable view-only mode
        setCameFromStaffEvents(true);
        setIsViewOnlyMode(true);
        setIsEditMode(false);
      } else {
        // Staff clicked "Input Stats" - normal edit mode
        setCameFromStaffEvents(true);
        setIsViewOnlyMode(false);
        setIsEditMode(false);
      }
        
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

  // Update showBothTeams when view-only mode changes and game is selected
  useEffect(() => {
    if (selectedGame && isViewOnlyMode) {
      setShowBothTeams(true);
    }
  }, [selectedGame, isViewOnlyMode]);

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
          const assistErrors = player.assist_errors ? player.assist_errors[i] || 0 : 0;
          team2Scores[i] += serveErrors + attackErrors;
        }
      } else if (playerTeamId === team2Id) {
        // Team1 gets points from Team2's errors
        for (let i = 0; i < team1Scores.length; i++) {
          const serveErrors = player.serve_errors ? player.serve_errors[i] || 0 : 0;
          const attackErrors = player.attack_errors ? player.attack_errors[i] || 0 : 0;
          const assistErrors = player.assist_errors ? player.assist_errors[i] || 0 : 0;
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
      overtime_technical_fouls: [...(player.overtime_technical_fouls || []), 0], // ADDED: Technical fouls overtime
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
      overtime_technical_fouls: player.overtime_technical_fouls ? player.overtime_technical_fouls.filter((_, index) => index !== overtimeIndex) : [], // ADDED: Technical fouls overtime
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

  // FIXED: Adjust player stat function to properly handle volleyball scoring rules - UPDATED with foul check
  const adjustPlayerStat = (playerIndex, statName, increment) => {
    const player = playerStats[playerIndex];
    
    // Check if player is fouled out before allowing stat changes
    if (isPlayerDisabled(player)) {
      const totalFouls = player.fouls ? player.fouls.reduce((a, b) => a + b, 0) : 0;
      const overtimeFouls = player.overtime_fouls ? player.overtime_fouls.reduce((a, b) => a + b, 0) : 0;
      const totalTechnicalFouls = player.technical_fouls ? player.technical_fouls.reduce((a, b) => a + b, 0) : 0;
      const overtimeTechnicalFouls = player.overtime_technical_fouls ? player.overtime_technical_fouls.reduce((a, b) => a + b, 0) : 0;
      
      const allFouls = totalFouls + overtimeFouls;
      const allTechnicalFouls = totalTechnicalFouls + overtimeTechnicalFouls;
      
      alert(`⚠️ ${player.player_name} has fouled out and cannot record more stats!\n\nFouls: ${allFouls}/5\nTechnical Fouls: ${allTechnicalFouls}/2`);
      return;
    }

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

     if (increment) {
      addToast(getStatLabel(statName), 'success', player.player_name);
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

  const parseStatArray = (value, length) => {
    if (value === null || value === undefined) return null;

    let parsed = value;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch (err) {
        console.warn("Failed to parse stat array string:", value, err);
        return null;
      }
    }

    if (typeof parsed === "number") {
      parsed = [parsed];
    }

    if (!Array.isArray(parsed)) {
      return null;
    }

    const normalized = parsed.slice(0, length).map((item) => Number(item) || 0);
    while (normalized.length < length) {
      normalized.push(0);
    }
    return normalized;
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
          overtime_technical_fouls: [], // ADDED: Technical fouls overtime
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
          overtime_technical_fouls: [], // ADDED: Technical fouls overtime
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
                // Calculate overtime totals to subtract from regulation totals
                const overtimeTwoPoints = found.overtime_two_points_made ? found.overtime_two_points_made.reduce((a, b) => a + b, 0) : 0;
                const overtimeThreePoints = found.overtime_three_points_made ? found.overtime_three_points_made.reduce((a, b) => a + b, 0) : 0;
                const overtimeFreeThrows = found.overtime_free_throws_made ? found.overtime_free_throws_made.reduce((a, b) => a + b, 0) : 0;
                const overtimeAssists = found.overtime_assists ? found.overtime_assists.reduce((a, b) => a + b, 0) : 0;
                const overtimeRebounds = found.overtime_rebounds ? found.overtime_rebounds.reduce((a, b) => a + b, 0) : 0;
                const overtimeSteals = found.overtime_steals ? found.overtime_steals.reduce((a, b) => a + b, 0) : 0;
                const overtimeBlocks = found.overtime_blocks ? found.overtime_blocks.reduce((a, b) => a + b, 0) : 0;
                const overtimeFouls = found.overtime_fouls ? found.overtime_fouls.reduce((a, b) => a + b, 0) : 0;
                const overtimeTechnicalFouls = found.overtime_technical_fouls ? found.overtime_technical_fouls.reduce((a, b) => a + b, 0) : 0;
                const overtimeTurnovers = found.overtime_turnovers ? found.overtime_turnovers.reduce((a, b) => a + b, 0) : 0;
                
                // Load regulation stats - check if per-quarter arrays exist, otherwise use totals minus overtime
                const twoPointsPerQuarter = parseStatArray(found.two_points_made_per_quarter, 4);
                if (twoPointsPerQuarter) {
                  mergedPlayer.two_points_made = twoPointsPerQuarter;
                } else {
                  const regulationTotal = Math.max(0, (found.two_points_made || 0) - overtimeTwoPoints);
                  mergedPlayer.two_points_made = [regulationTotal, 0, 0, 0];
                }
                
                const threePointsPerQuarter = parseStatArray(found.three_points_made_per_quarter, 4);
                if (threePointsPerQuarter) {
                  mergedPlayer.three_points_made = threePointsPerQuarter;
                } else {
                  const regulationTotal = Math.max(0, (found.three_points_made || 0) - overtimeThreePoints);
                  mergedPlayer.three_points_made = [regulationTotal, 0, 0, 0];
                }
                
                const freeThrowsPerQuarter = parseStatArray(found.free_throws_made_per_quarter, 4);
                if (freeThrowsPerQuarter) {
                  mergedPlayer.free_throws_made = freeThrowsPerQuarter;
                } else {
                  const regulationTotal = Math.max(0, (found.free_throws_made || 0) - overtimeFreeThrows);
                  mergedPlayer.free_throws_made = [regulationTotal, 0, 0, 0];
                }
                
                const technicalFoulsPerQuarter = parseStatArray(found.technical_fouls_per_quarter, 4);
                if (technicalFoulsPerQuarter) {
                  mergedPlayer.technical_fouls = technicalFoulsPerQuarter;
                } else {
                  const regulationTotal = Math.max(0, (found.technical_fouls || 0) - overtimeTechnicalFouls);
                  mergedPlayer.technical_fouls = [regulationTotal, 0, 0, 0];
                }
                
                const assistsPerQuarter = parseStatArray(found.assists_per_quarter, 4);
                if (assistsPerQuarter) {
                  mergedPlayer.assists = assistsPerQuarter;
                } else {
                  const regulationTotal = Math.max(0, (found.assists || 0) - overtimeAssists);
                  mergedPlayer.assists = [regulationTotal, 0, 0, 0];
                }
                
                const reboundsPerQuarter = parseStatArray(found.rebounds_per_quarter, 4);
                if (reboundsPerQuarter) {
                  mergedPlayer.rebounds = reboundsPerQuarter;
                } else {
                  const regulationTotal = Math.max(0, (found.rebounds || 0) - overtimeRebounds);
                  mergedPlayer.rebounds = [regulationTotal, 0, 0, 0];
                }
                
                const stealsPerQuarter = parseStatArray(found.steals_per_quarter, 4);
                if (stealsPerQuarter) {
                  mergedPlayer.steals = stealsPerQuarter;
                } else {
                  const regulationTotal = Math.max(0, (found.steals || 0) - overtimeSteals);
                  mergedPlayer.steals = [regulationTotal, 0, 0, 0];
                }
                
                const blocksPerQuarter = parseStatArray(found.blocks_per_quarter, 4);
                if (blocksPerQuarter) {
                  mergedPlayer.blocks = blocksPerQuarter;
                } else {
                  const regulationTotal = Math.max(0, (found.blocks || 0) - overtimeBlocks);
                  mergedPlayer.blocks = [regulationTotal, 0, 0, 0];
                }
                
                const foulsPerQuarter = parseStatArray(found.fouls_per_quarter, 4);
                if (foulsPerQuarter) {
                  mergedPlayer.fouls = foulsPerQuarter;
                } else {
                  const regulationTotal = Math.max(0, (found.fouls || 0) - overtimeFouls);
                  mergedPlayer.fouls = [regulationTotal, 0, 0, 0];
                }
                
                const turnoversPerQuarter = parseStatArray(found.turnovers_per_quarter, 4);
                if (turnoversPerQuarter) {
                  mergedPlayer.turnovers = turnoversPerQuarter;
                } else {
                  const regulationTotal = Math.max(0, (found.turnovers || 0) - overtimeTurnovers);
                  mergedPlayer.turnovers = [regulationTotal, 0, 0, 0];
                }
                
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
                  mergedPlayer.overtime_technical_fouls = found.overtime_technical_fouls || []; // ADDED: Technical fouls overtime
                  mergedPlayer.overtime_turnovers = found.overtime_turnovers || [];
                }
              } else {
                // Volleyball stats - parse per-set arrays when available
                const killsPerSet = parseStatArray(found.kills_per_set, 5);
                const attackAttemptsPerSet = parseStatArray(found.attack_attempts_per_set, 5);
                const attackErrorsPerSet = parseStatArray(found.attack_errors_per_set, 5);
                const servesPerSet = parseStatArray(found.serves_per_set, 5);
                const serviceAcesPerSet = parseStatArray(found.service_aces_per_set, 5);
                const serveErrorsPerSet = parseStatArray(found.serve_errors_per_set, 5);
                const receptionsPerSet = parseStatArray(found.receptions_per_set, 5);
                const receptionErrorsPerSet = parseStatArray(found.reception_errors_per_set, 5);
                const digsPerSet = parseStatArray(found.digs_per_set, 5);
                const volleyballAssistsPerSet = parseStatArray(found.volleyball_assists_per_set, 5);
                const volleyballBlocksPerSet = parseStatArray(found.volleyball_blocks_per_set, 5);
                const assistErrorsPerSet = parseStatArray(found.assist_errors_per_set, 5);

                const fallbackFive = () => [0, 0, 0, 0, 0];

                mergedPlayer.kills = killsPerSet || (found.kills ? [found.kills, 0, 0, 0, 0] : fallbackFive());
                mergedPlayer.attack_attempts = attackAttemptsPerSet || (found.attack_attempts ? [found.attack_attempts, 0, 0, 0, 0] : fallbackFive());
                mergedPlayer.attack_errors = attackErrorsPerSet || (found.attack_errors ? [found.attack_errors, 0, 0, 0, 0] : fallbackFive());
                mergedPlayer.serves = servesPerSet || (found.serves ? [found.serves, 0, 0, 0, 0] : fallbackFive());
                mergedPlayer.service_aces = serviceAcesPerSet || (found.service_aces ? [found.service_aces, 0, 0, 0, 0] : fallbackFive());
                mergedPlayer.serve_errors = serveErrorsPerSet || (found.serve_errors ? [found.serve_errors, 0, 0, 0, 0] : fallbackFive());
                mergedPlayer.receptions = receptionsPerSet || (found.receptions ? [found.receptions, 0, 0, 0, 0] : fallbackFive());
                mergedPlayer.reception_errors = receptionErrorsPerSet || (found.reception_errors ? [found.reception_errors, 0, 0, 0, 0] : fallbackFive());
                mergedPlayer.digs = digsPerSet || (found.digs ? [found.digs, 0, 0, 0, 0] : fallbackFive());
                mergedPlayer.volleyball_assists = volleyballAssistsPerSet || (found.volleyball_assists ? [found.volleyball_assists, 0, 0, 0, 0] : fallbackFive());
                mergedPlayer.volleyball_blocks = volleyballBlocksPerSet || (found.volleyball_blocks ? [found.volleyball_blocks, 0, 0, 0, 0] : fallbackFive());
                mergedPlayer.assist_errors = assistErrorsPerSet || (found.assist_errors ? [found.assist_errors, 0, 0, 0, 0] : fallbackFive());
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
  // Show both teams in view-only mode (for staff viewing stats)
  setShowBothTeams(isViewOnlyMode);
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
          two_points_made_per_quarter: p.two_points_made || [0, 0, 0, 0],
          three_points_made: (p.three_points_made?.reduce((a, b) => a + b, 0) || 0) + 
                            (p.overtime_three_points_made?.reduce((a, b) => a + b, 0) || 0),
          three_points_made_per_quarter: p.three_points_made || [0, 0, 0, 0],
          free_throws_made: (p.free_throws_made?.reduce((a, b) => a + b, 0) || 0) + 
                           (p.overtime_free_throws_made?.reduce((a, b) => a + b, 0) || 0),
          free_throws_made_per_quarter: p.free_throws_made || [0, 0, 0, 0],
          assists_per_quarter: p.assists || [0, 0, 0, 0],
          rebounds_per_quarter: p.rebounds || [0, 0, 0, 0],
          steals: (p.steals?.reduce((a, b) => a + b, 0) || 0) + 
                 (p.overtime_steals?.reduce((a, b) => a + b, 0) || 0),
          steals_per_quarter: p.steals || [0, 0, 0, 0],
          blocks: (p.blocks?.reduce((a, b) => a + b, 0) || 0) + 
                 (p.overtime_blocks?.reduce((a, b) => a + b, 0) || 0),
          blocks_per_quarter: p.blocks || [0, 0, 0, 0],
          fouls: (p.fouls?.reduce((a, b) => a + b, 0) || 0) + 
                (p.overtime_fouls?.reduce((a, b) => a + b, 0) || 0),
          fouls_per_quarter: p.fouls || [0, 0, 0, 0],
          technical_fouls: (p.technical_fouls?.reduce((a, b) => a + b, 0) || 0) + 
                         (p.overtime_technical_fouls?.reduce((a, b) => a + b, 0) || 0), // ADDED: Technical fouls
          technical_fouls_per_quarter: p.technical_fouls || [0, 0, 0, 0],
          turnovers: (p.turnovers?.reduce((a, b) => a + b, 0) || 0) + 
                    (p.overtime_turnovers?.reduce((a, b) => a + b, 0) || 0),
          turnovers_per_quarter: p.turnovers || [0, 0, 0, 0],
          overtime_periods: overtimePeriods,
          overtime_two_points_made: p.overtime_two_points_made || [],
          overtime_three_points_made: p.overtime_three_points_made || [],
          overtime_free_throws_made: p.overtime_free_throws_made || [],
          overtime_assists: p.overtime_assists || [],
          overtime_rebounds: p.overtime_rebounds || [],
          overtime_steals: p.overtime_steals || [],
          overtime_blocks: p.overtime_blocks || [],
          overtime_fouls: p.overtime_fouls || [],
          overtime_technical_fouls: p.overtime_technical_fouls || [], // ADDED: Technical fouls overtime
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
          // ADDED: Assist errors data
          assist_errors: p.assist_errors?.reduce((a, b) => a + b, 0) || 0,
          assist_errors_per_set: p.assist_errors || [0, 0, 0, 0, 0],
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
          // Check if we're in admin edit mode
          if (isEditMode && cameFromAdmin) {
            // Admin edit mode - just show toast notification
            addToast('Statistics updated successfully!', 'success', '');
            
            // Exit edit mode after successful save
            setIsEditMode(false);
            setIsViewOnlyMode(true);
            
            // Refresh the data
            await handleGameSelect(selectedGame);
            setLoading(false);
            return;
          }
          
          // Show success page for normal staff stat entry
          setSavedMatchData({
            team1Name: selectedGame.team1_name,
            team2Name: selectedGame.team2_name,
            team1Score: team1TotalScore,
            team2Score: team2TotalScore,
            winnerName: winner_id === selectedGame.team1_id ? selectedGame.team1_name : selectedGame.team2_name,
            overtimePeriods: overtimePeriods,
            advancementMessage: '',
            isBracketReset: false,
            isOffline: true
          });
          setShowSuccessPage(true);
        }
        setLoading(false);
        return;
      }

      // IF ONLINE: Save to server
      console.log("Sending stats data:", {
        matchId: selectedGame.id,
        playersCount: statsData.players.length,
        team1_id: statsData.team1_id,
        team2_id: statsData.team2_id,
        firstPlayer: statsData.players[0] ? {
          player_id: statsData.players[0].player_id,
          team_id: statsData.players[0].team_id,
          has_assists: 'assists' in statsData.players[0],
          has_assists_per_quarter: 'assists_per_quarter' in statsData.players[0],
          keys: Object.keys(statsData.players[0])
        } : null
      });
      
      const statsRes = await fetch(
        `http://localhost:5000/api/stats/matches/${selectedGame.id}/stats`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(statsData),
        }
      );
      
      if (!statsRes.ok) {
        const errorData = await statsRes.json().catch(() => ({ error: `HTTP ${statsRes.status}: ${statsRes.statusText}` }));
        console.error("Backend error response:", errorData);
        throw new Error(errorData.error || `Failed to save stats: ${statsRes.status}`);
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

      // Check if we're in admin edit mode
      if (isEditMode && cameFromAdmin) {
  // Admin edit mode - just show toast notification
  addToast('Statistics updated successfully!', 'success', '');
  
  // Exit edit mode after successful save
  setIsEditMode(false);
  setIsViewOnlyMode(true);
  setHideButtons(true); // ADD THIS LINE - Hide buttons after saving
  
  // Refresh the data
  await handleGameSelect(selectedGame);
  setLoading(false);
  return;
}

      // Prepare success page data for normal staff stat entry
      let advancementMessage = "";
      let isBracketReset = false;

      if (bracketData.bracketReset) {
        isBracketReset = true;
        advancementMessage = "The Loser's Bracket winner has defeated the Winner's Bracket winner! A Reset Final has been scheduled - both teams start fresh!";
      } else if (bracketData.advanced) {
        if (selectedGame.elimination_type === 'double') {
          if (selectedGame.bracket_type === 'winner') {
            advancementMessage = "Winner advanced in winner's bracket!";
          } else if (selectedGame.bracket_type === 'loser') {
            advancementMessage = "Winner advanced in loser's bracket!";
          } else if (selectedGame.bracket_type === 'championship') {
            advancementMessage = selectedGame.round_number === 201 ? "Tournament champion determined!" : "Grand Final completed!";
          }
        } else {
          advancementMessage = "Winner advanced to next round!";
        }
      }

      // Show success page for staff stat entry
      setSavedMatchData({
        team1Name: selectedGame.team1_name,
        team2Name: selectedGame.team2_name,
        team1Score: team1TotalScore,
        team2Score: team2TotalScore,
        winnerName: winner_id === selectedGame.team1_id ? selectedGame.team1_name : selectedGame.team2_name,
        overtimePeriods: overtimePeriods,
        advancementMessage: advancementMessage,
        isBracketReset: isBracketReset,
        isOffline: false
      });
      setShowSuccessPage(true);
      
    } catch (err) {
      console.error("Error saving statistics:", err);
      console.error("Error details:", {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      
      // If save fails, offer to save offline
      const errorMessage = err.message || "Unknown error occurred";
      if (confirm(`Failed to save: ${errorMessage}\n\nWould you like to save offline and sync later?`)) {
        saveToLocalStorage(selectedGame.id, statsData, 'save_stats');
        alert('📱 Statistics saved offline. Will sync when connection is restored.');
      } else {
        // Show error to user
        setError(`Failed to save statistics: ${errorMessage}`);
        setTimeout(() => setError(null), 5000);
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

  // SUCCESS PAGE ACTION HANDLERS
const handleReEditStatistics = () => {
  setShowSuccessPage(false);
  setSavedMatchData(null);
};

const handleBackToMatchList = () => {
  sessionStorage.setItem('staffEventsContext', JSON.stringify({
    selectedEvent: selectedEvent,
    selectedBracket: selectedBracket
  }));
  navigate('/StaffDashboard/events');
};

const handleNextMatch = async () => {
  try {
    const res = await fetch(`http://localhost:5000/api/stats/${selectedBracket.id}/matches`);
    const allMatches = await res.json();
    const visibleMatches = allMatches.filter(m => m.status !== 'hidden');
    
    // Filter for both 'pending' AND 'scheduled' matches
    const pendingMatches = visibleMatches.filter(m => 
      m.status === 'pending' || m.status === 'scheduled'
    );
    
    if (pendingMatches.length > 0) {
      pendingMatches.sort((a, b) => a.round_number - b.round_number);
      const nextMatch = pendingMatches[0];
      
      setShowSuccessPage(false);
      setSavedMatchData(null);
      handleGameSelect(nextMatch);
    } else {
      alert("No more pending matches in this bracket!");
      handleBackToMatchList();
    }
  } catch (err) {
    console.error("Error finding next match:", err);
    alert("Could not find next match. Returning to match list.");
    handleBackToMatchList();
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

  // Player table to handle overtime stats - UPDATED with disabled state
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
            {(!isViewOnlyMode || isEditMode) && (
              <span className="stats-team-hint">
                Max {maxStarters} starters - Click checkbox to set lineup
                {isBasketball && takenPositions.size > 0 && (
                  <span className="stats-positions-taken">
                    Positions taken: {Array.from(takenPositions).join(', ')}
                  </span>
                )}
              </span>
            )}
          </div>
          {benchPlayers.length > 0 && (!isViewOnlyMode || isEditMode) && (
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
              {(!isViewOnlyMode || (isEditMode && !cameFromAdmin)) && <th className="col-start">Start</th>}
                <th className="col-player">Player</th>
                <th className="col-number">#</th>
                <th className="col-position">Position</th>
               {(!isViewOnlyMode || (isEditMode && !cameFromAdmin)) && <th className="col-status">Status</th>}
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
                    <th className="col-stat">Tech</th>
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
                    <th className="col-stat">Ast.Err</th> {/* ADDED: Assist Errors header */}
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
               const positionTaken = false; // No position restrictions
                const isDisabled = isPlayerDisabled(player);
                
                return (
                  <tr key={player.player_id} className={`${player.isOnCourt ? 'on-court' : ''} ${isDisabled ? 'fouled-out' : ''}`}>
           {(!isViewOnlyMode || (isEditMode && !cameFromAdmin)) && (
  <td className="col-start">
                        <input
                          type="checkbox"
                          checked={isStarter}
                          onChange={() => handleStartingPlayerToggle(player.player_id, teamId)}
                          disabled={positionTaken || isDisabled || (isViewOnlyMode && !isEditMode)}
                          title={positionTaken ? `Position ${player.position} is already taken` : isDisabled ? 'Player has fouled out' : ''}
                        />
                      </td>
                    )}
                    <td className="col-player">
                      {player.player_name}
                      {isDisabled && (
                        <span className="stats-fouled-out">FOULED OUT</span>
                      )}
                      {positionTaken && (
                        <span className="stats-position-taken" title={`Position ${player.position} is already taken`}>
                          ⚠️
                        </span>
                      )}
                    </td>
                    <td className="col-number">#{player.jersey_number}</td>
                    <td className="col-position">{player.position}</td>
                   {(!isViewOnlyMode || (isEditMode && !cameFromAdmin)) && (
  <td className="col-status">
                        <span className={`stats-player-status ${player.isOnCourt ? 'on-court' : 'on-bench'} ${isDisabled ? 'fouled-out' : ''}`}>
                          {player.isOnCourt ? 'On Court' : 'Bench'}
                          {isDisabled && ' (FO)'}
                        </span>
                      </td>
                    )}
                    
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
                            {!hideButtons && (!isViewOnlyMode || isEditMode) && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "two_points_made", false)} 
                                className="stats-control-button"
                                disabled={isDisabled || (isViewOnlyMode && !isEditMode)}
                              >
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_two_points_made?.[currentOvertime] || 0)
                                : (player.two_points_made?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (!isViewOnlyMode || isEditMode) && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "two_points_made", true)} 
                                className="stats-control-button"
                                disabled={isDisabled || (isViewOnlyMode && !isEditMode)}
                              >
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "three_points_made", false)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
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
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "three_points_made", true)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "free_throws_made", false)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
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
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "free_throws_made", true)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "assists", false)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
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
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "assists", true)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "rebounds", false)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
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
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "rebounds", true)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "steals", false)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
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
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "steals", true)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "blocks", false)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
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
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "blocks", true)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "fouls", false)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
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
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "fouls", true)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "technical_fouls", false)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_technical_fouls?.[currentOvertime] || 0)
                                : (player.technical_fouls?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "technical_fouls", true)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "turnovers", false)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
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
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "turnovers", true)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
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
                        {/* ADDED: Assist Errors column */}
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "assist_errors", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.assist_errors[currentQuarter]}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "assist_errors", true)} className="stats-control-button">
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
               const positionTaken = false; // No position restrictions
                const isDisabled = isPlayerDisabled(player);
                
                return (
                  <tr key={player.player_id} className={`bench-player ${isDisabled ? 'fouled-out' : ''}`}>
                    {(!isViewOnlyMode || (isEditMode && !cameFromAdmin)) && (
  <td className="col-start">
                        <input
                          type="checkbox"
                          checked={isStarter}
                          onChange={() => handleStartingPlayerToggle(player.player_id, teamId)}
                          disabled={positionTaken || isDisabled || (isViewOnlyMode && !isEditMode)}
                          title={positionTaken ? `Position ${player.position} is already taken` : isDisabled ? 'Player has fouled out' : ''}
                        />
                      </td>
                    )}
                    <td className="col-player">
                      {player.player_name}
                      {isDisabled && (
                        <span className="stats-fouled-out">FOULED OUT</span>
                      )}
                      {positionTaken && (
                        <span className="stats-position-taken" title={`Position ${player.position} is already taken`}>
                          
                        </span>
                      )}
                    </td>
                    <td className="col-number">#{player.jersey_number}</td>
                    <td className="col-position">{player.position}</td>
                 {(!isViewOnlyMode || (isEditMode && !cameFromAdmin)) && (
  <td className="col-status">
                        <span className={`stats-player-status ${player.isOnCourt ? 'on-court' : 'on-bench'} ${isDisabled ? 'fouled-out' : ''}`}>
                          {player.isOnCourt ? 'On Court' : 'Bench'}
                          {isDisabled && ' (FO)'}
                        </span>
                      </td>
                    )}
                    
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
                            {!hideButtons && (!isViewOnlyMode || isEditMode) && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "two_points_made", false)} 
                                className="stats-control-button"
                                disabled={isDisabled || (isViewOnlyMode && !isEditMode)}
                              >
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_two_points_made?.[currentOvertime] || 0)
                                : (player.two_points_made?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (!isViewOnlyMode || isEditMode) && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "two_points_made", true)} 
                                className="stats-control-button"
                                disabled={isDisabled || (isViewOnlyMode && !isEditMode)}
                              >
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "three_points_made", false)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
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
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "three_points_made", true)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "free_throws_made", false)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
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
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "free_throws_made", true)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "assists", false)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
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
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "assists", true)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "rebounds", false)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
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
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "rebounds", true)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "steals", false)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
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
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "steals", true)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "blocks", false)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
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
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "blocks", true)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "fouls", false)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
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
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "fouls", true)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "technical_fouls", false)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">
                              {isOvertime 
                                ? (player.overtime_technical_fouls?.[currentOvertime] || 0)
                                : (player.technical_fouls?.[currentQuarter] || 0)
                              }
                            </span>
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "technical_fouls", true)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
                                <FaPlus />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "turnovers", false)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
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
                              <button 
                                onClick={() => adjustPlayerStat(globalIndex, "turnovers", true)} 
                                className="stats-control-button"
                                disabled={isDisabled}
                              >
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
                        {/* ADDED: Assist Errors column for bench players */}
                        <td className="col-stat">
                          <div className="stats-controls">
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "assist_errors", false)} className="stats-control-button">
                                <FaMinus />
                              </button>
                            )}
                            <span className="stats-value">{player.assist_errors[currentQuarter]}</span>
                            {!hideButtons && (
                              <button onClick={() => adjustPlayerStat(globalIndex, "assist_errors", true)} className="stats-control-button">
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
  <ConnectionStatus />
  <ToastNotifications />
  
  <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
    <div className="dashboard-header">
      <h1>Match Scoring</h1>
      <p>Record player statistics for matches</p>
    </div>

    <div className="dashboard-main">
      {/* SUCCESS PAGE */}
      {showSuccessPage && savedMatchData ? (
        <div className="bracket-content">
          <div className="bracket-create-section">
            <div className="bracket-form-container success-container">
              <div className="success-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <FaCheckCircle size={80} color="#4caf50" />
              </div>
              <h2 style={{ textAlign: 'center' }}>
                {savedMatchData.isOffline 
                  ? "Statistics Saved Offline!" 
                  : savedMatchData.isBracketReset 
                    ? "🚨 BRACKET RESET! 🚨"
                    : "Statistics Saved Successfully!"}
              </h2>
              <p className="step-description" style={{ textAlign: 'center' }}>
                {savedMatchData.isOffline 
                  ? "Data will sync automatically when connection is restored"
                  : savedMatchData.isBracketReset
                    ? savedMatchData.advancementMessage
                    : "Match statistics have been recorded"}
              </p>

              <div className="tournament-summary">
                <h3 style={{ textAlign: 'center' }}>Match Summary</h3>
                <div className="summary-item" style={{ fontSize: '16px' }}>
                  <strong>Teams:</strong> 
                  <span>{savedMatchData.team1Name} vs {savedMatchData.team2Name}</span>
                </div>
                <div className="summary-item" style={{ fontSize: '16px' }}>
                  <strong>Final Score:</strong> 
                  <span>{savedMatchData.team1Score} - {savedMatchData.team2Score}</span>
                </div>
                <div className="summary-item" style={{ fontSize: '16px' }}>
                  <strong>Winner:</strong> 
                  <span style={{ color: '#10b981', fontWeight: '600' }}>
                    {savedMatchData.winnerName} <FaTrophy style={{ color: '#ffd700', marginLeft: '5px' }} />
                  </span>
                </div>
                {savedMatchData.overtimePeriods > 0 && (
                  <div className="summary-item" style={{ fontSize: '16px' }}>
                    <strong>Overtime:</strong> 
                    <span>{savedMatchData.overtimePeriods} period{savedMatchData.overtimePeriods > 1 ? 's' : ''}</span>
                  </div>
                )}
                {savedMatchData.advancementMessage && !savedMatchData.isBracketReset && (
                  <div className="summary-item" style={{ 
                    fontSize: '16px', 
                    borderTop: '2px solid rgba(255,255,255,0.1)', 
                    paddingTop: '15px', 
                    marginTop: '15px' 
                  }}>
                    <strong>Status:</strong> 
                    <span style={{ color: '#3b82f6' }}>{savedMatchData.advancementMessage}</span>
                  </div>
                )}
                {savedMatchData.isOffline && (
                  <div className="summary-item" style={{ 
                    fontSize: '16px', 
                    background: 'rgba(251, 191, 36, 0.1)', 
                    border: '1px solid rgba(251, 191, 36, 0.3)', 
                    borderRadius: '6px', 
                    padding: '12px', 
                    marginTop: '15px' 
                  }}>
                    <strong>Pending Syncs:</strong> 
                    <span style={{ color: '#fbbf24' }}>
                      <FaCloudUploadAlt style={{ marginRight: '5px' }} />
                      {savedMatchData.pendingSyncs} item{savedMatchData.pendingSyncs > 1 ? 's' : ''} waiting to sync
                    </span>
                  </div>
                )}
              </div>

              <div className="bracket-form-actions" style={{ marginTop: '30px', gap: '15px' }}>
                <button 
                  onClick={handleReEditStatistics}
                  className="bracket-cancel-btn"
                  style={{ 
                    width: '100%', 
                    fontSize: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px' 
                  }}
                >
                  <FaRedo />
                  Re-edit Statistics
                </button>
                <button 
                  onClick={handleBackToMatchList}
                  className="bracket-submit-btn"
                  style={{ 
                    width: '100%', 
                    background: '#3b82f6', 
                    fontSize: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px' 
                  }}
                >
                  <FaArrowLeft />
                  Back to Matches List
                </button>
                {hasMoreMatches() && (
                  <button 
                    onClick={handleNextMatch}
                    className="bracket-submit-btn"
                    style={{ 
                      width: '100%', 
                      background: '#10b981', 
                      fontSize: '16px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '8px' 
                    }}
                  >
                    Next Match
                    <FaArrowRight />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
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
                        <div 
                          className="stats-progress-fill" 
                          style={{ 
                            width: `${totalGames > 0 ? (completedGames / totalGames) * 100 : 0}%`
                          }}
                        ></div>
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
                  <div style={{ display: 'flex', gap: '10px' }}>
  {/* Only show Edit Stats button for admins, NOT for staff */}
 {isViewOnlyMode && !isEditMode && cameFromAdmin && (
  <button 
    onClick={() => {
      setIsEditMode(true);
      setShowBenchPlayers({ team1: true, team2: true });
      setShowBothTeams(true);
      setHideButtons(false); // This should already be here
    }}
      className="stats-edit-button"
      style={{
        padding: '10px 20px',
        background: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <FaEdit /> Edit Stats
    </button>
  )}
                 <button 
  onClick={() => {
    if (cameFromAdmin) {
      // Save context to return to the exact manage matches page
      sessionStorage.setItem('adminEventsReturnContext', JSON.stringify({
        selectedEvent: selectedEvent,
        selectedBracket: selectedBracket,
        contentTab: 'matches',
        bracketViewType: 'list'
      }));
      sessionStorage.removeItem('selectedMatchData');
      sessionStorage.removeItem('adminEventsContext');
      navigate('/AdminDashboard/events');
    } else if (cameFromStaffEvents) {
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
  Back to {cameFromAdmin ? 'Manage Matches' : 'Games'}
</button>
                  </div>
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

              {/* Period Navigation - Always show in view-only mode for staff to select quarters/OT */}
              {renderPeriodNavigation()}

              {/* Overtime Controls - Show read-only version in view-only mode for navigation */}
              {isViewOnlyMode && !isEditMode && overtimePeriods > 0 && (
                <div className="stats-overtime-controls">
                  <div className="overtime-period-selector">
                    <span>Overtime Periods:</span>
                    {Array.from({ length: overtimePeriods }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setIsOvertime(true);
                          setCurrentOvertime(i);
                        }}
                        className={`overtime-period-tab ${isOvertime && currentOvertime === i ? 'active' : ''}`}
                      >
                        OT {i + 1}
                      </button>
                    ))}
                  </div>
                  {isOvertime && (
                    <button
                      onClick={() => {
                        setIsOvertime(false);
                        setCurrentQuarter(3);
                      }}
                      className="stats-regulation-button"
                    >
                      Back to Regulation
                    </button>
                  )}
                </div>
              )}
              {/* Full overtime controls for edit mode */}
              {(!isViewOnlyMode || isEditMode) && renderOvertimeControls()}

              {/* Scores Display */}
              {renderScores()}

              {/* Action Buttons - Show only in edit mode or if not view-only */}
              {(!isViewOnlyMode || isEditMode) && selectedGame.status !== 'completed' && (
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
              
              {/* Save button for edit mode in view-only - Only for admins */}
              {isViewOnlyMode && isEditMode && cameFromAdmin && (
                <div className="stats-actions">
                  <button
                    onClick={async () => {
                      await saveStatistics();
                      setIsEditMode(false);
                      setIsViewOnlyMode(true);
                    }}
                    disabled={loading}
                    className="stats-action-button stats-action-save"
                  >
                    <FaSave /> {loading ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={() => {
                              setIsEditMode(false);
                              setHideButtons(true); // ADD THIS LINE
                      // Reload stats to reset any changes
                      handleGameSelect(selectedGame);
                    }}
                    className="stats-action-button stats-action-reset"
                  >
                    <FaTimes /> Cancel
                  </button>
                </div>
              )}

              {/* Control Bar - Hide in view-only mode unless edit mode */}
              {(!isViewOnlyMode || isEditMode) && <ControlBar />}

              {/* QuickScore Bar - Hide in view-only mode unless edit mode */}
              {(!isViewOnlyMode || isEditMode) && <QuickScoreBar />}

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
        </>
      )}
    </div>
  </div>
</div>
  );
};

export default StaffStats;