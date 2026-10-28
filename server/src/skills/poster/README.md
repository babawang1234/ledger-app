# Poster Design Skills

These are application-side design skills: versionable instructions plus code checks executed by the generation service. They are not Codex/WorkBuddy plugins and do not add an image model by themselves.

## Skills included

1. **Reference Style Analysis** (`referenceAnalysis`): asks the configured vision model to report palette, composition, typography mood, whitespace, and decoration as structured JSON; explicitly prohibits copying the reference's text, logo, identity, or distinctive layout.
2. **Art Direction** (`artDirection`): steers image generation toward photographic or richly rendered subjects with real materials, lighting, and depth; prohibits flat color placeholders, fake lettering, logos, and watermarks.
3. **Poster Layout** (`layout`): preserves exact user copy, separates type from the background image, defines hierarchy and safe area, and requires visibly different composition among variants.
4. **Preflight Critique** (`preflight`): provides model-side checks for subject quality, copy, contrast, overlap, margins, and accidental lettering. `validatePosterBrief()` also performs deterministic server checks for missing title/dimensions and overlong headlines.

## Execution path

`POST /api/generate/:taskId/run` loads these skills through `services/generation.js`. Reference analysis injects `referenceAnalysis` as the vision-system instruction. Image-generation tasks receive `makeArtPrompt()` (Art Direction + Layout + Preflight + the user's actual brief/reference/style). Deterministic validation runs before a poster-render task. Fonts and copy remain separate canvas layers so corrections and exports retain editable text.

## Providers

- DeepSeek V4 Pro: text generation. It is not an image-generation model.
- DeepSeek Flash: reference-image analysis when enabled/configured.
- OpenAI GPT Image 1: optional high-quality image generation/editing through the OpenAI API. Set `OPENAI_API_KEY`; an account/API key is billed separately from ChatGPT subscriptions.
- Unsplash: optional search for actual photographic backgrounds. Set `UNSPLASH_ACCESS_KEY` on the server. The app hotlinks the API-returned photo URL, links the photographer and Unsplash, triggers the required download event on selection, and only fetches the photo transiently for rendering. It does not copy the original photo to local storage.
- Stock-photo renderer: deterministic composition with a selected Unsplash photo; no image-generation API call. It is the default route when a stock photo is selected and the user has not manually chosen a model.

If no keys are configured, search and paid model calls are unavailable; the UI reports that state rather than claiming to have returned real results.
