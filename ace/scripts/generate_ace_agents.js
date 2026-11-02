#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  REPO_ROOT, loadProjectConfig, enabledPlatforms, assertSafeWritePath,
} = require('./lib/playbook');

const ROLES = {
  reflector: {
    description: 'Use when: process accumulated ACE traces in batch and produce evidence-backed proposals without editing playbooks.',
    delegates: ['curator'],
    guardrails: [
      'Read the complete trace batch and write only structured proposals.',
      'Never edit playbooks directly and delegate only when the configured threshold is reached.',
    ],
    cycle: 'Read the source prompt, update counters, process the complete batch, and write the proposal artifact.',
  },
  curator: {
    description: 'Use when: turn reflector proposals into typed playbook decisions without applying them.',
    delegates: ['warden'],
    guardrails: [
      'Work only from proposals and traceable evidence.',
      'Never edit playbooks or bypass the deterministic gate and human sign-off.',
    ],
    cycle: 'Read the source prompt, evaluate every proposal, and write typed decisions for the warden.',
  },
  warden: {
    description: 'Use when: run the ACE gate and apply approved decisions one explicit human-confirmed step at a time.',
    delegates: [],
    guardrails: [
      'Never sign or apply a playbook change without the required explicit human confirmation.',
      "If the question tool is unavailable in this delegated session, use the source persona's explicit orchestrator-mediated or asynchronous human confirmation; never simulate consent.",
    ],
    cycle: 'Read the source prompt, run the unsigned gate, present its result, request each confirmation, and verify every command output.',
  },
};

const SKILL_NAME = 'rectify-playbook';
const SKILL_SOURCE = `ace/skills/${SKILL_NAME}`;
const normalizedHash = (content) => crypto.createHash('sha256')
  .update(content.replace(/\r\n/g, '\n')).digest('hex');

function filesUnder(directory) {
  assertSafeWritePath(directory);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const file = assertSafeWritePath(path.join(directory, entry.name));
      if (entry.isSymbolicLink()) throw new Error(`Runtime skill contains a symbolic link: ${file}`);
      if (entry.isDirectory()) return filesUnder(file);
      if (!entry.isFile()) throw new Error(`Runtime skill asset is not a regular file: ${file}`);
      return [file];
    });
}

function runtimeSkillArtifacts(config) {
  const sourceFiles = filesUnder(path.join(REPO_ROOT, SKILL_SOURCE));
  if (!sourceFiles.some((file) => path.basename(file) === 'SKILL.md')) {
    throw new Error(`Missing canonical runtime skill: ${SKILL_SOURCE}/SKILL.md`);
  }
  return enabledPlatforms(config).flatMap((platform) => sourceFiles.map((file) => {
    const source = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
    const relative = path.relative(path.join(REPO_ROOT, SKILL_SOURCE), file);
    const target = path.join(platform.name === 'copilot' ? '.github' : '.claude', 'skills', SKILL_NAME, relative)
      .replace(/\\/g, '/');
    return { source, target, content: fs.readFileSync(file, 'utf8') };
  }));
}

function planRuntimeSkills(config) {
  const installedManifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'ace', 'runtime-version.json'), 'utf8'));
  const previous = installedManifest.ownership?.kit_owned || {};
  const artifacts = runtimeSkillArtifacts(config);
  const edits = [];
  for (const artifact of artifacts) {
    const target = assertSafeWritePath(path.join(REPO_ROOT, artifact.target));
    const current = readFileIfPresent(target);
    if (current === artifact.content) continue;
    if (current !== null && normalizedHash(current) !== normalizedHash(artifact.content)
        && normalizedHash(current) !== previous[artifact.source]) {
      throw new Error(`Runtime skill ownership/content conflict: ${artifact.target}. Resolve this exact file explicitly before generation.`);
    }
    edits.push({ target, content: artifact.content });
  }
  for (const platform of enabledPlatforms(config)) {
    const directory = path.join(REPO_ROOT, platform.name === 'copilot' ? '.github' : '.claude', 'skills', SKILL_NAME);
    for (const file of filesUnder(directory)) {
      const relative = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
      if (artifacts.some((artifact) => artifact.target === relative)) continue;
      const source = `${SKILL_SOURCE}/${path.relative(directory, file).replace(/\\/g, '/')}`;
      if (normalizedHash(fs.readFileSync(file, 'utf8')) !== previous[source]) {
        throw new Error(`Unowned or modified extra runtime skill asset: ${relative}. Preserve it until explicitly resolved.`);
      }
      edits.push({ target: file, content: null });
    }
  }
  return edits;
}

function relLink(fromFile, toFile) {
  let relative = path.relative(path.dirname(fromFile), toFile).replace(/\\/g, '/');
  if (!relative.startsWith('.')) relative = `./${relative}`;
  return relative;
}

function runtimeName(platform, role) {
  return `${platform.runtime_prefix}/ace/${role}`;
}

function targetFile(platformName, platform, role) {
  const file = platformName === 'copilot'
    ? `ACE-${role}.agent.md`
    : `Ace-${role}.md`;
  return path.join(REPO_ROOT, platform.agents_dir, file);
}

function readFileIfPresent(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function render(platformName, platform, role) {
  const definition = ROLES[role];
  const target = targetFile(platformName, platform, role);
  const source = path.join(REPO_ROOT, 'ace', 'prompts', `${role}.md`);
  const readInstruction = platformName === 'claude'
    ? 'use `Read` on the complete prompt'
    : 'use `view` or the runtime-compatible file-reading tool on the complete prompt';
  const delegates = definition.delegates.map((delegate) => runtimeName(platform, delegate));
  const lines = [
    '---',
    `name: ${JSON.stringify(runtimeName(platform, role))}`,
    `description: ${JSON.stringify(definition.description)}`,
  ];
  if (platform.model) lines.push(`model: ${JSON.stringify(platform.model)}`);
  lines.push(`tools: [${platform.tools[role].map((tool) => JSON.stringify(tool)).join(', ')}]`);
  if (delegates.length) lines.push(`agents: [${delegates.map((delegate) => JSON.stringify(delegate)).join(', ')}]`);
  lines.push('user-invocable: true', '---', '');
  lines.push(
    '<!-- Generated by ace/scripts/generate_ace_agents.js. Edit ace/prompts instead. -->',
    '',
    `- Source persona: [ace/prompts/${role}.md](${relLink(target, source)}); before acting, ${readInstruction}.`,
    '- The source persona owns the workflow, output contract, and gates. Do not duplicate or replace them here.',
    '',
    '## Non-delegable guardrails',
    '- Never invoke or delegate rectify-playbook or rectify_playbook.js during normal ACE learning, through another agent, by reclassifying current-cycle work, or as a fallback for gate failures, missing traces, weak evidence or unavailable tools. Report blockers and retain ordinary human checkpoints. Return a genuinely separate external request to the caller; obey the skill and harness manual-invocation restrictions.',
    ...definition.guardrails.map((item) => `- ${item}`),
    '',
    '## Minimum cycle',
    `1. ${definition.cycle}`,
    `2. Follow the complete source contract${delegates.length ? ` and use only these declared delegates: ${delegates.join(', ')}` : ''}.`,
    '3. Report actual results, blockers, and checks. Never simulate tools or outcomes.',
    '',
  );
  return lines.join('\n');
}

function run({ checkOnly = false } = {}) {
  const config = loadProjectConfig();
  const skillEdits = planRuntimeSkills(config);
  const changes = [];
  const enabled = enabledPlatforms(config);
  const enabledNames = new Set(enabled.map((platform) => platform.name));
  for (const [platformName, platform] of Object.entries(config.platforms || {})) {
    if (enabledNames.has(platformName)) continue;
    for (const role of Object.keys(ROLES)) {
      const target = targetFile(platformName, platform, role);
      const content = readFileIfPresent(target);
      if (content === null) continue;
      if (!content.includes('Generated by ace/scripts/generate_ace_agents.js')) continue;
      changes.push(path.relative(REPO_ROOT, target).replace(/\\/g, '/'));
      if (!checkOnly) fs.unlinkSync(target);
    }
  }
  for (const platform of enabled) {
    for (const role of Object.keys(ROLES)) {
      const target = targetFile(platform.name, platform, role);
      assertSafeWritePath(target);
      const content = render(platform.name, platform, role);
      const existing = readFileIfPresent(target);
      if (existing === content) continue;
      changes.push(path.relative(REPO_ROOT, target).replace(/\\/g, '/'));
      if (!checkOnly) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
      }
    }
    for (const edit of skillEdits) {
      changes.push(path.relative(REPO_ROOT, edit.target).replace(/\\/g, '/'));
      if (checkOnly) continue;
      if (edit.content === null) fs.unlinkSync(edit.target);
      else {
        fs.mkdirSync(path.dirname(edit.target), { recursive: true });
        fs.writeFileSync(edit.target, edit.content);
      }
    }
  }
  console.log(changes.length
    ? `${checkOnly ? 'Would change' : 'Generated'}: ${changes.join(', ')}`
    : 'No ACE wrapper or runtime skill changes required.');
  return changes;
}

if (require.main === module) {
  try {
    const checkOnly = process.argv.includes('--check');
    const changes = run({ checkOnly });
    if (checkOnly && changes.length) process.exitCode = 1;
  } catch (error) {
    console.error(`ACE wrapper generation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  ROLES, runtimeName, render, run, runtimeSkillArtifacts, SKILL_NAME, SKILL_SOURCE,
};
