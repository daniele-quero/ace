---
name: install-ace
description: Install, add, bootstrap, integrate, embed, enable, or set up ACE in a local repository that has no existing ACE installation. Use for embedded or mediated setup, including persona/wrapper adoption and single-harness agent conversion. Preserve every pre-existing operational contract. Do not use for updating ACE, changing integration paradigm, or merely explaining ACE.
---

# Install ACE

Install ACE from the current kit into another local repository. Complete the
installation and prove that ACE was added without silently redesigning the
destination's operational agents.

## Classify before writing

1. Resolve `TARGET_ROOT` from the request or current workspace.
2. Resolve `KIT_ROOT` independently:
   - when this skill is loaded from its canonical project copy, use the
     repository containing `INSTALL_PROMPT_EMBEDDED.md` and
     `INSTALL_PROMPT_MEDIATED.md`;
   - when this is a published user-level copy, use an explicit path from the
     request or the harness's configured ACE kit origin;
   - if no unique local kit can be proven, ask for `KIT_ROOT`.
   Never treat the user-level skill directory or `TARGET_ROOT` as the kit.
3. Verify that the selected kit contains both canonical installation prompts
   and that the roots are distinct local directories.
4. Detect existing ACE configuration, runtime, markers, playbooks, or lifecycle
   wrappers.
5. If ACE is already installed, stop this procedure and use `update-ace`.
6. If the request changes an existing installation between embedded and
   mediated, classify it as a migration and stop for a separately approved
   migration plan.
7. If the request is informational only, explain ACE without performing this
   skill.

## Select the canonical installer

Ask the user to choose the integration mode when it is not already explicit:

- **Embedded:** selected operational agents participate directly in ACE. Read
  and execute `INSTALL_PROMPT_EMBEDDED.md` completely.
- **Mediated:** ordinary workers remain unchanged and ACE is available through
  an opt-in orchestrator wrapper. Read and execute
  `INSTALL_PROMPT_MEDIATED.md` completely.

The prompt is the detailed installation procedure. This skill adds routing and
the non-skippable preservation protocol below; it does not replace or summarize
prompt phases.

## Establish a behavioral baseline

Before editing, identify every source that contributes to effective behavior:

- platform wrappers and frontmatter;
- personas and inline agent bodies;
- registries, manifests, generators, and generated output;
- repository and scoped instructions;
- handoffs and delegation relationships;
- workflow documentation referenced by an agent.

For every operational agent and user-facing entry point, record:

- runtime identity, description, invocation state, argument hints, and model;
- harness, model provider, and selected model as separate dimensions;
- tool capabilities, delegates, handoffs, and interaction mechanism;
- required inputs and preconditions;
- ordered workflow, branching, parallelism, isolation, and iteration limits;
- delegation payloads and return contracts;
- success criteria, verification, fallbacks, escalation, and stop conditions;
- safety gates, prohibited actions, file scope, Git side effects, and required
  user approvals.

Correlate logical agents by evidence, not filename alone. If sources conflict,
show the conflict and obtain a canonical choice before transforming them.

## Preserve behavior across representation changes

Apply these invariants:

1. **Relocate; do not summarize.** Moving behavior into a persona or wrapper
   is not permission to compress, paraphrase, deduplicate, or improve it.
2. **Translate representation; preserve capability and intent.** A harness
   conversion may change file layout, frontmatter schema, tool names, delegate
   syntax, and links. It must not silently change runtime capabilities.
3. **Keep harness and model independent.** Preserve the selected model and
   provider whenever the target harness supports them. A single Copilot harness
   may still use models from different providers.
4. If the original model is unsupported, prove the incompatibility, present
   supported alternatives and consequences, and obtain an explicit choice.
5. Preserve both a prohibition and its authorized alternative. Do not retain
   “never write here” while dropping where or to whom the work must go.
6. Preserve sequence and composition: ordering, fan-out, parallel execution,
   context isolation, retry limits, return routing, and gates are behavior.
7. Verify producer and consumer contracts together. A receiving agent that
   accepts a flag or artifact is insufficient unless the sender still must
   produce it.
8. Keep guardrails required before persona loading in the wrapper. Do not rely
   on future ACE lessons to restore behavior removed during installation.
9. Preserve project-owned ACE runtime JSON as versionable project data.
   Installing a clean kit must not copy runtime data from the kit source
   project, but traces, proposals, decisions, counters, and state created in
   the destination must not be ignored or excluded from version control.

### Example

Correct conversion:

| Dimension | Source | Target |
|---|---|---|
| Harness | Claude Code | GitHub Copilot |
| Agent file | Claude agent file | Copilot `.agent.md` |
| Tool declaration | Claude syntax | Equivalent Copilot tool syntax |
| Model | Claude Sonnet | Claude Sonnet through Copilot |
| Workflow | Inline | Same workflow in persona plus wrapper guardrails |

Incorrect conversion: replacing the selected model with a generic harness
default, reducing a multi-step gate to “validate”, or replacing per-item
parallel delegation with an unspecified delegation.

## Build a preservation matrix

Before writing, map every baseline element to its destination:

| Source contract element | Destination | Classification | Evidence |
|---|---|---|---|
| Existing workflow step | Persona or inline body | Preserved | Equivalent text/structure |
| Model and tools | Wrapper or registry | Preserved/translated | Supported target declaration |
| Safety gate | Wrapper or persona | Preserved | Effective before the guarded action |
| ACE lifecycle behavior | ACE block | Additive | Installer contract |

No source element may have an implicit destination. Any intended behavior
change requires explicit user approval and must be listed separately from ACE
additions.

## Execute and verify

1. Execute every phase of the selected installation prompt.
2. For each enabled platform, derive the lifecycle runtime names from the
   configured `runtime_prefix` exactly as the generator does:
   `<runtime_prefix>/ace/reflector`, `<runtime_prefix>/ace/curator`, and
   `<runtime_prefix>/ace/warden`. Materialize these exact names in every
   orchestrator wrapper, persona, template-derived ACE block, delegate list,
   and handoff; never refer to a bare role name or invent a display-name
   variant. After generation, verify the declared orchestrator delegate matches
   the generated lifecycle agent frontmatter `name`.
3. Install only the `mode_specific` README files for the selected
   `integration_mode` from `ace/runtime-version.json`: embedded receives the
   embedded README pair, mediated receives the mediated pair. Do not copy the
   other mode's README files.
4. Run all generation, retrieval, registry, validation, and focused test
   commands required by that prompt.
5. Reconstruct each effective contract from the resulting persona, wrapper,
   registry, instructions, and generated assets.
6. Compare it with the baseline and classify every delta as:
   `ACE-additive`, `representation-only`, `platform-required`,
   `user-approved`, or `unexplained-loss`.
7. Do not claim success while any `unexplained-loss`, unresolved conflict,
   failed check, or unanswered decision remains.
8. Verify that ACE runtime JSON paths are not ignored by the destination's
   `.gitignore`. Report any newly visible untracked runtime data for normal
   review; do not stage or commit it automatically.

The final report must include both the prompt's file/command report and the
behavioral preservation matrix with all intentional differences.
