await new Promise(r => setTimeout(r, 500));
process.stdout.write('resposta lenta\n');
process.exit(0);
