# ACE — Agentic Context Engineering

ACE is a project-agnostic operational-memory lifecycle for local agent teams.
It turns execution traces into evidence-backed, versioned lessons and serves
the right active lessons back at the right scope. Agents cannot silently
rewrite their own durable instructions.

This repository is an installable **kit**, not a configured team. A host
project supplies its real agents, platforms, names, paths, and capabilities.
The kit contains no real installation's traces, decisions, learned rules, or
`project.json`.

## Choose an integration mode

ACE supports two explicit installation models:

| | Embedded | Mediated |
| --- | --- | --- |
| Entry point | Existing participating agents | Opt-in `<orchestrator>-ace` wrapper |
| Worker changes | Adds scoped ACE behavior to selected agents | **None**; workers remain untouched |
| Orchestrator | ACE lifecycle merged into its behavior | One ACE-free persona, standard wrapper unchanged, second `-ace` wrapper |
| Default behavior | ACE is part of selected agents' normal workflow | Standard runtime remains non-ACE |
| Best for | Teams that want ACE native in agent workflows | Teams that require strict opt-in and zero worker modification |

Use exactly one model for a host installation:

- **Embedded:** [installation prompt](INSTALL_PROMPT_EMBEDDED.md), [English
  runtime reference](ace/README_EMBEDDED.md), [riferimento
  italiano](ace/README_EMBEDDED_IT.md).
- **Mediated:** [installation prompt](INSTALL_PROMPT_MEDIATED.md), [English
  runtime reference](ace/README_MEDIATED.md), [riferimento
  italiano](ace/README_MEDIATED_IT.md).

## Install, update, or migrate

These are separate operations:

- **Install** creates ACE in a project that has no existing installation. Use
  the installation prompt for the selected mode above.
- **Update** advances an existing installation while preserving its embedded
  or mediated paradigm, project configuration and behavior, and accumulated
  runtime data. Follow [UPDATE_PROMPT.md](UPDATE_PROMPT.md); it is the update
  procedure rather than another installer.
- **Migration** changes between embedded and mediated integration, or
  materially restructures project-owned agent behavior. It requires a
  separately reviewed migration plan and explicit approval.

An older embedded installation may have no `integration_mode` field. Updating
it adds `integration_mode: "embedded"` and refreshes its existing embedded
wiring; this is legacy normalization, not a migration. An update never
silently changes paradigms.

Before an update, run the read-only inspector:

```text
node <KIT_ROOT>/ace/scripts/inspect_update.js --target <TARGET_ROOT>
```

Always use the inspector under `KIT_ROOT`, never an installed target copy.
It reports version evidence, the detected integration mode, kit-owned file
states, managed merges, content that must be preserved, conflicts, and required
configuration normalization; `write_performed` is always `false`. The
`ace/runtime-version.json` manifest supplies the runtime version, ownership
classes, and hashes used by that report. It is inventory evidence, not
permission to overwrite project-owned files or learned/runtime state. The
complete reconciliation and validation rules remain in `UPDATE_PROMPT.md` and
are intentionally not duplicated here.

The manifest's `ownership.mode_specific` section lists documentation by
integration mode. An installation copies only the README pair for its selected
mode: `README_EMBEDDED(.IT).md` for embedded or `README_MEDIATED(.IT).md` for
mediated. The lifecycle wrappers generated for an enabled platform are named
exactly `<runtime_prefix>/ace/reflector`, `<runtime_prefix>/ace/curator`, and
`<runtime_prefix>/ace/warden`; orchestrator delegates must use those exact
names rather than bare role labels.

## Operator skills

The kit provides two project-level operator skills:

- [install-ace](.github/skills/install-ace/SKILL.md) routes clean
  installations to the embedded or mediated prompt and requires a pre/post
  behavioral preservation check;
- [update-ace](.github/skills/update-ace/SKILL.md) updates an existing
  installation within its current paradigm while preserving project-owned
  behavior, selected models, learned data, and runtime state.

The files under `.github/skills/` are the canonical, versioned sources. They
do not replace the detailed prompts; each skill classifies the operation,
loads the appropriate prompt, and adds a mandatory effective-contract
baseline and equivalence gate.

The rationale and detailed findings behind this preservation protocol are
documented in [ANALISI_PERDITE_PERSONAS_AGENTI.md](ANALISI_PERDITE_PERSONAS_AGENTI.md).

When the harness discovers project skills, invoke them while the ACE kit is
the active workspace and provide the target repository path. To make requests
such as “install ACE here” or “update ACE” discoverable while working directly
inside another repository, publish or copy these two skill directories to the
harness's supported user-level skill directory. Preserve the directory names
and refresh the user copies from this repository when the kit changes. The
repository copies remain the source of truth; do not install operator skills
into each target as part of the ACE runtime. A user-level copy resolves
`KIT_ROOT` independently from its own location: supply or configure the local
ACE kit path when it cannot be uniquely discovered. It must never use its own
directory or the target's installed runtime as the kit source.

### Install the operator skills from chat

Open the ACE kit as the active workspace and ask the chat agent:

```text
Install the ACE operator skills from <KIT_ROOT>/.github/skills/install-ace
and <KIT_ROOT>/.github/skills/update-ace into the user-level skill directory
supported by this harness. Keep the repository copies as the source of truth,
do not modify their contents, do not install ACE into this repository, and
verify that both user-level skills are discoverable.
```

Replace `<KIT_ROOT>` with the absolute path of this repository. The agent must
resolve the harness-supported user skill location rather than inventing one.
If the harness loads user skills only when a chat starts, open a new chat after
the copy. Repeat the same request after updating the kit to refresh the
user-level copies.

### Start an installation from chat

Open the destination repository as the active workspace, start a chat in which
the user-level skills are available, and provide both the kit and destination
paths:

```text
Install ACE in this repository using the install-ace skill.
KIT_ROOT is <KIT_ROOT>.
TARGET_ROOT is <TARGET_ROOT>.
Use embedded integration.
Use the personas paradigm for the agent team.
```

Omit the persona line when the default agent representation is preferred. Use
`Use mediated integration` instead of `Use embedded integration` for strict
opt-in mediation. The skill must classify the operation as a clean
installation, load the matching canonical installation prompt from `KIT_ROOT`,
preserve the target's effective agent contracts, run the required checks, and
report the preservation matrix. If ACE is already present, it must route to
update rather than treating the repository as a clean target.

### Start an update from chat

Open the installed project as the active workspace and ask:

```text
Update the existing ACE installation in this repository using the update-ace
skill.
KIT_ROOT is <KIT_ROOT>.
TARGET_ROOT is <TARGET_ROOT>.
Preserve the installed integration paradigm, project-owned agent behavior,
selected models, configuration, learned data, and runtime state.
```

The skill must use [UPDATE_PROMPT.md](UPDATE_PROMPT.md) and the update
inspector from `KIT_ROOT`, never the possibly stale installed copy under
`TARGET_ROOT`. A request to change between embedded and mediated is a migration,
not an update, and requires a separately reviewed plan and explicit approval.
Add `Use the personas paradigm for the agent team.` when the update should
preserve or adopt that representation.

Agent harness, model provider, and selected model are independent contract
dimensions. Converting agent files to one harness may change paths,
frontmatter fields, tool nomenclature, and delegate syntax, but must preserve
the selected model and effective capabilities whenever that harness supports
them. Any necessary substitution requires evidence and explicit approval.

In mediated mode, opt-in is a hard boundary. Installation must not turn ACE on
globally, reroute the standard orchestrator, or modify workers. The existing
runtime name keeps normal behavior; only the same name suffixed with `-ace`
performs mapping, lesson retrieval, delegation, trace capture, and learning.

## What ACE does

1. An orchestrator records a compact **trace** after a relevant task.
2. A batch **reflector** derives candidate lessons from trace evidence.
3. A **curator** emits typed decisions:
   `ADD`/`UPDATE`/`DEPRECATE`/`MERGE`/`PROMOTE`/`REJECT`.
4. A **warden** runs deterministic validation and presents semantic decisions
   for explicit human review.
5. Only after verifiable sign-off does `apply_delta.js` update the durable
   playbook and regenerate operational instructions.

```text
trace → proposal → decision → gate → human sign-off
      → playbook update → retrieval → better next session
```

The playbook is the reviewable source of truth, including lifecycle state,
scope, counters, tags, and provenance. Generated instructions are the compact,
filtered runtime view. Deprecated, quarantined, and live-excluded rules are
not served.

## Mediated lifecycle in one view

The opt-in wrapper maps a task to canonical configured worker/family scopes,
retrieves active global and scoped lessons, and delegates through the existing
worker runtime without changing it. It then collects the result and evidence,
writes the trace, updates counters, and checks thresholds. When due, it invokes
reflector → curator → warden. Warden approval gates the only durable write, and
retrieval is regenerated afterward.

Workers may return task facts, but the mediated orchestrator owns mapping,
lesson delivery, trace capture, and lifecycle orchestration. The canonical
orchestrator persona remains ACE-free and is shared by both its standard and
`-ace` wrappers.

## Repository layout

```text
INSTALL_PROMPT_EMBEDDED.md   # installer for direct agent integration
INSTALL_PROMPT_MEDIATED.md   # installer for strict opt-in mediation
UPDATE_PROMPT.md             # updater for an existing installation
.github/skills/
├── install-ace/SKILL.md      # clean-install routing and preservation gate
└── update-ace/SKILL.md       # conservative update and equivalence gate
ace/
├── README_EMBEDDED.md       # full embedded runtime reference (English)
├── README_EMBEDDED_IT.md    # full embedded runtime reference (Italian)
├── README_MEDIATED.md       # mediated architecture and lifecycle (English)
├── README_MEDIATED_IT.md    # mediated architecture and lifecycle (Italian)
├── runtime-version.json     # version, ownership, and kit-file hash contract
├── prompts/                 # reflector, curator, and warden behavior
├── scripts/                 # generation, inspection, retrieval, gate, apply
├── schema/                  # trace and playbook bullet contracts
├── templates/               # installer inputs for generated integrations
├── traces/                  # capture guide and empty processed state
└── config/                  # template configuration and thresholds
playbooks/                   # empty durable-memory skeleton
test/                        # synthetic runtime tests
package.json                 # npm test entry point
```

## Safety properties

- Runtime identities, team labels, paths, platforms, and tools come from the
  host's materialized `ace/config/project.json`.
- Reflector and curator propose and decide; they never directly edit playbooks.
- Warden requires deterministic validation and explicit, one-at-a-time human
  confirmation through the host's dedicated question tool.
- `apply_delta.js` is the sole durable playbook mutation path after sign-off.
- Higher-priority project and safety instructions always win.
- Installers preserve dirty-worktree changes and do not copy runtime evidence
  or state from another project.
- Mediated mode preserves worker definitions and keeps standard invocation
  ACE-free; global documentation may advertise opt-in but cannot activate it.

## Developing this kit

Run `npm test` to exercise generation, retrieval, gating, delta application,
and installation validation against synthetic fixtures. Kit development must
remain generic: do not commit a real `project.json`, host traces, proposals,
decisions, counters, or learned bullets.
