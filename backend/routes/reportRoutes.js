const express = require("express");
const upload = require("../middleware/upload");

const {
  createReport,
  getMyReports,
  getAllReports,
  getCommunityReports, 
  assignCase,
  getAssignedCases,
  updateCaseStatus,
  getReportById,
  getIncidentMapData,
  getAnalytics,
  getDashboardSummary,
  getOfficials,
  getReportEvidence,
} = require("../controllers/reportController");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Citizen creates a report
router.post("/", protect, upload.array("evidence", 5), createReport);

// Citizen gets their own reports
router.get("/my", protect, getMyReports);

// Authorized officials available for assignment
router.get(
  "/officials",
  protect,
  authorize("official"),
  getOfficials
);

// Cases assigned to the logged-in official
router.get(
  "/assigned",
  protect,
  authorize("official"),
  getAssignedCases
);

// Incident map
router.get("/map", protect, getIncidentMapData);

// Analytics
router.get(
  "/analytics",
  protect,
  authorize("official"),
  getAnalytics
);

// Dashboard summary
router.get(
  "/dashboard",
  protect,
  authorize("official"),
  getDashboardSummary
);

// Assign report to an official
router.put(
  "/:id/assign",
  protect,
  authorize("official"),
  assignCase
);

// Update report status
router.put(
  "/:id/status",
  protect,
  authorize("official"),
  updateCaseStatus
);


// Get all reports
router.get(
  "/",
  protect,
  authorize("official"),
  getAllReports
);

router.get(
  "/:id/evidence/:filename",
  protect,
  getReportEvidence
);

// Community incident feed for Safety Alerts
router.get(
  "/community",
  protect,
  getCommunityReports
);
// Keep this dynamic route last
router.get("/:id", protect, getReportById);

module.exports = router;