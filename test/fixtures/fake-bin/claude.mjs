// Quando chamado pelo splitter (makeRealInvoker), o prompt chega via stdin.
// Quando chamado pelo executor, o prompt pode chegar via -p <arg>.
const args = process.argv.slice(2);
const pIdx = args.indexOf('-p');

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}

const prompt = pIdx !== -1 && args[pIdx + 1]
  ? args.slice(pIdx + 1).join(' ')   // executor: -p subtarefa 1 (pode ter espaços)
  : await readStdin();                 // splitter: prompt grande via stdin

if (prompt.includes('subtasks')) {
  process.stdout.write(JSON.stringify({
    subtasks: [
      { ai: 'claude', prompt: 'subtarefa 1', order: 1 },
      { ai: 'gemini', prompt: 'subtarefa 2', order: 2 },
    ],
  }) + '\n');
} else {
  process.stdout.write(`resposta do claude para: ${prompt}\n`);
}
