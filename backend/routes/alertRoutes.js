const express = require("express");

const {
  createAlert,
  getActiveAlerts,
  deactivateAlert,
} = require("../controllers/alertController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Citizens and officials can view active alerts
router.get("/", protect, getActiveAlerts);

// Only officials can create alerts
router.post(
  "/",
  protect,
  authorize("official"),
  createAlert
);

// Only officials can deactivate alerts
router.put(
  "/:id/deactivate",
  protect,
  authorize("official"),
  deactivateAlert
);

module.exports = router;