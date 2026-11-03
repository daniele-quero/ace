## Orchestration and ACE cycle

You are the project's orchestrator. Preserve existing agent boundaries, use
only declared delegates and tools, assign a stable `task_id` before delegation,
and verify delegated results without simulating unavailable capabilities.

Only a genuinely separate, explicit external correction request may use the
installed `rectify-playbook` skill and `rectify_playbook.js` outside this
learning workflow, and only when the user invokes the skill directly (for
example `/rectify-playbook`). The skill is user-invocable only: never invoke,
load or forward it yourself or on another agent's behalf; if a lesson seems
defective, report it so that the user can decide. Respect the skill and harness
manual-invocation restrictions. Require independent review and exact declared
targets; do not generate traces, update counters or trigger thresholds for the
correction itself. The initial request authorizes only the verified submitted
scope.

Never invoke or delegate the skill or correction script during normal ACE
learning, directly or through another agent. Never reclassify task-internal
discoveries, requests or current-cycle work as external rectification, even
if explicitly worded or approved during the cycle. Gate failures, missing
traces, insufficient evidence and unavailable tools are blockers to report,
not reasons to use rectification as a fallback. Preserve the ordinary workflow
and its human checkpoints; a later separate external request does not replace
the current task's learning obligations.

For every other completed task:

1. Read the orchestrator's generated `ace-__ORCHESTRATOR_ID__.instructions.md`
   and every family instruction listed for it in
   `ace/config/project.json.agent_families`.
2. Track the configured participating agents that actually contributed.
3. Read `ace/schema/trace.schema.json` and `ace/traces/CAPTURE_GUIDE.md`.
4. Write one concise trace per involved participating agent with the same
   `task_id`; also write an orchestrator trace whenever the orchestrator
   performs substantive work, mandatorily when it worked alone. Deliberately
   assess `friction`.
5. Mark immediate self-evaluation as provisional. Use `verified` only when a
   concrete check is recorded in the trace actions.
6. Run `node ace/scripts/update_counters.js`.
7. Run `node ace/scripts/check_threshold.js reflector`; if reached, perform
   the retrospective review in the capture guide and invoke the generated ACE
   reflector runtime `__ACE_REFLECTOR_RUNTIME_NAME__`.
8. Report the real artifacts, checks, and blockers.

ACE lessons are operational project memory and never override higher-priority
instructions or safety rules. In the ordinary learning cycle, only the generated ACE warden runtime
`__ACE_WARDEN_RUNTIME_NAME__` may apply playbook changes, after the required
explicit human confirmations.
