# ACE mediated installation prompt

Use this prompt from the ACE kit root to install ACE into another local
repository as an **explicitly opt-in mediation layer**. The directory
containing this file is `KIT_ROOT`; the destination is `TARGET_ROOT`.

You are the installation agent. Complete and validate the installation.
Preserve destination behavior. Never modify the kit while installing.

## Invariants

1. Do not modify any worker agent, worker persona, worker wrapper, worker
   registry entry, tool set, model, handoff, or delegation contract.
2. The orchestrator has exactly one canonical ACE-free persona and two thin
   wrappers: its standard runtime name unchanged, and the same name plus
   `-ace`. Both load the same persona; only the `-ace` wrapper adds mediation.
3. The standard wrapper remains behaviorally equivalent to the pre-install
   orchestrator. It must not retrieve lessons, write traces, invoke lifecycle
   roles, or become an alias to the ACE wrapper.
4. ACE is opt-in. Do not add global instructions, routing defaults, hooks, or
   always-on policies that activate ACE for ordinary sessions.
5. The opted-in wrapper owns the complete map → retrieve → delegate → collect
   → trace → counters → threshold → reflector → curator → warden → sign-off →
   apply → regenerate lifecycle.
6. No role writes a playbook directly. Only the signed-off apply path may do
   so. Human approval must use a dedicated question tool, one question at a
   time.

## Interaction and safety

- Use `ask_user` or `vscode/askQuestions` on GitHub Copilot and
  `AskUserQuestion` on Claude Code for every installation decision.
- Ask exactly one question at a time. Use multi-select only where requested.
- Never infer approval from silence or conversational text.
- If the dedicated question tool is unavailable, stop.
- Never overwrite an installation, persona, wrapper, registry, or generated
  file without showing the conflict and receiving an explicit choice.
- Inspect destination instructions and `git status`; preserve all existing
  changes.

## Phase 0 — roots and collision detection

Resolve and verify distinct local `KIT_ROOT` and `TARGET_ROOT`. Detect existing
`ace/`, `playbooks/`, ACE markers, bullets, lifecycle wrappers, and runtime
names ending in `-ace`. If found, ask whether to abort, assess an upgrade, or
install only missing pieces; never treat it as a clean install.

## Phase 1 — inventory without editing

Read root instructions, `.github/agents/**/*.agent.md`,
`.claude/agents/**/*.md`, agent registries/generators, and
`docs/agent-personas/`. Build one row per logical operational agent with:
canonical id, role, platform runtime names/files, tools, delegates, persona
source, user-facing state, and orchestrator evidence. Exclude reflector,
curator, and warden.

Correlate cross-platform identity by runtime name, description, source links,
role, and delegation—not filename alone. Record which files are generated and
their canonical source. This phase is read-only.

### Effective behavioral contract

For every operational agent and entry point, also record the effective
behavioral contract across wrappers, personas, inline bodies, registries,
generators, referenced instructions, and handoffs:

- harness, runtime identity, description, selected model and provider, tools,
  delegates, handoffs, invocation state, and argument hints;
- required inputs, preconditions, ordered workflow, branching, parallelism,
  context isolation, and iteration limits;
- delegation payloads and return contracts, verification, fallbacks,
  escalation, stop conditions, safety gates, prohibited actions, authorized
  alternatives, and side effects.

Treat harness, model provider, and selected model as independent dimensions.
Consolidating onto one harness may translate file layout, frontmatter schema,
tool nomenclature, delegate syntax, and links, but must preserve each selected
model and effective capability when the target harness supports them. If it
does not, prove the incompatibility and obtain an explicit choice.

Build a preservation matrix mapping every source contract element to its
post-install source. Structural relocation is not permission to summarize or
weaken project behavior.

## Phase 2 — platforms and orchestrator

Ask which detected platforms to install: all, each individual platform, or a
missing counterpart when only one exists. Bootstrap only a platform explicitly
selected by the user.

Rank orchestrators by explicit coordinator role, multi-worker delegation,
user-facing entry point, task-id assignment, and result aggregation. Report
evidence and confidence. Ask whether to use the best candidate or create a new
orchestrator. Resolve ties with a choice.

For a new orchestrator, ask canonical id and display/runtime base name
separately. Use only verified tools and delegates. Ask separately for the
project/team label; materialize `team_name` and a filesystem-safe
`<slug>-auto` `provisional_evaluator`.

## Phase 3 — choose the mediated scope

Use a multi-select question to choose which discovered workers the ACE wrapper
may map and delegate to. This selection configures ACE scopes only; it does not
authorize worker edits. Always include the orchestrator as an ACE playbook
scope. Ask whether stable task-family mappings should reuse any existing
project taxonomy; otherwise configure `{}`.

Record the exact canonical ids and runtime-name mappings. A canonical id is
filesystem-safe and unique; a runtime name is the actual platform invocation
name and may differ.

## Phase 4 — normalize the orchestrator source

### Existing orchestrator

Identify its behavioral source of truth.

- If it already uses one persona, preserve that persona byte-for-byte except
  for link corrections strictly required by relocation. It remains ACE-free.
- If behavior is duplicated across platform wrappers, ask which is canonical.
  Create `docs/agent-personas/<orchestrator-id>.md` by relocating, not
  redesigning, the chosen shared behavior. Preserve platform-only guardrails
  in the appropriate wrappers.
- If a registry/generator owns wrappers, modify its source model and regenerate;
  do not make generated files the source of truth.

Rebuild/preserve the **standard wrapper** under exactly its existing runtime
name. It loads the canonical persona with a real file-reading tool and retains
all existing runtime metadata and platform guardrails. Preserve the selected
model independently of the selected harness; translate only representation
details required by that harness. Verify before continuing that ordinary
behavior and delegation are unchanged.

### New orchestrator

Create one ACE-free canonical persona containing only normal project
orchestration. Create its standard wrapper at the approved base runtime name.
Register it through the destination's canonical mechanism.

### ACE wrapper

For every selected platform, create a second wrapper named exactly
`<standard-runtime-name>-ace`. It must:

1. preserve compatible platform metadata, tools, model, and normal delegates;
2. load the same canonical ACE-free persona as the standard wrapper;
3. read generated global, orchestrator, mapped-worker, and mapped-family
   instructions as applicable;
4. map each task to canonical configured ids before delegation;
5. delegate to the existing unchanged worker runtime, passing relevant lessons
   as task-local context and retaining lesson ids;
6. collect worker output, verify the outcome, and write the ACE trace itself;
7. run counter update and threshold check, invoking reflector when due;
8. expose the generated reflector as a delegate;
9. never cause the worker to own ACE files or lifecycle duties.

Do not add ACE content to the canonical persona or standard wrapper.

## Phase 5 — install clean runtime state

Copy `KIT_ROOT/ace/` and the empty `KIT_ROOT/playbooks/` skeleton, excluding
`project.json`, generated wrappers, fixtures, temporary files, traces,
proposals, decisions, learned bullets, counters, and runtime output.

Materialize `ace/config/project.json` from the template with the team,
evaluator, orchestrator canonical id, exact mediated worker scopes, optional
families, selected platforms, destination paths, runtime prefixes, models, and
verified ACE tools. Set `integration_mode` to `mediated`. For each enabled
platform, populate `canonical_to_runtime` with real unchanged worker names and
`orchestrator_entrypoints.project`/`.ace` with the standard unchanged runtime
name and its exact `-ace` counterpart. Create empty scoped playbooks only for
the orchestrator and selected mapped agents/families.
Both `orchestrator_entrypoints.project` and `orchestrator_entrypoints.ace` are
required metadata and must remain distinct.

Reflector and curator require real read/write/search/shell/delegation
capabilities. Warden requires read/shell and a dedicated question tool. Stop on
a missing capability; never advertise a tool that does not exist.

Merge runtime-data ignore rules into `.gitignore`, preserving `.gitkeep`
exceptions. Verify runtime state is ignored. Do not ignore canonical personas,
wrappers, config templates, documentation, or playbook skeletons.

## Phase 6 — lifecycle wiring

Run `node ace/scripts/generate_ace_agents.js`. Verify on every selected
platform:

- ACE orchestrator wrapper → reflector;
- reflector → curator;
- curator → warden;
- warden has the dedicated question capability;
- only the ACE wrapper has lifecycle delegation;
- standard orchestrator and all workers remain unchanged.

The ACE wrapper must implement:

1. **mapping:** canonical worker/family plus task id;
2. **retrieval:** `prepare_delegation.js --task-id <id> --agent
   <canonical-id> --platform <configured-platform>` emits active global and
   mapped scoped lessons, respecting exclusions, as a delegation manifest;
   `--platform` is always mandatory, including single-platform installations;
   global ACE lessons come from the dedicated `ace-global.instructions.md`,
   never from the platform's global instruction file;
3. **delegation:** unchanged worker runtime with task-local lesson context;
4. **collection:** result, evaluation, lesson usage, notes, and friction;
5. **trace:** `capture_trace.js` records schema-valid contributor evidence
   owned by the orchestrator;
6. **learning:** `finalize_task.js` completes task counters and thresholds,
   then reflector/curator/warden;
7. **governance:** deterministic gate and explicit human sign-off;
8. **refresh:** signed-off apply followed by retrieval regeneration.

## Phase 7 — global documentation, not activation

If global platform instructions need discovery text, add only a concise section
stating that ACE is available by explicitly invoking
`<standard-runtime-name>-ace`, and that the standard name is non-ACE. Do not
add retrieval markers, lesson content, trace duties, automatic routing, or
always-on ACE requirements to global instructions.

## Phase 8 — generation and checks

Run and inspect, in order:

1. `node ace/scripts/generate_ace_agents.js`
2. `node ace/scripts/retrieval.js`
3. `node ace/scripts/generate_ace_agents.js --check`
4. `node ace/scripts/retrieval.js --check`
5. `node ace/scripts/validate_install.js`

Also run the destination's existing agent registry sync/check when applicable.
Fix every non-zero result. Do not install unrelated tooling.

## Phase 9 — acceptance tests

Prove all of the following from files, generated output, and diffs:

- one canonical orchestrator persona exists and contains no ACE behavior;
- the standard wrapper retains exactly the prior runtime name and normal route;
- one `-ace` wrapper exists per selected platform and loads the same persona;
- workers and their registry records are untouched;
- standard invocation cannot enter ACE; `-ace` invocation owns the full cycle;
- every baseline contract element has an explicit preserved,
  representation-only, platform-required, or user-approved destination;
- no workflow condition, ordering constraint, delegation payload, fallback,
  safety gate, authorized alternative, model, or effective capability was
  silently weakened or dropped;
- mappings use configured canonical ids and real worker runtime names;
- every delegation preparation supplies the selected platform explicitly;
- scoped retrieval reaches the wrapper without permanent worker injection;
- trace ownership, counters, thresholds, and lifecycle delegation are wired;
- only warden can apply after dedicated-tool human sign-off;
- no global always-on behavior was introduced;
- no unresolved placeholders or copied learned/runtime data exist;
- selected and only selected scopes have empty playbooks;
- pre-existing dirty-worktree changes remain intact.

Present a final table of created/modified files, platforms, canonical persona,
standard and ACE runtime names, mapped workers/families, commands and results,
and remaining manual action. Also present the preservation matrix and every
intentional behavioral difference. Unexplained behavioral loss blocks
success. Do not commit or push unless separately asked.
