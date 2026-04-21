import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { promisify } from 'node:util';
import { execFile as _execFile } from 'node:child_process';
import { chmodSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const execFile = promisify(_execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const FAKE_BIN  = resolve(ROOT, 'test/fixtures/fake-bin');
const OUT_FILE  = resolve(tmpdir(), 'aio-test-out.md');

/** Monta PATH com fake-bin na frente para que o detector encontre os fakes. */
function fakePath() {
  const sep = process.platform === 'win32' ? ';' : ':';
  return `${FAKE_BIN}${sep}${process.env.PATH}`;
}

/** Roda src/index.js como subprocesso com o fake PATH injetado. */
function run(args, extraEnv = {}) {
  return execFile(
    process.execPath,
    [resolve(ROOT, 'src/index.js'), ...args],
    { cwd: ROOT, env: { ...process.env, PATH: fakePath(), ...extraEnv } },
  );
}

before(() => {
  // chmodSync é multiplataforma; chmod (shell) não existe no Windows
  if (process.platform !== 'win32') {
    for (const f of ['claude', 'gemini']) {
      chmodSync(resolve(FAKE_BIN, f), 0o755);
    }
  }
});

after(() => {
  try { unlinkSync(OUT_FILE); } catch { /* arquivo pode não existir se o teste falhou */ }
});

// ─── testes ──────────────────────────────────────────────────────────────────

test('aio --detect lista claude e gemini', async () => {
  const { stdout } = await run(['--detect']);
  assert.ok(stdout.includes('claude'), 'stdout deve conter "claude"');
  assert.ok(stdout.includes('gemini'), 'stdout deve conter "gemini"');
});

test('aio "crie algo" roda fluxo completo', async () => {
  const { stdout } = await run(['"crie algo"']);
  assert.ok(stdout.includes('resposta do claude'), 'deve conter resposta do claude');
  assert.ok(stdout.includes('resposta do gemini'), 'deve conter resposta do gemini');
});

test('aio "crie algo" -o <arquivo> salva resultado em arquivo', async () => {
  const { stdout } = await run(['"crie algo"', '-o', OUT_FILE]);
  assert.ok(stdout.includes(`Salvo em`), 'deve confirmar salvamento');
  assert.ok(existsSync(OUT_FILE), 'arquivo de saída deve existir');

  const { readFile } = await import('node:fs/promises');
  const conteudo = await readFile(OUT_FILE, 'utf8');
  assert.ok(conteudo.includes('resposta do claude'), 'arquivo deve conter resposta do claude');
  assert.ok(conteudo.includes('resposta do gemini'), 'arquivo deve conter resposta do gemini');
});

test('sem nenhuma IA no PATH: exit code 1', async () => {
  const vazio = process.platform === 'win32' ? 'C:\\nonexistent-ai-merge' : '/nonexistent-ai-merge';
  const err = await run([], { PATH: vazio }).catch(e => e);
  assert.ok(err.code !== 0, `exit code deve ser != 0, foi ${err.code}`);
  const saida = (err.stderr ?? '') + (err.stdout ?? '');
  assert.ok(saida.length > 0, 'deve haver mensagem de erro');
});

test('sem argumento e sem --detect: exit 1 com ajuda', async () => {
  const err = await run([]).catch(e => e);
  assert.ok(err.code !== 0, 'deve sair com código != 0');
  const saida = (err.stderr ?? '') + (err.stdout ?? '');
  assert.ok(saida.includes('aio'), 'saída deve conter nome do comando');
});
