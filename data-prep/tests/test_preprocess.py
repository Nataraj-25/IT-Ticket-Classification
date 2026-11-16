"""
test_preprocess.py
==================
Unit test suite for Phase 1 Python data preprocessing pipeline using Pytest.

Covers:
1. Missing required field detection
2. Invalid category & priority normalization
3. Whitespace normalization with technical token preservation
4. Chronological date validation (resolved_at < created_at rejection)
5. Duplicate ticket ID detection
6. Quality statistics aggregation
"""

import pytest
import sys
import os

# Add parent dir to sys.path to import preprocess
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from preprocess import (
    clean_text,
    normalize_label,
    validate_ticket,
    preprocess_record,
    generate_quality_report,
    ALLOWED_CATEGORIES,
    CATEGORY_ALIASES,
    ALLOWED_PRIORITIES,
    PRIORITY_ALIASES,
    ALLOWED_STATUSES,
    STATUS_ALIASES
)

def test_clean_text_preserves_technical_tokens():
    raw = "   Error code  0x80070005 occurred on server   10.240.12.4 \n\n Path: C:\\Windows\\System32   "
    cleaned = clean_text(raw)
    assert "0x80070005" in cleaned
    assert "10.240.12.4" in cleaned
    assert "C:\\Windows\\System32" in cleaned
    assert "  " not in cleaned  # no double spaces

def test_normalize_labels_with_aliases():
    assert normalize_label("network", ALLOWED_CATEGORIES, CATEGORY_ALIASES) == "Network"
    assert normalize_label("p1", ALLOWED_PRIORITIES, PRIORITY_ALIASES) == "P1"
    assert normalize_label("critical", ALLOWED_PRIORITIES, PRIORITY_ALIASES) == "P1"
    assert normalize_label("in progress", ALLOWED_STATUSES, STATUS_ALIASES) == "In Progress"
    assert normalize_label("INVALID_CATEGORY", ALLOWED_CATEGORIES, CATEGORY_ALIASES) is None

def test_validate_ticket_valid_record():
    valid_record = {
        "ticket_id": "INC-1001",
        "title": "VPN disconnects unexpectedly after 5 minutes",
        "description": "User encounters error 800 while connecting to 10.240.0.1",
        "category": "Network",
        "priority": "P2",
        "status": "Resolved",
        "created_at": "2026-01-10T09:00:00Z",
        "resolved_at": "2026-01-10T11:00:00Z",
        "resolution_text": "Updated GlobalProtect client to 6.1.2 and flushed DNS."
    }
    is_valid, errors = validate_ticket(valid_record)
    assert is_valid is True
    assert len(errors) == 0

def test_validate_ticket_missing_required_fields():
    invalid_record = {
        "ticket_id": "INC-1002",
        "title": "",
        "category": "Network",
        "priority": "P1",
        "status": "New",
        "created_at": "2026-01-10T09:00:00Z"
    }
    is_valid, errors = validate_ticket(invalid_record)
    assert is_valid is False
    assert any("title" in err.lower() for err in errors)
    assert any("description" in err.lower() for err in errors)

def test_validate_ticket_invalid_date_order():
    invalid_dates = {
        "ticket_id": "INC-1003",
        "title": "Application crash during database sync",
        "description": "PostgreSQL connection pool exhausted on worker node",
        "category": "Server & Infrastructure",
        "priority": "P1",
        "status": "Resolved",
        "created_at": "2026-01-15T14:00:00Z",
        "resolved_at": "2026-01-15T10:00:00Z",  # 4 hours BEFORE creation!
        "resolution_text": "Restarted connection pool."
    }
    is_valid, errors = validate_ticket(invalid_dates)
    assert is_valid is False
    assert any("precede" in err.lower() for err in errors)

def test_validate_ticket_resolved_without_resolution_text():
    record = {
        "ticket_id": "INC-1004",
        "title": "Password reset token expired",
        "description": "User unable to authenticate into Okta SSO",
        "category": "Access & Identity",
        "priority": "P3",
        "status": "Resolved",
        "created_at": "2026-01-10T09:00:00Z",
        "resolved_at": "2026-01-10T10:00:00Z",
        "resolution_text": ""  # Missing!
    }
    is_valid, errors = validate_ticket(record)
    assert is_valid is False
    assert any("resolution_text" in err.lower() for err in errors)

def test_detect_duplicate_ids_in_quality_report():
    records = [
        {"ticket_id": "INC-1001", "title": "A", "description": "Desc A", "category": "Network", "priority": "P1", "status": "New", "created_at": "2026-01-01T00:00:00Z"},
        {"ticket_id": "INC-1001", "title": "B", "description": "Desc B", "category": "Network", "priority": "P2", "status": "New", "created_at": "2026-01-01T00:00:00Z"},
        {"ticket_id": "INC-1002", "title": "C", "description": "Desc C", "category": "Hardware", "priority": "P3", "status": "New", "created_at": "2026-01-01T00:00:00Z"}
    ]
    report = generate_quality_report(records)
    assert report["duplicate_id_count"] == 1
    assert "INC-1001" in report["duplicate_ids"]

def test_preprocess_record_preserves_raw_text():
    raw = {
        "ticket_id": "INC-1005",
        "title": "  Outlook  crash   ",
        "description": "Error code 0x80040115",
        "category": "email",
        "priority": "sev2",
        "status": "in progress"
    }
    processed = preprocess_record(raw)
    assert processed["title"] == "Outlook crash"
    assert processed["category"] == "Email & Collaboration"
    assert processed["priority"] == "P2"
    assert processed["status"] == "In Progress"
    assert "raw_text" in processed
    assert "Outlook  crash" in processed["raw_text"]
