import { test } from 'node:test';
import assert from 'node:assert/strict';
import chalk from 'chalk';
import { aggregateResults } from './aggregator.js';

// Desliga todos os códigos ANSI para que as asserções comparem texto puro.
chalk.level = 0;

// ─── testes ──────────────────────────────────────────────────────────────────

test('array vazio retorna string vazia', () => {
  assert.equal(aggregateResults([]), '');
});

test('resultado sem erro inclui o output e o cabeçalho com order e ai em uppercase', () => {
  const result = aggregateResults([{ ai: 'claude', order: 1, output: 'resposta ok', error: null }]);
  assert.ok(result.includes('[1]'),        'deve conter o order');
  assert.ok(result.includes('CLAUDE'),     'ai deve estar em uppercase');
  assert.ok(result.includes('resposta ok'), 'deve conter o output');
  assert.ok(!result.includes('Erro'),      'não deve conter "Erro"');
});

test('resultado com erro inclui "⚠" e a mensagem de erro, não inclui output', () => {
  const result = aggregateResults([
    { ai: 'gemini', order: 2, output: 'ignorado', error: 'timeout na chamada' },
  ]);
  assert.ok(result.includes('⚠'),                   'deve conter o ícone de aviso');
  assert.ok(result.includes('timeout na chamada'),   'deve conter a mensagem de erro');
  assert.ok(!result.includes('ignorado'),            'output não deve aparecer quando há erro');
});

test('múltiplos resultados aparecem na ordem em que foram passados', () => {
  const results = [
    { ai: 'codex',  order: 3, output: 'saída codex',  error: null },
    { ai: 'claude', order: 1, output: 'saída claude', error: null },
    { ai: 'gemini', order: 2, output: 'saída gemini', error: null },
  ];
  const output = aggregateResults(results);
  const posCodex  = output.indexOf('CODEX');
  const posClaude = output.indexOf('CLAUDE');
  const posGemini = output.indexOf('GEMINI');

  // Deve respeitar a ordem do array (3, 1, 2) — não reordena por order
  assert.ok(posCodex < posClaude, 'CODEX deve aparecer antes de CLAUDE');
  assert.ok(posClaude < posGemini, 'CLAUDE deve aparecer antes de GEMINI');
});

test('mistura de sucesso e erro funciona', () => {
  const results = [
    { ai: 'claude', order: 1, output: 'tudo certo',  error: null },
    { ai: 'copilot', order: 2, output: '',           error: 'exit 1' },
  ];
  const output = aggregateResults(results);

  assert.ok(output.includes('CLAUDE'),      'deve conter claude');
  assert.ok(output.includes('tudo certo'),  'deve conter output do sucesso');
  assert.ok(output.includes('COPILOT'),     'deve conter copilot');
  assert.ok(output.includes('⚠'),           'deve conter ícone de erro');
  assert.ok(output.includes('exit 1'),      'deve conter mensagem de erro');
});
