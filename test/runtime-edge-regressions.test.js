'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const KIT_ROOT = path.resolve(__dirname, '..');

function setupProject() {
  const fixtureRoot = path.join(KIT_ROOT, '.test-work');
  fs.mkdirSync(fixtureRoot, { recursive: true });
  const root = fs.mkdtempSync(path.join(fixtureRoot, 'runtime-edges-'));
  fs.cpSync(path.join(KIT_ROOT, 'ace'), path.join(root, 'ace'), { recursive: true });
  fs.cpSync(path.join(KIT_ROOT, 'playbooks'), path.join(root, 'playbooks'), { recursive: true });

  const config = JSON.parse(fs.readFileSync(
    path.join(root, 'ace', 'config', 'project.template.json'),
    'utf8',
  ));
  config.team_name = 'Runtime edges';
  config.provisional_evaluator = 'runtime-edges-auto';
  config.orchestrator_agent = 'coordinator';
  config.participating_agents = ['worker'];
  config.platforms.copilot.enabled = true;
  config.platforms.claude.enabled = false;
  fs.writeFileSync(
    path.join(root, 'ace', 'config', 'project.json'),
    `${JSON.stringify(config, null, 2)}\n`,
  );
  return root;
}

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
}

test('runtime transitions preserve project-owned global instruction files', (t) => {
  const root = setupProject();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const configPath = path.join(root, 'ace', 'config', 'project.json');
  const projectGlobal = path.join(root, '.github', 'copilot-instructions.md');
  const dedicatedGlobal = path.join(root, '.github', 'instructions', 'ace-global.instructions.md');

  command(root, 'retrieval.js');
  assert.equal(fs.existsSync(projectGlobal), true);

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.integration_mode = 'mediated';
  config.platforms.copilot.canonical_to_runtime = { worker: 'gh/project/worker' };
  config.platforms.copilot.orchestrator_entrypoints = {
    project: 'gh/project/coordinator',
    ace: 'gh/project/coordinator-ace',
  };
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  command(root, 'retrieval.js');

  assert.equal(fs.existsSync(projectGlobal), true);
  assert.equal(fs.readFileSync(projectGlobal, 'utf8'), '');
  assert.equal(fs.existsSync(dedicatedGlobal), true);

  config.integration_mode = 'embedded';
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  command(root, 'retrieval.js');
  assert.equal(fs.existsSync(dedicatedGlobal), false);
});

test('finalization accepts a required trace already in processed', (t) => {
  const root = setupProject();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const configPath = path.join(root, 'ace', 'config', 'project.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.integration_mode = 'mediated';
  config.platforms.copilot.canonical_to_runtime = { worker: 'gh/project/worker' };
  config.platforms.copilot.orchestrator_entrypoints = {
    project: 'gh/project/coordinator',
    ace: 'gh/project/coordinator-ace',
  };
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  command(
    root,
    'prepare_delegation.js',
    '--task-id',
    'processed-trace',
    '--agent',
    'worker',
    '--platform',
    'copilot',
  );
  const trace = {
    task_id: 'processed-trace',
    agent: 'worker',
    started_at: '2026-01-01T00:00:00Z',
    playbook_bullets_seen: [],
    playbook_bullets_cited: [],
    actions: [{ description: 'Regression fixture.' }],
    outcome: { status: 'success', evaluated_by: 'verified' },
    friction: [],
  };
  const processed = path.join(
    root,
    'ace',
    'traces',
    'processed',
    'processed-trace__worker.json',
  );
  fs.mkdirSync(path.dirname(processed), { recursive: true });
  fs.writeFileSync(processed, `${JSON.stringify(trace, null, 2)}\n`);

  command(root, 'finalize_task.js', 'processed-trace');
  assert.equal(
    fs.existsSync(path.join(
      root,
      'ace',
      'state',
      'runtime',
      'processed-trace',
      'finalized.json',
    )),
    true,
  );
});
