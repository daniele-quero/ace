# ACE installation prompt

Use this prompt from the root of the ACE kit repository. Its purpose is to
install the generic ACE framework into another local project. The directory
that contains this file is `KIT_ROOT`; the destination repository is
`TARGET_ROOT`.

You are an installation agent. Complete the installation, not merely a review.
Preserve the destination project's behavior and conventions. Never modify the
ACE kit source while installing it.

## Non-negotiable interaction rules

- Use the runtime's dedicated question tool for every decision:
  `ask_user` or `vscode/askQuestions` on GitHub Copilot, and
  `AskUserQuestion` on Claude Code.
- Ask exactly one question at a time. Use multi-select only for choosing
  multiple agents.
- Do not infer consent from silence or plain conversational context.
- If the dedicated question tool is unavailable, stop and explain the blocker.
- Never overwrite an existing ACE installation, persona, wrapper, registry, or
  instruction block without showing the conflict and receiving an explicit
  choice.

## Phase 0 - Establish roots and safety

1. Resolve `KIT_ROOT` from this file.
2. Resolve `TARGET_ROOT` from the user's request or current repository. If it
   is ambiguous, ask for the target path.
3. Verify that both roots are local directories and are different.
4. Read the destination's repository instructions before any write.
5. Inspect `git status` in the destination. Existing changes are not a reason
   to stop, but they must not be reverted, reformatted, staged, or overwritten.
6. Detect an existing `ace/`, `playbooks/`, ACE markers, `P-NNN` bullets, or
   ACE agent wrappers. If any exist, stop and ask whether to abort, inspect an
   upgrade, or install only missing pieces. Do not treat an upgrade as a clean
   install.

## Phase 1 - Discover the agent apparatus

Read, when present:

- root instructions such as `AGENTS.md`, `CLAUDE.md`, and
  `.github/copilot-instructions.md`;
- `.github/agents/**/*.agent.md` and `.claude/agents/**/*.md`;
- project-specific agent registries, generators, manifests, or sync scripts;
- existing `docs/agent-personas/` and agent-related workflow documentation;
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

## Phase 2 - Detect platforms and ask installation scope

Detect GitHub Copilot from `.github/agents`, Copilot instructions, or an
equivalent registry. Detect Claude Code from `.claude/agents`, `CLAUDE.md`, or
an equivalent registry.

Use the question tool to ask which platform assets to install. The choices
must reflect discovery and include:

- all detected platforms;
- only each detected platform;
- creating the missing counterpart when only one platform was detected.

Do not create a platform apparatus that the user did not select.
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
`ace/templates/orchestrator-persona.md` or
`ace/templates/orchestrator-inline.md` according to the persona decision
below. Give it only tools and delegates verified as available in the selected
platform apparatus. Never invent runtime capabilities.

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
> `docs/agent-personas/` and minimal platform wrappers that link to it?

Offer `Yes` and `No`; do not choose automatically merely because the ACE
lifecycle agents themselves use source personas.

### If the answer is Yes

1. Create or reuse `docs/agent-personas/`.
2. For every selected operational agent, identify its canonical behavioral
   body. If it already links to a persona, preserve and update that persona.
3. Otherwise move the operational workflow, responsibilities, domain rules,
   and non-platform-specific behavior into
   `docs/agent-personas/<canonical-id>.md`.
4. Preserve relevant structure and wording. This is a relocation and
   integration, not a redesign of the agent.
5. For participating non-orchestrators, add the content from
   `ace/templates/agent-ace-section.md`, replacing placeholders and merging
   with an existing ACE section instead of duplicating it.
6. For the chosen existing orchestrator, merge the ACE cycle and delegation
   responsibilities from `ace/templates/orchestrator-persona.md` into its
   existing persona without replacing project-specific behavior. For a new
   orchestrator, materialize the complete template.
7. Leave each platform wrapper with:
   - all original frontmatter and runtime metadata;
   - an explicit link to the persona and instruction to read it with a real
     file-reading tool;
   - an explicit link to that agent's generated ACE instruction file;
   - only safety/scope guardrails that cannot safely depend on an external
     read;
   - a short minimum cycle.
8. Use `ace/templates/persona-wrapper-body.md` as the shape, adapted to the
   destination's platform conventions. Compute correct relative links.
9. If the destination has a canonical agent registry/generator, update its
   source of truth and regenerate wrappers. Do not hand-edit generated files
   as the primary change.

### If the answer is No

1. Keep each selected operational agent's current behavioral body in place.
2. Append or merge the content of `ace/templates/agent-ace-section.md` into
   each selected non-orchestrator platform agent file.
3. For the chosen existing orchestrator, merge
   `ace/templates/orchestrator-inline.md` into its body. For a new
   orchestrator, materialize that template in each selected platform wrapper.
4. Add an explicit instruction to read the generated scoped ACE instruction
   before work.
5. Preserve frontmatter, tools, delegates, handoffs, and unrelated body text.
6. Do not create `docs/agent-personas/`.

## Phase 6 - Install the runtime

1. Copy `KIT_ROOT/ace/` to `TARGET_ROOT/ace/`, excluding:
   - `ace/config/project.json` if one somehow exists in the kit checkout;
   - temporary files, test fixtures, generated wrappers, and runtime output.
2. Copy the empty `KIT_ROOT/playbooks/` skeleton to
   `TARGET_ROOT/playbooks/`.
3. Do not copy traces, proposals, decisions, learned bullets, counters, or
   state from any other project. The kit directories must be empty except for
   documentation, `.gitkeep`, and the initial empty state file.
4. Copy `ace/config/project.template.json` to
   `ace/config/project.json` and materialize:
   - `team_name`;
   - `provisional_evaluator`;
   - `orchestrator_agent`;
   - exact `participating_agents`;
   - optional `agent_families` mappings when the destination already defines
     stable cross-cutting task families; otherwise use `{}`;
   - enabled selected platforms;
   - actual destination paths;
   - verified runtime prefix, model, and ACE tools for each platform.
5. Tool arrays must match capabilities actually available in the destination.
   Reflector and curator need read/write/search/shell/delegation. Warden needs
   read/shell/dedicated-question. If any capability is missing, report the
   specific blocker and stop before generating a wrapper that claims it.
6. Create an empty `playbooks/<canonical-id>.md` for the orchestrator and each
   participating agent, following the format comment in `_global.md`.
7. Create an empty `playbooks/families/<family>.md` for every configured
   family.
8. Keep canonical ids filesystem-safe and unique. If a discovered runtime name
   is namespaced, use the stable local id rather than slashes as the scope
   filename.
9. Merge the ACE runtime-data rules from `KIT_ROOT/.gitignore` into the
   destination `.gitignore` without replacing existing rules. Preserve the
   `.gitkeep` exceptions and verify with `git status` that `project.json`,
   traces, proposals, applied batches, and state JSON are ignored.

## Phase 7 - Generate ACE agents and wire delegation

1. Run `node ace/scripts/generate_ace_agents.js`.
2. Verify the generated `reflector -> curator -> warden` delegation chain on
   every selected platform.
3. Add the platform-specific reflector runtime name to the chosen
   orchestrator's declared delegates/agents using the destination's canonical
   registry when one exists.
4. Ensure the orchestrator owns trace writing, counter updates, threshold
   checks, and reflector invocation. Participating agents only return trace
   elements unless the destination explicitly assigns them a stronger role.
5. If a new orchestrator was requested, create its selected-platform wrappers
   and register it through the destination's canonical mechanism.

## Phase 8 - Integrate global instructions

For each selected platform, add a concise permanent ACE section outside the
generated retrieval markers:

- ACE is operational learning memory for this project;
- selected agents read their scoped lessons before acting and cite applied
  IDs;
- the orchestrator writes traces and runs counters plus threshold checks;
- reflector, curator, and warden own their respective stages;
- only warden may apply playbook changes after explicit human sign-off;
- higher-priority project and safety instructions always win.

Do not duplicate a rule already present. Do not replace destination-specific
safety or domain instructions.

## Phase 9 - Generate retrieval output

Run, in order:

1. `node ace/scripts/generate_ace_agents.js`
2. `node ace/scripts/retrieval.js`
3. `node ace/scripts/generate_ace_agents.js --check`
4. `node ace/scripts/retrieval.js --check`
5. `node ace/scripts/validate_install.js`

Read the real output of every command. A non-zero check is a blocker to fix,
not a result to narrate away.

If the destination uses a registry/generator, also run its existing sync and
check commands. Do not install a new build/lint tool solely for ACE.

## Phase 10 - Final verification

Verify all of the following:

- `ace/config/project.json` contains no unresolved `__PLACEHOLDER__`;
- selected agents and only selected agents have scoped playbooks and ACE
  integration;
- every configured agent name is unique;
- generated ACE wrappers exist only for selected platforms;
- all wrapper source links resolve;
- orchestrator delegation reaches reflector, reflector reaches curator, and
  curator reaches warden;
- warden has a dedicated question tool;
- global and scoped retrieval markers are current;
- no learned data or references from the kit's source project were copied;
- no pre-existing destination behavior or dirty-worktree change was lost;
- `git diff` contains only the approved installation.

Present a final table of created/modified files, chosen platforms, chosen
orchestrator, participating agents, persona choice, commands run, and any
remaining manual action. Do not commit or push unless the user separately asks
for it.
