---
name: no-registry-publishing
description: Do not suggest or do publishing to the public MCP registry / npm
metadata:
  type: feedback
---

Don't propose publishing this project to the MCP registry (or npm). When the user pasted the registry quickstart link, treating it as a publish request was wrong — they reacted with "we don't publish slop to the registry."

**Why:** The user shares links/specs as context to explore, not as task requests. They also consider the current code not registry-quality.

**How to apply:** When the user pastes a URL or spec, treat it as context unless they explicitly say "do X with this." Ask before acting on outward-facing/public actions. Don't resurface registry publishing unless the user explicitly asks.
