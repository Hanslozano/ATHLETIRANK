const express = require("express");
const router = express.Router();
const db = require("../config/database");

// Helper function to calculate basketball MVP score
// Formula: MVP Score = (PPG + RPG + APG + SPG + BPG) - TOV
function calculateBasketballMVPScore(stats, gamesPlayed) {
  const ppg = stats.total_points / gamesPlayed;
  const apg = stats.total_assists / gamesPlayed;
  const rpg = stats.total_rebounds / gamesPlayed;
  const spg = stats.total_steals / gamesPlayed;
  const bpg = stats.total_blocks / gamesPlayed;
  const tpg = stats.total_turnovers / gamesPlayed;
  
  // MVP Score = PPG + RPG + APG + SPG + BPG - TOV
  return ppg + rpg + apg + spg + bpg - tpg;
}

// Helper function to calculate volleyball MVP score
// Formula: MVP = (A + K + B + D + R) - (SE + AE + RE)
function calculateVolleyballMVPScore(stats, gamesPlayed) {
  const K = stats.total_kills || 0;          
  const B = stats.total_blocks || 0;         
  const A = stats.total_aces || 0;           
  const VA = stats.total_assists || 0;       // Volleyball Assists
  const D = stats.total_digs || 0;           
  const AE = stats.total_attack_errors || 0; 
  const SE = stats.total_serve_errors || 0;  
  const RE = stats.total_reception_errors || 0;
  
  // CORRECT FORMULA: (Positive - Errors) / Games
  // This matches the "Overall" score shown in your leaderboard
  const efficiency = ((K + B + A + VA + D) - (AE + SE + RE)) / gamesPlayed;
  
  return efficiency;
}

// GET tournament champion and winner team
router.get("/brackets/:bracketId/champion", async (req, res) => {
  try {
    const { bracketId } = req.params;
    
    const [championData] = await db.pool.query(`
      SELECT b.winner_team_id, t.name as winner_team_name, b.sport_type, b.elimination_type
      FROM brackets b
      LEFT JOIN teams t ON b.winner_team_id = t.id
      WHERE b.id = ?
    `, [bracketId]);
    
    if (championData.length === 0 || !championData[0].winner_team_id) {
      return res.status(404).json({ 
        message: "Tournament not yet completed or bracket not found" 
      });
    }
    
    res.json(championData[0]);
  } catch (err) {
    console.error("Error fetching champion:", err);
    res.status(500).json({ error: "Failed to fetch champion data" });
  }
});

// GET MVP and awards for a bracket
router.get("/brackets/:bracketId/mvp-awards", async (req, res) => {
  try {
    const { bracketId } = req.params;
    
    // First, check if tournament is complete
    const [bracketInfo] = await db.pool.query(`
      SELECT b.winner_team_id, b.sport_type, b.elimination_type, t.name as champion_team_name
      FROM brackets b
      LEFT JOIN teams t ON b.winner_team_id = t.id
      WHERE b.id = ?
    `, [bracketId]);
    
    if (bracketInfo.length === 0) {
      return res.status(404).json({ error: "Bracket not found" });
    }
    
    const sportType = bracketInfo[0].sport_type;
    const championTeamId = bracketInfo[0].winner_team_id;
    const championTeamName = bracketInfo[0].champion_team_name;
    
    // Get all player stats from matches in this bracket
    const statsQuery = sportType === 'basketball' ? `
      SELECT 
        p.id as player_id,
        p.name as player_name,
        p.jersey_number,
        p.position,
        p.team_id,
        t.name as team_name,
        COUNT(DISTINCT ps.match_id) as games_played,
        SUM(ps.points) as total_points,
        SUM(ps.assists) as total_assists,
        SUM(ps.rebounds) as total_rebounds,
        SUM(ps.three_points_made) as total_three_points,
        SUM(ps.steals) as total_steals,
        SUM(ps.blocks) as total_blocks,
        SUM(ps.fouls) as total_fouls,
        SUM(ps.turnovers) as total_turnovers,
        ROUND(AVG(ps.points), 1) as ppg,
        ROUND(AVG(ps.assists), 1) as apg,
        ROUND(AVG(ps.rebounds), 1) as rpg,
        ROUND(AVG(ps.steals), 1) as spg,
        ROUND(AVG(ps.blocks), 1) as bpg,
        ROUND(AVG(ps.turnovers), 1) as tpg
      FROM player_stats ps
      JOIN players p ON ps.player_id = p.id
      JOIN teams t ON p.team_id = t.id
      JOIN matches m ON ps.match_id = m.id
      WHERE m.bracket_id = ? AND m.status = 'completed'
      GROUP BY p.id, p.name, p.jersey_number, p.position, p.team_id, t.name
      HAVING games_played > 0
    ` : `
  SELECT 
    p.id as player_id,
    p.name as player_name,
    p.jersey_number,
    p.position,
    p.team_id,
    t.name as team_name,
    COUNT(DISTINCT ps.match_id) as games_played,
    SUM(ps.service_aces) as total_aces,
    SUM(ps.kills) as total_kills,
    SUM(ps.volleyball_blocks) as total_blocks,
    SUM(ps.digs) as total_digs,
    SUM(ps.receptions) as total_receptions,
    SUM(ps.volleyball_assists) as total_assists,
    SUM(ps.serve_errors) as total_serve_errors,
    SUM(ps.attack_errors) as total_attack_errors,
    SUM(ps.reception_errors) as total_reception_errors,
    SUM(ps.attack_attempts) as total_attack_attempts,
    SUM(ps.serves) as total_serves,
    -- ✅ ADD THIS: Calculate efficiency (MVP score)
    ROUND(
      (SUM(ps.kills) + SUM(ps.volleyball_blocks) + SUM(ps.service_aces) + 
       SUM(ps.volleyball_assists) + SUM(ps.digs) - 
       (SUM(ps.attack_errors) + SUM(ps.serve_errors) + SUM(ps.reception_errors))) / 
      NULLIF(COUNT(DISTINCT ps.match_id), 0), 1
    ) as efficiency,
    -- ✅ ADD THIS: Same calculation as overall_score
    ROUND(
      (SUM(ps.kills) + SUM(ps.volleyball_blocks) + SUM(ps.service_aces) + 
       SUM(ps.volleyball_assists) + SUM(ps.digs) - 
       (SUM(ps.attack_errors) + SUM(ps.serve_errors) + SUM(ps.reception_errors))) / 
      NULLIF(COUNT(DISTINCT ps.match_id), 0), 1
    ) as overall_score,
    CASE 
      WHEN SUM(ps.attack_attempts) > 0 
      THEN ROUND((SUM(ps.kills) - SUM(ps.attack_errors)) / SUM(ps.attack_attempts) * 100, 1)
      ELSE 0 
    END as hitting_percentage,
    CASE 
      WHEN (SUM(ps.serves) + SUM(ps.serve_errors)) > 0 
      THEN ROUND(SUM(ps.serves) / (SUM(ps.serves) + SUM(ps.serve_errors)) * 100, 1)
      ELSE 0 
    END as service_percentage,
    CASE 
      WHEN (SUM(ps.receptions) + SUM(ps.reception_errors)) > 0 
      THEN ROUND(SUM(ps.receptions) / (SUM(ps.receptions) + SUM(ps.reception_errors)) * 100, 1)
      ELSE 0 
    END as reception_percentage
  FROM player_stats ps
  JOIN players p ON ps.player_id = p.id
  JOIN teams t ON p.team_id = t.id
  JOIN matches m ON ps.match_id = m.id
  WHERE m.bracket_id = ? AND m.status = 'completed'
  GROUP BY p.id, p.name, p.jersey_number, p.position, p.team_id, t.name
  HAVING games_played > 0
`;

    
    const [allPlayerStats] = await db.pool.query(statsQuery, [bracketId]);
    
    if (allPlayerStats.length === 0) {
      return res.status(404).json({ 
        error: "No player statistics found for this bracket" 
      });
    }
    
    // Calculate MVP scores and find awards
    let mvpData = null;
    let awards = {};
    
    if (sportType === 'basketball') {
      // Basketball: Calculate MVP score and get top 6 players
      const playersWithScores = allPlayerStats.map(player => ({
        ...player,
        mvp_score: calculateBasketballMVPScore(player, player.games_played)
      }));
      
      // Sort by MVP score descending
      playersWithScores.sort((a, b) => b.mvp_score - a.mvp_score);
      
      // MVP is the top player
      mvpData = playersWithScores[0];
      
      // Mythical 5 are the next 5 players (positions 2-6)
      const mythicalFive = playersWithScores.slice(1, 6);
      
      awards = {
        mvp: mvpData,
        mythical_five: mythicalFive
      };
      
    } else {
      // Volleyball - MVP from ALL players
      // Calculate MVP scores for ALL players using totals
     const playersWithScores = allPlayerStats.map(player => ({
  ...player,
  // Use the efficiency from the SQL query (already calculated correctly)
  mvp_score: player.efficiency || player.overall_score || 0,
  overall_score: player.efficiency || player.overall_score || 0,
  total_errors: (player.total_attack_errors || 0) + 
               (player.total_serve_errors || 0) + 
               (player.total_reception_errors || 0)
}));

// Sort by efficiency/overall_score (highest first)
playersWithScores.sort((a, b) => {
  const scoreA = a.overall_score || a.efficiency || 0;
  const scoreB = b.overall_score || b.efficiency || 0;
  return scoreB - scoreA;
});
      
      
      // ✅ SET MVP as the top player
      mvpData = playersWithScores[0];
      
      // Volleyball Awards (from document):
      // Volleyball Awards (from document):
      // Best Setter - Total Assists
      const sortedByAssists = [...playersWithScores].sort((a, b) => 
        b.total_assists - a.total_assists
      );
      
      // Best Libero - Digs + Receptions combined
      const sortedByDefense = [...playersWithScores].sort((a, b) => {
        const defenseA = (a.total_digs || 0) + (a.total_receptions || 0);
        const defenseB = (b.total_digs || 0) + (b.total_receptions || 0);
        return defenseB - defenseA;
      });
      
      // Best Outside Hitter - Kills + Aces + Blocks
      const sortedByOutside = [...playersWithScores].sort((a, b) => {
        const scoreA = (a.total_kills || 0) + (a.total_aces || 0) + (a.total_blocks || 0);
        const scoreB = (b.total_kills || 0) + (b.total_aces || 0) + (b.total_blocks || 0);
        return scoreB - scoreA;
      });
      
      // Best Opposite Hitter - Kills + Blocks + Aces
      const sortedByOpposite = [...playersWithScores].sort((a, b) => {
        const scoreA = (a.total_kills || 0) + (a.total_blocks || 0) + (a.total_aces || 0);
        const scoreB = (b.total_kills || 0) + (b.total_blocks || 0) + (b.total_aces || 0);
        return scoreB - scoreA;
      });
      
      // Best Middle Blocker - Blocks + Kills
      const sortedByMiddle = [...playersWithScores].sort((a, b) => {
        const scoreA = (a.total_blocks || 0) + (a.total_kills || 0);
        const scoreB = (b.total_blocks || 0) + (b.total_kills || 0);
        return scoreB - scoreA;
      });
      
      awards = {
        mvp: mvpData,
        best_setter: sortedByAssists[0],
        best_libero: sortedByDefense[0],
        best_outside_hitter: sortedByOutside[0],
        best_opposite_hitter: sortedByOpposite[0],
        best_middle_blocker: sortedByMiddle[0]
      };
    }
    
    res.json({
      bracket_id: bracketId,
      sport_type: sportType,
      champion_team_id: championTeamId,
      champion_team_name: championTeamName,
      awards: awards,
      all_player_stats: allPlayerStats
    });
    
  } catch (err) {
    console.error("Error calculating MVP and awards:", err);
    res.status(500).json({ error: "Failed to calculate MVP and awards: " + err.message });
  }
});

// GET team standings for a bracket
router.get("/brackets/:bracketId/standings", async (req, res) => {
  try {
    const { bracketId } = req.params;
    
    const [bracketInfo] = await db.pool.query(`
      SELECT sport_type, elimination_type FROM brackets WHERE id = ?
    `, [bracketId]);
    
    if (bracketInfo.length === 0) {
      return res.status(404).json({ error: "Bracket not found" });
    }
    
    const sportType = bracketInfo[0].sport_type;
    
    if (sportType === 'basketball') {
      const [standings] = await db.pool.query(`
        SELECT 
          t.id,
          t.name as team,
          COUNT(CASE WHEN m.winner_id = t.id THEN 1 END) as wins,
          COUNT(CASE WHEN (m.team1_id = t.id OR m.team2_id = t.id) AND m.status = 'completed' AND m.winner_id != t.id THEN 1 END) as losses,
          SUM(CASE WHEN m.team1_id = t.id THEN m.score_team1 ELSE 0 END) + 
          SUM(CASE WHEN m.team2_id = t.id THEN m.score_team2 ELSE 0 END) as points_for,
          SUM(CASE WHEN m.team1_id = t.id THEN m.score_team2 ELSE 0 END) + 
          SUM(CASE WHEN m.team2_id = t.id THEN m.score_team1 ELSE 0 END) as points_against
        FROM teams t
        JOIN bracket_teams bt ON t.id = bt.team_id
        LEFT JOIN matches m ON (m.team1_id = t.id OR m.team2_id = t.id) AND m.bracket_id = ? AND m.status = 'completed'
        WHERE bt.bracket_id = ?
        GROUP BY t.id, t.name
        ORDER BY wins DESC, (points_for - points_against) DESC
      `, [bracketId, bracketId]);
      
      const rankedStandings = standings.map((team, index) => {
        const totalGames = team.wins + team.losses;
        const winPercentage = totalGames > 0 ? (team.wins / totalGames * 100).toFixed(1) : "0.0";
        const pointDiff = team.points_for - team.points_against;
        
        return {
          position: index + 1,
          ...team,
          point_diff: pointDiff >= 0 ? `+${pointDiff}` : `${pointDiff}`,
          win_percentage: `${winPercentage}%`
        };
      });
      
      res.json({
        bracket_id: bracketId,
        sport_type: sportType,
        standings: rankedStandings
      });
      
    } else {
      const [standings] = await db.pool.query(`
        SELECT 
          t.id,
          t.name as team,
          COUNT(CASE WHEN m.winner_id = t.id THEN 1 END) as wins,
          COUNT(CASE WHEN (m.team1_id = t.id OR m.team2_id = t.id) AND m.status = 'completed' AND m.winner_id != t.id THEN 1 END) as losses
        FROM teams t
        JOIN bracket_teams bt ON t.id = bt.team_id
        LEFT JOIN matches m ON (m.team1_id = t.id OR m.team2_id = t.id) AND m.bracket_id = ? AND m.status = 'completed'
        WHERE bt.bracket_id = ?
        GROUP BY t.id, t.name
        ORDER BY wins DESC, losses ASC
      `, [bracketId, bracketId]);
      
      const rankedStandings = standings.map((team, index) => {
        const totalGames = team.wins + team.losses;
        const winPercentage = totalGames > 0 ? (team.wins / totalGames * 100).toFixed(1) : "0.0";
        
        return {
          position: index + 1,
          team: team.team,
          wins: team.wins,
          losses: team.losses,
          sets_for: team.wins * 2,
          sets_against: team.losses * 2,
          set_ratio: team.losses > 0 ? (team.wins / team.losses).toFixed(2) : team.wins.toFixed(2),
          win_percentage: `${winPercentage}%`
        };
      });
      
      res.json({
        bracket_id: bracketId,
        sport_type: sportType,
        standings: rankedStandings
      });
    }
    
  } catch (err) {
    console.error("Error fetching standings:", err);
    res.status(500).json({ error: "Failed to fetch standings: " + err.message });
  }
});

// GET all events with completed brackets for awards display
router.get("/events/completed", async (req, res) => {
  try {
    const [events] = await db.pool.query(`
      SELECT DISTINCT
        e.id,
        e.name,
        e.start_date,
        e.end_date,
        e.status
      FROM events e
      JOIN brackets b ON e.id = b.event_id
      WHERE b.winner_team_id IS NOT NULL
      ORDER BY e.end_date DESC
    `);
    
    res.json(events);
  } catch (err) {
    console.error("Error fetching completed events:", err);
    res.status(500).json({ error: "Failed to fetch completed events" });
  }
});

// GET brackets with champions for an event
router.get("/events/:eventId/completed-brackets", async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const [brackets] = await db.pool.query(`
      SELECT 
        b.id,
        b.name,
        b.sport_type,
        b.elimination_type,
        b.winner_team_id,
        t.name as winner_team_name,
        b.created_at
      FROM brackets b
      LEFT JOIN teams t ON b.winner_team_id = t.id
      WHERE b.event_id = ? AND b.winner_team_id IS NOT NULL
      ORDER BY b.created_at DESC
    `, [eventId]);
    
    res.json(brackets);
  } catch (err) {
    console.error("Error fetching completed brackets:", err);
    res.status(500).json({ error: "Failed to fetch completed brackets" });
  }
});

module.exports = router;