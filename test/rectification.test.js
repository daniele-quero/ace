'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');
const { spawnSync } = childProcess;
const test = require('node:test');
const { copyRuntimeKit } = require('./helpers/copy_runtime_kit');

const KIT_ROOT = path.resolve(__dirname, '..');
const OLD = 'If a catalogue entry is missing, attribute the observation to the patient.';
const NEW = 'Preserve the original source type and author, including a null author; a missing catalogue entry does not establish provenance.';
const SOURCE = path.join('ace', 'skills', 'rectify-playbook');
const KIT_SOURCE = path.join('.github', 'skills', 'rectify-playbook');
const hash = (content) => crypto.createHash('sha256')
  .update(content.replace(/\r\n/g, '\n')).digest('hex');

function json(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function execute(root, script, args = [], success = true, cwd = root) {
  const result = spawnSync(process.execPath, [path.join(root, 'ace', 'scripts', script), ...args], {
    cwd, encoding: 'utf8',
  });
  assert.equal(result.error, undefined);
  if (success) assert.equal(result.status, 0, `${script}\n${result.stdout}\n${result.stderr}`);
  else assert.notEqual(result.status, 0, `${script} unexpectedly succeeded`);
  return result;
}

function snapshot(root) {
  const files = {};
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else files[path.relative(root, file)] = fs.readFileSync(file, 'utf8');
    }
  };
  visit(root);
  return files;
}

function fixture(t, { mode = 'embedded', copilot = true, claude = true, eol = '\n' } = {}) {
  const parent = path.join(KIT_ROOT, '.test-work');
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, 'rectification-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  copyRuntimeKit(KIT_ROOT, root);
  fs.cpSync(path.join(KIT_ROOT, 'playbooks'), path.join(root, 'playbooks'), { recursive: true });
  fs.copyFileSync(path.join(KIT_ROOT, '.gitignore'), path.join(root, '.gitignore'));
  const config = JSON.parse(fs.readFileSync(path.join(root, 'ace', 'config', 'project.template.json'), 'utf8'));
  Object.assign(config, {
    team_name: 'Rectification fixture', integration_mode: mode,
    provisional_evaluator: 'fixture-auto', orchestrator_agent: 'coordinator',
    participating_agents: ['worker'],
  });
  config.platforms.copilot.enabled = copilot;
  config.platforms.claude.enabled = claude;
  for (const platform of Object.values(config.platforms)) {
    if (!platform.enabled || mode !== 'mediated') continue;
    platform.canonical_to_runtime = { worker: `${platform.runtime_prefix}/project/worker` };
    platform.orchestrator_entrypoints = {
      project: `${platform.runtime_prefix}/project/coordinator`,
      ace: `${platform.runtime_prefix}/project/coordinator-ace`,
    };
  }
  json(path.join(root, 'ace', 'config', 'project.json'), config);
  fs.writeFileSync(path.join(root, 'contract.txt'), 'Preserve source attribution exactly. Unknown authors stay null.\n');
  const helper = require(path.join(root, 'ace', 'scripts', 'lib', 'playbook'));
  const makeBullet = (id, content) => ({
    id, content, status: 'active', used: 7, helped: 4, hurt: 1,
    helped_confirmed: 3, helped_provisional: 1, hurt_confirmed: 1, hurt_provisional: 0,
    tags: ['source'], provenance: 'created_by=fixture; source_trace_ids=[]',
  });
  const skeleton = helper.defaultPlaybookSkeleton(path.join('playbooks', 'worker.md'));
  const text = helper.serializeFile('# Worker lessons\n\nKeep this introduction.', [
    makeBullet('P-009', OLD), makeBullet('P-010', 'Keep this unrelated lesson exactly.'),
  ], skeleton.suffix);
  fs.writeFileSync(path.join(root, 'playbooks', 'worker.md'), text.replace(/\n/g, eol));
  const coordinator = helper.defaultPlaybookSkeleton(path.join('playbooks', 'coordinator.md'));
  fs.writeFileSync(path.join(root, 'playbooks', 'coordinator.md'),
    helper.serializeFile(coordinator.prefix, [], coordinator.suffix));
  return { root, helper, config };
}

function request(root, overrides = {}) {
  const document = {
    version: 1, rectification_id: 'fix-provenance', playbook: 'playbooks/worker.md',
    request_summary: 'Correct P-009 without changing any other lesson or behavior.',
    changes: [{ bullet_id: 'P-009', before: OLD, after: NEW, rationale: 'Catalogue coverage does not identify an author.' }],
    context_files: ['contract.txt'], evidence: [],
    ...overrides,
  };
  const file = path.join(root, 'ace', 'state', 'rectifications', 'requests', 'fix-provenance.json');
  json(file, document);
  return { file, document };
}

function reviewed(root, requestFile, overrides = {}) {
  const plan = JSON.parse(execute(root, 'rectify_playbook.js', ['--request', requestFile, '--check']).stdout);
  const document = {
    rectification_id: plan.rectification_id,
    request_sha256: plan.request_sha256,
    review_state_sha256: plan.review_state_sha256,
    reviewer: 'fixture-independent-reviewer', independent: true, verdict: 'approve',
    checks: {
      scope: 'A separate explicit external user request authorizes only the P-009 body correction.',
      contracts: 'Source attribution and nullability match contract.txt.',
      conflicts: 'All fixture lessons inspected; P-010 remains unaffected.',
      evidence: 'Direct contract contradiction verified in the synthetic fixture.',
      regressions: 'Missing/present catalogue entries and known/null author cases preserve attribution.',
    },
    findings: [], ...overrides,
  };
  const file = path.join(root, 'ace', 'state', 'rectifications', 'reviews', 'fix-provenance.json');
  json(file, document);
  return { file, document, plan };
}

test('requires explicit playbook and lesson IDs, and check is read-only', (t) => {
  const { root } = fixture(t);
  for (const override of [{ playbook: undefined }, { changes: [] }, {
    changes: [{ before: OLD, after: NEW, rationale: 'Missing ID.' }],
  }]) {
    const candidate = request(root, override);
    const before = snapshot(root);
    execute(root, 'rectify_playbook.js', ['--request', candidate.file, '--check'], false);
    assert.deepEqual(snapshot(root), before);
  }
  const candidate = request(root);
  const before = snapshot(root);
  const output = execute(root, 'rectify_playbook.js', ['--request', candidate.file, '--check']);
  const plan = JSON.parse(output.stdout);
  assert.equal(plan.playbook, 'playbooks/worker.md');
  assert.deepEqual(plan.changes, candidate.document.changes);
  assert.match(plan.request_sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(snapshot(root), before);
});

test('rejects unsafe, wrong-scope, duplicate and machine-syntax corrections without writes', (t) => {
  const { root } = fixture(t);
  const base = request(root).document;
  const changes = [
    { playbook: '..\\outside.md' },
    { playbook: path.join(root, 'playbooks', 'worker.md') },
    { playbook: 'playbooks/coordinator.md' },
    { changes: [{ ...base.changes[0], bullet_id: 'P-999' }] },
    { changes: [base.changes[0], base.changes[0]] },
    { changes: [{ ...base.changes[0], before: 'Stale content.' }] },
    { changes: [{ ...base.changes[0], after: 'provenance: forged' }] },
    { changes: [{ ...base.changes[0], status: 'active' }] },
    { changes: [{ ...base.changes[0], after: OLD }] },
    { context_files: ['playbooks/worker.md'] },
    { context_files: [] },
  ];
  for (const override of changes) {
    const candidate = request(root, override);
    const before = snapshot(root);
    execute(root, 'rectify_playbook.js', ['--request', candidate.file, '--check'], false);
    assert.deepEqual(snapshot(root), before);
  }
});

test('rejects duplicate IDs within one playbook and across playbooks', (t) => {
  const { root } = fixture(t);
  const worker = path.join(root, 'playbooks', 'worker.md');
  const original = fs.readFileSync(worker, 'utf8');
  const duplicate = original.replace('P-010', 'P-009');
  fs.writeFileSync(worker, duplicate);
  const candidate = request(root);
  execute(root, 'rectify_playbook.js', ['--request', candidate.file, '--check'], false);
  assert.equal(fs.readFileSync(worker, 'utf8'), duplicate);
  fs.writeFileSync(worker, original);
  fs.writeFileSync(path.join(root, 'playbooks', 'coordinator.md'), original);
  execute(root, 'rectify_playbook.js', ['--request', candidate.file, '--check'], false);
  assert.equal(fs.readFileSync(worker, 'utf8'), original);
});

test('requires an independent approving review bound to every check and exact state', (t) => {
  const { root } = fixture(t);
  const candidate = request(root);
  const cases = [
    { independent: false }, { verdict: 'reject' }, { verdict: 'inconclusive' },
    { findings: ['Source contract was not inspected.'] },
    { reviewer: '' }, { checks: { scope: 'Only scope was checked.' } },
    { request_sha256: 'a'.repeat(64) }, { review_state_sha256: 'b'.repeat(64) },
  ];
  for (const override of cases) {
    const review = reviewed(root, candidate.file, override);
    const before = snapshot(root);
    execute(root, 'rectify_playbook.js', ['--request', candidate.file, '--review', review.file, '--apply'], false);
    assert.deepEqual(snapshot(root), before);
  }
  const review = reviewed(root, candidate.file);
  fs.appendFileSync(path.join(root, 'contract.txt'), 'A changed reviewed contract.\n');
  const before = snapshot(root);
  execute(root, 'rectify_playbook.js', ['--request', candidate.file, '--review', review.file, '--apply'], false);
  assert.deepEqual(snapshot(root), before);
});

test('rejects changed requests and unrelated playbook changes after independent review', (t) => {
  const { root } = fixture(t);
  const candidate = request(root);
  const review = reviewed(root, candidate.file);
  json(candidate.file, { ...candidate.document, request_summary: 'Different scope after review.' });
  execute(root, 'rectify_playbook.js', ['--request', candidate.file, '--review', review.file, '--apply'], false);
  json(candidate.file, candidate.document);
  fs.appendFileSync(path.join(root, 'playbooks', 'coordinator.md'), '\nChanged context.\n');
  const before = snapshot(root);
  execute(root, 'rectify_playbook.js', ['--request', candidate.file, '--review', review.file, '--apply'], false);
  assert.deepEqual(snapshot(root), before);
});

test('rejects a runtime upgrade after independent review', (t) => {
  const { root } = fixture(t);
  const candidate = request(root);
  const review = reviewed(root, candidate.file);
  const manifestFile = path.join(root, 'ace', 'runtime-version.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  manifest.runtime_version = '1.3.0';
  json(manifestFile, manifest);
  const before = snapshot(root);
  execute(root, 'rectify_playbook.js', ['--request', candidate.file, '--review', review.file, '--apply'], false);
  assert.deepEqual(snapshot(root), before);
});

test('canonical rectification skill lives in .github with explicit installed runtime paths', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(KIT_ROOT, 'ace', 'runtime-version.json'), 'utf8'));
  for (const relative of ['SKILL.md', 'references/review.md']) {
    const runtimePath = `${SOURCE.replace(/\\/g, '/')}/${relative}`;
    const kitPath = `${KIT_SOURCE.replace(/\\/g, '/')}/${relative}`;
    assert.equal(fs.existsSync(path.join(KIT_ROOT, runtimePath)), false);
    assert.equal(manifest.source_paths[runtimePath], kitPath);
    assert.equal(manifest.ownership.kit_owned[runtimePath],
      hash(fs.readFileSync(path.join(KIT_ROOT, kitPath), 'utf8')));
  }
});

for (const mode of ['embedded', 'mediated']) {
  test(`applies an external ${mode} correction with audit, unchanged metadata and synchronized views`, (t) => {
    const { root, helper } = fixture(t, { mode, eol: '\r\n' });
    execute(root, 'generate_ace_agents.js');
    execute(root, 'retrieval.js');
    const worker = path.join(root, 'playbooks', 'worker.md');
    const before = fs.readFileSync(worker, 'utf8');
    const oldBullets = helper.parsePlaybookFile(before).bullets;
    const untouched = before.slice(before.indexOf('## P-010'));
    const traces = snapshot(path.join(root, 'ace', 'traces'));
    const proposals = snapshot(path.join(root, 'ace', 'proposals'));
    const candidate = request(root);
    const review = reviewed(root, candidate.file);
    const result = JSON.parse(execute(root, 'rectify_playbook.js',
      ['--request', candidate.file, '--review', review.file, '--apply']).stdout);
    assert.equal(result.status, 'completed');
    const after = fs.readFileSync(worker, 'utf8');
    assert.equal(after.slice(after.indexOf('## P-010')), untouched);
    const newBullets = helper.parsePlaybookFile(after).bullets;
    assert.deepEqual({ ...newBullets[0], content: OLD, provenance: oldBullets[0].provenance }, oldBullets[0]);
    assert.equal(newBullets[0].content, NEW);
    assert.match(newBullets[0].provenance, /external_rectification=fix-provenance/);
    assert.deepEqual(newBullets[1], oldBullets[1]);
    assert.deepEqual(snapshot(path.join(root, 'ace', 'traces')), traces);
    assert.deepEqual(snapshot(path.join(root, 'ace', 'proposals')), proposals);
    const audit = JSON.parse(fs.readFileSync(path.join(root, result.audit), 'utf8'));
    assert.equal(audit.review.reviewer, 'fixture-independent-reviewer');
    assert.equal(audit.before, before);
    assert.equal(audit.after, after);
    assert.equal(audit.authorization, 'initial-submitted-request');
    for (const prefix of ['.github', '.claude']) {
      const view = fs.readFileSync(path.join(root, prefix, 'instructions', 'ace-worker.instructions.md'), 'utf8');
      assert.ok(view.includes(NEW));
      assert.ok(!view.includes(OLD));
    }
    execute(root, 'retrieval.js', ['--check']);
    execute(root, 'rectify_playbook.js', ['--request', candidate.file, '--review', review.file, '--apply'], false);
  });
}

test('rectification runs by absolute path from any working directory', (t) => {
  const { root, helper } = fixture(t);
  execute(root, 'generate_ace_agents.js');
  execute(root, 'retrieval.js');
  const candidate = request(root);
  const nested = path.join(root, 'docs');
  fs.mkdirSync(nested, { recursive: true });
  const expected = execute(root, 'rectify_playbook.js', ['--request', candidate.file, '--check']).stdout;
  for (const cwd of [os.tmpdir(), nested]) {
    assert.equal(execute(root, 'rectify_playbook.js',
      ['--request', candidate.file, '--check'], true, cwd).stdout, expected);
  }
  const review = reviewed(root, candidate.file);
  const result = JSON.parse(execute(root, 'rectify_playbook.js',
    ['--request', candidate.file, '--review', review.file, '--apply'], true, os.tmpdir()).stdout);
  assert.equal(result.status, 'completed');
  const bullets = helper.parsePlaybookFile(fs.readFileSync(path.join(root, 'playbooks', 'worker.md'), 'utf8')).bullets;
  assert.equal(bullets.find((bullet) => bullet.id === 'P-009').content, NEW);
  execute(root, 'retrieval.js', ['--check'], true, os.tmpdir());
});

test('corrects multiple explicit lessons without touching other metadata', (t) => {
  const { root, helper } = fixture(t);
  const candidate = request(root, {
    changes: [
      { bullet_id: 'P-010', before: 'Keep this unrelated lesson exactly.', after: 'A second explicitly requested correction.', rationale: 'Second explicit target.' },
      { bullet_id: 'P-009', before: OLD, after: NEW, rationale: 'First explicit target.' },
    ],
  });
  const review = reviewed(root, candidate.file);
  execute(root, 'rectify_playbook.js', ['--request', candidate.file, '--review', review.file, '--apply']);
  const bullets = helper.parsePlaybookFile(fs.readFileSync(path.join(root, 'playbooks', 'worker.md'), 'utf8')).bullets;
  assert.equal(bullets[0].content, NEW);
  assert.equal(bullets[1].content, 'A second explicitly requested correction.');
  assert.equal(bullets[0].used, 7);
  assert.equal(bullets[1].used, 7);
});

test('adds external provenance before an indented format footer when old provenance is absent', (t) => {
  const { root, helper } = fixture(t);
  const worker = path.join(root, 'playbooks', 'worker.md');
  fs.writeFileSync(worker, fs.readFileSync(worker, 'utf8')
    .replace(/^provenance:.*\n/gm, '').replace('<!--', '  <!--'));
  const candidate = request(root, {
    changes: [{ bullet_id: 'P-010', before: 'Keep this unrelated lesson exactly.', after: 'An explicitly corrected last lesson.', rationale: 'Exercise missing legacy provenance.' }],
  });
  const review = reviewed(root, candidate.file);
  execute(root, 'rectify_playbook.js', ['--request', candidate.file, '--review', review.file, '--apply']);
  const parsed = helper.parsePlaybookFile(fs.readFileSync(worker, 'utf8'));
  assert.match(parsed.bullets[1].provenance, /external_rectification=fix-provenance/);
  assert.equal(parsed.bullets[1].content, 'An explicitly corrected last lesson.');
  assert.match(parsed.suffix, /^  <!--/);
});

for (const scope of ['global', 'family']) {
  test(`rectifies explicitly named ${scope} playbooks through the same guarded path`, (t) => {
    const { root, helper, config } = fixture(t);
    const relative = scope === 'global' ? path.join('playbooks', '_global.md')
      : path.join('playbooks', 'families', 'data.md');
    const worker = path.join(root, 'playbooks', 'worker.md');
    fs.copyFileSync(worker, path.join(root, relative));
    const empty = helper.defaultPlaybookSkeleton(path.join('playbooks', 'worker.md'));
    fs.writeFileSync(worker, helper.serializeFile(empty.prefix, [], empty.suffix));
    if (scope === 'family') {
      config.agent_families = { worker: ['data'] };
      json(path.join(root, 'ace', 'config', 'project.json'), config);
    }
    const candidate = request(root, { playbook: relative });
    const review = reviewed(root, candidate.file);
    execute(root, 'rectify_playbook.js', ['--request', candidate.file, '--review', review.file, '--apply']);
    const instruction = scope === 'global' ? path.join(root, '.github', 'copilot-instructions.md')
      : path.join(root, '.github', 'instructions', 'ace-family-data.instructions.md');
    assert.ok(fs.readFileSync(instruction, 'utf8').includes(NEW));
  });
}

test('preserves historical counters and explicitly reports a still-excluded corrected lesson', (t) => {
  const { root } = fixture(t);
  const worker = path.join(root, 'playbooks', 'worker.md');
  fs.writeFileSync(worker, fs.readFileSync(worker, 'utf8').replace('hurt_confirmed=1', 'hurt_confirmed=5'));
  const candidate = request(root);
  const review = reviewed(root, candidate.file);
  assert.equal(review.plan.excluded_targets[0].id, 'P-009');
  const result = JSON.parse(execute(root, 'rectify_playbook.js',
    ['--request', candidate.file, '--review', review.file, '--apply']).stdout);
  assert.equal(result.excluded_targets[0].id, 'P-009');
  assert.ok(!fs.readFileSync(path.join(root, '.github', 'instructions', 'ace-worker.instructions.md'), 'utf8').includes('P-009'));
  assert.match(fs.readFileSync(worker, 'utf8'), /hurt_confirmed=5/);
});

test('recovers interrupted synchronization and blocks ordinary writers until recovery', (t) => {
  const { root } = fixture(t);
  const candidate = request(root);
  const review = reviewed(root, candidate.file);
  const blocked = path.join(root, '.github', 'instructions', 'ace-worker.instructions.md');
  fs.mkdirSync(blocked, { recursive: true });
  execute(root, 'rectify_playbook.js', ['--request', candidate.file, '--review', review.file, '--apply'], false);
  const auditFile = path.join(root, 'ace', 'state', 'rectifications', 'fix-provenance.json');
  assert.equal(JSON.parse(fs.readFileSync(auditFile, 'utf8')).status, 'applying');
  assert.ok(fs.readFileSync(path.join(root, 'playbooks', 'worker.md'), 'utf8').includes(NEW));
  const writer = execute(root, 'update_counters.js', [], false);
  assert.match(writer.stderr, /Incomplete playbook rectification/);
  execute(root, 'rectify_playbook.js', ['--resume', 'different-id'], false);
  fs.rmdirSync(blocked);
  const result = JSON.parse(execute(root, 'rectify_playbook.js', ['--resume', 'fix-provenance']).stdout);
  assert.equal(result.status, 'completed');
  assert.equal(JSON.parse(fs.readFileSync(auditFile, 'utf8')).status, 'completed');
  assert.ok(fs.readFileSync(blocked, 'utf8').includes(NEW));
});

test('does not resume a tampered audit or a changed reviewed contract', (t) => {
  const { root } = fixture(t);
  const candidate = request(root);
  const review = reviewed(root, candidate.file);
  const blocked = path.join(root, '.github', 'instructions', 'ace-worker.instructions.md');
  fs.mkdirSync(blocked, { recursive: true });
  execute(root, 'rectify_playbook.js', ['--request', candidate.file, '--review', review.file, '--apply'], false);
  fs.rmdirSync(blocked);
  const auditFile = path.join(root, 'ace', 'state', 'rectifications', 'fix-provenance.json');
  const original = JSON.parse(fs.readFileSync(auditFile, 'utf8'));
  json(auditFile, { ...original, after: `${original.after}\nUnreviewed content.\n` });
  execute(root, 'rectify_playbook.js', ['--resume', 'fix-provenance'], false);
  json(auditFile, original);
  fs.appendFileSync(path.join(root, 'contract.txt'), 'Changed during recovery.\n');
  execute(root, 'rectify_playbook.js', ['--resume', 'fix-provenance'], false);
  assert.equal(JSON.parse(fs.readFileSync(auditFile, 'utf8')).status, 'applying');
});

test('resumes when retrieval only added a generated ACE block beside the reviewed source contract', (t) => {
  const { root } = fixture(t);
  const contract = path.join(root, '.github', 'copilot-instructions.md');
  fs.mkdirSync(path.dirname(contract), { recursive: true });
  fs.writeFileSync(contract, 'Source attribution must remain unchanged, including null authors.\n');
  const candidate = request(root, { context_files: ['.github/copilot-instructions.md'] });
  const review = reviewed(root, candidate.file);
  const blocked = path.join(root, '.github', 'instructions', 'ace-worker.instructions.md');
  fs.mkdirSync(blocked, { recursive: true });
  execute(root, 'rectify_playbook.js', ['--request', candidate.file, '--review', review.file, '--apply'], false);
  assert.match(fs.readFileSync(contract, 'utf8'), /ACE:BEGIN/);
  fs.rmdirSync(blocked);
  execute(root, 'rectify_playbook.js', ['--resume', 'fix-provenance']);
  assert.ok(fs.readFileSync(contract, 'utf8').startsWith('Source attribution must remain unchanged, including null authors.'));
});

for (const mode of ['embedded', 'mediated']) {
  for (const [copilot, claude] of [[true, false], [false, true], [true, true]]) {
    test(`ships complete runtime skills in ${mode}, Copilot=${copilot}, Claude=${claude}`, (t) => {
      const { root } = fixture(t, { mode, copilot, claude });
      const unrelated = path.join(root, '.github', 'skills', 'host-skill', 'SKILL.md');
      fs.mkdirSync(path.dirname(unrelated), { recursive: true });
      fs.writeFileSync(unrelated, 'Host-owned unrelated skill.\n');
      const manifestFile = path.join(root, 'ace', 'runtime-version.json');
      const manifest = fs.readFileSync(manifestFile, 'utf8');
      fs.unlinkSync(manifestFile);
      execute(root, 'generate_ace_agents.js');
      assert.equal(fs.existsSync(manifestFile), false);
      for (const [prefix, enabled] of [['.github', copilot], ['.claude', claude]]) {
        const directory = path.join(root, prefix, 'skills', 'rectify-playbook');
        assert.equal(fs.existsSync(directory), enabled);
        if (!enabled) continue;
        for (const relative of ['SKILL.md', path.join('references', 'review.md')]) {
          assert.equal(fs.readFileSync(path.join(directory, relative), 'utf8'),
            fs.readFileSync(path.join(root, SOURCE, relative), 'utf8'));
          assert.equal(fs.readFileSync(path.join(directory, relative), 'utf8'),
            fs.readFileSync(path.join(KIT_ROOT, KIT_SOURCE, relative), 'utf8'));
        }
        assert.match(fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8'), /user-invocable: true/);
        assert.match(fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8'), /disable-model-invocation: true/);
      }
      assert.equal(fs.readFileSync(unrelated, 'utf8'), 'Host-owned unrelated skill.\n');
      fs.writeFileSync(manifestFile, manifest);
      const before = snapshot(root);
      execute(root, 'generate_ace_agents.js', ['--check']);
      assert.deepEqual(snapshot(root), before);
    });
  }
}

test('rejects malformed present runtime manifests instead of treating them as clean installs', (t) => {
  const { root } = fixture(t);
  const manifestFile = path.join(root, 'ace', 'runtime-version.json');
  for (const content of ['{', 'null', '[]']) {
    fs.writeFileSync(manifestFile, content);
    const before = snapshot(root);
    const result = execute(root, 'generate_ace_agents.js', [], false);
    assert.match(result.stderr, /JSON|manifest object/);
    assert.deepEqual(snapshot(root), before);
  }
});

test('blocks unowned same-name skill collisions and modified installed copies without overwriting', (t) => {
  const { root } = fixture(t, { claude: false });
  const manifestFile = path.join(root, 'ace', 'runtime-version.json');
  const manifest = fs.readFileSync(manifestFile, 'utf8');
  fs.unlinkSync(manifestFile);
  const skill = path.join(root, '.github', 'skills', 'rectify-playbook', 'SKILL.md');
  fs.mkdirSync(path.dirname(skill), { recursive: true });
  fs.writeFileSync(skill, 'A pre-existing host skill with the same name.\n');
  const before = snapshot(root);
  execute(root, 'generate_ace_agents.js', [], false);
  assert.deepEqual(snapshot(root), before);
  fs.writeFileSync(skill, fs.readFileSync(path.join(root, SOURCE, 'SKILL.md'), 'utf8'));
  execute(root, 'generate_ace_agents.js');
  assert.equal(fs.existsSync(manifestFile), false);
  fs.writeFileSync(manifestFile, manifest);
  fs.appendFileSync(skill, '\nLocal customization.\n');
  const modified = snapshot(root);
  execute(root, 'generate_ace_agents.js', ['--check'], false);
  execute(root, 'generate_ace_agents.js', [], false);
  assert.deepEqual(snapshot(root), modified);
});

test('upgrades clean owned copies and removes only manifest-proven stale companion files', (t) => {
  const { root } = fixture(t, { claude: false });
  execute(root, 'generate_ace_agents.js');
  const directory = path.join(root, '.github', 'skills', 'rectify-playbook');
  const old = 'Previous kit-owned runtime skill.\n';
  fs.writeFileSync(path.join(directory, 'SKILL.md'), old);
  fs.writeFileSync(path.join(directory, 'obsolete.txt'), 'Previous companion.\n');
  const manifestFile = path.join(root, 'ace', 'runtime-version.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  delete manifest.source_paths;
  manifest.runtime_version = '1.2.0';
  manifest.ownership.kit_owned['ace/skills/rectify-playbook/SKILL.md'] = hash(old);
  manifest.ownership.kit_owned['ace/skills/rectify-playbook/obsolete.txt'] = hash('Previous companion.\n');
  json(manifestFile, manifest);
  const before = snapshot(root);
  execute(root, 'generate_ace_agents.js', ['--check'], false);
  assert.deepEqual(snapshot(root), before);
  execute(root, 'generate_ace_agents.js');
  assert.equal(fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8'),
    fs.readFileSync(path.join(root, SOURCE, 'SKILL.md'), 'utf8'));
  assert.equal(fs.existsSync(path.join(directory, 'obsolete.txt')), false);
  fs.writeFileSync(path.join(directory, 'unowned.txt'), 'Do not delete this unknown file.\n');
  const unknown = snapshot(root);
  execute(root, 'generate_ace_agents.js', [], false);
  assert.deepEqual(snapshot(root), unknown);
});

test('update inspection inventories missing, current, upgradeable and conflicting platform skills read-only', (t) => {
  const { root } = fixture(t, { claude: false });
  const inspect = () => {
    const result = spawnSync(process.execPath,
      [path.join(KIT_ROOT, 'ace', 'scripts', 'inspect_update.js'), '--target', root],
      { cwd: KIT_ROOT, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  let before = snapshot(root);
  let report = inspect();
  const relative = '.github/skills/rectify-playbook/SKILL.md';
  assert.equal(report.kit_owned.find((item) => item.path === relative).state, 'missing');
  assert.ok(!report.kit_owned.some((item) => item.path.startsWith('.claude/skills/')));
  assert.deepEqual(snapshot(root), before);
  execute(root, 'generate_ace_agents.js');
  report = inspect();
  assert.equal(report.kit_owned.find((item) => item.path === relative).state, 'current');
  const old = 'A prior owned skill.\n';
  fs.writeFileSync(path.join(root, relative), old);
  const manifestFile = path.join(root, 'ace', 'runtime-version.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  delete manifest.source_paths;
  manifest.runtime_version = '1.2.0';
  manifest.ownership.kit_owned['ace/skills/rectify-playbook/SKILL.md'] = hash(old);
  json(manifestFile, manifest);
  report = inspect();
  assert.equal(report.kit_owned.find((item) => item.path === relative).state, 'update_available');
  fs.appendFileSync(path.join(root, relative), 'An unreviewed local modification.\n');
  before = snapshot(root);
  report = inspect();
  assert.equal(report.kit_owned.find((item) => item.path === relative).state, 'conflict');
  assert.ok(report.conflicts.some((item) => item.path === relative));
  assert.equal(report.write_performed, false);
  assert.deepEqual(snapshot(root), before);
});

test('installation validation requires complete fresh installed runtime skills', (t) => {
  const { root } = fixture(t);
  assert.equal(spawnSync('git', ['init', '--quiet'], { cwd: root, encoding: 'utf8' }).status, 0);
  execute(root, 'generate_ace_agents.js');
  execute(root, 'retrieval.js');
  execute(root, 'validate_install.js');
  const companion = path.join(root, '.github', 'skills', 'rectify-playbook', 'references', 'review.md');
  fs.unlinkSync(companion);
  const result = execute(root, 'validate_install.js', [], false);
  assert.match(result.stderr, /runtime skills are stale/);
});

test('the installed skill separates external authorization and mandatory independent review from ordinary learning', () => {
  const skill = fs.readFileSync(path.join(KIT_ROOT, KIT_SOURCE, 'SKILL.md'), 'utf8');
  const review = fs.readFileSync(path.join(KIT_ROOT, KIT_SOURCE, 'references', 'review.md'), 'utf8');
  assert.match(skill, /user-invocable: true/);
  assert.match(skill, /disable-model-invocation: true/);
  assert.match(skill, /^description: "USER-INVOKED ONLY: run solely when the user explicitly invokes \/rectify-playbook;/m);
  assert.match(skill, /This skill is user-invocable only/);
  assert.match(skill, /No agent, subagent, handoff, hook, lifecycle role, other\s+skill or automation may invoke, load, delegate, forward or emulate it/);
  assert.doesNotMatch(skill, /An external agent may submit|agent's explicitly delegated/);
  assert.match(skill, /node "<PROJECT_ROOT>\/ace\/scripts\/rectify_playbook\.js" --request "<PROJECT_ROOT>\/ace\/state\/rectifications\/requests\/<rectification_id>\.json" --check/);
  assert.doesNotMatch(skill, /node ace\//);
  assert.match(skill, /If either is missing, fail explicitly/);
  assert.match(skill, /separate, read-only subagent/);
  assert.match(skill, /If independent delegation is unavailable, fail/);
  assert.match(skill, /Do not\s+ask for another approval/);
  assert.match(skill, /Do not invoke reflector, curator, warden/);
  assert.match(skill, /## External-only entry gate/);
  assert.match(skill, /Do not relabel an in-flight task, batch or lifecycle delegation/);
  assert.match(skill, /external origin is\s+unclear, fail before preparing request\/review files/);
  assert.match(review, /actual external origin and separate correction-only task/);
  assert.match(review, /Reject ordinary-cycle work, lifecycle-created handoffs/);
  assert.match(review, /the user must have explicitly invoked `rectify-playbook`/);
  assert.match(review, /invocations initiated, delegated or forwarded by an agent/);
  for (const key of ['scope', 'contracts', 'conflicts', 'evidence', 'regressions']) {
    assert.ok(review.includes(`**${key}**`));
  }
});

test('ordinary ACE roles and orchestrator templates prohibit rectification and indirect fallback', (t) => {
  const { root, config } = fixture(t);
  execute(root, 'generate_ace_agents.js');
  const generator = require(path.join(root, 'ace', 'scripts', 'generate_ace_agents'));
  assert.deepEqual(Object.fromEntries(Object.entries(generator.ROLES)
    .map(([role, definition]) => [role, definition.delegates])), {
    reflector: ['curator'], curator: ['warden'], warden: [],
  });
  for (const role of ['reflector', 'curator', 'warden']) {
    const source = fs.readFileSync(path.join(root, 'ace', 'prompts', `${role}.md`), 'utf8');
    assert.match(source, /## Confine della rettifica esterna/);
    assert.match(source, /non invocare né delegare `rectify-playbook` o\s+`rectify_playbook.js`/);
    assert.match(source, /Non\s+riclassificare task, scoperte, richieste o batch del ciclo corrente/);
    for (const [platformName, platform] of Object.entries(config.platforms)) {
      const file = platformName === 'copilot' ? `ACE-${role}.agent.md` : `Ace-${role}.md`;
      const wrapper = fs.readFileSync(path.join(root, platform.agents_dir, file), 'utf8');
      assert.match(wrapper, /Never invoke or delegate rectify-playbook or rectify_playbook.js during normal ACE learning/);
      assert.match(wrapper, /by reclassifying current-cycle work, or as a fallback for gate failures/);
      assert.ok(!/^agents:.*rectif/m.test(wrapper));
    }
  }
  for (const file of ['orchestrator-inline.md', 'orchestrator-persona.md', 'mediated-ace-wrapper.md']) {
    const source = fs.readFileSync(path.join(root, 'ace', 'templates', file), 'utf8');
    assert.match(source, /Only a genuinely separate, explicit external correction request/);
    assert.match(source, /only when the user invokes the skill directly/);
    assert.match(source, /never invoke,\s+load or\s+forward it yourself or on another agent's behalf/);
    assert.doesNotMatch(source, /An external agent forwarding|return the separate handoff/);
    assert.match(source, /Never invoke or delegate the skill or correction script during normal ACE\s+learning/);
    assert.match(source, /Never reclassify task-internal\s+discoveries/);
    assert.match(source, /manual-invocation restrictions/);
  }
});

for (const mode of ['embedded', 'mediated']) {
  test(`normal ${mode} finalization never starts rectification, even at threshold or with missing traces`, (t) => {
    const { root, helper } = fixture(t, { mode });
    execute(root, 'generate_ace_agents.js');
    execute(root, 'retrieval.js');
    const thresholdFile = path.join(root, 'ace', 'config', 'thresholds.json');
    const thresholds = JSON.parse(fs.readFileSync(thresholdFile, 'utf8'));
    thresholds.reflector.threshold = 1;
    json(thresholdFile, thresholds);
    const candidate = request(root);
    reviewed(root, candidate.file);
    const auditDirectory = path.join(root, 'ace', 'state', 'rectifications');
    const auditsBefore = snapshot(auditDirectory);
    const taskId = 'ordinary-cycle';
    execute(root, 'prepare_delegation.js', ['--task-id', taskId, '--agent', 'worker', '--platform', 'copilot']);
    const traceFile = path.join(root, 'ordinary-trace.json');
    json(traceFile, {
      task_id: taskId, agent: 'worker', started_at: '2026-11-02T19:00:00Z',
      playbook_bullets_seen: ['P-009'], playbook_bullets_cited: ['P-009'],
      actions: [{ description: 'A synthetic ordinary task exposed the lesson defect.' }],
      outcome: { status: 'failure', evaluated_by: 'verified' }, friction: [],
    });
    const runtime = require(path.join(root, 'ace', 'scripts', 'lib', 'runtime'));
    runtime.captureTrace({
      manifestPath: path.join(runtime.runtimeStateDir(taskId), 'delegations', 'worker.json'),
      tracePath: traceFile,
    });
    const calls = [];
    const logged = [];
    const originalSpawn = childProcess.spawnSync;
    const originalLog = console.log;
    childProcess.spawnSync = (command, args, options) => {
      calls.push({ command, args });
      return originalSpawn(command, args, options);
    };
    console.log = (message) => logged.push(message);
    try {
      const finalizer = require(path.join(root, 'ace', 'scripts', 'finalize_task'));
      const state = finalizer.run(taskId);
      assert.deepEqual(calls.map((call) => path.basename(call.args[0])), [
        'update_counters.js', 'check_threshold.js',
      ]);
      assert.deepEqual(calls[1].args.slice(1), ['reflector']);
      assert.equal(JSON.parse(state.threshold).reached, true);
      assert.equal(JSON.parse(logged[0]).task_id, taskId);
      assert.deepEqual(JSON.parse(fs.readFileSync(
        path.join(runtime.runtimeStateDir(taskId), 'finalized.json'), 'utf8',
      )), state);
      assert.deepEqual(snapshot(auditDirectory), auditsBefore);
      const bullets = helper.parsePlaybookFile(fs.readFileSync(
        path.join(root, 'playbooks', 'worker.md'), 'utf8',
      )).bullets;
      assert.equal(bullets[0].content, OLD);
      assert.equal(bullets[0].hurt_confirmed, 2);

      const blockedTask = 'ordinary-missing-trace';
      execute(root, 'prepare_delegation.js', ['--task-id', blockedTask, '--agent', 'worker', '--platform', 'copilot']);
      calls.length = 0;
      assert.throws(() => finalizer.run(blockedTask), /trace/i);
      assert.deepEqual(calls, []);
      assert.deepEqual(snapshot(auditDirectory), auditsBefore);
    } finally {
      childProcess.spawnSync = originalSpawn;
      console.log = originalLog;
    }
  });
}

test('both installers and the updater require delivery of the runtime skill for enabled platforms', () => {
  for (const file of ['INSTALL_PROMPT_EMBEDDED.md', 'INSTALL_PROMPT_MEDIATED.md', 'UPDATE_PROMPT.md']) {
    const document = fs.readFileSync(path.join(KIT_ROOT, file), 'utf8');
    for (const required of [
      'TARGET_ROOT/ace/skills/rectify-playbook/', 'TARGET_ROOT/.github/skills/rectify-playbook/',
      'TARGET_ROOT/.claude/skills/rectify-playbook/', 'KIT_ROOT/.github/skills/rectify-playbook/',
      'rectify_playbook.js', 'node <TARGET_ROOT>/ace/scripts/generate_ace_agents.js',
      'disable-model-invocation: true', 'user-invocable: true',
      'source_paths', 'The skill is user-invocable only.',
    ]) {
      assert.ok(document.includes(required), `${file} must require ${required}`);
    }
    assert.doesNotMatch(document, /user- or agent-submitted|user or\s+agent corrections|explicitly submitted/);
  }
});
