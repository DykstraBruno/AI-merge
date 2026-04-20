import { execSync } from 'node:child_process';
import os from 'node:os';

/** Catálogo de IAs suportadas com metadados e forma de invocação. */
export const SUPPORTED_AIS = {
  claude: {
    command: 'claude',
    role: 'general-purpose AI assistant',
    invoke(prompt) { return ['claude', ['-p', prompt]]; },
  },
  gemini: {
    command: 'gemini',
    role: 'Google multimodal AI assistant',
    invoke(prompt) { return ['gemini', ['-p', prompt]]; },
  },
  copilot: {
    command: 'gh',
    role: 'GitHub code completion assistant',
    invoke(prompt) { return ['gh', ['copilot', 'suggest', prompt]]; },
    subcheck: ['gh', 'copilot', '--help'],
  },
  cursor: {
    command: 'cursor-agent',
    role: 'editor-integrated AI coding assistant',
    invoke(prompt) { return ['cursor-agent', ['--prompt', prompt]]; },
  },
  codex: {
    command: 'codex',
    role: 'OpenAI code generation assistant',
    invoke(prompt) { return ['codex', ['-p', prompt]]; },
  },
};

/**
 * Cria o runner padrão que verifica a existência de um binário via `which` (Unix) ou `where` (Windows).
 * Retorna true se o comando existe no PATH, false caso contrário.
 */
function makeDefaultRunner() {
  const isWin = os.platform() === 'win32';
  return function run(cmd, args = []) {
    const checkCmd = args.length > 0
      ? `${cmd} ${args.join(' ')}`
      : `${isWin ? 'where' : 'which'} ${cmd}`;
    try {
      execSync(checkCmd, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  };
}

/**
 * Detecta quais IAs do catálogo estão disponíveis no sistema.
 * @param {((cmd: string, args?: string[]) => boolean) | undefined} runner
 *   Função de verificação injetável — útil em testes. Se omitida, usa execSync.
 * @returns {{ [nome: string]: object }} Subconjunto de SUPPORTED_AIS com as IAs encontradas.
 */
export function detectAvailableAIs(runner) {
  const run = runner ?? makeDefaultRunner();
  const available = {};

  for (const [name, config] of Object.entries(SUPPORTED_AIS)) {
    try {
      if (!run(config.command)) continue;
      if (config.subcheck) {
        const [cmd, ...args] = config.subcheck;
        if (!run(cmd, args)) continue;
      }
      available[name] = config;
    } catch {
      // erro inesperado = IA não disponível
    }
  }

  return available;
}
