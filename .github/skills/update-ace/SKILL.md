---
name: update-ace
description: Update, upgrade, refresh, align, reconcile, bring current, or repair an existing ACE installation, including its runtime, wrappers, personas, configuration, generated integration, and lifecycle assets. Preserve the installed paradigm, project-owned operational contracts, selected models, learned data, and runtime state. Do not use for a clean install, paradigm migration, or unrelated agent redesign.
---

# Update ACE

Update an existing ACE installation from the current kit without changing its
integration paradigm, project behavior, or accumulated operational memory.

## Classify before writing

1. Resolve `TARGET_ROOT` from the request or current workspace.
2. Resolve `KIT_ROOT` independently:
   - when this skill is loaded from its canonical project copy, use the
     repository containing `UPDATE_PROMPT.md`;
   - when this is a published user-level copy, use an explicit path from the
     request or the harness's configured ACE kit origin;
   - if no unique local kit can be proven, ask for `KIT_ROOT`.
   Never use the target's installed ACE copy or the user-level skill directory
   as the update source.
3. Verify distinct local roots and verify that `KIT_ROOT` contains
   `UPDATE_PROMPT.md` and the kit-owned update inspector.
4. Verify that `TARGET_ROOT` contains an ACE installation.
5. Determine its behaviorally effective integration mode.
6. Use `install-ace` if no installation exists.
7. Stop for a separately approved migration plan if the request changes
   embedded to mediated, mediated to embedded, or materially redesigns
   project-owned agents.
8. Read and execute `UPDATE_PROMPT.md` completely. Always run its inspector
   from `KIT_ROOT`, never from the installed target copy.

The update prompt owns the detailed reconciliation procedure. This skill makes
behavioral preservation and pre/post equivalence mandatory.

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

## Execute and verify

1. Execute every phase of `UPDATE_PROMPT.md`, including ownership
   classification, conflict decisions, regeneration, focused tests, manifest
   finalization, and final inspection.
2. Reconstruct post-update effective contracts from all contributing files.
3. Compare them with the saved baseline. Do not treat a passing structural
   validator as proof of semantic equivalence.
4. Confirm that the integration paradigm, participation, routing, models,
   tools, delegates, handoffs, project behavior, and runtime state remain
   unchanged except for documented framework-required or explicitly approved
   deltas.
5. Do not claim success while a required check fails, a conflict remains, a
   decision is unanswered, or any behavioral loss is unexplained.

The final report must include the update prompt's path/command table plus the
pre/post preservation matrix and every intentional behavioral difference.
