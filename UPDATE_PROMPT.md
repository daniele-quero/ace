# ACE update prompt

Use this prompt once to update an **existing ACE installation** in another
local repository. The absolute directory containing this file is `KIT_ROOT`;
the absolute root of the repository containing the installed ACE instance is
`TARGET_ROOT`. This prompt works from any current directory.

You are the update agent. Complete the update and validate it; do not merely
report available changes. Never modify `KIT_ROOT`, and never import
project-specific or learned data from it into `TARGET_ROOT`.

## Absolute path convention

- `KIT_ROOT` and `TARGET_ROOT` are absolute, canonical paths resolved in
  Phase 0. `KIT_ROOT/...` and `TARGET_ROOT/...` in prose, and `<KIT_ROOT>` and
  `<TARGET_ROOT>` in commands, denote paths under those roots.
- Every file or directory you read, write, copy, compare, or execute is written
  below under one of these roots. Substitute the absolute root before each
  operation, adapt separators to the host OS, and quote paths that contain
  spaces.
- Never resolve a bare relative path against the current working directory,
  the chat workspace, or a skill directory. A bare script name such as
  `apply_delta.js` denotes `TARGET_ROOT/ace/scripts/apply_delta.js`, except
  the update inspector, which always runs from `KIT_ROOT`.
- Run destination scripts by absolute path with `TARGET_ROOT` as the working
  directory, for example `node <TARGET_ROOT>/ace/scripts/validate_install.js`.
- Manifest keys and `source_paths` values, `project.json` path fields, and
  links or commands written into destination files stay repository-relative,
  as the runtime and templates define them. Resolve them against the stated
  root when accessing a file; never write absolute machine paths into
  destination agents, personas, configuration, or instructions.

## Operation and paradigm invariants

Classify the requested operation before writing:

- **Install** creates ACE where no installation exists. This prompt does not
  authorize an install; use the appropriate installation prompt instead.
- **Update** advances an existing installation within its current integration
  paradigm while preserving its configuration, domain behavior, and runtime
  data. This is the operation authorized by this prompt.
- **Migration** changes integration paradigm or materially restructures
  project-owned agent behavior. It requires an explicit migration plan and
  explicit approval; it is not an update.

ACE has two current paradigms:

- **embedded**: ACE behavior is integrated into participating operational
  agents and the orchestrator;
- **mediated**: ordinary agents remain unchanged and a distinct opt-in
  `<standard-runtime-name>-ace` orchestrator wrapper owns the ACE lifecycle.

Determine the installed paradigm from configuration and behavior, not from
filenames alone. Preserve it throughout the update.

A legacy installation whose behavior is embedded but whose configuration
predates `integration_mode` is **legacy embedded**. Normalize it to the current
explicit embedded representation by setting `integration_mode` to `embedded`
and bringing its embedded lifecycle wiring up to date. This normalization is
an update, not a paradigm migration.

Never silently convert embedded to mediated or mediated to embedded. If
evidence conflicts or the paradigm is ambiguous, show the evidence and ask the
user to choose the existing paradigm. If the user asks to change paradigms,
stop this workflow and report that a separately approved migration is needed.

## Interaction rules

- Use the runtime's dedicated question tool for every decision:
  `ask_user` or `vscode/askQuestions` on GitHub Copilot, and
  `AskUserQuestion` on Claude Code.
- Ask exactly one decision at a time. Do not bundle unrelated choices. Use a
  multi-select only when the single decision inherently selects multiple
  scopes or platforms.
- Provide the evidence, safe default, and consequences with each question.
- Never infer approval from silence, conversational text, repository state, or
  a previous decision.
- If a required decision exists and no dedicated question tool is available,
  stop without making the disputed change and report the blocker.
- Do not ask about deterministic, non-conflicting replacement of kit-owned
  files. Do ask before resolving contradictory ownership, deleting an unknown
  file, changing domain behavior, dropping configuration, or choosing between
  divergent project customizations.

## Ownership model

Classify every relevant destination path before changing it. Content, markers,
generation metadata, and destination conventions outweigh filename alone.

| Class | Typical content | Update rule |
|---|---|---|
| **Kit-owned** | ACE runtime scripts and libraries, lifecycle prompts, schemas, stock templates, framework documentation, canonical runtime skills, generated ACE-only lifecycle wrappers and runtime-skill copies | Replace with the corresponding current kit version, then reapply only destination path/name substitutions explicitly required by the file's contract. Do not carry forward local edits silently; resolve generated-skill conflicts before regeneration. |
| **Project-owned** | Operational personas, ordinary agent wrappers, registries/generators, global project instructions outside ACE-owned blocks, domain docs and code | Preserve behavior and metadata. Make only the smallest integration edit required by the current paradigm. Never replace from the kit. |
| **Managed ACE merge** | `TARGET_ROOT/ace/config/project.json`, ACE rules in `TARGET_ROOT/.gitignore`, generated retrieval blocks, ACE sections embedded in project-owned files, wrapper registrations and delegate lists | Reconcile structurally: preserve project values and unrelated content, refresh ACE-owned fields/blocks, and regenerate where a canonical generator exists. |
| **Runtime data** | playbook lessons, traces, proposals, decisions, counters, applied-batch records, rectification audits, task/delegation state, other accumulated evidence | Runtime updates preserve byte-for-byte unless a documented, necessary, backward-compatible data migration exists. Never replace with kit data, reset, truncate, synthesize, or delete. |

An empty kit skeleton is not evidence that destination runtime data should be
emptied. `.gitkeep`, format comments, and sample data are not replacements for
real destination content. When ownership remains uncertain, preserve the file,
record the ambiguity, and ask before changing it.

The canonical kit source is `KIT_ROOT/.github/skills/rectify-playbook/`; its
internal installed runtime assets remain under
`TARGET_ROOT/ace/skills/rectify-playbook/`, mapped by manifest `source_paths`.
Both are kit-owned at their respective roots. The
generated platform copies have exact-subtree ownership, not ownership of
`TARGET_ROOT/.github/skills/` or `TARGET_ROOT/.claude/skills/` as a whole. A
matching directory name alone does not establish provenance. Unrelated host
skills are project-owned; the kit's `install-ace` and `update-ace` operator
skills remain separate user-level tools and must not be installed into host
targets.

## Phase 0 — establish roots and a safe baseline

1. Resolve `KIT_ROOT` as the absolute, canonical directory containing this
   file (an operator skill may pass the same absolute path explicitly) and
   `TARGET_ROOT` as the absolute, canonical root of the installed repository.
   Verify that they are different local directories, that neither contains
   the other, and that `TARGET_ROOT` is the repository being updated.
2. **Run this exact command as soon as the roots have been verified, before
   reading any target file, Git status, or destination instruction:**

   ```text
   node <KIT_ROOT>/ace/scripts/inspect_update.js --target <TARGET_ROOT>
   ```

   Run it from `KIT_ROOT`, never from an installed target copy. Preserve its
   `write_performed: false` report as the authoritative initial inventory of
   installed/current versions, the complete kit-owned file inventory, managed
   merges, protected data, conflicts, and required normalization. Retain the
   prior installed manifest and its hashes until generation finishes; they
   establish upgrade provenance for generated runtime-skill copies.
3. Read all applicable destination repository instructions before any write.
4. Inspect `git -C <TARGET_ROOT> status`, including staged, unstaged,
   untracked, conflicted, and ignored ACE paths. Save the baseline status and
   relevant diffs for later comparison. Also record
   `git -C <KIT_ROOT> status` to prove later that the kit was not modified.
5. Detect unresolved merges/rebases and conflict markers. Do not update a
   conflicted path. If a conflict touches the update, stop and identify it;
   otherwise preserve it and avoid that path.
6. Locate the installed ACE root, materialized project configuration,
   playbooks, lifecycle agents, generated retrieval blocks, wrappers,
   personas, registries/generators, and runtime-data directories.
7. If no existing ACE installation is evidenced, stop: that is an install.
8. Do not stash, reset, checkout, clean, stage, commit, or reformat pre-existing
   changes. Record which update paths were already dirty and preserve those
   edits during reconciliation.

## Phase 1 — inspect and classify without editing

Build an inventory containing path, ownership class, source of truth,
generated/manual status, local modifications, and proposed action.

Read both kit and destination versions of:

- lifecycle prompts and generated lifecycle wrappers;
- runtime scripts and libraries;
- `KIT_ROOT/ace/scripts/rectify_playbook.js` and
  `TARGET_ROOT/ace/scripts/rectify_playbook.js`; the complete canonical kit
  source `KIT_ROOT/.github/skills/rectify-playbook/` and the mapped
  destination assets `TARGET_ROOT/ace/skills/rectify-playbook/`, each with its
  `SKILL.md` and review contract;
- existing `TARGET_ROOT/.github/skills/rectify-playbook/` and
  `TARGET_ROOT/.claude/skills/rectify-playbook/` subtrees, including extra
  files, local modifications, prior-manifest ownership, and configured
  platform enablement;
- schemas and stock templates;
- ACE framework documentation;
- `KIT_ROOT/ace/config/project.template.json` and
  `TARGET_ROOT/ace/config/project.json`;
- retrieval markers and the ACE rules in `TARGET_ROOT/.gitignore`;
- project-owned operational wrappers/personas touched by ACE;
- registries, manifests, generators, and sync scripts that own agent files;
- playbooks, traces, proposals, decisions, counters, and state locations.

### Pre-update effective contract

For every operational agent and entry point, capture its effective contract
across wrappers, personas, inline bodies, registries, generators, referenced
instructions, and handoffs. Record:

- harness, runtime identity, description, selected model and provider, tools,
  delegates, handoffs, invocation state, and argument hints;
- required inputs, preconditions, ordered workflow, branching, parallelism,
  context isolation, and iteration limits;
- delegation payloads, return contracts, success criteria, verification,
  fallbacks, escalation, and stop conditions;
- safety gates, prohibited actions, authorized alternatives, file scope, Git
  side effects, and user approvals.

Treat harness, model provider, and selected model as independent contract
dimensions. A platform representation change may require different paths,
frontmatter fields, tool names, or delegate syntax. It does not authorize
changing a supported selected model or effective capability. If a previous
selection is no longer supported, prove the incompatibility and obtain an
explicit choice before substituting it.

Inventory logical agents by canonical id, platform runtime name, wrapper,
persona/source of truth, tools, delegates/handoffs, model, user-facing state,
and registry owner. For mediated installations, separately identify the
ordinary orchestrator entrypoint and the opt-in ACE entrypoint.

Determine whether destination differences are:

1. an older kit version;
2. required project materialization;
3. project-owned domain behavior;
4. accumulated runtime data;
5. an unexplained local customization or active dirty-worktree edit.

Do not equate "different from the kit" with "safe to replace."

If the kit provides the read-only update inspector and its runtime-version
manifest contract (the **runtime-version manifest contract**), the initial
inspection command is exactly:

```text
node <KIT_ROOT>/ace/scripts/inspect_update.js --target <TARGET_ROOT>
```

Always invoke `inspect_update.js` from `KIT_ROOT`; **never run or trust a target copy**,
because an installed copy can be stale or locally modified. Run it in
read-only/report mode and treat its output as inventory evidence. The contract
may identify installed/current runtime versions, owned paths, compatibility,
and required migrations; it does not grant permission to overwrite
project-owned content or runtime data. Do not create, modify, or emulate the
checker or manifest if absent, and do not make this update depend solely on
their presence.

Interpret version and provenance evidence before planning writes:

- An installed version older than the kit is an ordinary update candidate.
- An installed version newer than the kit is a
  **newer-installed/downgrade conflict**, not an ordinary update. Stop before writing and report that the
  requested kit would downgrade the installation; use a suitable newer kit or
  obtain a separate explicit downgrade decision and plan.
- When a legacy installation has no runtime-version manifest, differing
  regular kit-owned files whose only issue is that no installed manifest
  proves provenance form one grouped **`unverified`** set. Present one decision
  for the whole set, with its complete path list and common evidence; do not
  turn those files into separate conflict questions.
- True conflicts remain per-file decisions. These include a manifest-proven
  local modification, incompatible or malformed manifest evidence, a
  non-regular path, an inspection/read error, or differing project behavior.
  Do not fold a true conflict into the legacy `unverified` group.
- Same-name unowned runtime-skill contents that differ from the current kit,
  locally modified skill contents, or unknown extra files are true conflicts,
  not permission to adopt or overwrite the directory as an old ACE asset.

## Phase 2 — confirm the existing paradigm

Use all of the following evidence:

- `integration_mode`, when present;
- whether ordinary participating agents permanently load ACE instructions;
- whether one standard orchestrator and a distinct `-ace` entrypoint coexist;
- canonical-to-runtime mappings and orchestrator entrypoint metadata;
- who owns retrieval, trace writing, counters, threshold checks, and lifecycle
  delegation;
- global activation or opt-in routing behavior.

Classify exactly one of:

- current embedded;
- legacy embedded, to be normalized to explicit current embedded;
- current mediated;
- ambiguous/inconsistent.

For embedded, preserve its participating-agent integration and ordinary
activation semantics. For mediated, preserve strict opt-in behavior, the
unchanged standard route, unchanged workers, and complete lifecycle ownership
by the ACE wrapper. Never "repair" one paradigm by imposing the other.

If configuration claims one paradigm but operational behavior implements the
other, ask one question presenting both bodies of evidence. Do not edit until
resolved.

## Phase 3 — create the update plan

Produce a path-level plan grouped by ownership. Include old/new runtime
versions when the available manifest contract supplies them, compatibility
notes, dirty-file handling, regeneration commands, and validation commands.
Include the canonical `rectify-playbook` skill and complete copies on every
enabled platform even when an older installation has none. This is required
on every update or upgrade, not an optional feature or paradigm migration.

Identify every destructive or semantic conflict before writing. Resolve each
true conflict with one dedicated-tool question at a time. Resolve a legacy
no-manifest `unverified` set with the single grouped decision defined above,
not one question per file. A safe conflict choice must include at least
preservation of the destination behavior; never offer only overwrite choices.

Take an in-repository backup only if destination instructions require one or
the user explicitly chooses it. Do not duplicate secrets or ignored runtime
data into a tracked location. Git history and the saved baseline diff are not
permission to overwrite uncommitted work.

## Phase 4 — update kit-owned framework files

Replace kit-owned files from the current kit sources. For each
`ownership.kit_owned` key `path`, plus the preserved mode's
`ownership.mode_specific` entries, replace `TARGET_ROOT/<path>` with
`KIT_ROOT/<source>`, where `<source>` is the current kit manifest's
`source_paths[path]` when present and otherwise `path`. Destination paths
remain the manifest keys; do not rename installed runtime assets or use the
old installed manifest to locate new kit sources. The relocated skill source
is `KIT_ROOT/.github/skills/rectify-playbook/`, materialized as the internal
runtime assets `TARGET_ROOT/ace/skills/rectify-playbook/`.
Update the complete mutually compatible framework set, not isolated files:

- lifecycle prompts for reflector, curator, and warden;
- runtime scripts and their libraries;
- `TARGET_ROOT/ace/scripts/rectify_playbook.js` and the complete kit-owned
  `TARGET_ROOT/ace/skills/rectify-playbook/` skill, including its review
  contract;
- schemas used by those scripts;
- stock templates consumed by generators or installers;
- framework documentation appropriate to the preserved paradigm;
- ACE-owned generated lifecycle assets, preferably through their generator.

Do not copy a materialized `KIT_ROOT/ace/config/project.json`, generated
destination wrappers, fixtures, temporary files, source-project runtime
output, or learned data from the kit.

Before replacing a locally modified kit-owned file, determine whether its diff
is required destination materialization, an old framework implementation, or
project-specific behavior. Move true project configuration into supported
configuration or project-owned extension points where possible. If preserving
a local customization would change the new framework contract, ask whether to
port it, omit it, or stop. Never silently discard or blindly paste old code
over new code.

Keep prompts, scripts, schemas, templates, and docs version-compatible:

- a script must emit data accepted by the updated schema;
- prompts must describe actual script names, arguments, ownership, and gates;
- templates must generate files conforming to updated runtime contracts;
- documentation must describe only the preserved paradigm and installed
  behavior;
- lifecycle delegation and dedicated-question sign-off must remain intact;
- ordinary learning remains warden-only through `apply_delta.js`, with
  separate explicit human sign-off and apply confirmations; the only
  external-correction exception is user-invoked `rectify-playbook`
  through `rectify_playbook.js` under mandatory independent semantic review.

### Installed runtime-skill copies

Use `node <TARGET_ROOT>/ace/scripts/generate_ace_agents.js` to install/check
the complete canonical skill at `TARGET_ROOT/.github/skills/rectify-playbook/`
for enabled Copilot and `TARGET_ROOT/.claude/skills/rectify-playbook/` for
enabled Claude. Install missing copies
on older hosts, including updates from manifests without `source_paths`.
The internal asset directory does not replace these invocable destinations.
Every copy keeps `user-invocable: true`, `disable-model-invocation: true`, and
its user-only description and entry gate. Preserve platform selection; never
create a disabled platform's copy or replace a whole skills root.
Inventory the complete canonical skill directory as well; unknown destination
extras are conflicts, not extensions to propagate into generated copies.

The generator accepts absent or current copies and clean older copies proven
by the prior installed manifest's hashes. Current kit hashes alone do not
prove that a differing destination is owned. Same-name unowned differences,
local modifications, non-regular paths, and unknown extra files block
generation. Before regeneration, the updater must resolve only the explicitly
approved conflicts inside the exact `rectify-playbook/` subtree. Do not use a
blanket skills-directory overwrite or remove unrelated host skills. If a
conflict cannot be resolved without losing unapproved content, stop.

The skill is user-invocable only. Preserve `user-invocable: true`,
`disable-model-invocation: true`, and its user-only description and entry
gate: never enable automatic selection. Only the user may invoke it, for
example with `/rectify-playbook`. Agents, subagents, handoffs, hooks, normal
ACE roles, and orchestration must never invoke, delegate, or forward this
skill, relabel current-cycle work as external, or use it as a gate/evidence
fallback. Only a genuinely separate explicit external request that the user
invokes is eligible, subject to harness manual-invocation restrictions and
independent review of its origin.

The skill handles user-invoked corrections outside
ordinary learning without mandatory traces. Preserve its skill/checklist
semantic workflow separately from the script's
deterministic guards, hashes, audit, and retrieval responsibilities. Requests
must specify one playbook, explicit existing `P-XXX` IDs, expected-before and
replacement-after content, and rationale; missing or ambiguous targets block.
Independent read-only subagent semantic review is mandatory; unavailable,
rejected, or unknown review blocks application. The initial request authorizes
application after successful review within its unchanged scope; do not require
renewed human approval unless scope, intent, or targets change.
Existing contents only: no ADD/MERGE, moves, status changes, counter resets,
fabricated traces/proposals/ordinary gate evidence, or consumption of pending
lifecycle batches.

## Phase 5 — migrate `project.json` field by field

Treat `KIT_ROOT/ace/config/project.template.json` as the current shape, not as
a replacement configuration. Parse the destination configuration and construct
the updated result field by field.

For every current template field:

1. preserve a valid destination value;
2. transform it only when the new contract requires a documented shape change;
3. add a missing field using a value derived from existing destination
   evidence;
4. ask one question if no safe value can be derived;
5. validate references, uniqueness, path syntax, and capability claims.

In particular:

- normalize missing legacy `integration_mode` to `embedded`;
- preserve an explicit valid `integration_mode`;
- preserve `team_name`, `provisional_evaluator`, and canonical orchestrator id;
- preserve exact embedded participants, or exact mediated mapped workers, as
  required by the installed paradigm;
- preserve stable `agent_families` and validate every member;
- preserve platform enablement; do not enable or disable a platform silently;
- preserve destination instruction/agent paths, runtime prefixes, models, and
  verified tool arrays;
- preserve canonical-to-runtime mappings and real runtime names;
- for mediated mode, preserve distinct standard and ACE orchestrator
  entrypoints and verify that they remain distinct;
- do not add mediated-only semantics to embedded mode or embedded participant
  injection to mediated mode.

For destination fields absent from the current template, determine whether
they are a project extension, supported legacy field, or obsolete framework
field. Preserve extensions. Convert supported legacy fields explicitly.
Remove an obsolete field only when the current contract documents that it is
unused and removal is lossless; otherwise preserve it and report it. Never
drop an unknown field merely because it is not in the template.

Write valid, deterministic JSON in the destination's established formatting.
Do not expose secrets. Ensure no template placeholders remain.

## Phase 6 — reconcile project-owned integration

### Wrappers and personas

Preserve domain workflow, responsibilities, frontmatter, tools, models,
delegates, handoffs, argument hints, safety rules, and user-facing/runtime
names. Refresh only ACE-owned links, marked blocks, lifecycle duties, and
generated instruction references required by the current version.

Do not replace an operational persona with a stock template. Templates are a
contract/reference for the ACE portion, not authority over project behavior.
Do not duplicate an ACE section when one can be structurally merged.
Do not compress or paraphrase project behavior during structural relocation.
Preserve conditions, ordering, parallelism, isolation, retry limits, payloads,
return contracts, fallbacks, escalation, negative gates, and the authorized
alternative associated with each prohibition. Verify producer and consumer
sides of every cross-agent flag or artifact.

Refresh the orchestrator's ACE wiring from the appropriate current
`KIT_ROOT/ace/templates/orchestrator-persona.md`,
`KIT_ROOT/ace/templates/orchestrator-inline.md`, or
`KIT_ROOT/ace/templates/mediated-ace-wrapper.md` template without replacing
project behavior. Merge its narrow distinction for genuinely separate external
`rectify-playbook`-only requests that the user invoked directly: the
correction itself uses the user-invoked skill's guarded workflow, not normal
trace writing, counter updates, threshold checks, or ordinary learning, and
the orchestrator never invokes, loads, or forwards the skill itself.
In mediated mode, do not run `prepare_delegation.js`, `capture_trace.js`, or
`finalize_task.js` for that correction. The rectification script's own
retrieval regeneration still runs. Ordinary or mixed work is not
correction-only and retains full lifecycle handling.

For embedded mode, update ACE integration in exactly the already participating
agents and orchestrator. Do not enroll additional agents.

For mediated mode:

- keep workers, worker personas, and worker registry records unchanged;
- keep the ordinary orchestrator behaviorally equivalent and ACE-free;
- keep the standard runtime name unchanged;
- update the distinct `-ace` wrapper's mediation block and lifecycle wiring;
- both wrappers must continue to load the same canonical project persona;
- never introduce global or automatic routing to the ACE wrapper.

Installing or refreshing the external-correction skill does not authorize
worker/persona changes, new participation, or blanket automatic skill routing.

### Registries and generators

Identify the canonical source of truth before editing a generated wrapper. If a
registry, manifest, or generator owns it, update the minimal ACE-owned fields
in that source and regenerate. Preserve domain fields and ordering conventions.
Do not hand-edit generated output as the primary fix.

If generated output would overwrite unexplained destination behavior, stop,
show the source/output conflict, and ask one question. Run the destination's
existing registry sync/check commands after reconciliation.

### Global instructions and ignore rules

Merge only the current paradigm's ACE-owned marked blocks. Preserve all
unrelated instructions. Embedded may retain its existing selected-agent
activation; mediated must remain concise and explicitly opt-in, with no
retrieval markers or always-on ACE duties on ordinary routes.

Reconcile ACE rules in `TARGET_ROOT/.gitignore` without replacing unrelated
project rules.
Do not ignore runtime JSON in traces, proposals, applied batches, decisions, or
state; remove ACE rules that ignore those files or directories, and add narrow
exceptions if another rule (such as a blanket `*.json`) would hide them.
Preserve the exclusion of `TARGET_ROOT/ace/config/project.json`, transient
lock-file exclusions, and `.gitkeep` exceptions. Verify representative runtime
JSON paths are not ignored and existing untracked runtime records appear in
`git -C <TARGET_ROOT> status`.
Runtime records must remain available for normal Git versioning; do not stage
or commit them automatically. Canonical configuration, templates, wrappers,
personas, documentation, and empty playbook skeletons must remain trackable as
intended.

## Phase 7 — preserve runtime and learned state

Preserve all existing:

- global, agent, and family playbook content and lesson ids;
- traces and capture evidence;
- proposals, decisions, approvals, and applied-batch records;
- separate rectification audits in `TARGET_ROOT/ace/state/rectifications/`,
  including interrupted application records;
- counters, thresholds, task state, delegation manifests, and other runtime
  state;
- destination-specific evaluator and governance history.

Do not renumber lessons, rewrite prose, reset counters, consume pending traces,
reopen decisions, or mark proposals applied merely to fit a new kit layout.
Do not create empty files over populated files.
Do not apply or resume rectifications as part of the update: refreshing the
skill is not authorization to change learned contents or consume lifecycle
batches.

If an updated schema makes old persisted data unreadable, first look for a
documented, deterministic, backward-compatible migration supplied by the kit.
Inspect it before running it, scope it only to affected data, preserve semantic
identity and audit history, and validate every migrated file. If no such
migration exists, stop and report the incompatibility; do not invent a lossy
migration.

Create a newly required empty scope only when the preserved configuration
already contains that scope. Never infer new participation from kit samples.

## Phase 8 — regenerate, check, and validate

Use the commands actually present in the updated kit and destination. At
minimum, run in dependency order, by absolute path with `TARGET_ROOT` as the
working directory:

1. `node <TARGET_ROOT>/ace/scripts/generate_ace_agents.js`, including complete
   enabled-platform runtime-skill copies after approved conflict resolution;
2. `node <TARGET_ROOT>/ace/scripts/retrieval.js`;
3. `node <TARGET_ROOT>/ace/scripts/generate_ace_agents.js --check`, including
   complete runtime-skill contents;
4. `node <TARGET_ROOT>/ace/scripts/retrieval.js --check`;
5. `node <TARGET_ROOT>/ace/scripts/validate_install.js`;
6. destination registry/generator sync and check, when applicable;
7. focused repository tests that exercise the updated ACE runtime contracts.

Read every command's real output. Fix every update-caused non-zero result; do
not narrate it away. Do not install unrelated tooling. After all other update
writes, regeneration, and checks succeed, **copy `KIT_ROOT/ace/runtime-version.json` verbatim** to
`TARGET_ROOT/ace/runtime-version.json`. This must be the final kit-owned write:
do not create or update the target manifest earlier, and perform no later
kit-owned write. Verify byte-for-byte equality (not merely parsed JSON or
matching version fields). If a later correction changes any kit-owned file,
repeat this manifest copy and byte verification after that correction.

Then run the final inspection using exactly:

```text
node <KIT_ROOT>/ace/scripts/inspect_update.js --target <TARGET_ROOT>
```

Again, always use the inspector from `KIT_ROOT`, never the target copy. Confirm
that no required update remains and that installed version evidence is
coherent.

Validate specifically that:

- the paradigm is unchanged, except legacy embedded is now explicitly current
  embedded;
- configuration contains no unresolved placeholders and satisfies the current
  schema/contract;
- lifecycle prompts, scripts, schemas, templates, and docs agree;
- `TARGET_ROOT/ace/scripts/rectify_playbook.js`,
  `TARGET_ROOT/ace/skills/rectify-playbook/SKILL.md`, and its review contract
  are current, including targets where they were previously absent;
- complete runtime-skill copies are current on every enabled platform and
  keep their user-only invocation constraints, no
  disabled-platform copy was created, unrelated host skills are unchanged,
  and neither operator skill was installed into the host;
- every runtime-skill conflict was explicitly resolved within its approved
  exact subtree before generation; no unknown extra files remain there;
- generated output is current and a second generation produces no diff;
- `TARGET_ROOT/ace/runtime-version.json` is byte-for-byte identical to the kit
  manifest, was the final kit-owned write, and the final inspector reports
  coherent installed/current version evidence;
- wrappers resolve their personas and generated instruction files;
- runtime names, mappings, tools, delegates, models, and handoffs remain valid;
- every pre-update behavioral contract element has an explicit preserved,
  representation-only, framework-required, or user-approved post-update
  destination;
- no workflow condition, ordering constraint, delegation payload, fallback,
  safety gate, authorized alternative, selected model, or effective capability
  was silently weakened or dropped;
- embedded participation is unchanged, or mediated standard/ACE routes remain
  distinct and workers remain unchanged;
- reflector delegates to curator, curator delegates to warden, and the
  warden wrapper declares a real platform question tool; if delegation
  does not propagate it, the orchestrator must relay each explicit human
  response via its own tool or a new user turn in the main chat;
- ordinary learning retains warden-only sign-off/apply and two separate
  explicit human checkpoints; only the explicit external-correction skill
  provides the narrowly scoped, independently reviewed script exception;
- external corrections retain exact-target guards, fail-closed read-only
  semantic review, and initial-request authorization for unchanged scope;
- the orchestrator's refreshed correction-only branch skips normal
  trace/counter/threshold work and mediated prepare/capture/finalize only for
  user-invoked `rectify-playbook`-only requests, never ordinary or
  mixed work, and no agent invokes or forwards the skill;
- playbooks, traces, proposals, decisions, counters, rectification audits, and
  state are preserved;
- runtime JSON is not ignored and remains available for version control;
- no kit project data, fixtures, unresolved conflict markers, or accidental
  secrets were copied.

## Phase 9 — inspect the final diff

Compare final `git -C <TARGET_ROOT> status` and diffs with the saved baseline,
and confirm that `git -C <KIT_ROOT> status` is unchanged:

- separate pre-existing changes from update changes;
- confirm no pre-existing edit was reverted or reformatted;
- inspect staged and unstaged output without changing staging;
- confirm every changed path has an ownership classification and planned
  reason;
- confirm deleted/renamed paths were kit-owned or explicitly approved;
- scan for conflict markers, duplicate ACE blocks, stale links, old generated
  output, and unintended paradigm terminology;
- confirm runtime data is unchanged except for an explicitly documented,
  validated compatible migration.

Do not commit, push, or alter branches unless separately requested.

## Final report

State whether the update is fully complete. Then provide a table with one row
per created, modified, generated, migrated, preserved-with-conflict, or blocked
path/group:

| Path or group | Ownership | Action | Old → new version/shape | Preservation evidence | Validation/result |
|---|---|---|---|---|---|

Also report:

- absolute `KIT_ROOT` and `TARGET_ROOT`, plus the kit's recorded Git status;
- operation classification (`update`, not install/migration);
- detected paradigm and evidence, including any legacy embedded normalization;
- enabled platforms, canonical orchestrator, participating/mapped agents,
  families, and standard/ACE runtime names where applicable;
- every command run and its exit result;
- a pre/post behavioral preservation matrix and every intentional difference;
- pre-existing dirty/conflicted paths left intact;
- runtime-data preservation checks;
- every dedicated-tool decision and outcome;
- remaining manual actions, blockers, and unanswered questions.

Do not claim success while a required check fails, a conflict is unresolved,
or a required decision is unanswered. Unexplained behavioral loss blocks
success.
