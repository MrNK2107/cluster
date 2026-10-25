#!/usr/bin/env node
/**
 * Lightweight secret scanner. Runs on staged files from the pre-commit hook
 * and on the whole tree via `npm run check:secrets`.
 *
 *   node scripts/check-secrets.mjs            # scan tracked + untracked files
 *   node scripts/check-secrets.mjs --staged   # scan only staged files
 *   node scripts/check-secrets.mjs --history  # also scan every commit
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';

const PATTERNS = [
  { name: 'Supabase JWT (anon/service_role)', re: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: 'Supabase secret key', re: /sb_secret_[A-Za-z0-9_-]{10,}/g },
  { name: 'Supabase publishable key', re: /sb_publishable_[A-Za-z0-9_-]{10,}/g },
  { name: 'Supabase project URL', re: /https:\/\/[a-z0-9]{20}\.supabase\.co/g },
  { name: 'Postgres connection string', re: /postgres(?:ql)?:\/\/[^\s'"`]+:[^\s'"`]+@/g },
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
  { name: 'OpenAI / generic sk- key', re: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: 'Private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g },
  { name: 'Populated VITE_ secret env var', re: /^\s*VITE_[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)\s*=\s*\S+/gm },
];

const IGNORE_PATHS = [
  /^node_modules\//, /^dist\//, /^\.git\//, /package-lock\.json$/, /\.(png|jpg|jpeg|gif|webp|ico|woff2?|ttf|pdf)$/i,
  /^scripts\/check-secrets\.mjs$/,
];
const ALLOW_LINE = /#\s*secret-scan:ignore|\/\/\s*secret-scan:ignore/;

const args = new Set(process.argv.slice(2));
const git = (cmd) => execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

function listFiles() {
  if (args.has('--staged')) {
    return git('diff --cached --name-only --diff-filter=ACMR -z').split('\0').filter(Boolean);
  }
  return git('ls-files -co --exclude-standard -z').split('\0').filter(Boolean);
}

function scanText(text, label, findings) {
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (ALLOW_LINE.test(line)) return;
    for (const { name, re } of PATTERNS) {
      re.lastIndex = 0;
      const m = re.exec(line);
      if (m) {
        const sample = m[0].length > 14 ? `${m[0].slice(0, 6)}…${m[0].slice(-4)}` : m[0];
        findings.push(`${label}:${i + 1}  ${name}  (${sample})`);
      }
    }
  });
}

const findings = [];

for (const file of listFiles()) {
  if (IGNORE_PATHS.some((re) => re.test(file))) continue;
  if (!existsSync(file) || !statSync(file).isFile()) continue;
  let text;
  if (args.has('--staged')) {
    try {
      text = git(`show :${JSON.stringify(file)}`);
    } catch {
      continue;
    }
  } else {
    text = readFileSync(file, 'utf8');
  }
  scanText(text, file, findings);
}

if (args.has('--history')) {
  const commits = git('rev-list --all').split('\n').filter(Boolean);
  for (const sha of commits) {
    const files = git(`ls-tree -r --name-only ${sha}`).split('\n').filter(Boolean);
    for (const file of files) {
      if (IGNORE_PATHS.some((re) => re.test(file))) continue;
      let text;
      try {
        text = git(`show ${sha}:${JSON.stringify(file)}`);
      } catch {
        continue;
      }
      scanText(text, `${sha.slice(0, 7)}:${file}`, findings);
    }
  }
}

if (findings.length) {
  console.error('\n✖ Possible secrets found:\n');
  for (const f of findings) console.error(`  ${f}`);
  console.error('\nRemove the value, keep it in an untracked .env, or append `// secret-scan:ignore` to a known-safe line.\n');
  process.exit(1);
}
console.log('✓ No secrets detected');
