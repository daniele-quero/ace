'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
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

function inspectTarget(root) {
  const result = spawnSync(
    process.execPath,
    [path.join(KIT_ROOT, 'ace', 'scripts', 'inspect_update.js'), '--target', root],
    { cwd: KIT_ROOT, encoding: 'utf8' },
  );
  assert.equal(
    result.status,
    0,
    `inspect_update.js failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return JSON.parse(result.stdout);
}

function snapshotTree(root) {
  const snapshot = {};
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).replace(/\\/g, '/');
      if (entry.isSymbolicLink()) {
        snapshot[relative] = `symlink:${fs.readlinkSync(absolute)}`;
      } else if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile()) {
        snapshot[relative] = crypto.createHash('sha256')
          .update(fs.readFileSync(absolute)).digest('hex');
      }
    }
  };
  visit(root);
  return snapshot;
}

function setupProject({
  copilot = true, claude = true, agentFamilies = {}, integrationMode = 'embedded',
} = {}) {
  const fixtureRoot = path.join(KIT_ROOT, '.test-work');
  fs.mkdirSync(fixtureRoot, { recursive: true });
  const root = fs.mkdtempSync(path.join(fixtureRoot, 'ace-kit-'));
  fs.cpSync(path.join(KIT_ROOT, 'ace'), path.join(root, 'ace'), { recursive: true });
  fs.cpSync(path.join(KIT_ROOT, 'playbooks'), path.join(root, 'playbooks'), { recursive: true });
  fs.copyFileSync(path.join(KIT_ROOT, '.gitignore'), path.join(root, '.gitignore'));

  const config = JSON.parse(fs.readFileSync(
    path.join(root, 'ace', 'config', 'project.template.json'),
    'utf8',
  ));
  config.team_name = 'Fixture';
  config.integration_mode = integrationMode;
  config.provisional_evaluator = 'fixture-auto';
  config.orchestrator_agent = 'coordinator';
  config.participating_agents = ['worker'];
  config.agent_families = agentFamilies;
  config.platforms.copilot.enabled = copilot;
  config.platforms.claude.enabled = claude;
  for (const [name, platform] of Object.entries(config.platforms)) {
    if (!platform.enabled || integrationMode !== 'mediated') continue;
    platform.canonical_to_runtime = {
      worker: `${platform.runtime_prefix}/project/worker`,
    };
    platform.orchestrator_entrypoints = {
      project: `${platform.runtime_prefix}/project/coordinator`,
      ace: `${platform.runtime_prefix}/project/coordinator-ace`,
    };
  }
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

test('generated lifecycle names match the orchestrator contract', () => {
  const generator = require(path.join(
    KIT_ROOT,
    'ace',
    'scripts',
    'generate_ace_agents.js',
  ));

  assert.equal(generator.runtimeName({ runtime_prefix: 'gh' }, 'reflector'), 'gh/ace/reflector');
  assert.equal(generator.runtimeName({ runtime_prefix: 'cl' }, 'curator'), 'cl/ace/curator');
  assert.equal(generator.runtimeName({ runtime_prefix: 'gh' }, 'warden'), 'gh/ace/warden');
  for (const relative of [
    'ace/templates/orchestrator-inline.md',
    'ace/templates/orchestrator-persona.md',
    'ace/templates/mediated-ace-wrapper.md',
  ]) {
    const content = fs.readFileSync(path.join(KIT_ROOT, relative), 'utf8');
    assert.match(content, /__ACE_REFLECTOR_RUNTIME_NAME__/);
    assert.match(content, /__ACE_WARDEN_RUNTIME_NAME__/);
  }
});

test('legacy config without integration metadata remains embedded-compatible', (t) => {
  const { root } = setupProject();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const configPath = path.join(root, 'ace', 'config', 'project.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  delete config.integration_mode;
  for (const platform of Object.values(config.platforms)) {
    delete platform.canonical_to_runtime;
    delete platform.orchestrator_entrypoints;
  }
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  for (const relative of [
    'ace/scripts/prepare_delegation.js',
    'ace/scripts/capture_trace.js',
    'ace/scripts/finalize_task.js',
    'ace/scripts/lib/runtime.js',
    'ace/templates/mediated-adapter.md',
    'ace/templates/mediated-ace-wrapper.md',
  ]) {
    fs.rmSync(path.join(root, relative));
  }
  fs.writeFileSync(path.join(root, '.gitignore'), 'ace/traces/*.json\n');

  command(root, 'generate_ace_agents.js');
  command(root, 'retrieval.js');
  command(root, 'validate_install.js');
  assert.equal(fs.existsSync(path.join(root, '.github', 'copilot-instructions.md')), true);
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

test('mediated retrieval isolates global instructions and validates both platforms', (t) => {
  const { root } = setupProject({ integrationMode: 'mediated' });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  for (const globalFile of ['.github/copilot-instructions.md', 'CLAUDE.md']) {
    const target = path.join(root, globalFile);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, 'Project-owned global instructions.\n');
  }

  command(root, 'generate_ace_agents.js');
  command(root, 'retrieval.js');
  fs.writeFileSync(path.join(root, '.gitignore'), 'ace/state/\n');
  command(root, 'validate_install.js');

  for (const globalFile of ['.github/copilot-instructions.md', 'CLAUDE.md']) {
    const content = fs.readFileSync(path.join(root, globalFile), 'utf8');
    assert.equal(content, 'Project-owned global instructions.\n');
    assert.doesNotMatch(content, /ACE:BEGIN/);
  }
  for (const dedicated of [
    '.github/instructions/ace-global.instructions.md',
    '.claude/instructions/ace-global.instructions.md',
  ]) {
    assert.match(fs.readFileSync(path.join(root, dedicated), 'utf8'), /ACE:BEGIN/);
  }
});

test('embedded to mediated transition preserves project-owned global bytes', (t) => {
  const { root } = setupProject({ claude: false });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const globalPath = path.join(root, '.github', 'copilot-instructions.md');
  fs.mkdirSync(path.dirname(globalPath), { recursive: true });
  const owned = '# Project\n\n```text\nfirst\n\n\nthird\n```\n';
  fs.writeFileSync(globalPath, owned);
  command(root, 'retrieval.js');

  const configPath = path.join(root, 'ace', 'config', 'project.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.integration_mode = 'mediated';
  config.platforms.copilot.canonical_to_runtime = { worker: 'gh/project/worker' };
  config.platforms.copilot.orchestrator_entrypoints = {
    project: 'gh/project/coordinator',
    ace: 'gh/project/coordinator-ace',
  };
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  command(root, 'retrieval.js');

  assert.equal(fs.readFileSync(globalPath, 'utf8'), owned);
});

test('mediated to embedded transition safely removes stale dedicated global file', (t) => {
  const { root } = setupProject({ integrationMode: 'mediated' });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  command(root, 'retrieval.js');
  const dedicated = path.join(root, '.github', 'instructions', 'ace-global.instructions.md');
  const aceOnly = path.join(root, '.claude', 'instructions', 'ace-global.instructions.md');
  assert.equal(fs.existsSync(aceOnly), true);
  fs.appendFileSync(dedicated, 'Project-owned suffix.\n');

  const configPath = path.join(root, 'ace', 'config', 'project.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.integration_mode = 'embedded';
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  command(root, 'retrieval.js');

  assert.equal(fs.readFileSync(dedicated, 'utf8'), 'Project-owned suffix.\n');
  assert.equal(fs.existsSync(aceOnly), false);
  assert.match(
    fs.readFileSync(path.join(root, '.github', 'copilot-instructions.md'), 'utf8'),
    /ACE:BEGIN/,
  );
});

test('mediated delegation always requires and honors explicit platform', (t) => {
  const { root } = setupProject({ integrationMode: 'mediated' });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  command(root, 'retrieval.js');

  const missing = failingCommand(
    root, 'prepare_delegation.js', '--task-id', 'no-platform', '--agent', 'worker',
  );
  assert.match(missing.stderr, /explicit --platform/);
  for (const [platform, runtime] of [
    ['copilot', 'gh/project/worker'],
    ['claude', 'cl/project/worker'],
  ]) {
    command(
      root, 'prepare_delegation.js', '--task-id', `platform-${platform}`,
      '--agent', 'worker', '--platform', platform,
    );
    const manifest = JSON.parse(fs.readFileSync(path.join(
      root, 'ace', 'state', 'runtime', `platform-${platform}`, 'delegations', 'worker.json',
    ), 'utf8'));
    assert.equal(manifest.platform, platform);
    assert.equal(manifest.runtime_agent, runtime);
  }
});

test('mediated helpers prepare, constrain, capture, and finalize a task', (t) => {
  const { root, helper } = setupProject({
    claude: false,
    integrationMode: 'mediated',
    agentFamilies: { worker: ['backend'] },
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const workerPath = path.join(root, 'playbooks', 'worker.md');
  const parsed = helper.parsePlaybookFile(fs.readFileSync(workerPath, 'utf8'));
  parsed.bullets.push(bullet('P-101', 'Use the deterministic fixture path.'));
  fs.writeFileSync(workerPath, helper.serializeFile(parsed.prefix, parsed.bullets, parsed.suffix));

  command(root, 'generate_ace_agents.js');
  command(root, 'retrieval.js');
  command(
    root, 'prepare_delegation.js', '--task-id', 'mediated-task',
    '--agent', 'worker', '--platform', 'copilot',
  );
  const manifestPath = path.join(
    root, 'ace', 'state', 'runtime', 'mediated-task', 'delegations', 'worker.json',
  );
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.runtime_agent, 'gh/project/worker');
  assert.deepEqual(manifest.playbook_bullets_selected, ['P-101']);
  assert.ok(manifest.instruction_files.includes('.github/instructions/ace-global.instructions.md'));

  const traceInput = path.join(root, 'ace', 'state', 'runtime', 'mediated-task', 'trace-input.json');
  const trace = {
    task_id: 'mediated-task',
    agent: 'worker',
    started_at: '2026-01-01T00:00:00Z',
    playbook_bullets_seen: [],
    playbook_bullets_cited: ['P-101'],
    actions: [{ description: 'Ran the fixture.' }],
    outcome: { status: 'success', evaluated_by: 'verified' },
    friction: [],
  };
  fs.writeFileSync(traceInput, `${JSON.stringify(trace, null, 2)}\n`);
  const rejected = failingCommand(
    root, 'capture_trace.js', '--manifest', manifestPath, '--trace', traceInput,
  );
  assert.match(rejected.stderr, /cited lesson must be present/);

  trace.playbook_bullets_seen = ['P-999'];
  trace.playbook_bullets_cited = [];
  fs.writeFileSync(traceInput, `${JSON.stringify(trace, null, 2)}\n`);
  const unseen = failingCommand(
    root, 'capture_trace.js', '--manifest', manifestPath, '--trace', traceInput,
  );
  assert.match(unseen.stderr, /seen lesson must be present/);

  trace.task_id = 'wrong-task';
  trace.playbook_bullets_seen = ['P-101'];
  fs.writeFileSync(traceInput, `${JSON.stringify(trace, null, 2)}\n`);
  const mismatch = failingCommand(
    root, 'capture_trace.js', '--manifest', manifestPath, '--trace', traceInput,
  );
  assert.match(mismatch.stderr, /must match the delegation manifest/);

  trace.task_id = 'mediated-task';
  trace.playbook_bullets_seen = ['P-101'];
  trace.playbook_bullets_cited = ['P-101'];
  fs.writeFileSync(traceInput, `${JSON.stringify(trace, null, 2)}\n`);

  const originalManifest = fs.readFileSync(manifestPath, 'utf8');
  const tampered = JSON.parse(originalManifest);
  tampered.request_summary = 'changed after checksum';
  fs.writeFileSync(manifestPath, `${JSON.stringify(tampered, null, 2)}\n`);
  const checksum = failingCommand(
    root, 'capture_trace.js', '--manifest', manifestPath, '--trace', traceInput,
  );
  assert.match(checksum.stderr, /consistency checksum/);
  fs.writeFileSync(manifestPath, originalManifest);

  command(root, 'capture_trace.js', '--manifest', manifestPath, '--trace', traceInput);

  const duplicateLive = failingCommand(
    root, 'capture_trace.js', '--manifest', manifestPath, '--trace', traceInput,
  );
  assert.match(duplicateLive.stderr, /Trace already exists/);
  const liveTrace = path.join(root, 'ace', 'traces', 'mediated-task__worker.json');
  const processedTrace = path.join(
    root, 'ace', 'traces', 'processed', 'mediated-task__worker.json',
  );
  fs.renameSync(liveTrace, processedTrace);
  const duplicateProcessed = failingCommand(
    root, 'capture_trace.js', '--manifest', manifestPath, '--trace', traceInput,
  );
  assert.match(duplicateProcessed.stderr, /processed\/mediated-task__worker\.json/);
  fs.renameSync(processedTrace, liveTrace);

  const unrelated = {
    ...trace,
    task_id: 'other-task',
  };
  const unrelatedPath = path.join(root, 'ace', 'traces', 'other-task__worker.json');
  fs.writeFileSync(unrelatedPath, `${JSON.stringify(unrelated, null, 2)}\n`);
  command(root, 'finalize_task.js', 'mediated-task');

  const captured = JSON.parse(fs.readFileSync(
    path.join(root, 'ace', 'traces', 'mediated-task__worker.json'), 'utf8',
  ));
  assert.deepEqual(captured.playbook_bullets_selected, ['P-101']);
  assert.ok(captured.counted_for_playbook_at);
  assert.equal(
    JSON.parse(fs.readFileSync(unrelatedPath, 'utf8')).counted_for_playbook_at,
    undefined,
  );
  let updated = helper.parsePlaybookFile(fs.readFileSync(workerPath, 'utf8')).bullets[0];
  assert.equal(updated.used, 1);
  command(root, 'update_counters.js');
  updated = helper.parsePlaybookFile(fs.readFileSync(workerPath, 'utf8')).bullets[0];
  assert.equal(updated.used, 2);
  assert.equal(
    fs.existsSync(path.join(root, 'ace', 'state', 'runtime', 'mediated-task', 'finalized.json')),
    true,
  );
});

test('mediated config rejects incomplete canonical runtime mappings', (t) => {
  const { root } = setupProject({ claude: false, integrationMode: 'mediated' });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const configPath = path.join(root, 'ace', 'config', 'project.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  delete config.platforms.copilot.canonical_to_runtime.worker;
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  const result = failingCommand(root, 'validate_install.js');
  assert.match(result.stderr, /canonical_to_runtime/);
});

test('installation validation rejects any missing manifest-declared runtime file', (t) => {
  const { root } = setupProject({ claude: false });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.rmSync(path.join(root, 'ace', 'templates', 'persona-wrapper-body.md'));

  const result = failingCommand(root, 'validate_install.js');

  assert.match(
    result.stderr,
    /Missing manifest-declared runtime file: ace\/templates\/persona-wrapper-body\.md/,
  );
});

test('update inspection identifies current embedded ownership without writing', (t) => {
  const { root } = setupProject();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const configPath = path.join(root, 'ace', 'config', 'project.json');
  const before = fs.readFileSync(configPath, 'utf8');
  const treeBefore = snapshotTree(root);

  const report = inspectTarget(root);

  assert.equal(report.installation_mode, 'current_embedded');
  assert.equal(report.write_performed, false);
  assert.equal(report.kit_owned.every((item) => item.state === 'current'), true);
  assert.deepEqual(report.conflicts, []);
  assert.deepEqual(report.required_config_normalization, []);
  assert.equal(report.project_owned.find((item) => (
    item.path === 'ace/config/project.json'
  )).action, 'preserve');
  assert.equal(fs.readFileSync(configPath, 'utf8'), before);
  assert.deepEqual(snapshotTree(root), treeBefore);
});

test('update inspection inventories only the selected mode README files', (t) => {
  const { root } = setupProject({ claude: false, integrationMode: 'mediated' });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const report = inspectTarget(root);
  const paths = report.kit_owned.map((item) => item.path);

  assert.ok(paths.includes('ace/README_MEDIATED.md'));
  assert.ok(paths.includes('ace/README_MEDIATED_IT.md'));
  assert.equal(paths.includes('ace/README_EMBEDDED.md'), false);
  assert.equal(paths.includes('ace/README_EMBEDDED_IT.md'), false);
});

test('update inspection identifies legacy embedded config and protected project data', (t) => {
  const { root } = setupProject();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const configPath = path.join(root, 'ace', 'config', 'project.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  delete config.integration_mode;
  const before = `${JSON.stringify(config, null, 2)}\n`;
  fs.writeFileSync(configPath, before);
  fs.rmSync(path.join(root, 'ace', 'runtime-version.json'));
  const tracePath = path.join(root, 'ace', 'traces', 'legacy__worker.json');
  fs.writeFileSync(tracePath, '{}\n');

  const report = inspectTarget(root);

  assert.equal(report.installation_mode, 'legacy_embedded');
  assert.equal(report.kit_owned[0].state, 'missing');
  assert.deepEqual(
    report.required_config_normalization.map((item) => item.field),
    ['integration_mode'],
  );
  assert.deepEqual(
    report.protected_runtime_data.find((item) => item.path === 'ace/traces/').files,
    ['ace/traces/.gitkeep', 'ace/traces/legacy__worker.json', 'ace/traces/processed/.gitkeep'],
  );
  assert.equal(fs.readFileSync(configPath, 'utf8'), before);
  assert.equal(fs.readFileSync(tracePath, 'utf8'), '{}\n');
});

test('update inspection distinguishes clean upgrades, local conflicts, and mediated mode', (t) => {
  const { root } = setupProject({ claude: false, integrationMode: 'mediated' });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const cleanUpgradePath = 'ace/prompts/warden.md';
  const conflictPath = 'ace/prompts/reflector.md';
  const installedContent = 'installed older warden\n';
  fs.writeFileSync(path.join(root, cleanUpgradePath), installedContent);
  fs.writeFileSync(path.join(root, conflictPath), 'local reflector customization\n');
  const manifestPath = path.join(root, 'ace', 'runtime-version.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.runtime_version = '0.9.0';
  manifest.ownership.kit_owned[cleanUpgradePath] = require('node:crypto')
    .createHash('sha256').update(installedContent).digest('hex');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.appendFileSync(path.join(root, '.gitignore'), '# project rule\n');
  const configPath = path.join(root, 'ace', 'config', 'project.json');
  const configBefore = fs.readFileSync(configPath, 'utf8');
  const treeBefore = snapshotTree(root);

  const report = inspectTarget(root);

  assert.equal(report.installation_mode, 'mediated');
  assert.equal(report.installed_runtime_version, '0.9.0');
  assert.equal(report.managed_merge[0].state, 'merge_required');
  assert.equal(
    report.kit_owned.find((item) => item.path === cleanUpgradePath).state,
    'update_available',
  );
  assert.equal(
    report.kit_owned.find((item) => item.path === conflictPath).state,
    'conflict',
  );
  assert.deepEqual(report.conflicts.map((item) => item.path), [conflictPath]);
  assert.equal(fs.readFileSync(configPath, 'utf8'), configBefore);
  assert.deepEqual(snapshotTree(root), treeBefore);
});

test('update inspection preserves and classifies managed, project, and runtime data', (t) => {
  const { root } = setupProject();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const projectExtension = path.join(root, 'playbooks', 'project-extension.md');
  const stateFile = path.join(root, 'ace', 'state', 'runtime', 'task', 'state.json');
  const proposalFile = path.join(root, 'ace', 'proposals', 'pending.json');
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(projectExtension, 'project-owned lesson\n');
  fs.writeFileSync(stateFile, '{"attempt":7}\n');
  fs.writeFileSync(proposalFile, '{"decision":"pending"}\n');
  const before = snapshotTree(root);

  const report = inspectTarget(root);

  assert.deepEqual(
    report.project_owned.find((item) => item.path === 'playbooks/').files
      .filter((file) => file.endsWith('project-extension.md')),
    ['playbooks/project-extension.md'],
  );
  assert.equal(report.managed_merge.find((item) => item.path === '.gitignore').state, 'current');
  assert.ok(report.protected_runtime_data.find((item) => item.path === 'ace/state/')
    .files.includes('ace/state/runtime/task/state.json'));
  assert.ok(report.protected_runtime_data.find((item) => item.path === 'ace/proposals/')
    .files.includes('ace/proposals/pending.json'));
  assert.equal(report.protected_runtime_data.find((item) => item.path === 'ace/traces/')
    .files.includes('ace/traces/CAPTURE_GUIDE.md'), false);
  assert.deepEqual(snapshotTree(root), before);
});

test('update inspection reports missing and malformed project configuration', async (t) => {
  await t.test('missing', (inner) => {
    const { root } = setupProject();
    inner.after(() => fs.rmSync(root, { recursive: true, force: true }));
    fs.rmSync(path.join(root, 'ace', 'config', 'project.json'));

    const report = inspectTarget(root);

    assert.equal(report.installation_mode, 'unconfigured');
    assert.deepEqual(report.required_config_normalization, []);
    assert.equal(report.project_owned.find(
      (item) => item.path === 'ace/config/project.json',
    ).files.length, 0);
  });

  await t.test('malformed', (inner) => {
    const { root } = setupProject();
    inner.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const configPath = path.join(root, 'ace', 'config', 'project.json');
    fs.writeFileSync(configPath, '{"integration_mode":');
    const before = snapshotTree(root);

    const report = inspectTarget(root);

    assert.equal(report.installation_mode, 'unknown');
    assert.equal(report.conflicts.some(
      (item) => item.path === 'ace/config/project.json' && /JSON/.test(item.reason),
    ), true);
    assert.deepEqual(snapshotTree(root), before);
  });
});

test('update inspection rejects symlinked owned paths without following them', (t) => {
  const { root } = setupProject();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const outside = fs.mkdtempSync(path.join(KIT_ROOT, '.test-work', 'outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.writeFileSync(path.join(outside, 'secret.txt'), 'must not be inspected\n');
  const prompts = path.join(root, 'ace', 'prompts');
  fs.rmSync(prompts, { recursive: true });
  try {
    fs.symlinkSync(outside, prompts, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) {
      t.skip(`symbolic links unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  const before = snapshotTree(root);

  const report = inspectTarget(root);

  for (const relative of [
    'ace/prompts/curator.md',
    'ace/prompts/reflector.md',
    'ace/prompts/warden.md',
  ]) {
    assert.equal(report.kit_owned.find((item) => item.path === relative).state, 'conflict');
    assert.match(
      report.conflicts.find((item) => item.path === relative).reason,
      /Symbolic links are not inspected/,
    );
  }
  assert.equal(JSON.stringify(report).includes('secret.txt'), false);
  assert.deepEqual(snapshotTree(root), before);
});

test('update prompt defines the complete safe update contract', () => {
  const prompt = fs.readFileSync(path.join(KIT_ROOT, 'UPDATE_PROMPT.md'), 'utf8');
  for (const required of [
    'legacy embedded',
    'setting `integration_mode` to `embedded`',
    'Never silently convert embedded to mediated or mediated to embedded',
    'Kit-owned',
    'Project-owned',
    'Managed ACE merge',
    'Runtime data',
    'preserve byte-for-byte',
    'locally modified kit-owned file',
    'runtime-version manifest contract',
    'Do not stash, reset, checkout, clean, stage, commit',
    'dedicated question tool',
    'read-only/report mode',
    'node <KIT_ROOT>/ace/scripts/inspect_update.js --target <TARGET_ROOT>',
    'Run this exact command as soon as the roots have been verified',
    'complete kit-owned file inventory',
    'never run or trust a target copy',
    'newer-installed/downgrade conflict',
    'grouped **`unverified`** set',
    'True conflicts remain per-file decisions',
    'copy `KIT_ROOT/ace/runtime-version.json` verbatim',
    'final kit-owned write',
    'Verify byte-for-byte equality',
    'no required update remains',
    'Pre-update effective contract',
    'selected model and provider',
    'pre/post behavioral preservation matrix',
    'Unexplained behavioral loss blocks',
    'Do not claim success while a required check fails',
  ]) {
    assert.match(
      prompt,
      new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `UPDATE_PROMPT.md missing contract text: ${required}`,
    );
  }
});

test('embedded installation prompt covers required interactive branches', () => {
  const prompt = fs.readFileSync(path.join(KIT_ROOT, 'INSTALL_PROMPT_EMBEDDED.md'), 'utf8');
  for (const required of [
    'ask_user',
    'AskUserQuestion',
    'Select participating agents',
    'Identify the orchestrator',
    'Ask about personas',
    'orchestrator-persona.md',
    'orchestrator-inline.md',
    'effective behavioral contract',
    'selected model as separate dimensions',
    'preservation matrix',
    'Unexplained behavioral loss blocks',
    'generate_ace_agents.js --check',
    'validate_install.js',
    'ownership.kit_owned',
    'Do not install a hand-picked subset',
  ]) {
    assert.match(prompt, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('mediated installer covers the runtime contract', () => {
  const prompt = fs.readFileSync(path.join(KIT_ROOT, 'INSTALL_PROMPT_MEDIATED.md'), 'utf8');
  for (const required of [
    'integration_mode',
    'canonical_to_runtime',
    'orchestrator_entrypoints.project',
    'orchestrator_entrypoints.ace',
    'prepare_delegation.js --task-id <id> --agent',
    '--platform <configured-platform>',
    'capture_trace.js',
    'finalize_task.js',
    'ace-global.instructions.md',
    'standard orchestrator and all workers remain unchanged',
    'Effective behavioral contract',
    'selected model and provider',
    'preservation matrix',
    'Unexplained behavioral loss blocks',
    'Do not install a hand-picked subset',
  ]) {
    assert.match(prompt, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('operator skills route operations and preserve effective contracts', () => {
  const skills = [
    {
      file: '.github/skills/install-ace/SKILL.md',
      name: 'install-ace',
      required: [
        'INSTALL_PROMPT_EMBEDDED.md',
        'INSTALL_PROMPT_MEDIATED.md',
        'Never treat the user-level skill directory or `TARGET_ROOT` as the kit',
        'Keep harness and model independent',
        'Build a preservation matrix',
        'unexplained-loss',
      ],
    },
    {
      file: '.github/skills/update-ace/SKILL.md',
      name: 'update-ace',
      required: [
        'UPDATE_PROMPT.md',
        'Never use the target',
        'Harness and model are independent',
        'Reconcile with an explicit matrix',
        'Run this exact command as soon as the roots have been verified',
        'runtime and learned state byte-for-byte',
        'behavioral loss is unexplained',
      ],
    },
  ];

  for (const skill of skills) {
    const content = fs.readFileSync(path.join(KIT_ROOT, skill.file), 'utf8');
    assert.match(content, new RegExp(`^---\\r?\\nname: ${skill.name}\\r?\\n`, 'm'));
    assert.match(content, /^description: .+\r?$/m);
    for (const required of skill.required) {
      assert.match(
        content,
        new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        `${skill.file} missing contract text: ${required}`,
      );
    }
  }
});
