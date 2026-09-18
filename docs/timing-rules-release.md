# Timing rules release review

Gameplay timings are bundled in `src/data/timingRules.ts`. The current bundle retains the project's existing 7.41e values; this change does not claim a new audit against the latest live patch. The UI's supported-patch label identifies that bundle, not an automatically detected game patch.

A timing change ships with an app release. There is no remote rules downloader or player-editable interval override.

Before releasing changed rules:

1. Review Valve's patch notes and verify affected objective behavior in the game. Record source links, review date, and affected rules in the release notes.
2. Update the supported patch and relevant values in `timingRules.ts`. Review associated display text and voice lead times if they are affected.
3. Update and run boundary fixtures in `tests/alert_profiles.test.ts`, plus the existing timing tests. Cover exact spawns, just-after-spawn transitions, pregame, Tormentor respawns, Aegis expiry, and both Roshan window boundaries. Tests encode expected behavior; passing them alone does not verify patch-note accuracy.
4. Have a reviewer check the changes and evidence. Update app versions/release notes, then build the Windows installer through the existing workflow.
5. Smoke-test the reviewed rules with live GSI on Windows before distribution, including pause/reconnect, manual objective tracking, profile changes, and muted objectives.

`npm test` includes the bundled-rules and role-profile checks, so the Windows build workflow runs them before producing an installer. Reviewing and publishing a release remain explicit maintainer steps.

# Alert profiles

The initial profile is Support to preserve all existing reminders. The last confirmed selection and each edited preset persist locally. An objective toggle controls its visual reminder and any existing automated audio/voice; master audio settings still apply. Lotus remains visual-only. Roshan and Aegis share one toggle. Manual tracking state continues even when reminders are disabled.

| Preset | Initially disabled reminders |
| --- | --- |
| Carry | Wisdom, power/water |
| Mid | Wisdom, lotus |
| Offlane | Power/water |
| Support | None |

These are editable starting points, not claims about optimal play. Settings can edit inactive presets without activating them and reset each preset individually. Changing a profile does not replay reminders already processed for the current objective occurrence.

Hero suggestions use bundled broad role tags: Support first, then Durable + Initiator for Offlane, then non-agility Carry + Nuker for Mid, then Carry. Unknown or unclassified heroes produce no suggestion. The explanation is shown with each suggestion; tags cannot determine the player's actual lane. Confirm the proposed role, choose another, or keep the current profile. A different hero or match can produce a new suggestion. A temporary loss of GSI does not switch the profile. Suggestions are deduplicated for a hero/match during the app session; confirmed profile preferences persist across restarts.
