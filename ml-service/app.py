
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


app = FastAPI(
    title="CivicShield ML API",
    description="Baseline urgency, duplicate detection, and priority scoring",
    version="1.0.0",
)


class Complaint(BaseModel):
    title: str = ""
    description: str = ""
    incidentType: str = "Other"
    location: str = ""
    latitude: float | None = None
    longitude: float | None = None


class DuplicateRequest(BaseModel):
    complaint: Complaint
    existing_reports: list[dict[str, Any]] = Field(default_factory=list)
    threshold: float = Field(default=0.45, ge=0.0, le=1.0)


def complaint_text(report: Complaint | dict[str, Any]) -> str:
    if isinstance(report, Complaint):
        title = report.title
        description = report.description
        incident_type = report.incidentType
    else:
        title = str(report.get("title", ""))
        description = str(report.get("description", ""))
        incident_type = str(report.get("incidentType", "Other"))

    return f"{incident_type} {title} {description}".strip()


def predict_urgency(complaint: Complaint) -> dict[str, Any]:
    text = f"{complaint.title} {complaint.description}".lower()

    critical_terms = [
        "life-threatening", "life threatening", "someone is dying",
        "active shooter", "gunfire", "hostage", "bomb threat",
        "severe bleeding", "unconscious", "trapped in fire",
    ]
    high_terms = [
        "weapon", "gun", "knife", "assault", "fire", "explosion",
        "robbery", "break-in", "break in", "injured", "threat",
        "violence", "crash", "harassment",
    ]
    medium_terms = [
        "suspicious", "vandalism", "theft", "stolen", "damage",
        "unsafe", "blocked road", "noise",
    ]

    if any(term in text for term in critical_terms):
        level = "Critical"
        reasons = ["Potential immediate danger keyword detected"]
    elif any(term in text for term in high_terms):
        level = "High"
        reasons = ["Potentially serious incident keyword detected"]
    elif any(term in text for term in medium_terms):
        level = "Medium"
        reasons = ["Safety or property concern keyword detected"]
    else:
        level = "Low"
        reasons = ["No configured high-urgency keyword detected"]

    return {
        "urgency": level,
        "reasons": reasons,
        "method": "keyword_rules",
        "needs_human_review": True,
    }


def score_priority(urgency: str, incident_type: str) -> dict[str, Any]:
    urgency_points = {
        "Low": 10,
        "Medium": 35,
        "High": 65,
        "Critical": 90,
    }
    incident_points = {
        "Crime": 10,
        "Suspicious Activity": 5,
        "Safety Hazard": 10,
        "Traffic Incident": 10,
        "Public Safety": 10,
        "Other": 0,
    }

    score = min(
        100,
        urgency_points.get(urgency, 10)
        + incident_points.get(incident_type, 0),
    )

    if score >= 75:
        priority = "High"
    elif score >= 35:
        priority = "Medium"
    else:
        priority = "Low"

    return {
        "score": score,
        "priority": priority,
        "explanation": (
            f"Urgency contributes {urgency_points.get(urgency, 10)} points; "
            f"incident type contributes "
            f"{incident_points.get(incident_type, 0)} points."
        ),
        "needs_human_review": True,
    }


@app.get("/")
def health():
    return {"service": "CivicShield ML API", "status": "running"}


@app.post("/predict")
def predict(complaint: Complaint):
    urgency_result = predict_urgency(complaint)
    priority_result = score_priority(
        urgency_result["urgency"],
        complaint.incidentType,
    )

    return {
        "urgency": urgency_result,
        "priority": priority_result,
        "possibleDuplicate": False,
        "duplicateMatches": [],
        "note": "Baseline predictions; review before operational use.",
    }


@app.post("/duplicates")
def find_duplicates(request: DuplicateRequest):
    new_text = complaint_text(request.complaint)
    reports = request.existing_reports

    if not new_text or not reports:
        return {"possibleDuplicate": False, "matches": []}

    texts = [new_text] + [
        complaint_text(report) for report in reports
    ]

    if not any(text.strip() for text in texts[1:]):
        return {"possibleDuplicate": False, "matches": []}

    try:
        matrix = TfidfVectorizer(
            lowercase=True,
            ngram_range=(1, 2),
            strip_accents="unicode",
        ).fit_transform(texts)
        similarities = cosine_similarity(matrix[0:1], matrix[1:]).flatten()
    except ValueError:
        return {"possibleDuplicate": False, "matches": []}

    matches = []
    for index, similarity in enumerate(similarities):
        if similarity >= request.threshold:
            report = reports[index]
            matches.append({
                "reportId": str(report.get("_id", report.get("id", ""))),
                "title": str(report.get("title", "")),
                "similarity": round(float(similarity), 4),
            })

    matches.sort(key=lambda item: item["similarity"], reverse=True)

    return {
        "possibleDuplicate": bool(matches),
        "threshold": request.threshold,
        "matches": matches[:10],
        "note": "Similarity is a review aid, not proof of duplication.",
    }


@app.post("/priority")
def priority(complaint: Complaint):
    urgency_result = predict_urgency(complaint)
    priority_result = score_priority(
        urgency_result["urgency"],
        complaint.incidentType,
    )

    return {
        "urgency": urgency_result,
        "priority": priority_result,
    }
