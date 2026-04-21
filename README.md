# AI-merge (`aio`)

A command-line orchestrator that splits a prompt across multiple AI tools available on your system, runs the subtasks in parallel, and aggregates the results into a unified output.

```
aio "write unit tests and document the following function: ..."
```

```
Plan: 2 subtasks
  - [1] claude: write unit tests for the function...
  - [2] gemini: document the function in JSDoc format...

═══ [1] CLAUDE ═══
describe('myFunction', () => { ... })

═══ [2] GEMINI ═══
/**
 * @param {string} input ...
 */
```

---

## How it works

```
user prompt
      │
      ▼
┌─────────────┐    detects binaries     ┌──────────────────┐
│  detector   │ ──────────────────────► │  available AIs   │
└─────────────┘   which/where in PATH   └──────────────────┘
                                                │
      ┌─────────────────────────────────────────┘
      ▼
┌─────────────┐    prompt → orchestrator AI     ┌────────────┐
│  splitter   │ ────────────────────────────►  │  claude /  │
│             │ ◄──────────────────────────────  │  gemini /  │
│             │    JSON: [ {ai, prompt, order} ] │  ...       │
└─────────────┘                                 └────────────┘
      │
      │  subtasks
      ▼
┌─────────────┐    parallel spawn per subtask
│  executor   │ ──────────────────────────────── AI₁ ──► result₁
│             │ ──────────────────────────────── AI₂ ──► result₂
└─────────────┘
      │
      ▼
┌─────────────┐
│ aggregator  │   formats and joins the results
└─────────────┘
      │
      ▼
   stdout / file
```

### 4-step pipeline

| Step | Module | What it does |
|---|---|---|
| **1. Detection** | `detector.js` | Scans PATH with `which`/`where` to find which AI CLIs are installed |
| **2. Splitting** | `splitter.js` | Sends the prompt to the orchestrator AI (first available in priority order) and requests a JSON plan with subtasks |
| **3. Execution** | `executor.js` | Spawns all subtasks in parallel via `Promise.all`, capturing stdout/stderr from each process |
| **4. Aggregation** | `aggregator.js` | Formats results with colored headers and joins them into a final string |

### Orchestrator priority order

```
claude → gemini → codex → copilot → cursor
```

The first AI in this list that is available takes the orchestrator role (splits the prompt). The rest execute the subtasks.

---

## Supported AIs

| Name | Expected binary in PATH | Specialty |
|---|---|---|
| `claude` | `claude` | General-purpose assistant |
| `gemini` | `gemini` | Google multimodal AI |
| `copilot` | `gh` + `gh copilot` plugin | GitHub code completion |
| `cursor` | `cursor-agent` | Editor-integrated assistant |
| `codex` | `codex` | OpenAI code generation |

---

## Installation

### Prerequisites

- Node.js 18 or higher
- At least one of the supported AIs installed and authenticated in your terminal

### Install `aio`

```bash
git clone <repository>
cd AI-merge
npm install
npm link          # makes the `aio` command available globally
```

> **Windows:** if `aio` does not appear in PowerShell after `npm link`, use `node src/index.js` instead of `aio`.

### Install AIs (examples)

```bash
# Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Gemini CLI
npm install -g @google/gemini-cli

# GitHub Copilot (requires gh to be installed)
gh extension install github/gh-copilot
```

---

## Usage

```bash
# List which AIs were detected on the system
aio --detect

# Run a prompt
aio "refactor this code to use async/await"

# Save result to a file
aio "write tests and documentation for module X" -o result.md

# Help
aio --help
```

---

## Architecture

```
AI-merge/
├── src/
│   ├── index.js              # CLI (commander) — entry point
│   └── core/
│       ├── detector.js       # detectAvailableAIs(), SUPPORTED_AIS
│       ├── splitter.js       # buildSplitterPrompt(), splitPrompt()
│       ├── executor.js       # runSubtask(), executeParallel()
│       └── aggregator.js     # aggregateResults()
├── test/
│   ├── integration.test.js   # end-to-end tests with a real subprocess
│   └── fixtures/
│       ├── fake-bin/         # fake AI CLIs for integration tests
│       │   ├── claude.mjs    # returns subtask JSON or a simple response
│       │   ├── claude.cmd    # Windows wrapper
│       │   ├── gemini.mjs
│       │   └── gemini.cmd
│       ├── fake-fast.mjs     # process that exits quickly (exit 0)
│       ├── fake-slow.mjs     # slow process 500ms (tests parallelism)
│       └── fake-fail.mjs     # process that fails (exit 1)
└── package.json
```

Each module is independently testable via dependency injection (`runner`, `spawner`, `invoker`). Tests run with `node --test` — no external frameworks required.

---

## Tests

```bash
# Unit tests
node --test src/core/detector.test.js
node --test src/core/splitter.test.js
node --test src/core/executor.test.js
node --test src/core/aggregator.test.js

# Integration tests (require Node.js in PATH)
node --test test/integration.test.js
```

---

---

# AI-merge (`aio`) — Português

Orquestrador de linha de comando que divide um prompt entre múltiplas IAs disponíveis no sistema, executa as subtarefas em paralelo e agrega os resultados numa saída unificada.

```
aio "crie testes unitários e documente a função abaixo: ..."
```

```
Plano: 2 subtarefas
  - [1] claude: crie testes unitários para a função...
  - [2] gemini: documente a função em formato JSDoc...

═══ [1] CLAUDE ═══
describe('minhaFuncao', () => { ... })

═══ [2] GEMINI ═══
/**
 * @param {string} input ...
 */
```

---

## Como funciona

```
prompt do usuário
      │
      ▼
┌─────────────┐     detecta binários    ┌──────────────────┐
│  detector   │ ──────────────────────► │  IAs disponíveis │
└─────────────┘   which/where no PATH   └──────────────────┘
                                                │
      ┌─────────────────────────────────────────┘
      ▼
┌─────────────┐    prompt → IA orquestradora    ┌────────────┐
│  splitter   │ ────────────────────────────►  │  claude /  │
│             │ ◄──────────────────────────────  │  gemini /  │
│             │    JSON: [ {ai, prompt, order} ] │  ...       │
└─────────────┘                                 └────────────┘
      │
      │  subtarefas
      ▼
┌─────────────┐    spawn paralelo por subtarefa
│  executor   │ ──────────────────────────────── IA₁ ──► resultado₁
│             │ ──────────────────────────────── IA₂ ──► resultado₂
└─────────────┘
      │
      ▼
┌─────────────┐
│ aggregator  │   formata e junta os resultados
└─────────────┘
      │
      ▼
   stdout / arquivo
```

### Pipeline em 4 etapas

| Etapa | Módulo | O que faz |
|---|---|---|
| **1. Detecção** | `detector.js` | Varre o PATH com `which`/`where` para encontrar quais CLIs de IA estão instaladas |
| **2. Divisão** | `splitter.js` | Envia o prompt para a IA orquestradora (primeira disponível na ordem de preferência) e pede um plano JSON com subtarefas |
| **3. Execução** | `executor.js` | Spawna todas as subtarefas em paralelo via `Promise.all`, captura stdout/stderr de cada processo |
| **4. Agregação** | `aggregator.js` | Formata os resultados com cabeçalhos coloridos e junta numa string final |

### Ordem de preferência do orquestrador

```
claude → gemini → codex → copilot → cursor
```

A primeira IA dessa lista que estiver disponível assume o papel de orquestrador (divide o prompt). As demais executam as subtarefas.

---

## IAs suportadas

| Nome | Binário esperado no PATH | Especialidade |
|---|---|---|
| `claude` | `claude` | Assistente geral |
| `gemini` | `gemini` | Multimodal Google |
| `copilot` | `gh` + plugin `gh copilot` | Completação de código GitHub |
| `cursor` | `cursor-agent` | Editor integrado |
| `codex` | `codex` | Geração de código OpenAI |

---

## Instalação

### Pré-requisitos

- Node.js 18 ou superior
- Ao menos uma das IAs acima instalada e autenticada no terminal

### Instalar o `aio`

```bash
git clone <repositório>
cd AI-merge
npm install
npm link          # torna o comando `aio` disponível globalmente
```

> **Windows:** se `aio` não aparecer no PowerShell após `npm link`, use `node src/index.js` no lugar de `aio`.

### Instalar as IAs (exemplos)

```bash
# Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Gemini CLI
npm install -g @google/gemini-cli

# GitHub Copilot (requer gh instalado)
gh extension install github/gh-copilot
```

---

## Uso

```bash
# Ver quais IAs foram detectadas no sistema
aio --detect

# Executar um prompt
aio "refatore este código para usar async/await"

# Salvar resultado em arquivo
aio "escreva testes e documentação para o módulo X" -o resultado.md

# Ajuda
aio --help
```

---

## Arquitetura

```
AI-merge/
├── src/
│   ├── index.js              # CLI (commander) — ponto de entrada
│   └── core/
│       ├── detector.js       # detectAvailableAIs(), SUPPORTED_AIS
│       ├── splitter.js       # buildSplitterPrompt(), splitPrompt()
│       ├── executor.js       # runSubtask(), executeParallel()
│       └── aggregator.js     # aggregateResults()
├── test/
│   ├── integration.test.js   # testes end-to-end com subprocesso real
│   └── fixtures/
│       ├── fake-bin/         # CLIs falsas para testes de integração
│       │   ├── claude.mjs    # retorna JSON de subtarefas ou resposta simples
│       │   ├── claude.cmd    # wrapper Windows
│       │   ├── gemini.mjs
│       │   └── gemini.cmd
│       ├── fake-fast.mjs     # processo que encerra rapidamente (exit 0)
│       ├── fake-slow.mjs     # processo lento 500ms (testa paralelismo)
│       └── fake-fail.mjs     # processo que falha (exit 1)
└── package.json
```

Cada módulo é independente e testável isoladamente via injeção de dependência (`runner`, `spawner`, `invoker`). Os testes rodam com `node --test`, sem frameworks externos.

---

## Testes

```bash
# Testes de unidade
node --test src/core/detector.test.js
node --test src/core/splitter.test.js
node --test src/core/executor.test.js
node --test src/core/aggregator.test.js

# Testes de integração (requerem Node.js no PATH)
node --test test/integration.test.js
```
