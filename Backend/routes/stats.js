const express = require("express");
const router = express.Router();
const db = require("../config/database");

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

// Get existing stats for a match - UPDATED to include assist_errors
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
      JOIN players p ON ps.player_id = p.id
      JOIN teams t ON p.team_id = t.id
      WHERE ps.match_id = ?
      ORDER BY t.name, p.name
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

// Enhanced Save stats for a match - FIXED: Corrected INSERT query
router.post("/matches/:matchId/stats", async (req, res) => {
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
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const playerId = player.player_id;
      const teamId = player.team_id;

      if (!playerId || !teamId) {
        console.warn(`Skipping player ${i}: missing player_id or team_id`, { playerId, teamId });
        continue;
      }
      
      try {

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

      // FIXED: Build INSERT statement with correct column order (58 columns total)
      const insertQuery = `
        INSERT INTO player_stats (
          match_id, player_id, points, assists, rebounds, two_points_made, three_points_made, 
          free_throws_made, steals, blocks, fouls, turnovers, technical_fouls,
          serves, service_aces, serve_errors, receptions, reception_errors, digs, 
          kills, attack_attempts, attack_errors, volleyball_assists, volleyball_blocks, assist_errors,
          overtime_periods, overtime_two_points_made, overtime_three_points_made, 
          overtime_free_throws_made, overtime_assists, overtime_rebounds, overtime_steals, 
          overtime_blocks, overtime_fouls, overtime_technical_fouls, overtime_turnovers,
          two_points_made_per_quarter, three_points_made_per_quarter, free_throws_made_per_quarter,
          assists_per_quarter, rebounds_per_quarter, steals_per_quarter, blocks_per_quarter,
          fouls_per_quarter, technical_fouls_per_quarter, turnovers_per_quarter,
          kills_per_set, attack_attempts_per_set, attack_errors_per_set, serves_per_set,
          service_aces_per_set, serve_errors_per_set, receptions_per_set, reception_errors_per_set,
          digs_per_set, volleyball_assists_per_set, volleyball_blocks_per_set, assist_errors_per_set
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Prepare all values in the correct order (58 values total)
      const insertValues = [
        matchId,                                                    // 1
        playerId,                                                   // 2
        totalPointsForPlayer,                                       // 3
        totalAssists,                                               // 4
        totalRebounds,                                              // 5
        totalTwoPointsMade,                                         // 6
        totalThreePointsMade,                                       // 7
        totalFreeThrowsMade,                                        // 8
        totalSteals,                                                // 9
        totalBlocks,                                                // 10
        totalFouls,                                                 // 11
        totalTurnovers,                                             // 12
        totalTechnicalFouls,                                       // 13
        totalServes,                                                // 14
        totalServiceAces,                                           // 15
        totalServeErrors,                                           // 16
        totalReceptions,                                            // 17
        totalReceptionErrors,                                       // 18
        totalDigs,                                                  // 19
        totalKills,                                                // 20
        totalAttackAttempts,                                        // 21
        totalAttackErrors,                                          // 22
        totalVolleyballAssists,                                     // 23
        totalVolleyballBlocks,                                      // 24
        totalAssistErrors,                                          // 25
        playerOvertimePeriods,                                      // 26
        serializeArray(overtimeTwoPoints),                          // 27
        serializeArray(overtimeThreePoints),                        // 28
        serializeArray(overtimeFreeThrows),                         // 29
        serializeArray(overtimeAssists),                            // 30
        serializeArray(overtimeRebounds),                           // 31
        serializeArray(overtimeSteals),                             // 32
        serializeArray(overtimeBlocks),                             // 33
        serializeArray(overtimeFouls),                              // 34
        serializeArray(overtimeTechnicalFouls),                     // 35
        serializeArray(overtimeTurnovers),                           // 36
        serializeArray(twoPointsPerQuarter, 4),                     // 37
        serializeArray(threePointsPerQuarter, 4),                   // 38
        serializeArray(freeThrowsPerQuarter, 4),                    // 39
        serializeArray(assistsPerQuarter, 4),                        // 40
        serializeArray(reboundsPerQuarter, 4),                      // 41
        serializeArray(stealsPerQuarter, 4),                        // 42
        serializeArray(blocksPerQuarter, 4),                        // 43
        serializeArray(foulsPerQuarter, 4),                         // 44
        serializeArray(technicalFoulsPerQuarter, 4),               // 45
        serializeArray(turnoversPerQuarter, 4),                      // 46
        serializeArray(killsPerSet, 5),                              // 47
        serializeArray(attackAttemptsPerSet, 5),                     // 48
        serializeArray(attackErrorsPerSet, 5),                       // 49
        serializeArray(servesPerSet, 5),                             // 50
        serializeArray(serviceAcesPerSet, 5),                       // 51
        serializeArray(serveErrorsPerSet, 5),                       // 52
        serializeArray(receptionsPerSet, 5),                         // 53
        serializeArray(receptionErrorsPerSet, 5),                   // 54
        serializeArray(digsPerSet, 5),                               // 55
        serializeArray(volleyballAssistsPerSet, 5),                 // 56
        serializeArray(volleyballBlocksPerSet, 5),                   // 57
        serializeArray(assistErrorsPerSet, 5)                        // 58
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

// UPDATED: Get comprehensive player statistics - WITH assist_errors
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
          p.position,
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
        GROUP BY p.id, p.name, p.jersey_number, p.position, t.name, b.id, b.name
        HAVING games_played > 0
        ORDER BY overall_score DESC, ppg DESC, rpg DESC, apg DESC
      `;
    } else {
      // Volleyball - UPDATED: Added assist_errors
      query = `
        SELECT 
          p.id,
          p.name,
          p.jersey_number,
          p.position,
          t.name as team_name,
          b.id as bracket_id,
          b.name as bracket_name,
          '${sportType}' as sport_type,
          COUNT(DISTINCT ps.match_id) as games_played,
          -- TOTAL COUNTS
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
          SUM(COALESCE(ps.assist_errors, 0)) as assist_errors,
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
          -- Efficiency calculation - UPDATED to include assist_errors
          ROUND(
            (SUM(ps.kills) + SUM(ps.volleyball_blocks) + SUM(ps.service_aces) + 
             SUM(ps.volleyball_assists) + SUM(ps.digs) - 
             (SUM(ps.serve_errors) + SUM(ps.attack_errors) + SUM(ps.reception_errors) + SUM(COALESCE(ps.assist_errors, 0)))) / 
            NULLIF(COUNT(DISTINCT ps.match_id), 0), 1
          ) as eff,
          -- Overall Score - UPDATED to include assist_errors
          ROUND(
            (SUM(ps.kills) + SUM(ps.volleyball_blocks) + SUM(ps.service_aces) + 
             SUM(ps.volleyball_assists) + SUM(ps.digs) - 
             (SUM(ps.serve_errors) + SUM(ps.attack_errors) + SUM(ps.reception_errors) + SUM(COALESCE(ps.assist_errors, 0)))) / 
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
        GROUP BY p.id, p.name, p.jersey_number, p.position, t.name, b.id, b.name
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

// UPDATED: Get comprehensive team statistics - WITH assist_errors
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
      // Volleyball - UPDATED: Added assist_errors
      query = `
        SELECT 
          t.id as team_id,
          t.name as team_name,
          b.id as bracket_id,
          b.name as bracket_name,
          '${sportType}' as sport_type,
          COUNT(DISTINCT ps.match_id) as games_played,
          -- TOTAL COUNTS
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
          SUM(COALESCE(ps.assist_errors, 0)) as assist_errors,
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
          -- Efficiency calculation - UPDATED to include assist_errors
          ROUND(
            (SUM(ps.kills) + SUM(ps.volleyball_blocks) + SUM(ps.service_aces) + 
             SUM(ps.volleyball_assists) + SUM(ps.digs) - 
             (SUM(ps.serve_errors) + SUM(ps.attack_errors) + SUM(ps.reception_errors) + SUM(COALESCE(ps.assist_errors, 0)))) / 
            NULLIF(COUNT(DISTINCT ps.match_id), 0), 1
          ) as eff,
          -- Overall Score - UPDATED to include assist_errors
          ROUND(
            (SUM(ps.kills) + SUM(ps.volleyball_blocks) + SUM(ps.service_aces) + 
             SUM(ps.volleyball_assists) + SUM(ps.digs) - 
             (SUM(ps.serve_errors) + SUM(ps.attack_errors) + SUM(ps.reception_errors) + SUM(COALESCE(ps.assist_errors, 0)))) / 
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