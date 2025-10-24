const express = require("express");
const router = express.Router();
const db = require("../config/database");
const fisherYatesShuffle = require("../utils/fisherYates");

// ============================================
// ROUND ROBIN HELPER FUNCTIONS
// ============================================

// Generate round robin matches using circle method algorithm
function generateRoundRobinMatches(teams) {
  const shuffledTeams = fisherYatesShuffle([...teams]);
  const n = shuffledTeams.length;
  const rounds = [];
  
  // If odd number of teams, add a BYE
  const teamsList = [...shuffledTeams];
  if (n % 2 === 1) {
    teamsList.push(null); // null represents BYE
  }
  
  const totalTeams = teamsList.length;
  const numRounds = totalTeams - 1;
  const matchesPerRound = totalTeams / 2;
  
  // Circle method algorithm
  for (let round = 0; round < numRounds; round++) {
    const roundMatches = [];
    
    for (let match = 0; match < matchesPerRound; match++) {
      const home = teamsList[match];
      const away = teamsList[totalTeams - 1 - match];
      
      // Only add match if both teams exist (skip BYE matches)
      if (home && away) {
        roundMatches.push({
          team1: home,
          team2: away,
          round: round + 1
        });
      }
    }
    
    rounds.push(roundMatches);
    
    // Rotate teams (keep first team fixed, rotate others)
    teamsList.splice(1, 0, teamsList.pop());
  }
  
  return rounds;
}

// Calculate standings for round robin
function calculateStandings(matches, teams) {
  const standings = {};
  
  // Initialize standings
  teams.forEach(team => {
    standings[team.id] = {
      team_id: team.id,
      team_name: team.name,
      played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0
    };
  });
  
  // Process completed matches
  matches.forEach(match => {
    if (match.status === 'completed') {
      const team1_id = match.team1_id;
      const team2_id = match.team2_id;
      
      if (team1_id && team2_id && standings[team1_id] && standings[team2_id]) {
        standings[team1_id].played++;
        standings[team2_id].played++;
        
        const score1 = match.score_team1 || 0;
        const score2 = match.score_team2 || 0;
        
        standings[team1_id].goals_for += score1;
        standings[team1_id].goals_against += score2;
        standings[team2_id].goals_for += score2;
        standings[team2_id].goals_against += score1;
        
        if (match.winner_id === team1_id) {
          standings[team1_id].wins++;
          standings[team1_id].points += 3;
          standings[team2_id].losses++;
        } else if (match.winner_id === team2_id) {
          standings[team2_id].wins++;
          standings[team2_id].points += 3;
          standings[team1_id].losses++;
        } else if (match.winner_id === null && score1 === score2) {
          // Draw
          standings[team1_id].draws++;
          standings[team1_id].points += 1;
          standings[team2_id].draws++;
          standings[team2_id].points += 1;
        }
        
        standings[team1_id].goal_difference = 
          standings[team1_id].goals_for - standings[team1_id].goals_against;
        standings[team2_id].goal_difference = 
          standings[team2_id].goals_for - standings[team2_id].goals_against;
      }
    }
  });
  
  // Convert to array and sort
  return Object.values(standings).sort((a, b) => {
    // Sort by points first
    if (b.points !== a.points) return b.points - a.points;
    // Then by goal difference
    if (b.goal_difference !== a.goal_difference) 
      return b.goal_difference - a.goal_difference;
    // Then by goals scored
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    // Finally alphabetically by name
    return a.team_name.localeCompare(b.team_name);
  });
}

// ============================================
// ROUTES
// ============================================

// POST generate round robin bracket
router.post("/:id/generate", async (req, res) => {
  const bracketId = req.params.id;

  try {
    // Clear existing matches and reset bracket winner
    await db.pool.query("DELETE FROM matches WHERE bracket_id = ?", [bracketId]);
    await db.pool.query(
      "UPDATE brackets SET winner_team_id = NULL WHERE id = ?", 
      [bracketId]
    );

    // Fetch bracket info
    const [bracketInfo] = await db.pool.query(
      "SELECT elimination_type FROM brackets WHERE id = ?",
      [bracketId]
    );
    
    if (bracketInfo.length === 0) {
      return res.status(404).json({ error: "Bracket not found" });
    }
    
    const eliminationType = bracketInfo[0].elimination_type;
    
    // Verify it's a round robin bracket
    if (eliminationType !== "round_robin") {
      return res.status(400).json({ 
        error: "This endpoint is only for round robin brackets. Use /api/brackets/:id/generate for single/double elimination." 
      });
    }

    // Fetch teams in this bracket
    const [teams] = await db.pool.query(
      `SELECT t.id, t.name, t.sport
       FROM bracket_teams bt
       JOIN teams t ON bt.team_id = t.id
       WHERE bt.bracket_id = ?`,
      [bracketId]
    );

    if (teams.length < 2) {
      return res.status(400).json({ 
        error: "At least 2 teams are required to generate matches" 
      });
    }

    if (teams.length > 32) {
      return res.status(400).json({ 
        error: "Maximum 32 teams supported for round robin" 
      });
    }

    console.log(`Generating round robin for ${teams.length} teams`);

    // Generate round robin matches
    const rounds = generateRoundRobinMatches(teams);
    const allMatches = [];

    // Insert matches into database
    for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
      const roundMatches = rounds[roundIndex];
      
      for (let matchIndex = 0; matchIndex < roundMatches.length; matchIndex++) {
        const match = roundMatches[matchIndex];
        
        const matchData = {
          bracket_id: bracketId,
          round_number: roundIndex + 1,
          bracket_type: 'round_robin',
          team1_id: match.team1.id,
          team2_id: match.team2.id,
          winner_id: null,
          status: "scheduled",
          match_order: matchIndex
        };

        const [result] = await db.pool.query(
          `INSERT INTO matches 
           (bracket_id, round_number, bracket_type, team1_id, team2_id, 
            winner_id, status, match_order) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            matchData.bracket_id, 
            matchData.round_number, 
            matchData.bracket_type,
            matchData.team1_id, 
            matchData.team2_id, 
            matchData.winner_id,
            matchData.status, 
            matchData.match_order
          ]
        );

        matchData.id = result.insertId;
        allMatches.push(matchData);
      }
    }

    console.log(`✅ Generated ${allMatches.length} matches across ${rounds.length} rounds`);

    res.json({
      success: true,
      message: `Generated ${allMatches.length} matches for round robin (${teams.length} teams, ${rounds.length} rounds)`,
      matches: allMatches,
      elimination_type: eliminationType,
      team_count: teams.length,
      round_count: rounds.length
    });

  } catch (err) {
    console.error("Error generating round robin bracket:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// POST complete a round robin match
router.post("/matches/:id/complete", async (req, res) => {
  const matchId = req.params.id;
  const { winner_id, scores, is_draw } = req.body;

  try {
    // Get match details
    const [matches] = await db.pool.query(
      "SELECT * FROM matches WHERE id = ?",
      [matchId]
    );
    
    if (matches.length === 0) {
      return res.status(404).json({ error: "Match not found" });
    }
    
    const match = matches[0];
    
    // Verify it's a round robin match
    if (match.bracket_type !== 'round_robin') {
      return res.status(400).json({ 
        error: "This endpoint is only for round robin matches. Use /api/brackets/matches/:id/complete for elimination brackets." 
      });
    }
    
    // Handle draw case (when scores are equal or is_draw is true)
    let finalWinnerId = winner_id;
    if (is_draw || (scores?.team1 === scores?.team2)) {
      finalWinnerId = null; // null indicates a draw
    }
    
    // Update match with winner and scores
    await db.pool.query(
      `UPDATE matches 
       SET winner_id = ?, status = 'completed', 
           score_team1 = ?, score_team2 = ? 
       WHERE id = ?`,
      [finalWinnerId, scores?.team1 || 0, scores?.team2 || 0, matchId]
    );
    
    // Check if tournament is complete (all matches completed)
    const [allMatches] = await db.pool.query(
      `SELECT * FROM matches WHERE bracket_id = ? AND bracket_type = 'round_robin'`,
      [match.bracket_id]
    );
    
    const completedMatches = allMatches.filter(m => m.status === 'completed');
    const tournamentComplete = completedMatches.length === allMatches.length;
    
    let tournamentWinner = null;
    
    if (tournamentComplete) {
      // Get all teams in bracket
      const [teams] = await db.pool.query(
        `SELECT t.* FROM bracket_teams bt
         JOIN teams t ON bt.team_id = t.id
         WHERE bt.bracket_id = ?`,
        [match.bracket_id]
      );
      
      // Calculate final standings
      const standings = calculateStandings(allMatches, teams);
      
      if (standings.length > 0) {
        tournamentWinner = standings[0];
        
        // Update bracket with winner
        await db.pool.query(
          "UPDATE brackets SET winner_team_id = ? WHERE id = ?",
          [tournamentWinner.team_id, match.bracket_id]
        );
      }
    }
    
    let message = is_draw ? "Match completed as draw" : "Match completed successfully";
    if (tournamentComplete) {
      message += ` - Tournament finished! Winner: ${tournamentWinner?.team_name || 'Unknown'}`;
    }
    
    res.json({ 
      success: true, 
      message: message,
      tournamentComplete: tournamentComplete,
      winner: tournamentComplete ? tournamentWinner : null,
      is_draw: finalWinnerId === null && scores?.team1 === scores?.team2
    });
  } catch (err) {
    console.error("Error completing round robin match:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// GET standings for round robin bracket
router.get("/:id/standings", async (req, res) => {
  const bracketId = req.params.id;

  try {
    // Verify bracket exists and is round robin
    const [bracketInfo] = await db.pool.query(
      "SELECT elimination_type FROM brackets WHERE id = ?",
      [bracketId]
    );
    
    if (bracketInfo.length === 0) {
      return res.status(404).json({ error: "Bracket not found" });
    }
    
    if (bracketInfo[0].elimination_type !== "round_robin") {
      return res.status(400).json({ 
        error: "This endpoint is only for round robin brackets" 
      });
    }

    // Get all matches
    const [matches] = await db.pool.query(
      `SELECT m.*, 
        t1.name as team1_name, 
        t2.name as team2_name,
        w.name as winner_name
       FROM matches m
       LEFT JOIN teams t1 ON m.team1_id = t1.id
       LEFT JOIN teams t2 ON m.team2_id = t2.id
       LEFT JOIN teams w ON m.winner_id = w.id
       WHERE m.bracket_id = ? AND m.bracket_type = 'round_robin'
       ORDER BY m.round_number, m.match_order`,
      [bracketId]
    );

    // Get all teams
    const [teams] = await db.pool.query(
      `SELECT t.* FROM bracket_teams bt
       JOIN teams t ON bt.team_id = t.id
       WHERE bt.bracket_id = ?`,
      [bracketId]
    );

    // Calculate standings
    const standings = calculateStandings(matches, teams);

    res.json({
      standings: standings,
      total_matches: matches.length,
      completed_matches: matches.filter(m => m.status === 'completed').length,
      remaining_matches: matches.filter(m => m.status !== 'completed').length
    });
  } catch (err) {
    console.error("Error fetching round robin standings:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// GET matches grouped by round
router.get("/:id/matches-by-round", async (req, res) => {
  const bracketId = req.params.id;

  try {
    // Verify it's a round robin bracket
    const [bracketInfo] = await db.pool.query(
      "SELECT elimination_type FROM brackets WHERE id = ?",
      [bracketId]
    );
    
    if (bracketInfo.length === 0) {
      return res.status(404).json({ error: "Bracket not found" });
    }
    
    if (bracketInfo[0].elimination_type !== "round_robin") {
      return res.status(400).json({ 
        error: "This endpoint is only for round robin brackets" 
      });
    }

    const [matches] = await db.pool.query(`
      SELECT m.*, 
        t1.name as team1_name, 
        t2.name as team2_name,
        w.name as winner_name
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      LEFT JOIN teams w ON m.winner_id = w.id
      WHERE m.bracket_id = ? AND m.bracket_type = 'round_robin'
      ORDER BY m.round_number, m.match_order
    `, [bracketId]);

    // Group by round
    const matchesByRound = {};
    matches.forEach(match => {
      if (!matchesByRound[match.round_number]) {
        matchesByRound[match.round_number] = [];
      }
      matchesByRound[match.round_number].push(match);
    });

    res.json(matchesByRound);
  } catch (err) {
    console.error("Error fetching matches by round:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET all matches for a round robin bracket
router.get("/:id/matches", async (req, res) => {
  const bracketId = req.params.id;

  try {
    const [matches] = await db.pool.query(`
      SELECT m.*, 
        t1.name as team1_name, 
        t2.name as team2_name,
        t1.sport as sport,
        w.name as winner_name
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      LEFT JOIN teams w ON m.winner_id = w.id
      WHERE m.bracket_id = ? AND m.bracket_type = 'round_robin'
      ORDER BY m.round_number, m.match_order
    `, [bracketId]);

    res.json(matches);
  } catch (err) {
    console.error("Error fetching round robin matches:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST reset round robin bracket (clear all matches)
router.post("/:id/reset", async (req, res) => {
  const bracketId = req.params.id;

  try {
    // Verify it's a round robin bracket
    const [bracketInfo] = await db.pool.query(
      "SELECT elimination_type FROM brackets WHERE id = ?",
      [bracketId]
    );
    
    if (bracketInfo.length === 0) {
      return res.status(404).json({ error: "Bracket not found" });
    }
    
    if (bracketInfo[0].elimination_type !== "round_robin") {
      return res.status(400).json({ 
        error: "This endpoint is only for round robin brackets" 
      });
    }

    // Clear all round robin matches and reset winner
    await db.pool.query(
      "DELETE FROM matches WHERE bracket_id = ? AND bracket_type = 'round_robin'", 
      [bracketId]
    );
    await db.pool.query(
      "UPDATE brackets SET winner_team_id = NULL WHERE id = ?", 
      [bracketId]
    );

    res.json({ success: true, message: "Round robin bracket reset successfully" });
  } catch (err) {
    console.error("Error resetting round robin bracket:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;