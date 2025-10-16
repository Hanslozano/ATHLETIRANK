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
        const hasIncompleteMatch = matches.some(match => match.status !== 'completed');
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
      console.log(`Event ${eventId} status updated to completed`);
    }
  } catch (error) {
    console.error('Error updating event status:', error);
  }
}

// GET all matches with team details
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        m.*,
        t1.name as team1_name,
        t2.name as team2_name,
        tw.name as winner_name,
        b.sport_type,
        b.elimination_type,
        b.name as bracket_name
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      LEFT JOIN teams tw ON m.winner_id = tw.id
      LEFT JOIN brackets b ON m.bracket_id = b.id
      ORDER BY m.bracket_id, m.round_number, m.match_order
    `;
    
    const [matches] = await db.pool.query(query);
    res.json(matches);
  } catch (err) {
    console.error('Error fetching matches:', err);
    res.status(500).json({ 
      message: 'Error fetching matches', 
      error: err.message 
    });
  }
});

// GET single match by ID
router.get('/:id', async (req, res) => {
  try {
    const [matches] = await db.pool.query(
      `SELECT m.*, 
        t1.name as team1_name, 
        t2.name as team2_name,
        tw.name as winner_name
       FROM matches m
       LEFT JOIN teams t1 ON m.team1_id = t1.id
       LEFT JOIN teams t2 ON m.team2_id = t2.id
       LEFT JOIN teams tw ON m.winner_id = tw.id
       WHERE m.id = ?`,
      [req.params.id]
    );

    if (matches.length === 0) {
      return res.status(404).json({ message: 'Match not found' });
    }

    res.json(matches[0]);
  } catch (err) {
    console.error('Error fetching match:', err);
    res.status(500).json({ message: 'Error fetching match' });
  }
});

// UPDATE match (add this if you don't have it)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Build dynamic update query
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);
    
    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const query = `UPDATE matches SET ${setClause} WHERE id = ?`;
    
    const [result] = await db.pool.query(query, [...values, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // If match status is updated to 'completed', check event status
    if (updateData.status === 'completed') {
      // Get bracket_id from the match
      const [match] = await db.pool.query(
        'SELECT bracket_id FROM matches WHERE id = ?', 
        [id]
      );
      
      if (match.length > 0) {
        // Get event_id from the bracket
        const [bracket] = await db.pool.query(
          'SELECT event_id FROM brackets WHERE id = ?', 
          [match[0].bracket_id]
        );
        
        if (bracket.length > 0) {
          // Update event status
          await updateEventStatus(bracket[0].event_id);
        }
      }
    }

    // Fetch and return updated match
    const [updatedMatch] = await db.pool.query(
      `SELECT m.*, 
        t1.name as team1_name, 
        t2.name as team2_name,
        tw.name as winner_name
       FROM matches m
       LEFT JOIN teams t1 ON m.team1_id = t1.id
       LEFT JOIN teams t2 ON m.team2_id = t2.id
       LEFT JOIN teams tw ON m.winner_id = tw.id
       WHERE m.id = ?`,
      [id]
    );

    res.json(updatedMatch[0]);
  } catch (err) {
    console.error('Error updating match:', err);
    res.status(500).json({ 
      message: 'Error updating match', 
      error: err.message 
    });
  }
});

// PATCH match status specifically (alternative simpler endpoint)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const [result] = await db.pool.query(
      'UPDATE matches SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // If status is completed, update event status
    if (status === 'completed') {
      const [match] = await db.pool.query(
        'SELECT bracket_id FROM matches WHERE id = ?', 
        [id]
      );
      
      if (match.length > 0) {
        const [bracket] = await db.pool.query(
          'SELECT event_id FROM brackets WHERE id = ?', 
          [match[0].bracket_id]
        );
        
        if (bracket.length > 0) {
          await updateEventStatus(bracket[0].event_id);
        }
      }
    }

    res.json({ message: 'Match status updated successfully', status });
  } catch (err) {
    console.error('Error updating match status:', err);
    res.status(500).json({ 
      message: 'Error updating match status', 
      error: err.message 
    });
  }
});

module.exports = router;