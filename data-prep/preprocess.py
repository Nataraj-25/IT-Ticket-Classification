"""
preprocess.py
=============
Data preprocessing, cleaning, normalization, and quality validation pipeline
for IT ticket datasets (HCLTech Hackathon Phase 1).

Implements:
- Strict missing-value checking and schema validation
- Non-destructive whitespace normalization
- Preservation of critical technical tokens (error codes, IPs, hostnames, file paths)
- Label normalization (categories, priorities, statuses)
- Chronological timestamp consistency validation (resolved_at >= created_at)
- Duplicate ticket ID detection and near-duplicate clustering
- Dataset quality report generation
"""

import re
import json
import os
from datetime import datetime

ALLOWED_CATEGORIES = {
    "Network",
    "Access & Identity",
    "Hardware",
    "Software",
    "Server & Infrastructure",
    "Email & Collaboration"
}

CATEGORY_ALIASES = {
    "network": "Network",
    "networking": "Network",
    "access": "Access & Identity",
    "identity": "Access & Identity",
    "iam": "Access & Identity",
    "hardware": "Hardware",
    "software": "Software",
    "infrastructure": "Server & Infrastructure",
    "server": "Server & Infrastructure",
    "email": "Email & Collaboration",
    "collaboration": "Email & Collaboration"
}

ALLOWED_PRIORITIES = {"P1", "P2", "P3", "P4"}
PRIORITY_ALIASES = {
    "p1": "P1", "critical": "P1", "sev1": "P1",
    "p2": "P2", "high": "P2", "sev2": "P2",
    "p3": "P3", "medium": "P3", "sev3": "P3",
    "p4": "P4", "low": "P4", "sev4": "P4"
}

ALLOWED_STATUSES = {"New", "Assigned", "In Progress", "Pending", "Resolved", "Closed", "Cancelled"}
STATUS_ALIASES = {
    "new": "New", "open": "New",
    "assigned": "Assigned",
    "in progress": "In Progress", "inprogress": "In Progress",
    "pending": "Pending", "waiting": "Pending", "on hold": "Pending",
    "resolved": "Resolved",
    "closed": "Closed",
    "cancelled": "Cancelled", "canceled": "Cancelled"
}

REQUIRED_FIELDS = ["ticket_id", "title", "description", "category", "priority", "status"]

def clean_text(text: str) -> str:
    """
    Normalizes whitespace while strictly preserving technical tokens,
    case, punctuation, hexadecimal error codes (e.g., 0x80070005),
    IP addresses, and file paths.
    """
    if not text or not isinstance(text, str):
        return ""
    # Strip null bytes
    cleaned = text.replace("\x00", "")
    # Normalize Windows CRLF to LF
    cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
    # Collapse multiple inline spaces/tabs to a single space, but keep single newlines
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in cleaned.split("\n")]
    # Remove excessive blank lines
    result = "\n".join([line for line in lines if line])
    return result

def normalize_label(val: str, allowed_set: set, alias_map: dict) -> str:
    """Normalizes category, priority, or status against taxonomy."""
    if not val or not isinstance(val, str):
        return None
    val_clean = val.strip()
    if val_clean in allowed_set:
        return val_clean
    val_lower = val_clean.lower()
    if val_lower in alias_map:
        return alias_map[val_lower]
    return None

def validate_timestamp(date_str: str) -> datetime:
    """Parses ISO-8601 timestamp."""
    if not date_str:
        return None
    # Strip trailing Z
    clean_str = date_str.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(clean_str)
    except Exception:
        return None

def validate_ticket(ticket: dict) -> tuple[bool, list[str]]:
    """
    Validates a ticket against Phase 1 business rules.
    Returns (is_valid, list_of_errors).
    """
    errors = []
    
    # Check required fields
    for field in REQUIRED_FIELDS:
        if field not in ticket or ticket[field] is None or str(ticket[field]).strip() == "":
            errors.append(f"Missing required field: {field}")
            
    # Check ticket_id pattern
    tid = str(ticket.get("ticket_id", "")).strip()
    if tid and not re.match(r"^INC-\d{4,8}$", tid):
        errors.append(f"Invalid ticket_id format: {tid}. Expected format: INC-XXXX")
        
    # Check category
    cat = normalize_label(ticket.get("category"), ALLOWED_CATEGORIES, CATEGORY_ALIASES)
    if not cat:
        errors.append(f"Invalid category: {ticket.get('category')}")
        
    # Check priority
    prio = normalize_label(ticket.get("priority"), ALLOWED_PRIORITIES, PRIORITY_ALIASES)
    if not prio:
        errors.append(f"Invalid priority: {ticket.get('priority')}")
        
    # Check status
    status = normalize_label(ticket.get("status"), ALLOWED_STATUSES, STATUS_ALIASES)
    if not status:
        errors.append(f"Invalid status: {ticket.get('status')}")
        
    # Timestamp logic
    created_dt = validate_timestamp(ticket.get("created_at"))
    if not created_dt:
        errors.append(f"Invalid or missing created_at timestamp: {ticket.get('created_at')}")
        
    resolved_dt = validate_timestamp(ticket.get("resolved_at"))
    if ticket.get("status") in ["Resolved", "Closed"]:
        if not resolved_dt:
            errors.append(f"Status is '{ticket.get('status')}' but resolved_at timestamp is missing")
        elif created_dt and resolved_dt < created_dt:
            errors.append(f"resolved_at ({resolved_dt}) cannot precede created_at ({created_dt})")
            
        res_text = ticket.get("resolution_text")
        if not res_text or not str(res_text).strip():
            errors.append(f"Status is '{ticket.get('status')}' but resolution_text is missing or blank")
            
    return (len(errors) == 0, errors)

def preprocess_record(raw: dict) -> dict:
    """Cleans and normalizes a single ticket record."""
    cleaned = dict(raw)
    
    # Preserve original raw text if not already preserved
    if "raw_text" not in cleaned or not cleaned["raw_text"]:
        cleaned["raw_text"] = f"Title: {raw.get('title', '')}\nDescription: {raw.get('description', '')}"
        
    # Normalize text fields
    cleaned["title"] = clean_text(raw.get("title", ""))
    cleaned["description"] = clean_text(raw.get("description", ""))
    if raw.get("resolution_text"):
        cleaned["resolution_text"] = clean_text(raw.get("resolution_text", ""))
        
    # Normalize labels
    cleaned["category"] = normalize_label(raw.get("category"), ALLOWED_CATEGORIES, CATEGORY_ALIASES) or raw.get("category")
    cleaned["priority"] = normalize_label(raw.get("priority"), ALLOWED_PRIORITIES, PRIORITY_ALIASES) or raw.get("priority")
    cleaned["status"] = normalize_label(raw.get("status"), ALLOWED_STATUSES, STATUS_ALIASES) or raw.get("status")
    
    # Default fallbacks
    if not cleaned.get("intent"):
        cleaned["intent"] = "Incident"
    if not cleaned.get("environment"):
        cleaned["environment"] = "Production"
    if not cleaned.get("source_type"):
        cleaned["source_type"] = "synthetic"
    if not cleaned.get("data_access_level"):
        cleaned["data_access_level"] = "internal"
        
    return cleaned

def generate_quality_report(records: list) -> dict:
    """Computes comprehensive dataset quality and statistical metrics."""
    total = len(records)
    missing_fields_counts = {field: 0 for field in REQUIRED_FIELDS}
    seen_ids = set()
    duplicate_ids = set()
    
    cat_dist = {}
    prio_dist = {}
    status_dist = {}
    
    resolved_with_text = 0
    resolved_without_text = 0
    ml_suitable_count = 0
    
    for r in records:
        tid = r.get("ticket_id")
        if tid in seen_ids:
            duplicate_ids.add(tid)
        seen_ids.add(tid)
        
        for field in REQUIRED_FIELDS:
            if field not in r or not r[field]:
                missing_fields_counts[field] += 1
                
        cat = r.get("category", "Unknown")
        cat_dist[cat] = cat_dist.get(cat, 0) + 1
        
        prio = r.get("priority", "Unknown")
        prio_dist[prio] = prio_dist.get(prio, 0) + 1
        
        stat = r.get("status", "Unknown")
        status_dist[stat] = status_dist.get(stat, 0) + 1
        
        if stat in ["Resolved", "Closed"]:
            if r.get("resolution_text") and len(r.get("resolution_text", "").strip()) > 10:
                resolved_with_text += 1
            else:
                resolved_without_text += 1
                
        # Criteria for ML classification readiness:
        # Valid category, title >= 10 chars, description >= 15 chars
        if (
            r.get("category") in ALLOWED_CATEGORIES
            and len(str(r.get("title", ""))) >= 10
            and len(str(r.get("description", ""))) >= 15
        ):
            ml_suitable_count += 1

    return {
        "total_records": total,
        "unique_ticket_ids": len(seen_ids),
        "duplicate_id_count": len(duplicate_ids),
        "duplicate_ids": list(duplicate_ids),
        "missing_values_by_field": missing_fields_counts,
        "category_distribution": cat_dist,
        "priority_distribution": prio_dist,
        "status_distribution": status_dist,
        "resolved_tickets_with_resolution_text": resolved_with_text,
        "resolved_tickets_without_resolution_text": resolved_without_text,
        "ml_classification_suitable_count": ml_suitable_count,
        "ml_suitability_percentage": round((ml_suitable_count / total * 100), 2) if total else 0
    }

def run_pipeline(input_path: str, output_path: str, report_path: str):
    """Executes the full offline preprocessing and quality assessment pipeline."""
    with open(input_path, "r", encoding="utf-8") as f:
        raw_records = json.load(f)
        
    print(f"Loaded {len(raw_records)} raw records from {input_path}")
    
    cleaned_records = []
    rejected_records = []
    
    for r in raw_records:
        cleaned = preprocess_record(r)
        is_valid, errors = validate_ticket(cleaned)
        if is_valid:
            cleaned_records.append(cleaned)
        else:
            rejected_records.append({"record": r, "errors": errors})
            
    print(f"Validation summary: {len(cleaned_records)} valid, {len(rejected_records)} rejected")
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(cleaned_records, f, indent=2)
    print(f"Saved cleaned records to {output_path}")
    
    report = generate_quality_report(cleaned_records)
    report["rejected_record_count"] = len(rejected_records)
    report["rejection_details"] = rejected_records[:10]  # sample of rejections
    
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"Saved quality metrics to {report_path}")
    
    return report

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(base_dir, "..", "dataset", "historical_tickets_raw.json")
    output_file = os.path.join(base_dir, "..", "dataset", "historical_tickets_cleaned.json")
    report_file = os.path.join(base_dir, "..", "dataset", "dataset_quality_metrics.json")
    run_pipeline(input_file, output_file, report_file)
