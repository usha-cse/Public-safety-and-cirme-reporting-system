const Alert = require("../models/Alert");

// Create a safety alert
const createAlert = async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      location,
      severity,
      expiresAt,
    } = req.body;

    if (!title || !message || !location?.address) {
      return res.status(400).json({
        message: "Please provide all required alert details.",
      });
    }

    const alert = await Alert.create({
      title,
      message,
      type: type || "Public Safety",
      location,
      severity: severity || "Medium",
      expiresAt,
      createdBy: req.user.id,
    });

    res.status(201).json({
      message: "Safety alert created successfully.",
      alert,
    });
  } catch (error) {
    console.error("Create alert error:", error);

    res.status(500).json({
      message: "Failed to create safety alert.",
      error: error.message,
    });
  }
};


// Get active safety alerts
const getActiveAlerts = async (req, res) => {
  try {
    const now = new Date();

    const alerts = await Alert.find({
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: now } },
      ],
    })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    console.error("Get alerts error:", error);

    res.status(500).json({
      message: "Failed to fetch safety alerts.",
      error: error.message,
    });
  }
};


// Deactivate an alert
const deactivateAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findById(id);

    if (!alert) {
      return res.status(404).json({
        message: "Alert not found.",
      });
    }

    alert.isActive = false;

    await alert.save();

    res.status(200).json({
      message: "Safety alert deactivated successfully.",
      alert,
    });
  } catch (error) {
    console.error("Deactivate alert error:", error);

    res.status(500).json({
      message: "Failed to deactivate alert.",
      error: error.message,
    });
  }
};


module.exports = {
  createAlert,
  getActiveAlerts,
  deactivateAlert,
};