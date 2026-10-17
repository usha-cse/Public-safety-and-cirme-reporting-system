const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const { protect } = require("./middleware/authMiddleware");
const reportRoutes = require("./routes/reportRoutes");
const alertRoutes = require("./routes/alertRoutes");

const app = express();

app.use(cors());
app.use(express.json());
// Serve uploaded evidence files
app.use("/uploads", express.static("uploads"));
connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/alerts", alertRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "CivicShield Backend is running!",
  });
});

app.get("/api/protected", protect, (req, res) => {
  res.json({
    message: "You accessed a protected route!",
    user: req.user,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`CivicShield backend running on port ${PORT}`);
});