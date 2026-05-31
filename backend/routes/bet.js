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
