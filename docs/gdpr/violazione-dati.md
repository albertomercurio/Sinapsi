# Procedura in caso di violazione dei dati (data breach)

> **BOZZA** — artt. 33–34 GDPR.

1. **Chi se ne accorge** (terapista, amministratore, fornitore) avvisa subito l'altro ruolo:
   Titolare [contatto] · Responsabile [contatto].
2. **Contenimento (subito):**
   - credenziali compromesse → reimpostare la password, rimuovere e reinserire il fattore 2FA,
     terminare le sessioni (Supabase → Authentication → Users → sign out);
   - chiave/servizio compromesso → ruotare le chiavi API in Supabase, aggiornare Cloudflare e i
     secret di GitHub;
   - dispositivo perso con backup → valutare la robustezza della frase segreta (i file sono cifrati).
3. **Valutazione (entro 24 ore):** quali dati, quanti pazienti, possibilità di re-identificazione
   (ricordare che i dati sono pseudonimi), conseguenze per gli interessati. Consultare il registro
   delle attività (Impostazioni → Registro attività) e i log di Supabase.
4. **Notifica al Garante entro 72 ore** dalla conoscenza, se la violazione presenta un rischio per i
   diritti e le libertà (procedura telematica su www.garanteprivacy.it). Il Titolare notifica; il
   Responsabile fornisce le informazioni tecniche.
5. **Comunicazione agli interessati** se il rischio è elevato (art. 34), con linguaggio semplice.
6. **Documentazione:** registrare ogni violazione (anche non notificata) con fatti, effetti e
   misure adottate.

| Data | Descrizione | Dati/interessati | Rischio | Notificata? | Misure |
|---|---|---|---|---|---|
| | | | | | |
