# ACE update prompt

Use this prompt once to update an **existing ACE installation** in another
local repository. The directory containing this file is `KIT_ROOT`; the
repository containing the installed ACE instance is `TARGET_ROOT`.

You are the update agent. Complete the update and validate it; do not merely
report available changes. Never modify `KIT_ROOT`, and never import
project-specific or learned data from it into `TARGET_ROOT`.

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
| **Kit-owned** | ACE runtime scripts and libraries, lifecycle prompts, schemas, stock templates, framework documentation, generated ACE-only lifecycle wrappers | Replace with the corresponding current kit version, then reapply only destination path/name substitutions explicitly required by the file's contract. Do not carry forward local edits silently. |
| **Project-owned** | Operational personas, ordinary agent wrappers, registries/generators, global project instructions outside ACE-owned blocks, domain docs and code | Preserve behavior and metadata. Make only the smallest integration edit required by the current paradigm. Never replace from the kit. |
| **Managed ACE merge** | `ace/config/project.json`, `.gitignore` ACE rules, generated retrieval blocks, ACE sections embedded in project-owned files, wrapper registrations and delegate lists | Reconcile structurally: preserve project values and unrelated content, refresh ACE-owned fields/blocks, and regenerate where a canonical generator exists. |
| **Runtime data** | playbook lessons, traces, proposals, decisions, counters, applied-batch records, task/delegation state, other accumulated evidence | Runtime updates preserve byte-for-byte unless a documented, necessary, backward-compatible data migration exists. Never replace with kit data, reset, truncate, synthesize, or delete. |

An empty kit skeleton is not evidence that destination runtime data should be
emptied. `.gitkeep`, format comments, and sample data are not replacements for
real destination content. When ownership remains uncertain, preserve the file,
record the ambiguity, and ask before changing it.

## Phase 0 — establish roots and a safe baseline

1. Resolve and canonicalize local `KIT_ROOT` and `TARGET_ROOT`; verify they are
   different directories and that `TARGET_ROOT` is the repository being
   updated.
2. Read all applicable destination repository instructions before any write.
3. Inspect `git status`, including staged, unstaged, untracked, conflicted, and
   ignored ACE paths. Save the baseline status and relevant diffs for later
   comparison.
4. Detect unresolved merges/rebases and conflict markers. Do not update a
   conflicted path. If a conflict touches the update, stop and identify it;
   otherwise preserve it and avoid that path.
5. Locate the installed ACE root, materialized project configuration,
   playbooks, lifecycle agents, generated retrieval blocks, wrappers,
   personas, registries/generators, and runtime-data directories.
6. If no existing ACE installation is evidenced, stop: that is an install.
7. Do not stash, reset, checkout, clean, stage, commit, or reformat pre-existing
   changes. Record which update paths were already dirty and preserve those
   edits during reconciliation.

## Phase 1 — inspect and classify without editing

Build an inventory containing path, ownership class, source of truth,
generated/manual status, local modifications, and proposed action.

Read both kit and destination versions of:

- lifecycle prompts and generated lifecycle wrappers;
- runtime scripts and libraries;
- schemas and stock templates;
- ACE framework documentation;
- `ace/config/project.template.json` and destination
  `ace/config/project.json`;
- retrieval markers and `.gitignore` ACE rules;
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

Replace kit-owned files from the corresponding current `KIT_ROOT` paths.
Update the complete mutually compatible framework set, not isolated files:

- lifecycle prompts for reflector, curator, and warden;
- runtime scripts and their libraries;
- schemas used by those scripts;
- stock templates consumed by generators or installers;
- framework documentation appropriate to the preserved paradigm;
- ACE-owned generated lifecycle assets, preferably through their generator.

Do not copy materialized `project.json`, generated destination wrappers,
fixtures, temporary files, source-project runtime output, or learned data from
the kit.

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
- only the approved apply path may write playbooks.

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

For embedded mode, update ACE integration in exactly the already participating
agents and orchestrator. Do not enroll additional agents.

For mediated mode:

- keep workers, worker personas, and worker registry records unchanged;
- keep the ordinary orchestrator behaviorally equivalent and ACE-free;
- keep the standard runtime name unchanged;
- update the distinct `-ace` wrapper's mediation block and lifecycle wiring;
- both wrappers must continue to load the same canonical project persona;
- never introduce global or automatic routing to the ACE wrapper.

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

Merge runtime-data ignore rules without replacing project rules. Preserve
`.gitkeep` exceptions and verify ignored data remains ignored while canonical
configuration, templates, wrappers, personas, documentation, and empty
playbook skeletons remain trackable as intended.

## Phase 7 — preserve runtime and learned state

Preserve all existing:

- global, agent, and family playbook content and lesson ids;
- traces and capture evidence;
- proposals, decisions, approvals, and applied-batch records;
- counters, thresholds, task state, delegation manifests, and other runtime
  state;
- destination-specific evaluator and governance history.

Do not renumber lessons, rewrite prose, reset counters, consume pending traces,
reopen decisions, or mark proposals applied merely to fit a new kit layout.
Do not create empty files over populated files.

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
minimum, run in dependency order:

1. the ACE lifecycle-agent generator;
2. ACE retrieval generation;
3. generator check mode;
4. retrieval check mode;
5. installation/runtime validation;
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
- generated output is current and a second generation produces no diff;
- `ace/runtime-version.json` is byte-for-byte identical to the kit manifest,
  was the final kit-owned write, and the final inspector reports coherent
  installed/current version evidence;
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
- reflector delegates to curator, curator delegates to warden, and warden has
  a real dedicated question tool;
- sign-off remains explicit and only the approved apply path writes playbooks;
- playbooks, traces, proposals, decisions, counters, and state are preserved;
- no kit project data, fixtures, unresolved conflict markers, or accidental
  secrets were copied.

## Phase 9 — inspect the final diff

Compare final `git status` and diffs with the saved baseline:

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

- `KIT_ROOT` and `TARGET_ROOT`;
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
