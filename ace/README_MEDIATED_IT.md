# ACE: Agentic Context Engineering — integrazione mediata

ACE trasforma l'evidenza di esecuzione in memoria operativa duratura.
Nell'integrazione **mediata**, ACE è un percorso di orchestrazione opzionale,
non un comportamento inserito in ogni worker. Agenti worker, persona, wrapper,
tool e contratti di delega esistenti restano intatti.

Per l'alternativa che integra ACE direttamente negli agenti partecipanti, vedi
[README_EMBEDDED_IT.md](README_EMBEDDED_IT.md).

## Installazione, aggiornamento e migrazione

L'installazione crea ACE dove non è presente; usa
[INSTALL_PROMPT_MEDIATED.md](../INSTALL_PROMPT_MEDIATED.md). L'aggiornamento
porta avanti un'installazione esistente preservando opt-in mediated,
comportamento e configurazione del progetto e dati accumulati; usa
[UPDATE_PROMPT.md](../UPDATE_PROMPT.md). La migrazione cambia paradigma o
ristruttura materialmente gli agenti posseduti dal progetto e richiede un piano
separato e un'approvazione esplicita.

Un aggiornamento deve preservare entrambi gli entrypoint mediated, la persona
canonica ACE-free condivisa, i worker invariati e l'opt-in esplicito `-ace`.
Non deve normalizzare mediated in embedded. Viceversa, un'installazione dal
comportamento embedded ma priva di `integration_mode` viene normalizzata
dall'updater a embedded esplicito: la presenza nel kit di file mediated
moderni non la rende mediated.

Il comando di inventario in sola lettura è:

```text
node <KIT_ROOT>/ace/scripts/inspect_update.js --target <TARGET_ROOT>
```

Usa `ace/runtime-version.json` per riportare versioni runtime, ownership, hash
dei file del kit, dati da preservare, conflitti, modalità rilevata e
normalizzazioni richieste; riporta sempre `write_performed: false`. È evidenza
per la procedura collegata, non un updater né un'autorizzazione a
sovrascrivere comportamento del progetto e dati runtime.

## Contratto della modalità mediata

L'orchestratore è rappresentato da una sola persona sorgente priva di ACE e da
due wrapper runtime minimi:

| Artefatto | Nome runtime | Comportamento |
| --- | --- | --- |
| Persona canonica | non invocata direttamente | Solo orchestrazione del progetto, senza istruzioni ACE |
| Wrapper standard | nome runtime esistente, invariato | Carica la persona canonica e conserva il comportamento corrente |
| Wrapper ACE | `<nome-runtime-esistente>-ace` | Carica la stessa persona e aggiunge il contratto di mediazione ACE |

Se non esiste un orchestratore, l'installazione crea una persona canonica
ACE-free e la stessa coppia di wrapper. Il nome base scelto resta invariato per
il wrapper standard; soltanto il wrapper opt-in riceve `-ace`. Non devono
esistere due sorgenti concorrenti del comportamento.

- il nome standard non avvia ACE, non recupera lesson, non scrive trace ACE e
  non attiva il ciclo di apprendimento;
- il nome `-ace` include il task nell'intero ciclo ACE;
- i worker non devono sapere se la mediazione è attiva;
- le istruzioni globali possono documentare l'invocazione, ma non rendere ACE
  sempre attivo né trasformare il percorso `-ace` nel default implicito.

## Flusso completo

```text
l'utente invoca <orchestratore>-ace
        ↓
il wrapper ACE carica la persona canonica ACE-free
        ↓
mappa task → worker/scope/famiglia canonici
        ↓
recupera lesson globali + scoped + di famiglia attive
        ↓
delega il lavoro normale a un worker invariato
        ↓
raccoglie risultato ed evidenza al confine dell'orchestratore
        ↓
scrive trace; aggiorna contatori; controlla soglie
        ↓
reflector → curator → warden → sign-off umano esplicito
        ↓
applica il delta al playbook; rigenera il retrieval
```

### 1. Mappatura

Prima della delega, il wrapper ACE risolve il lavoro sugli id canonici in
`ace/config/project.json`, registrando worker, eventuale famiglia e id del
task/sessione. Le ambiguità vanno mostrate, non indovinate. Il wrapper non
rinomina, duplica o riscrive alcun worker.

### 2. Retrieval

Il wrapper recupera lesson globali e lesson dell'agente/famiglia mappati. Serve
solo contenuto attivo e non escluso. Il playbook markdown resta la fonte
duratura; le instructions generate sono la vista runtime compatta. Gli id
visti e applicati vengono conservati per la trace.

### 3. Delega

La delega usa il nome runtime e il contratto worker già esistenti. Frontmatter,
persona, tool, modello, handoff e formato di ritorno dei worker non cambiano.
Le lesson pertinenti sono contesto specifico del task fornito
dall'orchestratore, non istruzioni installate permanentemente nel worker.

### 4. Raccolta e trace

Dopo la delega l'orchestratore ACE verifica il risultato e scrive la trace:
agente e famiglia mappati, lesson viste e citate, esito e valutatore, note e
attriti. I worker possono restituire fatti utili, ma non possiedono i file ACE
né il ciclo.

### 5. Apprendimento e governance

L'orchestratore aggiorna i contatori e controlla le soglie. Quando una soglia
scatta, invoca il reflector generato. Il reflector propone da evidenze in
batch; il curator produce decisioni tipizzate
(`ADD`/`UPDATE`/`DEPRECATE`/`MERGE`/`PROMOTE`/`REJECT`); il warden esegue il
gate deterministico. Solo il warden, dopo approvazione umana esplicita e
individuale, applica un delta. Poi il retrieval viene rigenerato. Nessun ruolo
modifica silenziosamente il playbook.

## Struttura e oggetti

Il runtime usa `ace/config/` per configurazione e soglie, `ace/traces/` per
l'evidenza, `ace/proposals/` per batch e decisioni, `ace/state/` per esclusioni,
`ace/prompts/` per reflector/curator/warden e `ace/scripts/` per generazione,
preparazione della delega, cattura/finalizzazione, retrieval, contatori, gate,
applicazione e validazione. I playbook in
`ace/playbooks/*.md` sono la fonte di verità.

Una `trace` registra fatti e risultati. Una `proposal` è un cambiamento
candidato. Una `decision` stabilisce l'operazione tipizzata. Un bullet del
playbook conserva testo, stato, scope, tag, contatori, provenienza e trace
sorgenti. Le instructions generate espongono soltanto direttiva attiva e id;
regole deprecate, in quarantena o live-excluded non vengono servite.

## Controllo umano e sicurezza

La validazione meccanica precede la revisione semantica. Un gate superato non
autorizza una scrittura. Il warden usa il question tool dedicato dell'host,
chiede una sola approvazione alla volta e passa un sign-off verificabile ad
`apply_delta.js`. Le istruzioni di progetto e sicurezza a priorità superiore
prevalgono sempre.

Anche l'opt-in è rigoroso: installare ACE non autorizza modifiche al percorso
standard dell'orchestratore, ai worker o al comportamento globale. Un task
partecipa solo quando l'utente o un meccanismo esplicito invoca il wrapper
`-ace`.

## Responsabilità degli script

- `generate_ace_agents.js`: genera e verifica i wrapper del ciclo.
- `prepare_delegation.js`: mappa lo scope canonico ed emette il manifest delle
  lesson per il worker invariato. Richiede sempre `--task-id`, `--agent` e
  `--platform`, anche con una sola piattaforma. `manifest_id` è un checksum
  deterministico di consistenza, non una firma né un confine di sicurezza.
- `capture_trace.js`: convalida e registra l'evidenza di un contributor.
- `finalize_task.js`: completa i contatori solo per quel task, poi gestisce le
  soglie senza consumare trace pendenti di altri task.
- `retrieval.js`: deriva le instructions attive dai playbook.
- `check_threshold.js`: determina quando è dovuto uno stage batch.
- `update_counters.js`: integra l'evidenza delle trace nei contatori.
- `gate.js`: valida le decisioni del curator prima della revisione.
- `apply_delta.js`: applica un delta firmato e rigenera il retrieval.
- `inspect_update.js`: produce un inventario di aggiornamento in sola lettura
  dal target e da `runtime-version.json`; non riconcilia né scrive file.
- `validate_install.js`: verifica completezza strutturale e configurazione.

Installa questa modalità con
[INSTALL_PROMPT_MEDIATED.md](../INSTALL_PROMPT_MEDIATED.md).
