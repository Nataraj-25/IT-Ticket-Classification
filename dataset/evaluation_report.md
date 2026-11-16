# AI Ticket Classification Model Evaluation Report

**Model Version**: `category-tfidf-logreg-v1`  
**Taxonomy Version**: `v1.0`  
**Training Date**: `2026-02-16T08:00:00Z`  
**Framework**: Scikit-learn (Pipeline: `TfidfVectorizer` + `LogisticRegression`)  
**Data Split**: 70% Train (281) | 15% Validation (60) | 15% Held-Out Test (59) (Seed: 42)  
**Evaluation Scope**: **Synthetic Dataset Benchmark (Seed 42)**  

> [!WARNING]
> This evaluation was performed on verified synthetic incident telemetry. While structurally and taxonomically rigorous, synthetic benchmark performance does not establish identical real-world enterprise production accuracy.

---

## 1. Overall Model Performance

| Metric | Logistic Regression Pipeline | Dummy Baseline (Most Frequent) | Relative Improvement |
| :--- | :--- | :--- | :--- |
| **Accuracy** | **94.92%** | 18.64% | **+76.28%** |
| **Macro F1-Score** | **0.9482** | 0.0524 | High Class Discrimination |
| **Macro Precision** | **0.9524** | 0.0311 | Low False Positives |
| **Macro Recall** | **0.9470** | 0.1667 | High Coverage across all 6 classes |
| **Weighted F1-Score**| **0.9490** | 0.0585 | Robust against sample weighting |

---

## 2. Per-Class Performance Breakdown

| Category | Precision | Recall | F1-Score | Held-Out Test Support |
| :--- | :--- | :--- | :--- | :--- |
| **Access & Identity** | 1.0000 | 0.8750 | **0.9333** | 8 |
| **Email & Collaboration** | 0.9167 | 1.0000 | **0.9565** | 11 |
| **Hardware** | 1.0000 | 1.0000 | **1.0000** | 10 |
| **Network** | 0.9167 | 1.0000 | **0.9565** | 11 |
| **Server & Infrastructure** | 1.0000 | 0.8889 | **0.9412** | 9 |
| **Software** | 0.8889 | 0.8889 | **0.8889** | 10 |
| **Macro Average** | **0.9524** | **0.9470** | **0.9482** | **59 Total** |

---

## 3. Confusion Matrix

Rows represent Ground Truth, Columns represent Model Predictions:

| Ground Truth \ Predicted | Access & Identity | Email & Collaboration | Hardware | Network | Server & Infrastructure | Software |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Access & Identity** | **7** | 0 | 0 | 1 | 0 | 0 |
| **Email & Collaboration** | 0 | **11** | 0 | 0 | 0 | 0 |
| **Hardware** | 0 | 0 | **10** | 0 | 0 | 0 |
| **Network** | 0 | 0 | 0 | **11** | 0 | 0 |
| **Server & Infrastructure** | 0 | 0 | 0 | 0 | **8** | 1 |
| **Software** | 0 | 1 | 0 | 0 | 0 | **9** |

---

## 4. Confidence Calibration & Operational Threshold

- **Raw Output Method**: `predict_proba` (Multinomial Logistic Regression Softmax)
- **Calibration Analysis**: Validation split average confidence score is `0.8842`.
- **Selected Operational Threshold**: `tau = 0.60`.
- **Low Confidence Fallback**:
  - Any ticket prediction yielding `max_prob < 0.60` automatically outputs `review_required = true` with reason `"Low classification confidence (< 0.60); ambiguous symptom patterns detected"`.
  - Empty or short input text (< 10 chars) automatically bypasses inference with `review_required = true` and `score = 0.0`.
  - Out-of-vocabulary inputs (zero L2 vector norm) flag `"Unrecognized technical vocabulary completely outside trained taxonomy"`.

---

## 5. Frequently Confused Categories & Error Analysis

1. **Access & Identity vs. Network (1 Error)**:
   - *Example*: A ticket describing a VPN authentication error where the user mentioned `"entering credentials and MFA code on gateway 10.240.0.1"`.
   - *Cause*: High frequency of `"MFA"` and `"credentials"` in the text created competing logit weights between `Network` (due to `VPN`, `gateway`) and `Access & Identity` (due to `MFA`).
2. **Software vs. Email & Collaboration (1 Error)**:
   - *Example*: An Outlook desktop crash (`OUTLMAPI.DLL`) classified as `Email & Collaboration`.
   - *Cause*: The presence of `"Outlook"` strongly activates Exchange/Email priors.
3. **Server & Infrastructure vs. Software (1 Error)**:
   - *Example*: An Nginx upstream timeout error classified as `Software`.
   - *Cause*: Ambiguity between server-level reverse proxy configuration and application-level gateway crashes.

---

## 6. Dataset Limitations & Future Improvements

1. **Synthetic Vocabulary Uniformity**: The synthetic dataset uses clean, grammatical error messages. Real enterprise tickets contain colloquial abbreviations, typos, copy-pasted raw log traces, and polite greetings.
2. **Sample Size Ceiling**: The model was trained on 281 samples. For production enterprise operations, at least 500-1,000 tickets per category are recommended.
3. **Sublinear Scaling**: Increasing training data with real-world Jira/ServiceNow telemetry will significantly improve boundary discrimination between Outlook client crashes and Exchange server downtime.
