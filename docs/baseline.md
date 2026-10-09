# Linha de base (Fase 1)

Medido em 2026-10-08 com `scripts/diagnose.mjs` (Chrome headless, SwiftShader).

- **Carregamento:** OK. Canvas, HUD, painel de distritos, ações e câmeras renderizam.
- **Console:** sem erros. 2 avisos (Clock deprecado, PCFSoftShadowMap), corrigidos na Fase 1.
- **FPS:** 1,2 em renderização por software. Não é representativo; medir em GPU real.
- **Bundle:** 812 KB (210 KB gzip).
- **Arquivos grandes:** `Architecture.js` 274 KB, `NPCs.js` 131 KB, `Terrain.js` 45 KB, `Soundtrack.js` 37 KB.
- **Botões:** salvar, novo mundo, música, volumes, ciclo, velocidade, 5 ações, 6 câmeras e câmera cinema.

Reproduzir: `npm run dev` e depois `node scripts/diagnose.mjs`.

# Desempenho (Fase 2)

Medido em 2026-10-09 com `scripts/profile.mjs` (mesmo ambiente SwiftShader; valores de CPU são de um quadro e oscilam).

| Configuração | Draw calls | Render (ms/quadro) | Meshes agrupadas |
|---|---|---|---|
| Tudo desligado (`?nobatch&nocull&noadapt`) | 5034 | ~335 | 0 |
| Batching + culling (`?noadapt`) | 1853 | ~76 | 3000 em ~150 lotes |
| Tudo ligado (padrão) | 1758 | ~181 (resolução caiu para x0,6) | 2976 em 150 lotes |

- Capturas de tela iguais com e sem otimização; nenhum erro no console.
- O batcher leva de 45 a 55 s para ficar ativo em renderização por software; em GPU real deve levar só os 2,5 s de calibração.
- Ainda falta medir o FPS em GPU real.

Reproduzir: `node scripts/profile.mjs "http://localhost:5173/?debug" <nome>` (com `nobatch`, `nocull` ou `noadapt` na URL para comparar).
