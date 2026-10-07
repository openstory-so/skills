# OpenStory skills

Agent skills for [OpenStory](https://openstory.so) — mint a library
style from refs (`create-style`), turn a script into a multi-scene AI
video (`create-sequence`), and stitch the resulting clips into one MP4
with an optional music bed (`stitch`).

```bash
npx skills add openstory-so/skills
```

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

ChatGPT desktop app:

1. Open **Plugins** and choose **Add a marketplace**. This control is in the desktop app, not on chatgpt.com in a browser.
2. Enter `openstory-so/skills`.
3. Install **OpenStory**.

That install includes `create-style`, `create-sequence`, and `stitch`. Because the plugin also ships the MCP server, ChatGPT marks it **Desktop only**: the skills run in the desktop app, not in the browser. Sign in to OpenStory when the app asks.

Installing the plugin also connects the hosted MCP server at
`https://openstory.so/mcp` (Streamable HTTP). Sign in when the client
asks; that OAuth grant is separate from an API key. `POST /mcp` returns
`401` with `WWW-Authenticate` pointing at the protected-resource
metadata, which is how Claude Code, Codex, and Grok find the authorization
server.

The HTTP API remains the source of truth for the skills when MCP tools
are not connected. Discover it with `GET https://openstory.so/api/v1`
(instructions, request schema, HAL links) or `GET https://openstory.so/api/v1/openapi.json`.

Auth for those HTTP calls: use `OPENSTORY_API_KEY` if set, otherwise the
skills start a device-code login and save the key to
`~/.config/openstory/credentials`.
