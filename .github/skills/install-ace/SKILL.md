---
name: install-ace
description: "USER-INVOKED ONLY: run solely when the user explicitly invokes /install-ace; never auto-select, delegate, chain or run it from agents, subagents, handoffs or other skills. Installs ACE from the local ACE kit into a repository that has no ACE installation, in embedded or mediated mode, including the rectify-playbook runtime skill, while preserving every pre-existing operational contract. Not for updating ACE, changing integration paradigm, or explaining ACE."
argument-hint: "[embedded|mediated] [absolute KIT_ROOT] [absolute TARGET_ROOT] [personas yes|no]"
user-invocable: true
disable-model-invocation: true
---

# Install ACE

Install ACE from the ACE kit into another local repository. Complete the
installation and prove that ACE, including its `rectify-playbook` runtime
skill, was added without silently redesigning the destination's operational
agents.

## Invocation gate: user-invoked only

This skill is user-invocable only; `disable-model-invocation: true` prevents
automatic selection.

- Run it only when the user explicitly invokes it in the current conversation,
  normally with `/install-ace`.
- No agent, subagent, handoff, hook, other skill, or automation may load,
  delegate, forward, chain, or emulate it, including by reading this file. If
  it reached you any other way, stop without writing and ask the user to
  invoke `/install-ace` directly.
- Keep every decision and write in the invoking session. Helper subagents may
  only gather read-only evidence; they never ask the user, approve, or write.
- Never switch to `update-ace` or execute its procedure yourself. When this
  procedure routes elsewhere, stop and tell the user which skill to invoke.

## Absolute paths

`KIT_ROOT` must be the absolute root of the ACE kit checkout. Resolve it from
the active workspace only after verifying that it contains the files in the
table below, or use an absolute path supplied by the user. If neither source
is unambiguous, ask for the absolute kit path. `TARGET_ROOT` is the absolute
root of the destination repository.

Every file and directory reference in this skill is absolute:

| Purpose | Absolute path |
|---|---|
| Embedded installation prompt | `<KIT_ROOT>\INSTALL_PROMPT_EMBEDDED.md` |
| Mediated installation prompt | `<KIT_ROOT>\INSTALL_PROMPT_MEDIATED.md` |
| Runtime manifest | `<KIT_ROOT>\ace\runtime-version.json` |
| Runtime source tree | `<KIT_ROOT>\ace\` |
| Empty playbook skeleton | `<KIT_ROOT>\playbooks\` |
| `rectify-playbook` skill source | `<KIT_ROOT>\.github\skills\rectify-playbook\` |
| `rectify-playbook` correction script | `<KIT_ROOT>\ace\scripts\rectify_playbook.js` |

Write destination paths as `<TARGET_ROOT>\...` and expand them to absolute
paths before every read, write, copy, comparison, or command. Run target
scripts by absolute path with `<TARGET_ROOT>` as the working directory, for
example `node "<TARGET_ROOT>\ace\scripts\validate_install.js"`. Never resolve
a relative path against the current directory, the chat workspace, or this
skill's directory, and never search the disk for another kit. Paths that the
installation writes into destination files stay repository-relative, as the
selected prompt requires.

## Classify before writing

1. Resolve `TARGET_ROOT`: use the absolute destination path from the
   invocation; otherwise use the root of the current workspace repository
   (`git rev-parse --show-toplevel` when it is a Git repository). If neither
   is unambiguous, ask for the absolute path. Canonicalize it.
2. Verify the kit before trusting it: every kit path in the table above must
   exist, and the `source_paths` of
   `<KIT_ROOT>\ace\runtime-version.json` must map the two
   installed `rectify-playbook` runtime files to
   `<KIT_ROOT>\.github\skills\rectify-playbook\SKILL.md` and
   `<KIT_ROOT>\.github\skills\rectify-playbook\references\review.md`.
   If verification fails, stop and ask the user for the absolute kit path.
3. Verify that both roots are distinct local directories and that neither
   contains the other.
   Never treat the user-level skill directory or `TARGET_ROOT` as the kit,
   and never install into the kit.
4. Record the kit's branch, commit, and
   `git -C "<KIT_ROOT>" status --porcelain` output. The kit
   is read-only for this procedure.
5. Detect existing ACE configuration, runtime, markers, playbooks, or lifecycle
   wrappers under `<TARGET_ROOT>`, including `<TARGET_ROOT>\ace\` and
   `<TARGET_ROOT>\playbooks\`. A same-name
   `<TARGET_ROOT>\.github\skills\rectify-playbook\` or
   `<TARGET_ROOT>\.claude\skills\rectify-playbook\` directory alone is a
   collision to resolve through the prompt, not proof of an installation.
6. If ACE is already installed, stop without writing and tell the user to
   invoke `/update-ace`.
7. If the request changes an existing installation between embedded and
   mediated, classify it as a migration and stop for a separately approved
   migration plan.
8. If the request is informational only, explain ACE without performing this
   skill.

## Select the canonical installer

Ask the user to choose the integration mode when the invocation does not make
it explicit:

- **Embedded:** selected operational agents participate directly in ACE. Read
  and execute `<KIT_ROOT>\INSTALL_PROMPT_EMBEDDED.md`
  completely.
- **Mediated:** ordinary workers remain unchanged and ACE is available through
  an opt-in orchestrator wrapper. Read and execute
  `<KIT_ROOT>\INSTALL_PROMPT_MEDIATED.md` completely.

Read the selected prompt with a real file-reading tool, in sequential ranges if
the tool truncates it; never execute it from memory or a summary. For that
prompt, `KIT_ROOT` is `<KIT_ROOT>` and `TARGET_ROOT` is the
root resolved above. The prompt is the detailed installation procedure. This
skill adds the invocation gate, the absolute-path rules, the
`rectify-playbook` delivery gate, and the non-skippable preservation protocol
below; it does not replace or summarize prompt phases.

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

## Deliver the `rectify-playbook` runtime skill

Every clean installation, embedded or mediated, must deliver the complete
`rectify-playbook` skill together with the framework; it is part of the
mandatory manifest inventory, not an optional feature. The selected prompt
performs the copy and generation. This skill makes each condition below a
blocking acceptance criterion:

1. `<TARGET_ROOT>\ace\scripts\rectify_playbook.js`,
   `<TARGET_ROOT>\ace\skills\rectify-playbook\SKILL.md`, and
   `<TARGET_ROOT>\ace\skills\rectify-playbook\references\review.md` are
   regular files whose normalized SHA-256 matches
   `<KIT_ROOT>\ace\runtime-version.json`. The two skill files
   come from `<KIT_ROOT>\.github\skills\rectify-playbook\`
   through manifest `source_paths`; copying
   `<KIT_ROOT>\ace\` alone does not include them.
2. `node "<TARGET_ROOT>\ace\scripts\generate_ace_agents.js"` created complete
   invocable copies at `<TARGET_ROOT>\.github\skills\rectify-playbook\` when
   Copilot is enabled and at `<TARGET_ROOT>\.claude\skills\rectify-playbook\`
   when Claude is enabled, each identical to the internal runtime assets.
3. No copy exists for a disabled platform, unrelated host skills are
   unchanged, and neither `install-ace` nor `update-ace` was installed into the
   target. Never copy the kit's whole
   `<KIT_ROOT>\.github\skills\` directory.
4. Every copy keeps `user-invocable: true`, `disable-model-invocation: true`,
   and its user-only description and entry gate. The installation adds no
   routing, delegate, handoff, hook, or instruction that invokes the skill
   automatically or on an agent's behalf.

A missing, stale, or extra copy blocks success. Resolve a same-name host skill
only through the explicit conflict decision required by the prompt.

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
   `integration_mode` from
   `<KIT_ROOT>\ace\runtime-version.json`: embedded receives
   the embedded README pair, mediated receives the mediated pair. Do not copy
   the other mode's README files.
4. Run all generation, retrieval, registry, validation, and focused test
   commands required by that prompt, by absolute path with `<TARGET_ROOT>` as
   the working directory:

   ```text
   node "<TARGET_ROOT>\ace\scripts\generate_ace_agents.js"
   node "<TARGET_ROOT>\ace\scripts\retrieval.js"
   node "<TARGET_ROOT>\ace\scripts\generate_ace_agents.js" --check
   node "<TARGET_ROOT>\ace\scripts\retrieval.js" --check
   node "<TARGET_ROOT>\ace\scripts\validate_install.js"
   ```

5. Verify every `rectify-playbook` delivery condition above.
6. Reconstruct each effective contract from the resulting persona, wrapper,
   registry, instructions, and generated assets.
7. Compare it with the baseline and classify every delta as:
   `ACE-additive`, `representation-only`, `platform-required`,
   `user-approved`, or `unexplained-loss`.
8. Confirm that `git -C "<KIT_ROOT>" status --porcelain`
   still matches the output recorded before installation: the kit is
   unchanged.
9. Verify that ACE runtime JSON paths are not ignored by
   `<TARGET_ROOT>\.gitignore`. Report any newly visible untracked runtime data
   for normal review; do not stage or commit it automatically.
10. Do not claim success while any `unexplained-loss`, unresolved conflict,
    failed check, unanswered decision, or missing or stale `rectify-playbook`
    copy remains.

The final report must include the absolute `KIT_ROOT` with its recorded
branch, commit, and status, the absolute `TARGET_ROOT`, the prompt's
file/command report, the `rectify-playbook` delivery evidence, and the
behavioral preservation matrix with all intentional differences.
