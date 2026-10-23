# OpenStory skills

## Versioning

GitHub `main` is the release. Clients see an update only when the version changes, so every PR bumps the version.

- Semver: patch for copy, assets, and fixes; minor for a new skill or capability; major for a breaking change to a skill or the MCP connection.
- Set the same version in all five manifests: `plugin.json`, `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, `.grok-plugin/plugin.json`, `gemini-extension.json`.
- Rewrite `publication.release_notes` in `plugin.json` to describe this version.
- When another PR merges first with the same version, rebase and bump again.
