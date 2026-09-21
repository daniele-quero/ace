# ACE: Agentic Context Engineering — mediated integration

ACE turns execution evidence into durable operating memory. In the **mediated**
integration, ACE is an optional orchestration path rather than behavior embedded
in every worker. Existing worker agents, their personas, wrappers, tools, and
delegation contracts remain untouched.

For the alternative that adds ACE directly to participating agents, see
[README_EMBEDDED.md](README_EMBEDDED.md).

## Install, update, and migration

Install creates ACE where it is absent; use
[INSTALL_PROMPT_MEDIATED.md](../INSTALL_PROMPT_MEDIATED.md). Update advances an
existing installation while preserving mediated opt-in, project behavior,
configuration, and accumulated data; use
[UPDATE_PROMPT.md](../UPDATE_PROMPT.md). Migration changes paradigms or
materially restructures project-owned agents and requires a separate plan and
explicit approval.

An update must preserve both mediated entrypoints, their shared canonical
ACE-free persona, the unchanged workers, and explicit `-ace` opt-in. It must
not normalize mediated into embedded. Conversely, a legacy installation whose
behavior is embedded but lacks `integration_mode` is normalized to explicit
embedded by the updater; it is not treated as mediated merely because current
mediated files exist in the kit.

The read-only inventory command is:

```text
node <KIT_ROOT>/ace/scripts/inspect_update.js --target <TARGET_ROOT>
```

It uses `ace/runtime-version.json` to report runtime versions, ownership and
kit-file hash states, preserved data, conflicts, detected mode, and required
normalization; it always reports `write_performed: false`. This is evidence for
the linked update procedure, not an updater or permission to overwrite
project-owned behavior and runtime data.

## The mediated contract

The orchestrator is represented by exactly one ACE-free source persona and two
thin runtime wrappers:

| Artifact | Runtime name | Behavior |
| --- | --- | --- |
| Canonical persona | not directly invoked | Existing project orchestration only; contains no ACE instructions |
| Standard wrapper | the existing runtime name, unchanged | Loads the canonical persona and preserves current behavior |
| ACE wrapper | `<existing-runtime-name>-ace` | Loads the same persona, then adds the ACE mediation contract |

If no orchestrator exists, installation creates one canonical ACE-free persona
and the same two-wrapper arrangement. The chosen base runtime name is used
unchanged by the standard wrapper; only the opt-in wrapper receives `-ace`.
There must not be two behavioral persona sources.

This separation is a functional boundary:

- invoking the standard name never starts ACE, retrieves lessons, records ACE
  traces, or triggers the learning pipeline;
- invoking the `-ace` name opts the task into the complete ACE lifecycle;
- workers do not need to know whether mediation is active;
- global instructions may explain how to invoke ACE, but must not inject ACE
  into every session or make the `-ace` path the implicit default.

## End-to-end mediated flow

```text
user invokes <orchestrator>-ace
        ↓
ACE wrapper loads canonical ACE-free persona
        ↓
map task to canonical worker/scope/family
        ↓
retrieve active global + scoped + family lessons
        ↓
delegate normal work to an unchanged worker
        ↓
collect result and evidence at the orchestrator boundary
        ↓
write trace; update counters; check threshold
        ↓
reflector → curator → warden → explicit human sign-off
        ↓
apply delta to playbook; regenerate retrieval output
```

### 1. Map

Before delegation, the ACE wrapper resolves the requested work to canonical
agent ids from `ace/config/project.json`. It records the selected worker, any
configured family scope, and a task/session id. Ambiguous mappings are surfaced
rather than guessed. The wrapper must not rename, clone, or rewrite a worker.

### 2. Retrieve

The wrapper obtains the active global lessons and the mapped agent/family
lessons. Only active, non-excluded content is served. The durable source remains
the markdown playbook; generated instructions are a compact runtime view.
Applied lesson ids are retained so the trace can distinguish lessons merely
seen from lessons actually used.

### 3. Delegate

The wrapper delegates through the project's existing worker runtime name and
contract. Worker frontmatter, persona body, tools, model, handoffs, and return
format remain unchanged. Relevant retrieved lessons are supplied as
task-specific context by the orchestrator; they are not installed permanently
in the worker.

### 4. Collect and trace

After delegation, the ACE orchestrator verifies the result and writes the trace
itself. The trace records the mapped agent and family, lesson ids seen and
cited, outcome and evaluator, useful notes, and friction. Workers may return
facts that help form a trace, but they do not own ACE files or the lifecycle.

### 5. Learn and govern

The orchestrator updates counters and checks configured thresholds. At a
threshold it invokes the generated reflector wrapper. The reflector proposes
from batched evidence, the curator emits typed decisions
(`ADD`/`UPDATE`/`DEPRECATE`/`MERGE`/`PROMOTE`/`REJECT`), and the warden runs the
deterministic gate. Only the warden, after an explicit one-at-a-time human
approval, may apply a delta. Retrieval is then regenerated for the next opted-in
session. No role silently edits the playbook.

## Runtime structure

```text
ace/
├── config/
│   ├── project.json
│   └── thresholds.json
├── prompts/
│   ├── reflector.md
│   ├── curator.md
│   └── warden.md
├── schema/
│   ├── trace.schema.json
│   └── bullet.schema.json
├── proposals/
│   └── applied/
├── scripts/
│   ├── generate_ace_agents.js
│   ├── prepare_delegation.js
│   ├── capture_trace.js
│   ├── finalize_task.js
│   ├── retrieval.js
│   ├── check_threshold.js
│   ├── update_counters.js
│   ├── gate.js
│   ├── apply_delta.js
│   ├── inspect_update.js
│   └── validate_install.js
├── runtime-version.json
├── state/
│   └── live-exclusions.json
├── traces/
│   ├── processed/
│   └── CAPTURE_GUIDE.md
├── playbooks/
│   ├── _global.md
│   ├── families/
│   ├── archive/
│   └── <agent>.md
└── README_MEDIATED.md
```

## Durable playbooks and generated instructions

Playbooks preserve content, lifecycle status, counters, tags, scope,
provenance, and source trace ids. Generated instructions contain only the safe
operational view needed for a live task. A typical durable entry is:

```md
## P-014 — active — used:12 helped:9 hurt:1
Before creating a file, verify the target path and extension.

tags: [filesystem, write, path]
counters: helped_confirmed=7; helped_provisional=2; hurt_confirmed=1; hurt_provisional=0
provenance: source_trace_ids=[T-108, T-201]; created_at=2026-09-16T10:00:00Z; created_by=reflector+curator; batch_id=batch-2026-09-16
```

The generated view carries the directive and stable id, not governance
metadata. Quarantined, deprecated, and live-excluded rules are not served.

## Human control and safety

Mechanical validation precedes semantic review. A passing gate does not imply
permission to write. The warden must use the host's dedicated question tool,
ask one approval question at a time, and pass verifiable sign-off to
`apply_delta.js`. Higher-priority project and safety instructions always win.

Mediated opt-in is equally strict: installing ACE does not authorize changing
the default orchestrator route, worker definitions, or global behavior. A task
participates only when the user or an explicit project mechanism invokes the
`-ace` wrapper.

## Script responsibilities

- `generate_ace_agents.js`: renders and checks lifecycle wrappers.
- `prepare_delegation.js`: maps a canonical scope and emits the lesson manifest
  passed to the unchanged worker. Invoke it with explicit `--task-id`,
  `--agent`, and `--platform`; the platform is mandatory even when only one is
  enabled. `manifest_id` is a deterministic consistency checksum for detecting
  accidental changes, not a signature or security boundary.
- `capture_trace.js`: validates and records one contributor's trace evidence.
- `finalize_task.js`: completes counters only for that task, then performs
  threshold handling without consuming unrelated pending traces.
- `retrieval.js`: derives active runtime instructions from playbooks.
- `check_threshold.js`: determines whether a batch stage is due.
- `update_counters.js`: folds trace evidence into bullet counters.
- `gate.js`: validates a curator decision before review.
- `apply_delta.js`: applies a signed-off delta and regenerates retrieval.
- `inspect_update.js`: produces a read-only update inventory from the target
  and `runtime-version.json`; it does not reconcile or write files.
- `validate_install.js`: verifies structural and configuration completeness.

Install this mode with
[INSTALL_PROMPT_MEDIATED.md](../INSTALL_PROMPT_MEDIATED.md).
