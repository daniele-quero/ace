# ACE embedded installation prompt

Use this prompt to install the generic ACE framework from the ACE kit into
another local project. The absolute directory that contains this file is
`KIT_ROOT`; the absolute root of the destination repository is `TARGET_ROOT`.
This prompt works from any current directory.

You are an installation agent. Complete the installation, not merely a review.
Preserve the destination project's behavior and conventions. Never modify the
ACE kit source while installing it.

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
  `apply_delta.js` denotes `TARGET_ROOT/ace/scripts/apply_delta.js`.
- Run destination scripts by absolute path with `TARGET_ROOT` as the working
  directory, for example `node <TARGET_ROOT>/ace/scripts/validate_install.js`.
- Manifest keys and `source_paths` values, `project.json` path fields, and
  links or commands written into destination files stay repository-relative,
  as the runtime and templates define them. Resolve them against the stated
  root when accessing a file; never write absolute machine paths into
  destination agents, personas, configuration, or instructions.

## Non-negotiable interaction rules

- Use the runtime's dedicated question tool for every decision:
  `ask_user` or `vscode/askQuestions` on GitHub Copilot, and
  `AskUserQuestion` on Claude Code.
- Ask exactly one question at a time. Use multi-select only for choosing
  multiple agents.
- Do not infer consent from silence or plain conversational context.
- If the dedicated question tool is unavailable, stop and explain the blocker.
- Never overwrite an existing ACE installation, persona, wrapper, runtime
  skill, registry, or instruction block without showing the conflict and
  receiving an explicit choice.

## Phase 0 - Establish roots and safety

1. Resolve `KIT_ROOT` as the absolute, canonical directory containing this
   file. An operator skill may pass the same absolute path explicitly.
2. Resolve `TARGET_ROOT` as an absolute, canonical path from the user's
   request or the current repository root. If it is ambiguous, ask for the
   absolute target path.
3. Verify that both roots are local directories, that they are different, and
   that neither contains the other.
4. Read the destination's repository instructions before any write.
5. Inspect `git -C <TARGET_ROOT> status`. Existing changes are not a reason
   to stop, but they must not be reverted, reformatted, staged, or overwritten.
6. Detect an existing `TARGET_ROOT/ace/`, `TARGET_ROOT/playbooks/`, ACE
   markers, `P-NNN` bullets, or ACE agent wrappers. If any exist, stop and ask
   whether to abort, inspect an upgrade, or install only missing pieces. Do
   not treat an upgrade as a clean install.

## Phase 1 - Discover the agent apparatus

Read, when present:

- root instructions such as `TARGET_ROOT/AGENTS.md`, `TARGET_ROOT/CLAUDE.md`,
  and `TARGET_ROOT/.github/copilot-instructions.md`;
- `TARGET_ROOT/.github/agents/**/*.agent.md` and
  `TARGET_ROOT/.claude/agents/**/*.md`;
- existing `TARGET_ROOT/.github/skills/` and `TARGET_ROOT/.claude/skills/`
  directories, especially same-name runtime-skill collisions;
- project-specific agent registries, generators, manifests, or sync scripts;
- existing `TARGET_ROOT/docs/agent-personas/` and agent-related workflow
  documentation;
- frontmatter fields that define runtime name, description, model, tools,
  delegates, handoffs, user-invocable state, and argument hints.

Build an inventory table with one logical row per operational agent:

- canonical local id;
- role and concise responsibility;
- Copilot runtime name/file, if any;
- Claude runtime name/file, if any;
- tools and delegates;
- persona/source-of-truth file, if one already exists;
- whether the agent can interact with the user;
- evidence that it may be the orchestrator.

Exclude existing ACE lifecycle agents (`reflector`, `curator`, `warden`) from
the operational-agent inventory.

Do not assume that matching filenames represent the same logical agent.
Correlate identity from runtime name, description, role, source links, and
delegation relationships. If two platform files conflict materially, show the
conflict and ask which behavior is canonical before editing either.

### Record the effective behavioral contract

Before transforming any operational agent, record its effective contract
across wrappers, personas, inline bodies, registries, generators, referenced
instructions, and handoffs. Include:

- harness, runtime identity, description, selected model and provider, tools,
  delegates, handoffs, invocation state, and argument hints;
- required inputs, preconditions, ordered workflow, branching, parallelism,
  context isolation, and iteration limits;
- delegation payloads, return contracts, success criteria, verification,
  fallbacks, escalation, and stop conditions;
- safety gates, prohibited actions, authorized alternatives, file scope, Git
  side effects, and user approvals.

Treat the harness, model provider, and selected model as separate dimensions.
Selecting one harness may require different files, frontmatter fields, tool
names, or delegate syntax, but it does not authorize a model change when that
harness supports the original model. If it does not, prove the incompatibility
and obtain an explicit model choice before continuing.

Create a preservation matrix mapping every source contract element to its
post-install destination. A persona conversion is a relocation, not a summary:
preserve conditions, ordering, payloads, parallelism, fallback paths, negative
gates, and both sides of every inter-agent contract.

## Phase 2 - Detect platforms and ask installation scope

Detect GitHub Copilot from `TARGET_ROOT/.github/agents`, Copilot instructions,
or an equivalent registry. Detect Claude Code from `TARGET_ROOT/.claude/agents`,
`TARGET_ROOT/CLAUDE.md`, or an equivalent registry.

Use the question tool to ask which platform assets to install. The choices
must reflect discovery and include:

- all detected platforms;
- only each detected platform;
- creating the missing counterpart when only one platform was detected.

Do not create a platform apparatus that the user did not select.
Use the same selection for installed runtime skills; do not create skill
copies for disabled platforms.
If neither platform is detected, ask directly whether to bootstrap GitHub
Copilot, Claude Code, or both; do not assume the current installer runtime is
the desired target platform.

## Phase 3 - Identify the orchestrator

Rank candidates using explicit evidence, in this order:

1. role/name explicitly says orchestrator, coordinator, router, or equivalent;
2. agent delegates to multiple operational agents;
3. agent is the main user-facing entry point;
4. agent assigns task/session identifiers or aggregates results;
5. other agents return artifacts or summaries to it.

Report the best candidate, evidence, and confidence. If candidates are tied or
confidence is low, ask the user to choose the orchestrator candidate before
continuing.

If no operational agents are discovered, state that no orchestrator candidate
exists and ask whether to generate a new orchestrator. A new orchestrator may
be the only initial ACE participant; do not invent additional agents.

Then ask, with one question:

- use the detected/chosen orchestrator; or
- generate a new orchestrator.

If a new orchestrator is requested, ask for its canonical id, then its display
name, one question at a time. Generate it from
`KIT_ROOT/ace/templates/orchestrator-persona.md` or
`KIT_ROOT/ace/templates/orchestrator-inline.md` according to the persona
decision below. Give it only tools and delegates verified as available in the
selected platform apparatus. Never invent runtime capabilities.

Ask for the project/team label used by ACE as a separate question. Store its
display wording in `team_name` and its filesystem-safe normalized
`<slug>-auto` value in `provisional_evaluator`.

## Phase 4 - Select participating agents

Use a multi-select question listing all discovered operational agents by
canonical id and role. Ask which agents should participate in ACE.

If no other operational agents exist, skip the empty multi-select only after
reporting that the installation will initially contain the orchestrator alone.

- Include the chosen orchestrator in configuration even if it is not selected
  separately.
- Do not include unselected agents in `participating_agents`, generate their
  scoped playbooks, or modify their workflow.
- Record the exact selected list for the installation summary.

## Phase 5 - Ask about personas

Ask:

> Do you want to adopt the persona pattern, with operational behavior in
> `TARGET_ROOT/docs/agent-personas/` and minimal platform wrappers that link
> to it?

Offer `Yes` and `No`; do not choose automatically merely because the ACE
lifecycle agents themselves use source personas.

### If the answer is Yes

1. Create or reuse `TARGET_ROOT/docs/agent-personas/`.
2. For every selected operational agent, identify its canonical behavioral
   body. If it already links to a persona, preserve and update that persona.
3. Otherwise move the operational workflow, responsibilities, domain rules,
   and non-platform-specific behavior into
   `TARGET_ROOT/docs/agent-personas/<canonical-id>.md`.
4. Preserve relevant structure and wording. This is a relocation and
   integration, not a redesign of the agent.
5. For participating non-orchestrators, add the content from
   `KIT_ROOT/ace/templates/agent-ace-section.md`, replacing placeholders and
   merging with an existing ACE section instead of duplicating it.
6. For the chosen existing orchestrator, merge the ACE cycle and delegation
   responsibilities from `KIT_ROOT/ace/templates/orchestrator-persona.md` into
   its existing persona without replacing project-specific behavior. For a new
   orchestrator, materialize the complete template.
7. Leave each platform wrapper with:
   - all original frontmatter and runtime metadata;
   - an explicit link to the persona and instruction to read it with a real
     file-reading tool;
   - an explicit link to that agent's generated ACE instruction file;
   - only safety/scope guardrails that cannot safely depend on an external
     read;
   - a short minimum cycle.
8. Use `KIT_ROOT/ace/templates/persona-wrapper-body.md` as the shape, adapted
   to the destination's platform conventions. Compute correct
   repository-relative links between destination files.
9. If the destination has a canonical agent registry/generator, update its
   source of truth and regenerate wrappers. Do not hand-edit generated files
   as the primary change.

### If the answer is No

1. Keep each selected operational agent's current behavioral body in place.
2. Append or merge the content of `KIT_ROOT/ace/templates/agent-ace-section.md`
   into each selected non-orchestrator platform agent file.
3. For the chosen existing orchestrator, merge
   `KIT_ROOT/ace/templates/orchestrator-inline.md` into its body. For a new
   orchestrator, materialize that template in each selected platform wrapper.
4. Add an explicit instruction to read the generated scoped ACE instruction
   before work.
5. Preserve frontmatter, tools, delegates, handoffs, and unrelated body text.
   Preserve the selected model independently of the selected platform harness;
   translate only the target platform's representation unless the user
   explicitly approves a model change.
6. Do not create `TARGET_ROOT/docs/agent-personas/`.

### Preserve the orchestrator's correction-only branch

When merging `KIT_ROOT/ace/templates/orchestrator-persona.md` or
`KIT_ROOT/ace/templates/orchestrator-inline.md`, retain the narrow distinction
for a genuinely separate external `rectify-playbook`-only request that the
user invoked directly. For the correction itself, the user-invoked skill's
guarded workflow replaces normal trace writing, counter updates, threshold
checks, and the ordinary learning lifecycle. Its own retrieval regeneration
still runs. The orchestrator never invokes, loads, or forwards the skill
itself.

Do not classify ordinary or mixed work as correction-only. Ordinary tasks
retain the complete embedded cycle. This is scoped orchestrator wiring, not
global skill routing or a new worker duty.

## Phase 6 - Install the runtime

1. Read `KIT_ROOT/ace/runtime-version.json` before copying. Its
   `ownership.kit_owned` paths plus `ownership.mode_specific.embedded` are the
   closed, mandatory framework inventory of repository-relative installed
   paths. For each listed `path`, create the parent directory and copy the
   regular file `KIT_ROOT/<source>` to `TARGET_ROOT/<path>`, where `<source>`
   is the manifest's `source_paths[path]` when present and otherwise `path`.
   The inventory includes all scripts, `scripts/lib` helpers, schemas,
   prompts, templates, the embedded README pair, and the update inspector. It
   also includes `TARGET_ROOT/ace/scripts/rectify_playbook.js` and the complete
   kit-owned `TARGET_ROOT/ace/skills/rectify-playbook/` directory, copied from
   the canonical kit sources
   `KIT_ROOT/.github/skills/rectify-playbook/SKILL.md` and
   `KIT_ROOT/.github/skills/rectify-playbook/references/review.md`.
   Do not install a hand-picked subset, and do not copy either mediated README.
2. Copy `KIT_ROOT/ace/` to `TARGET_ROOT/ace/`, excluding:
   - `KIT_ROOT/ace/config/project.json` if one somehow exists in the kit
     checkout;
   - `KIT_ROOT/ace/runtime-version.json`, deferred until Phase 9;
   - temporary files, test fixtures, generated wrappers, platform skill
     copies, and runtime output.
   Do not copy the kit's `install-ace` or `update-ace` operator skills into
   the host; they remain separate user-level tools.
   Copy the manifest-mapped skill sources separately; copying `KIT_ROOT/ace/`
   alone does not include them. Never copy the whole
   `KIT_ROOT/.github/skills/` root.
3. Before any project-specific configuration or generation, compare the
   copied runtime files against the kit's manifest and stop if any required
   copied file is absent, non-regular, or has a different normalized SHA-256.
   Defer only the manifest itself and generated assets to their later phases.
   A missing script, schema, prompt, template, library, or canonical runtime
   skill file is an incomplete installation, not an optional feature.
4. Copy the empty `KIT_ROOT/playbooks/` skeleton to
   `TARGET_ROOT/playbooks/`.
5. Do not copy traces, proposals, decisions, learned bullets, counters,
   rectification audits, or state from the kit's source project. The kit
   directories must be empty except for documentation, `.gitkeep`, and the
   initial empty state file.
   Destination-owned runtime JSON created by ACE is project data: preserve it
   and keep it available for normal Git versioning.
6. Copy `TARGET_ROOT/ace/config/project.template.json` to
   `TARGET_ROOT/ace/config/project.json` and materialize:
   - `team_name`;
   - `provisional_evaluator`;
   - `orchestrator_agent`;
   - exact `participating_agents`;
   - optional `agent_families` mappings when the destination already defines
     stable cross-cutting task families; otherwise use `{}`;
   - enabled selected platforms;
   - actual destination paths, as repository-relative values;
   - verified runtime prefix, model, and ACE tools for each platform.
7. Tool arrays must match capabilities actually available in the destination.
   Reflector and curator need read/write/search/shell/delegation. Warden needs
   read/shell/dedicated-question. If any capability is missing, report the
   specific blocker and stop before generating a wrapper that claims it.
8. Create an empty `TARGET_ROOT/playbooks/<canonical-id>.md` for the
   orchestrator and each participating agent, following the format comment in
   `TARGET_ROOT/playbooks/_global.md`.
9. Create an empty `TARGET_ROOT/playbooks/families/<family>.md` for every
   configured family.
10. Keep canonical ids filesystem-safe and unique. If a discovered runtime name
   is namespaced, use the stable local id rather than slashes as the scope
   filename.
11. Reconcile ACE rules in `TARGET_ROOT/.gitignore` without replacing
   unrelated project rules. Do not ignore runtime JSON in traces, proposals,
   applied batches, decisions, or state; remove ACE rules that ignore those
   files or directories, and add narrow exceptions if another rule (such as a
   blanket `*.json`) would hide them. Preserve the exclusion of
   `TARGET_ROOT/ace/config/project.json`, transient lock-file exclusions, and
   `.gitkeep` exceptions. Verify that representative runtime JSON paths are
   not ignored and that existing untracked runtime records appear in
   `git -C <TARGET_ROOT> status`. Do not stage or commit automatically.

## Phase 7 - Generate ACE assets and wire delegation

The agent generator also installs and checks complete runtime-skill copies
from `TARGET_ROOT/ace/skills/rectify-playbook/`:
`TARGET_ROOT/.github/skills/rectify-playbook/` for enabled Copilot and
`TARGET_ROOT/.claude/skills/rectify-playbook/` for enabled Claude. These
invocable destinations are required on clean installs, updates and upgrades;
the internal runtime asset directory is not an invocable destination. Every
copy keeps `user-invocable: true`, `disable-model-invocation: true`, and its
user-only description and entry gate. Never create a disabled platform's copy
or replace a whole skills root; preserve every unrelated host skill.

Inspect those exact destinations before generation. An absent or current copy,
or a clean older copy proven by prior installed-manifest hashes, is safe to
generate. Same-name unowned differences, locally modified contents,
non-regular paths, and unknown extra files are conflicts. Resolve only
explicitly approved conflicts within the exact `rectify-playbook/` subtree
before regeneration; the generator must not overwrite disputed contents.

1. Run `node <TARGET_ROOT>/ace/scripts/generate_ace_agents.js`.
2. Verify the generated `reflector -> curator -> warden` delegation chain on
   every selected platform.
3. Derive each generated lifecycle runtime name from the enabled platform's
   `runtime_prefix` exactly as `generate_ace_agents.js` does:
   `<runtime_prefix>/ace/reflector`, `<runtime_prefix>/ace/curator`, and
   `<runtime_prefix>/ace/warden`. Materialize these exact strings in every
   orchestrator persona/wrapper, ACE block, delegate list, and handoff. Do not
   use bare role names, display labels, or a name from another platform.
4. Add the derived platform-specific reflector runtime name to the chosen
   orchestrator's declared delegates/agents using the destination's canonical
   registry when one exists.
5. Ensure the orchestrator owns ordinary-task trace writing, counter updates,
   threshold checks, and reflector invocation, retaining the explicit
   correction-only branch above. Participating agents only return trace
   elements unless the destination explicitly assigns them a stronger role.
6. If a new orchestrator was requested, create its selected-platform wrappers
   and register it through the destination's canonical mechanism.

### Explicit external corrections

The skill is user-invocable only. Preserve `user-invocable: true`,
`disable-model-invocation: true`, and its user-only description and entry
gate: never enable automatic selection. Only the user may invoke it, for
example with `/rectify-playbook`. Agents, subagents, handoffs, hooks, normal
ACE roles, and orchestration must never invoke, delegate, or forward this
skill, relabel current-cycle work as external, or use it as a gate/evidence
fallback. Only a genuinely separate explicit external request that the user
invokes is eligible, subject to harness manual-invocation restrictions and
independent review of its origin.

The installed `rectify-playbook` skill handles user-invoked corrections
outside ordinary learning, without mandatory traces. Keep
its complete skill/checklist workflow: one explicitly named playbook, explicit
existing `P-XXX` IDs, expected-before and replacement-after content, and a
rationale. Missing or ambiguous targets block. Independent read-only subagent
semantic review is mandatory; unavailable, rejected, or unknown review blocks
application. The initial request authorizes application after successful
review within its unchanged scope; seek a new decision only if scope, intent,
or targets change.

The skill and `TARGET_ROOT/ace/skills/rectify-playbook/references/review.md`
own semantic review; `rectify_playbook.js` owns deterministic guards, hashes,
separate `TARGET_ROOT/ace/state/rectifications/<id>.json` audits, retrieval
regeneration, and interrupted-application resume. Existing contents only: no
ADD/MERGE, moves, status changes, counter resets, fabricated
traces/proposals/ordinary gate evidence, or consumption of pending lifecycle
batches. Do not add automatic skill routing or rectification duties to worker
prompts or personas.

## Phase 8 - Integrate global instructions

For each selected platform, add a concise permanent ACE section outside the
generated retrieval markers:

- ACE is operational learning memory for this project;
- selected agents read their scoped lessons before acting and cite applied
  IDs;
- for ordinary tasks, the orchestrator writes traces and runs counters plus
  threshold checks;
- reflector, curator, and warden own their respective stages;
- ordinary learning remains warden-only through `apply_delta.js`, with
  separate explicit human sign-off and apply confirmations; the only
  external-correction exception is user-invoked `rectify-playbook`
  through `rectify_playbook.js` under its mandatory independent review;
- higher-priority project and safety instructions always win.

Do not duplicate a rule already present. Do not replace destination-specific
safety or domain instructions.

## Phase 9 - Generate retrieval output

Run, in order, by absolute path with `TARGET_ROOT` as the working directory:

1. `node <TARGET_ROOT>/ace/scripts/generate_ace_agents.js`
2. `node <TARGET_ROOT>/ace/scripts/retrieval.js`
3. `node <TARGET_ROOT>/ace/scripts/generate_ace_agents.js --check`
4. `node <TARGET_ROOT>/ace/scripts/retrieval.js --check`
5. `node <TARGET_ROOT>/ace/scripts/validate_install.js`

Read the real output of every command. A non-zero check is a blocker to fix,
not a result to narrate away.

If the destination uses a registry/generator, also run its existing sync and
check commands. Do not install a new build/lint tool solely for ACE.

After all generation, destination sync, and checks succeed, copy
`KIT_ROOT/ace/runtime-version.json` verbatim to
`TARGET_ROOT/ace/runtime-version.json` as the final kit-owned write. Verify
byte-for-byte equality. If a later correction changes any kit-owned asset,
repeat generation and checks as needed, then repeat this final manifest copy
and byte verification.

## Phase 10 - Final verification

Verify all of the following:

- every path declared by `TARGET_ROOT/ace/runtime-version.json` under
  `ownership.kit_owned` is a regular file under `TARGET_ROOT` with the
  declared normalized SHA-256;
- no required script, schema, prompt, template, `scripts/lib` dependency, or
  canonical `TARGET_ROOT/ace/skills/rectify-playbook/` file was omitted;
- the runtime manifest is verbatim from the kit and was the final kit-owned
  write after all generation;
- `TARGET_ROOT/ace/config/project.json` contains no unresolved
  `__PLACEHOLDER__`;
- selected agents and only selected agents have scoped playbooks and ACE
  integration;
- every configured agent name is unique;
- generated ACE wrappers exist only for selected platforms;
- complete `rectify-playbook` copies, each with `SKILL.md` and its review
  contract, are current at `TARGET_ROOT/.github/skills/rectify-playbook/` for
  enabled Copilot and `TARGET_ROOT/.claude/skills/rectify-playbook/` for
  enabled Claude, keep their user-only invocation constraints, and no
  disabled-platform copy was created;
- no runtime-skill conflict remains, unrelated host skills are unchanged, and
  neither operator skill was installed into the host;
- every declared lifecycle delegate exactly matches the generated lifecycle
  wrapper frontmatter `name` for that platform;
- only `ownership.mode_specific.embedded` README files were installed;
- all wrapper source links resolve;
- every pre-install behavioral contract element has an explicit preserved,
  representation-only, platform-required, or user-approved destination;
- no workflow condition, ordering constraint, delegation payload, fallback,
  safety gate, or authorized alternative was weakened or dropped;
- harness conversions preserve selected models and effective capabilities when
  supported by the target harness;
- orchestrator delegation reaches reflector, reflector reaches curator, and
  curator reaches warden;
- the warden wrapper declares a real platform question tool; if delegation
  does not propagate it, verify that the orchestrator can relay the warden's
  separate sign-off and apply questions and the user's explicit responses
  (using its own tool, or new user turns in the main chat);
- the external-correction skill retains exact-target guards, mandatory
  independent read-only review, initial-request authorization for unchanged
  scope, and separate audits without weakening the ordinary learning cycle;
- user-invoked correction-only requests skip normal trace, counter,
  and threshold work for the correction itself; ordinary and mixed work are
  not given that bypass, and no agent invokes or forwards the skill;
- global and scoped retrieval markers are current;
- no learned data or references from the kit's source project were copied;
- destination runtime JSON is not ignored and remains available for version
  control;
- no pre-existing destination behavior or dirty-worktree change was lost;
- `git -C <TARGET_ROOT> diff` contains only the approved installation, and
  `git -C <KIT_ROOT> status` is unchanged.

Present a final table of created/modified files, the absolute `KIT_ROOT` and
`TARGET_ROOT`, chosen platforms, chosen
orchestrator, participating agents, persona choice, commands run, and any
remaining manual action. Also present the preservation matrix and every
intentional behavioral difference. Unexplained behavioral loss blocks
success. Do not commit or push unless the user separately asks for it.
