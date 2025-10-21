const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET all schedules with related data
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id,
        s.eventId,
        s.bracketId,
        s.matchId,
        DATE_FORMAT(s.date, '%Y-%m-%d') as date,
        TIME_FORMAT(s.time, '%H:%i') as time,
        TIME_FORMAT(s.endTime, '%H:%i') as endTime,
        s.created_at,
        s.updated_at,
        m.round_number,
        m.bracket_type,
        m.team1_id,
        m.team2_id,
        m.scheduled_at as match_scheduled_at,
        b.name as bracket_name,
        b.sport_type,
        e.name as event_name,
        t1.name as team1_name,
        t2.name as team2_name
      FROM schedules s
      LEFT JOIN matches m ON s.matchId = m.id
      LEFT JOIN brackets b ON s.bracketId = b.id
      LEFT JOIN events e ON s.eventId = e.id
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      ORDER BY s.date, s.time
    `;
    
    const [schedules] = await db.pool.query(query);
    res.json(schedules);
  } catch (err) {
    console.error('Error fetching schedules:', err);
    res.status(500).json({ message: 'Error fetching schedules' });
  }
});

// POST create new schedule
router.post('/', async (req, res) => {
  try {
    const { eventId, bracketId, matchId, date, time, endTime } = req.body;
    
    console.log('Creating schedule with data:', req.body);
    
    // Check if schedule already exists for this match
    const [existing] = await db.pool.query(
      'SELECT id FROM schedules WHERE matchId = ?',
      [matchId]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Schedule already exists for this match' });
    }
    
    const query = `
      INSERT INTO schedules (eventId, bracketId, matchId, date, time, endTime)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await db.pool.query(query, [
      eventId,
      bracketId,
      matchId,
      date,
      time,
      endTime || null
    ]);
    
    // Update match scheduled_at field
    const scheduledAt = `${date} ${time}:00`;
    await db.pool.query(
      'UPDATE matches SET scheduled_at = ? WHERE id = ?',
      [scheduledAt, matchId]
    );
    
    // Fetch the newly created schedule with all related data
    const [newSchedule] = await db.pool.query(`
      SELECT 
        s.*,
        DATE_FORMAT(s.date, '%Y-%m-%d') as date,
        TIME_FORMAT(s.time, '%H:%i') as time,
        TIME_FORMAT(s.endTime, '%H:%i') as endTime,
        m.round_number,
        m.bracket_type,
        m.team1_id,
        m.team2_id,
        b.name as bracket_name,
        b.sport_type,
        e.name as event_name,
        t1.name as team1_name,
        t2.name as team2_name
      FROM schedules s
      LEFT JOIN matches m ON s.matchId = m.id
      LEFT JOIN brackets b ON s.bracketId = b.id
      LEFT JOIN events e ON s.eventId = e.id
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      WHERE s.id = ?
    `, [result.insertId]);
    
    console.log('Schedule created successfully:', newSchedule[0]);
    res.status(201).json(newSchedule[0]);
  } catch (err) {
    console.error('Error creating schedule:', err);
    res.status(500).json({ message: 'Error creating schedule: ' + err.message });
  }
});

// PUT update schedule
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, endTime } = req.body;
    
    console.log('Updating schedule:', id, req.body);
    
    // Update schedule
    const query = `
      UPDATE schedules 
      SET date = ?, time = ?, endTime = ?
      WHERE id = ?
    `;
    
    await db.pool.query(query, [date, time, endTime || null, id]);
    
    // Get matchId to update match scheduled_at
    const [schedule] = await db.pool.query('SELECT matchId FROM schedules WHERE id = ?', [id]);
    
    if (schedule.length > 0) {
      const scheduledAt = `${date} ${time}:00`;
      await db.pool.query(
        'UPDATE matches SET scheduled_at = ? WHERE id = ?',
        [scheduledAt, schedule[0].matchId]
      );
    }
    
    // Fetch updated schedule with all related data
    const [updatedSchedule] = await db.pool.query(`
      SELECT 
        s.*,
        DATE_FORMAT(s.date, '%Y-%m-%d') as date,
        TIME_FORMAT(s.time, '%H:%i') as time,
        TIME_FORMAT(s.endTime, '%H:%i') as endTime,
        m.round_number,
        m.bracket_type,
        m.team1_id,
        m.team2_id,
        b.name as bracket_name,
        b.sport_type,
        e.name as event_name,
        t1.name as team1_name,
        t2.name as team2_name
      FROM schedules s
      LEFT JOIN matches m ON s.matchId = m.id
      LEFT JOIN brackets b ON s.bracketId = b.id
      LEFT JOIN events e ON s.eventId = e.id
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      WHERE s.id = ?
    `, [id]);
    
    console.log('Schedule updated successfully:', updatedSchedule[0]);
    res.json(updatedSchedule[0]);
  } catch (err) {
    console.error('Error updating schedule:', err);
    res.status(500).json({ message: 'Error updating schedule: ' + err.message });
  }
});

// DELETE schedule
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get matchId before deleting
    const [schedule] = await db.pool.query('SELECT matchId FROM schedules WHERE id = ?', [id]);
    
    if (schedule.length > 0) {
      // Clear match scheduled_at
      await db.pool.query(
        'UPDATE matches SET scheduled_at = NULL WHERE id = ?',
        [schedule[0].matchId]
      );
    }
    
    // Delete schedule
    await db.pool.query('DELETE FROM schedules WHERE id = ?', [id]);
    
    console.log('Schedule deleted successfully');
    res.json({ message: 'Schedule deleted successfully' });
  } catch (err) {
    console.error('Error deleting schedule:', err);
    res.status(500).json({ message: 'Error deleting schedule: ' + err.message });
  }
});

module.exports = router;