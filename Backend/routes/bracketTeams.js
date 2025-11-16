const express = require("express");
const router = express.Router();
const db = require("../config/database");

// ✅ UPDATE POST - Add validation that team must be in event first
router.post("/", async (req, res) => {
  const { bracket_id, team_id, bracketId, teamId } = req.body;
  
  const finalBracketId = bracket_id || bracketId;
  const finalTeamId = team_id || teamId;
  
  if (!finalBracketId || !finalTeamId) {
    return res.status(400).json({ error: "bracketId and teamId are required" });
  }

  try {
    // ✅ Get bracket's event_id
    const [bracket] = await db.pool.query(
      "SELECT event_id FROM brackets WHERE id = ?",
      [finalBracketId]
    );

    if (bracket.length === 0) {
      return res.status(404).json({ error: "Bracket not found" });
    }

    const eventId = bracket[0].event_id;
// ✅ AUTO-REGISTER team to event if not already registered
const [eventTeam] = await db.pool.query(
  "SELECT id FROM event_teams WHERE event_id = ? AND team_id = ?",
  [eventId, finalTeamId]
);

if (eventTeam.length === 0) {
  // Automatically register team to event
  await db.pool.query(
    "INSERT INTO event_teams (event_id, team_id) VALUES (?, ?)",
    [eventId, finalTeamId]
  );
  console.log(`✅ Auto-registered team ${finalTeamId} to event ${eventId}`);
}
    // Check if team is already in this bracket
    const [existing] = await db.pool.query(
      "SELECT id FROM bracket_teams WHERE bracket_id = ? AND team_id = ?",
      [finalBracketId, finalTeamId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ 
        error: "Team already assigned to this bracket" 
      });
    }

    // Insert the assignment
    const [result] = await db.pool.query(
      "INSERT INTO bracket_teams (bracket_id, team_id) VALUES (?, ?)",
      [finalBracketId, finalTeamId]
    );

    res.status(201).json({
      id: result.insertId,
      bracket_id: finalBracketId,
      team_id: finalTeamId,
      message: "Team assigned to bracket successfully"
    });

  } catch (err) {
    console.error("Error assigning team to bracket:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// ✅ COMPLETE FIX - GET available teams (excludes teams from ALL brackets)
// ✅ COMPLETE FIX - GET available teams (excludes teams from ALL brackets including current)
// ✅ NEW LOGIC - Get available teams (only from event_teams, exclude same bracket)
router.get("/bracket/:bracketId/available", async (req, res) => {
  try {
    const { bracketId } = req.params;
    
    console.log(`\n🔍 [BACKEND] Fetching available teams for bracket: ${bracketId}`);
    
    // Get bracket info including event_id
    const [bracketInfo] = await db.pool.query(
      "SELECT event_id, sport_type FROM brackets WHERE id = ?",
      [bracketId]
    );

    if (bracketInfo.length === 0) {
      return res.status(404).json({ error: "Bracket not found" });
    }

    const { event_id, sport_type } = bracketInfo[0];
    const sportType = sport_type.toLowerCase();
    
    console.log(`✅ [BACKEND] Event: ${event_id}, Sport: ${sportType}`);

    // ✅ Get teams already in THIS bracket
    const [teamsInBracket] = await db.pool.query(
      "SELECT DISTINCT team_id FROM bracket_teams WHERE bracket_id = ?",
      [bracketId]
    );
    
    const teamsInBracketIds = teamsInBracket.map(t => t.team_id);
    console.log(`📊 [BACKEND] Teams in THIS bracket:`, teamsInBracketIds);

    let availableTeams;
    
    if (teamsInBracketIds.length > 0) {
      const placeholders = teamsInBracketIds.map(() => '?').join(',');
      
      // ✅ Get teams registered to THIS event, matching sport, NOT in this bracket
      const query = `
        SELECT t.id, t.name, t.sport 
        FROM teams t
        JOIN event_teams et ON t.id = et.team_id
        WHERE et.event_id = ?
        AND LOWER(t.sport) = ?
        AND t.id NOT IN (${placeholders})
        ORDER BY t.name
      `;
      
      [availableTeams] = await db.pool.query(
        query, 
        [event_id, sportType, ...teamsInBracketIds]
      );
    } else {
      // No teams in bracket yet, return all event teams matching sport
      [availableTeams] = await db.pool.query(`
        SELECT t.id, t.name, t.sport 
        FROM teams t
        JOIN event_teams et ON t.id = et.team_id
        WHERE et.event_id = ?
        AND LOWER(t.sport) = ?
        ORDER BY t.name
      `, [event_id, sportType]);
    }
    
    console.log(`✅ [BACKEND] Available teams count:`, availableTeams.length);
    res.json(availableTeams);
    
  } catch (err) {
    console.error("❌ [BACKEND] Error fetching available teams:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});
// GET - Get all teams in a bracket
router.get("/bracket/:bracketId", async (req, res) => {
  try {
    const [teams] = await db.pool.query(`
      SELECT 
        bt.id as assignment_id,
        t.id,
        t.name,
        t.sport
      FROM bracket_teams bt
      JOIN teams t ON bt.team_id = t.id
      WHERE bt.bracket_id = ?
      ORDER BY t.name
    `, [req.params.bracketId]);

    res.json(teams);
  } catch (err) {
    console.error("Error fetching bracket teams:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE - Remove team from bracket
router.delete("/:id", async (req, res) => {
  const conn = await db.pool.getConnection();
  
  try {
    await conn.beginTransaction();

    // Get the team_id and bracket_id before deletion
    const [assignment] = await conn.query(
      "SELECT team_id, bracket_id FROM bracket_teams WHERE id = ?",
      [req.params.id]
    );

    if (assignment.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Team assignment not found" });
    }

    const { team_id, bracket_id } = assignment[0];

    // Delete the bracket_teams assignment
    await conn.query("DELETE FROM bracket_teams WHERE id = ?", [req.params.id]);

    await conn.commit();
    
    res.json({ 
      success: true, 
      message: "Team removed from bracket. Bracket will be regenerated." 
    });

  } catch (err) {
    await conn.rollback();
    console.error("Error removing team from bracket:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;