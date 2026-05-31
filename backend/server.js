const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const socketIo = require("socket.io");
const { pool } = require("./config/database");

// Load environment variables before bootstrapping the API server.
dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.io powers real-time betting updates for connected frontend clients.
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Core Express middleware for cross-origin requests and JSON/form payloads.
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make shared services available to controllers and future route modules.
app.set("io", io);
app.set("db", pool);

const authRoutes = require("./routes/auth");
const betRoutes = require("./routes/bet");
const walletRoutes = require("./routes/wallet");
const adminRoutes = require("./routes/admin");
const paymentRoutes = require("./routes/payment");

app.use("/auth", authRoutes);
app.use("/bets", betRoutes);
app.use("/wallet", walletRoutes);
app.use("/admin", adminRoutes);
app.use("/payment", paymentRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Lets Bet API is running", version: "1.0.0" });
});

// Lightweight health check for uptime monitors and local development.
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT NOW()");
    return res.json({
      status: "ok",
      database: "connected",
      service: "lets-bet-api",
    });
  } catch (error) {
    return res.status(503).json({
      status: "error",
      database: "unavailable",
      service: "lets-bet-api",
    });
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Lets Bet server running on port ${PORT}`);
});
