# Dataset Quality & Machine Learning Readiness Report

**Project**: Intelligent IT Ticket Analysis and Resolution Assistant  
**Event**: HCLTech Future Ready AI Engineer Hackathon  
**Phase**: Phase 1 — Dataset Preparation, MongoDB Integration & Historical Ticket Management  
**Dataset Version**: 1.0.0 (Reproducible Synthetic Foundation, Seed = 42)  
**Generation Date**: 2026-01-01 to 2026-02-15 Simulated Horizon  

---

## 1. Executive Summary

A validated, balanced historical dataset of **400 enterprise IT tickets** was synthesized and rigorously preprocessed. The dataset reflects realistic IT operations across 6 core functional enterprise domains, incorporating authentic hardware failure symptoms, network gateway dropouts, identity lockouts, application crashes, and cloud infrastructure alerts.

Every record has undergone structural schema validation, whitespace normalization, ISO-8601 chronological verification, and label taxonomy mapping.

---

## 2. Dataset Quality Metrics

| Metric | Measured Value | Benchmark / Target | Status |
| :--- | :--- | :--- | :--- |
| **Total Records** | **400** | 300 – 500 records | PASS |
| **Unique Ticket IDs** | **400** | 100% Unique | PASS (0 duplicates) |
| **Duplicate Ticket IDs** | **0** | 0 allowed | PASS |
| **Missing Mandatory Fields** | **0** (0.00%) | 0 allowed | PASS |
| **Valid Label Taxonomy** | **100.0%** | >= 99.0% | PASS |
| **Chronological Integrity** | **100.0%** (`resolved_at >= created_at`) | 100.0% | PASS |
| **Resolved Tickets** | **338** (84.50%) | 70 – 85% | PASS |
| **Resolved with Usable Resolution Text** | **338** (100% of resolved) | 100% of resolved | PASS |
| **Records Suitable for ML Classification** | **400** (100.0%) | >= 90.0% | PASS |

---

## 3. Taxonomy Distributions

### 3.1 Category Distribution
The dataset maintains balanced representation across all 6 major IT service domains:

| Category | Record Count | Percentage | Primary Subcategories |
| :--- | :--- | :--- | :--- |
| **Network** | 68 | 17.00% | VPN, Wi-Fi, DNS, Firewall, Bandwidth, Switch/Router |
| **Access & Identity** | 71 | 17.75% | Account Lockout, Password Reset, MFA / 2FA, Active Directory |
| **Hardware** | 65 | 16.25% | Laptop, Desktop, Monitor, Printer, Docking Station |
| **Software** | 66 | 16.50% | Operating System, Office 365, Browser, Developer Tools |
| **Server & Infrastructure** | 64 | 16.00% | Web Server, Database, Virtual Machine, Storage & Backup |
| **Email & Collaboration** | 66 | 16.50% | Outlook / Exchange, Microsoft Teams, Shared Mailbox |
| **Total** | **400** | **100.00%** | Balanced distribution across all classes |

### 3.2 Priority Distribution
Reflects standard ITIL incident prioritization distribution:

| Priority | Level | Count | Share | Typical Incident Profile |
| :--- | :--- | :--- | :--- | :--- |
| **P1** | Critical | 62 | 15.50% | Core DB outage, floor-wide Wi-Fi failure, hazardous battery swelling |
| **P2** | High | 148 | 37.00% | Intermittent VPN drops, recurring account lockouts, BSOD crash |
| **P3** | Medium | 178 | 44.50% | Printer paper jam, single-user Outlook crash, password reset |
| **P4** | Low | 12 | 3.00% | Non-urgent peripheral, routine request |

### 3.3 Status Distribution
| Status | Count | Share | Notes |
| :--- | :--- | :--- | :--- |
| **Resolved** | 298 | 74.50% | Contains actionable technical resolution steps and `resolved_at` |
| **Closed** | 40 | 10.00% | Formally closed after user confirmation |
| **In Progress** | 28 | 7.00% | Active ticket under investigation |
| **Assigned** | 16 | 4.00% | Queued in Tier-2/Tier-3 support queue |
| **New** | 12 | 3.00% | Freshly logged, pending triage |
| **Pending** | 6 | 1.50% | Awaiting vendor or customer feedback |

---

## 4. Preservation of Critical Technical Evidence

During preprocessing, aggressive stopword stripping and alphanumeric-only filtering were intentionally **prohibited**. The pipeline preserves:

1. **Hexadecimal Windows Error Codes**: e.g., `0x80070005`, `0x80248007`, `0x800423f4`, `0x000000D1`.
2. **Network Protocol Statuses**: e.g., `HTTP 502 Bad Gateway`, `DNS_PROBE_FINISHED_NXDOMAIN`, `Error 800`.
3. **Internal IP Addresses & Subnets**: e.g., `10.240.0.1`, `10.10.1.2`, `10.50.4.12`, `127.0.0.1:8080`.
4. **File System Paths & Registry Artifacts**: e.g., `C:\Windows\System32`, `N:\Finance\FY26_Budgets`, `%appdata%\Microsoft\Teams`.
5. **Security Identifiers & Event IDs**: e.g., `Event ID 4625`, `Event ID 1000`, `SG-FIN-Budgets-RW`.

---

## 5. Machine Learning Preparation & Split Strategy

### 5.1 The Near-Duplicate Leakage Challenge
A major risk in IT ticket classification and retrieval is **data leakage between training and evaluation splits caused by near-duplicate incidents**. When an enterprise outage occurs (e.g. VPN gateway restart), dozens of employees file tickets with near-identical wording within hours. If one ticket from the incident lands in the training set and another in the test set:
- The classifier achieves artificially inflated test accuracy.
- The evaluation measures memorization of incident-specific keywords rather than true semantic generalization.

### 5.2 Proposed Grouped / Stratified Split Strategy
To eliminate leakage in subsequent phases:
1. **Cluster by Incident Family**: Group tickets sharing common root causes, temporal proximity ($\pm 2$ hours), and high Jaccard token similarity into atomic "Incident Clusters".
2. **Group-Stratified Split**: Assign entire incident clusters exclusively to either `Train` (70%), `Validation` (15%), or `Test` (15%), ensuring that no incident family straddles split boundaries.
3. **Class Stratification**: Maintain balanced category representation across all three splits.

### 5.3 Synthetic Data Notice
> [!WARNING]
> While this synthetic dataset satisfies all schema, statistical, and architectural criteria for Phase 1 data pipeline validation, **model evaluation on purely synthetic data does not establish real-world production performance**. Real enterprise tickets exhibit noisy transcription, typos, slang, multi-lingual fragments, and conversational noise. Subsequent phases should benchmark against sanitized real-world IT service desk telemetry where available.
