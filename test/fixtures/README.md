# Test Fixtures

Scripts que simulam CLIs de IA para os testes de integração do executor.

| Script | Comportamento |
|---|---|
| `fake-fast.sh` | Imprime `"resposta rápida"` no stdout e sai com código 0. |
| `fake-slow.sh` | Aguarda 500ms, imprime `"resposta lenta"` no stdout e sai com código 0. |
| `fake-fail.sh` | Imprime `"algo deu errado"` no stderr e sai com código 1. |

## Permissões

Os scripts precisam ter permissão de execução. Caso necessário, rode:

```bash
chmod +x test/fixtures/*.sh
```

Os testes fazem isso automaticamente via `before()` para garantir compatibilidade em CI.
