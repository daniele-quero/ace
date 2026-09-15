# ACE — Agentic Context Engineering framework

A project-agnostic operational-memory lifecycle for a local team of agents.
ACE turns what actually happened in past agent sessions (traces) into
evidence-backed, versioned lessons (a *playbook*) that get served back to the
right agent at the right scope — without ever letting an agent silently
rewrite its own instructions.

This repository is a **kit**: a template runtime plus a one-time installer.
It is meant to be installed *into* another project's repository, where it
then becomes that project's own ACE runtime, tuned to that project's real
agents, platforms, and configuration.

## What ACE actually does

1. An orchestrator agent (defined per host project) writes a short **trace**
   after each session: what happened, what the outcome was, and any friction
   encountered.
2. In batches, a **reflector** agent reads accumulated traces and proposes
   candidate lessons, citing the evidence for each one.
3. A **curator** agent turns accepted proposals into typed operations
   (`ADD`/`UPDATE`/`DEPRECATE`/`MERGE`/`PROMOTE`/`REJECT`) against a
   **playbook** — never applying them directly.
4. A **warden** agent runs a deterministic **gate** (mechanical validation),
   presents any non-automatable semantic conflicts to a human, and only after
   explicit sign-off applies the change and re-syncs every platform's
   instruction files.

Reflector, curator, and warden are themselves plain, replaceable roles —
their entire behavior is prose in [`ace/prompts/`](ace/prompts/), driven by
[`ace/config/project.json`](ace/config/project.json), never hardcoded to a
specific team, agent, or domain.

## Repository layout

```text
INSTALL_PROMPT.md     # one-time installation prompt: copies this kit into a host project
ace/                  # the runtime: prompts, scripts, schema, config template, traces, state
playbooks/            # the (empty, template) playbook skeleton installed alongside ace/
test/                 # tests exercising the runtime scripts against synthetic fixtures
package.json          # `npm test` entry point
```

See [`ace/README.md`](ace/README.md) for the full runtime reference: the
detailed layout under `ace/`, how the reflector → curator → warden cycle
flows end to end, what lives in `ace/config/project.json` versus what is
fixed behavior, the safety gates that keep a bad lesson from silently
reaching agents, and the boundary between this kit and a project's installed
runtime.

## Using this kit

- **Installing ACE into another project**: open this kit's root and follow
  [`INSTALL_PROMPT.md`](INSTALL_PROMPT.md) with an installation agent. It
  discovers the target project's existing agents, asks which should
  participate, and materializes `ace/config/project.json` plus per-agent
  playbooks and platform wrappers — it never guesses a team's identity or
  copies this kit's own (deliberately empty) state.
- **Developing this kit itself**: `npm test` runs
  [`test/runtime.test.js`](test/runtime.test.js), which builds a disposable
  fixture project (synthetic `team_name`, `orchestrator_agent`, and
  `participating_agents`) and exercises `generate_ace_agents.js`,
  `retrieval.js`, `gate.js`, and `apply_delta.js` against it.

## Non-negotiable properties

- Nothing in `ace/prompts/*.md` or `playbooks/_global.md` names a real team,
  agent, or domain — every such detail comes from
  `ace/config/project.json`, filled in only at install time.
- No agent role writes a playbook directly. Only `apply_delta.js`, and only
  after a signed-off gate report, does.
- Every write that touches disk during the warden's stage requires an
  explicit, one-at-a-time human confirmation through the host platform's
  dedicated question tool — never inferred, never relayed as an unverifiable
  "the user agreed".
- The kit itself never carries a real installation's traces, proposals,
  decisions, learned bullets, or `project.json` — those exist only in a
  project that has installed ACE.
