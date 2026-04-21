import { spawn } from 'node:child_process';

/**
 * Executa uma subtarefa spawando o binário da IA correspondente.
 * Nunca rejeita — erros são capturados e devolvidos no campo `error`.
 *
 * @param {{ ai: string, prompt: string, order: number }} subtask
 * @param {Object} availableAIs - Mapa nome→config com método invoke(prompt).
 * @param {typeof spawn} spawner - Injetável para testes; padrão é spawn do Node.
 * @returns {Promise<{ ai: string, order: number, output: string, error: string|null }>}
 */
export function runSubtask(subtask, availableAIs, spawner = spawn) {
  const { ai, order, prompt } = subtask;

  // IA não cadastrada: resolve imediatamente com erro descritivo
  if (!(ai in availableAIs)) {
    return Promise.resolve({ ai, order, output: '', error: `IA "${ai}" não disponível.` });
  }

  const config = availableAIs[ai];
  const [cmd, args] = config.invoke(prompt);

  return new Promise((resolve) => {
    // No Windows, shell:true é necessário para encontrar wrappers .cmd no PATH
    const proc = spawner(cmd, args, { shell: process.platform === 'win32' });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', chunk => { stdout += chunk; });
    proc.stderr.on('data', chunk => { stderr += chunk; });

    proc.on('close', code => {
      if (code === 0) {
        resolve({ ai, order, output: stdout.trim(), error: null });
      } else {
        resolve({ ai, order, output: '', error: stderr.trim() || `exit ${code}` });
      }
    });

    // Erro de spawn (binário não encontrado, permissão negada, etc.)
    proc.on('error', err => {
      resolve({ ai, order, output: '', error: err.message });
    });
  });
}

/**
 * Executa todas as subtarefas em paralelo e retorna os resultados ordenados por `order` (asc).
 *
 * @param {Array<{ ai: string, prompt: string, order: number }>} subtasks
 * @param {Object} availableAIs
 * @param {typeof spawn} spawner
 * @returns {Promise<Array<{ ai: string, order: number, output: string, error: string|null }>>}
 */
export async function executeParallel(subtasks, availableAIs, spawner = spawn) {
  const results = await Promise.all(
    subtasks.map(subtask => runSubtask(subtask, availableAIs, spawner)),
  );

  // Garante ordem determinística na saída independentemente da conclusão
  return results.sort((a, b) => a.order - b.order);
}
