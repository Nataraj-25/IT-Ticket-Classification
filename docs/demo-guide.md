# Live Demonstration Guide & Script

**Project**: Intelligent IT Ticket Analysis and Resolution Assistant  
**Target Audience**: HCLTech Hackathon Technical Evaluation Jury  
**Duration**: 8–10 Minutes (Includes live Q&A)  

---

## 1. Demonstration Setup & Pre-Flight Checks

Before presenting to evaluators, ensure all 4 services are healthy:
1. **Frontend**: Open `http://localhost:5173` in Google Chrome. Verify "Phases 1–6 Operational" badge is visible.
2. **Backend**: Verify `http://localhost:5000/api/health` returns `{"status":"UP"}`.
3. **ML Service**: Verify `http://localhost:8000/health` returns `{"retrieval_ready":true,"retrieval_index_size":400}`.
4. **MongoDB**: Ensure `it_ticket_db` contains seeded historical tickets.

---

## 2. Step-by-Step Live Demonstration Script

### Minute 0:00–1:30 | Introduction & Architectural Vision
- **Speaker**:
  > *"Respected evaluators, today IT service desks face a dual crisis: massive incident volume and repeated duplicate tickets that cause operational fatigue and inflate resolution time.
  > We have built the **Intelligent IT Ticket Analysis and Resolution Assistant**—an end-to-end, multi-model AI system that classifies tickets, identifies duplicate incidents using hybrid FAISS and BM25 retrieval, and generates evidence-grounded resolution procedures with full source traceability.
  > Crucially, our system operates as an **advisory assistant with human-in-the-loop validation**: it never executes commands automatically or closes tickets without analyst approval."*

---

### Minute 1:30–3:30 | Demo Case A: Strong Historical Match & Grounded Resolution
- **Action**: On the **Analyst Dashboard**, click the preset: **"CAD Install Error 0x80070005"**.
- **Click**: **"Analyze Ticket (Run All Phases)"**.
- **Point out to Evaluators**:
  1. **Latency Pill**: Shows end-to-end response in $\sim25$–$35$ ms.
  2. **AI Classification**: Predicted category `Software`, subcategory `Developer Tools`, Priority `P2`, Confidence `88.4%`.
  3. **Duplicate Detection**: Flags historical ticket `INC-1002` as a **Potential Duplicate (95% confidence)** because both tickets share the exact error code `0x80070005` and service `Endpoint Management (Intune)`.
  4. **Evidence-Backed Suggested Resolution**:
     - Shows numbered remediation steps: whitelisting SHA-256 hash in CrowdStrike console, clearing Temp directory, and re-running Intune installation.
     - Highlight the **Traceable Historical Evidence Box**: Quotes verbatim excerpt from `INC-1002`.
     - Highlight the **Advisory Safety Warning**: Reminds the analyst that automated execution is disabled by design.

---

### Minute 3:30–5:30 | Demo Case B: Human Feedback & Audit Trail (FR-06 & FR-08)
- **Action**: On the suggested resolution card from Demo Case A, click **"💬 Review Action"**.
- **Action**:
  - Select feedback status: **Useful**.
  - Enter comment: *"Whitelisting the SHA-256 installer hash directly resolved the Intune deployment block."*
  - Click **Submit Feedback**.
- **Action**: Navigate to the top navigation tab **"📜 Past Analyses (Phase 5)"**.
  - Show the record of `ANL-XXXX` that was persisted in MongoDB. Click **"Inspect"** to reveal the saved classification, similar tickets, and the feedback just submitted.
- **Action**: Navigate to **"🛡️ Compliance Audit Trail (FR-08)"**.
  - Filter by event type **`FEEDBACK_SUBMITTED`** and **`ANALYSIS_COMPLETED`**.
  - Show the cryptographically correlated `event_id` and `correlation_id` proving complete end-to-end traceability.

---

### Minute 5:30–7:30 | Demo Case C: Safe Fallback on Conflicting or Out-of-Distribution Incidents
- **Action**: Navigate back to **Analyst Dashboard**. Click preset: **"Unseen / OOD Incident (Insufficient Evidence)"** (`Proprietary Quantum FPGA Accelerator`).
- **Click**: **"Analyze Ticket"**.
- **Point out to Evaluators**:
  1. **Zero Hallucination Guarantee**: The system refuses to fabricate a resolution.
  2. **Recommendation Status**: Returns `insufficient_evidence`.
  3. **Targeted Clarification Questions**: The assistant intelligently asks:
     - *"Has this proprietary accelerator board been registered in the hardware inventory?"*
     - *"Can you provide the kernel dmesg panic stack trace?"*
  4. **Low-Confidence Review Flag**: Triggers human triage escalation.

---

### Minute 7:30–9:00 | Conclusion & Architecture Summary
- **Speaker**:
  > *"To summarize: our system eliminates MTTR bottlenecks through hybrid AI retrieval, protects production systems through deterministic grounding and anti-injection safeguards, and captures analyst feedback to power continuous active learning. We are now ready for your questions."*

---

## 3. Fallback Plan (Contingency Procedures)

In the event of a local machine issue or projector disconnection:
- **Contingency 1 (Python Service Offline)**: The Node.js orchestrator automatically triggers its graceful 503 fallback. Demonstrate that the UI displays a clear degraded status warning without crashing.
- **Contingency 2 (Demonstration from Stored Analyses)**: Open the **Past Analyses (Phase 5)** tab where previous live runs remain persistently saved in MongoDB.
- **Contingency 3 (Report Inspection)**: Open `docs/evaluation-report.md` and `dataset/three_worked_examples.md` to walk evaluators through the exact JSON inputs and outputs.
