import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { runSubtask, executeParallel } from './executor.js';

// Para os testes de unidade, spawna `node` diretamente (sem shell) para evitar
// o DEP0190 que aparece quando shell:true recebe args em ambiente Windows.
const safeSpawner = (cmd, args, opts) => spawn(cmd, args, { ...opts, shell: false });

// Fixtures em .mjs rodam com `node` nativo — sem bash, sem chmod, funciona em Windows e Linux.
const availableAIs = {
  fast: { invoke: (p) => ['node', ['test/fixtures/fake-fast.mjs', p]] },
  slow: { invoke: (p) => ['node', ['test/fixtures/fake-slow.mjs', p]] },
  fail: { invoke: (p) => ['node', ['test/fixtures/fake-fail.mjs', p]] },
};

// ─── runSubtask ───────────────────────────────────────────────────────────────

test('runSubtask retorna output de CLI que funciona', async () => {
  const result = await runSubtask({ ai: 'fast', prompt: 'olá', order: 1 }, availableAIs, safeSpawner);
  assert.equal(result.ai, 'fast');
  assert.equal(result.order, 1);
  assert.equal(result.output, 'resposta rápida');
  assert.equal(result.error, null);
});

test('runSubtask retorna erro quando CLI falha', async () => {
  const result = await runSubtask({ ai: 'fail', prompt: 'olá', order: 1 }, availableAIs, safeSpawner);
  assert.equal(result.output, '');
  assert.ok(
    result.error.includes('algo deu errado') || result.error.includes('exit 1'),
    `erro inesperado: ${result.error}`,
  );
});

test('runSubtask com IA indisponível resolve com erro específico', async () => {
  const result = await runSubtask({ ai: 'inexistente', prompt: 'x', order: 1 }, {}, safeSpawner);
  assert.equal(result.output, '');
  assert.match(result.error, /inexistente/);
});

// ─── executeParallel ──────────────────────────────────────────────────────────

test('executeParallel roda em paralelo (não sequencial)', async () => {
  const subtasks = [
    { ai: 'slow', prompt: 'a', order: 1 },
    { ai: 'slow', prompt: 'b', order: 2 },
    { ai: 'slow', prompt: 'c', order: 3 },
  ];

  const start = performance.now();
  const results = await executeParallel(subtasks, availableAIs, safeSpawner);
  const elapsed = performance.now() - start;

  assert.equal(results.length, 3);
  // Sequencial seria ~3 × (startup node ~700ms + sleep 500ms) ≈ 3600ms.
  // Paralelo deve terminar bem abaixo disso; usamos 3000ms como limite seguro.
  assert.ok(elapsed < 3000, `esperado < 3000ms, mas levou ${elapsed.toFixed(0)}ms`);
});

test('executeParallel ordena por order', async () => {
  const subtasks = [
    { ai: 'fast', prompt: 'c', order: 3 },
    { ai: 'fast', prompt: 'a', order: 1 },
    { ai: 'fast', prompt: 'b', order: 2 },
  ];

  const results = await executeParallel(subtasks, availableAIs, safeSpawner);
  assert.deepEqual(results.map(r => r.order), [1, 2, 3]);
});

test('erro em uma subtarefa não derruba as outras', async () => {
  const subtasks = [
    { ai: 'fast', prompt: 'ok',  order: 1 },
    { ai: 'fail', prompt: 'err', order: 2 },
  ];

  const results = await executeParallel(subtasks, availableAIs, safeSpawner);
  assert.equal(results.length, 2);

  const fast = results.find(r => r.ai === 'fast');
  const fail = results.find(r => r.ai === 'fail');

  assert.equal(fast.output, 'resposta rápida');
  assert.equal(fast.error, null);
  assert.ok(fail.error, 'subtarefa com falha deve ter campo error preenchido');
  assert.equal(fail.output, '');
});
