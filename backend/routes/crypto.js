'use strict';

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Protected crypto wallet, deposit, withdrawal, fee, and address routes.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-06-05
 Modification Notes:    Added Phase 6C crypto API route definitions.
*********************************************************/

// ========================================================
// Imports and route definitions
// ========================================================

const router = require("express").Router();
const cryptoController = require("../controllers/crypto");
const { auth } = require("../middleware/auth");

router.get("/wallets", auth, cryptoController.getUserWallets);
router.get("/wallets/:network", auth, cryptoController.getWalletByNetwork);
router.get("/deposits", auth, cryptoController.getDepositHistory);
router.post("/manual-deposit", auth, cryptoController.manualDepositProof);
router.post("/withdrawals", auth, cryptoController.requestWithdrawal);
router.get("/withdrawals", auth, cryptoController.getWithdrawalHistory);
router.get("/fees", auth, cryptoController.getWithdrawalFees);
router.post("/addresses", auth, cryptoController.whitelistAddress);
router.get("/addresses", auth, cryptoController.getWhitelistedAddresses);

module.exports = router;
