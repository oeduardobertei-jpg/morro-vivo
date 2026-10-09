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
- **Grafo Viário Topológico & Fluidez (v1.1 e v1.2)**: Mais de 80 nós conectados guiando os pedestres estritamente por ruas, ladeiras, escadarias e calçadões, com simulação otimizada e suave mesmo em altas velocidades (**1x, 2x e 5x**).
- **Interações Orgânicas e Esporádicas (v1.1 e v1.2)**:
  - 🪁 *O Menino da Pipa*: evento poético e autônomo onde um jovem morador empina uma pipa colorida no céu da colina aproveitando a brisa favorável.
  - 🥤 *Cantinhos de Boteco & Bancos da Alameda*: mesinhas de plástico com cadeiras Ambev/Brahma e bancos coloniais onde moradores sentam esporadicamente para tomar um guaraná e prosear.
- **Praias Vivas & Extremos Costeiros Autênticos (v1.2)**:
  - 🛶 *Prainha dos Pescadores (Extremo Oeste)*: Enseada caiçara com canoas artesanais de madeira (azul/branca e vermelha/branca), grandes redes de pesca estendidas na areia com bóias de cortiça, varal de salga de peixes ao sol e piscinas naturais de granito.
  - 🎣 *Seu Zé do Covo*: Mestre pescador tradicional pescando no extremo do píer de madeira com sua vara de bambu e paciência caiçara.
  - ⚽ *Arena de Futevôlei Carioca (Extremo Leste)*: Quadra com fita azul na areia, rede na altura oficial e dupla de atletas (Betinho e Pedrão) trocando peitadas e cabeceios com bola animada em trajetória parabólica.
  - 🏐 *Quadra de Vôlei de Praia*: Ao lado do futevôlei, com rede com antenas regulamentares e postes almofadados, onde Rodrigo e Carlos treinam manchetes e saques.
  - 🛖 *Quiosque do Sol Nascente*: Quiosque rústico com cobertura de piaçava/palha, deck suspenso e banquetas de madeira nas dunas do nascente.
  - 🩴 *Cangas Estampadas & Coqueiral*: Cangas coloridas estendidas com chinelos Havaianas na areia e coqueiros curvados pelo vento costeiro.
  - 🥤 *Beto do Mate*: Ambulante icônico que percorre toda a praia com galões duplos de Mate Leão e Limão nos ombros e sacola de Biscoito Globo.
  - 🌺 *Vegetação & Comércio Comunitário*: Touceiras de bromélias costeiras nas rochas e placas artesanais de comércios do morro (*Barbearia do Morro*, *Salão da Jô - Tranças*, *Depósito de Gás & Água*).
- **Expansão das Encostas, Esportes e Tradição (v1.2.2)**:
  - 🥋 *Mirante do Poente & Terreiro de Capoeira (-110, -15)*: Tablado circular em pedra aparelhada com berimbaus, atabaque e pandeiro, onde **Mestre Bimba** ginga em traje tradicional e ensina cantigas afro-brasileiras.
  - 🌱 *Horta Comunitária em Socalcos (-92, -25)*: Cerca de bambu trançado, canteiros elevados com terra fértil e hortaliças, espantalho tradicional e presença de **Dona Nair**, agricultora urbana que cuida das plantações.
  - 🪵 *Trilha Rústica de Dormentes & Rancho Caiçara*: Escadaria rústica de 10 degraus de dormentes de trem com corrimão de eucalipto unindo o topo à enseada, e rancho de pescadores com canoa, remos, guincho manual e fogueira de vigília.
  - 🛵 *Ponto Central de Mototáxi (92, 14)*: Abrigo com telhado azul ondulado, placa indicativa, banco e motos estacionadas, atendido por **Tiago Mototáxi** com colete refletivo amarelo e capacete.
  - 💪 *Academia ao Ar Livre da Colina (112, -12)*: Estrutura completa de calistenia com barra fixa, barras paralelas para dips, pneus de caminhão para treino funcional e presença do atleta **Jonas da Calistenia**.
  - 🏄 *Escola de Surfe & Pranchário (126, 58)*: Toldo amarelo, pranchário com 4 pranchas coloridas com quilhas, bodyboards e caixa de parafina, comandada pelo instrutor **Guga do Surfe**.
  - 🌉 *Passadiço Ecológico das Dunas*: Passarela suspensa de 14 pranchões de madeira sobre pilotis protegendo a vegetação de restinga até as dunas orientais.
- **Áudio Espacial 3D Focado, Partículas Temáticas & Organicidade (v1.2.4)**:
  - 🎧 *Restauração do Áudio Espacial 3D (Web Audio API)*: 
    - Listener reorientado para o **ponto focal do jogador (`controls.target`)** com atenuação dinâmica de altitude/zoom — visão panorâmica de longe limpa e sem poluição, e imersão sonora rica e detalhada ao aproximar a câmera de qualquer bairro.
    - Panorâmica estéreo física de 360° com mapeamento por projeção de tela NDC (`v.project(camera)`).
    - Brisa e marulho contínuo e sereno das ondas na praia, com atenuação suave ao subir a colina para as montanhas.
    - Recalibração de raios para a escala real do morro: samba (95m), pelada/golaço (110m), obras de laje (80m), carretos de tijolos (65m), altinha (55m) e barracas de praia (50m).
  - 🍧 *Partículas Temáticas Exclusivas para as Barracas de Praia*:
    - 🥥 *Barraca do Coco*: Borrifos refrescantes de água de coco em gotas translúcidas ciano/brancas.
    - 🥤 *Barraca do Mate*: Gotículas cor de âmbar e raspas de limão siciliano.
    - 🍧 *Barraca do Açaí*: Respingos roxos vibrantes com energia frutada.
    - 🦐 *Barraca de Petiscos*: Vapores quentinhos e acolhedores subindo dos pastéis e frutos do mar.
    - 💰 *Centelha Econômica `+$`*: Micro-moeda verde esmeralda flutuante que sobe suavemente ao registrar vendas.
  - 🧱 *Partículas de Obra Vigorosas & Físicas*: Geometria ampliada para 0.24m (claramente visível do alto), paleta carioca autêntica (vermelho cerâmico de tijolos, cinza de argamassa e serragem dourada de madeira) com arcos gravitacionais realistas e dissipação física por escala.
  - 🚶 *Organicidade Comportamental dos Moradores*: Ritmo individual de passada para cada cidadão (`speedMult`), acenos afetuosos espontâneos entre vizinhos ao cruzar pelas ladeiras e rotação sutil de olhar da cabeça ao caminhar.
- **Topologia Viária Real & Construtores Físicos (v1.2.5)**:
  - 🪜 *Escadaria Central da Ladeira do Samba*: Conexão viária contínua e suave ligando a Orla Litorânea (`0, 18`) ao Terreiro de Samba (`-2, -4`) através de 3 patamares intermediários com degraus de concreto e postes de iluminação, eliminando completamente tentativas de escalar o paredão rochoso.
  - 🧭 *Roteamento Tridimensional com Penalidade Vertical*: Algoritmo `getNearestRoadNode` com ponderação de desnível (`dy * 2.8`), impedindo que NPCs no calçadão escolham nós em precipícios elevados.
  - 👷 *Construção Física e Presencial*: O avanço de terraplenagem, andaimes e paredes passa a exigir presença física estrita dos operários (`builderState === 'working'`) no perímetro do lote. Fim definitivo das "obras fantasmas" à distância!
  - 🔨 *Harmonia e Cadência Sonora Construtiva*: Martelos ritmados em compasso humano sereno (~1.05s) e disparos de poeira a cada 1.20s, mantendo o ambiente vivo e agradável sem ruído excessivo ou poluição sonora.
  - 🛡️ *Fundações Impenetráveis & Cão de Guarda*: Bounding boxes estendidos verticalmente até o alicerce das palafitas (-6.5m), impedindo que pedestres atravessem assoalhos ou fiquem presos sob estacas na encosta.
  - 🌊 *Maresia Presente & Futebol Suave*: Volume do marulho e da brisa oceânica encorpado e refrescante (65%); sons do futebol atenuados drasticamente em volume e alcance com apito suave de média frequência, eliminando ruídos estridentes.
  - 🔥 *Renascimento da Noite do Samba*: Correção da cota vertical do tablado e da Alameda do Samba, eliminando a discrepância de 10 metros; moradores agora sobem e dançam visivelmente na praça ao redor da fogueira com chamas animadas, faíscas dinâmicas, cavaquinho Partido Alto e preservação de raio de 15m livre de qualquer construção.
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
