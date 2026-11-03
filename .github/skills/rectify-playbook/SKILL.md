---
name: rectify-playbook
description: "USER-INVOKED ONLY: run solely when the user explicitly invokes /rectify-playbook; never auto-select, delegate, forward or run it from agents, subagents, handoffs, other skills or the ordinary ACE cycle (reflection, curation, gating, trace processing, or as a fallback for a blocked batch). Explicit external correction of named lessons in the current repository's installed ACE playbooks. Requires an explicit playbook, P-XXX targets, independent review and synchronized instructions; traces are not required."
argument-hint: "<playbook path> <P-XXX IDs> <requested correction and reasons>"
user-invocable: true
disable-model-invocation: true
---

# Rectify an ACE playbook

<!-- ACE runtime skill: rectify-playbook. Canonical kit source: .github/skills/rectify-playbook/. -->

This is an explicit external correction workflow, not another learning stage.
Only the user's own invocation of this skill authorizes a correction, and only
for the submitted scope after successful independent review. Do not
ask for another approval of an unchanged, verified correction. Stop and ask if
the intended behavior, targets or scope must change. Merely discovering a defect
does not authorize an unsolicited correction.

## External-only entry gate

This skill is user-invocable only: automatic model selection is disabled
(`disable-model-invocation: true`). Start only when the user explicitly invokes
it in the current conversation, for example
`/rectify-playbook <playbook> <P-XXX IDs> <correction>`, as a request separate
from ordinary ACE work. No agent, subagent, handoff, hook, lifecycle role, other
skill or automation may invoke, load, delegate, forward or emulate it, including
by reading this file or running its script without that user invocation. An
agent that suspects a defective lesson reports it; only the user decides whether
to invoke this skill. Respect the harness's manual-invocation restrictions
instead of bypassing them.

Never invoke or delegate this skill from reflection, curation, Warden review,
trace capture, counter updates, thresholds, finalization or any other ordinary
ACE step. It is not a fallback for missing traces, weak evidence, a rejected
proposal, failed gate, absent approval or unavailable lifecycle agent.

Do not relabel an in-flight task, batch or lifecycle delegation as an external
correction, including by creating a new delegation or request file. A defect
found during ordinary ACE work stays in that workflow; report it without
starting this skill. Only a genuinely separate later invocation by the user may
start a new correction-only task.

If the user did not invoke this skill directly, the current task is part of the
ordinary cycle, or its external origin is
unclear, fail before preparing request/review files, delegating verification or
running `rectify_playbook.js`. An existing backlog of traces or proposals alone
does not establish the origin of the current task.

## Resolve the project root

Before reading or writing anything, resolve `PROJECT_ROOT`: the absolute,
canonical root of the current workspace repository that contains both
`<PROJECT_ROOT>/ace/config/project.json` and
`<PROJECT_ROOT>/ace/scripts/rectify_playbook.js`. Use an absolute repository
path supplied in the invocation when present. Never use the ACE kit checkout
(it has installer prompts and no materialized configuration), another project,
this skill's directory or a user-level skill directory. If no single
installation can be resolved, fail without writing.

Every file and directory below is written as `<PROJECT_ROOT>/...`. Substitute
the absolute root before each read, write or command, adapt separators to the
current OS and quote paths. Never resolve a bare relative path against the
current working directory. Only the request's `playbook` and `context_files`
values stay repository-relative, because `rectify_playbook.js` resolves them
against its own installation.

## Mandatory inputs and boundaries

- Require an explicitly supplied existing playbook path AND the exact existing
  lesson IDs (`P-XXX`) to change. If either is missing, fail explicitly without
  writing files. Do not infer the targets or replace failure with a questionnaire.
- Require a concrete requested correction and reason. If these are unclear,
  stop before writing or requesting review.
- Read `<PROJECT_ROOT>/ace/config/project.json` and use only the installed
  scripts under `<PROJECT_ROOT>/ace/scripts/`, never a kit checkout, another
  project or a user-level skill directory.
- One request changes content in one configured live playbook. Preserve IDs,
  status, scope, tags, counters, all untargeted content and prior provenance.
  Do not ADD, MERGE, move, archive, activate lessons or reset statistics here.
  If a content correction cannot safely address the flaw, report that limitation.
- Do not invoke reflector, curator, warden, thresholds, `update_counters.js` or
  `apply_delta.js`; do not manufacture traces, proposals, evidence or sign-offs.
  The ordinary learning cycle and its approvals remain unchanged.
- External tests, contract analysis, user feedback and reproducible
  counterexamples can support a correction. Identify what was actually checked
  and what is only reported. Traces are neither mandatory nor a substitute for
  independent verification. Never turn repeated claims into invented runs.
- Existing agent/tool restrictions still apply. If the caller cannot execute
  this workflow, report the blocker; do not evade its permissions.

## Prepare the correction

1. Read the entire named playbook, relevant global and family lessons in
   `<PROJECT_ROOT>/playbooks/_global.md` and `<PROJECT_ROOT>/playbooks/families/`,
   project and agent/persona contracts, the schemas in
   `<PROJECT_ROOT>/ace/schema/`, and directly relevant tests or implementation.
   Check IDs across live playbooks and `<PROJECT_ROOT>/playbooks/archive/` for
   ambiguity.
2. Derive the smallest replacement that satisfies the submitted intent and the
   authoritative contracts. Do not convert an unknown value into an asserted
   fact, silently weaken a constraint, or generalize an agent-local observation.
3. Keep the current lesson body as exact `before` content, using LF in JSON.
   If the user already patched it, report whether any actual correction remains;
   do not roll back a sound fix or fabricate a new change solely to create audit.
4. Create a version-1 JSON request at
   `<PROJECT_ROOT>/ace/state/rectifications/requests/<rectification_id>.json`:

   ```json
   {
     "version": 1,
     "rectification_id": "2026-11-02-source-attribution",
     "playbook": "playbooks/worker.md",
     "request_summary": "The submitted request and its authorized behavioral scope.",
     "changes": [
       {
         "bullet_id": "P-009",
         "before": "Exact current lesson body.",
         "after": "Proposed replacement lesson body.",
         "rationale": "The defect, applicable contract, and why this replacement fixes it."
       }
     ],
     "context_files": [".github/agents/Worker.agent.md"],
     "evidence": ["A factual counterexample or a reference to inspected external results."]
   }
   ```

   The example agent and paths are illustrative, not defaults. Use actual
   configured files and unique IDs. Write `playbook` and `context_files` as
   repository-relative paths, as shown. `context_files` must list the source
   contracts and relevant verification files actually inspected, not the target
   playbook. An empty `evidence` array is allowed when the reviewer can establish
   the defect directly from those sources; disclose missing external logs.
   Do not include sensitive transcripts when a synthetic example is sufficient.
5. Run the installed script by absolute path:

   ```text
   node "<PROJECT_ROOT>/ace/scripts/rectify_playbook.js" --request "<PROJECT_ROOT>/ace/state/rectifications/requests/<rectification_id>.json" --check
   ```

   Adapt separators to the current OS. This command is read-only, works from any
   working directory, and returns
   the exact changes, context fingerprints, request/state hashes and any targets
   that will remain excluded by ACE's existing retrieval policy. Resolve every
   error before proceeding. Context fingerprints omit generated ACE blocks
   and trailing whitespace; the generated sources are already bound through
   the playbooks. The runtime manifest is also bound to the review.

## Mandatory independent review

Read [the review contract](./references/review.md) in full; its installed
runtime copy is `<PROJECT_ROOT>/ace/skills/rectify-playbook/references/review.md`.
Delegate that contract, `PROJECT_ROOT`,
the original submitted intent, request, complete check output and absolute source
paths to a **separate, read-only subagent** through an actually available harness tool.
Prefer a suitable existing review agent. Do not hardcode a model, assume a
subagent exists, use the author as reviewer, or treat a self-review as independent.
If independent delegation is unavailable, fail without applying. The reviewer
only reviews: it never invokes this skill, applies the correction or starts
another rectification.

The reviewer must inspect sources independently, not merely endorse the author's
summary. It returns the structured review defined in the review contract.
Preserve the actual returned result in
`<PROJECT_ROOT>/ace/state/rectifications/reviews/<rectification_id>.json`, including the real
reviewer/session identifier supplied by the harness. Do not invent an identifier
or produce an approving report on the reviewer's behalf.

An inconclusive or rejecting review blocks application. Fix only within the
original intent and explicit targets; any changed request or review context
requires a fresh check and a fresh independent review of the revised candidate.
Do not silently expand the target list. Reviewer reports are attributable
workflow attestations, not cryptographic proof of subagent identity.

## Apply and verify

After an approving review with no unresolved findings, run:

```text
node "<PROJECT_ROOT>/ace/scripts/rectify_playbook.js" --request "<PROJECT_ROOT>/ace/state/rectifications/requests/<rectification_id>.json" --review "<PROJECT_ROOT>/ace/state/rectifications/reviews/<rectification_id>.json" --apply
```

The script rechecks the exact request, expected before content and reviewed
state under the ACE mutation lock. It changes only the declared bodies and
appends explicit external-rectification provenance. It records before/after
content, request, review and recovery state in
`<PROJECT_ROOT>/ace/state/rectifications/<rectification_id>.json`, outside proposals and traces.
It then runs the installed retrieval generator and verifies instruction alignment.

Do not claim success until the command reports `completed`. Verify the submitted
invariants against the generated lesson text and report any preserved retrieval
exclusions: changing text does not rehabilitate a quarantined or live-excluded
lesson and does not erase its historical counters. Do not promise that existing
open agent sessions have reloaded their context; start a fresh task/session when
the harness cannot refresh it.

If interrupted, report the incomplete audit and use:

```text
node "<PROJECT_ROOT>/ace/scripts/rectify_playbook.js" --resume <rectification_id>
```

Resume is only for finishing the same audited application, not authorizing a new
correction. It fails on changed target content or unrelated reviewed state.
Never delete a mutation lock or edit an audit to force a conflicting resume.

Finish with the playbook, affected IDs, meaningful before/after changes,
independent reviewer and verdict, actual checks, audit path, and instruction
alignment/exclusion results. Report blockers explicitly; do not call an
unreviewed or partially synchronized correction successful.
