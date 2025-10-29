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

// Get existing stats for a match - UPDATED for individual error breakdown
router.get("/matches/:matchId/stats", async (req, res) => {
  try {
    const query = `
      SELECT 
        ps.*,
        p.name as player_name,
        p.position as player_position,
        t.name as team_name,
        COALESCE(ps.overtime_periods, 0) as overtime_periods,
        COALESCE(ps.overtime_two_points_made, '[]') as overtime_two_points_made,
        COALESCE(ps.overtime_three_points_made, '[]') as overtime_three_points_made,
        COALESCE(ps.overtime_free_throws_made, '[]') as overtime_free_throws_made,
        COALESCE(ps.overtime_assists, '[]') as overtime_assists,
        COALESCE(ps.overtime_rebounds, '[]') as overtime_rebounds,
        COALESCE(ps.overtime_steals, '[]') as overtime_steals,
        COALESCE(ps.overtime_blocks, '[]') as overtime_blocks,
        COALESCE(ps.overtime_fouls, '[]') as overtime_fouls,
        COALESCE(ps.overtime_turnovers, '[]') as overtime_turnovers
      FROM player_stats ps
      JOIN players p ON ps.player_id = p.id
      JOIN teams t ON p.team_id = t.id
      WHERE ps.match_id = ?
      ORDER BY t.name, p.name
    `;
    const [rows] = await db.pool.query(query, [req.params.matchId]);
    
    // Parse JSON overtime arrays
    const parsedRows = rows.map(row => ({
      ...row,
      overtime_two_points_made: JSON.parse(row.overtime_two_points_made),
      overtime_three_points_made: JSON.parse(row.overtime_three_points_made),
      overtime_free_throws_made: JSON.parse(row.overtime_free_throws_made),
      overtime_assists: JSON.parse(row.overtime_assists),
      overtime_rebounds: JSON.parse(row.overtime_rebounds),
      overtime_steals: JSON.parse(row.overtime_steals),
      overtime_blocks: JSON.parse(row.overtime_blocks),
      overtime_fouls: JSON.parse(row.overtime_fouls),
      overtime_turnovers: JSON.parse(row.overtime_turnovers)
    }));
    
    console.log(`Enhanced stats for match ${req.params.matchId}:`, parsedRows);
    res.json(parsedRows);
  } catch (err) {
    console.error("Error fetching match stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Enhanced Save stats for a match - UPDATED FOR VOLLEYBALL BLOCKS
router.post("/matches/:matchId/stats", async (req, res) => {
  const { players, team1_id, team2_id, awards = [] } = req.body;
  const matchId = req.params.matchId;

  console.log("Saving stats for match:", matchId);

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
    let team1RegulationTotal = 0;
    let team2RegulationTotal = 0;
    let team1OvertimeTotal = 0;
    let team2OvertimeTotal = 0;
    let overtimePeriods = 0;

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
        blocks = 0, // Basketball blocks
        fouls = 0,
        turnovers = 0,
        // Overtime stats
        overtime_periods = 0,
        overtime_two_points_made = [],
        overtime_three_points_made = [],
        overtime_free_throws_made = [],
        overtime_assists = [],
        overtime_rebounds = [],
        overtime_steals = [],
        overtime_blocks = [],
        overtime_fouls = [],
        overtime_turnovers = [],
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
        volleyball_blocks = 0, // Volleyball blocks (separate from basketball blocks)
      } = player;

      // Update overtime periods if this player has more
      overtimePeriods = Math.max(overtime_periods, overtimePeriods);

      await conn.query(
        `INSERT INTO player_stats 
        (match_id, player_id, points, assists, rebounds, two_points_made, three_points_made, free_throws_made, steals, blocks, fouls, turnovers,
         serves, service_aces, serve_errors, receptions, reception_errors, digs, kills, attack_attempts, attack_errors, volleyball_assists, volleyball_blocks,
         overtime_periods, overtime_two_points_made, overtime_three_points_made, overtime_free_throws_made, overtime_assists, overtime_rebounds,
         overtime_steals, overtime_blocks, overtime_fouls, overtime_turnovers) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          blocks, // Basketball blocks
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
          volleyball_blocks, // Volleyball blocks
          overtime_periods,
          JSON.stringify(overtime_two_points_made),
          JSON.stringify(overtime_three_points_made),
          JSON.stringify(overtime_free_throws_made),
          JSON.stringify(overtime_assists),
          JSON.stringify(overtime_rebounds),
          JSON.stringify(overtime_steals),
          JSON.stringify(overtime_blocks),
          JSON.stringify(overtime_fouls),
          JSON.stringify(overtime_turnovers)
        ]
      );

      // Calculate team totals based on sport type
      if (match.sport_type === 'basketball') {
        const scoringStat = points;
        if (team_id === team1_id) {
          team1Total += scoringStat;
          team1RegulationTotal += (two_points_made * 2) + (three_points_made * 3) + free_throws_made;
          const overtimePoints = (overtime_two_points_made.reduce((a, b) => a + b, 0) * 2) +
                               (overtime_three_points_made.reduce((a, b) => a + b, 0) * 3) +
                               overtime_free_throws_made.reduce((a, b) => a + b, 0);
          team1OvertimeTotal += overtimePoints;
        }
        if (team_id === team2_id) {
          team2Total += scoringStat;
          team2RegulationTotal += (two_points_made * 2) + (three_points_made * 3) + free_throws_made;
          const overtimePoints = (overtime_two_points_made.reduce((a, b) => a + b, 0) * 2) +
                               (overtime_three_points_made.reduce((a, b) => a + b, 0) * 3) +
                               overtime_free_throws_made.reduce((a, b) => a + b, 0);
          team2OvertimeTotal += overtimePoints;
        }
      } else {
        // Volleyball scoring: kills + aces + volleyball_blocks
        const scoringStat = kills + service_aces + volleyball_blocks;
        if (team_id === team1_id) {
          team1Total += scoringStat;
        }
        if (team_id === team2_id) {
          team2Total += scoringStat;
        }
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

    // UPDATE MATCH SCORES
    await conn.query(
      `UPDATE matches 
       SET score_team1 = ?, score_team2 = ?, overtime_periods = ?
       WHERE id = ?`,
      [team1Total, team2Total, overtimePeriods, matchId]
    );

    await conn.commit();
    console.log("Stats saved successfully:", { 
      team1Total, 
      team2Total,
      team1RegulationTotal,
      team2RegulationTotal, 
      team1OvertimeTotal,
      team2OvertimeTotal,
      overtimePeriods,
      matchId
    });
    
    res.json({ 
      message: "Stats saved successfully", 
      team1Total, 
      team2Total,
      regulation: {
        team1: team1RegulationTotal,
        team2: team2RegulationTotal
      },
      overtime: {
        team1: team1OvertimeTotal,
        team2: team2OvertimeTotal,
        periods: overtimePeriods
      }
    });
    
  } catch (err) {
    await conn.rollback();
    console.error("Error saving stats:", err);
    res.status(500).json({ error: "Failed to save stats: " + err.message });
  } finally {
    conn.release();
  }
});

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

// FIXED: Get comprehensive player statistics for an event - WITH BRACKET FILTERING AND CORRECTED EFFICIENCY
// UPDATED: Added individual error columns for volleyball
// FIXED: Get comprehensive player statistics for an event - WITH RECEPTIONS ADDED
router.get("/events/:eventId/players-statistics", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { bracketId } = req.query;
    
    console.log(`Fetching player statistics for event ${eventId}, bracket: ${bracketId || 'all'}`);
    
    const bracketFilter = bracketId ? 'AND b.id = ?' : '';
    const queryParams = bracketId ? [eventId, bracketId] : [eventId];
    
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
          ROUND(SUM(ps.points) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as ppg,
          ROUND(SUM(ps.rebounds) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as rpg,
          ROUND(SUM(ps.assists) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as apg,
          ROUND(SUM(ps.steals) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as spg,
          ROUND(SUM(ps.blocks) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as bpg,
          ROUND(SUM(ps.turnovers) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as tpg,
          ROUND(
            CASE 
              WHEN COUNT(DISTINCT ps.match_id) > 0 
              THEN (SUM(ps.points) / COUNT(DISTINCT ps.match_id)) / 2.5
              ELSE 0 
            END, 1
          ) as fg,
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
      // Volleyball - FIXED: Added receptions to the query
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
          -- TOTAL COUNTS including RECEPTIONS
          SUM(ps.kills) as kills,
          SUM(ps.volleyball_assists) as assists,
          SUM(ps.digs) as digs,
          SUM(ps.volleyball_blocks) as blocks,
          SUM(ps.service_aces) as service_aces,
          SUM(ps.receptions) as receptions,
          -- INDIVIDUAL ERROR COLUMNS
          SUM(ps.serve_errors) as serve_errors,
          SUM(ps.attack_errors) as attack_errors,
          SUM(ps.reception_errors) as reception_errors,
          -- Total counts for export
          SUM(ps.kills) as total_kills,
          SUM(ps.volleyball_assists) as total_volleyball_assists,
          SUM(ps.digs) as total_digs,
          SUM(ps.volleyball_blocks) as total_volleyball_blocks,
          SUM(ps.service_aces) as total_service_aces,
          SUM(ps.receptions) as total_receptions,
          -- Hitting Percentage
          ROUND(
            CASE 
              WHEN SUM(ps.attack_attempts) > 0 
              THEN (SUM(ps.kills) - SUM(ps.attack_errors)) / SUM(ps.attack_attempts) * 100
              ELSE 0 
            END, 1
          ) as hitting_percentage,
          -- Efficiency calculation
          ROUND(
            (SUM(ps.kills) + SUM(ps.volleyball_blocks) + SUM(ps.service_aces) + 
             SUM(ps.volleyball_assists) + SUM(ps.digs) - 
             (SUM(ps.serve_errors) + SUM(ps.attack_errors) + SUM(ps.reception_errors))) / 
            NULLIF(COUNT(DISTINCT ps.match_id), 0), 1
          ) as eff,
          -- Overall Score
          ROUND(
            (SUM(ps.kills) + SUM(ps.volleyball_blocks) + SUM(ps.service_aces) + 
             SUM(ps.volleyball_assists) + SUM(ps.digs) - 
             (SUM(ps.serve_errors) + SUM(ps.attack_errors) + SUM(ps.reception_errors))) / 
            NULLIF(COUNT(DISTINCT ps.match_id), 0), 1
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
        ORDER BY overall_score DESC, kills DESC, digs DESC, assists DESC
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

// FIXED: Get comprehensive team statistics for an event - WITH INDIVIDUAL ERROR COLUMNS FOR VOLLEYBALL
// FIXED: Get comprehensive team statistics for an event - WITH RECEPTIONS ADDED
router.get("/events/:eventId/teams-statistics", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { bracketId } = req.query;
    
    console.log(`Fetching team statistics for event ${eventId}, bracket: ${bracketId || 'all'}`);
    
    const bracketFilter = bracketId ? 'AND b.id = ?' : '';
    const queryParams = bracketId ? [eventId, bracketId] : [eventId];
    
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
          SUM(ps.points) as total_points,
          SUM(ps.assists) as total_assists,
          SUM(ps.rebounds) as total_rebounds,
          SUM(ps.steals) as total_steals,
          SUM(ps.blocks) as total_blocks,
          SUM(ps.three_points_made) as total_three_points,
          SUM(ps.turnovers) as total_turnovers,
          SUM(ps.fouls) as total_fouls,
          ROUND(SUM(ps.points) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as ppg,
          ROUND(SUM(ps.rebounds) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as rpg,
          ROUND(SUM(ps.assists) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as apg,
          ROUND(SUM(ps.steals) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as spg,
          ROUND(SUM(ps.blocks) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as bpg,
          ROUND(SUM(ps.turnovers) / NULLIF(COUNT(DISTINCT ps.match_id), 0), 1) as tpg,
          ROUND(
            AVG(
              CASE 
                WHEN ps.points > 0 
                THEN ps.points / 2.5
                ELSE 0 
              END
            ), 1
          ) as fg,
          ROUND(
            (SUM(ps.points) + SUM(ps.rebounds) + SUM(ps.assists) + 
             SUM(ps.steals) + SUM(ps.blocks) - SUM(ps.turnovers)) / 
            NULLIF(COUNT(DISTINCT ps.match_id), 1), 1
          ) as overall_score,
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
      // Volleyball - FIXED: Added receptions to the query
      query = `
        SELECT 
          t.id as team_id,
          t.name as team_name,
          b.id as bracket_id,
          b.name as bracket_name,
          '${sportType}' as sport_type,
          COUNT(DISTINCT ps.match_id) as games_played,
          -- TOTAL COUNTS including RECEPTIONS
          SUM(ps.kills) as kills,
          SUM(ps.volleyball_assists) as assists,
          SUM(ps.digs) as digs,
          SUM(ps.volleyball_blocks) as blocks,
          SUM(ps.service_aces) as service_aces,
          SUM(ps.receptions) as receptions,
          -- INDIVIDUAL ERROR COLUMNS
          SUM(ps.serve_errors) as serve_errors,
          SUM(ps.attack_errors) as attack_errors,
          SUM(ps.reception_errors) as reception_errors,
          -- Total counts for export
          SUM(ps.kills) as total_kills,
          SUM(ps.volleyball_assists) as total_volleyball_assists,
          SUM(ps.digs) as total_digs,
          SUM(ps.volleyball_blocks) as total_volleyball_blocks,
          SUM(ps.service_aces) as total_service_aces,
          SUM(ps.receptions) as total_receptions,
          -- Hitting Percentage
          ROUND(
            CASE 
              WHEN SUM(ps.attack_attempts) > 0 
              THEN (SUM(ps.kills) - SUM(ps.attack_errors)) / SUM(ps.attack_attempts) * 100
              ELSE 0 
            END, 1
          ) as hitting_percentage,
          -- Efficiency calculation
          ROUND(
            (SUM(ps.kills) + SUM(ps.volleyball_blocks) + SUM(ps.service_aces) + 
             SUM(ps.volleyball_assists) + SUM(ps.digs) - 
             (SUM(ps.serve_errors) + SUM(ps.attack_errors) + SUM(ps.reception_errors))) / 
            NULLIF(COUNT(DISTINCT ps.match_id), 0), 1
          ) as eff,
          -- Overall Score
          ROUND(
            (SUM(ps.kills) + SUM(ps.volleyball_blocks) + SUM(ps.service_aces) + 
             SUM(ps.volleyball_assists) + SUM(ps.digs) - 
             (SUM(ps.serve_errors) + SUM(ps.attack_errors) + SUM(ps.reception_errors))) / 
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
        ORDER BY overall_score DESC, kills DESC, digs DESC, assists DESC
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