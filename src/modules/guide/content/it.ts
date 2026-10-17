import type { GuideContent } from './types'

const it: GuideContent = {
  title: 'Guida: come leggere misure e grafici',
  intro:
    'Questa guida spiega, senza dare nulla per scontato, che cosa misura Sinapsi, come vengono calcolati i numeri e come leggere i grafici. Ogni «?» accanto a una misura porta qui, alla sezione giusta. In fondo a ogni sezione trovi i riferimenti scientifici per approfondire.',
  sections: [
    {
      id: 'reading',
      title: 'Come leggere i risultati',
      blocks: [
        {
          p: 'Ogni volta che un paziente svolge un esercizio, Sinapsi registra che cosa è successo prova per prova: quando è comparso lo stimolo, quando e dove il paziente ha toccato lo schermo o cliccato, per quanto tempo ha tenuto premuto, come si è mosso il mouse. Da queste registrazioni calcola delle misure (per esempio quante risposte giuste, quanto velocemente).',
        },
        {
          p: 'Il punto più importante: ogni paziente viene confrontato solo con sé stesso. Sinapsi non confronta il paziente con «la popolazione» e non dice se un valore è «normale» o «patologico». Risponde a domande come: «rispetto a un mese fa, è più veloce?», «sbaglia meno?», «riesce ad affrontare esercizi più difficili?».',
        },
        { h: 'Dove trovare cosa' },
        {
          list: [
            'Scheda Panoramica del paziente: il livello raggiunto in ogni attività e un piccolo grafico della sua evoluzione.',
            "Scheda Andamento: i grafici nel tempo, per area cognitiva e per singola attività, con l'elenco di tutte le esecuzioni.",
            "Dettaglio di un'esecuzione (clic su un punto o su una riga): tutte le misure di quella volta, i tempi prova per prova e, per alcuni esercizi, la riproduzione del percorso.",
            'Relazione: una pagina stampabile (o da salvare in PDF) con il riepilogo del periodo scelto.',
          ],
        },
        {
          example:
            "Esempio: nella scheda Andamento vedi che l'abilità nel «Semaforo» è passata da L2,1 a L3,0 in due mesi e che il tempo di reazione mediano è «In miglioramento». Significa che il paziente riesce ora a fare bene una versione più difficile dell'esercizio, e che risponde più rapidamente di prima.",
        },
      ],
    },
    {
      id: 'score',
      title: 'Punteggio e prestazione',
      blocks: [
        {
          p: "Il punteggio (da 0 a 100) riassume in un numero come è andata un'esecuzione. Ogni attività lo calcola a modo suo, ma sempre combinando due cose: quante risposte giuste e quanto velocemente. Una risposta giusta e rapida vale più di una giusta ma lentissima; una risposta sbagliata data di fretta «costa» più di una sbagliata data con calma.",
        },
        {
          p: "La prestazione è lo stesso concetto espresso da 0 a 1, ed è tarata in modo che 0,75 significhi «l'esercizio era alla difficoltà giusta per questo paziente». È il numero che il sistema usa per decidere il livello della volta successiva (vedi «Abilità stimata e difficoltà adattiva»).",
        },
        { h: 'Perché il punteggio da solo non basta' },
        {
          p: "Siccome la difficoltà si adatta al paziente, quando il paziente migliora gli esercizi diventano più difficili e il punteggio tende a restare simile. Per vedere i progressi bisogna quindi guardare l'abilità stimata, che tiene conto di quanto erano difficili gli esercizi.",
        },
        {
          p: 'Il punteggio usa una regola chiamata «tempo residuo con segno» (signed residual time), la stessa usata da piattaforme di esercizio adattivo come Math Garden: ogni risposta giusta vale tanto di più quanto più tempo avanza prima della scadenza, ogni risposta sbagliata toglie in proporzione allo stesso modo.',
        },
      ],
      refs: ['maris2012', 'klinkenberg2011'],
    },
    {
      id: 'ability',
      title: 'Abilità stimata e difficoltà adattiva',
      blocks: [
        {
          p: 'Ogni attività ha cinque livelli di difficoltà, da L1 (molto facile) a L5 (molto difficile), con tutti i valori intermedi (per esempio L2,5). Il livello si traduce in parametri concreti: più carte nel Memory, stimoli più rapidi nel Semaforo, sequenze più lunghe, simboli più simili tra loro.',
        },
        {
          p: "L'abilità stimata è il livello che il paziente riesce ad affrontare con successo in quella attività. Si esprime sulla stessa scala (L1–L5): un'abilità di L3,2 vuol dire che un esercizio di livello 3,2 sarebbe «alla pari», cioè con circa il 50% di successo.",
        },
        { h: 'Come viene stimata: il metodo Glicko (simile al punteggio Elo degli scacchi)' },
        {
          p: "Negli scacchi ogni giocatore ha un punteggio Elo: se batti un avversario più forte guadagni molti punti, se perdi con uno più debole ne perdi molti. Sinapsi fa lo stesso: ogni esecuzione è come una «partita» tra il paziente e l'esercizio. Se il paziente va meglio di quanto ci si aspettava per quella difficoltà, l'abilità sale; se va peggio, scende.",
        },
        {
          p: "Glicko aggiunge all'Elo una misura di incertezza. All'inizio il sistema conosce poco il paziente: l'incertezza è grande e l'abilità può cambiare molto da una volta all'altra. Con la pratica l'incertezza si riduce e la stima diventa stabile. Dopo una lunga pausa (per esempio un mese senza esercizi) l'incertezza torna a crescere, così il sistema si riadatta in fretta a eventuali cambiamenti.",
        },
        {
          p: "Nel grafico dell'abilità, la linea blu è la stima dopo ogni esecuzione e la fascia azzurra è l'intervallo di incertezza al 95% (vedi «Linee di tendenza e affidabilità»): il livello vero del paziente sta quasi certamente lì dentro.",
        },
        { h: 'Come viene scelta la difficoltà' },
        {
          p: "Il sistema sceglie apposta un livello un po' più basso dell'abilità stimata, in modo che il paziente riesca in circa 3 prove su 4 (75%). È un compromesso tra sfida e motivazione: abbastanza difficile da allenare, abbastanza facile da non scoraggiare. Il valore si può cambiare per ogni paziente (dal 60% al 90%) nel suo profilo.",
        },
        {
          p: "Il terapista può sempre decidere diversamente: può fissare la difficoltà di un esercizio in una seduta, oppure bloccarla per un paziente (pulsante «Blocca la difficoltà»). L'abilità continua comunque a essere stimata.",
        },
        { h: 'Le sequenze: la regola «3 giuste, sale; 1 sbagliata, scende»' },
        {
          p: "Nell'esercizio «Sequenze da ricordare» la lunghezza si adatta anche durante la stessa esecuzione: dopo 3 risposte giuste di fila la sequenza si allunga di un elemento, dopo un errore si accorcia. Questa regola, usata da decenni in psicofisica, porta le sequenze a stabilizzarsi vicino alla lunghezza che il paziente ricorda correttamente circa 8 volte su 10.",
        },
        {
          example:
            "Esempio: un paziente nuovo inizia a L1,5. Va molto bene tre volte di fila, quindi l'abilità sale rapidamente (l'incertezza iniziale è grande) e gli esercizi diventano di livello 2,5. Dopo una decina di esecuzioni l'abilità oscilla poco intorno a L3,4: quello è il suo livello attuale.",
        },
      ],
      refs: ['glickman1999', 'klinkenberg2011', 'levitt1971'],
    },
    {
      id: 'areas',
      title: 'Andamento per area e profilo',
      blocks: [
        {
          p: 'Ogni attività allena una o più aree cognitive (attenzione, memoria, funzioni esecutive, velocità di elaborazione…). Il grafico «Andamento per area cognitiva» mostra, settimana per settimana, quanti livelli di abilità il paziente ha guadagnato in media nelle attività di ciascuna area rispetto alla prima volta che le ha svolte.',
        },
        {
          list: [
            "0 = come all'inizio.",
            '+1 = in media il paziente affronta esercizi un livello più difficili di quando ha iniziato.',
            'Valori negativi = in media affronta esercizi più facili di quando ha iniziato.',
          ],
        },
        {
          p: "Il grafico «Profilo: confronto tra due date» mette a confronto l'abilità media per area in due date a scelta. Ogni riga è un'area: il punto grigio è la data iniziale, il punto blu la data finale. Più è lunga la linea, più grande è il cambiamento.",
        },
        {
          p: 'Il «Calendario delle attività» mostra in quali giorni il paziente ha svolto esercizi e quanti: utile per vedere la regolarità del lavoro.',
        },
      ],
    },
    {
      id: 'trends',
      title: 'Linee di tendenza e affidabilità',
      blocks: [
        {
          p: "I risultati di una persona variano naturalmente da un giorno all'altro: stanchezza, umore, orario. Per capire se c'è un vero cambiamento bisogna separare la tendenza dal «rumore». Sinapsi usa quattro strumenti statistici, scelti perché sono robusti: non si lasciano ingannare da una singola giornata storta.",
        },
        { h: '1. La linea di tendenza (LOWESS)' },
        {
          p: "Nei grafici delle misure, i punti sono le singole esecuzioni e la linea che li attraversa è una media «morbida» calcolata con il metodo LOWESS (regressione locale pesata). Per ogni punto del tempo, il metodo guarda le esecuzioni vicine, dando più peso a quelle più vicine e meno peso ai valori anomali. Il risultato è una curva che segue l'andamento generale senza inseguire ogni punto.",
        },
        { h: '2. La variazione ogni 30 giorni (metodo di Theil–Sen)' },
        {
          p: 'Per dire «quanto cambia in media» una misura nel tempo, Sinapsi traccia idealmente una retta tra ogni coppia di esecuzioni e ne calcola la pendenza; poi prende la pendenza mediana (quella che sta in mezzo). Questo metodo, di Theil e Sen, è molto resistente ai valori anomali: anche se alcune esecuzioni sono molto diverse dalle altre, il risultato non cambia molto. Il valore è poi espresso come «variazione ogni 30 giorni».',
        },
        { h: "3. L'intervallo di confidenza («probabilmente tra … e …»)" },
        {
          p: "Ogni stima ha un margine di incertezza. L'intervallo di confidenza al 95% è l'intervallo che contiene quasi certamente il valore vero. Sinapsi lo calcola con il metodo bootstrap: rifà il calcolo centinaia di volte «rimescolando» le esecuzioni disponibili e guarda quanto variano i risultati. Se l'intervallo comprende sia valori positivi sia negativi (per esempio «tra −5 e +12»), non si può dire con sicurezza se la misura sta salendo o scendendo.",
        },
        { h: '4. Il test di tendenza (Mann–Kendall)' },
        {
          p: 'Il test di Mann–Kendall confronta ogni esecuzione con tutte quelle successive e conta quante volte il valore è salito e quante è sceso. Se le salite (o le discese) prevalgono nettamente, più di quanto capiterebbe per caso, la tendenza è considerata significativa (p < 0,05: meno del 5% di probabilità che sia un effetto del caso).',
        },
        { h: 'Il distintivo «In miglioramento / Stabile / In calo»' },
        {
          p: "Il distintivo dice «In miglioramento» o «In calo» solo se entrambe le condizioni sono vere: l'intervallo di confidenza della variazione non comprende lo zero e il test di Mann–Kendall è significativo. Tiene conto del verso della misura: per i tempi di reazione scendere è un miglioramento, per l'accuratezza salire. Altrimenti mostra «Stabile». Con meno di 5 esecuzioni mostra «Dati insufficienti».",
        },
        { h: "La variazione rispetto all'inizio" },
        {
          p: "È la differenza tra la media delle ultime 3 esecuzioni e quella delle prime 3, con il suo intervallo di confidenza. Risponde alla domanda più semplice: «rispetto a come era all'inizio, com'è adesso?».",
        },
        {
          example:
            "Esempio: «Variazione ogni 30 giorni: −18 ms (probabilmente tra −30 e −7)» sul tempo di reazione mediano significa che ogni mese il paziente risponde in media 18 millesimi di secondo più velocemente, e che quasi certamente il miglioramento è compreso tra 7 e 30 ms al mese. L'intervallo non comprende lo zero: il miglioramento è affidabile.",
        },
      ],
      refs: ['cleveland1979', 'sen1968', 'mann1945', 'efron1993'],
    },
    {
      id: 'reaction-times',
      title: 'Tempi di reazione',
      blocks: [
        {
          p: "Il tempo di reazione è il tempo (in millisecondi, ms: 1000 ms = 1 secondo) tra la comparsa dello stimolo sullo schermo e la risposta. Sinapsi registra l'istante in cui lo stimolo è stato effettivamente disegnato sullo schermo e l'istante esatto del tocco o del clic.",
        },
        {
          terms: [
            {
              term: 'Mediana',
              def: 'Il valore che sta in mezzo: metà delle risposte è più veloce, metà più lenta. A differenza della media, non viene «tirata su» da poche risposte lentissime: per questo è la misura principale.',
            },
            {
              term: 'Anticipazioni',
              def: 'Risposte più veloci di 150 ms. Sono troppo rapide per essere una reazione allo stimolo (il cervello non fa in tempo a vederlo): il paziente ha premuto «a indovinare». Vengono contate ma escluse dal calcolo dei tempi.',
            },
            {
              term: 'Risposte anomale lente',
              def: 'Risposte molto più lente delle altre (oltre tre volte la variabilità tipica sopra la mediana). Vengono escluse dai tempi «puliti» ma restano visibili nel grafico prova per prova.',
            },
            {
              term: 'Irregolarità (CV)',
              def: "Il coefficiente di variazione: quanto variano i tempi rispetto alla loro media. Un paziente con tempi regolari ha un CV basso; uno che a volte risponde subito e a volte dopo molto ha un CV alto. Un CV alto è tipico di un'attenzione che va e viene.",
            },
            {
              term: 'Tempo di reazione semplice',
              def: 'Nel riscaldamento iniziale il paziente deve solo premere appena compare un cerchio verde. Questo misura la velocità della mano e la lentezza intrinseca del dispositivo (schermo, mouse, touch).',
            },
            {
              term: 'Tempo di decisione',
              def: "Tempo di reazione nell'esercizio meno il tempo di reazione semplice. Quello che resta è il tempo per riconoscere lo stimolo e decidere cosa fare, al netto della velocità motoria e del dispositivo.",
            },
            {
              term: 'Durata della pressione',
              def: 'Per quanto tempo il dito, il tasto o il pulsante del mouse restano premuti. Valori molto lunghi o molto variabili possono riflettere aspetti motori.',
            },
          ],
        },
        { h: 'Attenzione al dispositivo' },
        {
          p: 'Mouse, touchpad, schermo touch e penna hanno ritardi diversi (anche di decine di millisecondi). Per confrontare i tempi nel tempo, usa il filtro «Dispositivo di input» nella scheda Andamento e guarda un solo tipo di dispositivo alla volta. Il tempo di decisione riduce questo problema.',
        },
      ],
      refs: ['whelan2008', 'ratcliff1993'],
    },
    {
      id: 'rt-distribution',
      title: 'La distribuzione dei tempi (modello ex-gaussiano)',
      blocks: [
        {
          p: "Se si mettono in un istogramma tutti i tempi di reazione di un'esecuzione, la forma non è simmetrica: c'è un picco (i tempi abituali) e una lunga «coda» verso destra (alcune risposte molto più lente). Il modello ex-gaussiano descrive questa forma con tre numeri:",
        },
        {
          terms: [
            {
              term: 'μ (mu) — velocità abituale',
              def: 'Dove si trova il picco: quanto è veloce il paziente quando è concentrato.',
            },
            {
              term: 'σ (sigma) — regolarità',
              def: 'Quanto sono sparpagliati i tempi abituali intorno al picco.',
            },
            {
              term: 'τ (tau) — risposte lente',
              def: "Quanto è lunga la coda di risposte lente. Un τ alto indica frequenti momenti di distrazione (i cosiddetti lapsus attentivi). È una misura particolarmente sensibile nei disturbi dell'attenzione.",
            },
          ],
        },
        {
          p: "Per stimare questi tre numeri in modo affidabile servono almeno 40 risposte corrette, per questo compaiono solo negli esercizi più lunghi (come il Semaforo ai livelli più alti). Il grafico «Distribuzione dei tempi» nel dettaglio di un'esecuzione mostra l'istogramma con la curva del modello sovrapposta.",
        },
        {
          example:
            "Esempio: due pazienti hanno la stessa mediana di 500 ms. Il primo ha τ = 40 ms (pochissime risposte lente), il secondo τ = 180 ms (molte risposte lente). Il secondo ha un'attenzione meno stabile, anche se «in media» sembrano uguali.",
        },
      ],
      refs: ['hervey2006', 'ratcliff1993'],
    },
    {
      id: 'signal-detection',
      title: 'Rispondere o trattenersi (d′ e stile di risposta)',
      blocks: [
        {
          p: 'Negli esercizi in cui bisogna rispondere ad alcuni stimoli e ignorarne altri (come il Semaforo: premere per il verde, non premere per il rosso), ci sono quattro possibilità:',
        },
        {
          list: [
            'Risposta corretta: stimolo da premere, il paziente preme.',
            'Omissione: stimolo da premere, il paziente non preme (lo «perde»).',
            'Commissione o falso allarme: stimolo da ignorare, il paziente preme lo stesso (impulsività).',
            'Rifiuto corretto: stimolo da ignorare, il paziente non preme.',
          ],
        },
        {
          p: "Il problema: un paziente che preme sempre non ha omissioni ma fa moltissimi falsi allarmi; uno che non preme quasi mai ha l'opposto. La teoria della detezione del segnale separa due cose diverse:",
        },
        {
          terms: [
            {
              term: 'd′ (d primo) — capacità di distinguere',
              def: 'Quanto bene il paziente distingue gli stimoli a cui rispondere da quelli da ignorare, indipendentemente da quanto è propenso a premere. 0 = risponde a caso; 1 = discrimina in modo modesto; sopra 2 = discrimina bene; sopra 3 = molto bene.',
            },
            {
              term: 'c — stile di risposta',
              def: 'Positivo = prudente (preferisce non premere: meno falsi allarmi ma più omissioni). Negativo = liberale o impulsivo (preme spesso: poche omissioni ma più falsi allarmi). Vicino a 0 = equilibrato. Non è un voto: descrive la strategia.',
            },
          ],
        },
        {
          p: 'Quando un paziente non sbaglia mai (0 errori), le formule matematiche darebbero un valore infinito; si usa quindi una piccola correzione standard (log-lineare) che rende il calcolo sempre possibile.',
        },
        {
          example:
            'Esempio: dopo un mese di esercizi, il d′ resta 2,0 ma lo stile c passa da −0,6 a 0. Significa che il paziente distingue gli stimoli come prima, ma è diventato meno impulsivo: preme meno «di getto».',
        },
      ],
      refs: ['stanislaw1999', 'hautus1995'],
    },
    {
      id: 'speed-accuracy',
      title: 'Velocità e accuratezza insieme',
      blocks: [
        {
          p: 'Ogni persona sceglie, più o meno consapevolmente, un compromesso: andare veloce sbagliando di più, oppure andare piano sbagliando meno. Guardare solo i tempi o solo gli errori può ingannare: un paziente può «migliorare» i tempi semplicemente diventando più frettoloso.',
        },
        { p: 'Per questo Sinapsi usa misure che combinano le due cose:' },
        {
          terms: [
            {
              term: 'Punteggio a tempo residuo (signed residual time)',
              def: 'Ogni risposta giusta vale di più se è veloce; ogni risposta sbagliata toglie di più se è data di fretta. È la base del punteggio di molte attività.',
            },
            {
              term: 'Indice di efficienza inversa (IES)',
              def: 'Tempo medio delle risposte giuste diviso la proporzione di risposte giuste: «quanti millisecondi servono per ogni risposta giusta». Più basso è meglio.',
            },
            {
              term: 'Risposte corrette al secondo (RCS)',
              def: 'Quante risposte giuste il paziente dà in media per ogni secondo di lavoro. Più alto è meglio.',
            },
            {
              term: 'Punteggio integrato (BIS)',
              def: 'Mette sulla stessa scala accuratezza e velocità rispetto alla storia del paziente, e le somma con lo stesso peso.',
            },
          ],
        },
      ],
      refs: ['maris2012', 'townsend1983', 'woltz2006', 'liesefeld2019'],
    },
    {
      id: 'attention-time',
      title: 'Attenzione nel tempo',
      blocks: [
        {
          terms: [
            {
              term: "Calo dell'attenzione nel tempo (decremento della vigilanza)",
              def: "Di quanti millisecondi aumentano i tempi di reazione per ogni minuto di esercizio. Se è positivo, il paziente rallenta man mano che l'esercizio va avanti: un segno di affaticamento o di difficoltà a mantenere l'attenzione.",
            },
            {
              term: 'Indice di affaticamento',
              def: "I tempi dell'ultimo terzo dell'esercizio divisi per quelli del primo terzo. 1 = nessuna differenza; 1,2 = alla fine è più lento del 20%.",
            },
            {
              term: 'Rallentamento dopo un errore',
              def: "Molte persone, dopo aver sbagliato, rallentano un po' per stare più attente. Sinapsi confronta il tempo della risposta subito dopo un errore con quello della risposta subito prima. Un valore positivo è un buon segno: il paziente si accorge degli errori e si corregge. Il calcolo segue il metodo «robusto» che non viene falsato da rallentamenti generali.",
            },
          ],
        },
      ],
      refs: ['dutilh2012'],
    },
    {
      id: 'visual-search',
      title: 'Ricerca visiva (Caccia al simbolo)',
      blocks: [
        {
          p: "Nell'esercizio di cancellazione il paziente deve trovare tutti i simboli uguali a un modello. Oltre a quanti ne trova, Sinapsi registra dove si trovano quelli trovati e mancati, e in che ordine li ha cercati.",
        },
        {
          terms: [
            {
              term: 'Equilibrio sinistra–destra (centro di cancellazione)',
              def: 'Un numero da −1 a +1. 0 = il paziente ha trovato i bersagli in modo equilibrato in tutta la scheda. Valori negativi = ha trovato soprattutto quelli a sinistra (perdendo quelli a destra); positivi = il contrario. Esiste anche la versione alto–basso. Descrive cosa è successo, non è una diagnosi.',
            },
            {
              term: 'Omissioni a sinistra / a destra',
              def: 'Quanti bersagli sono stati mancati in ciascuna metà della scheda.',
            },
            {
              term: 'Ordine della ricerca (best r)',
              def: "Quanto la ricerca segue righe o colonne, come quando si legge. Vicino a 1 = esplorazione molto ordinata; vicino a 0 = salta da una parte all'altra.",
            },
            {
              term: 'Incroci del percorso',
              def: "Unendo con una linea i bersagli nell'ordine in cui sono stati trovati, quante volte la linea si incrocia con sé stessa. Molti incroci = ricerca disordinata.",
            },
            {
              term: 'Distanza media tra cancellazioni',
              def: 'Quanto sono lunghi in media i «salti» da un bersaglio al successivo. Salti lunghi indicano una ricerca meno sistematica.',
            },
          ],
        },
        {
          p: "Nel dettaglio dell'esecuzione, il pulsante «Riproduci» mostra il percorso di ricerca nell'ordine reale, con i bersagli trovati, quelli mancati e il movimento del mouse.",
        },
      ],
      refs: ['rorden2010', 'mark2004', 'donnelly1999'],
    },
    {
      id: 'memory',
      title: 'Memoria (Memory delle coppie e Sequenze)',
      blocks: [
        { h: 'Memory delle coppie' },
        {
          terms: [
            {
              term: 'Efficienza rispetto al gioco ottimale',
              def: 'Anche un giocatore con memoria perfetta deve girare ogni carta almeno una volta prima di poterla abbinare: per n coppie servono in media circa 1,6 × n tentativi. Sinapsi confronta i tentativi del paziente con questo valore. 100% = come una memoria perfetta; 50% = il doppio dei tentativi necessari.',
            },
            {
              term: 'Errori di memoria',
              def: "Il paziente gira una carta la cui compagna aveva già visto, ma non la sceglie: l'errore più legato alla memoria visiva.",
            },
            { term: 'Perseverazioni', def: 'Lo stesso abbinamento sbagliato ripetuto più volte.' },
          ],
        },
        { h: 'Sequenze da ricordare (span)' },
        {
          terms: [
            {
              term: 'Span stimato',
              def: 'La lunghezza di sequenza che il paziente ricorda con buona sicurezza. Viene dalla regola «3 giuste, sale; 1 sbagliata, scende» (vedi «Abilità stimata e difficoltà adattiva»).',
            },
            { term: 'Span massimo', def: 'La sequenza più lunga ripetuta senza errori.' },
            {
              term: 'Elementi al posto giusto (credito parziale)',
              def: 'Per ogni sequenza, la parte di elementi ricordati nella posizione giusta, anche se la sequenza non era tutta corretta; poi la media. È più informativo del semplice giusto/sbagliato.',
            },
            {
              term: 'Errori di elemento e di ordine',
              def: "Errore di elemento = il paziente indica qualcosa che non era nella sequenza. Errore di ordine = l'elemento era giusto ma nella posizione sbagliata (difficoltà a mantenere l'ordine).",
            },
            {
              term: 'Prima e ultima posizione',
              def: "Di solito si ricordano meglio il primo elemento (effetto primacy) e l'ultimo (effetto recency).",
            },
          ],
        },
      ],
      refs: ['velleman2013', 'conway2005', 'levitt1971'],
    },
    {
      id: 'flexibility',
      title: 'Flessibilità (Metti in ordine e Collega in ordine)',
      blocks: [
        { h: 'Metti in ordine (cambio di regola)' },
        {
          terms: [
            {
              term: 'Costo del cambio',
              def: "Quando la regola cambia (per esempio da «ordina per categoria» a «ordina per grandezza»), quasi tutti rallentano o sbagliano un po' nella prova successiva. Il costo del cambio misura questo rallentamento (in ms) e il calo di accuratezza.",
            },
            {
              term: 'Errori perseverativi',
              def: 'Dopo il cambio, il paziente continua ad applicare la regola precedente. Indicano rigidità, cioè difficoltà a «cambiare binario».',
            },
          ],
        },
        { h: 'Collega in ordine (parte A e parte B)' },
        {
          terms: [
            {
              term: 'Tempo A e tempo B',
              def: 'Parte A: collegare 1-2-3-… (velocità visuo-motoria). Parte B: alternare numeri e lettere 1-A-2-B-… (richiede in più di alternare due serie).',
            },
            {
              term: 'Differenza B − A',
              def: "Il tempo in più richiesto dall'alternanza, al netto della velocità di base. Riflette la flessibilità cognitiva.",
            },
            {
              term: 'Rapporto B ÷ A',
              def: 'Come la differenza, ma in proporzione: un rapporto di 2 vuol dire che la parte B richiede il doppio del tempo della parte A.',
            },
            {
              term: 'Pause',
              def: 'Collegamenti che hanno richiesto più di 2,5 volte il tempo abituale: esitazioni o momenti in cui il paziente ha perso il filo.',
            },
          ],
        },
      ],
    },
    {
      id: 'movement',
      title: 'Movimento e dispositivi',
      blocks: [
        {
          p: 'Quando il paziente usa il mouse o una penna, Sinapsi registra anche il percorso del puntatore (circa 30 posizioni al secondo). Da questo calcola:',
        },
        {
          terms: [
            {
              term: 'Efficienza del movimento',
              def: 'Distanza in linea retta fino al bersaglio divisa per la strada effettivamente percorsa. 1 = movimento diretto; valori più bassi = deviazioni, esitazioni, correzioni.',
            },
            {
              term: 'Tempo di avvio e di movimento',
              def: 'Quanto tempo passa prima che il puntatore inizi a muoversi, e quanto dura lo spostamento.',
            },
            {
              term: 'Sotto-movimenti e pause',
              def: 'Quante volte il movimento accelera e rallenta (correzioni di traiettoria) e quante volte si ferma per più di un quinto di secondo.',
            },
          ],
        },
        {
          p: 'Con lo schermo touch il dito «salta» direttamente sul bersaglio, quindi queste misure non sono disponibili; restano tempi, precisione e durata della pressione. Anche per questo conviene confrontare esecuzioni fatte con lo stesso tipo di dispositivo.',
        },
      ],
    },
    {
      id: 'quality',
      title: 'Qualità dei dati e registrazioni dettagliate',
      blocks: [
        {
          p: "Sinapsi segnala automaticamente le esecuzioni che potrebbero non essere affidabili. Nella scheda Andamento, l'opzione «Escludi le esecuzioni anomale» (attiva di solito) le toglie dai grafici; restano comunque visibili nell'elenco.",
        },
        {
          terms: [
            {
              term: 'Interrotta',
              def: 'La finestra è stata nascosta o ha perso il focus per più di 3 secondi (per esempio il paziente ha cambiato applicazione).',
            },
            {
              term: 'Messa in pausa',
              def: "Qualcuno ha premuto il pulsante di pausa durante l'esercizio.",
            },
            {
              term: 'Molte anticipazioni',
              def: 'Più del 10% delle risposte era troppo veloce per essere una vera reazione.',
            },
            { term: 'Poche prove', def: "L'esercizio è stato troppo breve per misure affidabili." },
            {
              term: 'Input misto',
              def: 'Sono stati usati dispositivi diversi nella stessa esecuzione (per esempio mouse e touch).',
            },
            { term: 'Non completata', def: 'Il paziente si è fermato prima della fine.' },
          ],
        },
        { h: 'Registrazione dettagliata' },
        {
          p: 'Per ogni esecuzione Sinapsi conserva la registrazione completa (ogni tocco, tempo e movimento) in forma compressa. Serve per riprodurre il percorso e per ricalcolare le misure se in futuro le formule miglioreranno. Viene cancellata automaticamente dopo il periodo impostato dallo studio (24 mesi se non modificato), mentre le misure riassuntive restano. Con «Conserva senza scadenza» puoi tenerla per le esecuzioni importanti.',
        },
      ],
    },
    {
      id: 'limits',
      title: 'Che cosa questi dati non sono',
      blocks: [
        {
          list: [
            'Non sono test standardizzati: gli esercizi sono generati automaticamente e cambiano ogni volta, e non esistono valori di riferimento per la popolazione.',
            "Non sono una diagnosi: misure come l'equilibrio sinistra–destra o le risposte lente descrivono cosa è successo durante un esercizio, non la causa.",
            "Non sostituiscono la valutazione clinica: sono uno strumento in più per il terapista, che resta l'unico a interpretare i risultati e a decidere il percorso.",
            'Dipendono dal contesto: stanchezza, orario, dispositivo e ambiente influenzano i risultati. Per confrontare nel tempo, è meglio mantenere condizioni simili.',
          ],
        },
      ],
    },
  ],
}

export default it
