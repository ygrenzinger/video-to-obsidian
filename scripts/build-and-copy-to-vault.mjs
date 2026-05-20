import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const PROJECT_ROOT = resolve(new URL('..', import.meta.url).pathname);
const ENV_PATH = join(PROJECT_ROOT, '.env');
const RELEASE_FILES = ['main.js', 'manifest.json', 'styles.css'];

async function main() {
  const env = await readEnvFile(ENV_PATH);
  const vaultDir = env.OBSIDIAN_VAULT_DIR?.trim();
  const pluginId = env.OBSIDIAN_PLUGIN_ID?.trim() || 'video-to-obsidian';

  if (!vaultDir) {
    throw new Error('Missing OBSIDIAN_VAULT_DIR in .env.');
  }

  await assertVault(vaultDir);
  await run('pnpm', ['run', 'build']);

  const pluginDir = join(vaultDir, '.obsidian', 'plugins', pluginId);
  await mkdir(pluginDir, { recursive: true });

  for (const file of RELEASE_FILES) {
    await copyFile(join(PROJECT_ROOT, file), join(pluginDir, file));
  }

  console.log(`Copied ${RELEASE_FILES.join(', ')} to ${pluginDir}`);
}

async function readEnvFile(path) {
  const content = await readFile(path, 'utf8').catch((error) => {
    if (error && error.code === 'ENOENT') {
      throw new Error('Missing .env file. Copy .env.example to .env and set OBSIDIAN_VAULT_DIR.');
    }

    throw error;
  });

  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    env[key] = unquote(rawValue);
  }

  return env;
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

async function assertVault(vaultDir) {
  const vaultStats = await stat(vaultDir).catch(() => null);
  if (!vaultStats?.isDirectory()) {
    throw new Error(`OBSIDIAN_VAULT_DIR is not a directory: ${vaultDir}`);
  }

  const obsidianDir = join(vaultDir, '.obsidian');
  if (!existsSync(obsidianDir)) {
    throw new Error(`OBSIDIAN_VAULT_DIR is not an Obsidian vault: missing ${obsidianDir}`);
  }
}

function run(command, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    child.on('error', rejectRun);
    child.on('exit', (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
