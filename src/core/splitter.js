/** Ordem de preferência para escolha do orquestrador. */
const ORCHESTRATOR_PRIORITY = ['claude', 'gemini', 'codex', 'copilot', 'cursor'];

/**
 * Monta o prompt que instrui a IA orquestradora a dividir a tarefa do usuário
 * em subtarefas independentes, retornando JSON estrito.
 */
export function buildSplitterPrompt(userPrompt, availableAIs) {
  const aiList = Object.entries(availableAIs)
    .map(([name, cfg]) => `- ${name}: ${cfg.role}`)
    .join('\n');

  const maxSubtasks = Object.keys(availableAIs).length;

  return `Você é um orquestrador de IAs. Divida a tarefa abaixo em subtarefas independentes e autossuficientes, \
atribuindo cada uma à IA mais adequada da lista.

IAs disponíveis:
${aiList}

Tarefa do usuário:
"""
${userPrompt}
"""

Regras:
- Cada subtarefa deve ser completamente autossuficiente (contexto próprio, sem depender de outra).
- O campo "ai" deve ser exatamente um dos nomes listados acima.
- Máximo de ${maxSubtasks} subtarefas.
- Se a tarefa não valer a pena dividir, retorne uma única subtarefa.
- Responda APENAS com JSON estrito, sem texto adicional, no formato:
{ "subtasks": [ { "ai": "nome", "prompt": "...", "order": 1 } ] }`;
}

/**
 * Extrai e faz parse do primeiro objeto JSON encontrado em `text`.
 * Tolera fences ```json...``` e texto antes/depois do JSON.
 * Lança Error se nenhum JSON válido for encontrado.
 */
export function extractJSON(text) {
  // Remove fences ```json ... ``` ou ``` ... ```
  const stripped = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();

  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    throw new Error('Nenhum JSON encontrado na resposta da IA.');
  }

  const candidate = stripped.slice(start, end + 1);

  try {
    return JSON.parse(candidate);
  } catch (cause) {
    throw new Error(`JSON inválido na resposta da IA: ${cause.message}`);
  }
}

/**
 * Divide o prompt do usuário em subtarefas usando uma IA orquestradora.
 *
 * @param {string} userPrompt - Tarefa original do usuário.
 * @param {Object} availableAIs - Mapa nome→config das IAs detectadas.
 * @param {(name: string, config: Object, prompt: string) => Promise<string>} invoker
 *   Função injetável que chama a IA e retorna a resposta bruta como string.
 * @returns {Promise<{ orchestrator: string, subtasks: Array }>}
 */
export async function splitPrompt(userPrompt, availableAIs, invoker) {
  // Escolhe a primeira IA da ordem de preferência que esteja disponível
  const orchestratorName = ORCHESTRATOR_PRIORITY.find(name => name in availableAIs);

  if (!orchestratorName) {
    throw new Error('Nenhuma IA disponível para atuar como orquestradora.');
  }

  const orchestratorConfig = availableAIs[orchestratorName];
  const splitterPrompt = buildSplitterPrompt(userPrompt, availableAIs);

  const rawResponse = await invoker(orchestratorName, orchestratorConfig, splitterPrompt);

  const parsed = extractJSON(rawResponse);

  if (!Array.isArray(parsed.subtasks) || parsed.subtasks.length === 0) {
    throw new Error('Formato de subtarefas inválido.');
  }

  // Redireciona subtarefas que apontem para IAs indisponíveis
  const subtasks = parsed.subtasks.map(subtask => {
    if (!(subtask.ai in availableAIs)) {
      return { ...subtask, ai: orchestratorName };
    }
    return subtask;
  });

  return { orchestrator: orchestratorName, subtasks };
}
