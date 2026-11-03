'use strict';

const fs = require('node:fs');
const path = require('node:path');

function copyRuntimeKit(kitRoot, targetRoot) {
  fs.cpSync(path.join(kitRoot, 'ace'), path.join(targetRoot, 'ace'), { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(kitRoot, 'ace', 'runtime-version.json'), 'utf8'));
  for (const [target, source] of Object.entries(manifest.source_paths || {})) {
    const destination = path.join(targetRoot, target);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(kitRoot, source), destination);
  }
}

module.exports = { copyRuntimeKit };
