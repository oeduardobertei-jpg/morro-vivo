# Invariantes de Direção de Arte & Pipeline WebGL — Morro Vivo

Estas regras complementam [AGENTS.md](../../AGENTS.md) e devem ser respeitadas em qualquer edição visual, de shaders ou de renderização 3D:

1. **Ordem de Pós-Processamento (`src/render/PostEffects.js`)**:
   - `ToneMappingEffect(ToneMappingMode.AGX)` DEVE ficar **antes** de `HueSaturationEffect` e `BrightnessContrastEffect`.
   - Aplicar saturação/contraste antes do AgX pode levar canais RGB saturados (ex.: amarelos e azuis vivos) a valores negativos antes do `log2`, gerando pixels pretos (`NaN`).
   - Preservar os três modos visuais: `'maquete'` (`Maquete (Leve)`), `'bloom'` (`Maquete + Studio FX`) e `'off'` (`Original`).

2. **Shaders & Materiais (`src/render/StylizedMaterials.js`, `src/world/Environment.js`, `src/world/Terrain.js`)**:
   - Preferir **Gyroid FBM** leve (`stGyroid`) em vez de lattice noise 3D pesado de 8 cantos para manter compilação FXC/D3D11 rápida e bom FPS.
   - Evitar mapas de textura avulsos em materiais elegíveis ao `StaticBatcher` (`MAP_KEYS` bloqueia o agrupamento).
   - Manter o reflexo especular lunar no shader do oceano suavizado e abaixo do threshold de estouro do Bloom HDR à noite.
   - Usar a paleta curada `CURATED_PALETTE` e `getSharedStylizedMaterial` para coerência cromática e reuso de materiais.

3. **Batching, Compactação & Objetos Dinâmicos (`src/render/StaticBatcher.js`, `src/world/architecture/houses.js`)**:
   - Todo filho animado dentro de grupos compactados (ex.: varais, brasas de churrasqueira, churrasqueiro, bandeirinhas animadas) DEVE receber `userData.dynamic = true`.
   - Toda geometria compartilhada (`_getHouseGeo()`, `sharedWaterTankGeo`, etc.) DEVE constar no `Set` protegido passado a `_compactStaticChildren` para nunca sofrer `.dispose()` acidental.
   - Objetos estáticos devem congelar matrizes (`matrixAutoUpdate = false; updateMatrix()`).
   - Novos objetos móveis ou clicáveis precisam respeitar `FastPicker` e `getExcludedRoots` em `src/main.js`.

4. **Validação Obrigatória**:
   - Após qualquer mudança em render, shaders, terreno ou arquitetura, rodar `npm run build` e validar visualmente via `npm run verify:lookdev` (skill `morro-lookdev`).
