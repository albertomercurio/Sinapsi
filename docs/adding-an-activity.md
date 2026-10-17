# Adding an activity

An activity is a folder in `src/activities/<id>/`. The registry discovers it automatically.

```
src/activities/my-task/
  index.ts        defineActivity({...}) — the manifest
  logic.ts        configSchema, LEVELS, configFor, generate, score (pure, unit tested)
  Player.vue      the patient-facing UI
  Print.vue       optional printable worksheet
  locales/it.json, en.json   name, description, instructions, instructionsKids, UI strings
  my-task.test.ts
```

## 1. Configuration and levels (`logic.ts`)

- `configSchema` (zod) describes every parameter.
- Five anchor `LEVELS`; `configFor(difficulty, ageGroup)` interpolates them with
  `interpolateLevels(levels, d, integerKeys, discreteKeys)` and adapts for children/seniors.
- `generate(rng, config, …)` must be **pure**: use only the provided seeded `rng`, so the same
  seed always produces the same exercise.

## 2. Scoring

`score(instance, recording, { config, baselineRt })` returns:

- `metrics`: flat numbers (use the helpers in `@/modules/scoring`);
- `score` 0–100 for therapists;
- `performance` 0–1 for the ability engine — **calibrated so that a patient performing at the
  level's expected standard gets ≈ 0.75** (the adaptive target). Put calibration constants in a
  clearly marked block;
- optionally `items: { difficulty, outcome }[]` for item-level ability updates (see span-sequence);
- optional `flags` (e.g. `incomplete`).

Describe the metrics in the manifest (`unit`, `polarity` +1/−1/0, `primary`). When a key is new:

- add its label to `metrics.*` and a plain-language explanation to `metricsHelp.*` in
  `src/locales/*.json` (shown by the "?" next to the measure; write for a reader with no statistics
  background);
- map it to a section of the in-app guide in `src/modules/guide/sections.ts`, and extend that section
  in `src/modules/guide/content/*.ts` if the measure is not explained there yet. A unit test fails
  if a metric has no guide section.

Bump `scoringVersion` whenever the formula changes.

## 3. Player

Props: `instance`, `config`, `recorder` (`TrialRecorder`), `ageGroup`, `kids`, `paused`.
Emit `done` when finished. Use:

- `usePausableClock(toRef(props, 'paused')).wait(ms)` for every timed step (pause works for free);
- `recorder.beginTrial(stimulus)`, `await recorder.markOnset(trial)` right after showing a stimulus,
  `recorder.pointerDown(trial, event, { target, targetEl })` / `keyDown`, `recorder.endTrial(trial, {correct})`;
- the patient CSS tokens (`var(--tile)`, `var(--good)`, …), large targets (≥ 48 px), no colour-only cues.

## 4. Tests

At least: deterministic generation, level monotonicity, and scoring on simulated recordings that
distinguishes good from poor performance. Then run `pnpm test`, `pnpm i18n:check`, and try the
activity from **Attività → Prova**.
