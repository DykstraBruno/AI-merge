#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { detectAvailableAIs, SUPPORTED_AIS } from './core/detector.js';
import { splitPrompt } from './core/splitter.js';
import { executeParallel } from './core/executor.js';
import { aggregateResults } from './core/aggregator.js';

/**
 * Cria o invoker real: spawna a IA orquestradora e entrega o prompt via stdin.
 * Usar stdin (em vez de arg CLI) evita problemas de quoting no Windows com prompts grandes.
 */
function makeRealInvoker() {
  const isWin = process.platform === 'win32';
  return function invoker(_name, config, prompt) {
    // Usa config.command para obter só o nome do binário; o prompt vai via stdin
    return new Promise((resolve, reject) => {
      const proc = spawn(config.command, [], { shell: isWin });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', chunk => { stdout += chunk; });
      proc.stderr.on('data', chunk => { stderr += chunk; });
      proc.on('close', code => {
        if (code === 0) resolve(stdout);
        else reject(new Error(stderr.trim() || `exit ${code}`));
      });
      proc.on('error', reject);
      // Escreve o prompt no stdin e fecha para sinalizar EOF
      proc.stdin.write(prompt, 'utf8');
      proc.stdin.end();
    });
  };
}

/**
 * Ponto de entrada principal. Recebe argv para permitir testes sem afetar process.argv.
 */
export async function main(argv) {
  const program = new Command();

  program
    .name('aio')
    .argument('[prompt]', 'Prompt a ser dividido e executado pelas IAs')
    .option('--detect', 'Lista as IAs disponíveis no sistema')
    .option('-o, --output <arquivo>', 'Salva o resultado em arquivo em vez de stdout');

  program.parse(argv);

  const opts = program.opts();
  const [prompt] = program.args;

  try {
    const detectSpinner = ora('Detectando IAs...').start();
    const availableAIs = detectAvailableAIs();
    detectSpinner.stop();

    if (Object.keys(availableAIs).length === 0) {
      const supported = Object.keys(SUPPORTED_AIS).join(', ');
      console.error(chalk.red(`Nenhuma IA encontrada. IAs suportadas: ${supported}`));
      process.exit(1);
    }

    if (opts.detect) {
      console.log(chalk.bold('IAs disponíveis:'));
      for (const [name, cfg] of Object.entries(availableAIs)) {
        console.log(`  ${chalk.cyan(name)}: ${cfg.role}`);
      }
      return;
    }

    if (!prompt) {
      console.error(program.helpInformation());
      process.exit(1);
    }

    const splitSpinner = ora('Dividindo prompt...').start();
    const { subtasks } = await splitPrompt(prompt, availableAIs, makeRealInvoker());
    splitSpinner.stop();

    console.log(chalk.bold(`\nPlano: ${subtasks.length} subtarefas`));
    for (const st of subtasks) {
      const truncated = st.prompt.length > 40 ? st.prompt.slice(0, 40) + '...' : st.prompt;
      console.log(`  - [${st.order}] ${st.ai}: ${truncated}`);
    }

    const execSpinner = ora(`Executando ${subtasks.length} subtarefas em paralelo...`).start();
    const results = await executeParallel(subtasks, availableAIs);
    execSpinner.stop();

    const saida = aggregateResults(results);

    if (opts.output) {
      await writeFile(opts.output, saida, 'utf8');
      console.log(chalk.green(`Salvo em ${opts.output}`));
    } else {
      console.log(saida);
    }
  } catch (err) {
    console.error(chalk.red(`Erro: ${err.message}`));
    process.exit(1);
  }
}

// Executa diretamente apenas quando invocado como script principal
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv);
}
