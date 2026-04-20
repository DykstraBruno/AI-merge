import chalk from 'chalk';

/**
 * Agrega os resultados de múltiplas subtarefas em uma string formatada para exibição.
 * A ordem de exibição segue exatamente a ordem do array recebido — reordenação é
 * responsabilidade do executor.
 *
 * @param {Array<{ ai: string, order: number, output: string, error: string|null }>} results
 * @returns {string}
 */
export function aggregateResults(results) {
  if (results.length === 0) return '';

  return results.map(({ ai, order, output, error }) => {
    const header = chalk.bold.cyan(`\n═══ [${order}] ${ai.toUpperCase()} ═══\n`);
    const body = error
      ? chalk.red(`⚠  Erro: ${error}`)
      : output;

    return header + body;
  }).join('\n');
}
