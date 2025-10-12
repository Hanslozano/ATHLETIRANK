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
  FaExchangeAlt
} from "react-icons/fa";
import "../../style/Staff_Stats.css";

const StaffStats = ({ sidebarOpen }) => {
  const [activeTab, setActiveTab] = useState("select");
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
  const [currentQuarter, setCurrentQuarter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRounds, setExpandedRounds] = useState(new Set([1]));
  const [startingPlayers, setStartingPlayers] = useState({
    team1: [],
    team2: []
  });
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [substitutionData, setSubstitutionData] = useState({
    playerOut: null,
    playerIn: null,
    team: null
  });

  // Basketball template
  const basketballStatsTemplate = {
    points: [0, 0, 0, 0],
    assists: [0, 0, 0, 0],
    rebounds: [0, 0, 0, 0],
    three_points_made: [0, 0, 0, 0],
    steals: [0, 0, 0, 0],
    blocks: [0, 0, 0, 0],
    fouls: [0, 0, 0, 0],
    turnovers: [0, 0, 0, 0],
    isStarting: false,
    isOnCourt: false
  };

  // Volleyball template
  const volleyballStatsTemplate = {
    kills: [0, 0, 0, 0, 0],
    attack_attempts: [0, 0, 0, 0, 0],
    attack_errors: [0, 0, 0, 0, 0],
    serves: [0, 0, 0, 0, 0],
    service_aces: [0, 0, 0, 0, 0],
    serve_errors: [0, 0, 0, 0, 0],
    receptions: [0, 0, 0, 0, 0],
    reception_errors: [0, 0, 0, 0, 0],
    digs: [0, 0, 0, 0, 0],
    volleyball_assists: [0, 0, 0, 0, 0],
    isStarting: false,
    isOnCourt: false
  };

  // Get max starting players based on sport type
  const getMaxStartingPlayers = (sportType) => {
    return sportType === "volleyball" ? 6 : 5;
  };

  // Initialize starting players (first players from each team based on sport type)
  const initializeStartingPlayers = (stats, team1Id, team2Id, sportType) => {
    const maxStarters = getMaxStartingPlayers(sportType);
    const team1Players = stats.filter(p => p.team_id === team1Id).slice(0, maxStarters);
    const team2Players = stats.filter(p => p.team_id === team2Id).slice(0, maxStarters);
    
    setStartingPlayers({
      team1: team1Players.map(p => p.player_id),
      team2: team2Players.map(p => p.player_id)
    });

    // Update player stats with starting lineup
    const updatedStats = stats.map(player => ({
      ...player,
      isStarting: team1Players.some(p => p.player_id === player.player_id) || 
                 team2Players.some(p => p.player_id === player.player_id),
      isOnCourt: team1Players.some(p => p.player_id === player.player_id) || 
                 team2Players.some(p => p.player_id === player.player_id)
    }));

    setPlayerStats(updatedStats);
  };

  // Handle starting player selection - AUTOMATIC SWAPPING VERSION
  const handleStartingPlayerToggle = (playerId, teamId) => {
    const sportType = selectedGame?.sport_type;
    const maxStarters = getMaxStartingPlayers(sportType);
    const teamKey = teamId === selectedGame.team1_id ? 'team1' : 'team2';
    const currentStarters = [...startingPlayers[teamKey]];
    
    if (currentStarters.includes(playerId)) {
      // Remove from starters if already selected
      const updatedStarters = currentStarters.filter(id => id !== playerId);
      setStartingPlayers(prev => ({
        ...prev,
        [teamKey]: updatedStarters
      }));
      
      // Update player stats
      setPlayerStats(prev => prev.map(p => 
        p.player_id === playerId ? { ...p, isStarting: false, isOnCourt: false } : p
      ));
    } else {
      // If we already have max starters, find one to replace
      if (currentStarters.length >= maxStarters) {
        // Find the first starter that can be replaced (not necessarily the last one)
        const playerToRemove = currentStarters[0]; // Replace the first starter
        
        const updatedStarters = currentStarters.map(starterId => 
          starterId === playerToRemove ? playerId : starterId
        );
        
        setStartingPlayers(prev => ({
          ...prev,
          [teamKey]: updatedStarters
        }));
        
        // Update both players' stats - swap their positions
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
        // Add to starters if less than max
        const updatedStarters = [...currentStarters, playerId];
        setStartingPlayers(prev => ({
          ...prev,
          [teamKey]: updatedStarters
        }));
        
        // Update player stats
        setPlayerStats(prev => prev.map(p => 
          p.player_id === playerId ? { ...p, isStarting: true, isOnCourt: true } : p
        ));
      }
    }
  };

  // Handle substitution
  const handleSubstitution = (team, playerOut, playerIn) => {
    const teamKey = team === selectedGame.team1_id ? 'team1' : 'team2';
    
    // Update player on-court status
    setPlayerStats(prev => prev.map(p => {
      if (p.player_id === playerOut) {
        return { ...p, isOnCourt: false };
      }
      if (p.player_id === playerIn) {
        return { ...p, isOnCourt: true };
      }
      return p;
    }));

    setShowSubstitutionModal(false);
    setSubstitutionData({ playerOut: null, playerIn: null, team: null });
  };

  // Open substitution modal
  const openSubstitutionModal = (teamId) => {
    const teamPlayers = playerStats.filter(p => p.team_id === teamId);
    const courtPlayers = teamPlayers.filter(p => p.isOnCourt);
    const benchPlayers = teamPlayers.filter(p => !p.isOnCourt && p.isStarting);
    
    if (benchPlayers.length === 0) {
      alert("No bench players available for substitution");
      return;
    }

    if (courtPlayers.length === 0) {
      alert("No players on court to substitute out");
      return;
    }

    setSubstitutionData({
      team: teamId,
      playerOut: courtPlayers[0]?.player_id || null,
      playerIn: benchPlayers[0]?.player_id || null
    });
    setShowSubstitutionModal(true);
  };

  // Sort players for display - starters first, then bench players
  const getSortedTeamPlayers = (teamId) => {
    const teamPlayers = playerStats.filter(player => player.team_id === teamId);
    
    // Sort: starters first (on court), then bench players, sorted by name
    return teamPlayers.sort((a, b) => {
      // Starters (on court) come first
      if (a.isOnCourt && !b.isOnCourt) return -1;
      if (!a.isOnCourt && b.isOnCourt) return 1;
      
      // Then sort by name
      return a.player_name.localeCompare(b.player_name);
    });
  };

  // Calculate hitting percentage for volleyball
  const calculateHittingPercentage = (player) => {
    const kills = player.kills ? player.kills.reduce((a, b) => a + b, 0) : 0;
    const attempts = player.attack_attempts ? player.attack_attempts.reduce((a, b) => a + b, 0) : 0;
    const errors = player.attack_errors ? player.attack_errors.reduce((a, b) => a + b, 0) : 0;
    
    if (attempts === 0) return "0.00%";
    return (((kills - errors) / attempts) * 100).toFixed(2) + "%";
  };

  // Calculate basketball percentage (rebounds/assists) - max 100%
  const calculateBasketballPercentage = (stat, maxValue = 10) => {
    const total = stat ? stat.reduce((a, b) => a + b, 0) : 0;
    const percentage = Math.min((total / maxValue) * 100, 100);
    return percentage.toFixed(1) + "%";
  };

  // Check if player is fouled out (5 or more fouls)
  const isPlayerFouledOut = (player) => {
    const totalFouls = player.fouls ? player.fouls.reduce((a, b) => a + b, 0) : 0;
    return totalFouls >= 5;
  };

  // Updated groupGamesByRound function with Reset Final support
  const groupGamesByRound = (games) => {
    const grouped = {};
    
    // Separate games by elimination type first
    const singleEliminationGames = games.filter(game => game.elimination_type === 'single');
    const doubleEliminationGames = games.filter(game => game.elimination_type === 'double');
    
    // Handle single elimination games - FIXED: Always show final round as Championship
    if (singleEliminationGames.length > 0) {
      // Find the maximum round number for single elimination
      const maxRound = Math.max(...singleEliminationGames.map(game => game.round_number));
      
      // Check if the final round has any games (completed or scheduled)
      const finalRoundGames = singleEliminationGames.filter(game => game.round_number === maxRound);
      
      // If there are final round games, treat it as championship
      if (finalRoundGames.length > 0) {
        grouped['Championship'] = {
          'Tournament Final': finalRoundGames
        };
        
        // Add remaining single elimination rounds (excluding the final round we just handled)
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
      } else {
        // No final round games found, group all single elimination games normally
        singleEliminationGames.forEach(game => {
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
    
    // Handle double elimination games (existing logic + reset final support)
    if (doubleEliminationGames.length > 0) {
      const winnerGames = doubleEliminationGames.filter(game => game.bracket_type === 'winner');
      const loserGames = doubleEliminationGames.filter(game => game.bracket_type === 'loser');
      const championshipGames = doubleEliminationGames.filter(game => game.bracket_type === 'championship');
      
      // Separate Grand Final (200) and Reset Final (201)
      const grandFinalGames = championshipGames.filter(game => game.round_number === 200);
      const resetFinalGames = championshipGames.filter(game => game.round_number === 201);
      
      // Group winner's bracket games
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
      
      // Group loser's bracket games
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
      
      // Add championship games with proper reset final handling
      if (grandFinalGames.length > 0 || resetFinalGames.length > 0) {
        grouped['Championship'] = {};
        
        if (grandFinalGames.length > 0) {
          grouped['Championship']['Grand Final'] = grandFinalGames;
        }
        
        // Only show reset final if it's not hidden (has been activated)
        if (resetFinalGames.length > 0 && resetFinalGames[0].status !== 'hidden') {
          grouped['Championship']['Reset Final'] = resetFinalGames;
        }
      }
    }

    return grouped;
  };

  // Fixed sortRounds function
  const sortRounds = (rounds) => {
    return Object.entries(rounds).sort(([a], [b]) => {
      // Championship always last
      if (a === 'Championship') return 1;
      if (b === 'Championship') return -1;
      
      // LB rounds come after WB rounds of same number
      const aIsLB = a.startsWith('LB Round');
      const bIsLB = b.startsWith('LB Round');
      
      if (aIsLB && !bIsLB) return 1;
      if (!aIsLB && bIsLB) return -1;
      
      // Extract round numbers
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

  // Render game card with reset final support
  const renderGameCard = (game, roundName) => {
    const isResetFinal = game.round_number === 201;
    const isChampionship = roundName === 'Championship';
    
    return (
      <div className={`bracket-card ${isResetFinal ? 'reset-final' : ''}`} key={game.id}>
        <div className="bracket-card-header">
          <h3>
            {game.team1_name || "Team 1"} vs {game.team2_name || "Team 2"}
            {isResetFinal && <span className="reset-final-badge">RESET FINAL</span>}
            {game.winner_id && isChampionship && (
              <FaCrown className="champion-crown" title="Tournament Champion" />
            )}
          </h3>
          <span className={`bracket-sport-badge bracket-sport-${game.sport_type}`}>
            {game.sport_type}
          </span>
          {game.elimination_type === 'double' && (
            <span className={`bracket-type-badge bracket-type-${game.bracket_type || 'winner'} ${isResetFinal ? 'bracket-type-reset' : ''}`}>
              {isResetFinal ? 'Reset Final' : 
               game.bracket_type ? game.bracket_type.charAt(0).toUpperCase() + game.bracket_type.slice(1) : 'Winner'} 
              {!isResetFinal && ' Bracket'}
            </span>
          )}
        </div>
        <div className="bracket-card-info">
          <div><strong>Type:</strong> 
            <span className={`elimination-type-${game.elimination_type}`}>
              {game.elimination_type === 'double' ? 'Double Elimination' : 'Single Elimination'}
            </span>
          </div>
          <div><strong>Status:</strong> 
            <span className={`status-${game.status}`}>
              {game.status}
            </span>
          </div>
          {isResetFinal && game.status === 'scheduled' && (
            <div><strong>Special:</strong> 
              <span className="reset-special">Both teams start fresh - Winner takes all!</span>
            </div>
          )}
          {game.status === "completed" && (
            <div><strong>Score:</strong> {game.score_team1} - {game.score_team2}</div>
          )}
          {game.winner_name && (
            <div className="winner-info">
              <strong>Winner:</strong> 
              <span className={`winner-name ${isResetFinal ? 'tournament-champion' : ''}`}>
                {game.winner_name}
                {isResetFinal && game.status === 'completed' && <FaTrophy className="winner-trophy" />}
                {game.round_number === 200 && !isResetFinal && <FaTrophy className="winner-trophy" />}
              </span>
            </div>
          )}
        </div>
        <div className="bracket-card-actions">
          <button className="bracket-view-btn" onClick={() => handleGameSelect(game)}>
            {game.status === "completed" ? "Edit Statistics" : "Record Statistics"}
          </button>
        </div>
      </div>
    );
  };

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:5000/api/stats/events");
        const data = await res.json();
        setEvents(data);
      } catch (err) {
        setError("Failed to load events");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Calculate team scores from player stats
  const calculateTeamScores = (stats, team1Id, team2Id, sportType) => {
    const team1Scores = sportType === "basketball" 
      ? [0, 0, 0, 0] 
      : [0, 0, 0, 0, 0];
    const team2Scores = sportType === "basketball" 
      ? [0, 0, 0, 0] 
      : [0, 0, 0, 0, 0];

    stats.forEach(player => {
      const scoringStat = sportType === "basketball" ? "points" : "kills";
      const playerTeamId = player.team_id;
      
      if (playerTeamId === team1Id) {
        for (let i = 0; i < team1Scores.length; i++) {
          team1Scores[i] += player[scoringStat][i] || 0;
        }
      } else if (playerTeamId === team2Id) {
        for (let i = 0; i < team2Scores.length; i++) {
          team2Scores[i] += player[scoringStat][i] || 0;
        }
      }
    });

    return { team1: team1Scores, team2: team2Scores };
  };

  // Toggle round expansion
  const toggleRoundExpansion = (roundNumber) => {
    const newExpandedRounds = new Set(expandedRounds);
    if (newExpandedRounds.has(roundNumber)) {
      newExpandedRounds.delete(roundNumber);
    } else {
      newExpandedRounds.add(roundNumber);
    }
    setExpandedRounds(newExpandedRounds);
  };

  // Handle event selection
  const handleEventSelect = async (event) => {
    console.log("Selected event:", event);
    setSelectedEvent(event);
    setSelectedBracket(null);
    setSelectedGame(null);
    setPlayerStats([]);
    setTeamScores({ team1: [0, 0, 0, 0], team2: [0, 0, 0, 0] });
    setCurrentQuarter(0);
    setExpandedRounds(new Set([1]));
    setLoading(true);
    setError(null);

    try {
      const bracketRes = await fetch(
        `http://localhost:5000/api/stats/events/${event.id}/brackets`
      );
      
      if (!bracketRes.ok) {
        throw new Error(`HTTP error! status: ${bracketRes.status}`);
      }
      
      const bracketData = await bracketRes.json();
      setBrackets(bracketData);

      if (bracketData.length === 0) {
        setError("No brackets found for this event. Create brackets first.");
        setGames([]);
        setTeams([]);
        setLoading(false);
        setActiveTab("games");
        return;
      }

      setLoading(false);
      setActiveTab("bracket-selection");

    } catch (err) {
      console.error("Error loading event data:", err);
      setError("Failed to load event data: " + err.message);
      setLoading(false);
    }
  };

  // Handle bracket selection - UPDATED: Filter out hidden matches
  const handleBracketSelect = async (bracket) => {
    setLoading(true);
    setError(null);
    
    try {
      const allMatches = [];
      const allTeams = [];

      // Fetch matches for the selected bracket
      const matchRes = await fetch(
        `http://localhost:5000/api/stats/${bracket.id}/matches`
      );
      
      if (!matchRes.ok) {
        console.error(`Failed to fetch matches for bracket ${bracket.id}: ${matchRes.status}`);
        throw new Error(`Failed to load matches for ${bracket.name}`);
      }
      
      const matchData = await matchRes.json();
      
      // FILTER OUT HIDDEN MATCHES (bracket reset matches that haven't been activated)
      const visibleMatches = matchData.filter(match => match.status !== 'hidden');
      
      const matchesWithBracket = visibleMatches.map(match => ({
        ...match,
        bracket_name: bracket.name,
        sport_type: bracket.sport_type,
        bracket_id: bracket.id,
        elimination_type: bracket.elimination_type
      }));
      
      allMatches.push(...matchesWithBracket);

      // Fetch teams for the selected bracket
      try {
        const teamRes = await fetch(
          `http://localhost:5000/api/stats/${bracket.id}/teams`
        );
        
        if (teamRes.ok) {
          const teamData = await teamRes.json();
          teamData.forEach(team => {
            if (!allTeams.find(t => t.id === team.id)) {
              allTeams.push(team);
            }
          });
        }
      } catch (teamErr) {
        console.error(`Error fetching teams for bracket ${bracket.id}:`, teamErr);
      }

      // Sort matches by round number and bracket type
      allMatches.sort((a, b) => {
        // Championship matches go last
        if (a.bracket_type === 'championship' && b.bracket_type !== 'championship') return 1;
        if (b.bracket_type === 'championship' && a.bracket_type !== 'championship') return -1;
        
        // Then sort by round number
        return a.round_number - b.round_number;
      });
      
      setGames(allMatches);
      setTeams(allTeams);
      setSelectedBracket(bracket);

      if (allMatches.length === 0) {
        setError("No matches found for this bracket. Make sure brackets have been generated.");
      }

      setActiveTab("games");

    } catch (err) {
      console.error("Error loading bracket data:", err);
      setError("Failed to load bracket data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initialize player stats
  const initializePlayerStats = async (game) => {
    try {
      console.log("Initializing player stats for game:", game);
      
      const res1 = await fetch(
        `http://localhost:5000/api/stats/teams/${game.team1_id}/players`
      );
      const team1Players = await res1.json();

      const res2 = await fetch(
        `http://localhost:5000/api/stats/teams/${game.team2_id}/players`
      );
      const team2Players = await res2.json();

      const template =
        game.sport_type === "basketball"
          ? basketballStatsTemplate
          : volleyballStatsTemplate;

      const initialStats = [
        ...team1Players.map((p) => ({
          player_id: p.id,
          player_name: p.name,
          jersey_number: p.jersey_number || p.jerseyNumber || "N/A",
          team_id: game.team1_id,
          team_name: teams.find((t) => t.id === game.team1_id)?.name,
          ...JSON.parse(JSON.stringify(template)),
        })),
        ...team2Players.map((p) => ({
          player_id: p.id,
          player_name: p.name,
          jersey_number: p.jersey_number || p.jerseyNumber || "N/A",
          team_id: game.team2_id,
          team_name: teams.find((t) => t.id === game.team2_id)?.name,
          ...JSON.parse(JSON.stringify(template)),
        })),
      ];
      
      setPlayerStats(initialStats);
      initializeStartingPlayers(initialStats, game.team1_id, game.team2_id, game.sport_type);

      // Calculate initial team scores
      const scores = calculateTeamScores(initialStats, game.team1_id, game.team2_id, game.sport_type);
      setTeamScores(scores);

      // Load existing stats
      try {
        const resStats = await fetch(`http://localhost:5000/api/stats/matches/${game.id}/stats`);
        const existingStats = await resStats.json();
        
        if (existingStats.length > 0) {
          const merged = initialStats.map((p) => {
            const found = existingStats.find((s) => s.player_id === p.player_id);
            if (found) {
              const mergedPlayer = { ...p };
              
              if (game.sport_type === "basketball") {
                mergedPlayer.points = [found.points || 0, 0, 0, 0];
                mergedPlayer.assists = [found.assists || 0, 0, 0, 0];
                mergedPlayer.rebounds = [found.rebounds || 0, 0, 0, 0];
                mergedPlayer.three_points_made = [found.three_points_made || 0, 0, 0, 0];
                mergedPlayer.steals = [found.steals || 0, 0, 0, 0];
                mergedPlayer.blocks = [found.blocks || 0, 0, 0, 0];
                mergedPlayer.fouls = [found.fouls || 0, 0, 0, 0];
                mergedPlayer.turnovers = [found.turnovers || 0, 0, 0, 0];
              } else {
                mergedPlayer.kills = [found.kills || 0, 0, 0, 0, 0];
                mergedPlayer.attack_attempts = [found.attack_attempts || 0, 0, 0, 0, 0];
                mergedPlayer.attack_errors = [found.attack_errors || 0, 0, 0, 0, 0];
                mergedPlayer.serves = [found.serves || 0, 0, 0, 0, 0];
                mergedPlayer.service_aces = [found.service_aces || 0, 0, 0, 0, 0];
                mergedPlayer.serve_errors = [found.serve_errors || 0, 0, 0, 0, 0];
                mergedPlayer.receptions = [found.receptions || 0, 0, 0, 0, 0];
                mergedPlayer.reception_errors = [found.reception_errors || 0, 0, 0, 0, 0];
                mergedPlayer.digs = [found.digs || 0, 0, 0, 0, 0];
                mergedPlayer.volleyball_assists = [found.volleyball_assists || 0, 0, 0, 0, 0];
              }
              
              return mergedPlayer;
            }
            return p;
          });
          
          setPlayerStats(merged);
          
          // Recalculate team scores with loaded stats
          const loadedScores = calculateTeamScores(merged, game.team1_id, game.team2_id, game.sport_type);
          setTeamScores(loadedScores);
        }
        
      } catch (statsErr) {
        console.log("No existing stats found or error loading:", statsErr);
      }
    } catch (err) {
      console.error("Error initializing player stats:", err);
      setError("Failed to load players/stats: " + err.message);
    }
  };

  // Handle game selection
  const handleGameSelect = async (game) => {
    setSelectedGame(game);
    setLoading(true);
    
    const initialScores =
      game.sport_type === "basketball"
        ? { team1: [0, 0, 0, 0], team2: [0, 0, 0, 0] }
        : { team1: [0, 0, 0, 0, 0], team2: [0, 0, 0, 0, 0] };
    
    setTeamScores(initialScores);
    setCurrentQuarter(0);

    await initializePlayerStats(game);
    setLoading(false);
    setActiveTab("statistics");
  };

  // Update player stat
  const updatePlayerStat = (playerIndex, statName, value) => {
    const newStats = [...playerStats];
    const newValue = Math.max(0, parseInt(value) || 0);
    
    newStats[playerIndex][statName][currentQuarter] = newValue;
    setPlayerStats(newStats);

    // Recalculate team scores
    if ((statName === "points" || statName === "kills") && selectedGame) {
      const scores = calculateTeamScores(newStats, selectedGame.team1_id, selectedGame.team2_id, selectedGame.sport_type);
      setTeamScores(scores);
    }
  };

  // Adjust player stat
  const adjustPlayerStat = (playerIndex, statName, increment) => {
    const newStats = [...playerStats];
    const currentValue = newStats[playerIndex][statName][currentQuarter] || 0;
    const newValue = Math.max(0, currentValue + (increment ? 1 : -1));
    newStats[playerIndex][statName][currentQuarter] = newValue;
    setPlayerStats(newStats);

    // Recalculate team scores
    if ((statName === "points" || statName === "kills") && selectedGame) {
      const scores = calculateTeamScores(newStats, selectedGame.team1_id, selectedGame.team2_id, selectedGame.sport_type);
      setTeamScores(scores);
    }
  };

  // Save statistics - UPDATED: Handle bracket reset notifications
  const saveStatistics = async () => {
    if (!selectedGame) return;
    setLoading(true);
    try {
      // First, save the player statistics
      const statsRes = await fetch(
        `http://localhost:5000/api/stats/matches/${selectedGame.id}/stats`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            team1_id: selectedGame.team1_id,
            team2_id: selectedGame.team2_id,
            players: playerStats.map((p) => ({
              player_id: p.player_id,
              team_id: p.team_id,
              // Basketball stats
              points: p.points ? p.points.reduce((a, b) => a + b, 0) : 0,
              assists: p.assists ? p.assists.reduce((a, b) => a + b, 0) : 0,
              rebounds: p.rebounds ? p.rebounds.reduce((a, b) => a + b, 0) : 0,
              three_points_made: p.three_points_made
                ? p.three_points_made.reduce((a, b) => a + b, 0)
                : 0,
              steals: p.steals ? p.steals.reduce((a, b) => a + b, 0) : 0,
              blocks: p.blocks ? p.blocks.reduce((a, b) => a + b, 0) : 0,
              fouls: p.fouls ? p.fouls.reduce((a, b) => a + b, 0) : 0,
              turnovers: p.turnovers
                ? p.turnovers.reduce((a, b) => a + b, 0)
                : 0,
              // Volleyball stats
              kills: p.kills ? p.kills.reduce((a, b) => a + b, 0) : 0,
              attack_attempts: p.attack_attempts
                ? p.attack_attempts.reduce((a, b) => a + b, 0)
                : 0,
              attack_errors: p.attack_errors
                ? p.attack_errors.reduce((a, b) => a + b, 0)
                : 0,
              serves: p.serves ? p.serves.reduce((a, b) => a + b, 0) : 0,
              service_aces: p.service_aces
                ? p.service_aces.reduce((a, b) => a + b, 0)
                : 0,
              serve_errors: p.serve_errors
                ? p.serve_errors.reduce((a, b) => a + b, 0)
                : 0,
              receptions: p.receptions
                ? p.receptions.reduce((a, b) => a + b, 0)
                : 0,
              reception_errors: p.reception_errors
                ? p.reception_errors.reduce((a, b) => a + b, 0)
                : 0,
              digs: p.digs ? p.digs.reduce((a, b) => a + b, 0) : 0,
              volleyball_assists: p.volleyball_assists
                ? p.volleyball_assists.reduce((a, b) => a + b, 0)
                : 0,
            })),
          }),
        }
      );
      
      if (!statsRes.ok) {
        throw new Error(`Failed to save stats: ${statsRes.status}`);
      }

      // Calculate winner based on team scores
      const team1TotalScore = teamScores.team1.reduce((a, b) => a + b, 0);
      const team2TotalScore = teamScores.team2.reduce((a, b) => a + b, 0);
      
      let winner_id;
      if (team1TotalScore > team2TotalScore) {
        winner_id = selectedGame.team1_id;
      } else if (team2TotalScore > team1TotalScore) {
        winner_id = selectedGame.team2_id;
      } else {
        alert("The game is tied! Please enter different scores or handle the tie appropriately.");
        setLoading(false);
        return;
      }

      // Complete the match using brackets API for proper bracket progression
      const bracketRes = await fetch(
        `http://localhost:5000/api/brackets/matches/${selectedGame.id}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            winner_id: winner_id,
            scores: {
              team1: team1TotalScore,
              team2: team2TotalScore
            }
          }),
        }
      );
      
      if (!bracketRes.ok) {
        throw new Error(`Failed to complete match: ${bracketRes.status}`);
      }
      
      const bracketData = await bracketRes.json();
      
      // Show success message with advancement info and bracket reset handling
      let message = "Statistics saved successfully!";
      
      if (bracketData.bracketReset) {
        message = "🚨 BRACKET RESET! 🚨\n\n";
        message += "The Loser's Bracket winner has defeated the Winner's Bracket winner in the Grand Final!\n";
        message += "A second Grand Final match has been scheduled where both teams start fresh.\n";
        message += "The Winner's Bracket team needs to be beaten TWICE to lose the tournament.\n\n";
        message += "Refresh the games list to see the new Reset Final match!";
      } else if (bracketData.advanced) {
        if (selectedGame.elimination_type === 'double') {
          if (selectedGame.bracket_type === 'winner') {
            message += " Winner has been advanced in the winner's bracket!";
            if (bracketData.loserAdvanced) {
              message += " Loser has been moved to the loser's bracket.";
            }
          } else if (selectedGame.bracket_type === 'loser') {
            message += " Winner has been advanced in the loser's bracket!";
            message += " Loser has been eliminated from the tournament.";
          } else if (selectedGame.bracket_type === 'championship') {
            if (selectedGame.round_number === 201) {
              message += " Reset Final completed! Tournament champion determined!";
            } else {
              message += " Grand Final completed!";
            }
          }
        } else {
          message += " Winner has been advanced to the next round!";
        }
      }
      
      if (bracketData.winnerId && bracketData.tournamentComplete) {
        const winnerTeam = bracketData.winnerId === selectedGame.team1_id ? 
          selectedGame.team1_name : selectedGame.team2_name;
        message += ` Tournament Champion: ${winnerTeam}! 🏆`;
      }
      
      // Use different alert types based on bracket reset
      if (bracketData.bracketReset) {
        // Custom styling for bracket reset notification
        const resetNotification = document.createElement('div');
        resetNotification.innerHTML = `
          <div style="
            position: fixed; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 500px;
            text-align: center;
            font-family: Arial, sans-serif;
          ">
            <h2 style="margin: 0 0 15px 0; font-size: 24px;">🚨 BRACKET RESET! 🚨</h2>
            <p style="margin: 0 0 15px 0; line-height: 1.6;">
              The Loser's Bracket winner has defeated the Winner's Bracket winner!<br>
              A Reset Final has been scheduled - both teams start fresh!
            </p>
            <button onclick="this.parentElement.parentElement.remove()" style="
              background: white;
              color: #ff6b35;
              border: none;
              padding: 10px 20px;
              border-radius: 25px;
              font-weight: bold;
              cursor: pointer;
            ">Got it!</button>
          </div>
        `;
        document.body.appendChild(resetNotification);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
          if (resetNotification.parentElement) {
            resetNotification.remove();
          }
        }, 10000);
      } else {
        alert(message);
      }
      
      // Refresh the games list to show updated match status (and potential reset match)
      if (selectedEvent && selectedBracket) {
        handleBracketSelect(selectedBracket);
      }
      
    } catch (err) {
      console.error("Save stats error:", err);
      alert("Failed to save stats: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset stats
  const resetStatistics = () => {
    if (window.confirm("Are you sure you want to reset all statistics?")) {
      initializePlayerStats(selectedGame);
      const initialScores =
        selectedGame.sport_type === "basketball"
          ? { team1: [0, 0, 0, 0], team2: [0, 0, 0, 0] }
          : { team1: [0, 0, 0, 0, 0], team2: [0, 0, 0, 0, 0] };
      setTeamScores(initialScores);
      setCurrentQuarter(0);
    }
  };

  // Change quarter/set
  const changePeriod = (direction) => {
    const maxPeriod = selectedGame.sport_type === "basketball" ? 3 : 4;
    if (direction === "next" && currentQuarter < maxPeriod) {
      setCurrentQuarter(currentQuarter + 1);
    } else if (direction === "prev" && currentQuarter > 0) {
      setCurrentQuarter(currentQuarter - 1);
    }
  };

  // Render player table with stats
  const renderPlayerTable = (teamId, teamName) => {
    const teamPlayers = getSortedTeamPlayers(teamId);
    const isBasketball = selectedGame.sport_type === "basketball";
    const maxStarters = getMaxStartingPlayers(selectedGame.sport_type);
    const guideMessage = `✓ Check/uncheck to set starting lineup (max ${maxStarters} - ${maxStarters === 6 ? 'volleyball has 6 players on court' : 'basketball has 5 players on court'})`;

    return (
      <div className="team-table-container">
        <div className="team-table-header">
          <h3>{teamName}</h3>
          <div className="starting-guide">
            <span>{guideMessage}</span>
          </div>
        </div>
        
        <div className="stats-table-wrapper">
          <table className="stats-table">
            <thead>
              <tr>
                <th className="checkbox-col">Start</th>
                <th className="name-col">Player</th>
                <th className="jersey-col">#</th>
                <th className="status-col">Status</th>
                {isBasketball ? (
                  <>
                    <th className="stat-col">PTS</th>
                    <th className="stat-col">AST</th>
                    <th className="stat-col">REB</th>
                    <th className="stat-col">3PM</th>
                    <th className="stat-col">STL</th>
                    <th className="stat-col">BLK</th>
                    <th className="stat-col">Fouls</th>
                    <th className="stat-col">TO</th>
                  </>
                ) : (
                  <>
                    <th className="stat-col">Kills</th>
                    <th className="stat-col">Ast</th>
                    <th className="stat-col">Digs</th>
                    <th className="stat-col">Ace</th>
                    <th className="stat-col">Serve Err</th>
                    <th className="stat-col">Att Err</th>
                    <th className="stat-col">Rec Err</th>
                    <th className="stat-col">Hit%</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {teamPlayers.map((player) => {
                const globalIndex = playerStats.findIndex(p => p.player_id === player.player_id);
                const teamKey = teamId === selectedGame.team1_id ? 'team1' : 'team2';
                const isStarter = startingPlayers[teamKey].includes(player.player_id);
                
                return (
                  <tr key={player.player_id} className={player.isOnCourt ? 'on-court' : 'on-bench'}>
                    <td className="checkbox-col">
                      <input
                        type="checkbox"
                        checked={isStarter}
                        onChange={() => handleStartingPlayerToggle(player.player_id, teamId)}
                      />
                    </td>
                    <td className="name-col">
                      <div className="player-name-info">
                        <span className="player-name">{player.player_name}</span>
                        {isPlayerFouledOut(player) && (
                          <span className="fouled-out-indicator-small">FO</span>
                        )}
                      </div>
                    </td>
                    <td className="jersey-col">#{player.jersey_number}</td>
                    <td className="status-col">
                      <span className={`status-badge ${player.isOnCourt ? 'on-court-badge' : 'on-bench-badge'}`}>
                        {player.isOnCourt ? 'On Court' : 'On Bench'}
                      </span>
                    </td>
                    
                    {isBasketball ? (
                      <>
                        <td className="stat-col">
                          <div className="stat-controls-compact">
                            <button onClick={() => adjustPlayerStat(globalIndex, "points", false)}>
                              <FaMinus />
                            </button>
                            <span className="stat-value">{player.points[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "points", true)}>
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td className="stat-col">
                          <div className="stat-controls-compact">
                            <button onClick={() => adjustPlayerStat(globalIndex, "assists", false)}>
                              <FaMinus />
                            </button>
                            <span className="stat-value">{player.assists[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "assists", true)}>
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td className="stat-col">
                          <div className="stat-controls-compact">
                            <button onClick={() => adjustPlayerStat(globalIndex, "rebounds", false)}>
                              <FaMinus />
                            </button>
                            <span className="stat-value">{player.rebounds[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "rebounds", true)}>
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td className="stat-col">
                          <div className="stat-controls-compact">
                            <button onClick={() => adjustPlayerStat(globalIndex, "three_points_made", false)}>
                              <FaMinus />
                            </button>
                            <span className="stat-value">{player.three_points_made[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "three_points_made", true)}>
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td className="stat-col">
                          <div className="stat-controls-compact">
                            <button onClick={() => adjustPlayerStat(globalIndex, "steals", false)}>
                              <FaMinus />
                            </button>
                            <span className="stat-value">{player.steals[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "steals", true)}>
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td className="stat-col">
                          <div className="stat-controls-compact">
                            <button onClick={() => adjustPlayerStat(globalIndex, "blocks", false)}>
                              <FaMinus />
                            </button>
                            <span className="stat-value">{player.blocks[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "blocks", true)}>
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td className="stat-col">
                          <div className="stat-controls-compact">
                            <button onClick={() => adjustPlayerStat(globalIndex, "fouls", false)}>
                              <FaMinus />
                            </button>
                            <span className="stat-value">{player.fouls[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "fouls", true)}>
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td className="stat-col">
                          <div className="stat-controls-compact">
                            <button onClick={() => adjustPlayerStat(globalIndex, "turnovers", false)}>
                              <FaMinus />
                            </button>
                            <span className="stat-value">{player.turnovers[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "turnovers", true)}>
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="stat-col">
                          <div className="stat-controls-compact">
                            <button onClick={() => adjustPlayerStat(globalIndex, "kills", false)}>
                              <FaMinus />
                            </button>
                            <span className="stat-value">{player.kills[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "kills", true)}>
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td className="stat-col">
                          <div className="stat-controls-compact">
                            <button onClick={() => adjustPlayerStat(globalIndex, "volleyball_assists", false)}>
                              <FaMinus />
                            </button>
                            <span className="stat-value">{player.volleyball_assists[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "volleyball_assists", true)}>
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td className="stat-col">
                          <div className="stat-controls-compact">
                            <button onClick={() => adjustPlayerStat(globalIndex, "digs", false)}>
                              <FaMinus />
                            </button>
                            <span className="stat-value">{player.digs[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "digs", true)}>
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td className="stat-col">
                          <div className="stat-controls-compact">
                            <button onClick={() => adjustPlayerStat(globalIndex, "service_aces", false)}>
                              <FaMinus />
                            </button>
                            <span className="stat-value">{player.service_aces[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "service_aces", true)}>
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td className="stat-col">
                          <div className="stat-controls-compact">
                            <button onClick={() => adjustPlayerStat(globalIndex, "serve_errors", false)}>
                              <FaMinus />
                            </button>
                            <span className="stat-value">{player.serve_errors[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "serve_errors", true)}>
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td className="stat-col">
                          <div className="stat-controls-compact">
                            <button onClick={() => adjustPlayerStat(globalIndex, "attack_errors", false)}>
                              <FaMinus />
                            </button>
                            <span className="stat-value">{player.attack_errors[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "attack_errors", true)}>
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td className="stat-col">
                          <div className="stat-controls-compact">
                            <button onClick={() => adjustPlayerStat(globalIndex, "reception_errors", false)}>
                              <FaMinus />
                            </button>
                            <span className="stat-value">{player.reception_errors[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "reception_errors", true)}>
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td className="stat-col">
                          <span className="percentage-value">
                            {calculateHittingPercentage(player)}
                          </span>
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

  // Render substitution modal
  const renderSubstitutionModal = () => {
    if (!showSubstitutionModal || !substitutionData.team) return null;

    const teamPlayers = playerStats.filter(p => p.team_id === substitutionData.team);
    const courtPlayers = teamPlayers.filter(p => p.isOnCourt);
    const benchPlayers = teamPlayers.filter(p => !p.isOnCourt && p.isStarting);

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>Make Substitution</h3>
          
          <div className="substitution-form">
            <div className="form-group">
              <label>Player Out (On Court):</label>
              <select 
                value={substitutionData.playerOut || ''}
                onChange={(e) => setSubstitutionData(prev => ({ ...prev, playerOut: parseInt(e.target.value) }))}
              >
                <option value="">Select player to sub out</option>
                {courtPlayers.map(player => (
                  <option key={player.player_id} value={player.player_id}>
                    #{player.jersey_number} {player.player_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Player In (On Bench):</label>
              <select 
                value={substitutionData.playerIn || ''}
                onChange={(e) => setSubstitutionData(prev => ({ ...prev, playerIn: parseInt(e.target.value) }))}
              >
                <option value="">Select player to sub in</option>
                {benchPlayers.map(player => (
                  <option key={player.player_id} value={player.player_id}>
                    #{player.jersey_number} {player.player_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="modal-actions">
            <button 
              className="bracket-cancel-btn"
              onClick={() => setShowSubstitutionModal(false)}
            >
              Cancel
            </button>
            <button 
              className="bracket-submit-btn"
              onClick={() => handleSubstitution(
                substitutionData.team, 
                substitutionData.playerOut, 
                substitutionData.playerIn
              )}
              disabled={!substitutionData.playerOut || !substitutionData.playerIn}
            >
              Confirm Substitution
            </button>
          </div>
        </div>
      </div>
    );
  };

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  return (
    <div className="admin-dashboard">
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-header">
          <h1>Staff Statistics</h1>
          <p>Record player statistics for matches</p>
        </div>

        <div className="dashboard-main">
          <div className="bracket-content">
            {/* Tabs */}
            <div className="bracket-tabs">
              <button
                className={`bracket-tab-button ${activeTab === "select" ? "bracket-tab-active" : ""}`}
                onClick={() => setActiveTab("select")}
              >
                Select Event
              </button>
              {selectedEvent && (
                <button
                  className={`bracket-tab-button ${activeTab === "bracket-selection" ? "bracket-tab-active" : ""}`}
                  onClick={() => setActiveTab("bracket-selection")}
                >
                  Select Bracket
                </button>
              )}
              {selectedEvent && selectedBracket && (
                <button
                  className={`bracket-tab-button ${activeTab === "games" ? "bracket-tab-active" : ""}`}
                  onClick={() => setActiveTab("games")}
                >
                  Manage Games ({games.length})
                </button>
              )}
              {selectedGame && (
                <button
                  className={`bracket-tab-button ${activeTab === "statistics" ? "bracket-tab-active" : ""}`}
                  onClick={() => setActiveTab("statistics")}
                >
                  Record Statistics
                </button>
              )}
            </div>

            {/* Select Event */}
            {activeTab === "select" && (
              <div className="bracket-view-section">
                <h2>All Events</h2>
                {loading ? (
                  <p>Loading events...</p>
                ) : error ? (
                  <p className="bracket-error">Error: {error}</p>
                ) : events.length === 0 ? (
                  <div className="bracket-no-brackets">
                    <p>No events available.</p>
                  </div>
                ) : (
                  <div className="bracket-grid">
                    {events.map((event) => (
                      <div className="bracket-card" key={event.id}>
                        <div className="bracket-card-header">
                          <h3>{event.name}</h3>
                          <span className={`bracket-sport-badge ${event.status === "ongoing" ? "bracket-sport-basketball" : "bracket-sport-volleyball"}`}>
                            {event.status}
                          </span>
                        </div>
                        <div className="bracket-card-info">
                          <div><strong>Start:</strong> {new Date(event.start_date).toLocaleDateString()}</div>
                          <div><strong>End:</strong> {new Date(event.end_date).toLocaleDateString()}</div>
                          <div><strong>Status:</strong> 
                            <span className={event.status === "ongoing" ? "status-ongoing" : "status-completed"}>
                              {event.status}
                            </span>
                          </div>
                        </div>
                        <div className="bracket-card-actions">
                          <button className="bracket-view-btn" onClick={() => handleEventSelect(event)}>
                            Manage Games
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Select Bracket */}
            {activeTab === "bracket-selection" && selectedEvent && (
              <div className="bracket-view-section">
                <div className="event-details-header">
                  <h2>Select Bracket for {selectedEvent.name}</h2>
                  <div className="event-details-info">
                    <span><strong>Start:</strong> {new Date(selectedEvent.start_date).toLocaleDateString()}</span>
                    <span><strong>End:</strong> {new Date(selectedEvent.end_date).toLocaleDateString()}</span>
                    <span><strong>Status:</strong> {selectedEvent.status}</span>
                  </div>
                </div>
                
                {error && (
                  <div className="bracket-error">
                    {error}
                  </div>
                )}
                
                {loading ? (
                  <p>Loading brackets...</p>
                ) : brackets.length === 0 ? (
                  <div className="bracket-no-brackets">
                    <p>No brackets found for this event.</p>
                    <p>Create brackets first in the Brackets Management page.</p>
                  </div>
                ) : (
                  <div className="bracket-grid">
                    {brackets.map((bracket) => (
                      <div className="bracket-card" key={bracket.id}>
                        <div className="bracket-card-header">
                          <h3>{bracket.name}</h3>
                          <span className={`bracket-sport-badge bracket-sport-${bracket.sport_type}`}>
                            {bracket.sport_type}
                          </span>
                        </div>
                        <div className="bracket-card-info">
                          <div><strong>Sport:</strong> {bracket.sport_type}</div>
                          <div><strong>Type:</strong> 
                            <span className={`elimination-type-${bracket.elimination_type}`}>
                              {bracket.elimination_type === 'double' ? 'Double Elimination' : 'Single Elimination'}
                            </span>
                          </div>
                          <div><strong>Teams:</strong> {bracket.team_count || 0}</div>
                          <div><strong>Created:</strong> {new Date(bracket.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="bracket-card-actions">
                          <button 
                            className="bracket-view-btn" 
                            onClick={() => handleBracketSelect(bracket)}
                          >
                            Manage Games
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Manage Games */}
            {activeTab === "games" && selectedEvent && selectedBracket && (
              <div className="bracket-view-section">
                <div className="event-details-header">
                  <h2>
                    Games for {selectedEvent.name} - {selectedBracket.name} ({selectedBracket.sport_type})
                  </h2>
                  <div className="event-details-info">
                    <span><strong>Start:</strong> {new Date(selectedEvent.start_date).toLocaleDateString()}</span>
                    <span><strong>End:</strong> {new Date(selectedEvent.end_date).toLocaleDateString()}</span>
                    <span><strong>Status:</strong> {selectedEvent.status}</span>
                    <span><strong>Bracket Type:</strong> 
                      <span className={`elimination-type-${selectedBracket.elimination_type}`}>
                        {selectedBracket.elimination_type === 'double' ? 'Double Elimination' : 'Single Elimination'}
                      </span>
                    </span>
                  </div>
                </div>
                
                {error && (
                  <div className="bracket-error">
                    {error}
                  </div>
                )}
                
                {loading ? (
                  <p>Loading games...</p>
                ) : games.length === 0 ? (
                  <div className="bracket-no-brackets">
                    <p>No games found for this bracket.</p>
                    <p>Make sure brackets have been created and matches have been generated.</p>
                  </div>
                ) : (
                  <div className="rounds-container">
                    {sortRounds(groupGamesByRound(games)).map(([roundName, brackets]) => {
                      const roundNumber = roundName === "Championship" ? 999 : 
                        roundName.startsWith("LB Round") ? 
                        parseInt(roundName.split(' ')[2]) + 100 : 
                        parseInt(roundName.split(' ')[1]);
                      const isExpanded = expandedRounds.has(roundNumber) || roundName === "Championship";
                      const roundGames = Object.values(brackets).flat();
                      const completedGames = roundGames.filter(g => g.status === 'completed').length;
                      const totalGames = roundGames.length;
                      
                      // Check if this round has a champion (for both single and double elimination)
                      const championGame = roundGames.find(game => 
                        game.status === 'completed' && game.winner_id && roundName === 'Championship'
                      );
                      
                      // Check if championship has reset final
                      const hasResetFinal = roundName === 'Championship' && 
                        roundGames.some(game => game.round_number === 201 && game.status !== 'hidden');
                      
                      return (
                        <div key={roundName} className="round-section">
                          <div 
                            className={`round-header ${roundName === 'Championship' ? 'championship-header' : ''} ${hasResetFinal ? 'has-reset' : ''}`}
                            onClick={() => toggleRoundExpansion(roundNumber)}
                          >
                            <div className="round-header-content">
                              <h3>
                                {roundName === 'Championship' ? (
                                  <>
                                    <FaTrophy className="trophy-icon" /> 
                                    {roundName}
                                    {hasResetFinal && <span className="reset-final-info">Reset Final Active</span>}
                                  </>
                                ) : roundName}
                              </h3>
                              <div className="round-info">
                                <span className="round-progress">
                                  {completedGames}/{totalGames} matches completed
                                  {championGame && (
                                    <span className="champion-info">
                                      🏆 Champion: {championGame.winner_name}
                                    </span>
                                  )}
                                </span>
                                <div className="round-progress-bar">
                                  <div 
                                    className={`round-progress-fill ${hasResetFinal ? 'reset-active' : ''}`}
                                    style={{ width: `${totalGames > 0 ? (completedGames / totalGames) * 100 : 0}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            <button className="round-toggle-btn">
                              {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                            </button>
                          </div>
                          
                          {isExpanded && (
                            <div className="round-content">
                              {Object.entries(brackets).map(([bracketName, bracketGames]) => (
                                <div key={bracketName} className="bracket-section">
                                  <h4 className="bracket-section-title">{bracketName}</h4>
                                  <div className="bracket-grid">
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
              </div>
            )}

            {/* Record Statistics */}
            {activeTab === "statistics" && selectedGame && (
              <div className="bracket-view-section">
                <div className="event-details-header">
                  <h2>
                    Recording Statistics: {selectedGame.team1_name} vs {selectedGame.team2_name}
                    {selectedGame.round_number === 201 && <span className="reset-final-badge">RESET FINAL</span>}
                  </h2>
                  <div className="event-details-info">
                    <span><strong>Sport:</strong> {selectedGame.sport_type}</span>
                    <span><strong>Bracket:</strong> {selectedGame.bracket_name}</span>
                    <span><strong>Round:</strong> {selectedGame.round_number}</span>
                    {selectedGame.elimination_type === 'double' && (
                      <span><strong>Bracket Type:</strong> 
                        <span className={`bracket-type-${selectedGame.bracket_type || 'winner'} ${selectedGame.round_number === 201 ? 'bracket-type-reset' : ''}`}>
                          {selectedGame.round_number === 201 ? 'Reset Final' : 
                           selectedGame.bracket_type ? selectedGame.bracket_type.charAt(0).toUpperCase() + selectedGame.bracket_type.slice(1) : 'Winner'} 
                          {selectedGame.round_number !== 201 && ' Bracket'}
                        </span>
                      </span>
                    )}
                    {selectedGame.round_number === 201 && (
                      <span className="reset-special-info">🚨 Reset Final - Winner takes all!</span>
                    )}
                  </div>
                </div>

                {/* Period Navigation */}
                <div className="period-navigation">
                  <button
                    onClick={() => changePeriod("prev")}
                    disabled={currentQuarter === 0}
                    className="bracket-cancel-btn"
                  >
                    <FaArrowLeft />
                  </button>
                  <div className="period-display">
                    {selectedGame.sport_type === "basketball"
                      ? `Quarter ${currentQuarter + 1}`
                      : `Set ${currentQuarter + 1}`}
                  </div>
                  <button
                    onClick={() => changePeriod("next")}
                    disabled={
                      currentQuarter ===
                      (selectedGame.sport_type === "basketball" ? 3 : 4)
                    }
                    className="bracket-submit-btn"
                  >
                    <FaArrowRight />
                  </button>
                </div>

                {/* Team Scores */}
                <div className="team-scores-container">
                  <div className="team-score">
                    <h3>{selectedGame.team1_name}</h3>
                    <div className="score-display">
                      {teamScores.team1[currentQuarter]}
                    </div>
                    <div className="period-total">
                      Total: {teamScores.team1.reduce((a, b) => a + b, 0)}
                    </div>
                  </div>
                  <div className="score-separator">-</div>
                  <div className="team-score">
                    <h3>{selectedGame.team2_name}</h3>
                    <div className="score-display">
                      {teamScores.team2[currentQuarter]}
                    </div>
                    <div className="period-total">
                      Total: {teamScores.team2.reduce((a, b) => a + b, 0)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="bracket-form-actions">
                  <button className="bracket-cancel-btn" onClick={() => setActiveTab("games")}>
                    Back to Games
                  </button>
                  <div className="stats-action-buttons">
                    <button className="bracket-delete-btn" onClick={resetStatistics}>
                      <FaRedo /> Reset All
                    </button>
                    <button
                      className="bracket-submit-btn"
                      onClick={saveStatistics}
                      disabled={loading}
                    >
                      {loading ? "Saving..." : <><FaSave /> Save Statistics</>}
                    </button>
                  </div>
                </div>

                {/* Player Stats Tables */}
                {loading ? (
                  <p>Loading player data...</p>
                ) : (
                  <div className="teams-stats-tables">
                    {renderPlayerTable(selectedGame.team1_id, selectedGame.team1_name)}
                    {renderPlayerTable(selectedGame.team2_id, selectedGame.team2_name)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Substitution Modal */}
      {renderSubstitutionModal()}
    </div>
  );
};

export default StaffStats;