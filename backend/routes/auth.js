const router = require("express").Router();
const { body } = require("express-validator");
const authController = require("../controllers/auth");
const { auth } = require("../middleware/auth");

// Validate new-account requests before they reach the controller.
const registerValidation = [
  body("email").isEmail().withMessage("Invalid email").normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("name").notEmpty().withMessage("Name is required"),
];

// Validate login credentials before attempting password comparison.
const loginValidation = [
  body("email").isEmail().withMessage("Invalid email").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

router.post("/register", registerValidation, authController.register);
router.post("/login", loginValidation, authController.login);
router.get("/me", auth, authController.getMe);

module.exports = router;
