# Politica di conservazione dei dati

> **BOZZA** — i tempi vanno stabiliti dal Titolare (per la documentazione sanitaria di studi
> privati si fa spesso riferimento a 10 anni, da verificare con il DPO e l'ordine professionale).

| Dato | Dove | Conservazione | Come avviene la cancellazione |
|---|---|---|---|
| Profilo del paziente (codice, dati essenziali, condizioni, note) | Sinapsi | Durata del percorso + [10] anni | Eliminazione definitiva dalla scheda Privacy del paziente |
| Sedute e misure riassuntive dei risultati | Sinapsi | Come il profilo | Cancellate insieme al paziente |
| Registrazioni dettagliate degli esercizi (tempi di ogni tocco, movimenti) | Sinapsi | **[24] mesi** (impostazione dello studio) | Automatica, ogni notte (pg_cron); il terapista può "conservare senza scadenza" singole esecuzioni |
| Registro delle attività (audit) | Sinapsi | Durata del servizio | Con la chiusura dello studio |
| Account dei professionisti | Supabase Auth | Fino alla rimozione dallo studio/servizio | Rimozione da parte dell'amministratore |
| Backup cifrati dello studio | Dispositivi del Titolare | Ruotare: ultimi [8] settimanali + [12] mensili | Cancellazione sicura dei file |
| Backup tecnici dell'amministratore | Dispositivo cifrato dell'amministratore | Ultimi [4] | Cancellazione sicura |
| Corrispondenza codice ↔ nome | Cartella clinica del Titolare (fuori da Sinapsi) | Come la cartella clinica | Secondo le regole dello studio |

Alla richiesta di cancellazione di un paziente (art. 17), usare **Elimina definitivamente**: il
registro delle attività conserva solo il codice e la data dell'eliminazione.
