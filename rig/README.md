---
isolation: true
---
## Launch
Run ./launch to start node app.mjs in the worktree.
## Doctor
Run ./doctor to check /health.
## Drive
POST to /checkout using curl from the user-facing checkout flow.
## Evidence
Write action, state, and transaction side effects to $EVIDENCE_DIR/checkout.json.
## Cleanup
Run ./cleanup to stop only the launched process.
