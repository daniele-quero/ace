# Analisi delle differenze tra agenti standalone e personas

## Contesto

Questa analisi confronta le coppie `QA-analyst`, `QA-engineer`, `QA-runner`,
`QA-closer` e `QA-orchestrator` fornite dall'utente:

- gli agenti standalone originali;
- le personas generate dopo l'installazione embedded di ACE;
- i wrapper Copilot necessari a ricostruire il comportamento effettivo.

L'obiettivo è distinguere una semplice riorganizzazione strutturale da una
perdita nel significato operativo del flusso.

## Conclusione

Il passaggio a persona + wrapper ha conservato ruoli, tool, deleghe principali
e confini generali, ma non è stato completamente lossless. Le personas hanno
riassunto parti operative che nello standalone erano vincoli verificabili:

- precondizioni e gate;
- ordine delle fasi;
- parallelismo e isolamento;
- payload tra agenti;
- fallback, retry ed escalation;
- criteri di successo;
- contratti di output;
- side effect Git.

Il pattern persona + wrapper è valido; il problema è averlo usato come sintesi
anziché come relocation del contratto comportamentale.

## Criterio di valutazione

Una trasformazione dovrebbe essere trattata come:

> relocation and integration, not a redesign.

Ogni elemento dell'agente originale deve avere una destinazione esplicita:

- preservato nella persona;
- preservato nel wrapper;
- tradotto per l'harness;
- aggiunto da ACE;
- modificato con approvazione esplicita.

Una perdita non spiegata è una regressione.

## Harness, provider e modello

La scelta di usare il solo harness Copilot è lecita. Può richiedere modifiche a:

- posizione e nome dei file;
- schema del frontmatter;
- nomenclatura dei tool;
- sintassi di delegate e handoff;
- link e composizione tra wrapper e persona.

Harness, provider e modello selezionato sono però dimensioni indipendenti.
Copilot può eseguire modelli di provider diversi; quindi la conversione da un
agente configurato con Claude non autorizza a sostituire il modello con un
generico `GitHub Copilot`.

> Translate representation, preserve capability and intent.

Un modello si cambia solo se il target non lo supporta realmente, tale
incompatibilità è dimostrata e l'utente approva esplicitamente un'alternativa.

## QA Orchestrator

### Perdite

1. **Branch procedure non deterministica.** Lo standalone imponeva branch
   `<task-ID>-<suite-name>-test-suite`, checkout di `main`, fetch/pull,
   creazione del branch da `main` e stop se la condizione non era soddisfatta.
   La persona conserva solo un generico «ensure the required branch exists».

2. **Parallelismo e isolamento per feature persi.** L'originale richiedeva un
   QA engineer per ogni feature file, in parallelo, con il solo file e la
   spiegazione dell'analyst. La persona mantiene solo un riferimento generico
   all'implementazione per feature.

3. **Fix workflow indebolito.** L'ordine originale era
   `analyst → runner → engineer`; il passaggio iniziale dall'analyst non è più
   obbligatorio nella persona.

4. **Commit message canonici rimossi.** Mancano le formule per nuova suite e
   modifica/fix, anche se il closer continua a richiedere un messaggio esatto.

5. **`create_pr: true` non propagato esplicitamente.** Il closer può consumare
   il flag, ma non è più garantito che l'orchestrator lo passi.

6. **Escalation finale persa.** Non è più esplicito che, superato il massimo
   di iterazioni del runner, l'orchestrator debba riportare i fallimenti e
   chiedere guida all'utente.

7. **Aggiornamenti intermedi indeboliti.** Rimane il piano iniziale, ma non
   l'obbligo di informare l'utente tra le deleghe.

### Guadagni

ACE aggiunge task ID, trace, counter, soglie, reflector/curator/warden e
approvazione umana prima delle modifiche durevoli. Sono guadagni reali di
governance e auditabilità, ma non compensano le perdite del workflow QA.

## QA Closer

### Perdite

1. Il gate originale richiedeva prova di nuovi test passanti o failure risolti,
   domanda all'utente in caso di evidenza insufficiente, report in `reports/`
   senza commit se non c'era miglioramento e gestione esplicita dei flaky test.
   La persona conserva soltanto «verify the test improvement».

2. Lo schema minimo README (nome, scopo, comando, posizione di feature e step)
   non è più esplicito.

3. Non è più esplicito creare `.gitignore` quando assente.

4. La descrizione menziona un report HTML senza fornire un workflow completo;
   questa incoerenza era già presente nello standalone.

### Preservato

Restano lettura delle istruzioni Git, stage/commit/push, regola generale sulla
PR e divieto di modificare test, feature o eseguire test.

## QA Runner

### Perdite

Il fix loop originale specificava lettura dell'errore completo, diagnosi,
delega con scenario/traceback/root cause/file, riesecuzione dello stesso
comando approvato e analisi dopo ogni fix. La persona conserva il concetto,
ma non rende vincolanti payload, rerun e analisi iterativa.

Anche il failure report è meno preciso: si perdono totale eseguiti/passati/
falliti, elenco e gravità dei falliti, nome/file, traceback, causa, impatto e
azione correttiva.

È inoltre meno esplicito il routing dei blocker ambientali o delle aspettative
ambigue verso l'orchestrator.

## QA Engineer

### Perdite

- le coding instructions non sono più dichiarate single source of truth;
- il blueprint non è più preceduto obbligatoriamente dalla discovery delle
  suite disponibili;
- scompaiono vincoli su docstring, fixture, directory, astrazioni e modifica
  dei test esistenti;
- resta il divieto di common utility, ma si perde il percorso positivo per
  helper suite-specifici;
- la delega al Python Utility Engineer non richiede più esplicitamente
  istruzioni e contesto completi.

Restano lettura delle instruction Python/Behave, riuso degli artefatti,
delega all'utility engineer, divieto di modificare feature e divieto di eseguire
test.

## QA Analyst

### Perdite

- manca il fallback: se `gherkin.instructions.md` non esiste, cercare feature
  esistenti e chiedere un blueprint;
- manca la regola di notificare al QA engineer ogni modifica al testo degli
  step, anche di un solo carattere, per mantenere sincronizzati decorator e
  implementazioni;
- non è più conservato il criterio «chiedere solo se manca informazione
  critica»;
- il contratto di output scenario-per-scenario è meno formalizzato;
- non è più esplicito usare `Scenario Outline` + `Examples` nei casi
  data-driven.

Restano responsabilità Gherkin/feature, separazione dal codice Python, divieto
di test e scope limitato ai feature file.

## Perdita end-to-end

La forma nominale resta:

`analyst → engineer → runner → closer`

ma le invarianti si indeboliscono:

1. branch e base branch non sono più deterministici;
2. l'analisi può perdere blueprint fallback e sincronizzazione degli step;
3. non è garantito un engineer isolato e parallelo per feature;
4. il fix loop non vincola payload, rerun e analisi;
5. l'analyst non è obbligatorio all'inizio dei fix;
6. escalation e richiesta di guida sono perse;
7. il closer può non avere un gate completo prima di commit/push;
8. `create_pr` e commit message possono interrompersi tra producer e consumer.

## Guadagni architetturali

Persona + ACE offre:

1. separazione tra comportamento e metadata runtime;
2. riuso cross-platform della persona;
3. wrapper più leggibili;
4. fail-closed quando la persona non è leggibile;
5. trace, counter e learning lifecycle;
6. governance separata tra reflector, curator e warden;
7. sign-off umano per le modifiche durevoli;
8. in mediated mode, worker invariati e ACE opt-in.

Questi guadagni sono compatibili con la conservazione del workflow e non
richiedono di rimuovere dettagli operativi.

## Criterio per future installazioni e update

Prima di modificare gli agenti:

1. costruire un inventario read-only di wrapper, persona, registry, generator,
   istruzioni e handoff;
2. ricostruire il contratto effettivo;
3. assegnare ogni elemento a una destinazione nella preservation matrix;
4. trasformare senza comprimere workflow, condizioni e payload;
5. ricostruire il contratto post-modifica;
6. classificare ogni delta come `ACE-additive`, `representation-only`,
   `platform-required`, `user-approved` o `unexplained-loss`;
7. bloccare il successo se esiste una perdita non spiegata.
