const router = require("express").Router();
const paymentController = require("../controllers/payment");
const { auth } = require("../middleware/auth");

router.post("/deposit", auth, paymentController.initiateDeposit);
router.post("/verify-deposit", auth, paymentController.verifyDeposit);
router.post("/withdraw", auth, paymentController.initiateWithdrawal);
router.post("/withdraw-crypto", auth, paymentController.withdrawCrypto);
router.get("/methods", auth, paymentController.getWithdrawalMethods);

module.exports = router;
