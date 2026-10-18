# GDPR — modelli e checklist

> **BOZZE.** Questi documenti sono modelli di partenza, scritti per l'uso di Sinapsi da parte di
> professionisti sanitari in Italia. Non sono consulenza legale: falli rivedere da un DPO o da un
> avvocato esperto di protezione dei dati prima di trattare dati reali.

## Ruoli

| Soggetto | Ruolo GDPR |
|---|---|
| Lo studio / il professionista che usa Sinapsi con i propri pazienti | **Titolare del trattamento** (art. 4.7) |
| L'amministratore della piattaforma (gestisce gli account Supabase, Cloudflare, GitHub) | **Responsabile del trattamento** (art. 28) |
| Supabase (database e autenticazione, Irlanda), Cloudflare (file statici), Brevo (email di invito/reset, solo se attivate) | **Sub-responsabili** dell'amministratore |

Ogni studio che usa la piattaforma è un titolare distinto: serve un accordo art. 28 per ciascuno.

## Documenti

| File | A cosa serve | Chi lo compila |
|---|---|---|
| [accordo-art28.md](accordo-art28.md) | Accordo titolare ↔ responsabile | Titolare + amministratore, firmato da entrambi |
| [registro-trattamenti.md](registro-trattamenti.md) | Registro delle attività di trattamento (art. 30) | Titolare (e sezione del responsabile) |
| [informativa-pazienti.md](informativa-pazienti.md) | Informativa per pazienti adulti e per i genitori dei minori (art. 13) | Titolare |
| [dpia.md](dpia.md) | Valutazione d'impatto (art. 35) | Titolare, con il DPO |
| [sub-responsabili.md](sub-responsabili.md) | Elenco dei sub-responsabili e nota sui trasferimenti | Amministratore |
| [violazione-dati.md](violazione-dati.md) | Procedura in caso di data breach (artt. 33–34) | Titolare + amministratore |
| [conservazione.md](conservazione.md) | Politica di conservazione dei dati | Titolare |

## Misure già incluse nella piattaforma

- Pseudonimizzazione e cifratura end-to-end: nessun codice fiscale o data di nascita; codice paziente
  generato dal sistema; **nome e cognome (facoltativi) sono cifrati nel browser** con una chiave
  ricavata dalla frase segreta dello studio, che non lascia mai i dispositivi dei terapisti. Il
  database, Supabase e l'amministratore vedono solo testo cifrato.
- Minimizzazione: solo anno di nascita, sesso, scolarità, lateralità, categorie cliniche.
- Dati ospitati nell'UE (Irlanda), cifrati in transito (TLS) e a riposo.
- Autenticazione a due fattori obbligatoria, imposta dal database; disconnessione per inattività.
- Controllo degli accessi per studio (Row Level Security); l'amministratore della piattaforma non
  ha accesso applicativo ai dati clinici.
- Registro delle attività immutabile (creazioni, modifiche, eliminazioni, esportazioni, backup).
- Diritti degli interessati: esportazione JSON completa del paziente, cancellazione definitiva.
- Operazioni dell'amministratore sugli account (link di attivazione o per nuova password, reset della
  2FA) registrate nel registro attività dello studio, visibile al titolare.
- Conservazione: registrazioni dettagliate cancellate automaticamente dopo il periodo impostato.
- Backup automatici quotidiani cifrati (chiave privata conservata offline dal responsabile) e copie
  cifrate del titolare con una frase segreta nota solo a lui.
- Nessun tracciamento, nessun servizio di analisi o terze parti nel browser.

## Checklist prima di inserire dati reali

- [ ] Accordo art. 28 firmato.
- [ ] Registro dei trattamenti aggiornato.
- [ ] DPIA svolta (vedi motivazione in `dpia.md`).
- [ ] Informativa consegnata (e, se necessario, consenso raccolto) a ogni paziente o genitore.
- [ ] 2FA attiva su tutti gli account (Sinapsi, Supabase, Cloudflare, GitHub e Brevo se usato).
- [ ] Procedura di data breach condivisa tra titolare e responsabile.
- [ ] Primo backup cifrato eseguito e conservato su supporto sicuro.

## Nota sui dispositivi medici (MDR)

Software con finalità riabilitative può rientrare nel Regolamento (UE) 2017/745. L'uso interno da
parte del professionista che lo ha in carico è a basso rischio; **fornire la piattaforma ad altri
professionisti** può configurare l'immissione sul mercato di un dispositivo medico. Prima di farlo,
chiedi un parere regolatorio. Sinapsi è progettato per restare descrittivo: nessun punteggio
normativo, nessuna diagnosi, nessuna raccomandazione clinica automatica.
