# 🌄 MORRO VIVO — Simulação Orgânica 3D da Colina Carioca

[![Three.js](https://img.shields.io/badge/Three.js-0.186-black?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

> Uma simulação urbana viva, orgânica e dinâmica de uma comunidade carioca construída em Three.js, onde cada habitante possui rotina, propósito, identidade e laços comunitários.

---

## ✨ Destaques & Funcionalidades

### 🏘️ Urbanismo Orgânico & Distritos Vivos
- **Morro do Sol (Centro)**: Terraço central com o terreiro de samba histórico, acessado pela **Alameda do Samba** com arcos de buganvílias, piso em pedras portuguesas e o **Mirante Sul** com vista panorâmica para o oceano Atlântico.
- **Porto & Prainha (Oeste)**: Calçadão à beira-mar com pescadores, píer de madeira, banhistas e barracas tradicionais de praia (Coco Verde, Mate com Limão, Açaí da Colina e Petiscos).
- **Polo da Várzea (Leste)**: Feira cultural comunitária e campinho de futebol com pelada em andamento (times Amarelo vs. Azul) e narração sonora de golaços.
- **Alto da Serra (Norte)**: Alta cumeada com o Mirante Imperial, lunetas de observação panorâmica, torre de transmissão de rádio comunitária e aqueduto sustentável.

### 🚶 NPCs com Inteligência Espacial e Vida Própria
- **Grafo Viário Topológico & Fluidez (v1.1)**: Mais de 70 nós conectados guiando os pedestres estritamente por ruas, ladeiras, escadarias e calçadões, com simulação otimizada e suave mesmo em altas velocidades (**1x, 2x e 5x**).
- **Interações Orgânicas e Esporádicas (v1.1)**:
  - 🪁 *O Menino da Pipa*: evento poético e autônomo onde um jovem morador empina uma pipa colorida no céu da colina aproveitando a brisa favorável.
  - 🥤 *Cantinhos de Boteco & Bancos da Alameda*: mesinhas de plástico com cadeiras Ambev/Brahma e bancos coloniais onde moradores sentam esporadicamente para tomar um guaraná e prosear.
- **Profissões e Identidades Cariocas**:
  - 🎶 *Tião do Cavaco*: dedilhando seu cavaquinho na roda de samba.
  - 🌺 *Dona Teresa*: florista cuidando dos canteiros da Alameda.
  - 🌊 *Seu Agenor*: contemplando a brisa do oceano no Mirante Sul.
  - ⚽ *Peladeiros da Várzea*: dividindo a posse de bola no campinho.
  - 🥥 *Barraqueiros da Prainha*: atendendo banhistas e vendendo quitutes típicos.
  - 👷 *Mestres de Obras & Carreteiros*: transportando tijolos em carrinhos de mão e erguendo novos puxadinhos comunitários.
- **Vida Noturna & Social**: Ao entardecer e à noite, moradores se reúnem na frente de casa e sob os postes de luz para conversar e gesticular em encontros espontâneos de calçada.

### 🎵 Paisagem Sonora & Atmosfera
- Trilha sonora imersiva em Web Audio API com sintetizadores procedurais de ondas do mar, brisa suave nas árvores, cavaquinho espacial nas rodas de samba e efeitos de obras e peladas.
- Ciclo Dinâmico de Iluminação: Dia tropical, pôr do sol dourado carioca e noite estrelada iluminada por postes solares e fogueiras.

---

## 🛠️ Tecnologias Utilizadas

- **Three.js**: Renderização 3D WebGL em tempo real, iluminação com sombras dinâmicas, materiais PBR/Lambert e geometrias low-poly estilizadas.
- **Vite**: Bundler ultra-rápido com Hot Module Replacement (HMR).
- **Web Audio API**: Geração de áudio procedural espacializado 3D.
- **Vanilla CSS & HTML5**: Interface moderna, translúcida (glassmorphism) e responsiva.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- `npm` ou gerenciador de pacotes equivalente

### Instalação & Execução

```bash
# 1. Clone o repositório
git clone https://github.com/oeduardobertei-jpg/morro-vivo.git

# 2. Acesse a pasta do projeto
cd morro-vivo

# 3. Instale as dependências
npm install

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

Abra seu navegador em `http://localhost:5173/` e explore a colina!

---

## 🎮 Controles da Câmera

- **Botão Esquerdo do Mouse + Arrastar**: Orbitar / Rotacionar visão 3D
- **Botão Direito do Mouse + Arrastar**: Mover / Pan da câmera
- **Scroll do Mouse**: Zoom in / Zoom out
- **Cliques no Painel**: Alterne rapidamente entre as câmeras panorâmicas dos distritos (Porto, Morro, Serra, Cume, Várzea).
- **Clique em Casas ou Moradores**: Inspecione detalhes da família, satisfação e ações em tempo real.
