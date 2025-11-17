const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { authenticateToken } = require("../routes/middleware/authMiddleware");

const normalizeArray = (value, length) => {
  let parsed = value;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch (err) {
      parsed = [];
    }
  } else if (typeof parsed === "number") {
    parsed = [parsed];
  }

  if (!Array.isArray(parsed)) {
    parsed = [];
  }

  const numbers = parsed.map((item) => Number(item) || 0);

  if (typeof length === "number") {
    const trimmed = numbers.slice(0, length);
    while (trimmed.length < length) {
      trimmed.push(0);
    }
    return trimmed;
  }

  return numbers;
};

const serializeArray = (value, length) => JSON.stringify(normalizeArray(value, length));

const sumNumbers = (arr) => normalizeArray(arr).reduce((total, num) => total + num, 0);

const getStatArray = (primary, fallback, length) => {
  if (Array.isArray(primary) && primary.length > 0) {
    return normalizeArray(primary, length);
  }
  if (primary !== undefined && primary !== null && typeof primary !== "object") {
    return normalizeArray(primary, length);
  }
  if (fallback !== undefined && fallback !== null) {
    return normalizeArray(fallback, length);
  }
  return normalizeArray([], length);
};

// Helper function to get player snapshot data
const getPlayerSnapshot = async (conn, playerId) => {
  try {
    const [playerDetails] = await conn.query(
      `SELECT p.name, p.jersey_number, p.position, t.name as team_name
       FROM players p
       JOIN teams t ON p.team_id = t.id
       WHERE p.id = ?`,
      [playerId]
    );
    
    if (playerDetails.length > 0) {
      return {
        name: playerDetails[0].name,
        jersey_number: playerDetails[0].jersey_number || 'N/A',
        position: playerDetails[0].position || 'Unknown',
        team_name: playerDetails[0].team_name
      };
    }
  } catch (err) {
    console.error('Error fetching player snapshot:', err);
  }
  
  return {
    name: 'Unknown Player',
    jersey_number: 'N/A',
    position: 'Unknown',
    team_name: 'Unknown Team'
  };
};

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
      SELECT b.*, b.event_id, COUNT(bt.team_id) as team_count 
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
        m.last_updated_by,      -- ⭐ ADD THIS LINE
        m.last_updated_at,      -- ⭐ ADD THIS LINE
        m.last_updated_role,    -- ⭐ ADD THIS LINE
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

// Get existing stats for a match - UPDATED with snapshot support
router.get("/matches/:matchId/stats", async (req, res) => {
  try {
    const query = `
      SELECT 
        ps.*,
        COALESCE(p.name, ps.player_name_snapshot, 'Deleted Player') as player_name,
        COALESCE(p.position, ps.player_position_snapshot, 'Unknown') as player_position,
        COALESCE(p.jersey_number, ps.player_jersey_snapshot, 'N/A') as jersey_number,
        COALESCE(t.name, ps.team_name_snapshot, 'Unknown Team') as team_name,
        COALESCE(ps.overtime_periods, 0) as overtime_periods,
        COALESCE(ps.overtime_two_points_made, '[]') as overtime_two_points_made,
        COALESCE(ps.overtime_three_points_made, '[]') as overtime_three_points_made,
        COALESCE(ps.overtime_free_throws_made, '[]') as overtime_free_throws_made,
        COALESCE(ps.overtime_assists, '[]') as overtime_assists,
        COALESCE(ps.overtime_rebounds, '[]') as overtime_rebounds,
        COALESCE(ps.overtime_steals, '[]') as overtime_steals,
        COALESCE(ps.overtime_blocks, '[]') as overtime_blocks,
        COALESCE(ps.overtime_fouls, '[]') as overtime_fouls,
        COALESCE(ps.overtime_turnovers, '[]') as overtime_turnovers,
        COALESCE(ps.overtime_technical_fouls, '[]') as overtime_technical_fouls,
        COALESCE(ps.two_points_made_per_quarter, '[]') as two_points_made_per_quarter,
        COALESCE(ps.three_points_made_per_quarter, '[]') as three_points_made_per_quarter,
        COALESCE(ps.free_throws_made_per_quarter, '[]') as free_throws_made_per_quarter,
        COALESCE(ps.assists_per_quarter, '[]') as assists_per_quarter,
        COALESCE(ps.rebounds_per_quarter, '[]') as rebounds_per_quarter,
        COALESCE(ps.steals_per_quarter, '[]') as steals_per_quarter,
        COALESCE(ps.blocks_per_quarter, '[]') as blocks_per_quarter,
        COALESCE(ps.fouls_per_quarter, '[]') as fouls_per_quarter,
        COALESCE(ps.technical_fouls_per_quarter, '[]') as technical_fouls_per_quarter,
        COALESCE(ps.turnovers_per_quarter, '[]') as turnovers_per_quarter,
        COALESCE(ps.kills_per_set, '[]') as kills_per_set,
        COALESCE(ps.attack_attempts_per_set, '[]') as attack_attempts_per_set,
        COALESCE(ps.attack_errors_per_set, '[]') as attack_errors_per_set,
        COALESCE(ps.serves_per_set, '[]') as serves_per_set,
        COALESCE(ps.service_aces_per_set, '[]') as service_aces_per_set,
        COALESCE(ps.serve_errors_per_set, '[]') as serve_errors_per_set,
        COALESCE(ps.receptions_per_set, '[]') as receptions_per_set,
        COALESCE(ps.reception_errors_per_set, '[]') as reception_errors_per_set,
        COALESCE(ps.digs_per_set, '[]') as digs_per_set,
        COALESCE(ps.volleyball_assists_per_set, '[]') as volleyball_assists_per_set,
        COALESCE(ps.volleyball_blocks_per_set, '[]') as volleyball_blocks_per_set,
        COALESCE(ps.assist_errors_per_set, '[]') as assist_errors_per_set,
        COALESCE(ps.assist_errors, 0) as assist_errors
      FROM player_stats ps
      LEFT JOIN players p ON ps.player_id = p.id
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE ps.match_id = ?
      ORDER BY COALESCE(t.name, ps.team_name_snapshot), COALESCE(p.name, ps.player_name_snapshot)
    `;
    const [rows] = await db.pool.query(query, [req.params.matchId]);
    
    // Parse JSON overtime arrays
    const parsedRows = rows.map((row) => {
      const overtimeTwoPoints = normalizeArray(row.overtime_two_points_made);
      const overtimeThreePoints = normalizeArray(row.overtime_three_points_made);
      const overtimeFreeThrows = normalizeArray(row.overtime_free_throws_made);
      const overtimeAssists = normalizeArray(row.overtime_assists);
      const overtimeRebounds = normalizeArray(row.overtime_rebounds);
      const overtimeSteals = normalizeArray(row.overtime_steals);
      const overtimeBlocks = normalizeArray(row.overtime_blocks);
      const overtimeFouls = normalizeArray(row.overtime_fouls);
      const overtimeTurnovers = normalizeArray(row.overtime_turnovers);
      const overtimeTechnicalFouls = normalizeArray(row.overtime_technical_fouls);

      return {
        ...row,
        overtime_two_points_made: overtimeTwoPoints,
        overtime_three_points_made: overtimeThreePoints,
        overtime_free_throws_made: overtimeFreeThrows,
        overtime_assists: overtimeAssists,
        overtime_rebounds: overtimeRebounds,
        overtime_steals: overtimeSteals,
        overtime_blocks: overtimeBlocks,
        overtime_fouls: overtimeFouls,
        overtime_turnovers: overtimeTurnovers,
        overtime_technical_fouls: overtimeTechnicalFouls,
        two_points_made_per_quarter: normalizeArray(row.two_points_made_per_quarter, 4),
        three_points_made_per_quarter: normalizeArray(row.three_points_made_per_quarter, 4),
        free_throws_made_per_quarter: normalizeArray(row.free_throws_made_per_quarter, 4),
        assists_per_quarter: normalizeArray(row.assists_per_quarter, 4),
        rebounds_per_quarter: normalizeArray(row.rebounds_per_quarter, 4),
        steals_per_quarter: normalizeArray(row.steals_per_quarter, 4),
        blocks_per_quarter: normalizeArray(row.blocks_per_quarter, 4),
        fouls_per_quarter: normalizeArray(row.fouls_per_quarter, 4),
        technical_fouls_per_quarter: normalizeArray(row.technical_fouls_per_quarter, 4),
        turnovers_per_quarter: normalizeArray(row.turnovers_per_quarter, 4),
        kills_per_set: normalizeArray(row.kills_per_set, 5),
        attack_attempts_per_set: normalizeArray(row.attack_attempts_per_set, 5),
        attack_errors_per_set: normalizeArray(row.attack_errors_per_set, 5),
        serves_per_set: normalizeArray(row.serves_per_set, 5),
        service_aces_per_set: normalizeArray(row.service_aces_per_set, 5),
        serve_errors_per_set: normalizeArray(row.serve_errors_per_set, 5),
        receptions_per_set: normalizeArray(row.receptions_per_set, 5),
        reception_errors_per_set: normalizeArray(row.reception_errors_per_set, 5),
        digs_per_set: normalizeArray(row.digs_per_set, 5),
        volleyball_assists_per_set: normalizeArray(row.volleyball_assists_per_set, 5),
        volleyball_blocks_per_set: normalizeArray(row.volleyball_blocks_per_set, 5),
        assist_errors_per_set: normalizeArray(row.assist_errors_per_set, 5)
      };
    });
    
    console.log(`Enhanced stats for match ${req.params.matchId}:`, parsedRows);
    res.json(parsedRows);
  } catch (err) {
    console.error("Error fetching match stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Enhanced Save stats for a match - UPDATED with snapshot support
router.post("/matches/:matchId/stats", authenticateToken, async (req, res) => {
  const { players, team1_id, team2_id, awards = [] } = req.body;
  const matchId = req.params.matchId;

  console.log("Saving stats for match:", matchId);
  console.log("Request body keys:", Object.keys(req.body));
  console.log("Players count:", players?.length || 0);
  console.log("Team1 ID:", team1_id, "Team2 ID:", team2_id);
  
  // Validate required fields
  if (!players || !Array.isArray(players) || players.length === 0) {
    console.error("Invalid players data:", players);
    return res.status(400).json({ error: "Players data is required and must be an array" });
  }
  
  if (!team1_id || !team2_id) {
    console.error("Missing team IDs:", { team1_id, team2_id });
    return res.status(400).json({ error: "Both team1_id and team2_id are required" });
  }
  
  // Log first player structure for debugging
  if (players.length > 0) {
    console.log("First player sample:", {
      player_id: players[0].player_id,
      team_id: players[0].team_id,
      has_assists: 'assists' in players[0],
      has_assists_per_quarter: 'assists_per_quarter' in players[0],
      has_rebounds: 'rebounds' in players[0],
      has_rebounds_per_quarter: 'rebounds_per_quarter' in players[0],
      keys: Object.keys(players[0])
    });
  }

  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();


  // ⭐ ADD THIS: Get user info from session/token
  const username = req.user?.username || 'Unknown User';
const userRole = req.user?.role || 'staff';
    console.log("User updating stats:", { username, userRole });
    
    

    // Get match details first to know the bracket and round info
    const [matchDetails] = await conn.query(
      `SELECT m.*, b.elimination_type, b.sport_type, b.event_id 
       FROM matches m 
       JOIN brackets b ON m.bracket_id = b.id 
       WHERE m.id = ?`, 
      [matchId]
    );

    if (matchDetails.length === 0) {
      throw new Error("Match not found");
    }

    const match = matchDetails[0];
    const eventId = match.event_id;

    console.log("Match details:", match);
    console.log("Event ID:", eventId);

    // Validate eventId
    if (!eventId) {
      throw new Error("Event ID is missing from match data");
    }

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
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const playerId = player.player_id;
      const teamId = player.team_id;

      if (!playerId || !teamId) {
        console.warn(`Skipping player ${i}: missing player_id or team_id`, { playerId, teamId });
        continue;
      }
      
      try {
        // Get player snapshot data
        const playerSnapshot = await getPlayerSnapshot(conn, playerId);

        const twoPointsPerQuarter = getStatArray(player.two_points_made_per_quarter, player.two_points_made, 4);
        const threePointsPerQuarter = getStatArray(player.three_points_made_per_quarter, player.three_points_made, 4);
        const freeThrowsPerQuarter = getStatArray(player.free_throws_made_per_quarter, player.free_throws_made, 4);
        const assistsPerQuarter = getStatArray(player.assists_per_quarter, player.assists, 4);
        const reboundsPerQuarter = getStatArray(player.rebounds_per_quarter, player.rebounds, 4);
        const stealsPerQuarter = getStatArray(player.steals_per_quarter, player.steals, 4);
        const blocksPerQuarter = getStatArray(player.blocks_per_quarter, player.blocks, 4);
        const foulsPerQuarter = getStatArray(player.fouls_per_quarter, player.fouls, 4);
        const technicalFoulsPerQuarter = getStatArray(player.technical_fouls_per_quarter, player.technical_fouls, 4);
        const turnoversPerQuarter = getStatArray(player.turnovers_per_quarter, player.turnovers, 4);

        const overtimeTwoPoints = normalizeArray(player.overtime_two_points_made);
        const overtimeThreePoints = normalizeArray(player.overtime_three_points_made);
        const overtimeFreeThrows = normalizeArray(player.overtime_free_throws_made);
        const overtimeAssists = normalizeArray(player.overtime_assists);
        const overtimeRebounds = normalizeArray(player.overtime_rebounds);
        const overtimeSteals = normalizeArray(player.overtime_steals);
        const overtimeBlocks = normalizeArray(player.overtime_blocks);
        const overtimeFouls = normalizeArray(player.overtime_fouls);
        const overtimeTechnicalFouls = normalizeArray(player.overtime_technical_fouls);
        const overtimeTurnovers = normalizeArray(player.overtime_turnovers);

        const killsPerSet = getStatArray(player.kills_per_set, player.kills, 5);
        const attackAttemptsPerSet = getStatArray(player.attack_attempts_per_set, player.attack_attempts, 5);
        const attackErrorsPerSet = getStatArray(player.attack_errors_per_set, player.attack_errors, 5);
        const servesPerSet = getStatArray(player.serves_per_set, player.serves, 5);
        const serviceAcesPerSet = getStatArray(player.service_aces_per_set, player.service_aces, 5);
        const serveErrorsPerSet = getStatArray(player.serve_errors_per_set, player.serve_errors, 5);
        const receptionsPerSet = getStatArray(player.receptions_per_set, player.receptions, 5);
        const receptionErrorsPerSet = getStatArray(player.reception_errors_per_set, player.reception_errors, 5);
        const digsPerSet = getStatArray(player.digs_per_set, player.digs, 5);
        const volleyballAssistsPerSet = getStatArray(player.volleyball_assists_per_set, player.volleyball_assists, 5);
        const volleyballBlocksPerSet = getStatArray(player.volleyball_blocks_per_set, player.volleyball_blocks, 5);
        const assistErrorsPerSet = getStatArray(player.assist_errors_per_set, player.assist_errors, 5);
        // ADD THESE TWO LINES:
const blockingErrorsPerSet = getStatArray(player.blocking_errors_per_set, player.blocking_errors, 5);
        const ballHandlingErrorsPerSet = getStatArray(player.ball_handling_errors_per_set, player.ball_handling_errors, 5);
        
        

        const regulationTwoPointsTotal = sumNumbers(twoPointsPerQuarter);
        const regulationThreePointsTotal = sumNumbers(threePointsPerQuarter);
        const regulationFreeThrowsTotal = sumNumbers(freeThrowsPerQuarter);
        const regulationAssistsTotal = sumNumbers(assistsPerQuarter);
        const regulationReboundsTotal = sumNumbers(reboundsPerQuarter);
        const regulationStealsTotal = sumNumbers(stealsPerQuarter);
        const regulationBlocksTotal = sumNumbers(blocksPerQuarter);
        const regulationFoulsTotal = sumNumbers(foulsPerQuarter);
        const regulationTechnicalFoulsTotal = sumNumbers(technicalFoulsPerQuarter);
        const regulationTurnoversTotal = sumNumbers(turnoversPerQuarter);

        const overtimeTwoPointsTotal = sumNumbers(overtimeTwoPoints);
        const overtimeThreePointsTotal = sumNumbers(overtimeThreePoints);
        const overtimeFreeThrowsTotal = sumNumbers(overtimeFreeThrows);
        const overtimeAssistsTotal = sumNumbers(overtimeAssists);
        const overtimeReboundsTotal = sumNumbers(overtimeRebounds);
        const overtimeStealsTotal = sumNumbers(overtimeSteals);
        const overtimeBlocksTotal = sumNumbers(overtimeBlocks);
        const overtimeFoulsTotal = sumNumbers(overtimeFouls);
        const overtimeTechnicalFoulsTotal = sumNumbers(overtimeTechnicalFouls);
        const overtimeTurnoversTotal = sumNumbers(overtimeTurnovers);

        const totalTwoPointsMade = regulationTwoPointsTotal + overtimeTwoPointsTotal;
        const totalThreePointsMade = regulationThreePointsTotal + overtimeThreePointsTotal;
        const totalFreeThrowsMade = regulationFreeThrowsTotal + overtimeFreeThrowsTotal;
        const totalAssists = regulationAssistsTotal + overtimeAssistsTotal;
        const totalRebounds = regulationReboundsTotal + overtimeReboundsTotal;
        const totalSteals = regulationStealsTotal + overtimeStealsTotal;
        const totalBlocks = regulationBlocksTotal + overtimeBlocksTotal;
        const totalFouls = regulationFoulsTotal + overtimeFoulsTotal;
        const totalTechnicalFouls = regulationTechnicalFoulsTotal + overtimeTechnicalFoulsTotal;
        const totalTurnovers = regulationTurnoversTotal + overtimeTurnoversTotal;

        const totalKills = sumNumbers(killsPerSet);
        const totalAttackAttempts = sumNumbers(attackAttemptsPerSet);
        const totalAttackErrors = sumNumbers(attackErrorsPerSet);
        const totalServes = sumNumbers(servesPerSet);
        const totalServiceAces = sumNumbers(serviceAcesPerSet);
        const totalServeErrors = sumNumbers(serveErrorsPerSet);
        const totalReceptions = sumNumbers(receptionsPerSet);
        const totalReceptionErrors = sumNumbers(receptionErrorsPerSet);
        const totalDigs = sumNumbers(digsPerSet);
        const totalVolleyballAssists = sumNumbers(volleyballAssistsPerSet);
        const totalVolleyballBlocks = sumNumbers(volleyballBlocksPerSet);
        const totalAssistErrors = sumNumbers(assistErrorsPerSet);
        const totalBlockingErrors = sumNumbers(blockingErrorsPerSet);
const totalBallHandlingErrors = sumNumbers(ballHandlingErrorsPerSet);

        const regulationPointsForPlayer = (regulationTwoPointsTotal * 2) + (regulationThreePointsTotal * 3) + regulationFreeThrowsTotal;
        const overtimePointsForPlayer = (overtimeTwoPointsTotal * 2) + (overtimeThreePointsTotal * 3) + overtimeFreeThrowsTotal;
        const totalPointsForPlayer = regulationPointsForPlayer + overtimePointsForPlayer;

        const playerOvertimePeriods = Math.max(
          Number(player.overtime_periods) || 0,
          overtimeTwoPoints.length,
          overtimeThreePoints.length,
          overtimeFreeThrows.length,
          overtimeAssists.length,
          overtimeRebounds.length,
          overtimeSteals.length,
          overtimeBlocks.length,
          overtimeFouls.length,
          overtimeTechnicalFouls.length,
          overtimeTurnovers.length
        );

        overtimePeriods = Math.max(overtimePeriods, playerOvertimePeriods);


        // UPDATED INSERT query with snapshot columns
 const insertQuery = `
  INSERT INTO player_stats (
    event_id,
    match_id, 
    player_id,
    points, 
    assists, 
    rebounds, 
    three_points_made, 
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
    assist_errors, 
    ball_handling_errors, 
    two_points_made, 
    free_throws_made, 
    overtime_periods, 
    overtime_two_points_made, 
    overtime_three_points_made, 
    overtime_free_throws_made, 
    overtime_assists, 
    overtime_rebounds, 
    overtime_steals, 
    overtime_blocks, 
    overtime_fouls, 
    overtime_turnovers, 
    volleyball_blocks, 
    blocking_errors, 
    technical_fouls,
    two_points_made_per_quarter, 
    three_points_made_per_quarter, 
    free_throws_made_per_quarter,
    assists_per_quarter, 
    rebounds_per_quarter, 
    steals_per_quarter, 
    blocks_per_quarter,
    fouls_per_quarter, 
    technical_fouls_per_quarter, 
    turnovers_per_quarter,
    kills_per_set, 
    attack_attempts_per_set, 
    attack_errors_per_set, 
    serves_per_set,
    service_aces_per_set, 
    serve_errors_per_set, 
    receptions_per_set, 
    reception_errors_per_set,
    digs_per_set, 
    volleyball_assists_per_set, 
    volleyball_blocks_per_set, 
    blocking_errors_per_set,
    assist_errors_per_set,
    ball_handling_errors_per_set,
    overtime_technical_fouls,
    player_name_snapshot,
    player_jersey_snapshot,
    player_position_snapshot,
    team_name_snapshot
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;


const insertValues = [
  eventId,
  matchId,
  playerId,
  totalPointsForPlayer,
  totalAssists,
  totalRebounds,
  totalThreePointsMade,
  totalSteals,
  totalBlocks,
  totalFouls,
  totalTurnovers,
  totalServes,
  totalServiceAces,
  totalServeErrors,
  totalReceptions,
  totalReceptionErrors,
  totalDigs,
  totalKills,
  totalAttackAttempts,
  totalAttackErrors,
  totalVolleyballAssists,
  totalAssistErrors,
  totalBallHandlingErrors,
  totalTwoPointsMade,
  totalFreeThrowsMade,
  playerOvertimePeriods,
  serializeArray(overtimeTwoPoints),
  serializeArray(overtimeThreePoints),
  serializeArray(overtimeFreeThrows),
  serializeArray(overtimeAssists),
  serializeArray(overtimeRebounds),
  serializeArray(overtimeSteals),
  serializeArray(overtimeBlocks),
  serializeArray(overtimeFouls),
  serializeArray(overtimeTurnovers),
  totalVolleyballBlocks,
  totalBlockingErrors,
  totalTechnicalFouls,
  serializeArray(twoPointsPerQuarter, 4),
  serializeArray(threePointsPerQuarter, 4),
  serializeArray(freeThrowsPerQuarter, 4),
  serializeArray(assistsPerQuarter, 4),
  serializeArray(reboundsPerQuarter, 4),
  serializeArray(stealsPerQuarter, 4),
  serializeArray(blocksPerQuarter, 4),
  serializeArray(foulsPerQuarter, 4),
  serializeArray(technicalFoulsPerQuarter, 4),
  serializeArray(turnoversPerQuarter, 4),
  serializeArray(killsPerSet, 5),
  serializeArray(attackAttemptsPerSet, 5),
  serializeArray(attackErrorsPerSet, 5),
  serializeArray(servesPerSet, 5),
  serializeArray(serviceAcesPerSet, 5),
  serializeArray(serveErrorsPerSet, 5),
  serializeArray(receptionsPerSet, 5),
  serializeArray(receptionErrorsPerSet, 5),
  serializeArray(digsPerSet, 5),
  serializeArray(volleyballAssistsPerSet, 5),
  serializeArray(volleyballBlocksPerSet, 5),
  serializeArray(blockingErrorsPerSet, 5),
  serializeArray(assistErrorsPerSet, 5),
  serializeArray(ballHandlingErrorsPerSet, 5),
  serializeArray(overtimeTechnicalFouls),
  playerSnapshot.name,
  playerSnapshot.jersey_number,
  playerSnapshot.position,
  playerSnapshot.team_name
];
        try {
          await conn.query(insertQuery, insertValues);
          console.log(`Successfully saved stats for player ${playerId} (index ${i})`);
        } catch (insertErr) {
          console.error(`INSERT Error for player ${i} (ID: ${playerId}):`, {
            code: insertErr.code,
            errno: insertErr.errno,
            sqlMessage: insertErr.sqlMessage,
            sqlState: insertErr.sqlState,
            sql: insertQuery.substring(0, 200) + '...',
            valuesCount: insertValues.length,
            message: insertErr.message,
            stack: insertErr.stack
          });
          
          // Log the first few values to help debug
          console.error('First 10 values:', insertValues.slice(0, 10));
          console.error('Sample JSON values:', {
            overtimeTwoPoints: serializeArray(overtimeTwoPoints),
            killsPerSet: serializeArray(killsPerSet, 5),
            twoPointsPerQuarter: serializeArray(twoPointsPerQuarter, 4)
          });
          
          throw insertErr;
        }

        if (match.sport_type === 'basketball') {
          if (teamId === team1_id) {
            team1Total += totalPointsForPlayer;
            team1RegulationTotal += regulationPointsForPlayer;
            team1OvertimeTotal += overtimePointsForPlayer;
          } else if (teamId === team2_id) {
            team2Total += totalPointsForPlayer;
            team2RegulationTotal += regulationPointsForPlayer;
            team2OvertimeTotal += overtimePointsForPlayer;
          }
        } else {
          const positiveScoring = totalKills + totalServiceAces + totalVolleyballBlocks;
          if (teamId === team1_id) {
            team1Total += positiveScoring;
          } else if (teamId === team2_id) {
            team2Total += positiveScoring;
          }
        }
      } catch (playerErr) {
        console.error(`Error processing player ${i} (ID: ${playerId}):`, playerErr);
        throw new Error(`Error processing player ${playerId}: ${playerErr.message}`);
      }
    }

    // Save match awards if provided - UPDATED with snapshot support
    for (const award of awards) {
      if (award.player_id && award.award_type) {
        // Fetch player details for snapshot
        const playerSnapshot = await getPlayerSnapshot(conn, award.player_id);
        
        await conn.query(
          `INSERT INTO match_awards (
            match_id, 
            player_id, 
            player_name_snapshot,
            team_name_snapshot,
            award_type
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            matchId, 
            award.player_id,
            playerSnapshot.name,
            playerSnapshot.team_name,
            award.award_type
          ]
        );
      }
    }

    // UPDATE MATCH SCORES
    // ⭐ UPDATE MATCH SCORES WITH USER INFO
await conn.query(
  `UPDATE matches 
   SET score_team1 = ?, 
       score_team2 = ?, 
       overtime_periods = ?,
       last_updated_by = ?,
       last_updated_at = NOW(),
       last_updated_role = ?
   WHERE id = ?`,
  [team1Total, team2Total, overtimePeriods, username, userRole, matchId]
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
  matchId,
  updatedBy: username,  // ⭐ ADD THIS
  role: userRole        // ⭐ ADD THIS
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
    console.error("Error details:", {
      code: err.code,
      sqlMessage: err.sqlMessage,
      sql: err.sql,
      message: err.message
    });
    
    // Provide more helpful error message
    let errorMessage = "Failed to save stats: " + err.message;
    if (err.code === 'ER_BAD_FIELD_ERROR' || err.message.includes('Unknown column')) {
      errorMessage += "\n\nSome database columns may be missing. Please run the database migration to add the required columns (two_points_made_per_quarter, kills_per_set, etc.).";
    }
    
    res.status(500).json({ error: errorMessage });
  } finally {
    conn.release();
  }
});

// Get match awards - UPDATED with snapshot support
router.get("/matches/:matchId/awards", async (req, res) => {
  try {
    const [rows] = await db.pool.query(
      `SELECT 
        ma.*,
        COALESCE(p.name, ma.player_name_snapshot, 'Deleted Player') as player_name,
        COALESCE(t.name, ma.team_name_snapshot, 'Unknown Team') as team_name
       FROM match_awards ma
       LEFT JOIN players p ON ma.player_id = p.id
       LEFT JOIN teams t ON p.team_id = t.id
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

// Get player statistics summary for a match or event - UPDATED to include assist_errors
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
        END as reception_percentage,
        -- Calculate assist percentage
        CASE 
          WHEN (ps.volleyball_assists + ps.assist_errors) > 0 
          THEN ROUND(ps.volleyball_assists / (ps.volleyball_assists + ps.assist_errors) * 100, 2)
          ELSE 0 
        END as assist_percentage
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

// UPDATED: Get event statistics - WITH assist_errors included
router.get("/events/:eventId/statistics", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { bracketId } = req.query;
    
    console.log(`Fetching statistics for event ${eventId}, bracket: ${bracketId || 'all'}`);
    
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
    
    // Get average statistics for the event/bracket - UPDATED to include assist_errors
    const [avgStatsResult] = await db.pool.query(`
      SELECT 
        ROUND(AVG(ps.points), 1) as avg_ppg,
        ROUND(AVG(ps.rebounds), 1) as avg_rpg,
        ROUND(AVG(ps.assists), 1) as avg_apg,
        ROUND(AVG(ps.blocks), 1) as avg_bpg,
        ROUND(AVG(ps.kills), 1) as avg_kills,
        ROUND(AVG(ps.digs), 1) as avg_digs,
        ROUND(AVG(ps.serve_errors + ps.attack_errors + ps.reception_errors + COALESCE(ps.assist_errors, 0)), 1) as avg_total_errors,
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
      avg_kills: avgStatsResult[0]?.avg_kills || 0,
      avg_digs: avgStatsResult[0]?.avg_digs || 0,
      avg_total_errors: avgStatsResult[0]?.avg_total_errors || 0,
      avg_hitting_percentage: avgStatsResult[0]?.avg_hitting_percentage || 0
    };
    
    console.log(`Statistics result:`, statistics);
    res.json(statistics);
  } catch (err) {
    console.error("Error fetching event statistics:", err);
    res.status(500).json({ error: "Failed to fetch event statistics" });
  }
});
// GET comprehensive player statistics - FIXED to show deleted players
router.get("/events/:eventId/players-statistics", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { bracketId } = req.query;
    
    console.log(`Fetching player statistics for event ${eventId}, bracket: ${bracketId || 'all'}`);
    
    if (!bracketId) {
      return res.status(400).json({ 
        error: "bracketId is required for player statistics" 
      });
    }
    
    // Get sport type for the specific bracket
    const [sportTypeResult] = await db.pool.query(
      `SELECT DISTINCT b.sport_type 
       FROM brackets b 
       WHERE b.event_id = ? AND b.id = ?
       LIMIT 1`,
      [eventId, bracketId]
    );
    
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
          COALESCE(p.id, ps.player_id) as id,
          COALESCE(p.name, ps.player_name_snapshot) as name,
          COALESCE(p.jersey_number, ps.player_jersey_snapshot) as jersey_number,
          COALESCE(p.position, ps.player_position_snapshot) as position,
          COALESCE(t.name, ps.team_name_snapshot) as team_name,
          b.id as bracket_id,
          b.name as bracket_name,
          '${sportType}' as sport_type,
          COUNT(DISTINCT CASE 
            WHEN m.bracket_id = ? AND m.status = 'completed' 
            THEN ps.match_id 
          END) as games_played,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.points ELSE 0 END), 0) as total_points,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.assists ELSE 0 END), 0) as total_assists,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.rebounds ELSE 0 END), 0) as total_rebounds,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.steals ELSE 0 END), 0) as total_steals,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.blocks ELSE 0 END), 0) as total_blocks,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.three_points_made ELSE 0 END), 0) as total_three_points,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.turnovers ELSE 0 END), 0) as total_turnovers,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.fouls ELSE 0 END), 0) as total_fouls,
          ROUND(COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.points ELSE 0 END), 0) / 
            NULLIF(COUNT(DISTINCT CASE WHEN m.bracket_id = ? AND m.status = 'completed' THEN ps.match_id END), 0), 1) as ppg,
          ROUND(COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.rebounds ELSE 0 END), 0) / 
            NULLIF(COUNT(DISTINCT CASE WHEN m.bracket_id = ? AND m.status = 'completed' THEN ps.match_id END), 0), 1) as rpg,
          ROUND(COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.assists ELSE 0 END), 0) / 
            NULLIF(COUNT(DISTINCT CASE WHEN m.bracket_id = ? AND m.status = 'completed' THEN ps.match_id END), 0), 1) as apg,
          ROUND(COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.steals ELSE 0 END), 0) / 
            NULLIF(COUNT(DISTINCT CASE WHEN m.bracket_id = ? AND m.status = 'completed' THEN ps.match_id END), 0), 1) as spg,
          ROUND(COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.blocks ELSE 0 END), 0) / 
            NULLIF(COUNT(DISTINCT CASE WHEN m.bracket_id = ? AND m.status = 'completed' THEN ps.match_id END), 0), 1) as bpg,
          ROUND(COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.turnovers ELSE 0 END), 0) / 
            NULLIF(COUNT(DISTINCT CASE WHEN m.bracket_id = ? AND m.status = 'completed' THEN ps.match_id END), 0), 1) as tpg,
          ROUND(
            CASE 
              WHEN COUNT(DISTINCT CASE WHEN m.bracket_id = ? AND m.status = 'completed' THEN ps.match_id END) > 0 
              THEN (COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.points ELSE 0 END), 0) / 
                    COUNT(DISTINCT CASE WHEN m.bracket_id = ? AND m.status = 'completed' THEN ps.match_id END)) / 2.5
              ELSE 0 
            END, 1
          ) as fg,
          ROUND(
            (COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.points ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.rebounds ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.assists ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.steals ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.blocks ELSE 0 END), 0) - 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.turnovers ELSE 0 END), 0)) / 
            NULLIF(COUNT(DISTINCT CASE WHEN m.bracket_id = ? AND m.status = 'completed' THEN ps.match_id END), 0), 1
          ) as overall_score,
          CASE WHEN p.id IS NULL THEN 1 ELSE 0 END as is_deleted
        FROM player_stats ps
        INNER JOIN matches m ON ps.match_id = m.id
        INNER JOIN brackets b ON m.bracket_id = b.id
        LEFT JOIN players p ON ps.player_id = p.id
        LEFT JOIN teams t ON p.team_id = t.id
        WHERE b.event_id = ?
          AND b.id = ?
          AND ps.event_id = ?
        GROUP BY 
          COALESCE(p.id, ps.player_id),
          COALESCE(p.name, ps.player_name_snapshot),
          COALESCE(p.jersey_number, ps.player_jersey_snapshot),
          COALESCE(p.position, ps.player_position_snapshot),
          COALESCE(t.name, ps.team_name_snapshot),
          b.id, 
          b.name,
          p.id
        HAVING games_played > 0
        ORDER BY overall_score DESC, ppg DESC, rpg DESC, apg DESC
      `;
      
      const params = [
        bracketId, // games_played
        bracketId, // total_points
        bracketId, // total_assists
        bracketId, // total_rebounds
        bracketId, // total_steals
        bracketId, // total_blocks
        bracketId, // total_three_points
        bracketId, // total_turnovers
        bracketId, // total_fouls
        bracketId, bracketId, // ppg
        bracketId, bracketId, // rpg
        bracketId, bracketId, // apg
        bracketId, bracketId, // spg
        bracketId, bracketId, // bpg
        bracketId, bracketId, // tpg
        bracketId, bracketId, bracketId, // fg
        bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, // overall_score
        eventId,   // WHERE b.event_id
        bracketId, // WHERE b.id
        eventId    // WHERE ps.event_id
      ];
      
      const [players] = await db.pool.query(query, params);
      console.log(`Found ${players.length} players with statistics`);
      res.json(players);
      
    } else {
      // Volleyball - Same pattern
      query = `
        SELECT 
          COALESCE(p.id, ps.player_id) as id,
          COALESCE(p.name, ps.player_name_snapshot) as name,
          COALESCE(p.jersey_number, ps.player_jersey_snapshot) as jersey_number,
          COALESCE(p.position, ps.player_position_snapshot) as position,
          COALESCE(t.name, ps.team_name_snapshot) as team_name,
          b.id as bracket_id,
          b.name as bracket_name,
          '${sportType}' as sport_type,
          COUNT(DISTINCT CASE 
            WHEN m.bracket_id = ? AND m.status = 'completed' 
            THEN ps.match_id 
          END) as games_played,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.kills ELSE 0 END), 0) as kills,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.volleyball_assists ELSE 0 END), 0) as assists,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.digs ELSE 0 END), 0) as digs,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.volleyball_blocks ELSE 0 END), 0) as blocks,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.service_aces ELSE 0 END), 0) as service_aces,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.receptions ELSE 0 END), 0) as receptions,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.serve_errors ELSE 0 END), 0) as serve_errors,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.attack_errors ELSE 0 END), 0) as attack_errors,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.reception_errors ELSE 0 END), 0) as reception_errors,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN COALESCE(ps.assist_errors, 0) ELSE 0 END), 0) as assist_errors,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN COALESCE(ps.blocking_errors, 0) ELSE 0 END), 0) as blocking_errors,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN COALESCE(ps.ball_handling_errors, 0) ELSE 0 END), 0) as ball_handling_errors,
          ROUND(
            CASE 
              WHEN SUM(CASE WHEN m.bracket_id = ? THEN ps.attack_attempts ELSE 0 END) > 0 
              THEN (SUM(CASE WHEN m.bracket_id = ? THEN ps.kills ELSE 0 END) - 
                    SUM(CASE WHEN m.bracket_id = ? THEN ps.attack_errors ELSE 0 END)) / 
                   SUM(CASE WHEN m.bracket_id = ? THEN ps.attack_attempts ELSE 0 END) * 100
              ELSE 0 
            END, 1
          ) as hitting_percentage,
          ROUND(
            (COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.kills ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.volleyball_blocks ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.service_aces ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.volleyball_assists ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.digs ELSE 0 END), 0) - 
             (COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.serve_errors ELSE 0 END), 0) + 
              COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.attack_errors ELSE 0 END), 0) + 
              COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.reception_errors ELSE 0 END), 0) + 
              COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN COALESCE(ps.assist_errors, 0) ELSE 0 END), 0) +
              COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN COALESCE(ps.blocking_errors, 0) ELSE 0 END), 0) +
              COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN COALESCE(ps.ball_handling_errors, 0) ELSE 0 END), 0))) / 
            NULLIF(COUNT(DISTINCT CASE WHEN m.bracket_id = ? AND m.status = 'completed' THEN ps.match_id END), 0), 2
          ) as eff,
          ROUND(
            (COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.kills ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.volleyball_blocks ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.service_aces ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.volleyball_assists ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.digs ELSE 0 END), 0) - 
             (COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.serve_errors ELSE 0 END), 0) + 
              COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.attack_errors ELSE 0 END), 0) + 
              COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.reception_errors ELSE 0 END), 0) + 
              COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN COALESCE(ps.assist_errors, 0) ELSE 0 END), 0) +
              COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN COALESCE(ps.blocking_errors, 0) ELSE 0 END), 0) +
              COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN COALESCE(ps.ball_handling_errors, 0) ELSE 0 END), 0))) / 
            NULLIF(COUNT(DISTINCT CASE WHEN m.bracket_id = ? AND m.status = 'completed' THEN ps.match_id END), 0), 1
          ) as overall_score,
          CASE WHEN p.id IS NULL THEN 1 ELSE 0 END as is_deleted
        FROM player_stats ps
        INNER JOIN matches m ON ps.match_id = m.id
        INNER JOIN brackets b ON m.bracket_id = b.id
        LEFT JOIN players p ON ps.player_id = p.id
        LEFT JOIN teams t ON p.team_id = t.id
        WHERE b.event_id = ?
          AND b.id = ?
          AND ps.event_id = ?
        GROUP BY 
          COALESCE(p.id, ps.player_id),
          COALESCE(p.name, ps.player_name_snapshot),
          COALESCE(p.jersey_number, ps.player_jersey_snapshot),
          COALESCE(p.position, ps.player_position_snapshot),
          COALESCE(t.name, ps.team_name_snapshot),
          b.id, 
          b.name,
          p.id
        HAVING games_played > 0
        ORDER BY overall_score DESC, kills DESC, digs DESC, assists DESC
      `;
      
      const params = [
        bracketId, // games_played
        bracketId, // kills
        bracketId, // assists
        bracketId, // digs
        bracketId, // blocks
        bracketId, // service_aces
        bracketId, // receptions
        bracketId, // serve_errors
        bracketId, // attack_errors
        bracketId, // reception_errors
        bracketId, // assist_errors
        bracketId, // blocking_errors
        bracketId, // ball_handling_errors
        bracketId, bracketId, bracketId, bracketId, // hitting_percentage
        bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, // eff
        bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, // overall_score
        eventId,   // WHERE b.event_id
        bracketId, // WHERE b.id
        eventId    // WHERE ps.event_id
      ];
      
      const [players] = await db.pool.query(query, params);
      console.log(`Found ${players.length} players with statistics`);
      res.json(players);
    }
  } catch (err) {
    console.error("Error fetching player statistics:", err);
    res.status(500).json({ error: "Failed to fetch player statistics" });
  }
});

// GET comprehensive team statistics - COMPLETELY FIXED
router.get("/events/:eventId/teams-statistics", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { bracketId } = req.query;
    
    console.log(`Fetching team statistics for event ${eventId}, bracket: ${bracketId || 'all'}`);
    
    // ✅ Make bracket filter mandatory
    if (!bracketId) {
      return res.status(400).json({ 
        error: "bracketId is required for team statistics" 
      });
    }
    
    // Get sport type for the specific bracket
    const [sportTypeResult] = await db.pool.query(
      `SELECT b.sport_type, b.id, b.name
       FROM brackets b 
       WHERE b.event_id = ? AND b.id = ?
       LIMIT 1`,
      [eventId, bracketId]
    );
    
    if (sportTypeResult.length === 0) {
      console.log('No bracket found for event:', eventId, 'bracket:', bracketId);
      return res.json([]);
    }
    
    const sportType = sportTypeResult[0].sport_type;
    console.log(`Sport type detected: ${sportType} for bracket ${bracketId}`);
    
    let query;
    
    if (sportType === "basketball") {
      query = `
        SELECT 
          t.id as team_id,
          t.name as team_name,
          b.id as bracket_id,
          b.name as bracket_name,
          '${sportType}' as sport_type,
          COUNT(DISTINCT CASE 
            WHEN m.bracket_id = ? AND m.status = 'completed' 
            THEN ps.match_id 
          END) as games_played,
          COALESCE(SUM(CASE 
            WHEN m.bracket_id = ? 
            THEN ps.points 
            ELSE 0 
          END), 0) as total_points,
          COALESCE(SUM(CASE 
            WHEN m.bracket_id = ? 
            THEN ps.assists 
            ELSE 0 
          END), 0) as total_assists,
          COALESCE(SUM(CASE 
            WHEN m.bracket_id = ? 
            THEN ps.rebounds 
            ELSE 0 
          END), 0) as total_rebounds,
          COALESCE(SUM(CASE 
            WHEN m.bracket_id = ? 
            THEN ps.steals 
            ELSE 0 
          END), 0) as total_steals,
          COALESCE(SUM(CASE 
            WHEN m.bracket_id = ? 
            THEN ps.blocks 
            ELSE 0 
          END), 0) as total_blocks,
          COALESCE(SUM(CASE 
            WHEN m.bracket_id = ? 
            THEN ps.three_points_made 
            ELSE 0 
          END), 0) as total_three_points,
          COALESCE(SUM(CASE 
            WHEN m.bracket_id = ? 
            THEN ps.turnovers 
            ELSE 0 
          END), 0) as total_turnovers,
          COALESCE(SUM(CASE 
            WHEN m.bracket_id = ? 
            THEN ps.fouls 
            ELSE 0 
          END), 0) as total_fouls,
          ROUND(COALESCE(SUM(CASE 
            WHEN m.bracket_id = ? 
            THEN ps.points 
            ELSE 0 
          END), 0) / NULLIF(COUNT(DISTINCT CASE 
            WHEN m.bracket_id = ? AND m.status = 'completed' 
            THEN ps.match_id 
          END), 0), 1) as ppg,
          ROUND(COALESCE(SUM(CASE 
            WHEN m.bracket_id = ? 
            THEN ps.rebounds 
            ELSE 0 
          END), 0) / NULLIF(COUNT(DISTINCT CASE 
            WHEN m.bracket_id = ? AND m.status = 'completed' 
            THEN ps.match_id 
          END), 0), 1) as rpg,
          ROUND(COALESCE(SUM(CASE 
            WHEN m.bracket_id = ? 
            THEN ps.assists 
            ELSE 0 
          END), 0) / NULLIF(COUNT(DISTINCT CASE 
            WHEN m.bracket_id = ? AND m.status = 'completed' 
            THEN ps.match_id 
          END), 0), 1) as apg,
          ROUND(COALESCE(SUM(CASE 
            WHEN m.bracket_id = ? 
            THEN ps.steals 
            ELSE 0 
          END), 0) / NULLIF(COUNT(DISTINCT CASE 
            WHEN m.bracket_id = ? AND m.status = 'completed' 
            THEN ps.match_id 
          END), 0), 1) as spg,
          ROUND(COALESCE(SUM(CASE 
            WHEN m.bracket_id = ? 
            THEN ps.blocks 
            ELSE 0 
          END), 0) / NULLIF(COUNT(DISTINCT CASE 
            WHEN m.bracket_id = ? AND m.status = 'completed' 
            THEN ps.match_id 
          END), 0), 1) as bpg,
          ROUND(COALESCE(SUM(CASE 
            WHEN m.bracket_id = ? 
            THEN ps.turnovers 
            ELSE 0 
          END), 0) / NULLIF(COUNT(DISTINCT CASE 
            WHEN m.bracket_id = ? AND m.status = 'completed' 
            THEN ps.match_id 
          END), 0), 1) as tpg,
          ROUND(
            (COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.points ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.rebounds ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.assists ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.steals ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.blocks ELSE 0 END), 0) - 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.turnovers ELSE 0 END), 0)) / 
            NULLIF(COUNT(DISTINCT CASE 
              WHEN m.bracket_id = ? AND m.status = 'completed' 
              THEN ps.match_id 
            END), 0), 1
          ) as overall_score,
          (SELECT COUNT(*) FROM matches m2
           WHERE (m2.team1_id = t.id OR m2.team2_id = t.id) 
           AND m2.winner_id = t.id 
           AND m2.status = 'completed'
           AND m2.bracket_id = ?) as wins,
          (SELECT COUNT(*) FROM matches m2
           WHERE (m2.team1_id = t.id OR m2.team2_id = t.id) 
           AND m2.winner_id != t.id 
           AND m2.status = 'completed'
           AND m2.bracket_id = ?) as losses
        FROM teams t
        INNER JOIN bracket_teams bt ON t.id = bt.team_id AND bt.bracket_id = ?
        INNER JOIN brackets b ON bt.bracket_id = b.id
        LEFT JOIN players p ON p.team_id = t.id
        LEFT JOIN player_stats ps ON ps.player_id = p.id AND ps.event_id = ?
        LEFT JOIN matches m ON ps.match_id = m.id
        WHERE b.event_id = ?
          AND b.id = ?
        GROUP BY t.id, t.name, b.id, b.name
        HAVING games_played > 0
        ORDER BY overall_score DESC, ppg DESC, rpg DESC, apg DESC
      `;
      
      // All the bracketId references in the query
      const params = [
        bracketId, // games_played COUNT
        bracketId, // total_points
        bracketId, // total_assists
        bracketId, // total_rebounds
        bracketId, // total_steals
        bracketId, // total_blocks
        bracketId, // total_three_points
        bracketId, // total_turnovers
        bracketId, // total_fouls
        bracketId, // ppg numerator
        bracketId, // ppg denominator
        bracketId, // rpg numerator
        bracketId, // rpg denominator
        bracketId, // apg numerator
        bracketId, // apg denominator
        bracketId, // spg numerator
        bracketId, // spg denominator
        bracketId, // bpg numerator
        bracketId, // bpg denominator
        bracketId, // tpg numerator
        bracketId, // tpg denominator
        bracketId, // overall_score points
        bracketId, // overall_score rebounds
        bracketId, // overall_score assists
        bracketId, // overall_score steals
        bracketId, // overall_score blocks
        bracketId, // overall_score turnovers
        bracketId, // overall_score denominator
        bracketId, // wins subquery
        bracketId, // losses subquery
        bracketId, // bracket_teams filter
        eventId,   // player_stats event filter
        eventId,   // WHERE b.event_id
        bracketId  // WHERE b.id
      ];
      
      const [teams] = await db.pool.query(query, params);
      console.log(`Found ${teams.length} teams with statistics for bracket ${bracketId}`);
      res.json(teams);
      
    } else {
      // Volleyball - Similar pattern
      query = `
        SELECT 
          t.id as team_id,
          t.name as team_name,
          b.id as bracket_id,
          b.name as bracket_name,
          '${sportType}' as sport_type,
          COUNT(DISTINCT CASE 
            WHEN m.bracket_id = ? AND m.status = 'completed' 
            THEN ps.match_id 
          END) as games_played,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.kills ELSE 0 END), 0) as kills,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.volleyball_assists ELSE 0 END), 0) as assists,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.digs ELSE 0 END), 0) as digs,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.volleyball_blocks ELSE 0 END), 0) as blocks,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.service_aces ELSE 0 END), 0) as service_aces,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.receptions ELSE 0 END), 0) as receptions,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.serve_errors ELSE 0 END), 0) as serve_errors,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.attack_errors ELSE 0 END), 0) as attack_errors,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.reception_errors ELSE 0 END), 0) as reception_errors,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN COALESCE(ps.assist_errors, 0) ELSE 0 END), 0) as assist_errors,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.kills ELSE 0 END), 0) as total_kills,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.volleyball_assists ELSE 0 END), 0) as total_volleyball_assists,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.digs ELSE 0 END), 0) as total_digs,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.volleyball_blocks ELSE 0 END), 0) as total_volleyball_blocks,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.service_aces ELSE 0 END), 0) as total_service_aces,
          COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.receptions ELSE 0 END), 0) as total_receptions,
          ROUND(
            CASE 
              WHEN SUM(CASE WHEN m.bracket_id = ? THEN ps.attack_attempts ELSE 0 END) > 0 
              THEN (SUM(CASE WHEN m.bracket_id = ? THEN ps.kills ELSE 0 END) - 
                    SUM(CASE WHEN m.bracket_id = ? THEN ps.attack_errors ELSE 0 END)) / 
                   SUM(CASE WHEN m.bracket_id = ? THEN ps.attack_attempts ELSE 0 END) * 100
              ELSE 0 
            END, 1
          ) as hitting_percentage,
          ROUND(
            (COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.kills ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.volleyball_blocks ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.service_aces ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.volleyball_assists ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.digs ELSE 0 END), 0) - 
             (COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.serve_errors ELSE 0 END), 0) + 
              COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.attack_errors ELSE 0 END), 0) + 
              COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.reception_errors ELSE 0 END), 0) + 
              COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN COALESCE(ps.assist_errors, 0) ELSE 0 END), 0))) / 
            NULLIF(COUNT(DISTINCT CASE 
              WHEN m.bracket_id = ? AND m.status = 'completed' 
              THEN ps.match_id 
            END), 0), 1
          ) as eff,
          ROUND(
            (COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.kills ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.volleyball_blocks ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.service_aces ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.volleyball_assists ELSE 0 END), 0) + 
             COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.digs ELSE 0 END), 0) - 
             (COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.serve_errors ELSE 0 END), 0) + 
              COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.attack_errors ELSE 0 END), 0) + 
              COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN ps.reception_errors ELSE 0 END), 0) + 
              COALESCE(SUM(CASE WHEN m.bracket_id = ? THEN COALESCE(ps.assist_errors, 0) ELSE 0 END), 0))) / 
            NULLIF(COUNT(DISTINCT CASE 
              WHEN m.bracket_id = ? AND m.status = 'completed' 
              THEN ps.match_id 
            END), 0), 1
          ) as overall_score,
          (SELECT COUNT(*) FROM matches m2
           WHERE (m2.team1_id = t.id OR m2.team2_id = t.id) 
           AND m2.winner_id = t.id 
           AND m2.status = 'completed'
           AND m2.bracket_id = ?) as wins,
          (SELECT COUNT(*) FROM matches m2
           WHERE (m2.team1_id = t.id OR m2.team2_id = t.id) 
           AND m2.winner_id != t.id 
           AND m2.status = 'completed'
           AND m2.bracket_id = ?) as losses
        FROM teams t
        INNER JOIN bracket_teams bt ON t.id = bt.team_id AND bt.bracket_id = ?
        INNER JOIN brackets b ON bt.bracket_id = b.id
        LEFT JOIN players p ON p.team_id = t.id
        LEFT JOIN player_stats ps ON ps.player_id = p.id AND ps.event_id = ?
        LEFT JOIN matches m ON ps.match_id = m.id
        WHERE b.event_id = ?
          AND b.id = ?
        GROUP BY t.id, t.name, b.id, b.name
        HAVING games_played > 0
        ORDER BY overall_score DESC, kills DESC, digs DESC, assists DESC
      `;
      
      const params = [
        bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, bracketId,
        bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, bracketId,
        bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, bracketId,
        bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, bracketId,
        bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, bracketId,
        bracketId, bracketId, bracketId, bracketId, bracketId, bracketId, bracketId,
        bracketId, bracketId, bracketId, eventId, eventId, bracketId
      ];
      
      const [teams] = await db.pool.query(query, params);
      console.log(`Found ${teams.length} teams with statistics for bracket ${bracketId}`);
      res.json(teams);
    }
    
  } catch (err) {
    console.error("Error fetching team statistics:", err);
    res.status(500).json({ error: "Failed to fetch team statistics" });
  }
});

module.exports = router;