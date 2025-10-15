const express = require("express");
const router = express.Router();
const db = require("../config/database");

// Import Fisher-Yates shuffle from utils
const fisherYatesShuffle = require("../utils/fisherYates");

// GET all brackets with team count
router.get("/", async (req, res) => {
  try {
    const [results] = await db.pool.query(`
      SELECT b.*, 
             COUNT(bt.team_id) as team_count,
             t.name as winner_team_name
      FROM brackets b
      LEFT JOIN bracket_teams bt ON b.id = bt.bracket_id
      LEFT JOIN teams t ON b.winner_team_id = t.id
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `);
    res.json(results);
  } catch (err) {
    console.error("Error fetching brackets:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET single bracket with teams
router.get("/:id", async (req, res) => {
  try {
    const [bracketRows] = await db.pool.query(
      `SELECT b.*, t.name as winner_team_name 
       FROM brackets b
       LEFT JOIN teams t ON b.winner_team_id = t.id
       WHERE b.id = ?`, 
      [req.params.id]
    );

    if (bracketRows.length === 0) {
      return res.status(404).json({ message: "Bracket not found" });
    }

    const [teams] = await db.pool.query(
      `SELECT t.* 
       FROM bracket_teams bt 
       JOIN teams t ON bt.team_id = t.id 
       WHERE bt.bracket_id = ?`,
      [req.params.id]
    );

    res.json({ ...bracketRows[0], teams });
  } catch (err) {
    console.error("Error fetching bracket:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET matches for a bracket
router.get("/:id/matches", async (req, res) => {
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
      WHERE m.bracket_id = ?
      ORDER BY m.bracket_type, m.round_number, m.match_order
    `, [req.params.id]);

    res.json(matches);
  } catch (err) {
    console.error("Error fetching matches:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST create bracket
router.post("/", async (req, res) => {
  const { event_id, name, sport_type, elimination_type } = req.body;
  
  if (!name || !sport_type || !elimination_type || !event_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const [result] = await db.pool.query(
      "INSERT INTO brackets (event_id, name, sport_type, elimination_type, created_at) VALUES (?, ?, ?, ?, NOW())",
      [event_id, name, sport_type, elimination_type]
    );

    res.status(201).json({
      id: result.insertId,
      event_id,
      name,
      sport_type,
      elimination_type,
      created_at: new Date()
    });
  } catch (err) {
    console.error("Error creating bracket:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE bracket and all related data
router.delete("/:id", async (req, res) => {
  try {
    // Delete in proper order to handle foreign key constraints
    await db.pool.query("DELETE FROM matches WHERE bracket_id = ?", [req.params.id]);
    await db.pool.query("DELETE FROM bracket_teams WHERE bracket_id = ?", [req.params.id]);
    await db.pool.query("DELETE FROM brackets WHERE id = ?", [req.params.id]);
    
    res.json({ success: true, message: "Bracket deleted successfully" });
  } catch (err) {
    console.error("Error deleting bracket:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Enhanced helper function to create proper double elimination structure
function createDoubleEliminationStructure(totalTeams) {
  // Special handling for 3-4 teams (keep existing logic)
  if (totalTeams === 3) {
    return {
      winnerRounds: 2,
      loserStructure: [
        { round: 1, matches: 1, description: "LB Final" }
      ],
      totalTeams: 3,
      actualTeams: 3
    };
  } else if (totalTeams === 4) {
    return {
      winnerRounds: 2,
      loserStructure: [
        { round: 1, matches: 1, description: "LB Round 1" },
        { round: 2, matches: 1, description: "LB Final" }
      ],
      totalTeams: 4,
      actualTeams: 4
    };
  }
  
  // NEW: Special handling for 5 teams
  if (totalTeams === 5) {
    return {
      winnerRounds: 3, // Round 1, 2, 3
      loserStructure: [
        { round: 1, matches: 1, description: "LB Round 1" }, // M5: Loser M1 vs Loser M2
        { round: 2, matches: 1, description: "LB Round 2" }, // M6: Winner M5 vs Loser M3
        { round: 3, matches: 1, description: "LB Final" }    // M7: Winner M6 vs Loser M4
      ],
      totalTeams: 5,
      actualTeams: 5
    };
  }
  
  // Existing logic for 6+ teams
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
  const winnerRounds = Math.log2(nextPowerOfTwo);
  
  const loserBracketStructures = {
    8: [
      { round: 1, matches: 2, description: "LB Round 1" },
      { round: 2, matches: 2, description: "LB Round 2" },
      { round: 3, matches: 1, description: "LB Round 3" },
      { round: 4, matches: 1, description: "LB Final" }
    ],
    16: [
      { round: 1, matches: 4, description: "LB Round 1" },
      { round: 2, matches: 4, description: "LB Round 2" },
      { round: 3, matches: 2, description: "LB Round 3" },
      { round: 4, matches: 2, description: "LB Round 4" },
      { round: 5, matches: 1, description: "LB Round 5" },
      { round: 6, matches: 1, description: "LB Final" }
    ]
  };

  let structure;
  if (totalTeams <= 8) {
    structure = loserBracketStructures[8];
  } else if (totalTeams <= 16) {
    structure = loserBracketStructures[16];
  } else {
    structure = loserBracketStructures[8];
  }
  
  return {
    winnerRounds: winnerRounds,
    loserStructure: structure,
    totalTeams: nextPowerOfTwo,
    actualTeams: totalTeams
  };
}

// Enhanced helper function for proper loser bracket round mapping - FIXED FOR 5 TEAMS
function getLoserBracketRound(winnerRound, totalTeams, matchOrder = 0) {
  // Special handling for 3 teams (unchanged)
  if (totalTeams === 3) {
    return 101; // Both WB losers go to LB R1
  }
  
  // Special handling for 4 teams (unchanged)
  if (totalTeams === 4) {
    return winnerRound === 1 ? 101 : 102;
  }
  
  // FIXED: Special handling for 5 teams - follow the reference structure
  if (totalTeams === 5) {
    if (winnerRound === 1) {
      // WB R1 losers go to LB R1 (M5: Loser M1 vs Loser M2)
      return 101;
    } else if (winnerRound === 2) {
      // WB R2 loser goes to LB R2 (M6: Winner M5 vs Loser M3)
      return 102;
    } else if (winnerRound === 3) {
      // WB Final loser goes to LB Final (M7: Winner M6 vs Loser M4)
      return 103;
    }
  }
  
  // For 6+ teams - existing logic
  if (totalTeams >= 6 && totalTeams <= 8) {
    const mappings = {
      1: 101, // WB R1 losers go to LB R1
      2: 102, // WB R2 losers go to LB R2  
      3: 104  // WB R3 (final) loser goes to LB R4 (final)
    };
    return mappings[winnerRound] || 101;
  }
  
  // Default mapping for larger brackets
  return 100 + winnerRound;
}

// Special function to get specific LB match order for different team counts - FIXED FOR 5 TEAMS
function getLoserBracketMatchOrder(winnerRound, winnerMatchOrder, totalTeams) {
  // FIXED: Special handling for 5 teams
  if (totalTeams === 5) {
    // For 5 teams, all losers go to match_order 0 in their respective LB rounds
    return 0;
  }
  
  if (totalTeams < 5) return winnerMatchOrder % 2;
  
  // For 6+ teams - existing logic
  if (totalTeams <= 8) {
    if (winnerRound === 1) {
      return winnerMatchOrder % 2;
    } else if (winnerRound === 2) {
      return winnerMatchOrder % 2;
    }
  }
  
  return winnerMatchOrder % 2;
}

// Validation function for bracket structure
function validateDoubleEliminationBracket(totalTeams, matches) {
  const expectedCounts = getExpectedMatchCounts(totalTeams);
  
  const winnerMatches = matches.filter(m => m.bracket_type === 'winner');
  const loserMatches = matches.filter(m => m.bracket_type === 'loser');
  const championshipMatches = matches.filter(m => m.bracket_type === 'championship');
  
  console.log(`\n=== Validating ${totalTeams} teams ===`);
  console.log(`Winner: ${winnerMatches.length} (expected: ${expectedCounts.winner})`);
  console.log(`Loser: ${loserMatches.length} (expected: ${expectedCounts.loser})`);
  console.log(`Championship: ${championshipMatches.length} (expected: ${expectedCounts.championship})`);
  console.log(`Total: ${matches.length} (expected: ${expectedCounts.total})`);
  
  const isValid = 
    winnerMatches.length === expectedCounts.winner &&
    loserMatches.length === expectedCounts.loser &&
    championshipMatches.length === expectedCounts.championship;
  
  if (isValid) {
    console.log(`✅ Bracket structure is VALID for ${totalTeams} teams!`);
  } else {
    console.log(`❌ Bracket structure has ERRORS for ${totalTeams} teams!`);
  }
  
  return isValid;
}

function getExpectedMatchCounts(teams) {
  const expectations = {
    3: { winner: 3, loser: 1, championship: 2, total: 6 },
    4: { winner: 3, loser: 2, championship: 2, total: 7 },
    5: { winner: 4, loser: 3, championship: 2, total: 9 }, // UPDATED for 5 teams: 4 WB + 3 LB + 2 Championship
    6: { winner: 7, loser: 6, championship: 2, total: 15 },
    7: { winner: 7, loser: 6, championship: 2, total: 15 },
    8: { winner: 7, loser: 6, championship: 2, total: 15 }
  };
  
  return expectations[teams] || expectations[8];
}

// POST generate full bracket - FIXED FOR 5 TEAMS
router.post("/:id/generate", async (req, res) => {
  const bracketId = req.params.id;

  try {
    // Clear existing matches and reset bracket winner
    await db.pool.query("DELETE FROM matches WHERE bracket_id = ?", [bracketId]);
    await db.pool.query("UPDATE brackets SET winner_team_id = NULL WHERE id = ?", [bracketId]);

    // Fetch bracket info
    const [bracketInfo] = await db.pool.query(
      "SELECT elimination_type FROM brackets WHERE id = ?",
      [bracketId]
    );
    
    if (bracketInfo.length === 0) {
      return res.status(404).json({ error: "Bracket not found" });
    }
    
    const eliminationType = bracketInfo[0].elimination_type;

    // Fetch teams in this bracket
    const [teams] = await db.pool.query(
      `SELECT t.id, t.name, t.sport
       FROM bracket_teams bt
       JOIN teams t ON bt.team_id = t.id
       WHERE bt.bracket_id = ?`,
      [bracketId]
    );

    if (teams.length < 2) {
      return res.status(400).json({ error: "At least 2 teams are required to generate matches" });
    }

    if (teams.length > 32) {
      return res.status(400).json({ error: "Maximum 32 teams supported for double elimination" });
    }

    // Shuffle teams
    const shuffledTeams = fisherYatesShuffle(teams);
    const allMatches = [];
    const totalTeams = shuffledTeams.length;

    if (eliminationType === "single") {
      // Single elimination logic (unchanged)
      const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(shuffledTeams.length)));
      while (shuffledTeams.length < nextPowerOfTwo) {
        shuffledTeams.push(null);
      }

      const totalRounds = Math.log2(nextPowerOfTwo);
      let currentRoundTeams = shuffledTeams;

      for (let round = 1; round <= totalRounds; round++) {
        const nextRoundTeams = [];

        for (let i = 0; i < currentRoundTeams.length; i += 2) {
          const team1 = currentRoundTeams[i];
          const team2 = currentRoundTeams[i + 1];

          let matchData = {
            bracket_id: bracketId,
            round_number: round,
            bracket_type: 'winner',
            team1_id: team1 ? team1.id : null,
            team2_id: team2 ? team2.id : null,
            winner_id: null,
            status: "scheduled",
            match_order: Math.floor(i / 2)
          };

          if (team1 && !team2) {
            matchData.winner_id = team1.id;
            matchData.status = "completed";
            nextRoundTeams.push(team1);
          } else if (team2 && !team1) {
            matchData.winner_id = team2.id;
            matchData.status = "completed";
            nextRoundTeams.push(team2);
          } else {
            nextRoundTeams.push({ placeholder: true });
          }

          const [result] = await db.pool.query(
            `INSERT INTO matches (bracket_id, round_number, bracket_type, team1_id, team2_id, winner_id, status, match_order) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [matchData.bracket_id, matchData.round_number, matchData.bracket_type,
             matchData.team1_id, matchData.team2_id, matchData.winner_id,
             matchData.status, matchData.match_order]
          );

          allMatches.push({
            id: result.insertId,
            ...matchData
          });
        }

        currentRoundTeams = nextRoundTeams;
      }
    } else if (eliminationType === "double") {
      // FIXED DOUBLE ELIMINATION BRACKET GENERATION
      const structure = createDoubleEliminationStructure(totalTeams);
      
      console.log(`Generating double elimination for ${totalTeams} teams`);
      
      // SPECIAL HANDLING FOR 5 TEAMS - NO PADDING
      let paddedTeams;
      if (totalTeams === 5) {
        // For 5 teams, use exact teams without padding to 8
        paddedTeams = [...shuffledTeams];
      } else {
        // For other counts, pad to next power of 2
        paddedTeams = [...shuffledTeams];
        while (paddedTeams.length < structure.totalTeams) {
          paddedTeams.push(null);
        }
      }

      // GENERATE WINNER'S BRACKET
      let currentRoundTeams = paddedTeams;
      let winnerMatches = [];

      for (let round = 1; round <= structure.winnerRounds; round++) {
        const roundMatches = Math.ceil(currentRoundTeams.length / 2);
        const nextRoundTeams = [];

        for (let i = 0; i < roundMatches; i++) {
          const team1 = currentRoundTeams[i * 2];
          const team2 = currentRoundTeams[i * 2 + 1];

          // For 5 teams in Round 1: 2 matches + 1 bye
          if (totalTeams === 5 && round === 1 && i === 2) {
            // This is the bye spot - no match needed, team advances automatically
            if (team1) {
              nextRoundTeams.push(team1);
            }
            continue; // Skip creating a match for bye
          }

          const matchData = {
            bracket_id: bracketId,
            round_number: round,
            bracket_type: 'winner',
            team1_id: team1 ? team1.id : null,
            team2_id: team2 ? team2.id : null,
            winner_id: null,
            status: "scheduled",
            match_order: i
          };

          // Handle BYE situations
          if (team1 && !team2) {
            matchData.winner_id = team1.id;
            matchData.status = "completed";
            nextRoundTeams.push(team1);
          } else if (!team1 && team2) {
            matchData.winner_id = team2.id;
            matchData.status = "completed";
            nextRoundTeams.push(team2);
          } else if (team1 && team2) {
            nextRoundTeams.push({ placeholder: true });
          } else {
            // Both null - this shouldn't happen in proper bracket
            nextRoundTeams.push(null);
          }

          const [result] = await db.pool.query(
            `INSERT INTO matches (bracket_id, round_number, bracket_type, team1_id, team2_id, winner_id, status, match_order) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [matchData.bracket_id, matchData.round_number, matchData.bracket_type,
             matchData.team1_id, matchData.team2_id, matchData.winner_id,
             matchData.status, matchData.match_order]
          );

          matchData.id = result.insertId;
          allMatches.push(matchData);
          winnerMatches.push({ ...matchData, roundIndex: round, matchIndex: i });
        }

        currentRoundTeams = nextRoundTeams;
      }

      // GENERATE LOSER'S BRACKET
      for (const roundInfo of structure.loserStructure) {
        for (let i = 0; i < roundInfo.matches; i++) {
          const matchData = {
            bracket_id: bracketId,
            round_number: 100 + roundInfo.round,
            bracket_type: 'loser',
            team1_id: null,
            team2_id: null,
            winner_id: null,
            status: "scheduled",
            match_order: i
          };

          const [result] = await db.pool.query(
            `INSERT INTO matches (bracket_id, round_number, bracket_type, team1_id, team2_id, winner_id, status, match_order) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [matchData.bracket_id, matchData.round_number, matchData.bracket_type,
             matchData.team1_id, matchData.team2_id, matchData.winner_id,
             matchData.status, matchData.match_order]
          );

          matchData.id = result.insertId;
          allMatches.push(matchData);
        }
      }

      // CHAMPIONSHIP MATCHES
      const grandFinalMatch = {
        bracket_id: bracketId,
        round_number: 200,
        bracket_type: 'championship',
        team1_id: null,
        team2_id: null,
        winner_id: null,
        status: "scheduled",
        match_order: 0
      };

      const [grandFinalResult] = await db.pool.query(
        `INSERT INTO matches (bracket_id, round_number, bracket_type, team1_id, team2_id, winner_id, status, match_order) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [grandFinalMatch.bracket_id, grandFinalMatch.round_number, grandFinalMatch.bracket_type,
         grandFinalMatch.team1_id, grandFinalMatch.team2_id, grandFinalMatch.winner_id,
         grandFinalMatch.status, grandFinalMatch.match_order]
      );

      grandFinalMatch.id = grandFinalResult.insertId;
      allMatches.push(grandFinalMatch);

      // Bracket Reset Match
      const resetMatch = {
        bracket_id: bracketId,
        round_number: 201,
        bracket_type: 'championship',
        team1_id: null,
        team2_id: null,
        winner_id: null,
        status: "hidden",
        match_order: 1
      };

      const [resetResult] = await db.pool.query(
        `INSERT INTO matches (bracket_id, round_number, bracket_type, team1_id, team2_id, winner_id, status, match_order) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [resetMatch.bracket_id, resetMatch.round_number, resetMatch.bracket_type,
         resetMatch.team1_id, resetMatch.team2_id, resetMatch.winner_id,
         resetMatch.status, resetMatch.match_order]
      );

      resetMatch.id = resetResult.insertId;
      allMatches.push(resetMatch);

      console.log(`Generated bracket: ${winnerMatches.length} winner, ${structure.loserStructure.reduce((acc, round) => acc + round.matches, 0)} loser, 2 championship matches`);

      // Validate the generated bracket
      validateDoubleEliminationBracket(totalTeams, allMatches);
    }

    res.json({
      success: true,
      message: `Generated ${allMatches.length} matches for ${eliminationType} elimination (${totalTeams} teams)`,
      matches: allMatches,
      elimination_type: eliminationType,
      team_count: totalTeams
    });

  } catch (err) {
    console.error("Error generating bracket:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// ENHANCED POST complete a match - WITH FIXED BRACKET PROGRESSION FOR 5+ TEAMS
router.post("/matches/:id/complete", async (req, res) => {
  const matchId = req.params.id;
  const { winner_id, scores } = req.body;

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
    
    // Update match with winner and scores
    await db.pool.query(
      "UPDATE matches SET winner_id = ?, status = 'completed', score_team1 = ?, score_team2 = ? WHERE id = ?",
      [winner_id, scores?.team1 || null, scores?.team2 || null, matchId]
    );
    
    // Get bracket elimination type and team count
    const [bracketInfo] = await db.pool.query(
      `SELECT b.elimination_type, COUNT(bt.team_id) as team_count 
       FROM brackets b
       LEFT JOIN bracket_teams bt ON b.id = bt.bracket_id 
       WHERE b.id = ?
       GROUP BY b.id`,
      [match.bracket_id]
    );
    
    if (bracketInfo.length === 0) {
      return res.status(404).json({ error: "Bracket not found" });
    }
    
    const eliminationType = bracketInfo[0].elimination_type;
    const totalTeams = bracketInfo[0].team_count;
    const loser_id = winner_id === match.team1_id ? match.team2_id : match.team1_id;
    
    let loserAdvanced = false;
    let winnerAdvanced = false;
    let tournamentComplete = false;
    let bracketReset = false;
    
    // Handle bracket progression based on elimination type
    if (eliminationType === "single") {
      // Single elimination logic (unchanged)
      const [nextMatches] = await db.pool.query(
        `SELECT * FROM matches 
         WHERE bracket_id = ? AND bracket_type = 'winner' 
         AND round_number = ? 
         AND (team1_id IS NULL OR team2_id IS NULL)
         ORDER BY match_order
         LIMIT 1`,
        [match.bracket_id, match.round_number + 1]
      );
      
      if (nextMatches.length > 0) {
        const nextMatch = nextMatches[0];
        const updateField = nextMatch.team1_id === null ? 'team1_id' : 'team2_id';
        
        await db.pool.query(
          `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
          [winner_id, nextMatch.id]
        );
        winnerAdvanced = true;
      } else {
        // This is the final match - update bracket winner
        await db.pool.query(
          "UPDATE brackets SET winner_team_id = ? WHERE id = ?",
          [winner_id, match.bracket_id]
        );
        tournamentComplete = true;
      }
    } else if (eliminationType === "double") {
      // FIXED DOUBLE ELIMINATION PROGRESSION
      
      if (match.bracket_type === 'winner') {
        // WINNER BRACKET LOGIC
        
        // 1. Advance winner within winner's bracket
        const nextRound = match.round_number + 1;
        const [maxWinnerRound] = await db.pool.query(
          `SELECT MAX(round_number) as max_round FROM matches 
           WHERE bracket_id = ? AND bracket_type = 'winner'`,
          [match.bracket_id]
        );
        
        if (nextRound <= maxWinnerRound[0].max_round) {
          // Continue in winner's bracket
          const nextMatchOrder = Math.floor(match.match_order / 2);
          
          const [nextWinnerMatches] = await db.pool.query(
            `SELECT * FROM matches 
             WHERE bracket_id = ? AND bracket_type = 'winner' 
             AND round_number = ? AND match_order = ?`,
            [match.bracket_id, nextRound, nextMatchOrder]
          );
          
          if (nextWinnerMatches.length > 0) {
            const nextMatch = nextWinnerMatches[0];
            const updateField = match.match_order % 2 === 0 ? 'team1_id' : 'team2_id';
            
            await db.pool.query(
              `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
              [winner_id, nextMatch.id]
            );
            winnerAdvanced = true;
          }
        } else {
          // Winner's bracket final - advance to Grand Final
          const [grandFinalMatches] = await db.pool.query(
            `SELECT * FROM matches 
             WHERE bracket_id = ? AND bracket_type = 'championship' AND round_number = 200`,
            [match.bracket_id]
          );
          
          if (grandFinalMatches.length > 0) {
            await db.pool.query(
              "UPDATE matches SET team1_id = ? WHERE id = ?",
              [winner_id, grandFinalMatches[0].id]
            );
            winnerAdvanced = true;
          }
        }
        
        // 2. Drop losers to correct loser's bracket round - FIXED FOR 5 TEAMS
        if (loser_id) {
          const targetLoserRound = getLoserBracketRound(match.round_number, totalTeams, match.match_order);
          const targetMatchOrder = getLoserBracketMatchOrder(match.round_number, match.match_order, totalTeams);
          
          console.log(`Moving loser from WB R${match.round_number} M${match.match_order} to LB R${targetLoserRound} M${targetMatchOrder}`);
          
          const [loserBracketMatches] = await db.pool.query(
            `SELECT * FROM matches 
             WHERE bracket_id = ? AND bracket_type = 'loser' 
             AND round_number = ? AND match_order = ?
             AND (team1_id IS NULL OR team2_id IS NULL)`,
            [match.bracket_id, targetLoserRound, targetMatchOrder]
          );
          
          if (loserBracketMatches.length > 0) {
            const targetMatch = loserBracketMatches[0];
            const updateField = targetMatch.team1_id === null ? 'team1_id' : 'team2_id';
            
            await db.pool.query(
              `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
              [loser_id, targetMatch.id]
            );
            loserAdvanced = true;
            console.log(`Advanced loser to ${updateField} of LB match ${targetMatch.id}`);
          } else {
            console.log(`No available LB match found at R${targetLoserRound} M${targetMatchOrder}`);
          }
        }
        
      } else if (match.bracket_type === 'loser') {
        // LOSER BRACKET LOGIC - FIXED FOR 5 TEAMS
        
        const [maxLoserRound] = await db.pool.query(
          `SELECT MAX(round_number) as max_round FROM matches 
           WHERE bracket_id = ? AND bracket_type = 'loser'`,
          [match.bracket_id]
        );
        
        // SPECIAL HANDLING FOR 5 TEAMS
        if (totalTeams === 5) {
          if (match.round_number === 101) { // LB Round 1
            // Winner of LB R1 advances to LB R2
            const [nextLoserMatches] = await db.pool.query(
              `SELECT * FROM matches 
               WHERE bracket_id = ? AND bracket_type = 'loser' 
               AND round_number = 102 AND match_order = 0
               AND (team1_id IS NULL OR team2_id IS NULL)`,
              [match.bracket_id]
            );
            
            if (nextLoserMatches.length > 0) {
              const nextMatch = nextLoserMatches[0];
              const updateField = nextMatch.team1_id === null ? 'team1_id' : 'team2_id';
              
              await db.pool.query(
                `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
                [winner_id, nextMatch.id]
              );
              winnerAdvanced = true;
            }
          } else if (match.round_number === 102) { // LB Round 2  
            // Winner of LB R2 advances to LB Final
            const [nextLoserMatches] = await db.pool.query(
              `SELECT * FROM matches 
               WHERE bracket_id = ? AND bracket_type = 'loser' 
               AND round_number = 103 AND match_order = 0
               AND (team1_id IS NULL OR team2_id IS NULL)`,
              [match.bracket_id]
            );
            
            if (nextLoserMatches.length > 0) {
              const nextMatch = nextLoserMatches[0];
              const updateField = nextMatch.team1_id === null ? 'team1_id' : 'team2_id';
              
              await db.pool.query(
                `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
                [winner_id, nextMatch.id]
              );
              winnerAdvanced = true;
            }
          } else if (match.round_number === 103) { // LB Final
            // Winner of LB Final advances to Grand Final as team2
            const [grandFinalMatches] = await db.pool.query(
              `SELECT * FROM matches 
               WHERE bracket_id = ? AND bracket_type = 'championship' AND round_number = 200`,
              [match.bracket_id]
            );
            
            if (grandFinalMatches.length > 0) {
              await db.pool.query(
                "UPDATE matches SET team2_id = ? WHERE id = ?",
                [winner_id, grandFinalMatches[0].id]
              );
              winnerAdvanced = true;
            }
          }
        } else {
          // Existing logic for other team counts (3, 4, 6+)
          if (match.round_number < maxLoserRound[0].max_round) {
            const nextMatchOrder = Math.floor(match.match_order / 2);
            const nextLoserRound = match.round_number + 1;
            
            const [nextLoserMatches] = await db.pool.query(
              `SELECT * FROM matches 
               WHERE bracket_id = ? AND bracket_type = 'loser' 
               AND round_number = ? AND match_order = ?`,
              [match.bracket_id, nextLoserRound, nextMatchOrder]
            );
            
            if (nextLoserMatches.length > 0) {
              const nextMatch = nextLoserMatches[0];
              const updateField = nextMatch.team1_id === null ? 'team1_id' : 'team2_id';
              
              await db.pool.query(
                `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
                [winner_id, nextMatch.id]
              );
              winnerAdvanced = true;
            }
          } else {
            // Loser's bracket final - advance to Grand Final
            const [grandFinalMatches] = await db.pool.query(
              `SELECT * FROM matches 
               WHERE bracket_id = ? AND bracket_type = 'championship' AND round_number = 200`,
              [match.bracket_id]
            );
            
            if (grandFinalMatches.length > 0) {
              await db.pool.query(
                "UPDATE matches SET team2_id = ? WHERE id = ?",
                [winner_id, grandFinalMatches[0].id]
              );
              winnerAdvanced = true;
            }
          }
        }
        
      } else if (match.bracket_type === 'championship') {
        // CHAMPIONSHIP MATCH LOGIC WITH BRACKET RESET
        
        if (match.round_number === 200) {
          // Grand Final completed
          if (winner_id === match.team2_id) {
            // BRACKET RESET
            const [resetMatches] = await db.pool.query(
              `SELECT * FROM matches 
               WHERE bracket_id = ? AND bracket_type = 'championship' AND round_number = 201`,
              [match.bracket_id]
            );
            
            if (resetMatches.length > 0) {
              const resetMatch = resetMatches[0];
              await db.pool.query(
                `UPDATE matches SET 
                 team1_id = ?, team2_id = ?, status = 'scheduled' 
                 WHERE id = ?`,
                [match.team1_id, match.team2_id, resetMatch.id]
              );
              bracketReset = true;
            }
          } else {
            // Tournament complete
            await db.pool.query(
              "UPDATE brackets SET winner_team_id = ? WHERE id = ?",
              [winner_id, match.bracket_id]
            );
            tournamentComplete = true;
          }
        } else if (match.round_number === 201) {
          // Reset match completed
          await db.pool.query(
            "UPDATE brackets SET winner_team_id = ? WHERE id = ?",
            [winner_id, match.bracket_id]
          );
          tournamentComplete = true;
        }
      }
    }
    
    let message = "Match updated successfully";
    if (bracketReset) message += " - BRACKET RESET!";
    if (tournamentComplete) message += " - Tournament completed!";
    if (winnerAdvanced || loserAdvanced) message += " - Teams advanced.";
    
    res.json({ 
      success: true, 
      message: message,
      advanced: winnerAdvanced || loserAdvanced,
      tournamentComplete: tournamentComplete,
      bracketReset: bracketReset
    });
  } catch (err) {
    console.error("Error completing match:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// PUT update bracket details
router.put("/:id", async (req, res) => {
  const bracketId = req.params.id;
  const { name, sport_type, elimination_type } = req.body;

  try {
    const [result] = await db.pool.query(
      "UPDATE brackets SET name = ?, sport_type = ?, elimination_type = ? WHERE id = ?",
      [name, sport_type, elimination_type, bracketId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Bracket not found" });
    }

    res.json({ success: true, message: "Bracket updated successfully" });
  } catch (err) {
    console.error("Error updating bracket:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST reset bracket (clear all matches)
router.post("/:id/reset", async (req, res) => {
  const bracketId = req.params.id;

  try {
    // Clear all matches and reset winner
    await db.pool.query("DELETE FROM matches WHERE bracket_id = ?", [bracketId]);
    await db.pool.query("UPDATE brackets SET winner_team_id = NULL WHERE id = ?", [bracketId]);

    res.json({ success: true, message: "Bracket reset successfully" });
  } catch (err) {
    console.error("Error resetting bracket:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;