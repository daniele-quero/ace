'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const KIT_ROOT = path.resolve(__dirname, '..');
const WORK_ROOT = path.join(KIT_ROOT, '.test-work');

function setupTarget(t) {
  fs.mkdirSync(WORK_ROOT, { recursive: true });
  const root = fs.mkdtempSync(path.join(WORK_ROOT, 'update-regression-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.cpSync(path.join(KIT_ROOT, 'ace'), path.join(root, 'ace'), { recursive: true });
  fs.mkdirSync(path.join(root, 'playbooks'), { recursive: true });
  fs.writeFileSync(path.join(root, '.gitignore'), '');
  const template = JSON.parse(fs.readFileSync(
    path.join(root, 'ace', 'config', 'project.template.json'),
    'utf8',
  ));
  template.team_name = 'Regression';
  template.provisional_evaluator = 'regression-auto';
  template.orchestrator_agent = 'coordinator';
  template.participating_agents = ['worker'];
  template.agent_families = {};
  template.platforms.copilot.enabled = true;
  template.platforms.claude.enabled = false;
  fs.writeFileSync(
    path.join(root, 'ace', 'config', 'project.json'),
    `${JSON.stringify(template, null, 2)}\n`,
  );
  return root;
}

function inspect(root) {
  const result = spawnSync(
    process.execPath,
    [path.join(KIT_ROOT, 'ace', 'scripts', 'inspect_update.js'), '--target', root],
    { cwd: KIT_ROOT, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function editManifest(root, edit) {
  const manifestPath = path.join(root, 'ace', 'runtime-version.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  edit(manifest);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

test('inspector detects dangling symlinks using lstat', (t) => {
  const root = setupTarget(t);
  const relative = 'ace/prompts/warden.md';
  const ownedPath = path.join(root, relative);
  fs.rmSync(ownedPath);
  try {
    fs.symlinkSync('missing-warden.md', ownedPath, 'file');
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) {
      t.skip(`symbolic links unavailable: ${error.code}`);
      return;
    }
    throw error;
  }

  const report = inspect(root);

  assert.equal(report.kit_owned.find((item) => item.path === relative).state, 'conflict');
  assert.match(
    report.conflicts.find((item) => item.path === relative).reason,
    /Symbolic links are not inspected/,
  );
});

test('inspector surfaces manifest-version mismatches as conflicts', (t) => {
  const root = setupTarget(t);
  const relative = 'ace/prompts/warden.md';
  fs.writeFileSync(path.join(root, relative), 'purported installed version\n');
  editManifest(root, (manifest) => {
    manifest.manifest_version += 1;
    manifest.ownership.kit_owned[relative] = crypto.createHash('sha256')
      .update('purported installed version\n').digest('hex');
  });

  const report = inspect(root);

  assert.equal(report.kit_owned[0].state, 'conflict');
  assert.equal(report.kit_owned.find((item) => item.path === relative).state, 'unverified');
  assert.match(
    report.conflicts.find((item) => item.path === 'ace/runtime-version.json').reason,
    /Manifest version mismatch/,
  );
});

test('inspector reports non-regular config and runtime manifests without aborting', (t) => {
  const root = setupTarget(t);
  const configPath = path.join(root, 'ace', 'config', 'project.json');
  const manifestPath = path.join(root, 'ace', 'runtime-version.json');
  fs.rmSync(configPath);
  fs.rmSync(manifestPath);
  fs.mkdirSync(configPath);
  fs.mkdirSync(manifestPath);

  const report = inspect(root);

  assert.equal(report.installation_mode, 'unknown');
  assert.equal(report.kit_owned[0].state, 'conflict');
  assert.match(
    report.conflicts.find((item) => item.path === 'ace/config/project.json').reason,
    /not a regular file/,
  );
  assert.match(
    report.conflicts.find((item) => item.path === 'ace/runtime-version.json').reason,
    /not a regular file/,
  );
});

test('inspector reports symlinked config and runtime manifests without aborting', (t) => {
  const root = setupTarget(t);
  const configPath = path.join(root, 'ace', 'config', 'project.json');
  const manifestPath = path.join(root, 'ace', 'runtime-version.json');
  fs.rmSync(configPath);
  fs.rmSync(manifestPath);
  try {
    fs.symlinkSync('project.template.json', configPath, 'file');
    fs.symlinkSync(path.join('config', 'project.template.json'), manifestPath, 'file');
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) {
      t.skip(`symbolic links unavailable: ${error.code}`);
      return;
    }
    throw error;
  }

  const report = inspect(root);

  assert.equal(report.installation_mode, 'unknown');
  assert.equal(report.kit_owned[0].state, 'conflict');
  for (const relative of ['ace/config/project.json', 'ace/runtime-version.json']) {
    assert.match(
      report.conflicts.find((item) => item.path === relative).reason,
      /Symbolic links are not inspected/,
    );
  }
});

test('inspector reports unreadable config and runtime manifests without aborting', (t) => {
  if (process.platform === 'win32') {
    t.skip('POSIX file permissions are unavailable on Windows');
    return;
  }
  const root = setupTarget(t);
  const configPath = path.join(root, 'ace', 'config', 'project.json');
  const manifestPath = path.join(root, 'ace', 'runtime-version.json');
  fs.chmodSync(configPath, 0o000);
  fs.chmodSync(manifestPath, 0o000);
  t.after(() => {
    fs.chmodSync(configPath, 0o600);
    fs.chmodSync(manifestPath, 0o600);
  });
  try {
    fs.readFileSync(configPath);
    t.skip('current user can bypass file permissions');
    return;
  } catch (error) {
    assert.equal(error.code, 'EACCES');
  }

  const report = inspect(root);

  assert.equal(report.installation_mode, 'unknown');
  assert.equal(report.kit_owned[0].state, 'conflict');
  for (const relative of ['ace/config/project.json', 'ace/runtime-version.json']) {
    assert.match(
      report.conflicts.find((item) => item.path === relative).reason,
      /EACCES|permission denied/i,
    );
  }
});

test('inspector semver-blocks downgrade from a newer installed kit', (t) => {
  const root = setupTarget(t);
  editManifest(root, (manifest) => { manifest.runtime_version = '1.10.0'; });

  const report = inspect(root);

  assert.equal(report.version_relation, 'newer_installed');
  assert.equal(report.update_blocked, true);
  assert.equal(report.kit_owned[0].state, 'downgrade_blocked');
  assert.match(
    report.conflicts.find((item) => item.path === 'ace/runtime-version.json').reason,
    /downgrade is blocked/,
  );
});

test('inspector classifies a differing hashless owned file as unverified', (t) => {
  const root = setupTarget(t);
  const relative = 'ace/prompts/warden.md';
  fs.writeFileSync(path.join(root, relative), 'unknown provenance\n');
  editManifest(root, (manifest) => {
    delete manifest.ownership.kit_owned[relative];
  });

  const report = inspect(root);

  assert.equal(report.kit_owned.find((item) => item.path === relative).state, 'unverified');
  assert.equal(report.conflicts.some((item) => item.path === relative), false);
});

test('inspector mirrors mediated mapping and entrypoint normalization rules', (t) => {
  const root = setupTarget(t);
  const configPath = path.join(root, 'ace', 'config', 'project.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.integration_mode = 'mediated';
  config.platforms.copilot.canonical_to_runtime = {
    worker: 'copilot/project/coordinator',
  };
  config.platforms.copilot.orchestrator_entrypoints = {
    project: 'copilot/project/coordinator',
    ace: 'copilot/project/not-suffixed',
  };
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  let report = inspect(root);
  assert.deepEqual(
    report.required_config_normalization.map((item) => item.field),
    ['platforms.copilot.orchestrator_entrypoints'],
  );

  config.platforms.copilot.orchestrator_entrypoints.ace =
    `${config.platforms.copilot.orchestrator_entrypoints.project}-ace`;
  config.platforms.copilot.canonical_to_runtime.worker =
    config.platforms.copilot.orchestrator_entrypoints.ace;
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  report = inspect(root);
  assert.deepEqual(
    report.required_config_normalization.map((item) => item.field),
    ['platforms.copilot.canonical_to_runtime'],
  );

  config.participating_agents.push('reviewer');
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  report = inspect(root);
  assert.deepEqual(
    report.required_config_normalization.map((item) => item.field),
    ['platforms.copilot.canonical_to_runtime'],
  );
});

test('inspector retains conflicts for files that differ from a known installed hash', (t) => {
  const root = setupTarget(t);
  const relative = 'ace/prompts/warden.md';
  fs.writeFileSync(path.join(root, relative), 'local edit\n');
  editManifest(root, (manifest) => {
    manifest.ownership.kit_owned[relative] = crypto.createHash('sha256')
      .update('installed version\n').digest('hex');
  });

  const report = inspect(root);

  assert.equal(report.kit_owned.find((item) => item.path === relative).state, 'conflict');
  assert.equal(report.conflicts.some((item) => item.path === relative), true);
});
