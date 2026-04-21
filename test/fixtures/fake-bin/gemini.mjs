const args = process.argv.slice(2);
const pIdx = args.indexOf('-p');

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}

const prompt = pIdx !== -1 && args[pIdx + 1]
  ? args.slice(pIdx + 1).join(' ')
  : await readStdin();

process.stdout.write(`resposta do gemini para: ${prompt}\n`);
