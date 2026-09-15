# ACE runtime — reference

ACE (Agentic Context Engineering) is a project-agnostic operational-memory
lifecycle for a local team of agents. This document explains the runtime that
lives under `ace/` and `playbooks/` once ACE is installed into a host
project: what each piece is for, how the cycle flows, how configuration
drives behavior, the safety gates, and the boundary between the one-time
installer and the durable runtime.

This kit repository (`ace-agent-learning-framework`) is itself a **template
project**: it contains the generic runtime plus the installer
(`INSTALL_PROMPT.md`) that copies it into a host project and fills in that
project's specifics. Nothing under `ace/` or `playbooks/` here names a real
team, agent, or domain — every project-specific detail is either a
placeholder or lives in `ace/config/project.json`, which the installer
materializes and this kit intentionally leaves as a template.

## Runtime layout

```text
ace/
├── config/
│   ├── project.template.json   # copied to project.json and filled in at install time
│   └── thresholds.json         # batch-size thresholds for auto-invocation (see below)
├── prompts/
│   ├── reflector.md            # conceptual source of the reflector role
│   ├── curator.md              # conceptual source of the curator role
│   └── warden.md               # conceptual source of the warden role
├── proposals/                  # reflector output (batches) and curator decisions, until applied
│   └── applied/                # processed batches (proposals + decisions + gate report), kept for audit
├── schema/
│   ├── trace.schema.json       # shape of one trace file
│   └── bullet.schema.json      # shape of one playbook bullet
├── scripts/                    # deterministic Node scripts; the only code that writes runtime state
│   ├── generate_ace_agents.js  # renders per-platform ACE agent wrappers from prompts/ + config
│   ├── retrieval.js            # syncs playbooks/*.md into each platform's instruction files
│   ├── check_threshold.js      # reports whether a batch is large enough to auto-invoke the next stage
│   ├── update_counters.js      # sums trace outcomes into bullet used/helped/hurt counters
│   ├── gate.js                 # mechanical validation of a curator decisions file
│   ├── apply_delta.js          # applies a signed-off gate report to playbooks/*.md
│   ├── validate_install.js     # checks that a runtime installation is structurally complete
│   └── lib/playbook.js         # shared helpers (config loading, playbook parsing/serialization)
├── state/
│   └── live-exclusions.json    # generated at runtime; excluded bullets pending curator action
└── traces/
    ├── CAPTURE_GUIDE.md         # how to write one trace file
    └── processed/               # traces already folded into a reflector batch

playbooks/
├── _global.md                  # bullets shared by every agent
├── families/                   # bullets shared by a cross-cutting task family, not a single agent
├── archive/                     # deprecated/merged bullets, kept for provenance
└── <agent>.md                  # one file per agent named in config/project.json (created at install time)
```

## The cycle

ACE runs in four stages, each with a narrow job and a narrow set of write
permissions. No stage skips the one before it, and no stage but the gate +
warden ever writes to `playbooks/*.md`.

1. **Trace capture** — the orchestrator agent (the one named in
   `orchestrator_agent`) writes one trace file per involved agent to
   `ace/traces/<task_id>__<agent>.json` after each session, following
   [`traces/CAPTURE_GUIDE.md`](traces/CAPTURE_GUIDE.md) and
   [`schema/trace.schema.json`](schema/trace.schema.json). Traces are the only
   raw evidence the rest of the cycle works from.
2. **Reflector** ([`prompts/reflector.md`](prompts/reflector.md)) — runs in
   batch, reads every unprocessed trace, and writes structured *proposals* to
   `ace/proposals/<batch>.json`. It never edits a playbook and never emits a
   typed operation; it only proposes, with evidence and a stated
   `relation_to_existing` bullet.
3. **Curator** ([`prompts/curator.md`](prompts/curator.md)) — reads a
   proposals file and turns each proposal into a typed operation (`ADD`,
   `UPDATE`, `DEPRECATE`, `MERGE`, `PROMOTE`, or `REJECT`), written to
   `ace/proposals/<batch>-decisions.json`. It still never edits a playbook —
   its output is "ready for the gate", not applied.
4. **Warden** ([`prompts/warden.md`](prompts/warden.md)) — the only stage
   that touches `playbooks/*.md`, and only through two deterministic scripts:
   `gate.js` (mechanical validation) and `apply_delta.js` (the actual write,
   which also re-runs `retrieval.js` so instruction files never drift). Every
   write requires an explicit human confirmation, asked one step at a time
   through the platform's dedicated question tool — never inferred from
   silence or a relayed "the user agreed".

Each transition (reflector→curator, curator→warden) has a double trigger:
on-demand, whenever a human invokes the next stage, or automatic, when
`check_threshold.js` reports the configured threshold reached. Reaching a
threshold never bypasses the warden's human sign-off — it only decides
whether the *next agent* is invoked automatically.

## Configuration: `ace/config/project.json`

Everything that varies between host projects is a value in this file, never
a name hardcoded in a prompt or script. It is created by copying
[`config/project.template.json`](config/project.template.json) at install
time and is never checked into the kit itself. Key fields:

- `team_name` — human-readable team or project label used in generated text.
- `provisional_evaluator` — filesystem-safe `<slug>-auto` label used for
  immediate self-report trace evidence in `outcome.evaluated_by`.
- `orchestrator_agent` — the single agent allowed to write traces, run
  counters, and invoke the reflector.
- `participating_agents` — every other agent whose sessions produce traces
  and who gets a scoped playbook (`playbooks/<agent>.md`).
- `platforms.<copilot|claude>` — per-platform `enabled` flag, directory
  layout (`agents_dir`, `global_instructions_file`, `agent_instructions_dir`),
  `runtime_prefix` (`gh`/`cl`), `model`, and the `tools` array each ACE role
  is allowed to use on that platform. `generate_ace_agents.js` reads this to
  render each platform's wrapper; nothing about a platform is assumed inside
  `prompts/*.md`.

[`config/thresholds.json`](config/thresholds.json) holds the batch-size
numbers `check_threshold.js` reads — how many unprocessed traces trigger the
reflector, how many proposals trigger the curator, how many decisions
trigger the warden. These are operational tuning knobs, read at runtime, not
baked into any prompt.

## Safety gates

- **Deterministic before judgment**: `update_counters.js` and
  `check_threshold.js` do pure, mechanical accounting (sum trace outcomes,
  count files) — they never decide whether a lesson is good, only whether
  enough evidence/volume exists to invoke the next role.
- **Confirmed vs. provisional evidence**: every bullet counter is split into
  `_confirmed` (verified outcome, human feedback, gate replay, or reflector
  LLM judgment) and `_provisional` (self-report only). Structural decisions
  (`DEPRECATE`, `PROMOTE`) are expected to rely on confirmed counters, not
  provisional ones — see `prompts/curator.md`.
- **Two-part gate**: `gate.js` only performs what is actually automatable —
  schema/enum validity, ID collisions, operation/state compatibility (e.g. a
  `PROMOTE` must originate from `quarantined`), and that cited trace evidence
  exists. The one thing it deliberately does **not** automate is semantic
  conflict between a new bullet and existing active bullets in the same
  scope — that is a human judgment call, posed explicitly to the warden's
  reviewer as a checklist before sign-off.
- **No silent writes**: `apply_delta.js` refuses to run unless the gate
  report it is given has `signed_off: true` **and** `all_mechanical_pass:
  true`. The warden never treats a relayed "the user confirmed" as
  sufficient without the literal question and literal answer from the
  platform's dedicated question tool.
- **Live exclusion, not silent drift**: `retrieval.js` recomputes, on every
  run, whether a bullet's confirmed `hurt` now outweighs its confirmed
  `helped`; if so it is excluded from what gets served to agents immediately,
  and the exclusion is persisted to `ace/state/live-exclusions.json` for the
  curator to formalize (or reverse) on its next run — a bad bullet never
  keeps being injected just because nobody has re-run the curator yet.

## Install-vs-runtime boundary

This repository plays two roles that must not be confused:

- **Kit / installer** — `INSTALL_PROMPT.md`, `ace/templates/*.md`, and
  `ace/config/project.template.json` exist only to be read once, by an
  installation agent, to bootstrap ACE into a different host project. They
  are never themselves the running system, and the kit's own copies of
  `ace/` and `playbooks/` stay empty of any real team's data — no traces,
  proposals, decisions, learned bullets, or `project.json` are ever
  committed here.
- **Runtime** — once installed, `ace/` and
  `playbooks/` become part of the host project and evolve there: traces
  accumulate, batches get processed, bullets get added/updated/deprecated,
  and `ace/config/project.json` holds that project's real configuration.
  The runtime does not depend on re-reading `INSTALL_PROMPT.md`; templates
  may remain as maintenance references, while `generate_ace_agents.js`,
  `retrieval.js`, and the gate/apply scripts keep generated assets in sync.

Re-running the installer against an already-installed project is an
upgrade, not a clean install — see `INSTALL_PROMPT.md` Phase 0 — and must
never overwrite accumulated traces, proposals, or playbook bullets.

## Commands

Run from the host project's root once ACE is installed (or from this kit's
root, against its own fixtures, when developing the kit itself):

```sh
node ace/scripts/generate_ace_agents.js [--check]   # render/verify per-platform ACE agent wrappers
node ace/scripts/retrieval.js [--check]             # sync playbooks/*.md into platform instruction files
node ace/scripts/validate_install.js                # check the installation is structurally complete
node ace/scripts/check_threshold.js reflector
node ace/scripts/check_threshold.js curator --file ace/proposals/<batch>.json
node ace/scripts/check_threshold.js warden   --file ace/proposals/<batch>-decisions.json
node ace/scripts/update_counters.js                 # before invoking the reflector on a batch
node ace/scripts/gate.js <decisions-file.json> [--sign-off]
node ace/scripts/apply_delta.js <gate-report.json>
npm test                                            # runs test/runtime.test.js against synthetic fixtures
```

See [`prompts/reflector.md`](prompts/reflector.md),
[`prompts/curator.md`](prompts/curator.md), and
[`prompts/warden.md`](prompts/warden.md) for the full behavioral contract of
each stage, and [`traces/CAPTURE_GUIDE.md`](traces/CAPTURE_GUIDE.md) for the
trace format in detail.
