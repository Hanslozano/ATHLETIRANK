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

// Enhanced helper function to create proper double elimination structure for 3-32+ teams
function createDoubleEliminationStructure(totalTeams) {
  // Calculate winner's bracket structure
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
  const winnerRounds = Math.log2(nextPowerOfTwo);
  
  // Define comprehensive loser bracket structures for different team counts
  const loserBracketStructures = {
    // 3 teams (padded to 4)
    4: [
      { round: 1, matches: 1, description: "LB Round 1 - WB R1 losers compete" },
      { round: 2, matches: 1, description: "LB Final - LB R1 winner vs WB Final loser" }
    ],
    // 5-8 teams (padded to 8)
    8: [
      { round: 1, matches: 2, description: "LB Round 1 - WB R1 losers compete" },
      { round: 2, matches: 2, description: "LB Round 2 - LB R1 winners vs WB R2 losers" },
      { round: 3, matches: 1, description: "LB Round 3 - LB R2 winners compete" },
      { round: 4, matches: 1, description: "LB Final - LB R3 winner vs WB Final loser" }
    ],
    // 9-16 teams (padded to 16)
    16: [
      { round: 1, matches: 4, description: "LB Round 1 - WB R1 losers compete" },
      { round: 2, matches: 4, description: "LB Round 2 - LB R1 winners vs WB R2 losers" },
      { round: 3, matches: 2, description: "LB Round 3 - LB R2 winners compete" },
      { round: 4, matches: 2, description: "LB Round 4 - LB R3 winners vs WB R3 losers" },
      { round: 5, matches: 1, description: "LB Round 5 - LB R4 winners compete" },
      { round: 6, matches: 1, description: "LB Final - LB R5 winner vs WB Final loser" }
    ],
    // 17-32 teams (padded to 32)
    32: [
      { round: 1, matches: 8, description: "LB Round 1 - WB R1 losers compete" },
      { round: 2, matches: 8, description: "LB Round 2 - LB R1 winners vs WB R2 losers" },
      { round: 3, matches: 4, description: "LB Round 3 - LB R2 winners compete" },
      { round: 4, matches: 4, description: "LB Round 4 - LB R3 winners vs WB R3 losers" },
      { round: 5, matches: 2, description: "LB Round 5 - LB R4 winners compete" },
      { round: 6, matches: 2, description: "LB Round 6 - LB R5 winners vs WB R4 losers" },
      { round: 7, matches: 1, description: "LB Round 7 - LB R6 winners compete" },
      { round: 8, matches: 1, description: "LB Final - LB R7 winner vs WB Final loser" }
    ]
  };

  // Find the appropriate structure (use next power of 2)
  const structure = loserBracketStructures[nextPowerOfTwo] || loserBracketStructures[8];
  
  // Special handling for 3 teams
  if (totalTeams === 3) {
    // With 3 teams, we need a modified structure
    return {
      winnerRounds: 2, // 2 rounds in winner's bracket
      loserStructure: [
        { round: 1, matches: 1, description: "LB Round 1 - First round loser gets bye, semifinal loser enters here" },
        { round: 2, matches: 1, description: "LB Final - LB R1 result vs WB Final loser" }
      ],
      totalTeams: 4, // Padded
      actualTeams: 3,
      specialHandling: true
    };
  }
  
  return {
    winnerRounds: winnerRounds,
    loserStructure: structure,
    totalTeams: nextPowerOfTwo,
    actualTeams: totalTeams,
    specialHandling: false
  };
}

// Enhanced helper function for proper loser bracket round mapping for different team sizes
function getLoserBracketRound(winnerRound, totalTeams) {
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
  
  // Comprehensive mappings for different bracket sizes
  const roundMappings = {
    4: { // 3-4 teams
      1: 101, // WB R1 losers go to LB R1
      2: 102  // WB R2 (final) losers go to LB R2 (final)
    },
    8: { // 5-8 teams
      1: 101, // WB R1 losers go to LB R1
      2: 102, // WB R2 losers go to LB R2
      3: 104  // WB R3 (final) losers go to LB R4 (final)
    },
    16: { // 9-16 teams
      1: 101, // WB R1 losers go to LB R1
      2: 102, // WB R2 losers go to LB R2
      3: 104, // WB R3 losers go to LB R4
      4: 106  // WB R4 (final) losers go to LB R6 (final)
    },
    32: { // 17-32 teams
      1: 101, // WB R1 losers go to LB R1
      2: 102, // WB R2 losers go to LB R2
      3: 104, // WB R3 losers go to LB R4
      4: 106, // WB R4 losers go to LB R6
      5: 108  // WB R5 (final) losers go to LB R8 (final)
    }
  };
  
  const mapping = roundMappings[nextPowerOfTwo] || roundMappings[8];
  return mapping[winnerRound] || (100 + winnerRound);
}

// Validation function for bracket structure
function validateDoubleEliminationBracket(totalTeams, matches) {
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
  const expectedCounts = getExpectedMatchCounts(totalTeams);
  
  console.log(`\n=== Validating Double Elimination Bracket for ${totalTeams} teams ===`);
  console.log(`Padded to: ${nextPowerOfTwo} teams`);
  
  // Separate matches by type
  const winnerMatches = matches.filter(m => m.bracket_type === 'winner');
  const loserMatches = matches.filter(m => m.bracket_type === 'loser');
  const championshipMatches = matches.filter(m => m.bracket_type === 'championship');
  const grandFinal = championshipMatches.filter(m => m.round_number === 200);
  const resetFinal = championshipMatches.filter(m => m.round_number === 201);
  
  console.log(`\nActual Counts:`);
  console.log(`- Winner's Bracket: ${winnerMatches.length} matches`);
  console.log(`- Loser's Bracket: ${loserMatches.length} matches`);
  console.log(`- Grand Final: ${grandFinal.length} matches`);
  console.log(`- Reset Final: ${resetFinal.length} matches`);
  console.log(`- Total: ${matches.length} matches`);
  
  console.log(`\nExpected Counts:`);
  console.log(`- Winner's Bracket: ${expectedCounts.winner} matches`);
  console.log(`- Loser's Bracket: ${expectedCounts.loser} matches`);
  console.log(`- Championship: ${expectedCounts.championship} matches`);
  console.log(`- Total: ${expectedCounts.total} matches`);
  
  // Validation
  let isValid = true;
  
  if (winnerMatches.length !== expectedCounts.winner) {
    console.log(`❌ Winner's bracket mismatch: got ${winnerMatches.length}, expected ${expectedCounts.winner}`);
    isValid = false;
  }
  
  if (loserMatches.length !== expectedCounts.loser) {
    console.log(`❌ Loser's bracket mismatch: got ${loserMatches.length}, expected ${expectedCounts.loser}`);
    isValid = false;
  }
  
  if (championshipMatches.length !== expectedCounts.championship) {
    console.log(`❌ Championship mismatch: got ${championshipMatches.length}, expected ${expectedCounts.championship}`);
    isValid = false;
  }
  
  if (matches.length !== expectedCounts.total) {
    console.log(`❌ Total matches mismatch: got ${matches.length}, expected ${expectedCounts.total}`);
    isValid = false;
  }
  
  // Check for reset final being hidden initially
  if (resetFinal.length > 0 && resetFinal[0].status !== 'hidden') {
    console.log(`⚠️  Reset final should start as 'hidden' status`);
  }
  
  if (isValid) {
    console.log(`✅ Bracket structure is VALID for ${totalTeams} teams!`);
  } else {
    console.log(`❌ Bracket structure has ERRORS for ${totalTeams} teams!`);
  }
  
  return isValid;
}

function getExpectedMatchCounts(teams) {
  const powerOf2 = Math.pow(2, Math.ceil(Math.log2(teams)));
  
  // Expected counts based on team ranges
  const expectations = {
    3: { winner: 3, loser: 2, championship: 2, total: 7 },
    4: { winner: 3, loser: 2, championship: 2, total: 7 },
    5: { winner: 7, loser: 4, championship: 2, total: 13 },
    6: { winner: 7, loser: 4, championship: 2, total: 13 },
    7: { winner: 7, loser: 4, championship: 2, total: 13 },
    8: { winner: 7, loser: 4, championship: 2, total: 13 },
    9: { winner: 15, loser: 6, championship: 2, total: 23 }
  };
  
  // Find the right expectation
  if (teams <= 4) return expectations[4];
  if (teams <= 8) return expectations[8];
  if (teams <= 16) return { winner: 15, loser: 6, championship: 2, total: 23 };
  if (teams <= 32) return { winner: 31, loser: 14, championship: 2, total: 47 };
  
  // Fallback calculation for larger brackets
  return {
    winner: powerOf2 - 1,
    loser: powerOf2 - 2,
    championship: 2,
    total: (powerOf2 - 1) + (powerOf2 - 2) + 2
  };
}

// POST generate full bracket - ENHANCED FOR 3-32+ TEAMS WITH BRACKET RESET
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
      // Single elimination logic (unchanged, works for any team count)
      const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(shuffledTeams.length)));
      while (shuffledTeams.length < nextPowerOfTwo) {
        shuffledTeams.push(null); // BYE slot
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

          // If BYE → auto advance
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
      // ENHANCED DOUBLE ELIMINATION BRACKET GENERATION FOR ANY TEAM COUNT
      const structure = createDoubleEliminationStructure(totalTeams);
      const nextPowerOfTwo = structure.totalTeams;
      
      console.log(`Generating double elimination for ${totalTeams} teams (padded to ${nextPowerOfTwo})`);
      console.log(`Structure:`, structure);
      
      // Pad teams to next power of 2
      while (shuffledTeams.length < nextPowerOfTwo) {
        shuffledTeams.push(null); // BYE slot
      }

      // GENERATE WINNER'S BRACKET
      let currentRoundTeams = shuffledTeams;
      let winnerMatches = 0;

      for (let round = 1; round <= structure.winnerRounds; round++) {
        const roundMatches = Math.floor(currentRoundTeams.length / 2);
        const nextRoundTeams = [];

        for (let i = 0; i < roundMatches; i++) {
          const team1 = currentRoundTeams[i * 2];
          const team2 = currentRoundTeams[i * 2 + 1] || null;

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
          } else {
            nextRoundTeams.push({ placeholder: true, round: round, match: i });
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
          winnerMatches++;
        }

        currentRoundTeams = nextRoundTeams;
      }

      // GENERATE LOSER'S BRACKET
      let loserMatches = 0;
      
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
          loserMatches++;
        }
      }

      // CHAMPIONSHIP MATCHES - CREATE BOTH POTENTIAL MATCHES
      // Grand Final (round 200)
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

      // Bracket Reset Match (round 201) - HIDDEN until needed
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

      console.log(`Generated enhanced double elimination bracket:`);
      console.log(`- Actual teams: ${totalTeams} (padded to ${nextPowerOfTwo})`);
      console.log(`- Winner's bracket matches: ${winnerMatches}`);
      console.log(`- Loser's bracket matches: ${loserMatches}`);
      console.log(`- Championship matches: 2 (Grand Final + Reset)`);
      console.log(`- Total matches: ${allMatches.length}`);

      // Validate the generated bracket
      const isValid = validateDoubleEliminationBracket(totalTeams, allMatches);
      if (!isValid) {
        console.error("Generated bracket structure does not match expected format!");
      }
    }

    res.json({
      success: true,
      message: `Generated ${allMatches.length} matches for ${eliminationType} elimination (${totalTeams} teams)`,
      matches: allMatches,
      elimination_type: eliminationType,
      team_count: totalTeams,
      padded_to: eliminationType === 'double' ? Math.pow(2, Math.ceil(Math.log2(totalTeams))) : null
    });

  } catch (err) {
    console.error("Error generating bracket:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// FIXED POST complete a match - WITH CORRECTED LOSER BRACKET PROGRESSION
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
        await db.pool.query(
          "UPDATE brackets SET winner_team_id = ? WHERE id = ?",
          [winner_id, match.bracket_id]
        );
        tournamentComplete = true;
      }
    } else if (eliminationType === "double") {
      // FIXED DOUBLE ELIMINATION LOGIC
      
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
          // Winner's bracket final - advance to Grand Final as team1
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
            console.log(`Winner bracket champion ${winner_id} advanced to Grand Final (team1)`);
          }
        }
        
        // 2. Drop losers to correct loser's bracket round - FIXED LOGIC
        if (loser_id) {
          const targetLoserRound = getLoserBracketRound(match.round_number, totalTeams);
          
          // Find the appropriate loser bracket match
          // For initial rounds, place in first available slot
          // For later rounds that feed into specific matches, calculate position
          const [loserBracketMatches] = await db.pool.query(
            `SELECT * FROM matches 
             WHERE bracket_id = ? AND bracket_type = 'loser' 
             AND round_number = ?
             ORDER BY match_order`,
            [match.bracket_id, targetLoserRound]
          );
          
          if (loserBracketMatches.length > 0) {
            let targetMatch = null;
            
            // For first loser round, match teams by position
            if (targetLoserRound === 101) {
              // Map winner bracket position to loser bracket position
              const loserMatchIndex = Math.floor(match.match_order / 2);
              if (loserMatchIndex < loserBracketMatches.length) {
                targetMatch = loserBracketMatches[loserMatchIndex];
              } else {
                targetMatch = loserBracketMatches[0];
              }
            } else {
              // For subsequent rounds, find first available slot
              targetMatch = loserBracketMatches.find(m => 
                m.team1_id === null || m.team2_id === null
              );
              if (!targetMatch) targetMatch = loserBracketMatches[0];
            }
            
            if (targetMatch) {
              const updateField = targetMatch.team1_id === null ? 'team1_id' : 'team2_id';
              
              await db.pool.query(
                `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
                [loser_id, targetMatch.id]
              );
              loserAdvanced = true;
              console.log(`WB R${match.round_number} loser ${loser_id} placed in LB R${targetLoserRound - 100} match ${targetMatch.id}`);
            }
          }
        }
        
      } else if (match.bracket_type === 'loser') {
        // LOSER BRACKET LOGIC - FIXED
        const [maxLoserRound] = await db.pool.query(
          `SELECT MAX(round_number) as max_round FROM matches 
           WHERE bracket_id = ? AND bracket_type = 'loser'`,
          [match.bracket_id]
        );
        
        if (match.round_number < maxLoserRound[0].max_round) {
          // Continue in loser's bracket - find the next available match
          const [nextLoserMatches] = await db.pool.query(
            `SELECT * FROM matches 
             WHERE bracket_id = ? AND bracket_type = 'loser' 
             AND round_number > ?
             ORDER BY round_number, match_order`,
            [match.bracket_id, match.round_number]
          );
          
          if (nextLoserMatches.length > 0) {
            // Find the first match with an empty slot
            let targetMatch = nextLoserMatches.find(m => 
              m.team1_id === null || m.team2_id === null
            );
            
            // If no empty slots, take the first match of next immediate round
            if (!targetMatch) {
              const nextRoundNum = match.round_number + 1;
              targetMatch = nextLoserMatches.find(m => 
                m.round_number === nextRoundNum
              );
            }
            
            if (targetMatch) {
              const updateField = targetMatch.team1_id === null ? 'team1_id' : 'team2_id';
              
              await db.pool.query(
                `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
                [winner_id, targetMatch.id]
              );
              winnerAdvanced = true;
              console.log(`LB winner ${winner_id} advanced to LB R${targetMatch.round_number - 100} match ${targetMatch.id}`);
            }
          }
        } else {
          // Loser's bracket final - advance to Grand Final as team2
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
            console.log(`Loser bracket champion ${winner_id} advanced to Grand Final (team2)`);
          }
        }
        
      } else if (match.bracket_type === 'championship') {
        // CHAMPIONSHIP MATCH LOGIC WITH BRACKET RESET
        
        if (match.round_number === 200) {
          // Grand Final completed
          
          // Check if winner came from loser's bracket (team2)
          if (winner_id === match.team2_id) {
            // BRACKET RESET! Loser's bracket winner beat winner's bracket winner
            console.log("BRACKET RESET! Activating reset match...");
            
            const [resetMatches] = await db.pool.query(
              `SELECT * FROM matches 
               WHERE bracket_id = ? AND bracket_type = 'championship' AND round_number = 201`,
              [match.bracket_id]
            );
            
            if (resetMatches.length > 0) {
              const resetMatch = resetMatches[0];
              
              // Set up reset match: same teams, swap positions
              await db.pool.query(
                `UPDATE matches SET 
                 team1_id = ?, team2_id = ?, status = 'scheduled' 
                 WHERE id = ?`,
                [match.team2_id, match.team1_id, resetMatch.id]
              );
              
              bracketReset = true;
              console.log(`Bracket reset match activated: ${resetMatch.id}`);
            }
            
          } else {
            // Winner's bracket winner won - tournament complete
            await db.pool.query(
              "UPDATE brackets SET winner_team_id = ? WHERE id = ?",
              [winner_id, match.bracket_id]
            );
            tournamentComplete = true;
            console.log(`Tournament completed! Champion: ${winner_id}`);
          }
          
        } else if (match.round_number === 201) {
          // Reset match completed - tournament over
          await db.pool.query(
            "UPDATE brackets SET winner_team_id = ? WHERE id = ?",
            [winner_id, match.bracket_id]
          );
          tournamentComplete = true;
          console.log(`Tournament completed after reset! Champion: ${winner_id}`);
        }
      }
    }
    
    let message = "Match updated successfully";
    if (bracketReset) {
      message += " - BRACKET RESET! A second Grand Final has been scheduled.";
    } else if (tournamentComplete) {
      message += " - Tournament completed!";
    } else if (winnerAdvanced || loserAdvanced) {
      message += " - Teams have been advanced to next rounds.";
    }
    
    res.json({ 
      success: true, 
      message: message,
      advanced: winnerAdvanced || loserAdvanced,
      winnerId: winner_id,
      loserId: loser_id,
      loserAdvanced: loserAdvanced,
      winnerAdvanced: winnerAdvanced,
      tournamentComplete: tournamentComplete,
      bracketReset: bracketReset,
      bracketType: match.bracket_type,
      roundNumber: match.round_number
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