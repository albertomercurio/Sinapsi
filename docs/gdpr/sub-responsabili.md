# Sub-responsabili e trasferimenti

> **BOZZA** — verifica periodicamente gli elenchi ufficiali dei fornitori.

| Fornitore | Servizio | Dati trattati | Ubicazione | Garanzie |
|---|---|---|---|---|
| **Supabase** (Supabase Pte. Ltd., Singapore; Supabase Inc., USA) | Database Postgres, autenticazione, Edge Functions | Tutti i dati della piattaforma (pseudonimi, inclusi dati sanitari), account utenti | AWS eu-west-1, **Irlanda (IE)** | DPA Supabase (parte dei Termini), SCC 2021/914 moduli 2/3; elenco sub-responsabili su supabase.com/legal |
| **Cloudflare** (Cloudflare Inc., USA) | Hosting dei file statici dell'applicazione | Indirizzi IP e richieste dei file dell'app (nessun dato sanitario) | Rete globale | DPA Cloudflare (Self-Serve Subscription Agreement), EU-US DPF, SCC |
| **Brevo** (Sendinblue SAS, Francia) — solo se si attivano le email automatiche (facoltativo: gli inviti possono essere consegnati con un link) | Invio email di invito e reimpostazione password | Indirizzo email degli utenti professionisti, link monouso | UE | DPA Brevo, società UE |
| **GitHub** (GitHub Inc., USA) | Codice sorgente e automazioni (keep-alive) | **Nessun dato personale dei pazienti** (il keep-alive chiama una funzione che non legge dati) | USA | — |

## Nota sui trasferimenti (TIA sintetica)

- I dati clinici sono conservati nell'UE. Supabase dichiara che i dati sono "stored and primarily
  processed" nella regione scelta; il supporto può avvenire da altri paesi, con SCC.
- Le società capogruppo statunitensi sono soggette a normative come il CLOUD Act. Il rischio è
  mitigato da: pseudonimizzazione (nessun identificativo diretto, chiave di corrispondenza presso
  il titolare), cifratura in transito e a riposo, minimizzazione, limitazione della conservazione.
- Valutazione: rischio residuo basso per la natura pseudonima dei dati. [Da confermare dal DPO.]
- Alternativa futura per eliminare fornitori statunitensi: Supabase self-hosted su infrastruttura UE
  (stesse API, nessuna modifica all'applicazione).
