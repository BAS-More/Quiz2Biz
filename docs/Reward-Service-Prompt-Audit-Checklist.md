# REWARD-SERVICE-PROMPT.MD — POST-RECONCILIATION AUDIT CHECKLIST

This checklist is a template for updates to `reward-service-prompt.md` in the Agent MVP repository (search OLD, replace with NEW).
Source of truth: `reward-service-prompt.md` in the Agent MVP repo (this file is guidance only, not canonical).
Status in Agent MVP repo: NOT TRACKED FROM THIS REPO — this checklist is archived guidance only and must not be treated as an open task. For the actual status, refer directly to `reward-service-prompt.md` and its history in the Agent MVP repo.

| # | Field | OLD | NEW |
|---|-------|-----|-----|
| 1 | OWASP | 2025 | 2021 |
| 2 | Coverage | 90% overall | Target 100%, floor 95% |
| 3 | Modules | 26 | 25 |
| 4 | Tables | 20+ | 17 |
| 5 | IaC | Terraform | Bicep |
| 6 | RTO | < 1 hour | < 4 hours |
| 7 | RPO | < 15 minutes | < 1 hour |
| 8 | Score format | 0-100 integer | 0.0-1.0 decimal |
| 9 | Threshold | >=70 | >=0.70 |
| 10 | Min instances | 2 | 3 |
| 11 | Retention | 7 years min | 90-day min (7yr recommended) |
| 12 | Integration modules | 3 | 2 |
| 13 | Events table | reputation_events | scoring_events |
| 14 | INTERNAL tables | 7 coach tables | 3 supervisor tables |
| 15 | Gan Eden | 14-day grace | Immediate revocation |
| 16 | Tier 10 | Check | Luminary (canonical) |
