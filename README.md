# OpenStory skills

Agent skills for [OpenStory](https://openstory.so) — mint a library
style from refs (`create-style`) and turn a script into a multi-scene AI
video (`create-sequence`). Claude Code also plays a local cut (`stitch`).

```bash
npx skills add openstory-so/skills
```

That copies `create-style` and `create-sequence`. It does not connect MCP
and it does not install `stitch`.

## Directory installs

These are the one-click listings. Each one connects
`https://openstory.so/mcp` (Streamable HTTP, OAuth). Sign in when the
client asks. That grant is separate from an API key.

| Agent | Install |
| --- | --- |
| ChatGPT and Codex | The public plugin directory, once the listing is approved. Package root is `plugin.json` plus `mcp.json`. |
| Claude | [claude.ai/directory](https://claude.ai/directory) after submission, or the commands below. |
| Grok | The xAI plugin marketplace, or the commands below. |
| Gemini CLI | `gemini extensions install https://github.com/openstory-so/skills` after the repo is tagged and carries the `gemini-cli-extension` topic. |

`stitch` needs a local machine, so it lives in `cli-skills/`, not `skills/`.
Claude Code adds that directory from its manifest. Gemini CLI reaches it
through `GEMINI.md`. A Grok install that reads the root `plugin.json` only
scans `skills/`. Install that skill with `npx @openstory/stitch skill`.

## Command-line installs

Grok:

```bash
grok plugin marketplace add openstory-so/skills
grok plugin install openstory --trust
```

Claude Code:

```
/plugin marketplace add openstory-so/skills
/plugin install openstory@openstory
```

Codex:

```bash
codex plugin marketplace add openstory-so/skills
codex plugin add openstory@openstory
```

ChatGPT can still install this repo as a GitHub marketplace. That path is
desktop-only. The public directory listing is what runs on chatgpt.com.

The HTTP API remains the source of truth for the skills when MCP tools
are not connected. Discover it with `GET https://openstory.so/api/v1`
(instructions, request schema, HAL links) or `GET https://openstory.so/api/v1/openapi.json`.

Auth for those HTTP calls: use `OPENSTORY_API_KEY` if set, otherwise the
skills start a device-code login and save the key to
`~/.config/openstory/credentials`.
