'use strict';

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Bet route definitions for marketplace, participation, and settlement actions.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-05-31
 Modification Notes:    Added traceable comments for debugging, handoff, undo, and redo review.
*********************************************************/

// ========================================================
// Imports, dependencies, and module setup
// ========================================================

const router = require("express").Router();
const betController = require("../controllers/bet");
const { auth } = require("../middleware/auth");

router.post("/create", auth, betController.createBet);
router.post("/:id/join", auth, betController.joinBet);
router.get("/trending", betController.getTrendingBets);
router.get("/my-bets", auth, betController.getMyBets);
router.get("/:id", betController.getBetById);

// Admin authorization will be added when roles/permissions are available.
router.post("/:id/settle", auth, betController.settleBet);

module.exports = router;
