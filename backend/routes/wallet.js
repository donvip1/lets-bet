'use strict';

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Protected wallet route definitions for balances and transaction history.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-05-31
 Modification Notes:    Added traceable comments for debugging, handoff, undo, and redo review.
*********************************************************/

// ========================================================
// Imports, dependencies, and module setup
// ========================================================

const router = require("express").Router();
const walletController = require("../controllers/wallet");
const { auth } = require("../middleware/auth");

router.get("/balance", auth, walletController.getBalance);
router.post("/deposit", auth, walletController.deposit);
router.post("/withdraw", auth, walletController.withdraw);
router.get("/transactions", auth, walletController.getTransactions);

module.exports = router;
