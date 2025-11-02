const express = require("express");
const router = express.Router();
const db = require("../config/database");

// Helper function to calculate basketball MVP score
function calculateBasketballMVPScore(stats, gamesPlayed) {
  const ppg = stats.total_points / gamesPlayed;
  const apg = stats.total_assists / gamesPlayed;
  const rpg = stats.total_rebounds / gamesPlayed;
  const spg = stats.total_steals / gamesPlayed;
  const bpg = stats.total_blocks / gamesPlayed;
  const tpg = stats.total_turnovers / gamesPlayed;
  
  // MVP Score = PTS + REB + AST + STL + BLK - TO
  return ppg + rpg + apg + spg + bpg - tpg;
}

// Helper function to calculate volleyball MVP score - UPDATED: Use totals instead of averages
function calculateVolleyballMVPScore(stats, gamesPlayed) {
  // Use total counts instead of averages
  const totalKills = stats.total_kills || 0;
  const totalBlocks = stats.total_blocks || 0;
  const totalAssists = stats.total_assists || 0;
  const totalDigs = stats.total_digs || 0;
  const totalAces = stats.total_aces || 0;
  const totalErrors = (stats.total_attack_errors || 0) + (stats.total_serve_errors || 0) + (stats.total_reception_errors || 0);
  
  // MVP Score = Total Kills + Total Blocks + Total Assists + Total Digs + Total Aces - Total Errors
  return totalKills + totalBlocks + totalAssists + totalDigs + totalAces - totalErrors;
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

// GET MVP and awards for a bracket - UPDATED FOR VOLLEYBALL TOTALS AND EFFICIENCY
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
    
    if (!bracketInfo[0].winner_team_id) {
      return res.status(400).json({ 
        error: "Tournament not yet completed. MVP and awards can only be calculated after tournament completion." 
      });
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
        AVG(ps.points) as ppg,
        AVG(ps.assists) as apg,
        AVG(ps.rebounds) as rpg,
        AVG(ps.steals) as spg,
        AVG(ps.blocks) as bpg
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
        -- TOTAL COUNTS (not averages)
        SUM(ps.kills) as total_kills,
        SUM(ps.volleyball_assists) as total_assists,
        SUM(ps.digs) as total_digs,
        SUM(ps.volleyball_blocks) as total_blocks,
        SUM(ps.service_aces) as total_aces,
        SUM(ps.attack_attempts) as total_attack_attempts,
        SUM(ps.attack_errors) as total_attack_errors,
        SUM(ps.serve_errors) as total_serve_errors,
        SUM(ps.reception_errors) as total_reception_errors,
        -- Efficiency calculation: (Kills + Blocks + Aces + Assists + Digs - Total Errors) / Games
        ROUND(
          (SUM(ps.kills) + SUM(ps.volleyball_blocks) + SUM(ps.service_aces) + 
           SUM(ps.volleyball_assists) + SUM(ps.digs) - 
           (SUM(ps.attack_errors) + SUM(ps.serve_errors) + SUM(ps.reception_errors))) / 
          NULLIF(COUNT(DISTINCT ps.match_id), 0), 2
        ) as efficiency,
        -- Percentages for display
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
      // Basketball logic remains the same
      const championPlayers = allPlayerStats.filter(p => p.team_id === championTeamId);
      const playersWithScores = championPlayers.map(player => ({
        ...player,
        mvp_score: calculateBasketballMVPScore(player, player.games_played)
      }));
      playersWithScores.sort((a, b) => b.mvp_score - a.mvp_score);
      mvpData = playersWithScores[0];
      
      const sortedByAssists = [...allPlayerStats].sort((a, b) => b.total_assists - a.total_assists);
      const sortedBySteals = [...allPlayerStats].sort((a, b) => b.total_steals - a.total_steals);
      const sortedByRebounds = [...allPlayerStats].sort((a, b) => b.total_rebounds - a.total_rebounds);
      const sortedByBlocks = [...allPlayerStats].sort((a, b) => b.total_blocks - a.total_blocks);
      
      awards = {
        mvp: mvpData,
        best_playmaker: sortedByAssists[0],
        best_defender: sortedBySteals[0],
        best_rebounder: sortedByRebounds[0],
        best_blocker: sortedByBlocks[0]
      };
      
    } else {
      // Volleyball - updated to use totals
      const championPlayers = allPlayerStats.filter(p => p.team_id === championTeamId);
      
      // Calculate MVP scores for champion team using totals
      const playersWithScores = championPlayers.map(player => ({
        ...player,
        mvp_score: calculateVolleyballMVPScore(player, player.games_played),
        total_errors: (player.total_attack_errors || 0) + (player.total_serve_errors || 0) + (player.total_reception_errors || 0)
      }));
      
      // Sort by MVP score
      playersWithScores.sort((a, b) => b.mvp_score - a.mvp_score);
      mvpData = playersWithScores[0];
      
      // Calculate awards using TOTAL counts instead of averages
      const sortedByBlocks = [...allPlayerStats].sort((a, b) => {
        if (b.total_blocks !== a.total_blocks) {
          return b.total_blocks - a.total_blocks;
        }
        return (b.hitting_percentage || 0) - (a.hitting_percentage || 0);
      });
      
      const sortedByAssists = [...allPlayerStats].sort((a, b) => b.total_assists - a.total_assists);
      
      const sortedByDigs = [...allPlayerStats].sort((a, b) => {
        if (b.total_digs !== a.total_digs) {
          return b.total_digs - a.total_digs;
        }
        return (b.reception_percentage || 0) - (a.reception_percentage || 0);
      });
      
      const sortedByAces = [...allPlayerStats].sort((a, b) => {
        if (b.total_aces !== a.total_aces) {
          return b.total_aces - a.total_aces;
        }
        return (b.service_percentage || 0) - (a.service_percentage || 0);
      });
      
      const sortedByKills = [...allPlayerStats].sort((a, b) => {
        if (b.total_kills !== a.total_kills) {
          return b.total_kills - a.total_kills;
        }
        return (b.hitting_percentage || 0) - (a.hitting_percentage || 0);
      });
      
      awards = {
        mvp: mvpData,
        best_blocker: sortedByBlocks[0],
        best_setter: sortedByAssists[0],
        best_libero: sortedByDigs[0],
        best_server: sortedByAces[0],
        best_spiker: sortedByKills[0] // Added best spiker award
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
    
    // Get bracket info
    const [bracketInfo] = await db.pool.query(`
      SELECT sport_type, elimination_type FROM brackets WHERE id = ?
    `, [bracketId]);
    
    if (bracketInfo.length === 0) {
      return res.status(404).json({ error: "Bracket not found" });
    }
    
    const sportType = bracketInfo[0].sport_type;
    
    if (sportType === 'basketball') {
      // Basketball standings (existing working code)
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
      // Volleyball standings - CORRECTED VERSION
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
        
        // For volleyball without set scores, we'll use placeholder values
        return {
          position: index + 1,
          team: team.team,  // FIXED: Changed from team.name to team.team
          wins: team.wins,
          losses: team.losses,
          sets_for: team.wins * 2, // Placeholder: assume 2 sets per win
          sets_against: team.losses * 2, // Placeholder: assume 2 sets per loss
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