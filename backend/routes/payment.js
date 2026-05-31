'use strict';

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Protected payment route definitions for mock deposits and withdrawals.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-05-31
 Modification Notes:    Added traceable comments for debugging, handoff, undo, and redo review.
*********************************************************/

// ========================================================
// Imports, dependencies, and module setup
// ========================================================

const router = require("express").Router();
const paymentController = require("../controllers/payment");
const { auth } = require("../middleware/auth");

router.post("/deposit", auth, paymentController.initiateDeposit);
router.post("/verify-deposit", auth, paymentController.verifyDeposit);
router.post("/withdraw", auth, paymentController.initiateWithdrawal);
router.post("/withdraw-crypto", auth, paymentController.withdrawCrypto);
router.get("/methods", auth, paymentController.getWithdrawalMethods);

module.exports = router;
