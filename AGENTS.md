# Regras de Arquitetura & Contexto — MORRO VIVO

## Visão Geral do Mundo 3D
- **Morro Vivo** é uma simulação orgânica 3D em Three.js + Vite de uma comunidade carioca dividida em 4 macro-distritos:
  1. **Porto & Prainha (Oeste)**: `x < -35`, farol, píer de pesca (`-78, 74`), barracas de praia (`z ~ 42.8`), capoeira (`-110, -15`) e horta (`-92, -25`).
  2. **Morro do Sol (Centro)**: `x ~ -15 a 15`, Terreiro de Samba (`-2, -4`), Alameda do Samba (`-2, -13 a -19`), Mirante Sul (`1.4, 2.5`) e Olaria (`-22, -14`).
  3. **Alto da Serra (Norte)**: `z < -45`, Parque Solar (`-18, -72`), Mirante Imperial (`50, -102`), Torre de Rádio (`0, -104`) e Estação Alta do Bondinho (`13.5, -60`).
  4. **Polo da Várzea (Leste)**: `x > 35`, Campinho de Futebol (`55, 4`), Mercado Cultural (`75, 4`), Ponto de Mototáxi (`92, 14`), Academia (`112, -12`) e Escola de Surfe (`126, 58`).

## Módulos Principais
- `src/main.js`: Inicialização WebGL, UI bindings, controles de câmera, `FastPicker` e `PostEffects`.
- `src/simulation/Simulation.js`: Motor econômico com receitas orgânicas, consumo diário e custos estratégicos (`ACTION_COSTS`).
- `src/simulation/PoliticsEngine.js`: Motor de IA Política (Utility AI), 5 correntes ideológicas, 12 candidatos a gestores, eleições a cada 15 dias e decisões autônomas dos líderes eleitos.
- `src/world/architecture/mobility.js`: Sistema de Mobilidade Viva (Bondinho/Teleférico da Serra e Cooperativa de Mototáxis em movimento pelas ladeiras).
- `src/render/FastPicker.js`: Seleção instantânea com pré-filtro por esfera + `three-mesh-bvh`.
- `src/render/PostEffects.js`: Pós-processamento com `postprocessing` (Tilt-Shift Miniatura + Bloom Dinâmico Noturno) e calibração via `lil-gui`.

## Diretrizes Técnicas
1. **Topologia e Zonas Protegidas**: Nunca posicionar novas casas sobre a Praça do Samba (`raio 15m` de `-2, -4`), sobre o Campinho da Várzea (`55, 4`) ou sobre nós de infraestrutura (`this.infrastructureNodes`).
2. **Performance**: Objetos estáticos devem ter `matrixAutoUpdate = false` e `updateMatrix()`. Objetos móveis ou clicáveis devem ser listados em `getExcludedRoots` do `StaticBatcher`.

