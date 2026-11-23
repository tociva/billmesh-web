#!/usr/bin/env node

import { readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const usage = `Usage:
  pnpm github:sync-environment -- <env-file> [--dry-run] [--repo OWNER/REPO]

The env file must contain GITHUB_ENVIRONMENT and one or more entries prefixed
with GITHUB_VAR_ or GITHUB_SECRET_. Prefixes are removed when values are
uploaded to the selected GitHub Environment.`;

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseArguments(argv) {
  let envFile;
  let repository;
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--') {
      continue;
    } else if (argument === '--dry-run') {
      dryRun = true;
    } else if (argument === '--repo') {
      repository = argv[index + 1];
      if (!repository) fail('--repo requires OWNER/REPO.');
      index += 1;
    } else if (argument === '--help' || argument === '-h') {
      console.log(usage);
      process.exit(0);
    } else if (argument.startsWith('-')) {
      fail(`unknown option: ${argument}`);
    } else if (envFile) {
      fail(`unexpected argument: ${argument}`);
    } else {
      envFile = argument;
    }
  }

  if (!envFile) {
    console.error(usage);
    process.exit(1);
  }
  if (repository && !/^[^/\s]+\/[^/\s]+$/.test(repository)) {
    fail('--repo must use the OWNER/REPO format.');
  }

  return { dryRun, envFile, repository };
}

function decodeValue(rawValue, lineNumber) {
  const value = rawValue.trim();
  if (!value.startsWith('"') && !value.startsWith("'")) return value;

  const quote = value[0];
  if (value.at(-1) !== quote) {
    fail(`unterminated quoted value on line ${lineNumber}.`);
  }

  if (quote === "'") return value.slice(1, -1);

  try {
    return JSON.parse(value);
  } catch {
    fail(`invalid double-quoted value on line ${lineNumber}.`);
  }
}

function parseEnvFile(path) {
  let contents;
  try {
    contents = readFileSync(path, 'utf8');
  } catch (error) {
    fail(`cannot read ${path}: ${error.message}`);
  }

  const entries = new Map();
  for (const [index, sourceLine] of contents.split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    const line = sourceLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = /^(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) fail(`invalid assignment on line ${lineNumber}.`);

    const [, name, rawValue] = match;
    if (entries.has(name))
      fail(`duplicate entry ${name} on line ${lineNumber}.`);
    entries.set(name, decodeValue(rawValue, lineNumber));
  }

  return entries;
}

function validateFilePermissions(path, entries) {
  const containsSecrets = [...entries.keys()].some((name) =>
    name.startsWith('GITHUB_SECRET_'),
  );
  if (!containsSecrets || process.platform === 'win32') return;

  const permissions = statSync(path).mode & 0o777;
  if ((permissions & 0o077) !== 0) {
    fail(
      `${path} contains secrets and must be private; run: chmod 600 ${path}`,
    );
  }
}

function buildPlan(entries) {
  const environment = entries.get('GITHUB_ENVIRONMENT');
  if (!environment) fail('GITHUB_ENVIRONMENT is required.');
  if (!/^[A-Za-z0-9._-]+$/.test(environment)) {
    fail(
      'GITHUB_ENVIRONMENT may contain only letters, numbers, periods, underscores, and hyphens.',
    );
  }

  const variables = [];
  const secrets = [];
  const uploadedNames = new Set();

  for (const [sourceName, value] of entries) {
    if (sourceName === 'GITHUB_ENVIRONMENT') continue;

    let kind;
    let name;
    if (sourceName.startsWith('GITHUB_VAR_')) {
      kind = variables;
      name = sourceName.slice('GITHUB_VAR_'.length);
    } else if (sourceName.startsWith('GITHUB_SECRET_')) {
      kind = secrets;
      name = sourceName.slice('GITHUB_SECRET_'.length);
    } else {
      fail(`${sourceName} must start with GITHUB_VAR_ or GITHUB_SECRET_.`);
    }

    if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) {
      fail(`${sourceName} produces an invalid GitHub name.`);
    }
    if (!value) fail(`${sourceName} must not be empty.`);
    if (uploadedNames.has(name)) fail(`${name} is declared more than once.`);

    uploadedNames.add(name);
    kind.push({ name, value });
  }

  if (variables.length + secrets.length === 0) {
    fail('the env file does not contain any variables or secrets.');
  }

  return { environment, secrets, variables };
}

function runGh(arguments_, input, repository) {
  const result = spawnSync('gh', arguments_, {
    encoding: 'utf8',
    env: repository ? { ...process.env, GH_REPO: repository } : process.env,
    input,
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  if (result.error?.code === 'ENOENT')
    fail('GitHub CLI (gh) is not installed.');
  if (result.error) fail(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const options = parseArguments(process.argv.slice(2));
const entries = parseEnvFile(options.envFile);
validateFilePermissions(options.envFile, entries);
const plan = buildPlan(entries);

console.log(`GitHub Environment: ${plan.environment}`);
if (options.repository) console.log(`Repository: ${options.repository}`);
console.log(
  `Variables: ${plan.variables.map(({ name }) => name).join(', ') || '(none)'}`,
);
console.log(
  `Secrets: ${plan.secrets.map(({ name }) => name).join(', ') || '(none)'}`,
);

if (options.dryRun) {
  console.log('Dry run complete; no GitHub values were changed.');
  process.exit(0);
}

console.log('Checking the target GitHub Environment...');
runGh(
  [
    'api',
    '--silent',
    `repos/{owner}/{repo}/environments/${encodeURIComponent(plan.environment)}`,
  ],
  undefined,
  options.repository,
);

for (const { name, value } of plan.variables) {
  console.log(`Uploading variable ${name}...`);
  runGh(
    ['variable', 'set', name, '--env', plan.environment],
    value,
    options.repository,
  );
}

for (const { name, value } of plan.secrets) {
  console.log(`Uploading secret ${name}...`);
  runGh(
    ['secret', 'set', name, '--env', plan.environment],
    value,
    options.repository,
  );
}

console.log(`Synchronized GitHub Environment ${plan.environment}.`);
