#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  REPO_ROOT, SAFE_SCOPE_ID_RE, BULLET_HEADING_RE, loadProjectConfig,
  listPlaybookFiles, findAllBulletLocations, parsePlaybookFile,
  assertSafeWritePath, acquireMutationLock, atomicWrite, computeReviewStateHash,
} = require('./lib/playbook');
const retrieval = require('./retrieval');

const REVIEW_CHECKS = ['scope', 'contracts', 'conflicts', 'evidence', 'regressions'];
const AUDIT_DIR = path.join(REPO_ROOT, 'ace', 'state', 'rectifications');
const LIVE_STATE = 'ace/state/live-exclusions.json';
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const slash = (value) => value.replace(/\\/g, '/');
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;

function readFile(file) {
  const absolute = assertSafeWritePath(path.resolve(file));
  if (!fs.statSync(absolute).isFile()) throw new Error(`Expected a regular file: ${file}`);
  return fs.readFileSync(absolute, 'utf8');
}

function relativeFile(relative) {
  if (!nonempty(relative) || path.isAbsolute(relative)
      || relative.split(/[\\/]/).some((part) => part === '..')) {
    throw new Error(`Expected an explicit repository-relative file: ${relative}`);
  }
  return slash(path.relative(REPO_ROOT, assertSafeWritePath(path.resolve(REPO_ROOT, relative))));
}

function validateRequest(request) {
  const allowed = [
    'version', 'rectification_id', 'playbook', 'request_summary',
    'changes', 'context_files', 'evidence',
  ];
  if (!request || typeof request !== 'object' || Array.isArray(request)
      || Object.keys(request).some((key) => !allowed.includes(key))
      || request.version !== 1 || !SAFE_SCOPE_ID_RE.test(request.rectification_id || '')
      || !nonempty(request.playbook) || !nonempty(request.request_summary)
      || !Array.isArray(request.changes) || !request.changes.length
      || !Array.isArray(request.context_files) || !request.context_files.length
      || request.context_files.some((file) => !nonempty(file))
      || !Array.isArray(request.evidence) || request.evidence.some((item) => !nonempty(item))) {
    throw new Error('Invalid rectification request: explicit playbook, lesson IDs, changes, context files and request summary are required.');
  }
  const playbook = relativeFile(request.playbook);
  if (!listPlaybookFiles().map(slash).includes(playbook)) {
    throw new Error(`Not an existing live playbook: ${playbook}`);
  }
  const config = loadProjectConfig();
  const allowedPlaybooks = new Set([
    'playbooks/_global.md',
    ...[config.orchestrator_agent, ...config.participating_agents].map((agent) => `playbooks/${agent}.md`),
    ...Object.values(config.agent_families || {}).flat().map((family) => `playbooks/families/${family}.md`),
  ]);
  if (!allowedPlaybooks.has(playbook)) throw new Error(`Playbook scope is not configured: ${playbook}`);
  const ids = new Set();
  for (const change of request.changes) {
    if (!change || typeof change !== 'object' || Array.isArray(change)
        || Object.keys(change).some((key) => !['bullet_id', 'before', 'after', 'rationale'].includes(key))
        || !/^P-\d{3,}$/.test(change.bullet_id || '')
        || !nonempty(change.before) || !nonempty(change.after) || !nonempty(change.rationale)
        || change.before === change.after || ids.has(change.bullet_id)) {
      throw new Error('Every correction requires a unique explicit P-XXX ID, different before/after content, and rationale.');
    }
    if (change.after !== change.after.trim() || /\r/.test(change.after)
        || /^\s*(?:## P-\d+|tags:|counters:|provenance:|<!--)/m.test(change.after)) {
      throw new Error(`Replacement contains reserved playbook syntax or surrounding whitespace: ${change.bullet_id}`);
    }
    const locations = findAllBulletLocations(change.bullet_id);
    if (locations.length !== 1 || slash(locations[0].relPath) !== playbook
        || locations[0].status === 'deprecated') {
      throw new Error(`Lesson is missing, archived, ambiguous, or in a different playbook: ${change.bullet_id}`);
    }
    ids.add(change.bullet_id);
  }
  const contextFiles = request.context_files.map(relativeFile);
  if (new Set(contextFiles).size !== contextFiles.length || contextFiles.includes(playbook)) {
    throw new Error('Context files must be unique source files distinct from the target playbook.');
  }
  return { playbook, contextFiles };
}

function contextSnapshot(contextFiles) {
  return contextFiles.map((file) => ({
    path: file,
    // Generated ACE views are already bound through the reviewed playbooks.
    sha256: sha256(readFile(file).replace(/<!-- ACE:BEGIN[^\r\n]*-->[\s\S]*?<!-- ACE:END -->/g, '').trimEnd()),
  }));
}

function stateHash(playbook, contextFiles, remainingOnly = false) {
  return sha256(JSON.stringify({
    playbooks: computeReviewStateHash(remainingOnly ? [playbook, LIVE_STATE] : []),
    runtime_manifest: sha256(readFile(path.join('ace', 'runtime-version.json'))),
    context: contextSnapshot(contextFiles),
  }));
}

function inspectRequest(requestFile) {
  const raw = readFile(requestFile);
  const request = JSON.parse(raw);
  const { playbook, contextFiles } = validateRequest(request);
  const before = readFile(playbook);
  const parsed = parsePlaybookFile(before);
  for (const change of request.changes) {
    const matches = parsed.bullets.filter((item) => item.id === change.bullet_id);
    if (matches.length !== 1 || matches[0].content !== change.before) {
      throw new Error(`Expected before content does not match the current lesson: ${change.bullet_id}`);
    }
  }
  const { excluded } = retrieval.collectBullets();
  const plan = {
    rectification_id: request.rectification_id,
    request_sha256: sha256(JSON.stringify(request)),
    review_state_sha256: stateHash(playbook, contextFiles),
    playbook,
    changes: request.changes,
    context_files: contextSnapshot(contextFiles),
    evidence: request.evidence,
    excluded_targets: excluded.filter((item) => request.changes.some((change) => change.bullet_id === item.id)),
  };
  return { request, plan, before, contextFiles };
}

function validateReview(review, plan) {
  if (!review || review.verdict !== 'approve' || review.independent !== true
      || !nonempty(review.reviewer)
      || review.rectification_id !== plan.rectification_id
      || review.request_sha256 !== plan.request_sha256
      || review.review_state_sha256 !== plan.review_state_sha256
      || !Array.isArray(review.findings) || review.findings.length
      || !review.checks || REVIEW_CHECKS.some((key) => !nonempty(review.checks[key]))) {
    throw new Error('An approving independent review with every checklist result and matching request/state hashes is required.');
  }
}

function replaceLessons(before, request, appliedAt) {
  const eol = before.includes('\r\n') ? '\r\n' : '\n';
  const headings = [...before.matchAll(new RegExp(BULLET_HEADING_RE.source, 'gm'))];
  const changes = new Map(request.changes.map((change) => [change.bullet_id, change]));
  let after = before;
  for (let index = headings.length - 1; index >= 0; index -= 1) {
    const heading = headings[index];
    const change = changes.get(heading[1]);
    if (!change) continue;
    const start = heading.index;
    let end = headings[index + 1]?.index ?? before.length;
    const suffix = before.slice(start, end).search(/^[ \t]*<!--/m);
    if (suffix !== -1) end = start + suffix;
    let block = before.slice(start, end);
    const oldContent = change.before.replace(/\n/g, eol);
    const position = block.indexOf(oldContent, heading[0].length);
    if (position === -1 || block.indexOf(oldContent, position + oldContent.length) !== -1) {
      throw new Error(`Cannot locate an unambiguous lesson body: ${change.bullet_id}`);
    }
    block = block.slice(0, position) + change.after.replace(/\n/g, eol)
      + block.slice(position + oldContent.length);
    const provenance = `external_rectification=${request.rectification_id}; updated_at=${appliedAt}`;
    if (/^[ \t]*provenance:/m.test(block)) {
      block = block.replace(/^([ \t]*provenance:[^\r\n]*)/m, `$1; ${provenance}`);
    } else {
      block = `${block.trimEnd()}${eol}provenance: ${provenance}${eol}${eol}`;
    }
    after = after.slice(0, start) + block + after.slice(end);
  }
  const oldBullets = parsePlaybookFile(before).bullets;
  const newBullets = parsePlaybookFile(after).bullets;
  if (oldBullets.length !== newBullets.length || newBullets.some((bullet, index) => {
    const old = oldBullets[index];
    const change = changes.get(old.id);
    return JSON.stringify({ ...bullet, content: old.content, provenance: old.provenance }) !== JSON.stringify(old)
      || bullet.content !== (change ? change.after : old.content)
      || (!change && bullet.provenance !== old.provenance);
  })) throw new Error('Correction would change lesson structure or unrelated metadata.');
  return after;
}

function auditPath(id) {
  if (!SAFE_SCOPE_ID_RE.test(id || '')) throw new Error('An explicit safe rectification ID is required.');
  return assertSafeWritePath(path.join(AUDIT_DIR, `${id}.json`));
}

function pendingRecords() {
  assertSafeWritePath(AUDIT_DIR);
  if (!fs.existsSync(AUDIT_DIR)) return [];
  return fs.readdirSync(AUDIT_DIR).filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(readFile(path.join(AUDIT_DIR, file))))
    .filter((record) => record.status === 'applying');
}

function finish(record) {
  const { playbook, contextFiles } = validateRequest(record.request);
  validateReview(record.review, record.plan);
  if (record.playbook !== playbook || record.plan.playbook !== playbook
      || JSON.stringify(record.context_files) !== JSON.stringify(contextFiles)
      || sha256(JSON.stringify(record.request)) !== record.plan.request_sha256
      || JSON.stringify(record.plan.changes) !== JSON.stringify(record.request.changes)
      || record.plan.rectification_id !== record.rectification_id
      || replaceLessons(record.before, record.request, record.started_at) !== record.after) {
    throw new Error('Rectification audit does not match the reviewed request and recorded write.');
  }
  const current = readFile(record.playbook);
  if (current !== record.before && current !== record.after) {
    throw new Error('Target playbook changed during an incomplete rectification. Resolve the conflict before resuming.');
  }
  if (stateHash(record.playbook, record.context_files, true) !== record.remaining_state_sha256) {
    throw new Error('Other playbooks, configuration or review context changed. Do not resume without resolving the review-state conflict.');
  }
  if (current !== record.after) atomicWrite(path.join(REPO_ROOT, record.playbook), record.after);
  retrieval.run({ checkOnly: false, verbose: false });
  if (retrieval.run({ checkOnly: true, verbose: false }).length) {
    throw new Error('Generated ACE instructions are not synchronized after rectification.');
  }
  const { byScope, excluded } = retrieval.collectBullets();
  const served = new Map([...byScope.values()].flat().map((bullet) => [bullet.id, bullet.content]));
  for (const change of record.request.changes) {
    const wasExcluded = record.plan.excluded_targets.some((item) => item.id === change.bullet_id);
    if (wasExcluded ? !excluded.some((item) => item.id === change.bullet_id)
      : served.get(change.bullet_id) !== change.after) {
      throw new Error(`Unexpected lesson visibility after rectification: ${change.bullet_id}`);
    }
  }
  const completed = { ...record, status: 'completed', completed_at: new Date().toISOString() };
  atomicWrite(auditPath(record.rectification_id), `${JSON.stringify(completed, null, 2)}\n`);
  return {
    rectification_id: record.rectification_id,
    status: 'completed',
    playbook: record.playbook,
    lessons: record.request.changes.map((change) => change.bullet_id),
    excluded_targets: record.plan.excluded_targets,
    audit: slash(path.relative(REPO_ROOT, auditPath(record.rectification_id))),
  };
}

function apply(requestFile, reviewFile) {
  const release = acquireMutationLock('rectify_playbook');
  try {
    if (pendingRecords().length) throw new Error('An incomplete rectification must be resumed first with --resume <id>.');
    const { request, plan, before, contextFiles } = inspectRequest(requestFile);
    const review = JSON.parse(readFile(reviewFile));
    validateReview(review, plan);
    const target = auditPath(request.rectification_id);
    if (fs.existsSync(target)) throw new Error(`Rectification ID has already been used: ${request.rectification_id}`);
    const appliedAt = new Date().toISOString();
    const record = {
      rectification_id: request.rectification_id,
      status: 'applying',
      started_at: appliedAt,
      authorization: 'initial-submitted-request',
      request, plan, review,
      playbook: plan.playbook,
      context_files: contextFiles,
      remaining_state_sha256: stateHash(plan.playbook, contextFiles, true),
      before,
      after: replaceLessons(before, request, appliedAt),
    };
    atomicWrite(target, `${JSON.stringify(record, null, 2)}\n`);
    return finish(record);
  } finally {
    release();
  }
}

function resume(id) {
  const release = acquireMutationLock('rectify_playbook');
  try {
    const records = pendingRecords();
    if (records.length !== 1 || records[0].rectification_id !== id) {
      throw new Error('Resume requires the exact ID of the single incomplete rectification.');
    }
    return finish(records[0]);
  } finally {
    release();
  }
}

function run(args = process.argv.slice(2)) {
  const values = {};
  const flags = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (['--request', '--review', '--resume'].includes(arg)) {
      if (values[arg] || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing or duplicate value: ${arg}`);
      values[arg] = args[++index];
    } else if (['--check', '--apply'].includes(arg) && !flags.has(arg)) {
      flags.add(arg);
    } else throw new Error(`Unsupported or duplicate argument: ${arg}`);
  }
  let result;
  if (values['--resume'] && Object.keys(values).length === 1 && !flags.size) {
    result = resume(values['--resume']);
  } else if (values['--request'] && flags.size === 1 && flags.has('--check') && Object.keys(values).length === 1) {
    result = inspectRequest(values['--request']).plan;
  } else if (values['--request'] && values['--review'] && flags.size === 1 && flags.has('--apply') && Object.keys(values).length === 2) {
    result = apply(values['--request'], values['--review']);
  } else {
    throw new Error('Usage: rectify_playbook.js --request <file> --check | --request <file> --review <file> --apply | --resume <id>');
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    console.error(`ACE playbook rectification failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { REVIEW_CHECKS, inspectRequest, replaceLessons, run };
