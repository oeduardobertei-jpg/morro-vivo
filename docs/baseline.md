# Linha de base (Fase 1)

Medido em 2026-10-08 com `scripts/diagnose.mjs` (Chrome headless, SwiftShader).

- **Carregamento:** OK. Canvas, HUD, painel de distritos, ações e câmeras renderizam.
- **Console:** sem erros. 2 avisos (Clock deprecado, PCFSoftShadowMap), corrigidos na Fase 1.
- **FPS:** 1,2 em renderização por software. Não é representativo; medir em GPU real.
- **Bundle:** 812 KB (210 KB gzip).
- **Arquivos grandes:** `Architecture.js` 274 KB, `NPCs.js` 131 KB, `Terrain.js` 45 KB, `Soundtrack.js` 37 KB.
- **Botões:** salvar, novo mundo, música, volumes, ciclo, velocidade, 5 ações, 6 câmeras e câmera cinema.

Reproduzir: `npm run dev` e depois `node scripts/diagnose.mjs`.
