# Technical Presentation Outline & Pitch Deck Guide

**Hackathon**: HCLTech Future Ready AI Engineer Hackathon  
**Target Time**: 10–12 Minutes Presentation + 5 Minutes Defense  
**Format**: 10 Technical Slides + Live Demo  

---

## Slide 1: Title & Executive Overview
- **Visual**: System logo, team names, project title: *Intelligent IT Ticket Analysis & Resolution Assistant*.
- **Key Message**: Transforming enterprise IT service desks from reactive ticket routing to evidence-grounded, human-in-the-loop triage and resolution assistance.
- **Speaker Note**: Introduce the project, state the problem context, and emphasize the strict compliance with Hackathon technical architecture rules.

---

## Slide 2: The Core Problem Statement
- **Visual**: Diagram showing IT service desk bottlenecks: High volume, 25–40% duplicate incident churn, multi-hour MTTR, and analyst triage fatigue.
- **Key Message**: Traditional ITSM tools rely on manual triage or simplistic keyword searches that fail to surface relevant past fixes or detect duplicates described in different words.
- **Anticipated Question**: *"Why can't simple keyword search solve duplicate detection?"*
- **Speaker Answer**: *"Keywords fail when users describe the same outage with different terminology (e.g. 'GlobalProtect tunnel failed' vs 'VPN dropped after login'). Dense semantic vector search captures conceptual intent, while lexical BM25 captures exact error codes."*

---

## Slide 3: Three-Tier Microservice Architecture
- **Visual**: Master Architecture diagram showing React → Node.js/Express → MongoDB & Python/FastAPI.
- **Key Message**: Strict separation of concerns. Node.js manages business logic, user authorization, and data persistence; Python handles CPU-bound vector math and ML inference.
- **Anticipated Question**: *"Why not run everything in Python or everything in Node.js?"*
- **Speaker Answer**: *"Node.js provides non-blocking, asynchronous I/O and optimal connection pooling for web traffic and MongoDB. Python provides native C++ bindings for PyTorch, FAISS, and Scikit-learn. Separating them avoids blocking the web event loop with heavy embedding computations."*

---

## Slide 4: Phase 2 — Ticket Classification & Calibration (FR-01)
- **Visual**: TF-IDF + Logistic Regression feature extraction diagram; Confusion Matrix table showing 92.5% accuracy; Expected Calibration Error chart (ECE 0.048).
- **Key Message**: High-speed, interpretable classification across 6 enterprise categories with a 0.60 confidence threshold that catches 8.75% of uncertain tickets for human review.
- **Anticipated Question**: *"Why use Logistic Regression instead of an LLM or deep neural network for classification?"*
- **Speaker Answer**: *"Logistic Regression computes inference in $<7$ ms, consumes negligible memory, produces well-calibrated probabilities, and avoids the hallucination risk and inference latency ($>1$ second) of generative LLMs for pure categorization."*

---

## Slide 5: Phase 3 — Hybrid Retrieval & Duplicate Detection (FR-02)
- **Visual**: Comparative bar chart of BM25 (71.4%) vs FAISS (78.6%) vs Hybrid RRF (92.9% HitRate@1, 100% HitRate@3). Duplicate detection multi-signal policy diagram.
- **Key Message**: Reciprocal Rank Fusion ($k=60$) combines the precision of BM25 on exact error codes (`0x80070005`) with the semantic generalization of Sentence Transformers.
- **Anticipated Question**: *"Why is cosine similarity not considered duplicate probability?"*
- **Speaker Answer**: *"Cosine similarity only measures semantic surface text overlap. Two tickets can describe similar symptoms on different services or environments. Our duplicate policy requires high semantic score + matching affected service + exact technical token overlap."*

---

## Slide 6: Phase 4 — Evidence-Backed Recommendation Engine (FR-03 & FR-04)
- **Visual**: Evidence Eligibility filter flow chart; GroundingValidator verification diagram.
- **Key Message**: Every suggested step is anchored in verified historical tickets in `Resolved` status. Zero tolerance for hallucinations; exact substring excerpt verification; automated execution is strictly disabled.
- **Anticipated Question**: *"How do you prevent recommending an outdated or dangerous command?"*
- **Speaker Answer**: *"Our evidence service scans for privileged and destructive commands (sudo, drop table, disable firewall) and flags them with explicit safety warnings. Furthermore, all suggestions are advisory: human analyst approval is mandatory before any action is executed."*

---

## Slide 7: Phase 5 — Full-Stack Integration, Feedback & Audit (FR-05, FR-06, FR-08)
- **Visual**: Screenshots of the Analyst Dashboard, Feedback Modal, and Compliance Audit Trail.
- **Key Message**: Analysts can review recommendations, rate them (`useful`, `incorrect`, `unresolved`), and record technical comments. Every inference is traceable via cryptographically correlated audit logs.
- **Anticipated Question**: *"Does analyst feedback immediately trigger model retraining?"*
- **Speaker Answer**: *"No. In mission-critical enterprise environments, online automated retraining risks model poisoning. Feedback is persisted in the database to build a curated gold dataset for scheduled, offline batch retraining."*

---

## Slide 8: Phase 6 — Quantitative Evaluation & Latency Benchmarks
- **Visual**: Stage-by-stage latency breakdown chart; Optimization impact table (p95 drop from 380ms to 42.8ms).
- **Key Message**: End-to-end response time is 26.5 ms (p50) and 42.8 ms (p95), easily exceeding interactive sub-50ms enterprise SLAs.
- **Anticipated Question**: *"What was the single most impactful performance optimization?"*
- **Speaker Answer**: *"Precomputing historical embeddings and loading the FAISS index once during startup reduced search time from 450 ms down to 1.2 ms (a 99.4% latency reduction)."*

---

## Slide 9: Live System Demonstration
- **Action**: Switch to live browser console at `http://localhost:5173`.
- **Sequence**:
  1. Demonstrate Preset A: CAD Error `0x80070005` (Classification, Duplicate, Grounded Resolution).
  2. Demonstrate Inline Analyst Feedback submission.
  3. Inspect Compliance Audit Trail.
  4. Demonstrate Preset C: Out-of-Distribution Quantum FPGA incident (Zero hallucination, targeted clarification questions).

---

## Slide 10: Limitations, Trade-offs & Future Roadmap
- **Visual**: Roadmap items: Active learning retraining pipeline, FAISS IVFPQ vector sharding for 1M+ tickets, enterprise OAuth2/OIDC SSO integration.
- **Key Message**: A complete, reliable, verified, and technically defensible prototype built strictly to Hackathon guidelines.
