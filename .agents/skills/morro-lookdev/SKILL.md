---
name: morro-lookdev
description: >-
  Use this skill whenever validating visual changes, shaders, lighting, post-processing,
  3D geometry, or WebGL performance in Morro Vivo. Runs hardware-accelerated Chrome D3D11
  captures across Day, Sunset, and Night phases and inspects render/batching telemetry.
---

# Morro Vivo — Verificação Visual & Telemetria (Look-Dev)

Este procedimento valida alterações 3D, shaders GLSL, arquitetura, câmera e performance usando WebGL acelerado por hardware (ANGLE D3D11) em vez de software rendering (`swiftshader`), que trava ou estoura timeout em shaders PBR.

## Pré-requisitos
- Servidor de desenvolvimento Vite ativo em `http://localhost:5173/` (`npm run dev -- --port 5173`).

## Passos

1. **Build de produção** (sempre validar antes de capturar):
   ```powershell
   npm run build
   ```
2. **Rodar a bateria visual e de telemetria**:
   ```powershell
   npm run verify:lookdev
   ```
   - Opções suportadas: `--url http://localhost:5173/?debug --out scripts/out/lookdev`.
   - O script sai com código diferente de `0` se houver qualquer `pageerror`, `requestfailed` ou `console.error`.
3. **Inspecionar as 6 capturas geradas** em `scripts/out/lookdev/`:
   - `01_day_overview_maquete.png` — Panorâmica dia em `Maquete (Leve)` (checar paleta, silhueta, draw calls e FPS).
   - `02_day_overview_studiofx.png` — Panorâmica dia em `Studio FX` (checar SSAO e ausência de pixels pretos `NaN` em cores saturadas como toldos/guarda-sóis).
   - `03_houses_closeup_studiofx.png` — Close-up encosta oeste / olaria (checar materiais PBR, sombras e contatos no terreno).
   - `04_sunset_pier_ocean_studiofx.png` — Pôr do sol no píer e praia (checar espuma costeira GPU sem serrilhado e reflexos suaves).
   - `05_night_ocean_bloom_studiofx.png` — Horizonte noturno com Bloom HDR (confirmar ausência de estouro especular branco no mar).
   - `06_night_village_studiofx.png` — Close-up noturno de casas (confirmar janelas acesas, telhados vedados sem frestas e postes).
4. **Checklist de métricas no JSON de saída**:
   - `errors` deve estar vazio (`[]`).
   - Acompanhar `maqueteRenderInfo.calls` (draw calls), `batch.merged`, `batch.chunks`, `batch.skipped.excludedRoot`, `batch.skipped.emissive`, `fpsMaquete` e `fpsStudioFX`.
