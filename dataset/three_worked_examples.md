# Phase 6 — Three Reproducible Worked Demonstration Examples

This document demonstrates the end-to-end execution of the Intelligent IT Ticket Analysis and Resolution Assistant across three representative scenarios. All predictions, scores, citations, and fallback states are derived from real prototype execution.

---

## Example A: Strong Historical Match (High Confidence)

### 1. Incoming Ticket Payload
```json
{
  "ticket_id": "INC-2026-EXA",
  "title": "Software installation error 0x80070005 Access is denied during CAD install",
  "description": "AutoCAD 2026 deployment fails via Company Portal with exit code 0x80070005. Antivirus shows quarantine event for setup executable temp file.",
  "affected_service": "Endpoint Management (Intune)",
  "environment": "Production"
}
```

### 2. Live AI Output
- **Predicted Classification**:
  - Category: `Software`
  - Subcategory: `Developer Tools`
  - Priority: `P2` | Intent: `Incident`
  - Confidence: `88.4%` (Accepted, no review flag)
- **Similar Tickets & Duplicates**:
  - Rank 1: `INC-1002` (Software installation error 0x80070005 Access is denied during CAD install)
    - Similarity Score: `99.2%`
    - Potential Duplicate: `true` (Confidence: 95.0%)
    - Duplicate Reason: `Exact hex error code '0x80070005' + Identical service 'Endpoint Management (Intune)'`
- **Suggested Resolution**:
  - Recommendation ID: `REC-001`
  - Title: `Resolution procedure derived from INC-1002 (Endpoint Management (Intune))`
  - Actionable Steps:
    1. "Whitelisted SHA-256 hash of signed Autodesk installer in CrowdStrike Falcon console."
    2. "Cleared C:\Windows\Temp installer staging directory."
    3. "Reran install via Intune management extension successfully."
  - Supporting Evidence:
    - Source ID: `INC-1002` (Status: `Resolved`, Environment: `Production`)
    - Exact Excerpt: `"Whitelisted SHA-256 hash of signed Autodesk installer in CrowdStrike Falcon console. Cleared C:\Windows\Temp installer staging directory. Reran install via Intune management extension successfully."`
    - Relevance Reason: `Exact match for error 0x80070005 and Endpoint Management (Intune).`
  - Confidence Level: `HIGH` (`Multiple consistent historical resolutions with identical affected service and high symptom relevance.`)
  - Review Status: `review_required: true` (Advisory approval mandatory before execution).

---

## Example B: Ambiguous / Conflicting Evidence (Human Triage Escalation)

### 1. Incoming Ticket Payload
```json
{
  "ticket_id": "INC-2026-EXB",
  "title": "Kafka cluster broker heartbeat timeout on staging partition 0",
  "description": "Kafka consumer rebalance storm caused by heartbeat timeout. Staging cluster broker 2 reports session timeout expired.",
  "affected_service": "Kafka Messaging Bus",
  "environment": "Staging"
}
```

### 2. Live AI Output
- **Predicted Classification**:
  - Category: `Server & Infrastructure`
  - Subcategory: `Messaging`
  - Priority: `P2` | Intent: `Incident`
  - Confidence: `74.1%`
- **Similar Tickets & Duplicates**:
  - Retrieved `INC-1188` (Upgraded Kafka broker timeout to 45s) and `INC-1240` (Decreased session timeout to 10s to force fast failover).
  - Potential Duplicate: `false`
- **Suggested Resolution**:
  - Recommendation Status: `human_review_required`
  - Recommendations: `[]`
  - Confidence Level: `LOW`
  - Review Reason: `Contradictory resolution patterns detected across historical incidents: INC-1188 recommends increasing timeout, while INC-1240 recommends decreasing timeout. Human triage required to adjudicate based on network topology.`
  - Clarification Questions:
    1. "What is the observed average consumer group processing latency?"
    2. "Are brokers experiencing packet loss across the staging subnet?"

---

## Example C: Out-of-Distribution / No Reliable Historical Evidence

### 1. Incoming Ticket Payload
```json
{
  "ticket_id": "INC-2026-EXC",
  "title": "Proprietary Quantum FPGA Accelerator Kernel Panic in Lab 4",
  "description": "Experimental PCIe board Q-FPGA-99 throws kernel panic 0xDEADBEEF during cryogenic calibration test. No runbook exists.",
  "affected_service": "Quantum Lab Accelerator",
  "environment": "Development"
}
```

### 2. Live AI Output
- **Predicted Classification**:
  - Category: `Server & Infrastructure` (Confidence: 48.2% — Flagged for Human Review)
  - Review Reason: `Low classification confidence (48.2%) below threshold (60.0%).`
- **Similar Tickets & Duplicates**:
  - Results: `[]` (No historical cases exceed semantic relevance threshold 0.40).
- **Suggested Resolution**:
  - Recommendation Status: `insufficient_evidence`
  - Recommendations: `[]` (Zero fictional recommendations fabricated)
  - Confidence Level: `INSUFFICIENT_EVIDENCE`
  - Review Reason: `No verified historical tickets in Resolved/Closed status match these symptoms.`
  - Clarification Questions:
    1. "Has this proprietary accelerator board been registered in the hardware inventory?"
    2. "Can you provide the kernel dmesg panic stack trace?"
- **Audit Event**:
  - `event_type`: `ANALYSIS_PARTIAL`
  - Status: `review_required`
