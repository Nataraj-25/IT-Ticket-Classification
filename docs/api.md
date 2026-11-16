# REST API Reference & Specification

**Base URL**: `http://localhost:5000` (Node.js Primary Backend)  
**Direct ML Service URL**: `http://localhost:8000` (FastAPI Microservice)  
**OpenAPI Interactive Docs**: `http://localhost:8000/docs`  

---

## 1. Master Unified Analysis Endpoint

### `POST /api/analyze`
Coordinates the end-to-end AI pipeline: Classification, Hybrid Retrieval, Grounded Recommendation, MongoDB Analysis persistence, and Audit Event logging.

#### Headers
- `Content-Type: application/json`
- `x-correlation-id` *(optional)*: Unique tracing ID. Generated automatically if omitted.
- `x-user-access-level` *(optional)*: `internal` (default), `confidential`, `restricted`, or `public`.

#### Request Body
```json
{
  "ticket_id": "INC-2026-001",
  "title": "Software installation error 0x80070005 Access is denied during CAD install",
  "description": "AutoCAD 2026 deployment fails via Company Portal with exit code 0x80070005. Antivirus shows quarantine event for setup executable temp file.",
  "affected_service": "Endpoint Management (Intune)",
  "environment": "Production",
  "generation_mode": "deterministic"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "analysis_id": "ANL-1731752391234-5678",
    "correlation_id": "CORR-1731752391234-123",
    "ticket_id": "INC-2026-001",
    "classification": {
      "category": "Software",
      "subcategory": "Developer Tools",
      "priority": "P2",
      "intent": "Incident",
      "confidence_score": 0.884,
      "calibrated": false,
      "review_required": false,
      "model_version": "category-tfidf-logreg-v1",
      "status": "completed"
    },
    "similar_tickets": [
      {
        "ticket_id": "INC-1002",
        "title": "Software installation error 0x80070005 Access is denied during CAD install",
        "affected_service": "Endpoint Management (Intune)",
        "similarity_score": 0.992,
        "potential_duplicate": true,
        "duplicate_confidence": 0.95,
        "duplicate_reason": "Exact hex error code '0x80070005' + Identical service 'Endpoint Management (Intune)'",
        "match_reason": "Identical service | Strong semantic alignment"
      }
    ],
    "recommendations": [
      {
        "recommendation_id": "REC-001",
        "title": "Resolution procedure derived from INC-1002 (Endpoint Management (Intune))",
        "steps": [
          "Whitelisted SHA-256 hash of signed Autodesk installer in CrowdStrike Falcon console.",
          "Cleared C:\\Windows\\Temp installer staging directory.",
          "Reran install via Intune management extension successfully."
        ],
        "evidence": [
          {
            "source_type": "historical_ticket",
            "source_id": "INC-1002",
            "excerpt": "Whitelisted SHA-256 hash of signed Autodesk installer in CrowdStrike Falcon console. Cleared C:\\Windows\\Temp installer staging directory. Reran install via Intune management extension successfully.",
            "relevance_reason": "Exact match for error 0x80070005 and Endpoint Management (Intune).",
            "similarity_score": 0.992
          }
        ],
        "limitations": [
          "Suggested resolution is derived from past incident history; root cause equivalence must be confirmed by the triage analyst.",
          "Automated execution is disabled by design. All remediation commands must be inspected prior to execution."
        ]
      }
    ],
    "confidence": {
      "level": "high",
      "basis": "Multiple consistent historical resolutions with identical affected service and high symptom relevance (99%)."
    },
    "review_required": true,
    "review_reasons": [
      "Identified 1 potential duplicate historical incidents requiring verification."
    ],
    "component_statuses": {
      "classification": "completed",
      "retrieval": "completed",
      "recommendation": "completed"
    },
    "status": "completed",
    "execution_latency_ms": {
      "total": 26.5,
      "classification": 6.8,
      "retrieval": 11.4,
      "recommendation": 3.2,
      "orchestration": 5.1
    }
  },
  "timestamp": "2026-11-16T15:30:00.000Z"
}
```

---

## 2. Classification API

### `POST /api/classify`
Invokes the Scikit-learn TF-IDF + Logistic Regression classification pipeline.

#### Request Body
```json
{
  "ticket_id": "INC-2001",
  "title": "GlobalProtect VPN tunnel drops repeatedly",
  "description": "User encounters error 800 while attempting connection to 10.240.0.1",
  "affected_service": "Corporate VPN"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "ticket_id": "INC-2001",
    "classification": {
      "category": "Network",
      "subcategory": "VPN",
      "priority": "P2",
      "intent": "Incident"
    },
    "confidence": {
      "category_score": 0.884,
      "score_type": "estimated_probability",
      "calibrated": false
    },
    "review_required": false,
    "review_reason": null,
    "model_version": "category-tfidf-logreg-v1",
    "taxonomy_version": "v1.0",
    "inference_latency_ms": 6.8
  }
}
```

---

## 3. Hybrid Similarity Retrieval & Duplicates API

### `POST /api/tickets/similar`
Searches historical tickets using dense vector embeddings (FAISS) + BM25 keyword matching fused via Reciprocal Rank Fusion ($k=60$).

#### Request Body
```json
{
  "ticket_id": "INC-2001",
  "title": "VPN disconnects after login",
  "description": "Corporate VPN connection drops immediately after authentication on gateway 10.240.0.1.",
  "affected_service": "Corporate VPN",
  "environment": "Production",
  "top_k": 3
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "query_ticket_id": "INC-2001",
    "retrieval_method": "hybrid",
    "results": [
      {
        "ticket_id": "INC-1005",
        "title": "VPN connection drops after 5 minutes",
        "description_excerpt": "Corporate VPN disconnects with timeout error...",
        "affected_service": "Corporate VPN",
        "category": "Network",
        "status": "Resolved",
        "similarity_score": 0.892,
        "bm25_score": 12.4,
        "potential_duplicate": true,
        "duplicate_confidence": 0.88,
        "duplicate_reason": "High semantic similarity (0.89) and identical affected service",
        "match_reason": "Identical service 'Corporate VPN' | Strong semantic symptom alignment"
      }
    ],
    "retrieval_model_version": "hybrid-rrf-v1",
    "retrieval_latency_ms": 14.5
  }
}
```

---

## 4. Analyst Feedback API (FR-06)

### `POST /api/analyses/:analysisId/feedback`
Captures expert human adjudication and feedback.

#### Request Body
```json
{
  "target_type": "recommendation",
  "target_id": "REC-001",
  "feedback_status": "useful",
  "comment": "The hash whitelisting action directly resolved the blocked installer issue."
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Analyst feedback recorded successfully",
  "data": {
    "feedback_id": "FB-1731752399999-123",
    "analysis_id": "ANL-1731752391234-5678",
    "target_type": "recommendation",
    "target_id": "REC-001",
    "feedback_status": "useful",
    "comment": "The hash whitelisting action directly resolved the blocked installer issue.",
    "created_at": "2026-11-16T15:35:00.000Z"
  }
}
```

---

## 5. Compliance Audit Trail API (FR-08)

### `GET /api/audit`
Returns paginated, cryptographically correlated audit records.

#### Query Parameters
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `event_type` *(optional)*: `ANALYSIS_STARTED`, `ANALYSIS_COMPLETED`, `FEEDBACK_SUBMITTED`, etc.
- `analysis_id` *(optional)*: Filter by analysis reference.
- `correlation_id` *(optional)*: Filter by correlation ID.

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "event_id": "AUD-1731752391234-9876",
      "correlation_id": "CORR-1731752391234-123",
      "analysis_id": "ANL-1731752391234-5678",
      "event_type": "ANALYSIS_COMPLETED",
      "actor_reference": {
        "actor_id": "analyst-console",
        "actor_type": "analyst"
      },
      "component_status": "completed",
      "metadata": {
        "total_latency_ms": 26.5,
        "recommendations_count": 1,
        "similar_tickets_count": 3
      },
      "timestamp": "2026-11-16T15:30:00.026Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "pages": 8
  }
}
```
