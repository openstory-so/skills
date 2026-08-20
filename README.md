# OpenStory skills

Agent skills for [OpenStory](https://openstory.so) — create a multi-scene AI
video from a script via the public HTTP API.

```bash
npx skills add openstory-so/skills
```

The API is the source of truth. Discover it with `GET https://openstory.so/api/v1`
(instructions, request schema, HAL links) or `GET https://openstory.so/api/v1/openapi.json`.

Set `OPENSTORY_API_KEY` (Settings → Developer) before the skill can create anything.
