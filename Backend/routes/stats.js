const express = require("express");
const router = express.Router();
const db = require("../config/database");

// Get all events
router.get("/events", async (req, res) => {
  try {
    const [rows] = await db.pool.query("SELECT * FROM events WHERE archived = 'no' ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// GET brackets by event
router.get("/events/:eventId/brackets", async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log("Fetching brackets for event:", eventId);
    
    const query = `
      SELECT b.*, COUNT(bt.team_id) as team_count 
      FROM brackets b
      LEFT JOIN bracket_teams bt ON b.id = bt.bracket_id
      WHERE b.event_id = ?
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `;
    const [brackets] = await db.pool.query(query, [eventId]);
    console.log("Brackets found:", brackets);
    res.json(brackets);
  } catch (error) {
    console.error("Error fetching brackets:", error);
    res.status(500).json({ error: "Failed to fetch brackets" });
  }
});

// GET teams by bracket
router.get('/:bracketId/teams', async (req, res) => {
  try {
    const { bracketId } = req.params;
    const query = `
      SELECT t.*, bt.bracket_id 
      FROM teams t
      INNER JOIN bracket_teams bt ON t.id = bt.team_id
      WHERE bt.bracket_id = ?
      ORDER BY t.name
    `;
    const [teams] = await db.pool.query(query, [bracketId]);
    res.json(teams);
  } catch (error) {
    console.error('Error fetching bracket teams:', error);
    res.status(500).json({ 
      message: 'Error fetching teams',
      error: error.message 
    });
  }
});

// GET players by bracket
router.get("/brackets/:bracketId/players", async (req, res) => {
  try {
    const { bracketId } = req.params;
    const query = `
      SELECT DISTINCT p.*, t.name as team_name
      FROM players p
      JOIN teams t ON p.team_id = t.id
      JOIN bracket_teams bt ON t.id = bt.team_id
      WHERE bt.bracket_id = ?
      ORDER BY t.name, p.name
    `;
    const [players] = await db.pool.query(query, [bracketId]);
    console.log(`Players for bracket ${bracketId}:`, players.length);
    res.json(players);
  } catch (error) {
    console.error('Error fetching bracket players:', error);
    res.status(500).json({ 
      message: 'Error fetching players',
      error: error.message 
    });
  }
});

// GET matches by bracket
router.get('/:bracketId/matches', async (req, res) => {
  try {
    const { bracketId } = req.params;
    const query = `
      SELECT 
        m.*,
        t1.name as team1_name,
        t2.name as team2_name,
        tw.name as winner_name,
        p.name as mvp_name,
        b.sport_type,
        b.name as bracket_name
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      LEFT JOIN teams tw ON m.winner_id = tw.id
      LEFT JOIN players p ON m.mvp_id = p.id
      LEFT JOIN brackets b ON m.bracket_id = b.id
      WHERE m.bracket_id = ?
      ORDER BY m.round_number, m.match_order
    `;
    const [matches] = await db.pool.query(query, [bracketId]);
    res.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ 
      message: 'Error fetching matches',
      error: error.message 
    });
  }
});

// Get players for a team
router.get("/teams/:teamId/players", async (req, res) => {
  try {
    const [rows] = await db.pool.query(
      "SELECT * FROM players WHERE team_id = ? ORDER BY name", 
      [req.params.teamId]
    );
    console.log(`Players for team ${req.params.teamId}:`, rows);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching players:", err);
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

// Get existing stats for a match
router.get("/matches/:matchId/stats", async (req, res) => {
  try {
    const query = `
      SELECT 
        ps.*,
        p.name as player_name,
        p.position as player_position,
        t.name as team_name
      FROM player_stats ps
      JOIN players p ON ps.player_id = p.id
      JOIN teams t ON p.team_id = t.id
      WHERE ps.match_id = ?
      ORDER BY t.name, p.name
    `;
    const [rows] = await db.pool.query(query, [req.params.matchId]);
    console.log(`Enhanced stats for match ${req.params.matchId}:`, rows);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching match stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Enhanced Save stats for a match - UPDATED FOR NEW SHOOTING STATS
// Enhanced Save stats for a match - UPDATED FOR NEW SHOOTING STATS
router.post("/matches/:matchId/stats", async (req, res) => {
  const { players, team1_id, team2_id, awards = [] } = req.body;
  const matchId = req.params.matchId;

  console.log("Saving stats for match:", matchId);
  console.log("Players data:", players);

  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();

    // Get match details first to know the bracket and round info
    const [matchDetails] = await conn.query(
      `SELECT m.*, b.elimination_type, b.sport_type 
       FROM matches m 
       JOIN brackets b ON m.bracket_id = b.id 
       WHERE m.id = ?`, 
      [matchId]
    );

    if (matchDetails.length === 0) {
      throw new Error("Match not found");
    }

    const match = matchDetails[0];
    console.log("Match details:", match);

    // Clear existing stats and awards
    await conn.query("DELETE FROM player_stats WHERE match_id = ?", [matchId]);
    await conn.query("DELETE FROM match_awards WHERE match_id = ?", [matchId]);

    let team1Total = 0;
    let team2Total = 0;

    // Save player stats
    for (const player of players) {
      const {
        player_id,
        team_id,
        // Basketball stats
        points = 0,
        assists = 0,
        rebounds = 0,
        two_points_made = 0,
        three_points_made = 0,
        free_throws_made = 0,
        steals = 0,
        blocks = 0,
        fouls = 0,
        turnovers = 0,
        // Volleyball stats
        serves = 0,
        service_aces = 0,
        serve_errors = 0,
        receptions = 0,
        reception_errors = 0,
        digs = 0,
        kills = 0,
        attack_attempts = 0,
        attack_errors = 0,
        volleyball_assists = 0,
      } = player;

      await conn.query(
        `INSERT INTO player_stats 
        (match_id, player_id, points, assists, rebounds, two_points_made, three_points_made, free_throws_made, steals, blocks, fouls, turnovers,
         serves, service_aces, serve_errors, receptions, reception_errors, digs, kills, attack_attempts, attack_errors, volleyball_assists) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          matchId,
          player_id,
          points,
          assists,
          rebounds,
          two_points_made,
          three_points_made,
          free_throws_made,
          steals,
          blocks,
          fouls,
          turnovers,
          serves,
          service_aces,
          serve_errors,
          receptions,
          reception_errors,
          digs,
          kills,
          attack_attempts,
          attack_errors,
          volleyball_assists,
        ]
      );

      // Calculate team totals based on sport type
      const scoringStat = match.sport_type === 'basketball' ? points : kills;
      if (team_id === team1_id) {
        team1Total += scoringStat;
      }
      if (team_id === team2_id) {
        team2Total += scoringStat;
      }
    }

    // Save match awards if provided
    for (const award of awards) {
      if (award.player_id && award.award_type) {
        await conn.query(
          `INSERT INTO match_awards (match_id, player_id, award_type) 
           VALUES (?, ?, ?)`,
          [matchId, award.player_id, award.award_type]
        );
      }
    }

    // ONLY UPDATE MATCH SCORES - NO BRACKET ADVANCEMENT
    // The brackets API will handle all advancement logic
    await conn.query(
      `UPDATE matches 
       SET score_team1 = ?, score_team2 = ? 
       WHERE id = ?`,
      [team1Total, team2Total, matchId]
    );

    await conn.commit();
    console.log("Stats saved successfully:", { 
      team1Total, 
      team2Total, 
      matchId
    });
    
    res.json({ 
      message: "Stats saved successfully", 
      team1Total, 
      team2Total
    });
    
  } catch (err) {
    await conn.rollback();
    console.error("Error saving stats:", err);
    res.status(500).json({ error: "Failed to save stats: " + err.message });
  } finally {
    conn.release();
  }
});

// ... rest of your backend routes remain the same ...

// Get match awards
router.get("/matches/:matchId/awards", async (req, res) => {
  try {
    const [rows] = await db.pool.query(
      `SELECT ma.*, p.name as player_name, t.name as team_name
       FROM match_awards ma
       JOIN players p ON ma.player_id = p.id
       JOIN teams t ON p.team_id = t.id
       WHERE ma.match_id = ?
       ORDER BY ma.award_type`,
      [req.params.matchId]
    );
    console.log(`Awards for match ${req.params.matchId}:`, rows);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching match awards:", err);
    res.status(500).json({ error: "Failed to fetch awards" });
  }
});

// Get player statistics summary for a match or event
router.get("/matches/:matchId/summary", async (req, res) => {
  try {
    const { matchId } = req.params;
    
    const query = `
      SELECT 
        ps.*,
        p.name as player_name,
        p.jersey_number,
        t.name as team_name,
        b.sport_type,
        -- Calculate hitting percentage for volleyball
        CASE 
          WHEN ps.attack_attempts > 0 
          THEN ROUND((ps.kills - ps.attack_errors) / ps.attack_attempts * 100, 2)
          ELSE 0 
        END as hitting_percentage,
        -- Calculate service percentage
        CASE 
          WHEN (ps.serves + ps.serve_errors) > 0 
          THEN ROUND(ps.serves / (ps.serves + ps.serve_errors) * 100, 2)
          ELSE 0 
        END as service_percentage,
        -- Calculate reception percentage
        CASE 
          WHEN (ps.receptions + ps.reception_errors) > 0 
          THEN ROUND(ps.receptions / (ps.receptions + ps.reception_errors) * 100, 2)
          ELSE 0 
        END as reception_percentage
      FROM player_stats ps
      JOIN players p ON ps.player_id = p.id
      JOIN teams t ON p.team_id = t.id
      JOIN matches m ON ps.match_id = m.id
      JOIN brackets b ON m.bracket_id = b.id
      WHERE ps.match_id = ?
      ORDER BY t.name, p.name
    `;
    
    const [rows] = await db.pool.query(query, [matchId]);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching match summary:", err);
    res.status(500).json({ error: "Failed to fetch match summary" });
  }
});

// FIXED: Get event statistics including total players, averages, and total games - WITH BRACKET FILTERING
router.get("/events/:eventId/statistics", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { bracketId } = req.query; // Get optional bracketId from query params
    
    console.log(`Fetching statistics for event ${eventId}, bracket: ${bracketId || 'all'}`);
    
    // Build WHERE clause based on whether bracketId is provided
    const bracketFilter = bracketId ? 'AND b.id = ?' : '';
    const queryParams = bracketId ? [eventId, bracketId] : [eventId];
    
    // Get total players in the event/bracket
    const [totalPlayersResult] = await db.pool.query(`
      SELECT COUNT(DISTINCT p.id) as total_players
      FROM players p
      JOIN teams t ON p.team_id = t.id
      JOIN bracket_teams bt ON t.id = bt.team_id
      JOIN brackets b ON bt.bracket_id = b.id
      WHERE b.event_id = ? ${bracketFilter}
    `, queryParams);
    
    // Get total completed games in the event/bracket
    const [totalGamesResult] = await db.pool.query(`
      SELECT COUNT(*) as total_games
      FROM matches m
      JOIN brackets b ON m.bracket_id = b.id
      WHERE b.event_id = ? 
        AND m.status = 'completed'
        ${bracketFilter}
    `, queryParams);
    
    // Get average statistics for the event/bracket
    const [avgStatsResult] = await db.pool.query(`
      SELECT 
        ROUND(AVG(ps.points), 1) as avg_ppg,
        ROUND(AVG(ps.rebounds), 1) as avg_rpg,
        ROUND(AVG(ps.assists), 1) as avg_apg,
        ROUND(AVG(ps.blocks), 1) as avg_bpg,
        ROUND(AVG(CASE WHEN ps.attack_attempts > 0 THEN (ps.kills - ps.attack_errors) / ps.attack_attempts * 100 ELSE 0 END), 1) as avg_hitting_percentage
      FROM player_stats ps
      JOIN matches m ON ps.match_id = m.id
      JOIN brackets b ON m.bracket_id = b.id
      WHERE b.event_id = ? 
        AND m.status = 'completed'
        ${bracketFilter}
    `, queryParams);
    
    const statistics = {
      total_players: totalPlayersResult[0]?.total_players || 0,
      total_games: totalGamesResult[0]?.total_games || 0,
      avg_ppg: avgStatsResult[0]?.avg_ppg || 0,
      avg_rpg: avgStatsResult[0]?.avg_rpg || 0,
      avg_apg: avgStatsResult[0]?.avg_apg || 0,
      avg_bpg: avgStatsResult[0]?.avg_bpg || 0,
      avg_hitting_percentage: avgStatsResult[0]?.avg_hitting_percentage || 0
    };
    
    console.log(`Statistics result:`, statistics);
    res.json(statistics);
  } catch (err) {
    console.error("Error fetching event statistics:", err);
    res.status(500).json({ error: "Failed to fetch event statistics" });
  }
});

// FIXED: Get comprehensive player statistics for an event - WITH BRACKET FILTERING
router.get("/events/:eventId/players-statistics", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { bracketId } = req.query; // Optional bracket filter
    
    console.log(`Fetching player statistics for event ${eventId}, bracket: ${bracketId || 'all'}`);
    
    // Build WHERE clause based on whether bracketId is provided
    const bracketFilter = bracketId ? 'AND b.id = ?' : '';
    const queryParams = bracketId ? [eventId, bracketId] : [eventId];
    
    // First get the sport type to determine which stats to calculate
    let sportTypeQuery = `
      SELECT DISTINCT b.sport_type 
      FROM brackets b 
      WHERE b.event_id = ?
      ${bracketFilter}
      LIMIT 1
    `;
    
    const [sportTypeResult] = await db.pool.query(sportTypeQuery, queryParams);
    
    if (sportTypeResult.length === 0) {
      console.log('No brackets found for this event/bracket combination');
      return res.json([]);
    }
    
    const sportType = sportTypeResult[0].sport_type;
    console.log(`Sport type detected: ${sportType}`);
    
    let query;
    if (sportType === 'basketball') {
      query = `
        SELECT 
          p.id,
          p.name,
          p.jersey_number,
          t.name as team_name,
          b.id as bracket_id,
          b.name as bracket_name,
          '${sportType}' as sport_type,
          COUNT(DISTINCT ps.match_id) as games_played,
          SUM(ps.points) as total_points,
          SUM(ps.assists) as total_assists,
          SUM(ps.rebounds) as total_rebounds,
          SUM(ps.steals) as total_steals,
          SUM(ps.blocks) as total_blocks,
          SUM(ps.three_points_made) as total_three_points,
          SUM(ps.turnovers) as total_turnovers,
          SUM(ps.fouls) as total_fouls,
          -- Calculate per-game averages (PPG, APG, RPG, etc.)
          ROUND(SUM(ps.points) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as ppg,
          ROUND(SUM(ps.rebounds) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as rpg,
          ROUND(SUM(ps.assists) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as apg,
          ROUND(SUM(ps.steals) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as spg,
          ROUND(SUM(ps.blocks) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as bpg,
          ROUND(SUM(ps.turnovers) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as tpg,
          -- Field Goal Percentage (simplified - using points as proxy)
          ROUND(
            CASE 
              WHEN COUNT(DISTINCT ps.match_id) > 0 
              THEN (SUM(ps.points) / COUNT(DISTINCT ps.match_id)) / 2.5
              ELSE 0 
            END, 1
          ) as fg,
          -- Overall Score (matching MVP calculation: PTS + REB + AST + STL + BLK - TO per game)
          ROUND(
            (SUM(ps.points) + SUM(ps.rebounds) + SUM(ps.assists) + 
             SUM(ps.steals) + SUM(ps.blocks) - SUM(ps.turnovers)) / 
            NULLIF(COUNT(DISTINCT ps.match_id), 1), 1
          ) as overall_score
        FROM player_stats ps
        JOIN players p ON ps.player_id = p.id
        JOIN teams t ON p.team_id = t.id
        JOIN matches m ON ps.match_id = m.id
        JOIN brackets b ON m.bracket_id = b.id
        WHERE m.status = 'completed' 
          AND b.event_id = ?
          ${bracketFilter}
        GROUP BY p.id, p.name, p.jersey_number, t.name, b.id, b.name
        HAVING games_played > 0
        ORDER BY overall_score DESC, ppg DESC, rpg DESC, apg DESC
      `;
    } else {
      // Volleyball
      query = `
        SELECT 
          p.id,
          p.name,
          p.jersey_number,
          t.name as team_name,
          b.id as bracket_id,
          b.name as bracket_name,
          '${sportType}' as sport_type,
          COUNT(DISTINCT ps.match_id) as games_played,
          SUM(ps.kills) as total_kills,
          SUM(ps.attack_attempts) as total_attack_attempts,
          SUM(ps.attack_errors) as total_attack_errors,
          SUM(ps.blocks) as total_blocks,
          SUM(ps.volleyball_assists) as total_volleyball_assists,
          SUM(ps.digs) as total_digs,
          SUM(ps.serves) as total_serves,
          SUM(ps.service_aces) as total_service_aces,
          SUM(ps.serve_errors) as total_serve_errors,
          SUM(ps.receptions) as total_receptions,
          SUM(ps.reception_errors) as total_reception_errors,
          -- Calculate per-game averages
          ROUND(SUM(ps.kills) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as ppg,
          ROUND(SUM(ps.kills) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as kpg,
          ROUND(SUM(ps.blocks) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as bpg,
          ROUND(SUM(ps.volleyball_assists) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as apg,
          ROUND(SUM(ps.digs) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as dpg,
          ROUND(SUM(ps.digs) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as rpg,
          ROUND(SUM(ps.service_aces) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as acepg,
          -- Hitting Percentage
          ROUND(
            CASE 
              WHEN SUM(ps.attack_attempts) > 0 
              THEN (SUM(ps.kills) - SUM(ps.attack_errors)) / SUM(ps.attack_attempts) * 100
              ELSE 0 
            END, 1
          ) as fg,
          ROUND(
            CASE 
              WHEN SUM(ps.attack_attempts) > 0 
              THEN (SUM(ps.kills) - SUM(ps.attack_errors)) / SUM(ps.attack_attempts) * 100
              ELSE 0 
            END, 1
          ) as hitting_percentage,
          -- Service Percentage
          ROUND(
            CASE 
              WHEN (SUM(ps.serves) + SUM(ps.serve_errors)) > 0 
              THEN SUM(ps.serves) / (SUM(ps.serves) + SUM(ps.serve_errors)) * 100
              ELSE 0 
            END, 1
          ) as service_percentage,
          -- Reception Percentage
          ROUND(
            CASE 
              WHEN (SUM(ps.receptions) + SUM(ps.reception_errors)) > 0 
              THEN SUM(ps.receptions) / (SUM(ps.receptions) + SUM(ps.reception_errors)) * 100
              ELSE 0 
            END, 1
          ) as reception_percentage,
          -- Overall Score (matching MVP calculation: K + B + A + D + ACE - Errors per game)
          ROUND(
            (SUM(ps.kills) + SUM(ps.blocks) + SUM(ps.volleyball_assists) + 
             SUM(ps.digs) + SUM(ps.service_aces) - 
             (SUM(ps.attack_errors) + SUM(ps.serve_errors) + SUM(ps.reception_errors))) / 
            NULLIF(COUNT(DISTINCT ps.match_id), 1), 1
          ) as overall_score
        FROM player_stats ps
        JOIN players p ON ps.player_id = p.id
        JOIN teams t ON p.team_id = t.id
        JOIN matches m ON ps.match_id = m.id
        JOIN brackets b ON m.bracket_id = b.id
        WHERE m.status = 'completed' 
          AND b.event_id = ?
          ${bracketFilter}
        GROUP BY p.id, p.name, p.jersey_number, t.name, b.id, b.name
        HAVING games_played > 0
        ORDER BY overall_score DESC, kpg DESC, bpg DESC, apg DESC
      `;
    }
    
    const [players] = await db.pool.query(query, queryParams);
    console.log(`Found ${players.length} players with statistics`);
    res.json(players);
  } catch (err) {
    console.error("Error fetching player statistics:", err);
    res.status(500).json({ error: "Failed to fetch player statistics" });
  }
});

// FIXED: Get comprehensive team statistics for an event - WITH BRACKET FILTERING
router.get("/events/:eventId/teams-statistics", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { bracketId } = req.query; // Optional bracket filter
    
    console.log(`Fetching team statistics for event ${eventId}, bracket: ${bracketId || 'all'}`);
    
    // Build WHERE clause based on whether bracketId is provided
    const bracketFilter = bracketId ? 'AND b.id = ?' : '';
    const queryParams = bracketId ? [eventId, bracketId] : [eventId];
    
    // First get the sport type to determine which stats to calculate
    let sportTypeQuery = `
      SELECT DISTINCT b.sport_type 
      FROM brackets b 
      WHERE b.event_id = ?
      ${bracketFilter}
      LIMIT 1
    `;
    
    const [sportTypeResult] = await db.pool.query(sportTypeQuery, queryParams);
    
    if (sportTypeResult.length === 0) {
      console.log('No brackets found for this event/bracket combination');
      return res.json([]);
    }
    
    const sportType = sportTypeResult[0].sport_type;
    console.log(`Sport type detected: ${sportType}`);
    
    let query;
    if (sportType === 'basketball') {
      query = `
        SELECT 
          t.id as team_id,
          t.name as team_name,
          b.id as bracket_id,
          b.name as bracket_name,
          '${sportType}' as sport_type,
          COUNT(DISTINCT ps.match_id) as games_played,
          -- Team totals
          SUM(ps.points) as total_points,
          SUM(ps.assists) as total_assists,
          SUM(ps.rebounds) as total_rebounds,
          SUM(ps.steals) as total_steals,
          SUM(ps.blocks) as total_blocks,
          SUM(ps.three_points_made) as total_three_points,
          SUM(ps.turnovers) as total_turnovers,
          SUM(ps.fouls) as total_fouls,
          -- Calculate per-game averages (PPG, APG, RPG, etc.)
          ROUND(SUM(ps.points) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as ppg,
          ROUND(SUM(ps.rebounds) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as rpg,
          ROUND(SUM(ps.assists) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as apg,
          ROUND(SUM(ps.steals) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as spg,
          ROUND(SUM(ps.blocks) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as bpg,
          ROUND(SUM(ps.turnovers) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as tpg,
          -- Field Goal Percentage (team average)
          ROUND(
            AVG(
              CASE 
                WHEN ps.points > 0 
                THEN ps.points / 2.5  -- Simplified FG calculation
                ELSE 0 
              END
            ), 1
          ) as fg,
          -- Overall Score (team performance metric)
          ROUND(
            (SUM(ps.points) + SUM(ps.rebounds) + SUM(ps.assists) + 
             SUM(ps.steals) + SUM(ps.blocks) - SUM(ps.turnovers)) / 
            NULLIF(COUNT(DISTINCT ps.match_id), 1), 1
          ) as overall_score,
          -- Win/Loss record
          (SELECT COUNT(*) FROM matches m 
           WHERE (m.team1_id = t.id OR m.team2_id = t.id) 
           AND m.winner_id = t.id 
           AND m.status = 'completed') as wins,
          (SELECT COUNT(*) FROM matches m 
           WHERE (m.team1_id = t.id OR m.team2_id = t.id) 
           AND m.winner_id != t.id 
           AND m.status = 'completed') as losses
        FROM teams t
        JOIN bracket_teams bt ON t.id = bt.team_id
        JOIN brackets b ON bt.bracket_id = b.id
        LEFT JOIN players p ON p.team_id = t.id
        LEFT JOIN player_stats ps ON ps.player_id = p.id
        LEFT JOIN matches m ON ps.match_id = m.id AND m.status = 'completed'
        WHERE b.event_id = ?
          ${bracketFilter}
        GROUP BY t.id, t.name, b.id, b.name
        HAVING games_played > 0
        ORDER BY overall_score DESC, ppg DESC, rpg DESC, apg DESC
      `;
    } else {
      // Volleyball team statistics
      query = `
        SELECT 
          t.id as team_id,
          t.name as team_name,
          b.id as bracket_id,
          b.name as bracket_name,
          '${sportType}' as sport_type,
          COUNT(DISTINCT ps.match_id) as games_played,
          -- Team totals
          SUM(ps.kills) as total_kills,
          SUM(ps.attack_attempts) as total_attack_attempts,
          SUM(ps.attack_errors) as total_attack_errors,
          SUM(ps.blocks) as total_blocks,
          SUM(ps.volleyball_assists) as total_volleyball_assists,
          SUM(ps.digs) as total_digs,
          SUM(ps.serves) as total_serves,
          SUM(ps.service_aces) as total_service_aces,
          SUM(ps.serve_errors) as total_serve_errors,
          SUM(ps.receptions) as total_receptions,
          SUM(ps.reception_errors) as total_reception_errors,
          -- Calculate per-game averages
          ROUND(SUM(ps.kills) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as ppg,
          ROUND(SUM(ps.kills) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as kpg,
          ROUND(SUM(ps.blocks) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as bpg,
          ROUND(SUM(ps.volleyball_assists) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as apg,
          ROUND(SUM(ps.digs) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as dpg,
          ROUND(SUM(ps.digs) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as rpg,
          ROUND(SUM(ps.service_aces) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as acepg,
          -- Hitting Percentage (team average)
          ROUND(
            CASE 
              WHEN SUM(ps.attack_attempts) > 0 
              THEN (SUM(ps.kills) - SUM(ps.attack_errors)) / SUM(ps.attack_attempts) * 100
              ELSE 0 
            END, 1
          ) as fg,
          ROUND(
            CASE 
              WHEN SUM(ps.attack_attempts) > 0 
              THEN (SUM(ps.kills) - SUM(ps.attack_errors)) / SUM(ps.attack_attempts) * 100
              ELSE 0 
            END, 1
          ) as hitting_percentage,
          -- Service Percentage (team average)
          ROUND(
            CASE 
              WHEN (SUM(ps.serves) + SUM(ps.serve_errors)) > 0 
              THEN SUM(ps.serves) / (SUM(ps.serves) + SUM(ps.serve_errors)) * 100
              ELSE 0 
            END, 1
          ) as service_percentage,
          -- Reception Percentage (team average)
          ROUND(
            CASE 
              WHEN (SUM(ps.receptions) + SUM(ps.reception_errors)) > 0 
              THEN SUM(ps.receptions) / (SUM(ps.receptions) + SUM(ps.reception_errors)) * 100
              ELSE 0 
            END, 1
          ) as reception_percentage,
          -- Overall Score (team performance metric)
          ROUND(
            (SUM(ps.kills) + SUM(ps.blocks) + SUM(ps.volleyball_assists) + 
             SUM(ps.digs) + SUM(ps.service_aces) - 
             (SUM(ps.attack_errors) + SUM(ps.serve_errors) + SUM(ps.reception_errors))) / 
            NULLIF(COUNT(DISTINCT ps.match_id), 1), 1
          ) as overall_score,
          -- Win/Loss record
          (SELECT COUNT(*) FROM matches m 
           WHERE (m.team1_id = t.id OR m.team2_id = t.id) 
           AND m.winner_id = t.id 
           AND m.status = 'completed') as wins,
          (SELECT COUNT(*) FROM matches m 
           WHERE (m.team1_id = t.id OR m.team2_id = t.id) 
           AND m.winner_id != t.id 
           AND m.status = 'completed') as losses
        FROM teams t
        JOIN bracket_teams bt ON t.id = bt.team_id
        JOIN brackets b ON bt.bracket_id = b.id
        LEFT JOIN players p ON p.team_id = t.id
        LEFT JOIN player_stats ps ON ps.player_id = p.id
        LEFT JOIN matches m ON ps.match_id = m.id AND m.status = 'completed'
        WHERE b.event_id = ?
          ${bracketFilter}
        GROUP BY t.id, t.name, b.id, b.name
        HAVING games_played > 0
        ORDER BY overall_score DESC, kpg DESC, bpg DESC, apg DESC
      `;
    }
    
    const [teams] = await db.pool.query(query, queryParams);
    console.log(`Found ${teams.length} teams with statistics`);
    res.json(teams);
  } catch (err) {
    console.error("Error fetching team statistics:", err);
    res.status(500).json({ error: "Failed to fetch team statistics" });
  }
});

module.exports = router;