# Machine Learning Anomaly Detection Evaluation

**Model:** Unsupervised Isolation Forest (`sklearn.ensemble.IsolationForest`)  
**Input:** 14-Dimensional Telemetry Feature Vector  
**Contamination Rate:** $0.10$  
**Estimators:** 100 Isolation Trees  

---

## 1. Evaluation Methodology

Because commercial transit fraud data lacks verified ground-truth labels in cold-start environments, we evaluate the unsupervised model on:
1. **Separation & Sensitivity:** Clear separation between normal compliant transit trajectories and acute anomalies (e.g. $>120$ km/h average velocity or circular route deviations).
2. **Stability Across Retraining:** Consistency of decision path depth across random seeds.
3. **Score Calibration:** Linear min-max scaling of raw anomaly decision scores to the $[0, 100]$ index.

---

## 2. Telemetry Feature Importance

| Feature Name | Type | Description |
|---|---|---|
| `max_speed_kmh` | Continuous | Maximum point-to-point velocity between toll sensors |
| `avg_speed_kmh` | Continuous | Average route velocity across all toll intervals |
| `route_bearing_variance` | Continuous | Angular deviation between claimed EWB bearing and observed FASTag transit |
| `total_ass_amt` | Monetary | Total invoice valuation on active E-Way Bills |
| `night_transit_ratio` | Continuous | Percentage of toll crossings between 22:00 and 06:00 |
| `total_distance_km` | Distance | Total road distance traveled |
| `toll_crossing_count` | Discrete | Total RFID toll sensor recordings |
