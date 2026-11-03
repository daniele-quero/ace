---
name: update-ace
description: "USER-INVOKED ONLY: run solely when the user explicitly invokes /update-ace; never auto-select, delegate, chain or run it from agents, subagents, handoffs or other skills. Updates, upgrades, refreshes, reconciles, or repairs an existing ACE installation from the local ACE kit, including its runtime, wrappers, personas, configuration, generated integration, lifecycle assets, and the rectify-playbook runtime skill. Preserves the installed paradigm, project-owned operational contracts, selected models, learned data, and runtime state. Not for a clean install, paradigm migration, or unrelated agent redesign."
argument-hint: "[absolute KIT_ROOT] [absolute TARGET_ROOT]"
user-invocable: true
disable-model-invocation: true
---

# Update ACE

Update an existing ACE installation from the current kit without changing its
integration paradigm, project behavior, or accumulated operational memory.
Every update also installs or refreshes the `rectify-playbook` runtime skill.

## Invocation gate: user-invoked only

This skill is user-invocable only; `disable-model-invocation: true` prevents
automatic selection.

- Run it only when the user explicitly invokes it in the current conversation,
  normally with `/update-ace`.
- No agent, subagent, handoff, hook, other skill, or automation may load,
  delegate, forward, chain, or emulate it, including by reading this file. If
  it reached you any other way, stop without writing and ask the user to
  invoke `/update-ace` directly.
- Keep every decision and write in the invoking session. Helper subagents may
  only gather read-only evidence; they never ask the user, approve, or write.
- Never switch to `install-ace` or execute its procedure yourself. When this
  procedure routes elsewhere, stop and tell the user which skill to invoke.

## Absolute paths

`KIT_ROOT` must be the absolute root of the ACE kit checkout. Resolve it from
the active workspace only after verifying that it contains the files in the
table below, or use an absolute path supplied by the user. If neither source
is unambiguous, ask for the absolute kit path. `TARGET_ROOT` is the absolute
root of the installed repository.

Every file and directory reference in this skill is absolute:

| Purpose | Absolute path |
|---|---|
| Update prompt | `<KIT_ROOT>\UPDATE_PROMPT.md` |
| Update inspector | `<KIT_ROOT>\ace\scripts\inspect_update.js` |
| Runtime manifest | `<KIT_ROOT>\ace\runtime-version.json` |
| Configuration template | `<KIT_ROOT>\ace\config\project.template.json` |
| Runtime source tree | `<KIT_ROOT>\ace\` |
| `rectify-playbook` skill source | `<KIT_ROOT>\.github\skills\rectify-playbook\` |
| `rectify-playbook` correction script | `<KIT_ROOT>\ace\scripts\rectify_playbook.js` |

Write destination paths as `<TARGET_ROOT>\...` and expand them to absolute
paths before every read, write, copy, comparison, or command. Run target
scripts by absolute path with `<TARGET_ROOT>` as the working directory, for
example `node "<TARGET_ROOT>\ace\scripts\validate_install.js"`. Never resolve
a relative path against the current directory, the chat workspace, or this
skill's directory, and never search the disk for another kit. Paths that the
update writes into destination files stay repository-relative, as the update
prompt requires.

## Classify before writing

1. Resolve `TARGET_ROOT`: use the absolute installed-repository path from the
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
   Never use the target's installed ACE copy or the user-level skill directory
   as the update source.
3. Verify that both roots are distinct local directories and that neither
   contains the other.
4. Record the kit's branch, commit, and
   `git -C "<KIT_ROOT>" status --porcelain` output. The kit
   is read-only for this procedure.
5. **Before any other target inspection, run the authoritative read-only
   inventory from the kit:**

   ```text
   node "<KIT_ROOT>\ace\scripts\inspect_update.js" --target "<TARGET_ROOT>"
   ```

   Run this exact command as soon as the roots have been verified—before
   reading target files, checking Git status, classifying ownership, or
   planning writes. Never run or trust an inspector copied under
   `<TARGET_ROOT>\ace\scripts\`. Treat its `write_performed: false` report as
   the initial evidence for the installed runtime version, complete kit-owned
   file inventory (including every `rectify-playbook` file and platform copy),
   managed merges, protected runtime data, conflicts, and required
   normalization.
6. Verify from that report and corroborating evidence that `TARGET_ROOT`
   contains an ACE installation.
7. If no installation exists, stop without writing and tell the user to
   invoke `/install-ace`.
8. Determine its behaviorally effective integration mode.
9. Stop for a separately approved migration plan if the request changes
   embedded to mediated, mediated to embedded, or materially redesigns
   project-owned agents.
10. Read `<KIT_ROOT>\UPDATE_PROMPT.md` completely with a real
    file-reading tool, in sequential ranges if the tool truncates it, and
    execute it; never execute it from memory or a summary. For that prompt,
    `KIT_ROOT` is `<KIT_ROOT>` and `TARGET_ROOT` is the root
    resolved above. Always run its inspector from the kit, never from the
    installed target copy.

The update prompt owns the detailed reconciliation procedure. This skill adds
the invocation gate, the absolute-path rules, and the `rectify-playbook`
delivery gate, and makes behavioral preservation and pre/post equivalence
mandatory.

## Capture the pre-update contract

Before editing, save the Git baseline and identify all effective behavior from:

- wrappers, personas, inline bodies, and referenced instructions;
- registries, generators, manifests, and generated files;
- frontmatter, runtime mappings, delegates, and handoffs;
- installed integration mode and entry-point routing;
- project-owned extensions and local modifications.

For every operational agent and entry point, record:

- runtime identity, harness, model provider, selected model, and invocation
  state;
- tools, delegates, handoffs, and user-interaction capabilities;
- required inputs, ordered workflow, branching, parallelism, and isolation;
- delegation payloads, output contracts, retry limits, and return routing;
- success and verification criteria, fallbacks, escalation, and stop gates;
- prohibited actions, file scope, approvals, and side effects.

Also classify each relevant path using the update prompt's ownership model:
kit-owned, project-owned, managed ACE merge, or runtime data.

## Update invariants

1. **Representation changes are not behavioral authorization.** Preserve the
   effective contract even when the current kit changes wrapper or persona
   structure.
2. **Harness and model are independent.** Preserve the selected model and
   provider whenever supported by the target harness. A generic harness label
   is not an equivalent replacement for a specific model.
3. A platform conversion may translate paths, frontmatter fields, tool names,
   delegate syntax, and links only as required by the target format.
4. If a model or capability is no longer supported, prove that fact and obtain
   an explicit choice before substituting it.
5. Do not summarize project-owned workflows. Preserve conditions, ordering,
   payloads, fan-out, parallelism, retry limits, fallbacks, escalation,
   prohibitions, and authorized alternatives.
6. Verify cross-agent contracts at both ends: producers must still emit every
   flag, artifact, identifier, and verification result required by consumers.
7. ACE-owned additions may refine behavior but cannot justify removing an
   existing operational rule.
8. Preserve runtime and learned state byte-for-byte unless the prompt
   authorizes a documented compatible data migration.
9. Keep project-owned runtime JSON (including traces, proposals, decisions,
   counters, and state) trackable by Git. Do not add or retain ACE ignore
   rules that hide these records.

### Example

An update may change a Copilot wrapper's field names because the supported
schema changed. It may not replace its specific selected model, collapse a
multi-agent workflow into one generic instruction, or remove the sender rule
for a flag that the receiving agent still expects.

## Reconcile with an explicit matrix

For each pre-update contract element, record:

| Contract element | Pre-update source | Post-update source | Classification |
|---|---|---|---|
| Project workflow | Persona/body | Persona/body | Preserved |
| Model/tool capability | Wrapper/registry | Wrapper/registry | Preserved or translated |
| Safety gate | Wrapper/persona | Wrapper/persona | Preserved |
| ACE lifecycle duty | Managed block | Current managed block | Framework update |

Permitted classifications are `preserved`, `representation-only`,
`framework-required`, and `user-approved`. A missing, weakened, or unexplained
element is blocking.

## Deliver the `rectify-playbook` runtime skill

Every update or upgrade must install or refresh the complete
`rectify-playbook` skill, including older installations where it is missing or
whose installed manifest has no `source_paths`. It is neither an optional
feature nor a paradigm migration. The update prompt performs the replacement
and generation. This skill makes each condition below a blocking acceptance
criterion:

1. `<TARGET_ROOT>\ace\scripts\rectify_playbook.js`,
   `<TARGET_ROOT>\ace\skills\rectify-playbook\SKILL.md`, and
   `<TARGET_ROOT>\ace\skills\rectify-playbook\references\review.md` are
   regular files whose normalized SHA-256 matches
   `<KIT_ROOT>\ace\runtime-version.json`. The two skill files
   come from `<KIT_ROOT>\.github\skills\rectify-playbook\`
   through the kit manifest's `source_paths`; never use the old installed
   manifest to locate kit sources.
2. `node "<TARGET_ROOT>\ace\scripts\generate_ace_agents.js"` installed or
   refreshed complete copies at `<TARGET_ROOT>\.github\skills\rectify-playbook\`
   for enabled Copilot and at `<TARGET_ROOT>\.claude\skills\rectify-playbook\`
   for enabled Claude. Clean older copies proven by the prior installed
   manifest may be upgraded; local modifications, same-name unowned
   differences, and unknown extra files are conflicts resolved only by explicit
   decision inside that exact subtree.
3. Platform enablement is preserved: no copy exists for a disabled platform,
   unrelated host skills are unchanged, and neither `install-ace` nor
   `update-ace` was installed into the target. Never copy the kit's whole
   `<KIT_ROOT>\.github\skills\` directory.
4. Every copy keeps `user-invocable: true`, `disable-model-invocation: true`,
   and its user-only description and entry gate. The update adds no routing,
   delegate, handoff, hook, or instruction that invokes the skill automatically
   or on an agent's behalf, and it never applies or resumes a rectification.
5. The final inspector run reports every `rectify-playbook` entry as `current`.

## Execute and verify

1. Execute every phase of `<KIT_ROOT>\UPDATE_PROMPT.md`,
   including ownership classification, conflict decisions, regeneration,
   focused tests, manifest finalization, and final inspection. Run commands by
   absolute path, with `<TARGET_ROOT>` as the working directory for target
   scripts:

   ```text
   node "<TARGET_ROOT>\ace\scripts\generate_ace_agents.js"
   node "<TARGET_ROOT>\ace\scripts\retrieval.js"
   node "<TARGET_ROOT>\ace\scripts\generate_ace_agents.js" --check
   node "<TARGET_ROOT>\ace\scripts\retrieval.js" --check
   node "<TARGET_ROOT>\ace\scripts\validate_install.js"
   node "<KIT_ROOT>\ace\scripts\inspect_update.js" --target "<TARGET_ROOT>"
   ```

2. Verify every `rectify-playbook` delivery condition above.
3. Reconstruct post-update effective contracts from all contributing files.
4. Compare them with the saved baseline. Do not treat a passing structural
   validator as proof of semantic equivalence.
5. Confirm that the integration paradigm, participation, routing, models,
   tools, delegates, handoffs, project behavior, and runtime state remain
   unchanged except for documented framework-required or explicitly approved
   deltas.
   Confirm ACE runtime JSON is not ignored and report newly visible untracked
   records for normal review; do not stage or commit them automatically.
6. Confirm that `git -C "<KIT_ROOT>" status --porcelain`
   still matches the output recorded before the update: the kit is unchanged.
7. Do not claim success while a required check fails, a conflict remains, a
   decision is unanswered, a `rectify-playbook` copy is missing or stale, or
   any behavioral loss is unexplained.

The final report must include the absolute `KIT_ROOT` with its recorded
branch, commit, and status, the absolute `TARGET_ROOT`, the update prompt's
path/command table, the `rectify-playbook` delivery evidence, the pre/post
preservation matrix, and every intentional behavioral difference.
