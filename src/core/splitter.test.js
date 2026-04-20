import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSplitterPrompt, extractJSON, splitPrompt } from './splitter.js';
import { SUPPORTED_AIS } from './detector.js';

// Configs mock minimalistas reutilizando roles reais do catálogo
const mockClaude  = { role: SUPPORTED_AIS.claude.role,  invoke: () => [] };
const mockGemini  = { role: SUPPORTED_AIS.gemini.role,  invoke: () => [] };
const mockCodex   = { role: SUPPORTED_AIS.codex.role,   invoke: () => [] };
const mockCopilot = { role: SUPPORTED_AIS.copilot.role, invoke: () => [] };

/** Cria um invoker fake que retorna a string fornecida, ignorando os argumentos. */
function fakeInvoker(responseText) {
  return async (_name, _config, _prompt) => responseText;
}

/** JSON válido de subtarefas para reusar nos testes. */
function validSubtasksJSON(aiName = 'claude') {
  return JSON.stringify({ subtasks: [{ ai: aiName, prompt: 'faça algo', order: 1 }] });
}

// ─── buildSplitterPrompt ──────────────────────────────────────────────────────

test('buildSplitterPrompt inclui o prompt do usuário e a lista de IAs', () => {
  const ais = { claude: mockClaude, gemini: mockGemini };
  const result = buildSplitterPrompt('escreva testes', ais);

  assert.ok(result.includes('escreva testes'), 'deve conter o prompt do usuário');
  assert.ok(result.includes('- claude:'), 'deve listar claude');
  assert.ok(result.includes('- gemini:'), 'deve listar gemini');
  assert.ok(result.includes('"subtasks"'), 'deve descrever o formato JSON esperado');
});

// ─── extractJSON ─────────────────────────────────────────────────────────────

test('extractJSON parseia JSON puro', () => {
  const input = '{"subtasks":[{"ai":"claude","prompt":"x","order":1}]}';
  const result = extractJSON(input);
  assert.equal(result.subtasks[0].ai, 'claude');
});

test('extractJSON parseia JSON dentro de fences ```json', () => {
  const input = '```json\n{"subtasks":[{"ai":"gemini","prompt":"y","order":1}]}\n```';
  const result = extractJSON(input);
  assert.equal(result.subtasks[0].ai, 'gemini');
});

test('extractJSON parseia JSON com texto antes e depois', () => {
  const input = 'Aqui vai: {"subtasks":[{"ai":"codex","prompt":"z","order":1}]} ok?';
  const result = extractJSON(input);
  assert.equal(result.subtasks[0].ai, 'codex');
});

test('extractJSON lança erro em texto sem JSON', () => {
  assert.throws(
    () => extractJSON('sem nada aqui'),
    /Nenhum JSON encontrado/,
  );
});

// ─── splitPrompt ─────────────────────────────────────────────────────────────

test('splitPrompt escolhe Claude quando disponível', async () => {
  const ais = { claude: mockClaude, gemini: mockGemini };
  const result = await splitPrompt('tarefa', ais, fakeInvoker(validSubtasksJSON('claude')));
  assert.equal(result.orchestrator, 'claude');
});

test('splitPrompt cai para Gemini se Claude não estiver disponível', async () => {
  const ais = { gemini: mockGemini, codex: mockCodex };
  const result = await splitPrompt('tarefa', ais, fakeInvoker(validSubtasksJSON('gemini')));
  assert.equal(result.orchestrator, 'gemini');
});

test('splitPrompt lança erro quando availableAIs está vazio', async () => {
  await assert.rejects(
    () => splitPrompt('tarefa', {}, fakeInvoker('')),
    /Nenhuma IA disponível para atuar como orquestradora/,
  );
});

test('splitPrompt redireciona subtarefa apontando para IA indisponível', async () => {
  // Só claude e gemini disponíveis; invoker devolve subtask com "ai": "copilot"
  const ais = { claude: mockClaude, gemini: mockGemini };
  const response = JSON.stringify({
    subtasks: [{ ai: 'copilot', prompt: 'revisar PR', order: 1 }],
  });
  const result = await splitPrompt('tarefa', ais, fakeInvoker(response));

  assert.equal(result.subtasks[0].ai, 'claude', 'deve redirecionar para o orquestrador');
});

test('splitPrompt lança erro se resposta não tem subtasks array', async () => {
  const ais = { claude: mockClaude };
  const badJSON = JSON.stringify({ resultado: 'algo errado' });

  await assert.rejects(
    () => splitPrompt('tarefa', ais, fakeInvoker(badJSON)),
    /Formato de subtarefas inválido/,
  );
});
