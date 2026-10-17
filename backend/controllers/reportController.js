const mongoose = require("mongoose");
const Report = require("../models/Report");
const User = require("../models/User");
const path = require("path");
const fs = require("fs");

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const VALID_STATUSES = [
  "Under Review",
  "Assigned",
  "Investigation",
  "Resolved",
];

const VALID_PRIORITIES = ["Low", "Medium", "High"];

function getUserId(req) {
  return req.user?._id || req.user?.id;
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// --------------------------------------------------
// 1. Create Report
// POST /api/reports
// --------------------------------------------------

const createReport = async (req, res) => {
  try {
    const { title, description, incidentType, location, priority } = req.body;

    if (!title || !description || !incidentType) {
      return res.status(400).json({
        message: "Title, description and incident type are required.",
      });
    }

    let parsedLocation = location;

    if (typeof parsedLocation === "string") {
      try {
        parsedLocation = JSON.parse(parsedLocation);
      } catch {
        parsedLocation = { address: parsedLocation };
      }
    }

    if (!parsedLocation || typeof parsedLocation !== "object") {
      parsedLocation = {};
    }

    const evidence = (req.files || []).map((file) => ({
      filename: file.filename,
      path: file.path,
      originalName: file.originalname,
      mimetype: file.mimetype,
    }));

    const report = await Report.create({
      title: title.trim(),
      description: description.trim(),
      incidentType,
      location: {
        address: parsedLocation.address || "",
        latitude:
          parsedLocation.latitude !== "" &&
          parsedLocation.latitude != null
            ? Number(parsedLocation.latitude)
            : undefined,
        longitude:
          parsedLocation.longitude !== "" &&
          parsedLocation.longitude != null
            ? Number(parsedLocation.longitude)
            : undefined,
      },
      priority: VALID_PRIORITIES.includes(priority) ? priority : "Medium",
      status: "Under Review",
      evidence,
      reportedBy: getUserId(req),
    });

    return res.status(201).json({
      success: true,
      message: "Report created successfully.",
      report,
    });
  } catch (error) {
    console.error("Create report error:", error);

    return res.status(500).json({
      message: error.message || "Failed to create report.",
    });
  }
};

// --------------------------------------------------
// 2. Get Current User's Reports
// GET /api/reports/my
// --------------------------------------------------


const getMyReports = async (req, res) => {
  try {
    const userId = getUserId(req);

    console.log("Authenticated user:", req.user);
    console.log("User ID used for reports:", userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unable to identify the logged-in user.",
      });
    }

    const reports = await Report.find({
      reportedBy: userId,
    })
      .populate("reportedBy", "name email")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });

    console.log("Reports found:", reports.length);

    return res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error("Get my reports error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your reports.",
    });
  }
};


// --------------------------------------------------
// 3. Get Reports
// GET /api/reports
// --------------------------------------------------

const getAllReports = async (req, res) => {
  try {
    // Only officials can access all reports.
    if (req.user?.role !== "official") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Officials only.",
      });
    }

    const reports = await Report.find({})
      .populate("reportedBy", "name email")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error("Get all reports error:", error);

    return res.status(500).json({
      message: "Failed to fetch reports.",
    });
  }
};

// --------------------------------------------------
// 4. Get Authorized Officials
// GET /api/reports/officials
// --------------------------------------------------

const getOfficials = async (req, res) => {
  try {
    const officials = await User.find({ role: "official" })
      .select("_id name fullName email role")
      .sort({ name: 1, fullName: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: officials.length,
      officials,
    });
  } catch (error) {
    console.error("Get officials error:", error);

    return res.status(500).json({
      message: "Failed to fetch authorized officials.",
    });
  }
};

// --------------------------------------------------
// 5. Assign Case
// PUT /api/reports/:id/assign
// --------------------------------------------------

const assignCase = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo, priority } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid report ID.",
      });
    }

    if (!assignedTo || !isValidObjectId(assignedTo)) {
      return res.status(400).json({
        message: "Please select a valid authorized official.",
      });
    }

    const official = await User.findOne({
      _id: assignedTo,
      role: "official",
    }).select("_id name fullName email role");

    if (!official) {
      return res.status(400).json({
        message: "The selected user is not an authorized official.",
      });
    }

    if (
      priority !== undefined &&
      !VALID_PRIORITIES.includes(priority)
    ) {
      return res.status(400).json({
        message: "Invalid priority.",
      });
    }

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        message: "Report not found.",
      });
    }

    report.assignedTo = official._id;

    if (priority) {
      report.priority = priority;
    }

    if (report.status === "Under Review") {
      report.status = "Assigned";
    }

    await report.save();

    const updatedReport = await Report.findById(report._id)
      .populate("reportedBy", "name email")
      .populate("assignedTo", "name fullName email");

    return res.status(200).json({
      success: true,
      message: "Case assigned successfully.",
      report: updatedReport,
    });
  } catch (error) {
    console.error("Assign case error:", error);

    return res.status(500).json({
      message: "Failed to assign case.",
    });
  }
};

// --------------------------------------------------
// 6. Get Cases Assigned to Logged-in Official
// GET /api/reports/assigned
// --------------------------------------------------

const getAssignedCases = async (req, res) => {
  try {
    const userId = getUserId(req);

    const reports = await Report.find({ assignedTo: userId })
      .populate("reportedBy", "name email")
      .populate("assignedTo", "name email")
      .sort({ updatedAt: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error("Get assigned cases error:", error);

    return res.status(500).json({
      message: "Failed to fetch assigned cases.",
    });
  }
};

// --------------------------------------------------
// 7. Update Case Status
// PUT /api/reports/:id/status
// --------------------------------------------------

const updateCaseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid report ID.",
      });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid case status.",
        validStatuses: VALID_STATUSES,
      });
    }

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        message: "Report not found.",
      });
    }

    report.status = status;
    await report.save();

    const updatedReport = await Report.findById(report._id)
      .populate("reportedBy", "name email")
      .populate("assignedTo", "name email");

    return res.status(200).json({
      success: true,
      message: "Case status updated successfully.",
      report: updatedReport,
    });
  } catch (error) {
    console.error("Update case status error:", error);

    return res.status(500).json({
      message: "Failed to update case status.",
    });
  }
};

// --------------------------------------------------
// 8. Get Single Report
// GET /api/reports/:id
// --------------------------------------------------

const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid report ID.",
      });
    }

    const report = await Report.findById(id)
      .populate("reportedBy", "name email")
      .populate("assignedTo", "name email");

    if (!report) {
      return res.status(404).json({
        message: "Report not found.",
      });
    }

    const isOfficial = req.user?.role === "official";
    const userId = String(getUserId(req));

    // Citizens may access only their own reports.
    if (!isOfficial && String(report.reportedBy?._id) !== userId) {
      return res.status(403).json({
        message: "You are not authorized to view this report.",
      });
    }

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Get report by ID error:", error);

    return res.status(500).json({
      message: "Failed to fetch report.",
    });
  }
};

// --------------------------------------------------
// 9. Get Incident Map Data
// GET /api/reports/map
// --------------------------------------------------

const getIncidentMapData = async (req, res) => {
  try {
    //const isOfficial = req.user?.role === "official";

    //const filter = isOfficial
     // ? {}
     // : { reportedBy: getUserId(req) };
    // Display community-wide reported incidents on the safety map.
// Keep personal report access controlled by the existing report endpoints.
    const filter = {};

    const reports = await Report.find(filter)
      .select(
        "title incidentType location priority status createdAt"
      )
      .sort({ createdAt: -1 });

    const incidents = reports.filter(
      (report) =>
        Number.isFinite(report.location?.latitude) &&
        Number.isFinite(report.location?.longitude)
    );

    return res.status(200).json({
      success: true,
      count: incidents.length,
      incidents,
    });
  } catch (error) {
    console.error("Get incident map data error:", error);

    return res.status(500).json({
      message: "Failed to fetch incident map data.",
    });
  }
};

// --------------------------------------------------
// 10. Get Analytics
// GET /api/reports/analytics
// --------------------------------------------------

const getAnalytics = async (req, res) => {
  try {
    const [
      totalReports,
      statusCounts,
      priorityCounts,
      incidentTypeCounts,
      recentReports,
    ] = await Promise.all([
      Report.countDocuments(),

      Report.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      Report.aggregate([
        {
          $group: {
            _id: "$priority",
            count: { $sum: 1 },
          },
        },
      ]),

      Report.aggregate([
        {
          $group: {
            _id: "$incidentType",
            count: { $sum: 1 },
          },
        },
      ]),

      Report.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title incidentType priority status createdAt"),
    ]);

    return res.status(200).json({
      success: true,
      totalReports,
      statusCounts,
      priorityCounts,
      incidentTypeCounts,
      recentReports,
    });
  } catch (error) {
    console.error("Get analytics error:", error);

    return res.status(500).json({
      message: "Failed to fetch analytics.",
    });
  }
};

// --------------------------------------------------
// 11. Get Dashboard Summary
// GET /api/reports/dashboard
// --------------------------------------------------

const getDashboardSummary = async (req, res) => {
  try {
    const [
      totalReports,
      underReview,
      assigned,
      investigation,
      resolved,
      highPriority,
      recentReports,
    ] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ status: "Under Review" }),
      Report.countDocuments({ status: "Assigned" }),
      Report.countDocuments({ status: "Investigation" }),
      Report.countDocuments({ status: "Resolved" }),
      Report.countDocuments({ priority: "High" }),
      Report.find()
        .populate("reportedBy", "name email")
        .populate("assignedTo", "name email")
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    return res.status(200).json({
      success: true,
      summary: {
        totalReports,
        underReview,
        assigned,
        investigation,
        resolved,
        highPriority,
      },
      recentReports,
    });
  } catch (error) {
    console.error("Get dashboard summary error:", error);

    return res.status(500).json({
      message: "Failed to fetch dashboard summary.",
    });
  }
};


const getCommunityReports = async (req, res) => {
  try {
    const reports = await Report.find({
      status: { $ne: "Resolved" },
    })
      .select(
        "title description incidentType location priority status createdAt"
      )
      .sort({ createdAt: -1 })
      .lean();

    const incidents = reports.map((report) => ({
      _id: report._id,
      title: report.title,
      description: report.description,
      incidentType: report.incidentType,
      location: {
        address: report.location?.address || "",
        latitude: report.location?.latitude,
        longitude: report.location?.longitude,
      },
      priority: report.priority,
      status: report.status,
      createdAt: report.createdAt,
    }));

    return res.status(200).json({
      success: true,
      count: incidents.length,
      incidents,
    });
  } catch (error) {
    console.error("Get community reports error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch community incidents.",
    });
  }
};

const getReportEvidence = async (req, res) => {
  try {
    const { id, filename } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid report ID." });
    }

    // Accept only a simple filename, never a filesystem path.
    if (!filename || path.basename(filename) !== filename) {
      return res.status(400).json({ message: "Invalid evidence filename." });
    }

    const report = await Report.findById(id).select(
      "evidence reportedBy"
    );

    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }

    const userId = getUserId(req);
    const isOfficial = req.user?.role === "official";
    const isOwner =
      String(report.reportedBy) === String(userId);

    if (!isOfficial && !isOwner) {
      return res.status(403).json({
        message: "You are not authorized to access this evidence.",
      });
    }

    // The requested file must belong to this report.
    const evidenceFile = report.evidence.find(
      (file) => file.filename === filename
    );

    if (!evidenceFile) {
      return res.status(404).json({
        message: "Evidence file not found for this report.",
      });
    }

    // Resolve from the server's uploads directory, not from user input.
    const uploadDir = path.resolve(__dirname, "..", "uploads");
    const filePath = path.resolve(uploadDir, evidenceFile.filename);

    if (!filePath.startsWith(uploadDir + path.sep)) {
      return res.status(400).json({
        message: "Invalid evidence path.",
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: "The evidence file is missing from server storage.",
      });
    }

    res.setHeader(
      "Content-Type",
      evidenceFile.mimetype || "application/octet-stream"
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${path.basename(evidenceFile.originalName || evidenceFile.filename).replace(/["\\\r\n]/g, "_")}"`
    );

    return res.sendFile(filePath);
  } catch (error) {
    console.error("Get report evidence error:", error);
    return res.status(500).json({
      message: "Failed to retrieve evidence.",
    });
  }
};

// --------------------------------------------------
// Exports
// --------------------------------------------------

module.exports = {
  createReport,
  getMyReports,
  getAllReports,
  getOfficials,
  assignCase,
  getAssignedCases,
  updateCaseStatus,
  getReportById,
  getIncidentMapData,
  getAnalytics,
  getDashboardSummary,
  getCommunityReports,
  getReportEvidence,
};