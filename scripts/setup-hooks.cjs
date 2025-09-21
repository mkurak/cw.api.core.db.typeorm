#!/usr/bin/env node
const { execSync } = require('node:child_process');

function isGitRepo() {
    try {
        execSync('git rev-parse --git-dir', { stdio: 'ignore' });
        return true;
    } catch (error) {
        return false;
    }
}

if (!isGitRepo()) {
    process.exit(0);
}

try {
    execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
    console.log('[cw.api.core.db.typeorm] Git hooks path configured to .githooks');
} catch (error) {
    console.warn('[cw.api.core.db.typeorm] Failed to configure git hooks path:', error.message);
}
