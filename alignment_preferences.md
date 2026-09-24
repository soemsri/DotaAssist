# Design Alignment Summary

Date: 2026-09-24T10:59:13.393485

Implemented all three choices:

- Core scanning with guided onboarding.
- Uncertain scans suppress missing-enemy alerts and show recalibration guidance.
- Saved monitor/rectangle calibration with preview confirmation and display-change revalidation.

Updated native capture, setup UI, HUD status, documentation, and regression tests.

Frontend build, TypeScript checks, existing tests, new scanner tests, and Rust tests passed. Windows capture and in-game confidence accuracy still require on-device validation.
## Late-game teamfight coaching — 2026-09-24

Implemented role/hero-based plans from 30:00, persisted per-role duty overrides (initiate/follow/protect/counter), conditional targets and engage/retreat guidance, inventory-aware situational items, buyback context, explicitly estimated enemy ultimate timers, and Thai/English dashboard/HUD presentation. Speech is limited to semantic duty/readiness changes with a 120-second throttle and independent cancellation. No engage decision is inferred from minimap scanning or hidden enemy state.
