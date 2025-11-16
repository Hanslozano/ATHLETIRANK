const express = require("express");
const router = express.Router();
const db = require("../config/database");
const fisherYatesShuffle = require("../utils/fisherYates");

// Enhanced helper function to create proper double elimination structure
function createDoubleEliminationStructure(totalTeams) {
  // Special handling for 3-4 teams
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
  
  // CORRECTED: Special handling for 5 teams - FIXED to only 2 winner rounds
  if (totalTeams === 5) {
    return {
      winnerRounds: 2, // FIXED: Only 2 rounds, not 3!
      loserStructure: [
        { round: 1, matches: 1, description: "LB Round 1" },   // Loser G1 vs Loser G2
        { round: 2, matches: 1, description: "LB Round 2" },   // Winner LB R1 vs Loser G3
        { round: 3, matches: 1, description: "LB Final" }      // Winner LB R2 vs Loser G4
      ],
      totalTeams: 5,
      actualTeams: 5
    };
  }

  // Special handling for 6 teams
  if (totalTeams === 6) {
    return {
      winnerRounds: 3,
      loserStructure: [
        { round: 1, matches: 1, description: "LB Round 1" },
        { round: 2, matches: 1, description: "LB Round 2" },
        { round: 3, matches: 1, description: "LB Round 3" },
        { round: 4, matches: 1, description: "LB Final" }
      ],
      totalTeams: 6,
      actualTeams: 6
    };
  }

  // Special handling for 7 teams
  if (totalTeams === 7) {
  return {
    winnerRounds: 3,
    loserStructure: [
      { round: 1, matches: 2, description: "LB Round 1" },  // ✅ CHANGED: 2 matches instead of 1
      { round: 2, matches: 1, description: "LB Round 2" },
      { round: 3, matches: 1, description: "LB Round 3" },
      { round: 4, matches: 1, description: "LB Final" }
    ],
    totalTeams: 7,
    actualTeams: 7
  };
}
  
  // Special handling for 8 teams
  if (totalTeams === 8) {
    return {
      winnerRounds: 3,
      loserStructure: [
        { round: 1, matches: 2, description: "LB Round 1" },
        { round: 2, matches: 2, description: "LB Round 2" },
        { round: 3, matches: 1, description: "LB Round 3" },
        { round: 4, matches: 1, description: "LB Final" }
      ],
      totalTeams: 8,
      actualTeams: 8
    };
  }
  
  // Existing logic for 9-32 teams
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
  const winnerRounds = Math.log2(nextPowerOfTwo);
  
  const loserBracketStructures = {
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
  if (totalTeams <= 16) {
    structure = loserBracketStructures[16];
  } else {
    structure = loserBracketStructures[16];
  }
  
  return {
    winnerRounds: winnerRounds,
    loserStructure: structure,
    totalTeams: nextPowerOfTwo,
    actualTeams: totalTeams
  };
}

// Enhanced helper function for proper loser bracket round mapping
function getLoserBracketRound(winnerRound, totalTeams, matchOrder = 0) {
  if (totalTeams === 3) {
    return 101;
  }
  
  if (totalTeams === 4) {
    return winnerRound === 1 ? 101 : 102;
  }
  
  // CORRECTED: 5 teams loser bracket mapping
  if (totalTeams === 5) {
    if (winnerRound === 1) {
      return 101; // Both R1 losers go to LB R1
    } else if (winnerRound === 2) {
      // Game 3 loser -> LB R2, Game 4 loser -> LB Final
      return matchOrder === 0 ? 102 : 103;
    }
  }

  if (totalTeams === 6) {
    if (winnerRound === 1) {
      return 101;
    } else if (winnerRound === 2) {
      return matchOrder === 0 ? 102 : 103;
    } else if (winnerRound === 3) {
      return 104;
    }
  }

  if (totalTeams === 7) {
  if (winnerRound === 1) {
    return 101;
  } else if (winnerRound === 2) {
    // ✅ FIXED: matchOrder 1 (Game 5) -> LB R3, others (Game 4 & 7) -> LB R2
    return matchOrder === 1 ? 103 : 102;
  } else if (winnerRound === 3) {
    return 104;
  }
}
    
  if (totalTeams === 8) {
    if (winnerRound === 1) {
      return 101;
    } else if (winnerRound === 2) {
      return 102;
    } else if (winnerRound === 3) {
      return 104;
    }
  }
  
  if (totalTeams > 8) {
    const mappings = {
      1: 101,
      2: 102,  
      3: 104
    };
    return mappings[winnerRound] || 101;
  }
}

function getLoserBracketMatchOrder(winnerRound, winnerMatchOrder, totalTeams) {
 // FIXED: 7 teams match order
  if (totalTeams === 7) {
  if (winnerRound === 1) {
    return winnerMatchOrder === 2 ? 1 : 0;
  } else if (winnerRound === 2) {
    // ✅ FIXED: Game 4 (M0) -> Game 8 (M0), Game 7 (M2) -> Game 8 (M0)
    // Only Game 5 (M1) goes to different match
    return 0;
  }
  return 0;
}
  
  if (totalTeams < 8) return 0;
  
  // Standard logic for 8+ teams
  if (totalTeams === 8) {
    if (winnerRound === 1) {
      return Math.floor(winnerMatchOrder / 2);
    } else if (winnerRound === 2) {
      return winnerMatchOrder;
    }
    return 0;
  }
  
  if (winnerRound === 1) {
    return winnerMatchOrder % 2;
  } else if (winnerRound === 2) {
    return winnerMatchOrder % 2;
  }
  
  return winnerMatchOrder % 2;
}

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
    5: { winner: 4, loser: 3, championship: 2, total: 9 }, // FIXED: 4 winner matches, not 5
    6: { winner: 5, loser: 4, championship: 2, total: 11 },
    7: { winner: 6, loser: 5, championship: 2, total: 13 },  // ✅ FIXED!
    8: { winner: 7, loser: 6, championship: 2, total: 15 }
  };
  
  return expectations[teams] || { winner: teams - 1, loser: teams - 2, championship: 2, total: (teams * 2) - 1 };
}

// POST generate full bracket
router.post("/:id/generate", async (req, res) => {
  const bracketId = req.params.id;

  try {
    await db.pool.query("DELETE FROM matches WHERE bracket_id = ?", [bracketId]);
    await db.pool.query("UPDATE brackets SET winner_team_id = NULL WHERE id = ?", [bracketId]);

    const [bracketInfo] = await db.pool.query(
      "SELECT elimination_type FROM brackets WHERE id = ?",
      [bracketId]
    );
    
    if (bracketInfo.length === 0) {
      return res.status(404).json({ error: "Bracket not found" });
    }
    
    const eliminationType = bracketInfo[0].elimination_type;

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

    const shuffledTeams = fisherYatesShuffle(teams);
    const allMatches = [];
    const totalTeams = shuffledTeams.length;

    if (eliminationType === "single") {
      // SPECIAL HANDLING FOR 5 TEAMS - FIXED
      if (totalTeams === 5) {
        console.log('Generating single elimination for 5 teams (4 matches total)');
        
        // Round 1: 2 matches (Teams 1-4 compete)
        // Game 1: Team 1 vs Team 2
        // Game 2: Team 3 vs Team 4
        const round1Matches = [
          { team1: shuffledTeams[0], team2: shuffledTeams[1], matchOrder: 0 }, // Game 1
          { team1: shuffledTeams[2], team2: shuffledTeams[3], matchOrder: 1 }  // Game 2
        ];

        for (const { team1, team2, matchOrder } of round1Matches) {
          const [result] = await db.pool.query(
            `INSERT INTO matches (bracket_id, round_number, bracket_type, team1_id, team2_id, winner_id, status, match_order) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [bracketId, 1, 'winner', team1.id, team2.id, null, 'scheduled', matchOrder]
          );
          allMatches.push({
            id: result.insertId,
            bracket_id: bracketId,
            round_number: 1,
            bracket_type: 'winner',
            team1_id: team1.id,
            team2_id: team2.id,
            winner_id: null,
            status: 'scheduled',
            match_order: matchOrder
          });
        }

        // Round 2: 1 match (Semi-final with bye)
        // Game 3: Winner(Game 1) vs Team 5 (bye team)
        const [r2m0] = await db.pool.query(
          `INSERT INTO matches (bracket_id, round_number, bracket_type, team1_id, team2_id, winner_id, status, match_order) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [bracketId, 2, 'winner', null, shuffledTeams[4].id, null, 'scheduled', 0]
        );
        allMatches.push({
          id: r2m0.insertId,
          bracket_id: bracketId,
          round_number: 2,
          bracket_type: 'winner',
          team1_id: null,
          team2_id: shuffledTeams[4].id,
          winner_id: null,
          status: 'scheduled',
          match_order: 0
        });

        // Round 3: Finals (1 match)
        // Game 4: Winner(Game 3) vs Winner(Game 2)
        const [finals] = await db.pool.query(
          `INSERT INTO matches (bracket_id, round_number, bracket_type, team1_id, team2_id, winner_id, status, match_order) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [bracketId, 3, 'winner', null, null, null, 'scheduled', 0]
        );
        allMatches.push({
          id: finals.insertId,
          bracket_id: bracketId,
          round_number: 3,
          bracket_type: 'winner',
          team1_id: null,
          team2_id: null,
          winner_id: null,
          status: 'scheduled',
          match_order: 0
        });

        console.log(`✅ Generated 4 matches for 5-team single elimination`);

        return res.json({
          success: true,
          message: `Generated 4 matches for single elimination (5 teams)`,
          matches: allMatches,
          elimination_type: eliminationType,
          team_count: totalTeams
        });
      }

      // SPECIAL HANDLING FOR 6 TEAMS - ADDED
      if (totalTeams === 6) {
        console.log('Generating single elimination for 6 teams (5 matches total)');
        
        // Round 1: 2 matches (Teams 1-4 compete, Teams 5-6 get byes)
        const round1Matches = [
          { team1: shuffledTeams[0], team2: shuffledTeams[1], matchOrder: 0 }, // Game 1
          { team1: shuffledTeams[2], team2: shuffledTeams[3], matchOrder: 1 }  // Game 2
        ];

        for (const { team1, team2, matchOrder } of round1Matches) {
          const [result] = await db.pool.query(
            `INSERT INTO matches (bracket_id, round_number, bracket_type, team1_id, team2_id, winner_id, status, match_order) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [bracketId, 1, 'winner', team1.id, team2.id, null, 'scheduled', matchOrder]
          );
          allMatches.push({
            id: result.insertId,
            bracket_id: bracketId,
            round_number: 1,
            bracket_type: 'winner',
            team1_id: team1.id,
            team2_id: team2.id,
            winner_id: null,
            status: 'scheduled',
            match_order: matchOrder
          });
        }

        // Round 2: 2 matches (semifinals)
        // Game 3: Winner(Game 1) vs Team 5 (bye)
        // Game 4: Winner(Game 2) vs Team 6 (bye)
        const round2Matches = [
          { team1: null, team2: shuffledTeams[4], matchOrder: 0 }, // Game 3
          { team1: null, team2: shuffledTeams[5], matchOrder: 1 }  // Game 4
        ];

        for (const { team1, team2, matchOrder } of round2Matches) {
          const [result] = await db.pool.query(
            `INSERT INTO matches (bracket_id, round_number, bracket_type, team1_id, team2_id, winner_id, status, match_order) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [bracketId, 2, 'winner', team1?.id || null, team2.id, null, 'scheduled', matchOrder]
          );
          allMatches.push({
            id: result.insertId,
            bracket_id: bracketId,
            round_number: 2,
            bracket_type: 'winner',
            team1_id: team1?.id || null,
            team2_id: team2.id,
            winner_id: null,
            status: 'scheduled',
            match_order: matchOrder
          });
        }

        // Round 3: Finals (1 match)
        // Game 5: Winner(Game 3) vs Winner(Game 4)
        const [finals] = await db.pool.query(
          `INSERT INTO matches (bracket_id, round_number, bracket_type, team1_id, team2_id, winner_id, status, match_order) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [bracketId, 3, 'winner', null, null, null, 'scheduled', 0]
        );
        allMatches.push({
          id: finals.insertId,
          bracket_id: bracketId,
          round_number: 3,
          bracket_type: 'winner',
          team1_id: null,
          team2_id: null,
          winner_id: null,
          status: 'scheduled',
          match_order: 0
        });

        console.log(`✅ Generated 5 matches for 6-team single elimination`);

        return res.json({
          success: true,
          message: `Generated 5 matches for single elimination (6 teams)`,
          matches: allMatches,
          elimination_type: eliminationType,
          team_count: totalTeams
        });
      }

      // STANDARD LOGIC FOR OTHER TEAM COUNTS
      const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(shuffledTeams.length)));
      while (shuffledTeams.length < nextPowerOfTwo) {
        shuffledTeams.push(null);
      }

      const totalRounds = Math.log2(nextPowerOfTwo);
      let currentRoundTeams = shuffledTeams;

      for (let round = 1; round <= totalRounds; round++) {
        const roundMatches = Math.ceil(currentRoundTeams.length / 2);
        const nextRoundTeams = [];

        for (let i = 0; i < roundMatches; i++) {
          const team1 = currentRoundTeams[i * 2];
          const team2 = currentRoundTeams[i * 2 + 1];

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
            matchData.status = "bye";
            nextRoundTeams.push(team1);
          } else if (team2 && !team1) {
            matchData.winner_id = team2.id;
            matchData.status = "bye";
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
      const structure = createDoubleEliminationStructure(totalTeams);
      
      console.log(`Generating double elimination for ${totalTeams} teams`);
      
      let paddedTeams;
      if (totalTeams >= 3 && totalTeams <= 8) {
        paddedTeams = [...shuffledTeams];
      } else {
        paddedTeams = [...shuffledTeams];
        while (paddedTeams.length < structure.totalTeams) {
          paddedTeams.push(null);
        }
      }

      let winnerMatches = [];

      if (totalTeams === 5) {
        // CORRECTED: 5-team winner's bracket - ONLY 2 ROUNDS
        // Round 1: Game 1 (T1 vs T2), Game 2 (T3 vs T4)
        const round1Matches = [
          { team1: paddedTeams[0], team2: paddedTeams[1], matchOrder: 0 }, // Game 1
          { team1: paddedTeams[2], team2: paddedTeams[3], matchOrder: 1 }  // Game 2
        ];

        for (const { team1, team2, matchOrder } of round1Matches) {
          const matchData = {
            bracket_id: bracketId,
            round_number: 1,
            bracket_type: 'winner',
            team1_id: team1?.id || null,
            team2_id: team2?.id || null,
            winner_id: null,
            status: "scheduled",
            match_order: matchOrder
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
          winnerMatches.push({ ...matchData, roundIndex: 1, matchIndex: matchOrder });
        }

        // Round 2: Game 3 (Winner G1 vs Team5), Game 4 (Winner G2 vs Winner G3)
        const round2Matches = [
          { team1: null, team2: paddedTeams[4], matchOrder: 0 }, // Game 3: Winner(G1) vs Team5
          { team1: null, team2: null, matchOrder: 1 }             // Game 4: Winner(G2) vs Winner(G3)
        ];

        for (const { team1, team2, matchOrder } of round2Matches) {
          const matchData = {
            bracket_id: bracketId,
            round_number: 2,
            bracket_type: 'winner',
            team1_id: team1?.id || null,
            team2_id: team2?.id || null,
            winner_id: null,
            status: "scheduled",
            match_order: matchOrder
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
          winnerMatches.push({ ...matchData, roundIndex: 2, matchIndex: matchOrder });
        }
        // NO ROUND 3 - Winner of Game 4 goes directly to Grand Final!

      } else {
        // Original generation for other team counts
        let currentRoundTeams = paddedTeams;

        for (let round = 1; round <= structure.winnerRounds; round++) {
          const roundMatches = Math.ceil(currentRoundTeams.length / 2);
          const nextRoundTeams = [];

          for (let i = 0; i < roundMatches; i++) {
            const team1 = currentRoundTeams[i * 2];
            const team2 = currentRoundTeams[i * 2 + 1];

            if (totalTeams === 6 && round === 1 && i >= 2) {
              if (team1) nextRoundTeams.push(team1);
              if (team2) nextRoundTeams.push(team2);
              continue;
            }
            
            if (totalTeams === 7 && round === 1 && i === 3) {
              // For 7 teams: Create a bye match for Team 7
              const byeMatchData = {
                bracket_id: bracketId,
                round_number: round,
                bracket_type: 'winner',
                team1_id: team1 ? team1.id : null,
                team2_id: null,
                winner_id: team1 ? team1.id : null,
                status: "bye",
                match_order: i
              };

              const [byeResult] = await db.pool.query(
                `INSERT INTO matches (bracket_id, round_number, bracket_type, team1_id, team2_id, winner_id, status, match_order) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [byeMatchData.bracket_id, byeMatchData.round_number, byeMatchData.bracket_type,
                byeMatchData.team1_id, byeMatchData.team2_id, byeMatchData.winner_id,
                byeMatchData.status, byeMatchData.match_order]
              );

              byeMatchData.id = byeResult.insertId;
              allMatches.push(byeMatchData);
              winnerMatches.push({ ...byeMatchData, roundIndex: round, matchIndex: i });
              
              if (team1) {
                nextRoundTeams.push(team1);
              }
              continue;
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

            if (team1 && !team2) {
              matchData.winner_id = team1.id;
              matchData.status = "bye";
              nextRoundTeams.push(team1);
            } else if (!team1 && team2) {
              matchData.winner_id = team2.id;
              matchData.status = "bye";
              nextRoundTeams.push(team2);
            } else if (team1 && team2) {
              nextRoundTeams.push({ placeholder: true });
            } else {
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

// POST complete a match - WITH CORRECTED 5-TEAM SINGLE & 7-TEAM DOUBLE LOGIC
router.post("/matches/:id/complete", async (req, res) => {
  const matchId = req.params.id;
  const { winner_id, scores } = req.body;

  try {
    const [matches] = await db.pool.query(
      "SELECT * FROM matches WHERE id = ?",
      [matchId]
    );
    
    if (matches.length === 0) {
      return res.status(404).json({ error: "Match not found" });
    }
    
    const match = matches[0];
    
    await db.pool.query(
      "UPDATE matches SET winner_id = ?, status = 'completed', score_team1 = ?, score_team2 = ? WHERE id = ?",
      [winner_id, scores?.team1 || null, scores?.team2 || null, matchId]
    );
    
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
    
    if (eliminationType === "single") {
      // SPECIAL HANDLING FOR 5 TEAMS - FIXED
      if (totalTeams === 5) {
        if (match.round_number === 1) {
          // Round 1 winners advance
          if (match.match_order === 0) {
            // Game 1 winner -> Game 3 (R2 M0) team1
            const [nextMatches] = await db.pool.query(
              `SELECT * FROM matches 
               WHERE bracket_id = ? AND bracket_type = 'winner' 
               AND round_number = 2 AND match_order = 0`,
              [match.bracket_id]
            );
            
            if (nextMatches.length > 0) {
              await db.pool.query(
                `UPDATE matches SET team1_id = ? WHERE id = ?`,
                [winner_id, nextMatches[0].id]
              );
              winnerAdvanced = true;
            }
          } else if (match.match_order === 1) {
            // Game 2 winner -> Finals (R3 M0) team2
            const [finalsMatch] = await db.pool.query(
              `SELECT * FROM matches 
               WHERE bracket_id = ? AND bracket_type = 'winner' 
               AND round_number = 3 AND match_order = 0`,
              [match.bracket_id]
            );
            
            if (finalsMatch.length > 0) {
              await db.pool.query(
                `UPDATE matches SET team2_id = ? WHERE id = ?`,
                [winner_id, finalsMatch[0].id]
              );
              winnerAdvanced = true;
            }
          }
        } else if (match.round_number === 2) {
          // Game 3 winner -> Finals (R3 M0) team1
          const [finalsMatch] = await db.pool.query(
            `SELECT * FROM matches 
             WHERE bracket_id = ? AND bracket_type = 'winner' 
             AND round_number = 3 AND match_order = 0`,
            [match.bracket_id]
          );
          
          if (finalsMatch.length > 0) {
            await db.pool.query(
              `UPDATE matches SET team1_id = ? WHERE id = ?`,
              [winner_id, finalsMatch[0].id]
            );
            winnerAdvanced = true;
          }
        } else if (match.round_number === 3) {
          // Finals - tournament complete
          await db.pool.query(
            "UPDATE brackets SET winner_team_id = ? WHERE id = ?",
            [winner_id, match.bracket_id]
          );
          tournamentComplete = true;
        }
      } 
      // SPECIAL HANDLING FOR 6 TEAMS - ADDED
      else if (totalTeams === 6) {
        if (match.round_number === 1) {
          // Round 1 winners advance to Round 2
          const [nextMatches] = await db.pool.query(
            `SELECT * FROM matches 
             WHERE bracket_id = ? AND bracket_type = 'winner' 
             AND round_number = 2 AND match_order = ?`,
            [match.bracket_id, match.match_order]
          );
          
          if (nextMatches.length > 0) {
            await db.pool.query(
              `UPDATE matches SET team1_id = ? WHERE id = ?`,
              [winner_id, nextMatches[0].id]
            );
            winnerAdvanced = true;
          }
        } else if (match.round_number === 2) {
          // Round 2 (semifinals) winners advance to Finals
          const [finalsMatch] = await db.pool.query(
            `SELECT * FROM matches 
             WHERE bracket_id = ? AND bracket_type = 'winner' 
             AND round_number = 3 AND match_order = 0`,
            [match.bracket_id]
          );
          
          if (finalsMatch.length > 0) {
            const updateField = match.match_order === 0 ? 'team1_id' : 'team2_id';
            await db.pool.query(
              `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
              [winner_id, finalsMatch[0].id]
            );
            winnerAdvanced = true;
          }
        } else if (match.round_number === 3) {
          // Finals - tournament complete
          await db.pool.query(
            "UPDATE brackets SET winner_team_id = ? WHERE id = ?",
            [winner_id, match.bracket_id]
          );
          tournamentComplete = true;
        }
      }
      else {
        // STANDARD LOGIC FOR OTHER TEAM COUNTS
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
      }
    } else if (eliminationType === "double") {
      
      if (match.bracket_type === 'winner') {
        // CORRECTED: 5-TEAM WINNER BRACKET PROGRESSION
        if (totalTeams === 5) {
          if (match.round_number === 1) {
            // Round 1 matches
            if (match.match_order === 0) {
              // Game 1 winner -> Game 3 (R2 M0) team1 position
              const [nextMatches] = await db.pool.query(
                `SELECT * FROM matches 
                 WHERE bracket_id = ? AND bracket_type = 'winner' 
                 AND round_number = 2 AND match_order = 0`,
                [match.bracket_id]
              );
              
              if (nextMatches.length > 0) {
                await db.pool.query(
                  "UPDATE matches SET team1_id = ? WHERE id = ?",
                  [winner_id, nextMatches[0].id]
                );
                winnerAdvanced = true;
              }
            } else if (match.match_order === 1) {
              // Game 2 winner -> Game 4 (R2 M1) team1 position
              const [nextMatches] = await db.pool.query(
                `SELECT * FROM matches 
                 WHERE bracket_id = ? AND bracket_type = 'winner' 
                 AND round_number = 2 AND match_order = 1`,
                [match.bracket_id]
              );
              
              if (nextMatches.length > 0) {
                await db.pool.query(
                  "UPDATE matches SET team1_id = ? WHERE id = ?",
                  [winner_id, nextMatches[0].id]
                );
                winnerAdvanced = true;
              }
            }

            // Drop losers to LB R1
            if (loser_id) {
              const [loserMatches] = await db.pool.query(
                `SELECT * FROM matches 
                 WHERE bracket_id = ? AND bracket_type = 'loser' 
                 AND round_number = 101 AND match_order = 0`,
                [match.bracket_id]
              );
              
              if (loserMatches.length > 0) {
                const updateField = loserMatches[0].team1_id === null ? 'team1_id' : 'team2_id';
                await db.pool.query(
                  `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
                  [loser_id, loserMatches[0].id]
                );
                loserAdvanced = true;
              }
            }
          } else if (match.round_number === 2) {
            // Round 2 matches
            if (match.match_order === 0) {
              // Game 3 winner -> Game 4 (R2 M1) team2 position
              const [nextMatches] = await db.pool.query(
                `SELECT * FROM matches 
                 WHERE bracket_id = ? AND bracket_type = 'winner' 
                 AND round_number = 2 AND match_order = 1`,
                [match.bracket_id]
              );
              
              if (nextMatches.length > 0) {
                await db.pool.query(
                  "UPDATE matches SET team2_id = ? WHERE id = ?",
                  [winner_id, nextMatches[0].id]
                );
                winnerAdvanced = true;
              }

              // Game 3 loser -> LB R2
              if (loser_id) {
                const [loserMatches] = await db.pool.query(
                  `SELECT * FROM matches 
                   WHERE bracket_id = ? AND bracket_type = 'loser' 
                   AND round_number = 102 AND match_order = 0`,
                  [match.bracket_id]
                );
                
                if (loserMatches.length > 0) {
                  const updateField = loserMatches[0].team1_id === null ? 'team1_id' : 'team2_id';
                  await db.pool.query(
                    `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
                    [loser_id, loserMatches[0].id]
                  );
                  loserAdvanced = true;
                }
              }
            } else if (match.match_order === 1) {
              // FIXED: Game 4 winner goes DIRECTLY to Grand Final!
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

              // Game 4 loser -> LB Final (round 103)
              if (loser_id) {
                const [loserMatches] = await db.pool.query(
                  `SELECT * FROM matches 
                   WHERE bracket_id = ? AND bracket_type = 'loser' 
                   AND round_number = 103 AND match_order = 0`,
                  [match.bracket_id]
                );
                
                if (loserMatches.length > 0) {
                  const updateField = loserMatches[0].team1_id === null ? 'team1_id' : 'team2_id';
                  await db.pool.query(
                    `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
                    [loser_id, loserMatches[0].id]
                  );
                  loserAdvanced = true;
                }
              }
            }
          }
        } else if (totalTeams === 7) {
          // ===== FIXED 7-TEAM LOGIC =====
          const nextRound = match.round_number + 1;
          
          // Winner advancement
          if (match.round_number === 1) {
            // Round 1: Games 1, 2, 3 winners advance to Round 2
            const nextMatchOrder = match.match_order >= 2 ? 1 : 0;
            
            const [nextWinnerMatches] = await db.pool.query(
              `SELECT * FROM matches 
               WHERE bracket_id = ? AND bracket_type = 'winner' 
               AND round_number = ? AND match_order = ?`,
              [match.bracket_id, nextRound, nextMatchOrder]
            );
            
            if (nextWinnerMatches.length > 0) {
              const updateField = (match.match_order === 0 || match.match_order === 2) ? 'team1_id' : 'team2_id';
              await db.pool.query(
                `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
                [winner_id, nextWinnerMatches[0].id]
              );
              winnerAdvanced = true;
            }
          } else if (match.round_number === 2) {
            // Round 2: Games 4, 5 winners go to Game 7; Game 7 winner goes to Grand Final
            if (match.match_order === 2) {
              // Game 7 winner goes to Grand Final
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
            } else {
              // Games 4, 5 winners advance to Game 7 (Round 3)
              const [nextWinnerMatches] = await db.pool.query(
                `SELECT * FROM matches 
                 WHERE bracket_id = ? AND bracket_type = 'winner' 
                 AND round_number = 3 AND match_order = 0`,
                [match.bracket_id]
              );
              
              if (nextWinnerMatches.length > 0) {
                const updateField = match.match_order === 0 ? 'team1_id' : 'team2_id';
                await db.pool.query(
                  `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
                  [winner_id, nextWinnerMatches[0].id]
                );
                winnerAdvanced = true;
              }
            }
          } else if (match.round_number === 3) {
            // Round 3: Game 7 winner to Grand Final
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
          
          // ===== FIXED LOSER ROUTING FOR 7 TEAMS =====
          if (loser_id) {
            let targetLoserRound, targetMatchOrder;
            
            if (match.round_number === 1) {
              // Round 1 losers (Games 1, 2, 3) go to LB Round 1
              // Don't drop losers from bye matches
              if (match.status === 'bye') {
                loser_id = null;
              }
              
              if (loser_id) {
                targetLoserRound = 101;
                targetMatchOrder = match.match_order === 2 ? 1 : 0;
              }
            } else if (match.round_number === 2) {
              // THIS IS THE KEY FIX!
              if (match.match_order === 1) {
                // Game 5 loser -> LB R3 (Game 10)
                targetLoserRound = 103;
                targetMatchOrder = 0;
              } else {
                // Game 4 loser -> LB R2 (Game 9)
                // Game 7 loser -> LB R2 (Game 9)
                targetLoserRound = 102;
                targetMatchOrder = 0;
              }
            } else if (match.round_number === 3) {
              // Round 3 loser (Game 7) goes to LB Final (Game 11)
              targetLoserRound = 104;
              targetMatchOrder = 0;
            }
            
            if (loser_id && targetLoserRound) {
              const [loserBracketMatches] = await db.pool.query(
                `SELECT * FROM matches 
                 WHERE bracket_id = ? AND bracket_type = 'loser' 
                 AND round_number = ? AND match_order = ?`,
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
              }
            }
          }
        } else {
          // Generic winner bracket logic for other team counts
          const nextRound = match.round_number + 1;
          const [maxWinnerRound] = await db.pool.query(
            `SELECT MAX(round_number) as max_round FROM matches 
             WHERE bracket_id = ? AND bracket_type = 'winner'`,
            [match.bracket_id]
          );
          
          if (nextRound <= maxWinnerRound[0].max_round) {
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
          
          if (loser_id) {
            const targetLoserRound = getLoserBracketRound(match.round_number, totalTeams, match.match_order);
            const targetMatchOrder = getLoserBracketMatchOrder(match.round_number, match.match_order, totalTeams);
            
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
            }
          }
        }
        
      } else if (match.bracket_type === 'loser') {
        // LOSER BRACKET LOGIC
        if (totalTeams === 5) {
          if (match.round_number === 101) {
            // LB R1 winner -> LB R2
            const [nextLoserMatches] = await db.pool.query(
              `SELECT * FROM matches 
               WHERE bracket_id = ? AND bracket_type = 'loser' 
               AND round_number = 102 AND match_order = 0`,
              [match.bracket_id]
            );
            
            if (nextLoserMatches.length > 0) {
              const updateField = nextLoserMatches[0].team1_id === null ? 'team1_id' : 'team2_id';
              await db.pool.query(
                `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
                [winner_id, nextLoserMatches[0].id]
              );
              winnerAdvanced = true;
            }
          } else if (match.round_number === 102) {
            // LB R2 winner -> LB Final
            const [nextLoserMatches] = await db.pool.query(
              `SELECT * FROM matches 
               WHERE bracket_id = ? AND bracket_type = 'loser' 
               AND round_number = 103 AND match_order = 0`,
              [match.bracket_id]
            );
            
            if (nextLoserMatches.length > 0) {
              const updateField = nextLoserMatches[0].team1_id === null ? 'team1_id' : 'team2_id';
              await db.pool.query(
                `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
                [winner_id, nextLoserMatches[0].id]
              );
              winnerAdvanced = true;
            }
          } else if (match.round_number === 103) {
            // LB Final winner -> Grand Final
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
        } else if (totalTeams === 7) {
          // 7-TEAM LOSER BRACKET PROGRESSION - FIXED
          if (match.round_number === 101) {
            // CORRECTED: LB R1 match progression
            if (match.match_order === 0) {
              // Game #8 winner goes to Game #9 (still in LB Round 1)
              const [nextLoserMatches] = await db.pool.query(
                `SELECT * FROM matches 
                WHERE bracket_id = ? AND bracket_type = 'loser' 
                AND round_number = 101 AND match_order = 1`,
                [match.bracket_id]
              );
              
              if (nextLoserMatches.length > 0) {
                const updateField = nextLoserMatches[0].team1_id === null ? 'team1_id' : 'team2_id';
                await db.pool.query(
                  `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
                  [winner_id, nextLoserMatches[0].id]
                );
                winnerAdvanced = true;
              }
            } else if (match.match_order === 1) {
              // Game #9 winner goes to LB Round 2 (Game #10)
              const [nextLoserMatches] = await db.pool.query(
                `SELECT * FROM matches 
                WHERE bracket_id = ? AND bracket_type = 'loser' 
                AND round_number = 102 AND match_order = 0`,
                [match.bracket_id]
              );
              
              if (nextLoserMatches.length > 0) {
                const updateField = nextLoserMatches[0].team1_id === null ? 'team1_id' : 'team2_id';
                await db.pool.query(
                  `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
                  [winner_id, nextLoserMatches[0].id]
                );
                winnerAdvanced = true;
              }
            }
          } else if (match.round_number === 102) {
            // LB R2 (Game 9) winner -> LB R3 (Game 10)
            const [nextLoserMatches] = await db.pool.query(
              `SELECT * FROM matches 
               WHERE bracket_id = ? AND bracket_type = 'loser' 
               AND round_number = 103 AND match_order = 0`,
              [match.bracket_id]
            );
            
            if (nextLoserMatches.length > 0) {
              const updateField = nextLoserMatches[0].team1_id === null ? 'team1_id' : 'team2_id';
              await db.pool.query(
                `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
                [winner_id, nextLoserMatches[0].id]
              );
              winnerAdvanced = true;
            }
          } else if (match.round_number === 103) {
            // LB R3 (Game 10) winner -> LB Final (Game 11)
            const [nextLoserMatches] = await db.pool.query(
              `SELECT * FROM matches 
               WHERE bracket_id = ? AND bracket_type = 'loser' 
               AND round_number = 104 AND match_order = 0`,
              [match.bracket_id]
            );
            
            if (nextLoserMatches.length > 0) {
              const updateField = nextLoserMatches[0].team1_id === null ? 'team1_id' : 'team2_id';
              await db.pool.query(
                `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
                [winner_id, nextLoserMatches[0].id]
              );
              winnerAdvanced = true;
            }
          } else if (match.round_number === 104) {
            // LB Final (Game 11) winner -> Grand Final
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
          // Generic loser bracket logic for other team counts
          const [maxLoserRound] = await db.pool.query(
            `SELECT MAX(round_number) as max_round FROM matches 
             WHERE bracket_id = ? AND bracket_type = 'loser'`,
            [match.bracket_id]
          );
          
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
        if (match.round_number === 200) {
          if (winner_id === match.team2_id) {
            // Bracket reset
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
            await db.pool.query(
              "UPDATE brackets SET winner_team_id = ? WHERE id = ?",
              [winner_id, match.bracket_id]
            );
            tournamentComplete = true;
          }
        } else if (match.round_number === 201) {
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
    await db.pool.query("DELETE FROM matches WHERE bracket_id = ?", [req.params.id]);
    await db.pool.query("DELETE FROM bracket_teams WHERE bracket_id = ?", [req.params.id]);
    await db.pool.query("DELETE FROM brackets WHERE id = ?", [req.params.id]);
    
    res.json({ success: true, message: "Bracket deleted successfully" });
  } catch (err) {
    console.error("Error deleting bracket:", err);
    res.status(500).json({ error: "Database error" });
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
    await db.pool.query("DELETE FROM matches WHERE bracket_id = ?", [bracketId]);
    await db.pool.query("UPDATE brackets SET winner_team_id = NULL WHERE id = ?", [bracketId]);

    res.json({ success: true, message: "Bracket reset successfully" });
  } catch (err) {
    console.error("Error resetting bracket:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET - Check if teams can be edited for a bracket
router.get("/:id/can-edit-teams", async (req, res) => {
  const bracketId = req.params.id;

  try {
    const [bracketInfo] = await db.pool.query(
      "SELECT elimination_type FROM brackets WHERE id = ?",
      [bracketId]
    );

    if (bracketInfo.length === 0) {
      return res.status(404).json({ error: "Bracket not found" });
    }

    const eliminationType = bracketInfo[0].elimination_type;
    let canEdit = true;
    let reason = "";

    if (eliminationType === 'single') {
      const [round1Matches] = await db.pool.query(
        `SELECT COUNT(*) as completed_count 
         FROM matches 
         WHERE bracket_id = ? 
         AND round_number = 1 
         AND status = 'completed'
         AND status != 'bye'`,
        [bracketId]
      );

      if (round1Matches[0].completed_count > 0) {
        canEdit = false;
        reason = "May completed match na sa Round 1";
      }
    } else if (eliminationType === 'double') {
      const [wbRound1Matches] = await db.pool.query(
        `SELECT COUNT(*) as completed_count 
         FROM matches 
         WHERE bracket_id = ? 
         AND bracket_type = 'winner' 
         AND round_number = 1 
         AND status = 'completed'
         AND status != 'bye'`,
        [bracketId]
      );

      if (wbRound1Matches[0].completed_count > 0) {
        canEdit = false;
        reason = "May completed match na sa Winner's Bracket Round 1";
      }
    } else if (eliminationType === 'round_robin') {
      const [round1Matches] = await db.pool.query(
        `SELECT COUNT(*) as completed_count 
         FROM matches 
         WHERE bracket_id = ? 
         AND round_number = 1 
         AND status = 'completed'
         AND status != 'bye'`,
        [bracketId]
      );

      if (round1Matches[0].completed_count > 0) {
        canEdit = false;
        reason = "May completed match na sa Round 1";
      }
    }

    res.json({
      canEdit: canEdit,
      reason: reason,
      eliminationType: eliminationType
    });

  } catch (err) {
    console.error("Error checking team edit permissions:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;