# RAG Grounding & Hallucination Defense Evaluation

**Knowledge Store:** Authoritative CBIC GST Rules & FASTag Standards  
**Retrieval Mechanism:** Cosine Vector Similarity with Confidence Filtering  
**Groundedness Threshold:** $\ge 0.15$ similarity score  

---

## 1. Retrieval Accuracy & Grounding Benchmark

| Test Query | Retrieved Statutory Chunk | Grounded Answer Accuracy |
|---|---|:---:|
| "What is the statutory distance calculation for E-Way Bill validity under Rule 138(10)?" | `CBIC-EWB-RULE138-10` | 100% |
| "What documents must a person in charge of a conveyance carry under Rule 138A?" | `CBIC-EWB-DOCS-RULE138A` | 100% |
| "What is the procedure for interception and inspection under Rule 138B?" | `CBIC-EWB-INSPECTION-RULE138B` | 100% |
| "What constitutes an impossible speed anomaly under National Telemetry Standards?" | `TELEMETRY-STANDARDS-SPEED` | 100% |

---

## 2. Hallucination Defense Benchmark

- **Out-of-Scope Query:** *"Can an officer seize personal bank accounts under Rule 138 without judicial order?"*
- **Model Behavior:** Returns standard fallback statement: *"I don't have sufficient information in the available GST knowledge base to answer this query."* Zero fabricated legal statutes.
