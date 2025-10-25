const express = require("express");
const router = express.Router();
const db = require("../config/database");

// POST - Assign team to bracket
router.post("/", async (req, res) => {
  const { bracket_id, team_id } = req.body;
  
  if (!bracket_id || !team_id) {
    return res.status(400).json({ error: "bracket_id and team_id are required" });
  }

  try {
    // Check if this team is already assigned to this bracket
    const [existing] = await db.pool.query(
      "SELECT id FROM bracket_teams WHERE bracket_id = ? AND team_id = ?",
      [bracket_id, team_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Team already assigned to this bracket" });
    }

    // Insert the assignment
    const [result] = await db.pool.query(
      "INSERT INTO bracket_teams (bracket_id, team_id) VALUES (?, ?)",
      [bracket_id, team_id]
    );

    res.status(201).json({
      id: result.insertId,
      bracket_id,
      team_id,
      message: "Team assigned to bracket successfully"
    });

  } catch (err) {
    console.error("Error assigning team to bracket:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET - Get available teams for a bracket (MOVED UP - BEFORE other GET routes)
router.get("/bracket/:bracketId/available", async (req, res) => {
  try {
    const { bracketId } = req.params;
    
    // First get the bracket's sport type
    const [bracketInfo] = await db.pool.query(
      "SELECT sport_type FROM brackets WHERE id = ?",
      [bracketId]
    );

    if (bracketInfo.length === 0) {
      return res.status(404).json({ error: "Bracket not found" });
    }

    const sportType = bracketInfo[0].sport_type;

    // Get all teams matching the sport type that are NOT already in this bracket
    const [availableTeams] = await db.pool.query(`
      SELECT t.id, t.name, t.sport
      FROM teams t
      WHERE t.sport = ?
      AND t.id NOT IN (
        SELECT team_id 
        FROM bracket_teams 
        WHERE bracket_id = ?
      )
      ORDER BY t.name
    `, [sportType, bracketId]);

    console.log(`✅ Found ${availableTeams.length} available ${sportType} teams for bracket ${bracketId}`);
    res.json(availableTeams);
  } catch (err) {
    console.error("Error fetching available teams:", err);
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

    // Delete the bracket_teams assignment FIRST
    await conn.query("DELETE FROM bracket_teams WHERE id = ?", [req.params.id]);

    // Note: We DON'T update matches here because the bracket will be regenerated
    // The frontend will call /api/brackets/:id/generate after this

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