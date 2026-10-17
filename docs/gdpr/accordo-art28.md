# Accordo per il trattamento dei dati personali (art. 28 GDPR)

> **BOZZA da far verificare a un DPO o a un legale.** I campi tra parentesi quadre vanno compilati.

**Tra**

- **[Nome dello studio / del professionista]**, con sede in [indirizzo], C.F./P.IVA [ … ],
  in persona di [nome], di seguito il **Titolare**;

**e**

- **[Nome e cognome dell'amministratore della piattaforma]**, residente in [ … ], C.F. [ … ],
  di seguito il **Responsabile**.

## 1. Oggetto

Il Responsabile mette a disposizione del Titolare la piattaforma **Sinapsi** (software di
stimolazione cognitiva) e ne cura l'amministrazione tecnica (account dei fornitori cloud,
aggiornamenti, inviti degli utenti, monitoraggio, backup tecnici). Nel farlo tratta dati personali
per conto del Titolare, esclusivamente secondo le sue istruzioni documentate.

## 2. Natura, finalità e durata

| | |
|---|---|
| Finalità | Erogazione di esercizi di stimolazione/riabilitazione cognitiva e monitoraggio dell'andamento dei pazienti del Titolare |
| Interessati | Pazienti del Titolare (adulti e minori); professionisti dello studio (utenti) |
| Categorie di dati | Pazienti: codice pseudonimo, anno di nascita, sesso, scolarità, lateralità, categorie cliniche, note del terapista, sedute, risultati e registrazioni dettagliate degli esercizi (**dati relativi alla salute, art. 9**). Utenti: email, nome visualizzato, fattori di autenticazione, registro delle attività |
| Durata | Per tutta la durata dell'uso della piattaforma; alla cessazione si applica l'art. 9 |

## 3. Obblighi del Responsabile

Il Responsabile:

a. tratta i dati solo su istruzione documentata del Titolare (il presente accordo e l'uso delle
   funzioni della piattaforma costituiscono istruzioni);
b. garantisce la riservatezza: si impegna a **non consultare i dati clinici** se non quando
   strettamente necessario per assistenza tecnica richiesta dal Titolare, e ne tiene traccia;
c. adotta le misure di sicurezza dell'Allegato A (art. 32);
d. ricorre ai sub-responsabili elencati nell'Allegato B, con autorizzazione generale del Titolare;
   informa il Titolare con almeno 30 giorni di anticipo di ogni modifica, consentendogli di opporsi;
e. assiste il Titolare nel rispondere alle richieste degli interessati (artt. 15–22) e negli
   adempimenti degli artt. 32–36 (sicurezza, data breach, DPIA);
f. notifica al Titolare ogni violazione dei dati personali **senza ingiustificato ritardo e
   comunque entro 24 ore** dalla scoperta, con le informazioni dell'art. 33.3;
g. mette a disposizione le informazioni necessarie a dimostrare il rispetto dell'art. 28 e
   consente verifiche ragionevoli;
h. tiene il registro dei trattamenti svolti per conto del Titolare (art. 30.2).

## 4. Obblighi del Titolare

Il Titolare:

a. fornisce ai pazienti (o ai genitori/tutori) l'informativa e, ove necessario, raccoglie il
   consenso — obbligo richiesto anche dal DPA di Supabase per i dati sensibili;
b. non inserisce in Sinapsi nomi, codici fiscali, recapiti o altri dati identificativi diretti, e
   conserva la corrispondenza codice ↔ paziente al di fuori della piattaforma;
c. mantiene attiva l'autenticazione a due fattori e custodisce credenziali e frase segreta dei backup;
d. esegue periodicamente i backup cifrati messi a disposizione dalla piattaforma.

## 5–8. Trasferimenti, sub-responsabili, diritti, sicurezza

I dati sono ospitati nell'Unione Europea (Francoforte). Eventuali accessi da paesi terzi da parte
dei sub-responsabili sono disciplinati dalle Clausole Contrattuali Tipo della Commissione
(Decisione 2021/914) e/o dall'EU-US Data Privacy Framework, come indicato nell'Allegato B.

## 9. Cessazione

Alla cessazione, il Responsabile, a scelta del Titolare, restituisce i dati (backup cifrato ed
esportazioni) e li cancella, salvo obblighi di legge, entro [30] giorni, dandone conferma scritta.
I backup tecnici residui vengono distrutti entro [90] giorni.

## Allegato A — Misure di sicurezza

Vedi `docs/gdpr/README.md` § *Misure già incluse* e `docs/architecture.md` § *Security model*.
In aggiunta il Responsabile: usa 2FA su tutti gli account dei fornitori; conserva i backup tecnici
cifrati (`scripts/admin-backup.sh`) solo su dispositivi cifrati; non esegue backup dei dati tramite
servizi di CI; applica gli aggiornamenti di sicurezza.

## Allegato B — Sub-responsabili

Vedi [sub-responsabili.md](sub-responsabili.md).

Luogo e data ______________________

Il Titolare ______________________  Il Responsabile ______________________
