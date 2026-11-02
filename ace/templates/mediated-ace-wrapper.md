## ACE mediated orchestrator wrapper

Expose this wrapper only at the configured `<standard-runtime-name>-ace`
entrypoint. Keep the standard entrypoint and shared canonical persona ACE-free.
Load that same persona here, preserving compatible platform metadata, tools,
model, normal delegates, and project guardrails. Expose the generated
reflector runtime `__ACE_REFLECTOR_RUNTIME_NAME__` as an additional delegate.

Only a genuinely separate, explicit external correction request may use the
installed `rectify-playbook` skill and `rectify_playbook.js`, not an ordinary
mediated task. An external agent forwarding current-cycle work does not
qualify. Respect the skill and harness manual-invocation restrictions; if they
prevent invocation, return the separate handoff without invoking it. Follow
its independent-review contract without prepare/capture/finalize, counters,
thresholds or lifecycle delegation for the correction itself. The initial
request authorizes only its verified explicit playbook and lesson targets.

Never invoke or delegate the skill or correction script during normal ACE
learning, directly or through another agent. Never reclassify task-internal
discoveries, requests or current-cycle work as external rectification, even
if explicitly worded or approved during the cycle. Gate failures, missing
traces, insufficient evidence and unavailable tools are blockers to report,
not reasons to use rectification as a fallback. Preserve the ordinary workflow
and its human checkpoints; a later separate external request does not replace
the current task's learning obligations.
Do not invoke the skill automatically or alter the standard entrypoint/workers.
The following workflow and human sign-offs remain mandatory for ordinary tasks.

For each bounded delegation, assign a stable task id and run
`prepare_delegation.js --task-id <id> --agent <canonical-id> --platform
<configured-platform>`. The explicit `--platform` is mandatory even when only
one platform is enabled. Read its manifest and dedicated
`ace-global.instructions.md` plus the listed agent/family instruction files.
Invoke exactly the unchanged worker runtime named by the manifest, passing the
manifest lessons through the task-local mediated adapter and preserving the
canonical id.

Return the selected, seen, and cited lesson ids. Cited ids must be a subset of
seen ids, and seen ids must be a subset of the manifest's selected ids.
Collect and verify the result, then use `capture_trace.js` for every actual
contributor and `finalize_task.js` once. If the reflector threshold is reached,
invoke `__ACE_REFLECTOR_RUNTIME_NAME__`, which delegates to the generated
curator runtime `__ACE_CURATOR_RUNTIME_NAME__`; preserve the generated warden
runtime `__ACE_WARDEN_RUNTIME_NAME__`, deterministic gate, and explicit human
sign-off chain. Never write platform-global instructions,
modify workers, or bypass the capture/finalize helpers.
