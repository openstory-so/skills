# OpenStory skills

Agent skills for [OpenStory](https://openstory.so) — mint a library
style from refs (`create-style`), turn a script into a multi-scene AI
video (`create-sequence`), and play a cut from clips, stills, and a
music bed (`stitch`).

```bash
npx skills add openstory-so/skills
```

That copies the skill files. It does not connect the MCP server.

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

`stitch` ships with the other skills. When the files are on disk and a shell is available, it runs `npx @openstory/stitch@latest`. With no shell, or when the files are only links, it calls `openstory.create_stitch` and returns a page anyone can open.

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
