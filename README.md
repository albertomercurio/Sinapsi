# Sinapsi

Piattaforma web di **stimolazione e riabilitazione cognitiva** per terapisti (adulti ed età evolutiva):
esercizi generati automaticamente e adattivi, sedute in studio con "modalità paziente", misure
dettagliate (tempi di reazione, durata della pressione, precisione, traiettorie del puntatore) e
grafici dell'andamento nel tempo. Interfaccia in italiano e inglese, pensata per il GDPR.

> Open source (MIT). Le prestazioni registrate confrontano ogni paziente **solo con la propria storia**:
> Sinapsi non fornisce punteggi normativi né valutazioni diagnostiche.

## Funzionalità

- **Pazienti**: codice generato dal database (`PZ-7K3M`) e, se attivati, **nomi cifrati end-to-end**
  nel browser con la frase segreta dello studio (né il server né l'amministratore possono leggerli).
- **6 attività adattive** (generatori: ogni esecuzione è una variante nuova, riproducibile dal seme):
  Go/No-Go, Memory, Caccia al simbolo (cancellazione), Sequenze (span spaziale/cifre), Metti in
  ordine (categorie con cambio di regola), Collega in ordine (tipo Trail Making A/B). Schede
  cartacee stampabili per cancellazione e collegamento.
- **Misurazione**: onset sincronizzato al frame, tempi di reazione, durata della pressione, tipo di
  input, precisione, cinematica del movimento, interruzioni, baseline motoria.
- **Scoring**: d′/c, ex-Gaussiana (μ, σ, τ), IES/RCS/BIS, signed residual time, post-error slowing,
  decremento della vigilanza, Center of Cancellation, best-r, B−A e B/A, credito parziale.
- **Difficoltà adattiva**: rating Glicko con incertezza (stile Math Garden), obiettivo ~75% di
  successo, staircase 3-down/1-up nelle sequenze, blocco della difficoltà da parte del terapista.
- **Andamento**: abilità stimata con intervallo al 95%, trend Theil–Sen + Mann–Kendall con IC
  bootstrap, composito per area, confronto tra due date, calendario, dettaglio prova per prova,
  replay del percorso, relazione stampabile, esportazione CSV.
- **Spiegazioni**: ogni misura e ogni grafico ha un "?" con una spiegazione in parole semplici e un
  collegamento alla **Guida** integrata (metodi spiegati passo per passo, con esempi e bibliografia).
- **Account**: inviti e link per nuova password da copiare e consegnare di persona, senza email, reset della 2FA,
  tutto registrato nel registro attività dello studio.
- **Sicurezza**: 2FA obbligatoria imposta dal database (RLS `aal2`), audit log immutabile, logout
  per inattività, CSP restrittiva, backup cifrati nel browser, admin di piattaforma senza accesso
  ai dati clinici.

## Stack

Vite 8 · Vue 3.5 · TypeScript · Vue Router · Pinia · TanStack Query · vue-i18n 11 · Tailwind CSS 4 ·
Reka UI · ECharts 6 · Supabase (Postgres + Auth + Edge Functions, regione UE, Irlanda) · Vitest ·
Playwright · pgTAP. Hosting statico su Cloudflare.

## Avvio in locale

Requisiti: Node 24 (vedi `.nvmrc`), pnpm 10, Docker Desktop.

1. Node e pnpm (pnpm arriva con corepack, incluso in Node 24):

   ```bash
   nvm install 24
   corepack enable pnpm
   pnpm install
   ```

2. Avvia il database locale (Postgres, Auth, Edge Functions e la casella email di prova Mailpit, in Docker):

   ```bash
   pnpm exec supabase start
   ```

3. Crea `.env.local` copiando `API_URL` e `PUBLISHABLE_KEY` da questo comando (vedi `.env.example`):

   ```bash
   pnpm exec supabase status -o env
   ```

4. Avvia l'app su http://localhost:5173:

   ```bash
   pnpm dev
   ```

Account di prova (solo locale, dati sintetici): `terapista@sinapsi.test` / `Sinapsi-Demo-2026` e
`admin@sinapsi.test` / `Sinapsi-Admin-2026`. Al primo accesso viene richiesta la configurazione
della 2FA. Le email (inviti, reset) arrivano su Mailpit: http://127.0.0.1:54324.

Dati dimostrativi realistici (4 mesi di sedute simulate): `pnpm demo:seed`. La frase segreta dei nomi
dimostrativi è `demo sinapsi studio`.

## Comandi

| Comando | Cosa fa |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm preview` | sviluppo, build (con type check), anteprima con gli header di sicurezza |
| `pnpm typecheck` · `pnpm lint` · `pnpm fix` | controlli statici / correzione automatica |
| `pnpm test` | test unitari (scoring, generatori, misurazione, analisi, backup) |
| `pnpm test:db` | test di sicurezza del database (pgTAP: RLS, 2FA, isolamento tra studi) |
| `pnpm test:e2e` | test end-to-end Playwright sulla build di produzione |
| `pnpm i18n:check` | stesse chiavi in tutte le lingue e messaggi compilabili |
| `pnpm db:types` | rigenera i tipi TypeScript dal database locale |

## Documentazione

- [Architettura](docs/architecture.md) · [Metodi di misura e scoring](docs/scoring-methods.md)
- [Aggiungere un'attività](docs/adding-an-activity.md) · [Aggiungere una lingua](docs/adding-a-language.md)
- [Messa in produzione](docs/deployment.md) (Supabase UE, Cloudflare, GitHub, checklist)
- [Manutenzione](docs/maintenance.md) (aggiornamenti, account, backup, incidenti)
- [GDPR: modelli e checklist](docs/gdpr/README.md)

## Licenza

MIT — vedi [LICENSE](LICENSE).
