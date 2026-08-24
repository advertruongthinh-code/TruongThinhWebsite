import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const runnerPath = path.join(root, 'scripts', 'tooling', 'run-layout-motion-parity.mjs');

async function main() {
  const baseUrl = process.argv.find((value) => value.startsWith('http://127.0.0.1:')) ?? 'http://127.0.0.1:8787';
  const child = spawn(process.execPath, [runnerPath, '--full', '--resume', '--base-url', baseUrl], { cwd: root, stdio: 'inherit', windowsHide: true });
  child.on('error', (error) => { console.error(error.stack || error.message); process.exitCode = 1; });
  child.on('close', (code) => { process.exitCode = code ?? 1; });
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
