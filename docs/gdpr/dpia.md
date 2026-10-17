# Valutazione d'impatto sulla protezione dei dati (DPIA, art. 35)

> **BOZZA precompilata.** La DPIA spetta al Titolare (con il DPO, se nominato). Il Garante include
> tra i trattamenti da valutare quelli su dati sanitari di soggetti vulnerabili (pazienti, minori)
> effettuati con tecnologie innovative: la DPIA è quindi **fortemente raccomandata**.

## 1. Descrizione del trattamento

- **Contesto:** esercizi di stimolazione cognitiva svolti in studio (e in futuro a domicilio) su un
  computer/tablet; il terapista pianifica le sedute e consulta l'andamento.
- **Dati:** vedi registro dei trattamenti. Nessun identificativo diretto; codici pseudonimi.
- **Flussi:** browser → Supabase (Francoforte). File statici serviti da Cloudflare (nessun dato
  sanitario). Email di invito/reset tramite Brevo (solo indirizzo email e link).
- **Tecnologie:** applicazione web, database Postgres con controllo accessi a livello di riga,
  autenticazione con secondo fattore, algoritmi di adattamento della difficoltà (non decisionali).

## 2. Necessità e proporzionalità

- Minimizzazione: solo dati utili alla scelta degli esercizi e al monitoraggio.
- Pseudonimizzazione strutturale (lo schema del database non ha campi per nome/DOB).
- Conservazione limitata delle registrazioni dettagliate; cancellazione su richiesta.
- Diritti: esportazione e cancellazione disponibili dall'interfaccia.
- Nessuna decisione automatizzata con effetti giuridici o clinici (art. 22): la difficoltà adattiva
  è un ausilio all'esercizio; ogni decisione clinica resta del professionista.

## 3. Rischi e misure

| Rischio | Probabilità / gravità (prima) | Misure | Rischio residuo |
|---|---|---|---|
| Accesso non autorizzato da credenziali rubate | Media / alta | 2FA obbligatoria imposta dal database; password ≥ 12 caratteri; logout per inattività | Basso |
| Accesso di un utente ai pazienti di un altro studio | Bassa / alta | RLS per studio, test automatici (pgTAP) | Molto basso |
| Re-identificazione dei pazienti | Bassa / alta | Codici generati; nessun dato diretto; avvisi sui campi note | Basso |
| Accesso del fornitore tecnico/amministratore ai dati | Bassa / media | Nessun accesso applicativo per l'admin; accordo art. 28; riservatezza; audit | Basso |
| Accesso di autorità di paesi terzi tramite fornitori statunitensi | Bassa / media | Dati nell'UE, SCC/DPF, pseudonimizzazione, cifratura | Basso |
| Perdita di dati (assenza di backup automatici nel piano gratuito) | Media / media | Backup cifrati periodici con promemoria; backup tecnici dell'amministratore | Basso |
| Paziente che esce dalla modalità esercizi e vede altri dati | Media / media | Modalità paziente bloccata con PIN, logout per inattività | Basso |
| Esposizione nel browser (script di terze parti) | Bassa / alta | Nessuna terza parte, CSP restrittiva | Molto basso |

## 4. Esito

[Da completare dal Titolare/DPO: accettazione del rischio residuo, eventuale consultazione
preventiva (art. 36) se il rischio residuo restasse elevato, data di revisione.]
