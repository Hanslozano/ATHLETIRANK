const express = require("express");
const router = express.Router();
const db = require("../config/database");

// ✅ GET all teams with players
router.get("/", async (req, res) => {
  try {
    // Make sure to select sport
    const [teams] = await db.pool.query("SELECT id, name, sport FROM teams");
    const [players] = await db.pool.query("SELECT * FROM players");

    const teamsWithPlayers = teams.map(team => ({
      ...team,
      players: players.filter(p => p.team_id === team.id),
    }));

    res.json(teamsWithPlayers);
  } catch (err) {
    console.error("Error fetching teams:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ GET single team by ID
// GET single team by ID
router.get("/:id", async (req, res) => {
  try {
    const [teams] = await db.pool.query("SELECT id, name, sport FROM teams WHERE id = ?", [req.params.id]);
    
    if (teams.length === 0) {
      return res.status(404).json({ error: "Team not found" });
    }

    const [players] = await db.pool.query("SELECT id, name, position, jersey_number FROM players WHERE team_id = ? ORDER BY id", [req.params.id]);
    
    const teamWithPlayers = {
      id: teams[0].id,
      name: teams[0].name,
      sport: teams[0].sport,
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        jersey_number: p.jersey_number,
        jerseyNumber: p.jersey_number  // Add both formats for compatibility
      }))
    };

    console.log("Returning team data:", teamWithPlayers);  // Debug log
    res.json(teamWithPlayers);
  } catch (err) {
    console.error("Error fetching team:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// ✅ CREATE new team with players (updated for jersey_number)
router.post("/", async (req, res) => {
  const { name, sport, players } = req.body;

  if (!name || !sport || !players || players.length === 0) {
    return res.status(400).json({ error: "Team name, sport, and at least one player required" });
  }

  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      "INSERT INTO teams (name, sport) VALUES (?, ?)",
      [name, sport]
    );
    const teamId = result.insertId;

    // Updated to include jersey_number
    const playerValues = players.map(p => [teamId, p.name, p.position, p.jerseyNumber]);
    await conn.query(
      "INSERT INTO players (team_id, name, position, jersey_number) VALUES ?",
      [playerValues]
    );

    await conn.commit();

    // Return the created team with players including jersey numbers
    const [createdPlayers] = await conn.query(
      "SELECT * FROM players WHERE team_id = ?",
      [teamId]
    );
    
    res.status(201).json({ id: teamId, name, sport, players: createdPlayers });
  } catch (err) {
    await conn.rollback();
    console.error("Error creating team:", err);
    res.status(500).json({ error: "Database error" });
  } finally {
    conn.release();
  }
});

// ✅ UPDATE team basic info (name and sport)
router.put("/:id", async (req, res) => {
  const { name, sport } = req.body;

  if (!name || !sport) {
    return res.status(400).json({ error: "Team name and sport are required" });
  }

  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check if team exists
    const [existingTeam] = await conn.query("SELECT * FROM teams WHERE id = ?", [req.params.id]);
    if (existingTeam.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Team not found" });
    }

    // Update team
    await conn.query(
      "UPDATE teams SET name = ?, sport = ? WHERE id = ?",
      [name, sport, req.params.id]
    );

    await conn.commit();

    // Return updated team with players
    const [updatedTeam] = await conn.query("SELECT id, name, sport FROM teams WHERE id = ?", [req.params.id]);
    const [players] = await conn.query("SELECT * FROM players WHERE team_id = ?", [req.params.id]);

    res.json({
      ...updatedTeam[0],
      players: players
    });
  } catch (err) {
    await conn.rollback();
    console.error("Error updating team:", err);
    res.status(500).json({ error: "Database error" });
  } finally {
    conn.release();
  }
});

// ✅ UPDATE player
router.put("/:teamId/players/:playerId", async (req, res) => {
  const { teamId, playerId } = req.params;
  const { name, position, jerseyNumber } = req.body;

  if (!name || !position || !jerseyNumber) {
    return res.status(400).json({ error: "Player name, position, and jersey number are required" });
  }

  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check if player belongs to team
    const [playerCheck] = await conn.query(
      "SELECT * FROM players WHERE id = ? AND team_id = ?",
      [playerId, teamId]
    );

    if (playerCheck.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Player not found in this team" });
    }

    // Update player
    await conn.query(
      "UPDATE players SET name = ?, position = ?, jersey_number = ? WHERE id = ?",
      [name, position, jerseyNumber, playerId]
    );

    await conn.commit();

    // Return updated player
    const [updatedPlayer] = await conn.query(
      "SELECT * FROM players WHERE id = ?",
      [playerId]
    );

    res.json(updatedPlayer[0]);
  } catch (err) {
    await conn.rollback();
    console.error("Error updating player:", err);
    res.status(500).json({ error: "Database error" });
  } finally {
    conn.release();
  }
});

// ✅ ADD new player to existing team
router.post("/:teamId/players", async (req, res) => {
  const { teamId } = req.params;
  const { name, position, jerseyNumber } = req.body;

  if (!name || !position || !jerseyNumber) {
    return res.status(400).json({ error: "Player name, position, and jersey number are required" });
  }

  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check if team exists
    const [teamCheck] = await conn.query("SELECT * FROM teams WHERE id = ?", [teamId]);
    if (teamCheck.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Team not found" });
    }

    // Check if jersey number already exists in team
    const [existingJersey] = await conn.query(
      "SELECT * FROM players WHERE team_id = ? AND jersey_number = ?",
      [teamId, jerseyNumber]
    );

    if (existingJersey.length > 0) {
      await conn.rollback();
      return res.status(400).json({ error: "Jersey number already exists in this team" });
    }

    // Insert new player
    const [result] = await conn.query(
      "INSERT INTO players (team_id, name, position, jersey_number) VALUES (?, ?, ?, ?)",
      [teamId, name, position, jerseyNumber]
    );

    await conn.commit();

    // Return new player
    const [newPlayer] = await conn.query("SELECT * FROM players WHERE id = ?", [result.insertId]);

    res.status(201).json(newPlayer[0]);
  } catch (err) {
    await conn.rollback();
    console.error("Error adding player:", err);
    res.status(500).json({ error: "Database error" });
  } finally {
    conn.release();
  }
});

// ✅ DELETE player
router.delete("/:teamId/players/:playerId", async (req, res) => {
  const { teamId, playerId } = req.params;

  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check if player belongs to team
    const [playerCheck] = await conn.query(
      "SELECT * FROM players WHERE id = ? AND team_id = ?",
      [playerId, teamId]
    );

    if (playerCheck.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Player not found in this team" });
    }

    // Delete player
    await conn.query("DELETE FROM players WHERE id = ?", [playerId]);

    await conn.commit();
    res.json({ message: "Player deleted successfully" });
  } catch (err) {
    await conn.rollback();
    console.error("Error deleting player:", err);
    res.status(500).json({ error: "Database error" });
  } finally {
    conn.release();
  }
});

// ✅ DELETE team (and associated players due to ON DELETE CASCADE)
router.delete("/:id", async (req, res) => {
  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();
    
    // First delete players to maintain referential integrity if no CASCADE
    await conn.query("DELETE FROM players WHERE team_id = ?", [req.params.id]);
    
    // Then delete the team
    await conn.query("DELETE FROM teams WHERE id = ?", [req.params.id]);
    
    await conn.commit();
    res.json({ message: "Team and associated players deleted successfully" });
  } catch (err) {
    await conn.rollback();
    console.error("Error deleting team:", err);
    res.status(500).json({ error: "Database error" });
  } finally {
    conn.release();
  }
});


// ✅ GET brackets for a specific team
// ✅ FIXED - Returns full format like Events
router.get("/:teamId/brackets", async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const [brackets] = await db.pool.query(`
      SELECT 
        b.id,
        b.name as bracket_name,
        b.sport_type,
        b.elimination_type,
        e.name as event_name
      FROM bracket_teams bt
      JOIN brackets b ON bt.bracket_id = b.id
      JOIN events e ON b.event_id = e.id
      WHERE bt.team_id = ?
      ORDER BY e.name, b.name
    `, [teamId]);

    res.json(brackets);
  } catch (err) {
    console.error("Error fetching team brackets:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ CHECK team usage before deletion
router.get("/:id/usage", async (req, res) => {
  try {
    const teamId = req.params.id;
    
    // Check brackets usage
    const [bracketsUsage] = await db.pool.query(
      'SELECT COUNT(*) as count FROM brackets WHERE winner_team_id = ?',
      [teamId]
    );
    
    // Check matches usage
    const [matchesUsage] = await db.pool.query(
      'SELECT COUNT(*) as count FROM matches WHERE team1_id = ? OR team2_id = ? OR winner_id = ?',
      [teamId, teamId, teamId]
    );
    
    // Check bracket_teams usage
    const [bracketTeamsUsage] = await db.pool.query(
      'SELECT COUNT(*) as count FROM bracket_teams WHERE team_id = ?',
      [teamId]
    );
    
    res.json({
      usedInBrackets: bracketsUsage[0].count,
      usedInMatches: matchesUsage[0].count,
      usedInBracketTeams: bracketTeamsUsage[0].count,
      totalUsage: bracketsUsage[0].count + matchesUsage[0].count + bracketTeamsUsage[0].count
    });
  } catch (error) {
    console.error('Error checking team usage:', error);
    res.status(500).json({ error: 'Error checking team usage' });
  }
});

// ✅ GET detailed team usage information
router.get("/:id/usage-details", async (req, res) => {
  try {
    const teamId = req.params.id;
    
    // Get brackets where team is winner
    const [winnerBrackets] = await db.pool.query(`
      SELECT b.id, b.name, e.name as event_name 
      FROM brackets b 
      JOIN events e ON b.event_id = e.id 
      WHERE b.winner_team_id = ?
    `, [teamId]);
    
    // Get matches where team is involved
    const [teamMatches] = await db.pool.query(`
      SELECT m.id, m.round_number, b.name as bracket_name, e.name as event_name,
             CASE 
               WHEN m.team1_id = ? THEN 'Team 1'
               WHEN m.team2_id = ? THEN 'Team 2' 
               WHEN m.winner_id = ? THEN 'Winner'
             END as team_role
      FROM matches m
      JOIN brackets b ON m.bracket_id = b.id
      JOIN events e ON b.event_id = e.id
      WHERE m.team1_id = ? OR m.team2_id = ? OR m.winner_id = ?
    `, [teamId, teamId, teamId, teamId, teamId, teamId]);
    
    // Get brackets where team is registered
    const [bracketRegistrations] = await db.pool.query(`
      SELECT b.id, b.name, e.name as event_name
      FROM bracket_teams bt
      JOIN brackets b ON bt.bracket_id = b.id
      JOIN events e ON b.event_id = e.id
      WHERE bt.team_id = ?
    `, [teamId]);
    
    res.json({
      winnerBrackets,
      teamMatches,
      bracketRegistrations
    });
  } catch (error) {
    console.error('Error getting team usage details:', error);
    res.status(500).json({ error: 'Error getting team usage details' });
  }
});

// ✅ UPDATE the existing DELETE endpoint to check constraints
router.delete("/:id", async (req, res) => {
  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const teamId = req.params.id;
    
    // First, check if team is used in any active brackets or matches
    const [bracketsUsage] = await conn.query(
      'SELECT COUNT(*) as count FROM brackets WHERE winner_team_id = ?',
      [teamId]
    );
    
    const [matchesUsage] = await conn.query(
      'SELECT COUNT(*) as count FROM matches WHERE team1_id = ? OR team2_id = ? OR winner_id = ?',
      [teamId, teamId, teamId]
    );

    const [bracketTeamsUsage] = await conn.query(
      'SELECT COUNT(*) as count FROM bracket_teams WHERE team_id = ?',
      [teamId]
    );
    
    if (bracketsUsage[0].count > 0 || matchesUsage[0].count > 0 || bracketTeamsUsage[0].count > 0) {
      await conn.rollback();
      return res.status(400).json({ 
        error: 'Cannot delete team because it is used in brackets or matches. Please remove the team from all brackets and matches first.' 
      });
    }
    
    // First delete players
    await conn.query("DELETE FROM players WHERE team_id = ?", [teamId]);
    
    // Then delete the team
    await conn.query("DELETE FROM teams WHERE id = ?", [teamId]);
    
    await conn.commit();
    res.json({ message: "Team and associated players deleted successfully" });
  } catch (err) {
    await conn.rollback();
    console.error("Error deleting team:", err);
    
    // Handle specific MySQL foreign key constraint errors
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(400).json({ 
        error: 'Cannot delete team because it is currently being used in tournaments or matches. Please remove the team from all brackets first.' 
      });
    }
    
    res.status(500).json({ error: "Database error" });
  } finally {
    conn.release();
  }
});
module.exports = router;