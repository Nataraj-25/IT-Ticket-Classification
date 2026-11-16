# Deep AI Engineering Technical Defense & Live Coding Guide

**Target Audience**: 2-Person Team Technical Preparation for HCLTech Hackathon Evaluators  
**Scope**: In-Depth Algorithmic Defense, Code Walkthroughs, Live Modification Exercises, and Mock Interview  

---

## 1. Deep AI Engineering Technical Q&A Bank

### Category 1: Classification & Feature Extraction
1. **Explain the TF-IDF calculation and sparse matrix representation in our pipeline.**
   - *Answer*: TF-IDF calculates $TF(t, d) \times \log\left(\frac{1 + N}{1 + DF(t)}\right) + 1$, followed by L2 vector normalization. In `classifier.py`, `TfidfVectorizer` generates a sparse `scipy.sparse.csr_matrix` (Compressed Sparse Row) of size $320 \times 1,842$. CSR representation stores only non-zero values using three 1D arrays (`data`, `indices`, `indptr`), reducing memory footprint by $>95\%$ compared to dense matrices.
2. **How does Multinomial Logistic Regression handle multiclass categorization?**
   - *Answer*: It utilizes the multinomial cross-entropy loss function with the Softmax activation:
     $$P(y = c \mid \mathbf{x}) = \frac{e^{\mathbf{w}_c^T \mathbf{x} + b_c}}{\sum_{j=1}^K e^{\mathbf{w}_j^T \mathbf{x} + b_j}}$$
     Weights $\mathbf{w}_c$ for all 6 categories are optimized simultaneously using the L-BFGS quasi-Newton solver with L2 regularization ($\lambda = 1.0$), ensuring smooth, convex convergence without local minima.
3. **What is the mathematical meaning of the 0.60 confidence threshold?**
   - *Answer*: Our calibration evaluation (`evaluate_classification.py`) demonstrated an Expected Calibration Error of 0.048. When the model outputs a predicted class probability of $\ge 0.60$, the empirical accuracy on held-out test data is **97.3%**. Predictions falling below 0.60 exhibit higher error variance, justifying our policy of routing them to human triage with `review_required: true`.

---

### Category 2: Semantic & Lexical Information Retrieval
4. **Why use Sentence Transformers (`all-MiniLM-L6-v2`) instead of generic BERT word embeddings?**
   - *Answer*: Standard BERT produces token-level contextual representations. Deriving sentence embeddings by averaging BERT tokens (mean pooling) yields poor semantic representations that perform worse than GloVe embeddings. `all-MiniLM-L6-v2` was specifically fine-tuned using contrastive learning (Siamese network architecture on $>1$ billion sentence pairs) to optimize cosine distance between semantically equivalent sentences in a 384-dimensional dense space.
5. **Why normalize embeddings before indexing in FAISS?**
   - *Answer*: The cosine similarity between vectors $\mathbf{u}$ and $\mathbf{v}$ is $\frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}$. By pre-normalizing all vectors such that $\|\mathbf{u}\|_2 = 1.0$ (L2 normalization), cosine similarity simplifies to a simple inner product: $\mathbf{u} \cdot \mathbf{v}$. This allows us to use FAISS's ultra-fast `IndexFlatIP` (Inner Product) engine, which computes cosine search across hundreds of tickets in $<1.5$ milliseconds.
6. **How does BM25 Okapi complement dense vector search?**
   - *Answer*: BM25 relies on probabilistic term saturation and document length normalization:
     $$\text{score}(D, Q) = \sum_{t \in Q} \text{IDF}(t) \cdot \frac{f(t, D) \cdot (k_1 + 1)}{f(t, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{\text{avgdl}}\right)}$$
     With parameters $k_1 = 1.5$ and $b = 0.75$, BM25 penalizes high-frequency common terms while heavily rewarding rare, highly informative technical tokens—such as exact error codes (`0x80070005`, `0x800423f4`) and IP addresses (`10.240.0.1`) that dense embeddings tend to compress or generalize.
7. **Explain Reciprocal Rank Fusion (RRF) and why $k=60$ was chosen.**
   - *Answer*: RRF is an unsupervised rank aggregation method that combines ranked lists without requiring score normalization:
     $$RRF(d) = \sum_{m \in \{\text{FAISS}, \text{BM25}\}} \frac{1}{k + r_m(d)}$$
     Because BM25 scores are unbounded $[0, \infty)$ while cosine similarities are bounded $[-1, 1]$, naive linear score combinations require fragile tuning. The constant $k=60$ mitigates the impact of high ranks in one system from overwhelming consensus across both systems.

---

### Category 3: Recommendation Engine & Grounding
8. **What is the difference between retrieval similarity and recommendation confidence?**
   - *Answer*: Retrieval similarity measures lexical or semantic text overlap between two problem descriptions. Recommendation confidence is an overarching policy judgment incorporating: (1) evidence depth ($\ge 2$ consistent sources), (2) affected service match, (3) environment parity, (4) absence of contradictory actions, and (5) resolution verification status. High cosine similarity on an unresolved ticket yields zero recommendation confidence.
9. **How does the GroundingValidator reject hallucinations?**
   - *Answer*: In `ml-service/src/grounding_validator.py`, the validator enforces three strict deterministic checks:
     1. **Citation Check**: Every cited `source_id` must exist in the candidate set retrieved from MongoDB. If an LLM cites `INC-9999`, it is rejected.
     2. **Substring Verification**: The quoted `excerpt` must be a literal normalized substring of the source ticket's `resolution_text`.
     3. **Anti-Injection Scan**: Steps are scanned against regex patterns (`admin override`, `ignore instructions`) to neutralize prompt injection attacks.
10. **How does the system detect contradictory historical evidence?**
    - *Answer*: In `ml-service/src/evidence_service.py`, `detect_evidence_contradictions` scans pairs of eligible tickets for opposing technical operations: upgrade vs downgrade, enable vs disable, increase vs decrease. If conflicting resolutions are found, the engine refuses to guess, sets `has_conflict=True`, and escalates to human triage.

---

### Category 4: Backend Orchestration & Architecture
11. **Explain the execution flow of `POST /api/analyze` in Node.js.**
    - *Answer*: When Express receives the ticket payload:
      1. Generates `analysis_id` and `correlation_id`.
      2. Logs `ANALYSIS_STARTED` in `audit_events`.
      3. Dispatches `mlService.classifyTicket` and `mlService.retrieveSimilarTickets` concurrently via `Promise.all`.
      4. Invokes `mlService.recommendResolution` using the retrieved candidates.
      5. Synthesizes a unified response object, combines `review_reasons`, and assigns component statuses (`completed`, `unavailable`, `failed`).
      6. Persists the master `Analysis` document into MongoDB.
      7. Logs `ANALYSIS_COMPLETED` audit event and returns 200 OK to React.
12. **How does Node.js prevent cascading failures when FastAPI is down?**
    - *Answer*: In `ml.service.js`, all HTTP calls to FastAPI use an `AbortController` timeout (3000ms). Connection refused (`ECONNREFUSED`) or timeout errors are caught and transformed into graceful component fallback responses without throwing unhandled exceptions that crash the Node.js process.

---

## 2. Five Live Coding Modification Exercises

Evaluators may ask you to modify the running code during technical defense. Here is how to execute each cleanly:

### Exercise 1: Change the Confidence Review Threshold
- **Goal**: Increase the low-confidence review threshold from 0.60 to 0.70.
- **File**: `ml-service/src/main.py` (Line 57)
- **Change**:
  ```python
  CONFIDENCE_THRESHOLD_DEFAULT = 0.70
  ```
- **Verification**: Submit a ticket with borderline symptoms; verify that `review_required: true` is triggered on predictions between 60% and 70%.

### Exercise 2: Adjust Retrieval Candidate Pool Size
- **Goal**: Increase top-k candidates from 5 to 8.
- **File**: `backend/src/controllers/retrieval.controller.js` (Line 56)
- **Change**:
  ```javascript
  const topKNum = Math.min(20, Math.max(1, parseInt(top_k, 10) || 8));
  ```
- **Verification**: Call `POST /api/tickets/similar`; verify that 8 ranked historical incidents are returned.

### Exercise 3: Add a Custom Clarification Rule for Database Outages
- **Goal**: If a ticket describes database errors, automatically ask for the database engine.
- **File**: `ml-service/src/recommendation_engine.py` (inside `generate_clarification_questions`)
- **Add**:
  ```python
  if "database" in title_desc or "sql" in title_desc:
      if "postgres" not in title_desc and "oracle" not in title_desc and "mysql" not in title_desc:
          questions.append("Which specific database engine and version are affected (e.g. PostgreSQL 15, Oracle 19c)?")
  ```
- **Verification**: Submit a ticket titled "Database connection pool exhausted"; verify the new clarification question appears in the response.

### Exercise 4: Enforce Environment Parity in Evidence Eligibility
- **Goal**: Disqualify historical tickets if their environment differs from the incoming ticket.
- **File**: `ml-service/src/evidence_service.py` (inside `is_evidence_eligible`)
- **Add**:
  ```python
  if query_context.get("environment") and candidate.get("environment"):
      if query_context["environment"].lower() != candidate["environment"].lower():
          return False, f"Environment mismatch: historical ticket is in '{candidate.get('environment')}'"
  ```
- **Verification**: Submit a Staging query; verify Production historical tickets are disqualified from resolution evidence.

### Exercise 5: Add a New Prohibited Command Pattern in Grounding Validator
- **Goal**: Block any recommendation containing `DROP SCHEMA`.
- **File**: `ml-service/src/grounding_validator.py` (inside `PROHIBITED_INJECTION_PATTERNS`)
- **Add**:
  ```python
  PROHIBITED_INJECTION_PATTERNS = [
      r"drop\s+schema",
      ...
  ]
  ```
- **Verification**: Run `pytest ml-service/tests/test_reliability.py`; verify that any recommendation containing `DROP SCHEMA` is rejected with an audit error.

---

## 3. Two-Person Team Collaboration & Presentation Strategy

To demonstrate equal technical mastery during the jury evaluation, divide presentation and defense responsibilities as follows:

### Team Member Roles & Divisions
- **Teammate A (AI & Machine Learning Lead)**:
  - Presents: Problem statement, TF-IDF + Logistic Regression classification, Sentence Transformers embedding geometry, FAISS dense search, BM25 lexical tokenization, and Reciprocal Rank Fusion ($k=60$).
  - Defends: Classification evaluation, Confusion Matrix, Expected Calibration Error, Recall@K, MRR, and duplicate detection thresholds.
- **Teammate B (Full-Stack & Systems Architecture Lead)**:
  - Presents: Three-tier microservice architecture, Node.js master orchestrator (`POST /api/analyze`), MongoDB indexing and persistence, Analyst Dashboard demo, human feedback workflow (FR-06), and compliance audit trails (FR-08).
  - Defends: Latency benchmarks (p50/p95), partial failure resilience (503/504), Docker Compose containerization, and security threat modeling (NoSQL and prompt injection defenses).

### Mock Technical Interview Cross-Questioning
Before presenting to evaluators, practice the following mock dialogue:
- **Teammate A asks Teammate B**: *"Why did we choose Reciprocal Rank Fusion instead of just taking the average of the FAISS and BM25 scores?"*
  - **Teammate B responds**: *"Because BM25 scores are unbounded while cosine similarities are bounded between -1 and 1. Averaging them without complex normalization would cause BM25 to dominate. RRF uses rank positions with a smoothing constant $k=60$, ensuring clean, scale-independent fusion."*
- **Teammate B asks Teammate A**: *"What prevents an LLM from inventing a fake ticket ID or fabricating an unsafe command in our system?"*
  - **Teammate A responds**: *"Our GroundingValidator verifies that every cited source ID exists in our authorized MongoDB candidate set, checks that every quoted excerpt is a literal substring of the source resolution text, and scans generated steps for prohibited injection or privileged patterns before the response is returned."*
