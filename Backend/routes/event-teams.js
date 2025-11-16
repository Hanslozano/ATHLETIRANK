const express = require("express");
const router = express.Router();
const db = require("../config/database");

// POST - Register team to event
router.post("/", async (req, res) => {
  const { event_id, team_id } = req.body;
  
  if (!event_id || !team_id) {
    return res.status(400).json({ error: "event_id and team_id are required" });
  }

  try {
    const [existing] = await db.pool.query(
      "SELECT id FROM event_teams WHERE event_id = ? AND team_id = ?",
      [event_id, team_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Team already registered to this event" });
    }

    const [result] = await db.pool.query(
      "INSERT INTO event_teams (event_id, team_id) VALUES (?, ?)",
      [event_id, team_id]
    );

    res.status(201).json({
      id: result.insertId,
      event_id,
      team_id,
      message: "Team registered to event successfully"
    });
  } catch (err) {
    console.error("Error registering team to event:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// GET - Get all teams registered to an event
router.get("/event/:eventId", async (req, res) => {
  try {
    const [teams] = await db.pool.query(`
      SELECT 
        et.id as registration_id,
        t.id,
        t.name,
        t.sport,
        et.registration_date,
        et.status
      FROM event_teams et
      JOIN teams t ON et.team_id = t.id
      WHERE et.event_id = ?
      ORDER BY t.name
    `, [req.params.eventId]);

    res.json(teams);
  } catch (err) {
    console.error("Error fetching event teams:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET - Get all events a team is registered to
router.get("/team/:teamId", async (req, res) => {
  try {
    const [events] = await db.pool.query(`
      SELECT 
        et.id as registration_id,
        e.id,
        e.name,
        e.start_date,
        e.end_date,
        e.status,
        et.registration_date
      FROM event_teams et
      JOIN events e ON et.event_id = e.id
      WHERE et.team_id = ?
      ORDER BY e.start_date DESC
    `, [req.params.teamId]);

    res.json(events);
  } catch (err) {
    console.error("Error fetching team events:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE - Remove team from event
router.delete("/:id", async (req, res) => {
  const conn = await db.pool.getConnection();
  
  try {
    await conn.beginTransaction();

    const [registration] = await conn.query(
      "SELECT team_id, event_id FROM event_teams WHERE id = ?",
      [req.params.id]
    );

    if (registration.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Registration not found" });
    }

    await conn.query("DELETE FROM event_teams WHERE id = ?", [req.params.id]);
    await conn.commit();
    
    res.json({ 
      success: true, 
      message: "Team removed from event successfully" 
    });
  } catch (err) {
    await conn.rollback();
    console.error("Error removing team from event:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;