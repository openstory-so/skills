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

The API is the source of truth. Discover it with `GET https://openstory.so/api/v1`
(instructions, request schema, HAL links) or `GET https://openstory.so/api/v1/openapi.json`.

Auth: use `OPENSTORY_API_KEY` if set, otherwise the skills start a
device-code login and save the key to `~/.config/openstory/credentials`.
