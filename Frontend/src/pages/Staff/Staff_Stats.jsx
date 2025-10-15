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
  FaEyeSlash
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
  const [currentQuarter, setCurrentQuarter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRounds, setExpandedRounds] = useState(new Set([1]));
  const [startingPlayers, setStartingPlayers] = useState({
    team1: [],
    team2: []
  });
  const [activeTeamView, setActiveTeamView] = useState('both');
  const [showBenchPlayers, setShowBenchPlayers] = useState({
    team1: false,
    team2: false
  });

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

  // Function to handle team view shifting
  const shiftTeamView = () => {
    if (activeTeamView === 'both') {
      setActiveTeamView('team1');
    } else if (activeTeamView === 'team1') {
      setActiveTeamView('team2');
    } else {
      setActiveTeamView('both');
    }
  };

  const getMaxStartingPlayers = (sportType) => {
    return sportType === "volleyball" ? 6 : 5;
  };

  const initializeStartingPlayers = (stats, team1Id, team2Id, sportType) => {
    const maxStarters = getMaxStartingPlayers(sportType);
    const team1Players = stats.filter(p => p.team_id === team1Id).slice(0, maxStarters);
    const team2Players = stats.filter(p => p.team_id === team2Id).slice(0, maxStarters);
    
    setStartingPlayers({
      team1: team1Players.map(p => p.player_id),
      team2: team2Players.map(p => p.player_id)
    });

    const updatedStats = stats.map(player => ({
      ...player,
      isStarting: team1Players.some(p => p.player_id === player.player_id) || 
                 team2Players.some(p => p.player_id === player.player_id),
      isOnCourt: team1Players.some(p => p.player_id === player.player_id) || 
                 team2Players.some(p => p.player_id === player.player_id)
    }));

    setPlayerStats(updatedStats);
  };

  const handleStartingPlayerToggle = (playerId, teamId) => {
    const sportType = selectedGame?.sport_type;
    const maxStarters = getMaxStartingPlayers(sportType);
    const teamKey = teamId === selectedGame.team1_id ? 'team1' : 'team2';
    const currentStarters = [...startingPlayers[teamKey]];
    
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
    return totalFouls >= 5;
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

  const calculateTeamScores = (stats, team1Id, team2Id, sportType) => {
    const team1Scores = sportType === "basketball" ? [0, 0, 0, 0] : [0, 0, 0, 0, 0];
    const team2Scores = sportType === "basketball" ? [0, 0, 0, 0] : [0, 0, 0, 0, 0];

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
    setCurrentQuarter(0);
    setExpandedRounds(new Set([1]));
    setActiveTeamView('both');
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

      const scores = calculateTeamScores(initialStats, game.team1_id, game.team2_id, game.sport_type);
      setTeamScores(scores);

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
          const loadedScores = calculateTeamScores(merged, game.team1_id, game.team2_id, game.sport_type);
          setTeamScores(loadedScores);
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
    setActiveTeamView('both');
    setShowBenchPlayers({ team1: false, team2: false });
    
    const initialScores = game.sport_type === "basketball"
      ? { team1: [0, 0, 0, 0], team2: [0, 0, 0, 0] }
      : { team1: [0, 0, 0, 0, 0], team2: [0, 0, 0, 0, 0] };
    
    setTeamScores(initialScores);
    setCurrentQuarter(0);

    await initializePlayerStats(game);
    setLoading(false);
  };

  const adjustPlayerStat = (playerIndex, statName, increment) => {
    const newStats = [...playerStats];
    const currentValue = newStats[playerIndex][statName][currentQuarter] || 0;
    const newValue = Math.max(0, currentValue + (increment ? 1 : -1));
    newStats[playerIndex][statName][currentQuarter] = newValue;
    setPlayerStats(newStats);

    if ((statName === "points" || statName === "kills") && selectedGame) {
      const scores = calculateTeamScores(newStats, selectedGame.team1_id, selectedGame.team2_id, selectedGame.sport_type);
      setTeamScores(scores);
    }
  };

  const saveStatistics = async () => {
    if (!selectedGame) return;
    setLoading(true);
    try {
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
              points: p.points ? p.points.reduce((a, b) => a + b, 0) : 0,
              assists: p.assists ? p.assists.reduce((a, b) => a + b, 0) : 0,
              rebounds: p.rebounds ? p.rebounds.reduce((a, b) => a + b, 0) : 0,
              three_points_made: p.three_points_made ? p.three_points_made.reduce((a, b) => a + b, 0) : 0,
              steals: p.steals ? p.steals.reduce((a, b) => a + b, 0) : 0,
              blocks: p.blocks ? p.blocks.reduce((a, b) => a + b, 0) : 0,
              fouls: p.fouls ? p.fouls.reduce((a, b) => a + b, 0) : 0,
              turnovers: p.turnovers ? p.turnovers.reduce((a, b) => a + b, 0) : 0,
              kills: p.kills ? p.kills.reduce((a, b) => a + b, 0) : 0,
              attack_attempts: p.attack_attempts ? p.attack_attempts.reduce((a, b) => a + b, 0) : 0,
              attack_errors: p.attack_errors ? p.attack_errors.reduce((a, b) => a + b, 0) : 0,
              serves: p.serves ? p.serves.reduce((a, b) => a + b, 0) : 0,
              service_aces: p.service_aces ? p.service_aces.reduce((a, b) => a + b, 0) : 0,
              serve_errors: p.serve_errors ? p.serve_errors.reduce((a, b) => a + b, 0) : 0,
              receptions: p.receptions ? p.receptions.reduce((a, b) => a + b, 0) : 0,
              reception_errors: p.reception_errors ? p.reception_errors.reduce((a, b) => a + b, 0) : 0,
              digs: p.digs ? p.digs.reduce((a, b) => a + b, 0) : 0,
              volleyball_assists: p.volleyball_assists ? p.volleyball_assists.reduce((a, b) => a + b, 0) : 0,
            })),
          }),
        }
      );
      
      if (!statsRes.ok) {
        throw new Error(`Failed to save stats: ${statsRes.status}`);
      }

      const team1TotalScore = teamScores.team1.reduce((a, b) => a + b, 0);
      const team2TotalScore = teamScores.team2.reduce((a, b) => a + b, 0);
      
      let winner_id;
      if (team1TotalScore > team2TotalScore) {
        winner_id = selectedGame.team1_id;
      } else if (team2TotalScore > team1TotalScore) {
        winner_id = selectedGame.team2_id;
      } else {
        alert("The game is tied! Please enter different scores.");
        setLoading(false);
        return;
      }

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
      
      let message = "Statistics saved successfully!";
      
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
      
      if (selectedEvent && selectedBracket) {
        handleBracketSelect(selectedBracket);
      }
      
      setSelectedGame(null);
      
    } catch (err) {
      alert("Failed to save stats: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetStatistics = () => {
    if (window.confirm("Are you sure you want to reset all statistics?")) {
      initializePlayerStats(selectedGame);
      const initialScores = selectedGame.sport_type === "basketball"
        ? { team1: [0, 0, 0, 0], team2: [0, 0, 0, 0] }
        : { team1: [0, 0, 0, 0, 0], team2: [0, 0, 0, 0, 0] };
      setTeamScores(initialScores);
      setCurrentQuarter(0);
    }
  };

  const changePeriod = (direction) => {
    const maxPeriod = selectedGame.sport_type === "basketball" ? 3 : 4;
    if (direction === "next" && currentQuarter < maxPeriod) {
      setCurrentQuarter(currentQuarter + 1);
    } else if (direction === "prev" && currentQuarter > 0) {
      setCurrentQuarter(currentQuarter - 1);
    }
  };

  const renderPlayerTable = (teamId, teamName) => {
    const teamPlayers = getSortedTeamPlayers(teamId);
    const isBasketball = selectedGame.sport_type === "basketball";
    const maxStarters = getMaxStartingPlayers(selectedGame.sport_type);
    
    // Separate starters and bench players
    const starters = teamPlayers.filter(player => player.isOnCourt);
    const benchPlayers = teamPlayers.filter(player => !player.isOnCourt);
    
    const teamKey = teamId === selectedGame.team1_id ? 'team1' : 'team2';
    const isBenchVisible = showBenchPlayers[teamKey];

    return (
      <div className="stats-team-table">
        <div className="stats-team-header">
          <div className="stats-team-title-section">
            <h3>{teamName}</h3>
            <span className="stats-team-hint">
              Max {maxStarters} starters - Click checkbox to set lineup
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
                <th>Start</th>
                <th style={{ textAlign: 'left' }}>Player</th>
                <th>#</th>
                <th>Status</th>
                {isBasketball ? (
                  <>
                    <th>PTS</th>
                    <th>AST</th>
                    <th>REB</th>
                    <th>3PM</th>
                    <th>STL</th>
                    <th>BLK</th>
                    <th>Fouls</th>
                    <th>TO</th>
                  </>
                ) : (
                  <>
                    <th>Kills</th>
                    <th>Ast</th>
                    <th>Digs</th>
                    <th>Ace</th>
                    <th>S.Err</th>
                    <th>A.Err</th>
                    <th>R.Err</th>
                    <th>Hit%</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {/* Starters - Always visible */}
              {starters.map((player) => {
                const globalIndex = playerStats.findIndex(p => p.player_id === player.player_id);
                const isStarter = startingPlayers[teamKey].includes(player.player_id);
                
                return (
                  <tr key={player.player_id} className={player.isOnCourt ? 'on-court' : ''}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isStarter}
                        onChange={() => handleStartingPlayerToggle(player.player_id, teamId)}
                      />
                    </td>
                    <td style={{ textAlign: 'left' }}>
                      {player.player_name}
                      {isPlayerFouledOut(player) && (
                        <span className="stats-fouled-out">FO</span>
                      )}
                    </td>
                    <td>#{player.jersey_number}</td>
                    <td>
                      <span className={`stats-player-status ${player.isOnCourt ? 'on-court' : 'on-bench'}`}>
                        {player.isOnCourt ? 'On Court' : 'Bench'}
                      </span>
                    </td>
                    
                    {isBasketball ? (
                      <>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "points", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.points[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "points", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "assists", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.assists[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "assists", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "rebounds", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.rebounds[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "rebounds", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "three_points_made", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.three_points_made[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "three_points_made", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "steals", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.steals[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "steals", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "blocks", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.blocks[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "blocks", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "fouls", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.fouls[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "fouls", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "turnovers", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.turnovers[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "turnovers", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "kills", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.kills[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "kills", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "volleyball_assists", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.volleyball_assists[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "volleyball_assists", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "digs", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.digs[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "digs", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "service_aces", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.service_aces[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "service_aces", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "serve_errors", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.serve_errors[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "serve_errors", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "attack_errors", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.attack_errors[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "attack_errors", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "reception_errors", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.reception_errors[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "reception_errors", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
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
                
                return (
                  <tr key={player.player_id} className="bench-player">
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isStarter}
                        onChange={() => handleStartingPlayerToggle(player.player_id, teamId)}
                      />
                    </td>
                    <td style={{ textAlign: 'left' }}>
                      {player.player_name}
                      {isPlayerFouledOut(player) && (
                        <span className="stats-fouled-out">FO</span>
                      )}
                    </td>
                    <td>#{player.jersey_number}</td>
                    <td>
                      <span className={`stats-player-status ${player.isOnCourt ? 'on-court' : 'on-bench'}`}>
                        {player.isOnCourt ? 'On Court' : 'Bench'}
                      </span>
                    </td>
                    
                    {isBasketball ? (
                      <>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "points", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.points[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "points", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "assists", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.assists[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "assists", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "rebounds", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.rebounds[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "rebounds", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "three_points_made", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.three_points_made[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "three_points_made", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "steals", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.steals[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "steals", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "blocks", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.blocks[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "blocks", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "fouls", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.fouls[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "fouls", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "turnovers", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.turnovers[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "turnovers", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "kills", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.kills[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "kills", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "volleyball_assists", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.volleyball_assists[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "volleyball_assists", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "digs", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.digs[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "digs", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "service_aces", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.service_aces[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "service_aces", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "serve_errors", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.serve_errors[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "serve_errors", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "attack_errors", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.attack_errors[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "attack_errors", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="stats-controls">
                            <button onClick={() => adjustPlayerStat(globalIndex, "reception_errors", false)} className="stats-control-button">
                              <FaMinus />
                            </button>
                            <span className="stats-value">{player.reception_errors[currentQuarter]}</span>
                            <button onClick={() => adjustPlayerStat(globalIndex, "reception_errors", true)} className="stats-control-button">
                              <FaPlus />
                            </button>
                          </div>
                        </td>
                        <td>
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
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-header">
          <h1>Staff Statistics</h1>
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
                  </h2>
                  <button 
                    onClick={() => {
                      if (cameFromStaffEvents) {
                        navigate('/StaffDashboard/events');
                      } else {
                        setSelectedGame(null);
                      }
                    }}
                    className="stats-back-button"
                  >
                    ← Back to Games
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

              <div className="stats-period-nav">
                <button
                  onClick={() => changePeriod("prev")}
                  disabled={currentQuarter === 0}
                  className="stats-period-button"
                >
                  <FaArrowLeft />
                </button>
                <div className="stats-period-display">
                  {selectedGame.sport_type === "basketball"
                    ? `Quarter ${currentQuarter + 1}`
                    : `Set ${currentQuarter + 1}`}
                </div>
                <button
                  onClick={() => changePeriod("next")}
                  disabled={currentQuarter === (selectedGame.sport_type === "basketball" ? 3 : 4)}
                  className="stats-period-button"
                >
                  <FaArrowRight />
                </button>
              </div>

              <div className="stats-scores">
                <div className="stats-score-box team1">
                  <h3>{selectedGame.team1_name}</h3>
                  <div className="stats-score-value">
                    {teamScores.team1[currentQuarter]}
                  </div>
                  <div className="stats-score-total">
                    Total: {teamScores.team1.reduce((a, b) => a + b, 0)}
                  </div>
                </div>
                <div className="stats-score-separator">-</div>
                <div className="stats-score-box team2">
                  <h3>{selectedGame.team2_name}</h3>
                  <div className="stats-score-value">
                    {teamScores.team2[currentQuarter]}
                  </div>
                  <div className="stats-score-total">
                    Total: {teamScores.team2.reduce((a, b) => a + b, 0)}
                  </div>
                </div>
              </div>

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

              {/* Shift Team Button - Moved under the action buttons */}
              <div className="stats-team-shift-container">
                <button 
                  onClick={shiftTeamView}
                  className="stats-shift-team-button"
                  title="Shift between teams view"
                >
                  <FaExchangeAlt /> Shift Team View
                </button>
                <div className="stats-team-view-indicator">
                  Current View: 
                  <span className={`view-indicator ${activeTeamView}`}>
                    {activeTeamView === 'both' ? 'Both' : 
                     activeTeamView === 'team1' ? selectedGame.team1_name : 
                     selectedGame.team2_name}
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="loading-message">
                  Loading player data...
                </div>
              ) : (
                <div>
                  {/* Conditionally render teams based on activeTeamView */}
                  {activeTeamView === 'both' && (
                    <>
                      {renderPlayerTable(selectedGame.team1_id, selectedGame.team1_name)}
                      {renderPlayerTable(selectedGame.team2_id, selectedGame.team2_name)}
                    </>
                  )}
                  {activeTeamView === 'team1' && (
                    renderPlayerTable(selectedGame.team1_id, selectedGame.team1_name)
                  )}
                  {activeTeamView === 'team2' && (
                    renderPlayerTable(selectedGame.team2_id, selectedGame.team2_name)
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