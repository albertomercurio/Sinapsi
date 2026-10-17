# Adding a language

1. Add the locale to `SUPPORTED_LOCALES` in `src/app/i18n/locales.ts` (code, label, Intl locale).
2. Next to every `it.json` in a `locales/` folder, add `<code>.json` with the same keys:
   `pnpm i18n:check` lists every missing file/key and messages that do not compile.
3. Add `src/content/<code>/words.json` (words for every stimulus id, category names, attributes).
4. Update the e-mail templates in `supabase/templates/` if they should be bilingual.

vue-i18n syntax reminders: `{name}` is a placeholder, `|` separates plural forms, and `@` starts a
linked message — write a literal at-sign as `{'@'}`.

Interface language (per therapist) and exercise language (per patient, `content_locale`) are
independent.
