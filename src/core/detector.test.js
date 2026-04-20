import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectAvailableAIs, SUPPORTED_AIS } from './detector.js';

/**
 * Constrói um runner fake injetável.
 * Chave para verificação de binário: o próprio nome do comando (ex: 'claude').
 * Chave para subcheck: comando + args concatenados (ex: 'gh copilot --help').
 */
function makeRunner(allowed) {
  return function run(cmd, args = []) {
    const key = args.length > 0 ? `${cmd} ${args.join(' ')}` : cmd;
    return allowed[key] === true;
  };
}

test('retorna objeto vazio quando nada está instalado', () => {
  const result = detectAvailableAIs(makeRunner({}));
  assert.deepEqual(result, {});
});

test('detecta apenas Claude quando só Claude existe', () => {
  const result = detectAvailableAIs(makeRunner({ claude: true }));
  assert.ok(result.claude, 'claude deve estar presente');
  assert.equal(result.gemini, undefined, 'gemini não deve estar presente');
});

test('respeita subcheck do Copilot — gh presente mas plugin ausente', () => {
  const result = detectAvailableAIs(makeRunner({
    gh: true,
    // 'gh copilot --help' ausente → subcheck falha
  }));
  assert.equal(result.copilot, undefined, 'copilot não deve estar presente sem o plugin');
});

test('inclui Copilot quando gh E subcheck passam', () => {
  const result = detectAvailableAIs(makeRunner({
    gh: true,
    'gh copilot --help': true,
  }));
  assert.ok(result.copilot, 'copilot deve estar presente quando gh e subcheck passam');
});

test('detecta múltiplas IAs simultaneamente', () => {
  const result = detectAvailableAIs(makeRunner({
    claude: true,
    gemini: true,
    codex: true,
  }));
  assert.ok(result.claude, 'claude deve estar presente');
  assert.ok(result.gemini, 'gemini deve estar presente');
  assert.ok(result.codex, 'codex deve estar presente');
  assert.equal(result.copilot, undefined);
  assert.equal(result.cursor, undefined);
});

test('SUPPORTED_AIS tem as 5 IAs esperadas', () => {
  const keys = Object.keys(SUPPORTED_AIS).sort();
  assert.deepEqual(keys, ['claude', 'codex', 'copilot', 'cursor', 'gemini']);
});

test('invoke retorna array [cmd, args[]] com o prompt', () => {
  const result = SUPPORTED_AIS.claude.invoke('oi');
  assert.ok(Array.isArray(result), 'deve ser array');
  assert.equal(result[0], 'claude');
  assert.ok(Array.isArray(result[1]), 'segundo elemento deve ser array de args');
  assert.ok(result[1].includes('oi'), 'args deve conter o prompt');
});
