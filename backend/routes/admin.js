const router = require("express").Router();
const adminController = require("../controllers/admin");
const { auth } = require("../middleware/auth");

// Production should replace auth with adminAuth to enforce admin-only access.
router.post("/bets/:id/settle", auth, adminController.settleBet);
router.get("/bets", auth, adminController.getAllBets);
router.get("/users/:id", auth, adminController.getUser);

module.exports = router;
