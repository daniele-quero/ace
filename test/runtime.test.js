'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const KIT_ROOT = path.resolve(__dirname, '..');

function command(root, script, ...args) {
  const result = spawnSync(
    process.execPath,
    [path.join(root, 'ace', 'scripts', script), ...args],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(
    result.status,
    0,
    `${script} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return result;
}

function failingCommand(root, script, ...args) {
  const result = spawnSync(
    process.execPath,
    [path.join(root, 'ace', 'scripts', script), ...args],
    { cwd: root, encoding: 'utf8' },
  );
  assert.notEqual(result.status, 0, `${script} unexpectedly succeeded`);
  return result;
}

function setupProject({ copilot = true, claude = true, agentFamilies = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ace-kit-'));
  fs.cpSync(path.join(KIT_ROOT, 'ace'), path.join(root, 'ace'), { recursive: true });
  fs.cpSync(path.join(KIT_ROOT, 'playbooks'), path.join(root, 'playbooks'), { recursive: true });

  const config = JSON.parse(fs.readFileSync(
    path.join(root, 'ace', 'config', 'project.template.json'),
    'utf8',
  ));
  config.team_name = 'Fixture';
  config.provisional_evaluator = 'fixture-auto';
  config.orchestrator_agent = 'coordinator';
  config.participating_agents = ['worker'];
  config.agent_families = agentFamilies;
  config.platforms.copilot.enabled = copilot;
  config.platforms.claude.enabled = claude;
  fs.writeFileSync(
    path.join(root, 'ace', 'config', 'project.json'),
    `${JSON.stringify(config, null, 2)}\n`,
  );

  const helper = require(path.join(root, 'ace', 'scripts', 'lib', 'playbook.js'));
  for (const agent of ['coordinator', 'worker']) {
    const relative = path.join('playbooks', `${agent}.md`);
    const skeleton = helper.defaultPlaybookSkeleton(relative);
    fs.writeFileSync(
      path.join(root, relative),
      helper.serializeFile(skeleton.prefix, skeleton.bullets, skeleton.suffix),
    );
  }
  for (const family of [...new Set(Object.values(agentFamilies).flat())]) {
    const relative = path.join('playbooks', 'families', `${family}.md`);
    const skeleton = helper.defaultPlaybookSkeleton(relative);
    fs.writeFileSync(
      path.join(root, relative),
      helper.serializeFile(skeleton.prefix, skeleton.bullets, skeleton.suffix),
    );
  }
  return { root, helper };
}

function bullet(id, content) {
  return {
    id,
    status: 'active',
    used: 0,
    helped: 0,
    hurt: 0,
    helped_confirmed: 0,
    helped_provisional: 0,
    hurt_confirmed: 0,
    hurt_provisional: 0,
    content,
    tags: [],
    provenance: 'source_trace_ids=[]; created_at=2026-01-01T00:00:00Z; created_by=fixture',
  };
}

function writeProcessedTrace(root, taskId, agent = 'worker') {
  fs.writeFileSync(
    path.join(root, 'ace', 'traces', 'processed', `${taskId}__${agent}.json`),
    `${JSON.stringify({
      task_id: taskId,
      agent,
      started_at: '2026-01-01T00:00:00Z',
      playbook_bullets_seen: [],
      playbook_bullets_cited: [],
      actions: [{ description: 'Fixture evidence.' }],
      outcome: { status: 'success', evaluated_by: 'verified' },
      friction: [],
    }, null, 2)}\n`,
  );
}

test('generates and validates Copilot and Claude assets', (t) => {
  const { root } = setupProject();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  command(root, 'generate_ace_agents.js');
  command(root, 'retrieval.js');
  command(root, 'generate_ace_agents.js', '--check');
  command(root, 'retrieval.js', '--check');
  command(root, 'validate_install.js');

  for (const relative of [
    '.github/agents/ACE-reflector.agent.md',
    '.github/agents/ACE-curator.agent.md',
    '.github/agents/ACE-warden.agent.md',
    '.claude/agents/Ace-reflector.md',
    '.claude/agents/Ace-curator.md',
    '.claude/agents/Ace-warden.md',
    '.github/instructions/ace-worker.instructions.md',
    '.claude/instructions/ace-worker.instructions.md',
  ]) {
    assert.equal(fs.existsSync(path.join(root, relative)), true, relative);
  }
});

test('generates assets only for the enabled platform', async (t) => {
  for (const enabled of ['copilot', 'claude']) {
    await t.test(enabled, (inner) => {
      const { root } = setupProject({
        copilot: enabled === 'copilot',
        claude: enabled === 'claude',
      });
      inner.after(() => fs.rmSync(root, { recursive: true, force: true }));

      command(root, 'generate_ace_agents.js');
      command(root, 'retrieval.js');
      command(root, 'validate_install.js');

      assert.equal(
        fs.existsSync(path.join(root, '.github', 'agents', 'ACE-reflector.agent.md')),
        enabled === 'copilot',
      );
      assert.equal(
        fs.existsSync(path.join(root, '.claude', 'agents', 'Ace-reflector.md')),
        enabled === 'claude',
      );
    });
  }
});

test('generates configured family instructions even when the family is empty', (t) => {
  const { root } = setupProject({ agentFamilies: { worker: ['backend'] } });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  command(root, 'generate_ace_agents.js');
  command(root, 'retrieval.js');
  command(root, 'validate_install.js');

  assert.equal(
    fs.existsSync(path.join(root, '.github', 'instructions', 'ace-family-backend.instructions.md')),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(root, '.claude', 'instructions', 'ace-family-backend.instructions.md')),
    true,
  );
});

test('updates confirmed counters exactly once', (t) => {
  const { root, helper } = setupProject();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const workerPath = path.join(root, 'playbooks', 'worker.md');
  const parsed = helper.parsePlaybookFile(fs.readFileSync(workerPath, 'utf8'));
  parsed.bullets.push(bullet('P-001', 'Verify generated artifacts before reporting success.'));
  fs.writeFileSync(workerPath, helper.serializeFile(parsed.prefix, parsed.bullets, parsed.suffix));

  const tracePath = path.join(root, 'ace', 'traces', 'counter-task__worker.json');
  fs.writeFileSync(tracePath, `${JSON.stringify({
    task_id: 'counter-task',
    agent: 'worker',
    started_at: '2026-01-01T00:00:00Z',
    playbook_bullets_seen: ['P-001'],
    playbook_bullets_cited: ['P-001'],
    actions: [{ description: 'Verified the fixture output.' }],
    outcome: { status: 'success', evaluated_by: 'verified' },
    friction: [],
  }, null, 2)}\n`);

  command(root, 'update_counters.js');
  command(root, 'update_counters.js');

  const updated = helper.parsePlaybookFile(fs.readFileSync(workerPath, 'utf8')).bullets[0];
  assert.equal(updated.used, 1);
  assert.equal(updated.helped, 1);
  assert.equal(updated.helped_confirmed, 1);
  assert.equal(updated.helped_provisional, 0);
});

test('merges multiple bullets from one playbook without index drift', (t) => {
  const { root, helper } = setupProject();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const workerPath = path.join(root, 'playbooks', 'worker.md');
  const parsed = helper.parsePlaybookFile(fs.readFileSync(workerPath, 'utf8'));
  parsed.bullets.push(bullet('P-001', 'First overlapping lesson.'));
  parsed.bullets.push(bullet('P-002', 'Second overlapping lesson.'));
  fs.writeFileSync(workerPath, helper.serializeFile(parsed.prefix, parsed.bullets, parsed.suffix));

  writeProcessedTrace(root, 'merge-task');
  const proposalsPath = path.join(root, 'ace', 'proposals', 'merge-batch.json');
  fs.writeFileSync(proposalsPath, `${JSON.stringify({
    batch_id: 'merge-batch',
    proposals: [{
      proposal_id: 'PR-001',
      supporting_task_ids: ['merge-task'],
    }],
  }, null, 2)}\n`);
  const decisionsPath = path.join(root, 'ace', 'proposals', 'merge-batch-decisions.json');
  fs.writeFileSync(decisionsPath, `${JSON.stringify({
    batch_id: 'merge-batch',
    decided_at: '2026-01-01T00:00:00Z',
    source_proposals_file: 'merge-batch.json',
    decisions: [{
      proposal_id: 'PR-001',
      operation: 'MERGE',
      target_bullet_id: 'P-003',
      merged_from: ['P-001', 'P-002'],
      final_scope: { type: 'agent', agent: 'worker' },
      final_content: 'Combined lesson.',
      initial_status: 'active',
      gate_required: true,
    }],
  }, null, 2)}\n`);

  command(root, 'gate.js', decisionsPath, '--sign-off');
  command(root, 'apply_delta.js', decisionsPath.replace(/-decisions\.json$/, '-gate-report.json'));

  const ids = helper.parsePlaybookFile(fs.readFileSync(workerPath, 'utf8')).bullets.map((item) => item.id);
  assert.deepEqual(ids, ['P-003']);
  const archived = helper.parsePlaybookFile(
    fs.readFileSync(path.join(root, 'playbooks', 'archive', 'worker.md'), 'utf8'),
  ).bullets;
  assert.deepEqual(archived.map((item) => item.id), ['P-002', 'P-001']);
  assert.ok(archived.every((item) => item.status === 'deprecated'));
});

test('rejects unsafe or malformed decisions', (t) => {
  const { root } = setupProject();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeProcessedTrace(root, 'bad-task');
  fs.writeFileSync(path.join(root, 'ace', 'proposals', 'bad-batch.json'), `${JSON.stringify({
    batch_id: 'bad-batch',
    proposals: [{ proposal_id: 'PR-001', supporting_task_ids: ['bad-task'] }],
  }, null, 2)}\n`);

  const cases = [
    {
      operation: 'UNKNOWN',
      target_bullet_id: 'P-010',
      final_scope: { type: 'agent', agent: 'worker' },
      final_content: 'Invalid operation.',
      initial_status: 'active',
    },
    {
      operation: 'ADD',
      target_bullet_id: 'P-011',
      final_scope: { type: 'family', family: '../../outside' },
      final_content: 'Unsafe family.',
      initial_status: 'active',
    },
    {
      operation: 'MERGE',
      target_bullet_id: 'P-012',
      merged_from: ['P-001', 'P-001'],
      final_scope: { type: 'agent', agent: 'worker' },
      final_content: 'Duplicate sources.',
      initial_status: 'active',
    },
  ];

  for (const [index, decision] of cases.entries()) {
    const file = path.join(root, 'ace', 'proposals', `bad-${index}-decisions.json`);
    fs.writeFileSync(file, `${JSON.stringify({
      batch_id: `bad-${index}`,
      decided_at: '2026-01-01T00:00:00Z',
      source_proposals_file: 'bad-batch.json',
      decisions: [{ proposal_id: 'PR-001', ...decision }],
    }, null, 2)}\n`);
    failingCommand(root, 'gate.js', file, '--sign-off');
  }
});

test('refuses decisions changed after sign-off', (t) => {
  const { root } = setupProject();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeProcessedTrace(root, 'signed-task');
  fs.writeFileSync(path.join(root, 'ace', 'proposals', 'signed.json'), `${JSON.stringify({
    batch_id: 'signed',
    proposals: [{ proposal_id: 'PR-001', supporting_task_ids: ['signed-task'] }],
  }, null, 2)}\n`);
  const decisionsPath = path.join(root, 'ace', 'proposals', 'signed-decisions.json');
  const decisions = {
    batch_id: 'signed',
    decided_at: '2026-01-01T00:00:00Z',
    source_proposals_file: 'signed.json',
    decisions: [{
      proposal_id: 'PR-001',
      operation: 'ADD',
      target_bullet_id: 'P-020',
      final_scope: { type: 'agent', agent: 'worker' },
      final_content: 'Reviewed content.',
      initial_status: 'active',
    }],
  };
  fs.writeFileSync(decisionsPath, `${JSON.stringify(decisions, null, 2)}\n`);
  command(root, 'gate.js', decisionsPath, '--sign-off');
  decisions.decisions[0].final_content = 'Changed after sign-off.';
  fs.writeFileSync(decisionsPath, `${JSON.stringify(decisions, null, 2)}\n`);

  const result = failingCommand(
    root,
    'apply_delta.js',
    decisionsPath.replace(/-decisions\.json$/, '-gate-report.json'),
  );
  assert.match(result.stderr, /cambiato dopo il sign-off/);
});

test('does not acknowledge traces when a counter target is unresolved', (t) => {
  const { root } = setupProject();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const tracePath = path.join(root, 'ace', 'traces', 'missing-counter__worker.json');
  fs.writeFileSync(tracePath, `${JSON.stringify({
    task_id: 'missing-counter',
    agent: 'worker',
    started_at: '2026-01-01T00:00:00Z',
    playbook_bullets_seen: ['P-999'],
    playbook_bullets_cited: ['P-999'],
    actions: [{ description: 'Used a missing lesson.' }],
    outcome: { status: 'failure', evaluated_by: 'verified' },
    friction: [],
  }, null, 2)}\n`);

  failingCommand(root, 'update_counters.js');
  const trace = JSON.parse(fs.readFileSync(tracePath, 'utf8'));
  assert.equal(trace.counted_for_playbook_at, undefined);
});

test('installation prompt covers required interactive branches', () => {
  const prompt = fs.readFileSync(path.join(KIT_ROOT, 'INSTALL_PROMPT.md'), 'utf8');
  for (const required of [
    'ask_user',
    'AskUserQuestion',
    'Select participating agents',
    'Identify the orchestrator',
    'Ask about personas',
    'orchestrator-persona.md',
    'orchestrator-inline.md',
    'generate_ace_agents.js --check',
    'validate_install.js',
  ]) {
    assert.match(prompt, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
