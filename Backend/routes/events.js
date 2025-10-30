// routes/events.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Helper function to check and update event status
async function updateEventStatus(eventId) {
  try {
    // Get all brackets for this event
    const [brackets] = await db.pool.query(
      'SELECT id FROM brackets WHERE event_id = ?',
      [eventId]
    );

    if (brackets.length === 0) {
      return; // No brackets, keep status as is
    }

    // Check if all matches in all brackets are completed
    let allMatchesCompleted = true;
    let hasMatches = false;

    for (const bracket of brackets) {
      const [matches] = await db.pool.query(
        'SELECT status FROM matches WHERE bracket_id = ? AND status != ?',
        [bracket.id, 'hidden']
      );

      if (matches.length > 0) {
        hasMatches = true;
        // Check if any match is not completed
        const hasIncompleteMatch = matches.some(match => 
  match.status !== 'completed' && match.status !== 'bye'
);
        if (hasIncompleteMatch) {
          allMatchesCompleted = false;
          break;
        }
      }
    }

    // Update event status if all matches are completed
    if (hasMatches && allMatchesCompleted) {
      await db.pool.query(
        'UPDATE events SET status = ? WHERE id = ?',
        ['completed', eventId]
      );
    }
  } catch (error) {
    console.error('Error updating event status:', error);
  }
}

// ✅ GET all events with dynamic status check
router.get('/', async (req, res) => {
  try {
    const query = 'SELECT * FROM events ORDER BY id DESC';
    const [results] = await db.pool.query(query);

    // Update status for each event
    for (const event of results) {
      await updateEventStatus(event.id);
    }

    // Fetch updated events
    const [updatedResults] = await db.pool.query(query);
    res.json(updatedResults);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching events',
      error: error.message,
      code: error.code
    });
  }
});

// ✅ GET single event by ID
router.get("/:id", async (req, res) => {
  try {
    // Update status before fetching
    await updateEventStatus(req.params.id);

    const [rows] = await db.pool.query("SELECT * FROM events WHERE id = ?", [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching event" });
  }
});

// ✅ GET brackets by event
router.get('/:eventId/brackets', async (req, res) => {
  try {
    const { eventId } = req.params;
    const query = `
      SELECT b.*, COUNT(bt.team_id) as team_count 
      FROM brackets b
      LEFT JOIN bracket_teams bt ON b.id = bt.bracket_id
      WHERE b.event_id = ?
      GROUP BY b.id
    `;
    const [brackets] = await db.pool.query(query, [eventId]);
    res.json(brackets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ GET matches by bracket
router.get('/brackets/:bracketId/matches', async (req, res) => {
  try {
    const { bracketId } = req.params;
    const query = `
      SELECT 
        m.*,
        t1.name as team1_name,
        t2.name as team2_name,
        tw.name as winner_name,
        p.name as mvp_name
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      LEFT JOIN teams tw ON m.winner_id = tw.id
      LEFT JOIN players p ON m.mvp_id = p.id
      WHERE m.bracket_id = ?
      ORDER BY m.round_number, m.match_order
    `;
    const [matches] = await db.pool.query(query, [bracketId]);
    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Create event
router.post('/', async (req, res) => {
  try {
    const { name, start_date, end_date } = req.body;
    if (!name || !start_date || !end_date) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const status = 'ongoing';
    const archived = 'no';
    const query = `
      INSERT INTO events (name, start_date, end_date, status, archived)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.pool.query(query, [
      name,
      start_date,
      end_date,
      status,
      archived
    ]);

    res.status(201).json({
      message: 'Event created successfully',
      eventId: result.insertId
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error creating event',
      error: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage || 'No SQL message'
    });
  }
});

// ✅ Update event
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_date, end_date, status } = req.body;

    if (!name || !start_date || !end_date) {
      return res.status(400).json({ message: 'Name, start date, and end date are required' });
    }

    // Build update query dynamically based on provided fields
    let updateFields = [];
    let values = [];

    updateFields.push('name = ?');
    values.push(name);

    updateFields.push('start_date = ?');
    values.push(start_date);

    updateFields.push('end_date = ?');
    values.push(end_date);

    if (status) {
      updateFields.push('status = ?');
      values.push(status);
    }

    values.push(id);

    const query = `UPDATE events SET ${updateFields.join(', ')} WHERE id = ?`;
    const [result] = await db.pool.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Fetch and return updated event
    const [updatedEvent] = await db.pool.query('SELECT * FROM events WHERE id = ?', [id]);
    res.json(updatedEvent[0]);
  } catch (error) {
    res.status(500).json({
      message: 'Error updating event',
      error: error.message
    });
  }
});

// ✅ Manually update event status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Update the event status
    await updateEventStatus(id);

    // Fetch and return updated event
    const [updatedEvent] = await db.pool.query('SELECT * FROM events WHERE id = ?', [id]);
    
    if (updatedEvent.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(updatedEvent[0]);
  } catch (error) {
    res.status(500).json({
      message: 'Error updating event status',
      error: error.message
    });
  }
});

// ✅ Delete event
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.pool.query('DELETE FROM events WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({
      message: 'Error deleting event',
      error: error.message
    });
  }
});

module.exports = router;