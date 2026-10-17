const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    incidentType: {
      type: String,
      required: true,
      enum: [
        "Crime",
        "Suspicious Activity",
        "Safety Hazard",
        "Traffic Incident",
        "Public Safety",
        "Other",
      ],
    },

    location: {
      address: {
        type: String,
        required: true,
      },
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      },
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
    },

    status: {
      type: String,
      enum: [
        "Under Review",
        "Assigned",
        "Investigation",
        "Resolved",
      ],
      default: "Under Review",
    },

    evidence: {
  type: [
    {
      filename: {
        type: String,
        required: true,
      },
      path: {
        type: String,
        required: true,
      },
      originalName: {
        type: String,
        required: true,
      },
      mimetype: {
        type: String,
        required: true,
      },
    },
  ],
  default: [],
},

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    aiAnalysis: {
      category: String,
      urgency: String,
      possibleDuplicate: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Report", reportSchema);