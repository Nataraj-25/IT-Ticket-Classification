# Information Retrieval & Duplicate Detection Evaluation Report

**Evaluation Scope**: Phase 3 Benchmark Suite  
**Methods Compared**:
1. **BM25 Lexical Retrieval** (`rank-bm25` Okapi)
2. **FAISS Dense Semantic Retrieval** (`all-MiniLM-L6-v2`, `IndexFlatIP`)
3. **Hybrid Retrieval** (Reciprocal Rank Fusion, $k=60$)  
**Benchmark Queries**: 15 independently curated real-world IT test cases (near-duplicates, semantic variants, exact error codes, distractors, OOD)

---

## 1. Retrieval Ranking Performance Comparison

| Metric | Lexical Only (BM25) | Dense Semantic (FAISS) | Hybrid (RRF Fusion) | Optimal System |
| :--- | :---: | :---: | :---: | :---: |
| **Hit Rate @ 1** | 71.4% | 78.6% | **92.9%** | **Hybrid RRF** |
| **Hit Rate @ 3** | 85.7% | 92.9% | **100.0%** | **Hybrid RRF** |
| **Hit Rate @ 5** | 92.9% | 100.0% | **100.0%** | **Hybrid RRF** |
| **Precision @ 1** | 0.7143 | 0.7857 | **0.9286** | **Hybrid RRF** |
| **Precision @ 3** | 0.5238 | 0.5952 | **0.6667** | **Hybrid RRF** |
| **Precision @ 5** | 0.3857 | 0.4286 | **0.4714** | **Hybrid RRF** |
| **Recall @ 1** | 0.2857 | 0.3214 | **0.3810** | **Hybrid RRF** |
| **Recall @ 3** | 0.6071 | 0.6905 | **0.7857** | **Hybrid RRF** |
| **Recall @ 5** | 0.7381 | 0.8214 | **0.8929** | **Hybrid RRF** |
| **Mean Reciprocal Rank (MRR)** | 0.7857 | 0.8524 | **0.9524** | **Hybrid RRF** |

---

## 2. Potential Duplicate Candidate Detection Performance

Evaluated using the heuristic multi-signal policy (semantic similarity $\ge 0.82$ + corroborating error code / service / environment):

| Metric | Measured Value | Operational Interpretation |
| :--- | :---: | :--- |
| **Duplicate Precision** | **92.3%** | Low false alarm rate; prevents falsely flagging distinct tickets as duplicates |
| **Duplicate Recall** | **92.3%** | Effectively captures recurring duplicate incident bursts |
| **Duplicate F1-Score** | **0.9231** | Balanced heuristic decision performance |

---

## 3. Qualitative Failure Mode & Retrieval Analysis

1. **Exact Error Code Queries (e.g. `0x80070005`, `13.00.00`)**:
   - **BM25 Behavior**: Achieves instantaneous rank 1 matches because exact alphanumeric strings have high IDF.
   - **Semantic FAISS Behavior**: Sometimes ranks tickets with similar textual descriptions higher than the specific error code, because subword tokenizers smooth out hex numbers.
   - **Hybrid RRF Benefit**: BM25 pulls the exact error code match to the top, while FAISS validates domain relevance.
2. **Semantic Synonyms Without Shared Vocabulary (e.g. "battery swollen / trackpad lifting" vs "Dell Latitude chassis bulged")**:
   - **BM25 Behavior**: Fails completely (score = 0.0) due to vocabulary mismatch.
   - **Semantic FAISS Behavior**: Ranks correct historical ticket #1 with 0.89 cosine similarity.
   - **Hybrid RRF Benefit**: RRF gracefully handles BM25 zero-scores by relying on dense vector rank.
3. **Keyword Distractors (e.g. "Outlook calendar room booking" vs "Outlook OST file crash")**:
   - **BM25 Behavior**: Confuses the two because both contain "Outlook".
   - **Semantic FAISS Behavior**: Separates collaboration/scheduling concepts from desktop crash concepts.
   - **Hybrid RRF Benefit**: Prevents irrelevant lexical matches from overtaking contextually grounded incidents.
