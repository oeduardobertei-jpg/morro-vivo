import * as THREE from 'three';

export class NPCManager {
  constructor(scene, terrain, architecture) {
    this.scene = scene;
    this.terrain = terrain;
    this.arch = architecture;
    this.group = new THREE.Group();
    this.npcs = [];
    this.soundtrack = null;

    this.firstNames = [
      'Mateus', 'Tiago', 'Camila', 'Luan', 'Dona Rita', 'Seu Jorge',
      'Lucas', 'Beatriz', 'Rafael', 'Iara', 'Valéria', 'Manoel',
      'Gabriel', 'Júlia', 'Rodrigo', 'Larissa', 'Bruno', 'Aline',
      'Seu Zeca', 'Dona Cláudia', 'Beto', 'Mariana', 'Vinícius', 'Renata',
      'Fabiano', 'Letícia', 'Danilo', 'Priscila', 'Otávio', 'Juliana'
    ];

    this.roles = [
      { title: 'Guardião do Farol', action: 'Inspecionando a costa e o farol', color: 0xD83A3A },
      { title: 'Pescador da Prainha', action: 'Subindo com peixe fresco da baía', color: 0x0077B6 },
      { title: 'Operador Solar da Serra', action: 'Monitorando os painéis da chapada', color: 0x38BDF8 },
      { title: 'Feirante da Várzea', action: 'Levando artesanato para a feira', color: 0x2A9D8F },
      { title: 'Jogador da Pelada', action: 'Jogando bola no campinho de várzea', color: 0xE76F51 },
      { title: 'Músico de Roda', action: 'Tocando cavaquinho pelas praças', color: 0xF4A261 },
      { title: 'Mestre de Obras', action: 'Avaliando novas lajes e reformas', color: 0xB55338 },
      { title: 'Líder Comunitária', action: 'Caminhando entre as vilas e dialogando', color: 0x9B5DE5 },
      // Papéis do Cinturão das Alturas e Cantos das Encostas:
      { title: 'Menino da Pipa', action: 'Empinando pipa nos ventos do Mirante', color: 0xF43F5E },
      { title: 'Agricultora da Horta', action: 'Cuidando dos socalcos de agrofloresta', color: 0x10B981 },
      { title: 'Trilheiro do Cume', action: 'Subindo para o Mirante da Vista Imperial', color: 0x6366F1 },
      { title: 'Técnico da Usina Eólica', action: 'Monitorando as turbinas de vento na chapada', color: 0x06B6D4 },
      { title: 'Barqueiro do Poente', action: 'Costurando redes e cuidando dos botes no cais', color: 0x0EA5E9 },
      { title: 'Mestre Oleiro', action: 'Queimando tijolos e telhas nos fornos da olaria', color: 0xEA580C },
      { title: 'Turista Encantado', action: 'Admirando a Guanabara com a luneta no Mirante Imperial', color: 0xF59E0B },
      { title: 'Fotógrafo da Serra', action: 'Registrando a Vista Imperial entre os granitos', color: 0x10B981 },
      { title: 'Vigia do Mirante do Levante', action: 'Apreciando a vista da baía no deck leste', color: 0xD97706 },
      { title: 'Técnico da Rádio Comunitária', action: 'Ajustando as antenas da torre na crista', color: 0xDC2626 },
      // Papéis Especializados da Beira da Praia:
      { title: 'Barraqueiro do Coco', action: 'Cortando cocos verdes na bancada com facão', color: 0x2D6A4F, stallId: 'coco' },
      { title: 'Barraqueiro do Mate', action: 'Servindo mate gelado e biscoito Globo', color: 0xF97316, stallId: 'mate' },
      { title: 'Barraqueiro do Açaí', action: 'Montando tigelas de açaí com banana e granola', color: 0x7E22CE, stallId: 'acai' },
      { title: 'Barraqueiro de Petiscos', action: 'Fritando pasteis de camarão e peixe fresco', color: 0xDC2626, stallId: 'petiscos' },
      { title: 'Banhista da Praia', action: 'Tomando sol e curtindo o mar carioca', color: 0x06B6D4 }
    ];

    this.sambaAudioTimer = 0;
    this.sambaSparks = [];

    // Materiais Compartilhados (Otimização de RAM)
    this.sharedSparkGeo = new THREE.DodecahedronGeometry(0.08, 0);
    this.sharedSparkMat = new THREE.MeshBasicMaterial({ color: 0xFBBF24, transparent: true, opacity: 0.85 });

    // Sistema Autônomo e Ocasional do Menino da Pipa (Atualização 1.1)
    this.kiteSystem = {
      activeKite: false,
      timer: 0,
      cooldown: 25.0,
      flyerNPC: null,
      kiteMesh: null,
      lineMesh: null
    };

    this.scene.add(this.group);
  }

  setEnvironment(env) {
    this.env = env;
  }

  setSoundtrack(soundtrack) {
    this.soundtrack = soundtrack;
  }

  setSimulation(simulation) {
    this.simulation = simulation;
  }

  // Cálculo Preciso de Altura do Piso:
  // Interpola a superfície exata dos degraus, patamares e tablados para os pés dos NPCs
  getFloorElevation(x, z) {
    // 1. Alameda do Samba (de z: -19.5 até z: -12.8 em torno de x: -2.0)
    // Conecta de forma suave e majestosa a via alta ao Terreiro de Samba
    if (Math.abs(x - (-2.0)) <= 2.6 && z >= -19.8 && z <= -12.8) {
      const t = Math.max(0, Math.min(1, (z - (-19.5)) / (-12.8 - (-19.5)))); // 0 na entrada norte, 1 no pórtico
      const yStart = this.terrain ? this.terrain.getElevation(-2.0, -19.5) + 0.05 : 11.6;
      const yEnd = 14.25;
      return yStart + (yEnd - yStart) * t + 0.14;
    }

    // 2. Tablado da Praça do Samba em (-2, -4)
    const distPlaza = Math.hypot(x - (-2.0), z - (-4.0));
    if (distPlaza <= 9.3) {
      return 14.25;
    }

    // Padrão: Elevação da malha de terreno
    return this.terrain ? this.terrain.getElevation(x, z) : 0;
  }

  // =========================================================================
  // SISTEMA VIÁRIO TOPOLÓGICO CONECTADO (Versão 3.5.0)
  // Grafo real com arestas estritas ligando exclusivamente ruas, lajes, escadarias e a Alameda.
  // Impede 100% que NPCs saltem de despenhadeiros ou cortem caminho através do relevo.
  // =========================================================================
  buildRoadGraph() {
    const rawNodes = [
      // 1. Morro do Sol & Alameda do Samba (Acesso Estritamente Superior - Zero arestas para o sul!)
      { id: 'sol_mirante', x: 1.4, z: 2.5, type: 'mirante', desc: 'Mirante Sul Panorâmico' },
      { id: 'sol_plaza_center', x: -2.0, z: -4.0, type: 'plaza', desc: 'Terreiro de Samba Central' },
      { id: 'sol_plaza_portico', x: -2.0, z: -8.8, type: 'portico', desc: 'Pórtico Norte das Fitinhas' },
      { id: 'alameda_patamar_3', x: -2.0, z: -13.5, type: 'alameda', desc: 'Alameda do Samba (Patamar Alto)' },
      { id: 'alameda_patamar_2', x: -2.0, z: -16.5, type: 'alameda', desc: 'Alameda do Samba (Pérgola das Flores)' },
      { id: 'alameda_crossroads', x: -2.0, z: -19.5, type: 'crossroads', desc: 'Encruzilhada Alta da Alameda' },

      // 2. Spine Central Norte & Olaria
      { id: 'olaria_dock', x: -20.0, z: -14.0, type: 'industry', desc: 'Cais de Carga da Olaria' },
      { id: 'spine_1', x: -18.0, z: -18.0, type: 'highway', desc: 'Entroncamento Central da Serra' },
      { id: 'spine_2', x: 5.0, z: -32.0, type: 'highway', desc: 'Curva da Serra' },
      { id: 'spine_3', x: -12.0, z: -50.0, type: 'highway', desc: 'Acesso Médio da Serra' },
      { id: 'spine_4', x: 0.0, z: -66.0, type: 'highway', desc: 'Promenade do Parque Solar' },
      { id: 'spine_5', x: 0.0, z: -76.0, type: 'highway', desc: 'Plataforma Solar Alta' },

      // 3. Transversal Central-Oeste
      { id: 'transv_w_0', x: -15.0, z: -18.0, type: 'street', desc: 'Transversal Oeste - Início' },
      { id: 'transv_w_1', x: -28.0, z: -18.0, type: 'street', desc: 'Transversal Oeste - Meio' },
      { id: 'transv_w_2', x: -38.0, z: -15.0, type: 'street', desc: 'Transversal Oeste - Curva' },
      { id: 'transv_w_3', x: -48.0, z: -28.0, type: 'street', desc: 'Transversal Oeste - Descida' },
      { id: 'transv_w_4', x: -65.0, z: -38.0, type: 'street', desc: 'Transversal Oeste - Poente' },

      // 4. Transversal Central-Leste
      { id: 'transv_e_0', x: 15.0, z: -18.0, type: 'street', desc: 'Transversal Leste - Início' },
      { id: 'transv_e_1', x: 28.0, z: -18.0, type: 'street', desc: 'Transversal Leste - Meio' },
      { id: 'transv_e_2', x: 38.0, z: -15.0, type: 'street', desc: 'Transversal Leste - Curva' },
      { id: 'transv_e_3', x: 48.0, z: -28.0, type: 'street', desc: 'Transversal Leste - Descida' },
      { id: 'transv_e_4', x: 65.0, z: -38.0, type: 'street', desc: 'Transversal Leste - Levante' },

      // 5. West Mid-hill Arterial & Escadarias do Poente
      { id: 'mid_w_0', x: -75.0, z: 16.0, type: 'street', desc: 'Entroncamento Prainha' },
      { id: 'mid_w_1', x: -70.0, z: 4.0, type: 'street', desc: 'Arterial Poente Baixa' },
      { id: 'mid_w_2', x: -65.0, z: -8.0, type: 'street', desc: 'Arterial Poente Média' },
      { id: 'mid_w_3', x: -50.0, z: -20.0, type: 'street', desc: 'Arterial Poente Alta' },
      { id: 'mid_w_4', x: -30.0, z: -32.0, type: 'street', desc: 'Aproximação Serra Oeste' },
      { id: 'mid_w_5', x: -3.0, z: -32.0, type: 'street', desc: 'Entroncamento Serra-Poente' },

      // 6. East Mid-hill Arterial & Escadarias do Levante
      { id: 'mid_e_0', x: 75.0, z: 16.0, type: 'street', desc: 'Entroncamento Várzea' },
      { id: 'mid_e_1', x: 70.0, z: 4.0, type: 'street', desc: 'Arterial Levante Baixa' },
      { id: 'mid_e_2', x: 65.0, z: -8.0, type: 'street', desc: 'Arterial Levante Média' },
      { id: 'mid_e_3', x: 50.0, z: -20.0, type: 'street', desc: 'Arterial Levante Alta' },
      { id: 'mid_e_4', x: 30.0, z: -32.0, type: 'street', desc: 'Aproximação Serra Leste' },
      { id: 'mid_e_5', x: -3.0, z: -32.0, type: 'street', desc: 'Entroncamento Serra-Levante' },

      // 7. Grand Coastal Highway (Z = 18.0)
      { id: 'coast_far_w_1', x: -135.0, z: 18.0, type: 'coast', desc: 'Rodovia Poente Extremo' },
      { id: 'coast_far_w_2', x: -115.0, z: 18.0, type: 'coast', desc: 'Rodovia das Falésias Oeste' },
      { id: 'coast_w_1', x: -102.0, z: 18.0, type: 'coast', desc: 'Acesso Píer dos Pescadores' },
      { id: 'coast_w_2', x: -90.0, z: 18.0, type: 'coast', desc: 'Calçadão Prainha Oeste' },
      { id: 'coast_w_3', x: -78.0, z: 18.0, type: 'coast', desc: 'Passarela da Prainha' },
      { id: 'coast_w_4', x: -50.0, z: 18.0, type: 'coast', desc: 'Calçadão Oeste' },
      { id: 'coast_w_5', x: -30.0, z: 18.0, type: 'coast', desc: 'Calçadão Centro-Oeste' },
      { id: 'coast_w_6', x: -12.0, z: 18.0, type: 'coast', desc: 'Calçadão das Palmeiras' },
      { id: 'coast_center', x: 0.0, z: 18.0, type: 'coast', desc: 'Calçadão Central da Orla' },
      { id: 'coast_e_1', x: 15.0, z: 18.0, type: 'coast', desc: 'Calçadão Centro-Leste' },
      { id: 'coast_e_1b', x: 35.0, z: 18.0, type: 'coast', desc: 'Acesso Oeste da Várzea' },
      { id: 'coast_e_2', x: 55.0, z: 18.0, type: 'coast', desc: 'Passarela da Várzea' },
      { id: 'coast_e_3', x: 80.0, z: 18.0, type: 'coast', desc: 'Calçadão Leste da Praia' },
      { id: 'coast_e_4', x: 102.0, z: 18.0, type: 'coast', desc: 'Acesso Olaria Leste' },
      { id: 'coast_far_e_1', x: 115.0, z: 18.0, type: 'coast', desc: 'Rodovia das Falésias Leste' },
      { id: 'coast_far_e_2', x: 135.0, z: 18.0, type: 'coast', desc: 'Rodovia Levante Extremo' },

      // 8. Várzea & Mercado Cultural
      { id: 'varzea_market', x: 75.0, z: 4.0, type: 'market', desc: 'Deck Cultural da Várzea' },
      { id: 'varzea_back', x: 55.0, z: -9.0, type: 'street', desc: 'Rua de Trás do Futebol' },
      { id: 'varzea_west', x: 36.0, z: -5.0, type: 'street', desc: 'Esquina do Campinho' },

      // 9. Highlands & Mirante Imperial
      { id: 'mirante_imp_0', x: 50.0, z: -102.0, type: 'mirante', desc: 'Pórtico do Mirante Imperial' },
      { id: 'mirante_imp_1', x: 46.4, z: -110.0, type: 'mirante', desc: 'Luneta Poente' },
      { id: 'mirante_imp_2', x: 53.6, z: -110.0, type: 'mirante', desc: 'Luneta Levante' },
      { id: 'mirante_imp_center', x: 50.0, z: -111.0, type: 'mirante', desc: 'Rosa dos Ventos' },
      { id: 'high_crista_w', x: -28.0, z: -85.0, type: 'crista', desc: 'Crista Poente' },
      { id: 'torre_radio', x: 0.0, z: -104.0, type: 'crista', desc: 'Torre de Transmissão' },
      { id: 'high_crista_e', x: 28.0, z: -85.0, type: 'crista', desc: 'Crista Levante' },

      // 10. Frontier Vielas (Lajes Urbanas)
      { id: 'viela_w_0', x: -84.0, z: 8.0, type: 'viela', desc: 'Viela do Poente 1' },
      { id: 'viela_w_1', x: -88.0, z: -2.0, type: 'viela', desc: 'Viela do Poente 2' },
      { id: 'viela_w_2', x: -76.0, z: -12.0, type: 'viela', desc: 'Viela do Poente 3' },
      { id: 'viela_w_3', x: -84.0, z: -32.0, type: 'viela', desc: 'Viela do Poente 4' },
      { id: 'viela_w_4', x: -94.0, z: -32.0, type: 'viela', desc: 'Viela do Poente 5' },
      { id: 'viela_w_5', x: -72.0, z: -62.0, type: 'viela', desc: 'Viela do Poente 6' },

      { id: 'viela_e_0', x: 84.0, z: 8.0, type: 'viela', desc: 'Viela do Levante 1' },
      { id: 'viela_e_1', x: 88.0, z: -2.0, type: 'viela', desc: 'Viela do Levante 2' },
      { id: 'viela_e_2', x: 76.0, z: -12.0, type: 'viela', desc: 'Viela do Levante 3' },
      { id: 'viela_e_3', x: 84.0, z: -32.0, type: 'viela', desc: 'Viela do Levante 4' },
      { id: 'viela_e_4', x: 94.0, z: -32.0, type: 'viela', desc: 'Viela do Levante 5' },
      { id: 'viela_e_5', x: 72.0, z: -62.0, type: 'viela', desc: 'Viela do Levante 6' }
    ];

    const nodeMap = new Map();
    rawNodes.forEach(rn => {
      const y = this.getFloorElevation(rn.x, rn.z);
      nodeMap.set(rn.id, {
        id: rn.id,
        x: rn.x,
        z: rn.z,
        y: y,
        type: rn.type,
        desc: rn.desc,
        neighbors: [],
        position: new THREE.Vector3(rn.x, y, rn.z)
      });
    });

    const addEdge = (u, v) => {
      if (nodeMap.has(u) && nodeMap.has(v)) {
        const nu = nodeMap.get(u);
        const nv = nodeMap.get(v);
        if (!nu.neighbors.includes(v)) nu.neighbors.push(v);
        if (!nv.neighbors.includes(u)) nv.neighbors.push(u);
      }
    };

    // 1. Morro do Sol & Alameda do Samba (Acesso Estritamente Superior)
    addEdge('sol_mirante', 'sol_plaza_center');
    addEdge('sol_plaza_center', 'sol_plaza_portico');
    addEdge('sol_plaza_portico', 'alameda_patamar_3');
    addEdge('alameda_patamar_3', 'alameda_patamar_2');
    addEdge('alameda_patamar_2', 'alameda_crossroads');

    // 2. Encruzilhada da Alameda com Eixo da Serra, Olaria e Transversais
    addEdge('alameda_crossroads', 'spine_1');
    addEdge('alameda_crossroads', 'olaria_dock');
    addEdge('olaria_dock', 'spine_1');
    addEdge('spine_1', 'spine_2');
    addEdge('spine_2', 'spine_3');
    addEdge('spine_3', 'spine_4');
    addEdge('spine_4', 'spine_5');

    // 3. Transversais
    addEdge('alameda_crossroads', 'transv_w_0');
    addEdge('transv_w_0', 'transv_w_1');
    addEdge('transv_w_1', 'transv_w_2');
    addEdge('transv_w_2', 'transv_w_3');
    addEdge('transv_w_3', 'transv_w_4');
    addEdge('transv_w_0', 'spine_1');

    addEdge('alameda_crossroads', 'transv_e_0');
    addEdge('transv_e_0', 'transv_e_1');
    addEdge('transv_e_1', 'transv_e_2');
    addEdge('transv_e_2', 'transv_e_3');
    addEdge('transv_e_3', 'transv_e_4');
    addEdge('transv_e_0', 'spine_1');

    // 4. Mid-hill West
    addEdge('mid_w_0', 'mid_w_1');
    addEdge('mid_w_1', 'mid_w_2');
    addEdge('mid_w_2', 'mid_w_3');
    addEdge('mid_w_3', 'mid_w_4');
    addEdge('mid_w_4', 'mid_w_5');
    addEdge('mid_w_5', 'spine_2');
    addEdge('mid_w_3', 'transv_w_3');

    // 5. Mid-hill East
    addEdge('mid_e_0', 'mid_e_1');
    addEdge('mid_e_1', 'mid_e_2');
    addEdge('mid_e_2', 'mid_e_3');
    addEdge('mid_e_3', 'mid_e_4');
    addEdge('mid_e_4', 'mid_e_5');
    addEdge('mid_e_5', 'spine_2');
    addEdge('mid_e_3', 'transv_e_3');
    addEdge('mid_w_5', 'mid_e_5');

    // 6. Coastal Highway Chain
    const coastalChain = [
      'coast_far_w_1', 'coast_far_w_2', 'coast_w_1', 'coast_w_2', 'coast_w_3', 'coast_w_4', 'coast_w_5', 'coast_w_6',
      'coast_center', 'coast_e_1', 'coast_e_1b', 'coast_e_2', 'coast_e_3', 'coast_e_4', 'coast_far_e_1', 'coast_far_e_2'
    ];
    for (let c = 0; c < coastalChain.length - 1; c++) {
      addEdge(coastalChain[c], coastalChain[c + 1]);
    }

    // Conexões Encosta <-> Rodovia Litorânea
    addEdge('coast_w_3', 'mid_w_0'); // Prainha
    addEdge('coast_e_2', 'mid_e_0'); // Várzea
    addEdge('coast_e_1b', 'varzea_west');

    // 7. Várzea & Mercado
    addEdge('mid_e_0', 'varzea_market');
    addEdge('varzea_market', 'varzea_back');
    addEdge('varzea_back', 'varzea_west');

    // 8. Highlands & Cristas
    addEdge('spine_5', 'mirante_imp_0');
    addEdge('mirante_imp_0', 'mirante_imp_1');
    addEdge('mirante_imp_0', 'mirante_imp_2');
    addEdge('mirante_imp_1', 'mirante_imp_center');
    addEdge('mirante_imp_2', 'mirante_imp_center');
    addEdge('spine_5', 'high_crista_w');
    addEdge('high_crista_w', 'torre_radio');
    addEdge('torre_radio', 'high_crista_e');
    addEdge('high_crista_e', 'mirante_imp_0');

    // 9. Vielas Poente & Levante
    addEdge('mid_w_0', 'viela_w_0');
    addEdge('viela_w_0', 'viela_w_1');
    addEdge('viela_w_1', 'viela_w_2');
    addEdge('viela_w_2', 'viela_w_3');
    addEdge('viela_w_3', 'viela_w_4');
    addEdge('viela_w_4', 'viela_w_5');
    addEdge('viela_w_5', 'transv_w_4');

    addEdge('mid_e_0', 'viela_e_0');
    addEdge('viela_e_0', 'viela_e_1');
    addEdge('viela_e_1', 'viela_e_2');
    addEdge('viela_e_2', 'viela_e_3');
    addEdge('viela_e_3', 'viela_e_4');
    addEdge('viela_e_4', 'viela_e_5');
    addEdge('viela_e_5', 'transv_e_4');

    this.roadNodes = Array.from(nodeMap.values());
    this.roadNodesMap = nodeMap;
    this.waypoints = this.roadNodes.map(n => n.position);
  }

  // Roteador de Caminhos em Grafo (BFS Ultra-rápido):
  // Garante trajeto 100% contínuo e conectado entre quaisquer dois pontos da cidade
  findRoadPath(startId, targetId) {
    if (startId === targetId) return [targetId];
    if (!this.roadNodesMap || !this.roadNodesMap.has(startId) || !this.roadNodesMap.has(targetId)) {
      return [targetId];
    }

    const queue = [startId];
    const visited = new Set([startId]);
    const cameFrom = new Map();

    while (queue.length > 0) {
      const curr = queue.shift();
      if (curr === targetId) {
        const path = [curr];
        let step = curr;
        while (cameFrom.has(step)) {
          step = cameFrom.get(step);
          path.unshift(step);
        }
        return path;
      }

      const node = this.roadNodesMap.get(curr);
      if (!node || !node.neighbors) continue;
      for (const nbr of node.neighbors) {
        if (!visited.has(nbr)) {
          visited.add(nbr);
          cameFrom.set(nbr, curr);
          queue.push(nbr);
        }
      }
    }
    return [targetId];
  }

  // Encontra o nó do grafo viário mais próximo de uma coordenada (X, Z)
  getNearestRoadNode(x, z, filterFn = null) {
    if (!this.roadNodes || this.roadNodes.length === 0) return null;
    let best = null;
    let minDist = Infinity;
    for (let i = 0; i < this.roadNodes.length; i++) {
      const n = this.roadNodes[i];
      if (filterFn && !filterFn(n)) continue;
      const d = Math.hypot(n.x - x, n.z - z);
      if (d < minDist) {
        minDist = d;
        best = n;
      }
    }
    return best || this.roadNodes[0];
  }

  spawnInitialPopulation() {
    // Constrói a topologia da malha viária conectada (Grafo Viário v3.5.0)
    this.buildRoadGraph();
    const waypoints = this.waypoints;

    // Special mini-waypoints inside soccer field for 'Jogador da Pelada'
    this.pitchWaypoints = [
      new THREE.Vector3(48, 3.7, 1),
      new THREE.Vector3(55, 3.7, 7),
      new THREE.Vector3(62, 3.7, 2),
      new THREE.Vector3(55, 3.7, -1),
      new THREE.Vector3(51, 3.7, 5)
    ];

    // 1. Spawn the 4 Dedicated Beach Barraqueiros (stationed at their stalls)
    const barraqueiroConfigs = [
      { stallId: 'coco', title: 'Barraqueiro do Coco', name: 'Seu Baiano', x: -40, z: 42.8, color: 0x2D6A4F },
      { stallId: 'mate', title: 'Barraqueiro do Mate', name: 'Leandro do Mate', x: -10, z: 42.8, color: 0xF97316 },
      { stallId: 'acai', title: 'Barraqueiro do Açaí', name: 'Marcos Açaí', x: 20, z: 42.8, color: 0x7E22CE },
      { stallId: 'petiscos', title: 'Barraqueiro de Petiscos', name: 'Dona Cida', x: 50, z: 42.8, color: 0xDC2626 }
    ];

    barraqueiroConfigs.forEach((cfg, idx) => {
      const stallRole = {
        title: cfg.title,
        action: `Atendendo clientes com produtos frescos na barraca`,
        color: cfg.color,
        stallId: cfg.stallId
      };
      const bPos = new THREE.Vector3(cfg.x, 0.6, cfg.z);
      if (this.terrain) bPos.y = this.terrain.getElevation(bPos.x, bPos.z);

      const stallObj = this.arch && this.arch.beachStalls ? this.arch.beachStalls.find(s => s.id === cfg.stallId) : null;
      const bNPC = this.createNPCMesh(cfg.name, stallRole, bPos, [bPos], 100 + idx, null, stallObj);
      this.npcs.push(bNPC);
    });

    // 2. Personagens Cênicos Dedicados (Alameda das Flores, Terreiro de Samba & Mirante Sul)
    const miranteConfigs = [
      {
        name: 'Dona Teresa',
        role: {
          title: 'Florista da Alameda',
          action: 'Cuidando dos canteiros de buganvílias e acolhendo os visitantes',
          color: 0xDC2626
        },
        x: -4.8,
        z: -17.5,
        rot: 1.57,
        isScenicMirante: true
      },
      {
        name: 'Tião do Cavaco',
        role: {
          title: 'Músico do Terreiro de Samba',
          action: 'Tocando cavaquinho com ginga e harmonia na roda de samba',
          color: 0x2563EB
        },
        x: -4.5,
        z: -4.0,
        rot: 1.1,
        isScenicMirante: true,
        isMusician: true
      },
      {
        name: 'Seu Agenor',
        role: {
          title: 'Mestre do Mirante Sul',
          action: 'Sentado no banco do mirante apreciando a vista panorâmica do oceano',
          color: 0xF59E0B
        },
        x: 1.4,
        z: 2.8,
        rot: 0.0,
        isScenicMirante: true
      }
    ];

    miranteConfigs.forEach((cfg, idx) => {
      const mPos = new THREE.Vector3(cfg.x, this.getFloorElevation(cfg.x, cfg.z), cfg.z);
      const mNPC = this.createNPCMesh(cfg.name, cfg.role, mPos, [mPos], 200 + idx);
      mNPC.isScenicMirante = true;
      mNPC.isMusician = !!cfg.isMusician;
      mNPC.group.rotation.y = cfg.rot;

      if (cfg.isMusician) {
        // Cavaquinho low-poly fixado ergonomicamente ao Tião
        const cavacoGroup = new THREE.Group();
        cavacoGroup.position.set(0.12, 0.72, 0.28);
        cavacoGroup.rotation.set(-0.25, 0.45, -0.65);

        const bodyGeo = new THREE.BoxGeometry(0.32, 0.42, 0.12);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0xB45309, flatShading: true });
        const cBody = new THREE.Mesh(bodyGeo, bodyMat);
        cavacoGroup.add(cBody);

        const neckGeo = new THREE.BoxGeometry(0.08, 0.38, 0.06);
        const neckMat = new THREE.MeshLambertMaterial({ color: 0x3E2723, flatShading: true });
        const cNeck = new THREE.Mesh(neckGeo, neckMat);
        cNeck.position.set(0, 0.36, 0);
        cavacoGroup.add(cNeck);

        const soundHole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 8), new THREE.MeshBasicMaterial({ color: 0x1F2937 }));
        soundHole.rotation.x = Math.PI / 2;
        soundHole.position.set(0, 0, 0.07);
        cavacoGroup.add(soundHole);

        mNPC.group.add(cavacoGroup);
        mNPC.cavacoGroup = cavacoGroup;
      }

      this.npcs.push(mNPC);
    });
    
    // Os civis agora serão chamados um a um pela simulação! (Regra População / 10)
  }

  spawnNewCivilian() {
    // Teto de Vidro Visual (Performance): Limite máximo de 300 cidadãos simultâneos
    if (this.npcs.length >= 300) return;
    if (!this.waypoints) return;
    
    const civilianRoles = this.roles.filter(r => !r.title.startsWith('Barraqueiro') && r.title !== 'Banhista da Praia');
    
    if (this.civCount === undefined) this.civCount = 0;
    if (this.playerCount === undefined) this.playerCount = 0;
    
    const i = this.civCount++;
    const role = civilianRoles[i % civilianRoles.length];
    const name = this.firstNames[i % this.firstNames.length];

    let startNodeId = null;
    let targetNodeId = null;
    let startWp = null;
    let npcWaypoints = null;
    let team = null;

    if (role.title === 'Jogador da Pelada') {
      npcWaypoints = this.pitchWaypoints;
      startWp = this.pitchWaypoints[i % this.pitchWaypoints.length].clone();
      team = (this.playerCount % 2 === 0) ? 'yellow' : 'blue';
      this.playerCount++;
    } else {
      npcWaypoints = this.waypoints;
      // Seleciona um nó válido do grafo viário
      const spawnPool = (this.roadNodes && this.roadNodes.length > 0)
        ? this.roadNodes.filter(n => n.id !== 'sol_mirante')
        : [];
      if (spawnPool.length > 0) {
        const chosenNode = spawnPool[Math.floor(Math.random() * spawnPool.length)];
        startNodeId = chosenNode.id;
        startWp = chosenNode.position.clone();
        startWp.x += (Math.random() - 0.5) * 0.4;
        startWp.z += (Math.random() - 0.5) * 0.4;
        startWp.y = this.getFloorElevation(startWp.x, startWp.z);

        const nbrs = chosenNode.neighbors || [];
        targetNodeId = nbrs.length > 0 ? nbrs[Math.floor(Math.random() * nbrs.length)] : startNodeId;
      } else {
        startWp = (this.waypoints && this.waypoints[0]) ? this.waypoints[0].clone() : new THREE.Vector3(0, 0, 0);
      }
    }

    const npc = this.createNPCMesh(name, role, startWp, npcWaypoints, i, team);
    if (startNodeId) {
      npc.currentNodeId = startNodeId;
      npc.targetNodeId = targetNodeId;
      const tNode = (this.roadNodesMap && targetNodeId) ? this.roadNodesMap.get(targetNodeId) : null;
      if (tNode) {
        npc.targetPos = tNode.position.clone();
      }
    }
    this.npcs.push(npc);
  }

  createNPCMesh(name, role, startPos, waypoints, index, team = null, stallObj = null) {
    const npcGroup = new THREE.Group();
    npcGroup.position.copy(startPos);

    const isBanhista = (role.title === 'Banhista da Praia');
    const isBarraqueiro = role.title.startsWith('Barraqueiro');

    // Skin tones
    const skinPalette = [0x8D5524, 0x70411B, 0xC68642, 0xE0AC69, 0x5C381E];
    const skinColor = skinPalette[index % skinPalette.length];
    const headMat = new THREE.MeshLambertMaterial({ color: skinColor, flatShading: true });

    // Torso / Shirt Material
    let shirtColor = role.color;
    if (role.title === 'Jogador da Pelada' && team) {
      shirtColor = (team === 'yellow') ? 0xFACC15 : 0x0077B6;
    }

    // City vs Beach Torso Materials
    const cityTorsoMat = isBarraqueiro
      ? new THREE.MeshLambertMaterial({ color: 0xF3F4F6, flatShading: true })
      : new THREE.MeshLambertMaterial({ color: shirtColor, flatShading: true });

    const isBareChest = (index % 2 === 0);
    const topColors = [0x06B6D4, 0xF43F5E, 0xFACC15, 0x10B981, 0x8B5CF6];
    const beachTorsoMat = isBareChest
      ? headMat
      : new THREE.MeshLambertMaterial({ color: topColors[index % topColors.length], flatShading: true });

    const shirtGeo = new THREE.BoxGeometry(0.48, 0.65, 0.32);
    const torso = new THREE.Mesh(shirtGeo, cityTorsoMat);
    torso.position.y = 0.85;
    torso.castShadow = true;
    npcGroup.add(torso);

    // Front Apron for Barraqueiros
    if (isBarraqueiro) {
      let apronColor = 0x2D6A4F;
      if (role.stallId === 'mate') apronColor = 0xEA580C;
      else if (role.stallId === 'acai') apronColor = 0x7E22CE;
      else if (role.stallId === 'petiscos') apronColor = 0xF5F5F5;

      const apron = new THREE.Mesh(
        new THREE.BoxGeometry(0.49, 0.58, 0.05),
        new THREE.MeshLambertMaterial({ color: apronColor, flatShading: true })
      );
      apron.position.set(0, 0, 0.16);
      torso.add(apron);
    }

    // Arms (Left & Right)
    const armGeo = new THREE.BoxGeometry(0.12, 0.50, 0.12);
    const armMat = isBarraqueiro ? headMat : cityTorsoMat;
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.31, 0.88, 0);
    npcGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.31, 0.88, 0);
    npcGroup.add(rightArm);

    // Head
    const headGeo = new THREE.BoxGeometry(0.34, 0.36, 0.34);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.36;
    npcGroup.add(head);

    // Hat / Visor / Cap (City hat)
    let hat;
    if (isBarraqueiro) {
      if (role.stallId === 'coco') {
        const strawMat = new THREE.MeshLambertMaterial({ color: 0xD4A373, flatShading: true });
        hat = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.46, 0.12, 8), strawMat);
        hat.position.y = 1.58;
      } else {
        let visorColor = 0x15803D; // Green Matte Leão visor
        if (role.stallId === 'acai') visorColor = 0x06B6D4;
        else if (role.stallId === 'petiscos') visorColor = 0xDC2626;

        hat = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.10, 0.48),
          new THREE.MeshLambertMaterial({ color: visorColor })
        );
        hat.position.y = 1.58;
      }
      npcGroup.add(hat);
    } else {
      hat = new THREE.Mesh(
        new THREE.BoxGeometry(0.40, 0.12, 0.44),
        new THREE.MeshLambertMaterial({ color: 0x1E293B })
      );
      hat.position.y = 1.58;
      npcGroup.add(hat);
    }

    // Beach Accessories Group (Sunglasses, straw sun visor, beach towel)
    const beachAccGroup = new THREE.Group();

    // Sunglasses
    const shades = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.08, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x111111 })
    );
    shades.position.set(0, 1.36, 0.16);
    beachAccGroup.add(shades);

    // Straw sun visor
    const strawMat = new THREE.MeshLambertMaterial({ color: 0xD4A373, flatShading: true });
    const sunVisor = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.44, 0.10, 8), strawMat);
    sunVisor.position.y = 1.58;
    beachAccGroup.add(sunVisor);

    // Beach towel draped over shoulder for some bathers
    if (index % 3 === 0) {
      const towelMat = new THREE.MeshLambertMaterial({
        color: [0xF59E0B, 0x10B981, 0xEC4899, 0x3B82F6][index % 4],
        flatShading: true
      });
      const towel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.65, 0.34), towelMat);
      towel.position.set(0.26, 0.88, 0);
      beachAccGroup.add(towel);
    }
    beachAccGroup.visible = false;
    npcGroup.add(beachAccGroup);

    // Yellow Safety Hard Hat (Capacete amarelo de obra para quando trabalhar)
    const helmetGroup = new THREE.Group();
    const helmetMat = new THREE.MeshLambertMaterial({ color: 0xFACC15, flatShading: true });
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.44), helmetMat);
    crown.position.y = 1.62;
    helmetGroup.add(crown);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.04, 0.52), helmetMat);
    brim.position.y = 1.54;
    helmetGroup.add(brim);
    helmetGroup.visible = false;
    npcGroup.add(helmetGroup);

    // Worker Tool Arm
    const toolArm = new THREE.Group();
    toolArm.position.set(0.32, 1.05, 0);
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.72, 0.06),
      new THREE.MeshLambertMaterial({ color: 0x5C4033 })
    );
    handle.position.y = -0.12;
    toolArm.add(handle);
    const pickHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.09, 0.09),
      new THREE.MeshLambertMaterial({ color: 0x94A3B8, flatShading: true })
    );
    pickHead.position.y = 0.22;
    toolArm.add(pickHead);
    toolArm.visible = false;
    npcGroup.add(toolArm);

    // Pushcart / Wheelbarrow
    const cartGroup = new THREE.Group();
    cartGroup.position.set(0, 0.38, 0.85);
    const tub = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.36, 0.90),
      new THREE.MeshLambertMaterial({ color: 0x6C4A2D, flatShading: true })
    );
    tub.position.y = 0.18;
    cartGroup.add(tub);
    const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const cartWheel = new THREE.Mesh(wheelGeo, new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true }));
    cartWheel.position.set(0, 0.02, 0.52);
    cartGroup.add(cartWheel);
    const handleL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.65), tub.material);
    handleL.position.set(-0.32, 0.35, -0.65);
    cartGroup.add(handleL);
    const handleR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.65), tub.material);
    handleR.position.set(0.32, 0.35, -0.65);
    cartGroup.add(handleR);
    const brickCargo = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.24, 0.70),
      new THREE.MeshLambertMaterial({ color: 0xB55338, flatShading: true })
    );
    brickCargo.position.y = 0.32;
    cartGroup.add(brickCargo);
    cartGroup.visible = false;
    npcGroup.add(cartGroup);

    // City Pants vs Beach Sunga / Boardshorts
    const cityLegColor = isBarraqueiro ? 0x4B5563 : 0x2B2D42;
    const cityLegMat = new THREE.MeshLambertMaterial({ color: cityLegColor, flatShading: true });

    const isSunga = (index % 2 === 1);
    const boardshortColors = [0x0284C7, 0x10B981, 0xF97316, 0xEC4899];
    const beachLegColor = isSunga ? skinColor : boardshortColors[index % boardshortColors.length];
    const beachLegMat = new THREE.MeshLambertMaterial({ color: beachLegColor, flatShading: true });

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.20), cityLegMat);
    leftLeg.position.set(-0.13, 0.29, 0);
    npcGroup.add(leftLeg);
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.20), cityLegMat);
    rightLeg.position.set(0.13, 0.29, 0);
    npcGroup.add(rightLeg);

    let sungaBrief = null;
    if (isSunga) {
      const sungaColor = [0xEF4444, 0x06B6D4, 0x8B5CF6, 0x10B981][index % 4];
      sungaBrief = new THREE.Mesh(
        new THREE.BoxGeometry(0.49, 0.20, 0.33),
        new THREE.MeshLambertMaterial({ color: sungaColor, flatShading: true })
      );
      sungaBrief.position.set(0, 0.53, 0);
      sungaBrief.visible = false;
      npcGroup.add(sungaBrief);
    }

    this.group.add(npcGroup);

    const targetIdx = (index + 2) % (waypoints.length || 1);
    const target = waypoints.length > 0 ? waypoints[targetIdx].clone() : startPos.clone();

    return {
      id: `npc_${index}`,
      name: `${name} (${role.title}${team ? (team === 'yellow' ? ' - Amarelo' : ' - Azul') : ''})`,
      citizenName: name,
      role: role.title,
      originalAction: role.action,
      currentAction: role.action,
      group: npcGroup,
      torso,
      head,
      leftArm,
      rightArm,
      hat,
      builderHelmet: helmetGroup,
      toolArm,
      cartGroup,
      cartWheel,
      leftLeg,
      rightLeg,
      originalColor: shirtColor,
      cityTorsoMat,
      beachTorsoMat,
      cityLegMat,
      beachLegMat,
      beachAccGroup,
      sungaBrief,
      isWearingBeachwear: false,
      beachTrip: {
        state: 'idle', // 'idle', 'going_to_beach', 'at_beach', 'returning'
        chosenEntrance: null,
        targetSpot: null,
        beachTimer: 0,
        hasPurchased: false
      },
      sambaState: {
        isParticipant: (index >= 0 && index < 24), // 24 Músicos e Boêmios na Roda!
        slotIndex: (index >= 0 && index < 24) ? index : 0,
        isActive: false
      },
      // Vida Noturna nas Ruas: Encontros sociais e papos na calçada
      chatPartner: null,
      chatTimer: 0,
      chatCooldown: 8.0 + Math.random() * 20.0,
      targetPos: target,
      currentWpIndex: targetIdx,
      currentNodeId: null,
      targetNodeId: null,
      lastNodeId: null,
      pathQueue: [],
      sambaRoutingActive: false,
      waypoints,
      speed: 1.8 + Math.random() * 0.6,
      walkCycle: Math.random() * 10,
      waitTimer: 0,
      // Beach Roles State:
      isBarraqueiro,
      assignedStall: stallObj,
      saleTimer: 0,
      isBanhista,
      // Real Citizen Worker State:
      isBuilder: false,
      builderState: 'idle',
      assignedSite: null,
      workerSpot: null,
      cheerTimer: 0,
      // Wheelbarrow Courier State:
      isCourier: false,
      courierState: 'idle',
      courierSite: null,
      onDelivered: null,
      cartRattleTimer: 0,
      // Soccer Player State:
      team,
      kickTimer: 0,
      // Anti-Stuck & Watchdog Monitor:
      stuckCheckTimer: Math.random() * 1.5,
      stuckLastPos: new THREE.Vector3(startPos.x, startPos.y, startPos.z)
    };
  }

  // DYNAMIC OUTFIT SYSTEM:
  // Automatically transforms citizens into swimwear upon reaching the sand (Z >= 24)
  // and back into street clothes when returning to the morro (Z < 21)!
  setNPCBeachOutfit(npc, isBeach) {
    if (npc.isBarraqueiro || npc.role === 'Jogador da Pelada' || npc.isScenicMirante) return;
    if (npc.isBuilder || npc.isCourier) return;

    if (isBeach && !npc.isWearingBeachwear) {
      npc.isWearingBeachwear = true;
      npc.torso.material = npc.beachTorsoMat;
      npc.leftLeg.material = npc.beachLegMat;
      npc.rightLeg.material = npc.beachLegMat;
      if (npc.sungaBrief) npc.sungaBrief.visible = true;
      if (npc.beachAccGroup) npc.beachAccGroup.visible = true;
      if (npc.hat) npc.hat.visible = false;
    } else if (!isBeach && npc.isWearingBeachwear) {
      npc.isWearingBeachwear = false;
      npc.torso.material = npc.cityTorsoMat;
      npc.leftLeg.material = npc.cityLegMat;
      npc.rightLeg.material = npc.cityLegMat;
      if (npc.sungaBrief) npc.sungaBrief.visible = false;
      if (npc.beachAccGroup) npc.beachAccGroup.visible = false;
      if (npc.hat) npc.hat.visible = true;
    }
  }

  // DISPATCH WHEELBARROW COURIER FROM OLARIA WITH BRICK SUPPLIES
  dispatchCourierWithSupplies(siteData, onDelivered) {
    const candidates = this.npcs.filter(npc => !npc.isBuilder && !npc.isCourier && !npc.isScenicMirante && !npc.isBarraqueiro && npc.role !== 'Jogador da Pelada');
    if (candidates.length === 0) {
      if (onDelivered) onDelivered();
      return null;
    }

    const olariaPos = { x: -20, z: -14 };
    candidates.sort((a, b) => {
      const da = Math.hypot(a.group.position.x - olariaPos.x, a.group.position.z - olariaPos.z);
      const db = Math.hypot(b.group.position.x - olariaPos.x, b.group.position.z - olariaPos.z);
      return da - db;
    });

    const courier = candidates[0];
    courier.isCourier = true;
    courier.courierState = 'traveling_to_site';
    courier.courierSite = siteData;
    courier.onDelivered = onDelivered;
    courier.waitTimer = 0;
    courier.cartRattleTimer = 0;

    // Equip pushcart & hide tools
    courier.cartGroup.visible = true;
    courier.hat.visible = true;
    courier.builderHelmet.visible = false;
    courier.toolArm.visible = false;

    // Inicia no cais de carga da Olaria
    courier.group.position.set(
      olariaPos.x,
      this.getFloorElevation(olariaPos.x, olariaPos.z),
      olariaPos.z
    );
    courier.currentNodeId = 'olaria_dock';

    // Roteamento inteligente por vias pavimentadas até o lote
    const destRoadNode = this.getNearestRoadNode(siteData.plateau.x, siteData.plateau.z);
    const courierPath = this.findRoadPath('olaria_dock', destRoadNode ? destRoadNode.id : 'olaria_dock');
    courier.pathQueue = courierPath.slice(1);
    if (courier.pathQueue.length > 0) {
      courier.targetNodeId = courier.pathQueue.shift();
      const nextNd = this.roadNodesMap.get(courier.targetNodeId);
      courier.targetPos = nextNd ? nextNd.position.clone() : new THREE.Vector3(siteData.plateau.x, siteData.plateau.y, siteData.plateau.z);
    } else {
      courier.targetPos = new THREE.Vector3(siteData.plateau.x, siteData.plateau.y, siteData.plateau.z);
    }
    courier.speed = 2.6; // brisk pushing pace

    const districtName = siteData.plateau.faction ? siteData.plateau.faction.toUpperCase() : 'o canteiro';
    courier.currentAction = `🚚 Carreto comunitário: transportando tijolos da Olaria para ${districtName}`;

    if (this.soundtrack) {
      this.soundtrack.playCartRattle(courier.group.position);
    }

    return courier;
  }

  // RELEASE COURIER UPON SUPPLY DELIVERY
  releaseCourier(npc) {
    npc.isCourier = false;
    npc.courierState = 'idle';
    npc.courierSite = null;
    npc.onDelivered = null;
    npc.cartGroup.visible = false;
    npc.speed = 1.8 + Math.random() * 0.6;
    npc.currentAction = 'Retornando da entrega de tijolos';

    let nearestWpIdx = 0;
    let minDist = 9999;
    for (let i = 0; i < npc.waypoints.length; i++) {
      const wp = npc.waypoints[i];
      const d = Math.hypot(npc.group.position.x - wp.x, npc.group.position.z - wp.z);
      if (d < minDist) {
        minDist = d;
        nearestWpIdx = i;
      }
    }
    npc.currentWpIndex = nearestWpIdx;
    npc.targetPos = npc.waypoints[nearestWpIdx].clone();
    if (this.terrain) {
      npc.targetPos.y = this.terrain.getElevation(npc.targetPos.x, npc.targetPos.z);
    }
  }

  // RECRUIT REAL CITIZENS FROM THE WORKING POPULATION AS BUILDERS
  recruitWorkersForSite(siteData, count = 2) {
    const candidates = this.npcs.filter(npc => !npc.isBuilder && !npc.isCourier && !npc.isScenicMirante && !npc.isBarraqueiro && npc.role !== 'Jogador da Pelada');
    if (candidates.length === 0) return [];

    // Sort by proximity to site to choose nearby citizens
    candidates.sort((a, b) => {
      const da = Math.hypot(a.group.position.x - siteData.plateau.x, a.group.position.z - siteData.plateau.z);
      const db = Math.hypot(b.group.position.x - siteData.plateau.x, b.group.position.z - siteData.plateau.z);
      return da - db;
    });

    const recruited = candidates.slice(0, count);

    recruited.forEach((npc, idx) => {
      npc.isBuilder = true;
      npc.builderState = 'traveling';
      npc.assignedSite = siteData;
      npc.waitTimer = 0; // Cancel any idle pause immediately

      // Equip builder gear
      npc.builderHelmet.visible = true;
      npc.hat.visible = false;
      npc.toolArm.visible = true;
      npc.torso.material.color.setHex(0xF97316); // High-vis construction safety vest!

      // Assign specific work spot around plot perimeter
      const angle = (idx === 0 ? -0.85 : 0.85) + (Math.random() - 0.5) * 0.3;
      const radius = 2.4;
      const spotX = siteData.plateau.x + Math.sin(angle) * radius;
      const spotZ = siteData.plateau.z + Math.cos(angle) * radius;
      const spotY = this.terrain ? this.terrain.getElevation(spotX, spotZ) : siteData.plateau.y;

      npc.workerSpot = new THREE.Vector3(spotX, spotY, spotZ);
      npc.targetPos = npc.workerSpot.clone();
      npc.speed = 2.4; // brisk purposeful stride

      const districtName = siteData.plateau.faction ? siteData.plateau.faction.toUpperCase() : 'novo lote';
      npc.currentAction = `👷 A caminho da obra em ${districtName} com ferramentas de terraplanagem`;
    });

    return recruited;
  }

  // RELEASE WORKERS BACK TO CIVILIAN LIFE UPON PROJECT COMPLETION
  releaseWorker(npc) {
    npc.isBuilder = false;
    npc.builderState = 'idle';
    npc.assignedSite = null;
    npc.workerSpot = null;
    npc.cheerTimer = 0;

    // Unequip gear and restore civilian clothing
    npc.builderHelmet.visible = false;
    npc.hat.visible = true;
    npc.toolArm.visible = false;
    npc.toolArm.rotation.set(0, 0, 0);
    npc.torso.rotation.set(0, 0, 0);
    npc.torso.material.color.setHex(npc.originalColor);

    npc.speed = 1.8 + Math.random() * 0.6;

    // Connect smoothly to nearest street waypoint
    let nearestWpIdx = 0;
    let minDist = 9999;
    for (let i = 0; i < npc.waypoints.length; i++) {
      const wp = npc.waypoints[i];
      const d = Math.hypot(npc.group.position.x - wp.x, npc.group.position.z - wp.z);
      if (d < minDist) {
        minDist = d;
        nearestWpIdx = i;
      }
    }
    npc.currentWpIndex = nearestWpIdx;
    npc.targetPos = npc.waypoints[nearestWpIdx].clone();
    npc.targetPos.y = this.getFloorElevation(npc.targetPos.x, npc.targetPos.z);
    npc.currentAction = 'Retornando à rotina comunitária após entrega da obra';
  }

  createKiteMesh() {
    const kiteGroup = new THREE.Group();

    // Losango carioca tradicional: 4 triângulos
    const kiteGeo = new THREE.BufferGeometry();
    const positions = new Float32Array([
      0, 0.65, 0,   0.42, 0.1, 0,   0, 0.1, 0,
      0, 0.65, 0,   0, 0.1, 0,   -0.42, 0.1, 0,
      0, 0.1, 0,    0.42, 0.1, 0,   0, -0.65, 0,
      -0.42, 0.1, 0, 0, 0.1, 0,    0, -0.65, 0
    ]);
    kiteGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    kiteGeo.computeVertexNormals();

    const kiteColors = [0xEF4444, 0x3B82F6, 0x10B981, 0xF59E0B];
    const pickedColor = kiteColors[Math.floor(Math.random() * kiteColors.length)];
    const kiteMat = new THREE.MeshLambertMaterial({
      color: pickedColor,
      side: THREE.DoubleSide,
      flatShading: true
    });
    const kiteMesh = new THREE.Mesh(kiteGeo, kiteMat);
    kiteGroup.add(kiteMesh);

    // Cruzeta de varetas
    const woodMat = new THREE.MeshBasicMaterial({ color: 0xD97706 });
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 3), woodMat);
    kiteGroup.add(spine);
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.88, 3), woodMat);
    arch.rotation.z = Math.PI / 2;
    arch.position.y = 0.1;
    kiteGroup.add(arch);

    // Rabiola com fitilhos
    const ribbonMat = new THREE.MeshBasicMaterial({ color: 0xFACC15 });
    for (let r = 1; r <= 3; r++) {
      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.02), ribbonMat);
      ribbon.position.set(0, -0.65 - r * 0.28, 0);
      kiteGroup.add(ribbon);
    }

    return kiteGroup;
  }

  createKiteLine() {
    const lineMat = new THREE.LineBasicMaterial({ color: 0xCBD5E1, transparent: true, opacity: 0.65 });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 10, 0)
    ]);
    return new THREE.Line(lineGeo, lineMat);
  }

  updateKite(delta) {
    const time = performance.now() * 0.003;
    const isDayOrSunset = this.env ? (this.env.timeOfDay === 'day' || this.env.timeOfDay === 'sunset') : true;

    if (this.kiteSystem.activeKite) {
      this.kiteSystem.timer -= delta;
      const flyer = this.kiteSystem.flyerNPC;

      if (!flyer || !flyer.group || this.kiteSystem.timer <= 0 || !isDayOrSunset) {
        this.cleanKite();
        return;
      }

      const fPos = flyer.group.position;
      const kiteMesh = this.kiteSystem.kiteMesh;
      const lineMesh = this.kiteSystem.lineMesh;

      const kX = fPos.x + 3.8 + Math.sin(time * 2.5) * 0.9;
      const kY = fPos.y + 14.5 + Math.sin(time * 1.8) * 0.5;
      const kZ = fPos.z + 6.0 + Math.cos(time * 2.0) * 0.7;

      kiteMesh.position.set(kX, kY, kZ);
      kiteMesh.rotation.z = Math.sin(time * 3.2) * 0.22;
      kiteMesh.rotation.y = 0.2 + Math.sin(time * 1.5) * 0.15;

      const handPos = new THREE.Vector3(fPos.x + 0.25, fPos.y + 1.2, fPos.z);
      const positions = lineMesh.geometry.attributes.position.array;
      positions[0] = handPos.x;
      positions[1] = handPos.y;
      positions[2] = handPos.z;
      positions[3] = kX;
      positions[4] = kY - 0.2;
      positions[5] = kZ;
      lineMesh.geometry.attributes.position.needsUpdate = true;
      return;
    }

    this.kiteSystem.cooldown -= delta;
    if (this.kiteSystem.cooldown <= 0 && isDayOrSunset) {
      this.kiteSystem.cooldown = 45.0 + Math.random() * 30.0;
      if (Math.random() < 0.35) {
        this.triggerAutonomousKite();
      }
    }
  }

  triggerAutonomousKite() {
    const candidates = this.npcs.filter(n =>
      !n.isBuilder && !n.isCourier && !n.isBarraqueiro && !n.isScenicMirante &&
      !n.isSitting && !n.chatPartner && n.role !== 'Jogador da Pelada' &&
      (!n.sambaState || !n.sambaState.isParticipant) &&
      n.group.position.z <= 0 && n.group.position.y >= 7.0
    );

    if (candidates.length === 0) return;

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    chosen.isFlyingKite = true;
    chosen.waitTimer = 22.0;

    const kiteMesh = this.createKiteMesh();
    const lineMesh = this.createKiteLine();
    this.group.add(kiteMesh);
    this.group.add(lineMesh);

    this.kiteSystem.activeKite = true;
    this.kiteSystem.timer = 22.0;
    this.kiteSystem.flyerNPC = chosen;
    this.kiteSystem.kiteMesh = kiteMesh;
    this.kiteSystem.lineMesh = lineMesh;

    if (this.simulation && Math.random() < 0.5) {
      this.simulation.addEvent(`🪁 Vento favorável na colina! ${chosen.citizenName} subiu para empinar pipa sobre as lajes.`, 'culture');
    }
  }

  cleanKite() {
    if (this.kiteSystem.kiteMesh) {
      this.group.remove(this.kiteSystem.kiteMesh);
      this.kiteSystem.kiteMesh = null;
    }
    if (this.kiteSystem.lineMesh) {
      this.group.remove(this.kiteSystem.lineMesh);
      this.kiteSystem.lineMesh = null;
    }
    if (this.kiteSystem.flyerNPC) {
      const flyer = this.kiteSystem.flyerNPC;
      flyer.isFlyingKite = false;
      flyer.waitTimer = 1.0;
      if (flyer.rightArm) flyer.rightArm.rotation.x = 0;
      if (flyer.leftArm) flyer.leftArm.rotation.x = 0;
      if (flyer.head) flyer.head.rotation.x = 0;
      flyer.currentAction = 'Enrolando a linha da pipa e voltando à rotina comunitária';
      this.kiteSystem.flyerNPC = null;
    }
    this.kiteSystem.activeKite = false;
  }

  update(delta) {
    // Clamping defensivo de delta-time para garantir 60 FPS fluidos em 1x, 2x e 5x
    const clampedDelta = Math.min(delta, 0.20);
    const subSteps = clampedDelta > 0.07 ? 2 : 1;
    const subDelta = clampedDelta / subSteps;

    for (let step = 0; step < subSteps; step++) {
      this.updateStep(subDelta);
    }

    this.updateKite(clampedDelta);
  }

  updateStep(delta) {
    const time = performance.now() * 0.003;

    this.npcs.forEach(npc => {
      // 1. Manter pés firmemente apoiados no piso/lajes/deck
      if (npc.builderState !== 'celebrating') {
        const groundY = this.getFloorElevation(npc.group.position.x, npc.group.position.z);
        npc.group.position.y = groundY;
      }

      // 1b. BARREIRA FÍSICA INCONDICIONAL DO PENHASCO FRONTAL DO MORRO DO SOL
      // Impede 100% que qualquer cidadão escorregue, caminhe ou caia na face vertical frontal
      const px = npc.group.position.x;
      const pz = npc.group.position.z;
      if (px >= -12.5 && px <= 12.5 && pz >= 3.0 && pz <= 16.8) {
        if (pz < 9.5) {
          npc.group.position.z = 2.4; // Retém no platô, dentro do Terreiro/Mirante
        } else {
          npc.group.position.z = 17.6; // Retém na base, no calçadão litorâneo
        }
      }

      // 1c. MORADOR SENTADO (Boteco de Calçada ou Banco da Alameda)
      if (npc.isSitting) {
        npc.sittingTimer = (npc.sittingTimer || 0) - delta;
        if (npc.leftLeg) npc.leftLeg.rotation.x = -1.45;
        if (npc.rightLeg) npc.rightLeg.rotation.x = -1.45;
        if (npc.leftArm) npc.leftArm.rotation.x = -0.4;
        if (npc.rightArm) npc.rightArm.rotation.x = -0.4;
        if (npc.torso) npc.torso.rotation.x = 0.05;

        if (npc.sittingTimer <= 0) {
          if (npc.sittingSpot) npc.sittingSpot.isOccupied = false;
          npc.isSitting = false;
          npc.sittingSpot = null;
          npc.waitTimer = 1.0;
          if (npc.leftLeg) npc.leftLeg.rotation.x = 0;
          if (npc.rightLeg) npc.rightLeg.rotation.x = 0;
          if (npc.leftArm) npc.leftArm.rotation.x = 0;
          if (npc.rightArm) npc.rightArm.rotation.x = 0;
          npc.currentAction = 'Retomando a caminhada pelas ruas da colina';
        }
        return;
      }

      // 1d. MORADOR EMPINANDO PIPA NA LAJE/CRISTA
      if (npc.isFlyingKite) {
        if (npc.rightArm) npc.rightArm.rotation.x = -1.25 + Math.sin(time * 3) * 0.08;
        if (npc.head) npc.head.rotation.x = -0.45;
        if (npc.leftArm) npc.leftArm.rotation.x = -0.35;
        npc.currentAction = '🪁 Empinando pipa no céu da colina aproveitando a brisa favorável';
        return;
      }

      // 2. BARRAQUEIRO BEHAVIOR (Comércio nas Barracas da Praia)
      if (npc.isBarraqueiro) {
        // Subtle food/drink prep animation behind the counter
        npc.torso.rotation.x = Math.sin(time * 3 + npc.walkCycle) * 0.06;
        npc.torso.rotation.y = Math.sin(time * 2 + npc.walkCycle) * 0.08;

        if (npc.assignedStall) {
          const cSpot = npc.assignedStall.customerSpot;
          // Check for nearby customers at customerSpot
          const customer = this.npcs.find(other => 
            other !== npc && !other.isBarraqueiro && 
            Math.hypot(other.group.position.x - cSpot.x, other.group.position.z - cSpot.z) < 2.5
          );

          if (customer) {
            npc.currentAction = `Atendendo ${customer.citizenName} com ${npc.assignedStall.product}`;
            customer.currentAction = `Aproveitando ${npc.assignedStall.product} na praia`;

            npc.saleTimer = (npc.saleTimer || 0) + delta;
            if (npc.saleTimer > 6.0) {
              npc.saleTimer = 0;
              if (this.soundtrack && this.soundtrack.playBeachCommerceSound) {
                this.soundtrack.playBeachCommerceSound(cSpot);
              }
              if (this.arch && this.arch.spawnConstructionPuff) {
                this.arch.spawnConstructionPuff(cSpot);
              }
            }
          } else {
            npc.currentAction = `Organizando a ${npc.assignedStall.name} e aguardando fregueses`;
          }
        }
        return;
      }

      // 2b. PERSONAGENS CÊNICOS DEDICADOS (Alameda das Flores, Terreiro de Samba & Mirante Sul)
      if (npc.isScenicMirante) {
        if (npc.isMusician) {
          // Tião do Cavaco: ginga e dedilhado rítmico no cavaquinho
          if (npc.cavacoGroup) {
            npc.cavacoGroup.rotation.z = -0.65 + Math.sin(time * 6) * 0.06;
          }
          if (npc.torso) {
            npc.torso.rotation.x = 0.08 + Math.sin(time * 3) * 0.04;
            npc.torso.rotation.y = Math.sin(time * 4) * 0.06;
          }
          if (npc.leftArm) npc.leftArm.rotation.x = -0.60 + Math.sin(time * 6) * 0.14;
          if (npc.rightArm) npc.rightArm.rotation.x = 0.38 + Math.sin(time * 12) * 0.28;
          if (npc.head) npc.head.rotation.x = Math.sin(time * 3) * 0.08;
          npc.currentAction = '🎶 Tocando cavaquinho com harmonia e ginga na roda de samba';
        } else if (npc.name === 'Dona Teresa' || (npc.role && npc.role.title === 'Florista da Alameda')) {
          // Dona Teresa cuidando dos canteiros de flores da Alameda
          if (npc.torso) {
            npc.torso.rotation.y = Math.sin(time * 1.8) * 0.18;
          }
          if (npc.leftArm) npc.leftArm.rotation.x = -0.25 + Math.sin(time * 2.5) * 0.22;
          if (npc.rightArm) npc.rightArm.rotation.x = 0.20 + Math.cos(time * 2.8) * 0.20;
          npc.currentAction = '🌺 Cuidando com carinho dos canteiros floridos da Alameda';
        } else {
          // Seu Agenor no Mirante Sul com vista panorâmica pro oceano
          if (npc.torso) npc.torso.rotation.x = 0.12;
          if (npc.rightArm) npc.rightArm.rotation.x = -0.25 + Math.sin(time * 1.5) * 0.18;
          npc.currentAction = '🌊 Contemplando a brisa e a vista panorâmica do oceano no Mirante Sul';
        }
        return;
      }

      // 3. WHEELBARROW COURIER LOGISTICS (Carreto de Tijolos)
      if (npc.isCourier) {
        // Rotate wheel continuously while moving
        npc.cartWheel.rotation.x += delta * 14;

        // Periodic cart rattle sound
        npc.cartRattleTimer += delta;
        if (npc.cartRattleTimer >= 2.4) {
          npc.cartRattleTimer = 0;
          if (this.soundtrack) {
            this.soundtrack.playCartRattle(npc.group.position);
          }
        }

        const dirX = npc.targetPos.x - npc.group.position.x;
        const dirZ = npc.targetPos.z - npc.group.position.z;
        const dist = Math.hypot(dirX, dirZ);

        if (dist < 1.4) {
          if (npc.pathQueue && npc.pathQueue.length > 0) {
            npc.currentNodeId = npc.targetNodeId;
            npc.targetNodeId = npc.pathQueue.shift();
            const nxt = this.roadNodesMap.get(npc.targetNodeId);
            if (nxt) npc.targetPos = nxt.position.clone();
          } else {
            // Chegou à via mais próxima da obra, caminha os últimos metros até a laje
            const siteTarget = new THREE.Vector3(npc.courierSite.plateau.x, npc.courierSite.plateau.y, npc.courierSite.plateau.z);
            const distFinal = Math.hypot(siteTarget.x - npc.group.position.x, siteTarget.z - npc.group.position.z);
            if (distFinal < 2.2) {
              const onDelivered = npc.onDelivered;
              this.releaseCourier(npc);
              if (onDelivered) onDelivered();
              return;
            } else {
              npc.targetPos = siteTarget;
            }
          }
        } else {
          const normX = dirX / dist;
          const normZ = dirZ / dist;
          npc.group.position.x += normX * npc.speed * delta;
          npc.group.position.z += normZ * npc.speed * delta;

          npc.group.rotation.y = Math.atan2(normX, normZ);

          npc.walkCycle += delta * 9;
          const swing = Math.sin(npc.walkCycle) * 0.48;
          npc.leftLeg.rotation.x = swing;
          npc.rightLeg.rotation.x = -swing;
        }
        return;
      }

      // 3. JOGADOR DA PELADA (Pelada no Campinho de Várzea com Bola Rolando)
      if (npc.role === 'Jogador da Pelada') {
        if (this.arch && this.arch.soccerBall) {
          const ball = this.arch.soccerBall;

          // Goal celebration if goal was recently scored
          if (this.arch.soccerGoalCooldown > 1.2) {
            const baseGroundY = this.terrain ? this.terrain.getElevation(npc.group.position.x, npc.group.position.z) : 3.7;
            npc.group.position.y = baseGroundY + Math.abs(Math.sin(time * 16 + npc.walkCycle)) * 0.4;
            npc.currentAction = `🎉 Comemorando o golaço no campinho pelo time ${npc.team === 'yellow' ? 'Amarelo' : 'Azul'}!`;
            return;
          }

          if (npc.kickTimer > 0) {
            npc.kickTimer -= delta;
          }

          const distToBall = Math.hypot(ball.position.x - npc.group.position.x, ball.position.z - npc.group.position.z);

          // Dynamic Kicking (Reach expanded to 1.95m so players never get stuck outside kick distance)
          if (distToBall < 1.95 && npc.kickTimer <= 0) {
            npc.kickTimer = 0.65 + Math.random() * 0.45;

            // Yellow attacks toward East goal (x = 65), Blue attacks toward West goal (x = 45)
            const targetGoalX = (npc.team === 'yellow') ? 65.0 : 45.0;
            const targetGoalZ = 4.0 + (Math.random() - 0.5) * 3.6;

            let kx = targetGoalX - ball.position.x;
            let kz = targetGoalZ - ball.position.z;
            const kLen = Math.hypot(kx, kz) || 1;
            kx /= kLen;
            kz /= kLen;

            // Punchy kick with variable force
            const kickForce = 7.5 + Math.random() * 4.2;
            this.arch.kickSoccerBall(kx, kz, kickForce);

            // Animate kick swing
            npc.rightLeg.rotation.x = -1.25;
            npc.currentAction = `⚽ Chute a gol do time ${npc.team === 'yellow' ? 'Amarelo Canário' : 'Azul Guanabara'}!`;
          } else {
            if (npc.kickTimer > 0) {
              // Post-kick jockey / repositioning: face ball and take slight backsteps to open space
              const faceAngle = Math.atan2(ball.position.x - npc.group.position.x, ball.position.z - npc.group.position.z);
              npc.group.rotation.y = faceAngle;
              const backX = -Math.sin(faceAngle);
              const backZ = -Math.cos(faceAngle);
              npc.group.position.x += backX * 1.1 * delta;
              npc.group.position.z += backZ * 1.1 * delta;
              npc.currentAction = `⚽ Marcando posição após o passe (${npc.team === 'yellow' ? 'Amarelo' : 'Azul'})`;
            } else {
              // Run aggressively towards the ball!
              // Approach with slight tactical offset behind ball relative to attacking direction
              const attackOffsetX = (npc.team === 'yellow') ? -0.35 : 0.35;
              const lateralOffset = (npc.id.endsWith('1') || npc.id.endsWith('3')) ? 0.35 : -0.35;
              const tx = ball.position.x + attackOffsetX;
              const tz = Math.max(-1.5, Math.min(9.5, ball.position.z + lateralOffset));

              const dx = tx - npc.group.position.x;
              const dz = tz - npc.group.position.z;
              const d = Math.hypot(dx, dz);

              if (d > 0.05) {
                const nx = dx / d;
                const nz = dz / d;
                npc.group.position.x += nx * 3.4 * delta;
                npc.group.position.z += nz * 3.4 * delta;
                npc.group.rotation.y = Math.atan2(nx, nz);

                npc.walkCycle += delta * 14;
                const swing = Math.sin(npc.walkCycle) * 0.70;
                npc.leftLeg.rotation.x = swing;
                npc.rightLeg.rotation.x = -swing;
              }
              npc.currentAction = `⚽ Disputando a bola no campinho pelo time ${npc.team === 'yellow' ? 'Amarelo' : 'Azul'}`;
            }

            // Keep players strictly bounded inside pitch field limits
            npc.group.position.x = Math.max(45.5, Math.min(64.5, npc.group.position.x));
            npc.group.position.z = Math.max(-1.8, Math.min(9.8, npc.group.position.z));
          }
          return;
        }
      }

      // 4. RODA DE SAMBA NA PRAÇA CENTRAL (Noites Cariocas & Pôr do Sol Festivo!)
      const curTime = this.env ? this.env.getTimeOfDay() : 'day';
      const curPhase = (typeof curTime === 'string') ? curTime : (curTime.phase || 'day');
      const isNightOrSunset = (curPhase === 'night' || curPhase === 'sunset');

      if (isNightOrSunset && npc.sambaState && npc.sambaState.isParticipant && !npc.isBuilder && !npc.isCourier && !npc.isBarraqueiro && !npc.isScenicMirante && npc.role !== 'Jogador da Pelada') {
        const slot = npc.sambaState.slotIndex;
        // Primeiros 10 sentam (bancos). Próximos 14 ficam de pé.
        const isInner = slot < 10;
        const radius = isInner ? 4.5 : 6.5 + (slot % 2) * 1.2;
        const angle = isInner ? ((slot / 10) * Math.PI * 2) : ((slot / 14) * Math.PI * 2 + Math.PI/10);
        const plazaX = -2.0 + Math.cos(angle) * radius;
        const plazaZ = -4.0 + Math.sin(angle) * radius;
        const plazaY = 14.25;

        // Roteamento em Grafo Viário até o Terreiro de Samba
        const distToSlot = Math.hypot(plazaX - npc.group.position.x, plazaZ - npc.group.position.z);

        if (distToSlot > 1.2) {
          if (!npc.sambaRoutingActive) {
            npc.sambaRoutingActive = true;
            const curId = npc.currentNodeId || (this.getNearestRoadNode(npc.group.position.x, npc.group.position.z) ? this.getNearestRoadNode(npc.group.position.x, npc.group.position.z).id : 'alameda_crossroads');
            const path = this.findRoadPath(curId, 'sol_plaza_center');
            npc.pathQueue = path.slice(1);
            if (npc.pathQueue.length > 0) {
              npc.targetNodeId = npc.pathQueue.shift();
              const nxt = this.roadNodesMap.get(npc.targetNodeId);
              if (nxt) npc.targetPos = nxt.position.clone();
            } else {
              npc.targetPos = new THREE.Vector3(plazaX, plazaY, plazaZ);
            }
          }

          const dToTarget = Math.hypot(npc.targetPos.x - npc.group.position.x, npc.targetPos.z - npc.group.position.z);
          if (dToTarget < 1.2) {
            if (npc.pathQueue && npc.pathQueue.length > 0) {
              npc.currentNodeId = npc.targetNodeId;
              npc.targetNodeId = npc.pathQueue.shift();
              const nxt = this.roadNodesMap.get(npc.targetNodeId);
              if (nxt) npc.targetPos = nxt.position.clone();
            } else {
              npc.targetPos.set(plazaX, plazaY, plazaZ);
            }
          }

          const dirX = npc.targetPos.x - npc.group.position.x;
          const dirZ = npc.targetPos.z - npc.group.position.z;
          const norm = Math.hypot(dirX, dirZ) || 1;
          const sambaSpeed = 3.0;
          npc.group.position.x += (dirX / norm) * sambaSpeed * delta;
          npc.group.position.z += (dirZ / norm) * sambaSpeed * delta;
          npc.group.rotation.y = Math.atan2(dirX, dirZ);

          npc.walkCycle += delta * 12;
          const swing = Math.sin(npc.walkCycle) * 0.55;
          if (npc.leftLeg) npc.leftLeg.rotation.x = swing;
          if (npc.rightLeg) npc.rightLeg.rotation.x = -swing;
          if (npc.leftArm) npc.leftArm.rotation.x = -swing * 0.65;
          if (npc.rightArm) npc.rightArm.rotation.x = swing * 0.65;
          npc.currentAction = (npc.currentNodeId && npc.currentNodeId.startsWith('alameda'))
            ? 'Descendo a Alameda do Samba em direção à festa'
            : 'Subindo as ruas do morro a caminho da roda de samba';
        } else {
          npc.sambaState.isActive = true;
          // Face the campfire center (-2, -4)
          const toFireX = -2.0 - npc.group.position.x;
          const toFireZ = -4.0 - npc.group.position.z;
          npc.group.rotation.y = Math.atan2(toFireX, toFireZ);

          // Rhythmic samba bounce & dance
          const bounce = Math.abs(Math.sin(time * 8.2 + slot)) * 0.22;
          
          if (isInner) {
            // Sentado tocando pandeiro/cavaco
            npc.group.position.y = plazaY + 0.1;
            if (npc.torso) npc.torso.rotation.x = Math.sin(time * 6) * 0.15;
            if (npc.torso) npc.torso.rotation.z = Math.sin(time * 4) * 0.1;
            if (npc.leftArm) npc.leftArm.rotation.x = -0.35 - Math.sin(time * 8.2) * 0.45;
            if (npc.rightArm) npc.rightArm.rotation.x = 0.35 + Math.sin(time * 8.2) * 0.45;
            npc.currentAction = '🎶 Sambando sentado na roda principal';
          } else {
            // De pé dançando (Ginga e Bounce)
            npc.group.position.y = plazaY + bounce;
            if (npc.torso) npc.torso.rotation.x = Math.sin(time * 3 + slot) * 0.1;
            if (npc.torso) npc.torso.rotation.y = Math.sin(time * 4 + slot) * 0.2;
            if (npc.leftLeg) npc.leftLeg.rotation.x = Math.sin(time * 8.2 + slot) * 0.28;
            if (npc.rightLeg) npc.rightLeg.rotation.x = -Math.sin(time * 8.2 + slot) * 0.28;
            if (npc.leftArm) npc.leftArm.rotation.x = 0.35 + Math.sin(time * 8.2 + slot) * 0.45;
            if (npc.rightArm) npc.rightArm.rotation.x = -0.35 - Math.sin(time * 8.2 + slot) * 0.45;
            npc.currentAction = '💃 Curtindo e sambando em pé ao redor da praça';
          }

          // Trigger spatial samba music from the plaza (rate-limited and guarded)
          this.sambaAudioCooldown = (this.sambaAudioCooldown || 0) - delta;
          if (slot === 0 && this.sambaAudioCooldown <= 0 && this.soundtrack && this.soundtrack.playSambaRhythm) {
            this.sambaAudioCooldown = 2.30;
            try {
              this.soundtrack.playSambaRhythm({ x: -2.0, y: plazaY, z: -4.0 });
            } catch (sambaErr) {
              console.warn('Samba audio trigger guarded:', sambaErr);
            }
          }

          if (Math.random() < 0.14) {
            this.spawnSambaSpark({ x: -2.0, y: plazaY + 0.8, z: -4.0 });
          }
        }
        return;
      } else if (!isNightOrSunset && npc.sambaState && npc.sambaState.isActive) {
        npc.sambaState.isActive = false;
        npc.sambaStairStep = undefined;
        npc.currentAction = npc.originalAction;
      }

      // 4b. VIDA NOTURNA NAS RUAS & ENCONTROS NA CALÇADA
      // Moradores que não estão no samba se encontram na frente de casas/postes para bater papo!
      if (isNightOrSunset && !npc.isBuilder && !npc.isCourier && !npc.isBarraqueiro && !npc.isScenicMirante && (!npc.sambaState || !npc.sambaState.isParticipant) && npc.role !== 'Jogador da Pelada') {
        // Se já estiver em conversa ativa com um vizinho:
        if (npc.chatPartner) {
          const partner = npc.chatPartner;
          if (!partner || !partner.group) {
            npc.chatPartner = null;
            return;
          }

          const partnerName = partner.citizenName || 'vizinho';
          const npcName = npc.citizenName || 'morador';
          npc.chatTimer = (npc.chatTimer || 0) + delta;

          // Ambos olham um para o outro
          const dx = partner.group.position.x - npc.group.position.x;
          const dz = partner.group.position.z - npc.group.position.z;
          npc.group.rotation.y = Math.atan2(dx, dz);

          // Animação de conversa brasileira com gesticulação e cabeça acenando
          const animOffset = (npc.citizenName ? npc.citizenName.length : 1);
          if (npc.torso) npc.torso.rotation.y = Math.sin(time * 3.0 + animOffset) * 0.14;
          if (npc.leftArm) npc.leftArm.rotation.x = -0.35 + Math.sin(time * 2.8 + animOffset) * 0.28;
          if (npc.rightArm) npc.rightArm.rotation.x = 0.25 - Math.cos(time * 2.5 + animOffset) * 0.22;
          if (npc.head) npc.head.rotation.x = Math.sin(time * 3.5 + animOffset) * 0.12;

          if (npc.chatTimer > 15.0 || Math.hypot(dx, dz) > 2.8) {
            // Conversa concluída! Despedem-se e voltam a caminhar para suas casas
            npc.currentAction = `Despedindo-se de ${partnerName} e voltando para casa`;
            partner.currentAction = `Despedindo-se de ${npcName} e voltando para casa`;
            npc.chatPartner = null;
            partner.chatPartner = null;
            npc.chatTimer = 0;
            npc.chatCooldown = 35.0;
            partner.chatCooldown = 35.0;
          }
          return;
        }

        // Tenta iniciar uma conversa espontânea com algum vizinho próximo na rua (otimizado sem loop pesado)
        npc.chatCooldown = (npc.chatCooldown || 0) - delta;
        if (npc.chatCooldown <= 0 && Math.random() < 0.02) {
          const randomIdx = Math.floor(Math.random() * this.npcs.length);
          const other = this.npcs[randomIdx];
          if (
            other &&
            other !== npc &&
            !other.chatPartner &&
            !other.isBuilder &&
            !other.isCourier &&
            !other.isBarraqueiro &&
            !other.isScenicMirante &&
            (!other.sambaState || !other.sambaState.isParticipant) &&
            other.role !== 'Jogador da Pelada' &&
            Math.abs(other.group.position.x - npc.group.position.x) < 2.5 &&
            Math.abs(other.group.position.z - npc.group.position.z) < 2.5
          ) {
            npc.chatPartner = other;
            other.chatPartner = npc;
            npc.chatTimer = 0;
            other.chatTimer = 0;
            npc.currentAction = `Conversando na frente de casa com ${other.citizenName}`;
            other.currentAction = `Batendo papo na calçada com ${npc.citizenName}`;
            return;
          }
        }
      }

      // 4. SPECIALIZED BUILDER BEHAVIOR STATE MACHINE
      if (npc.isBuilder) {
        if (npc.builderState === 'traveling') {
          // Walking to construction site
          const dirX = npc.targetPos.x - npc.group.position.x;
          const dirZ = npc.targetPos.z - npc.group.position.z;
          const dist = Math.hypot(dirX, dirZ);

          if (dist < 1.3) {
            // Arrived at construction site!
            npc.builderState = 'working';
            npc.currentAction = 'Modelando o terreno e assentando tijolos';
            npc.leftLeg.rotation.x = 0;
            npc.rightLeg.rotation.x = 0;

            // Rotate towards the center of the plot
            if (npc.assignedSite && npc.assignedSite.plateau) {
              const toCenterX = npc.assignedSite.plateau.x - npc.group.position.x;
              const toCenterZ = npc.assignedSite.plateau.z - npc.group.position.z;
              npc.group.rotation.y = Math.atan2(toCenterX, toCenterZ);
            }
          } else {
            const normX = dirX / dist;
            const normZ = dirZ / dist;
            npc.group.position.x += normX * npc.speed * delta;
            npc.group.position.z += normZ * npc.speed * delta;

            const angle = Math.atan2(normX, normZ);
            npc.group.rotation.y = angle;

            npc.walkCycle += delta * 9;
            const swing = Math.sin(npc.walkCycle) * 0.58;
            npc.leftLeg.rotation.x = swing;
            npc.rightLeg.rotation.x = -swing;
          }
          return;
        }

        if (npc.builderState === 'working') {
          // Standing on site, actively digging/hammering/laying bricks
          npc.leftLeg.rotation.x = 0;
          npc.rightLeg.rotation.x = 0;

          const swingCycle = Math.sin(time * 9 + npc.walkCycle);
          npc.toolArm.rotation.x = swingCycle * 0.85;
          npc.toolArm.rotation.z = Math.sin(time * 4.5) * 0.15;
          npc.torso.rotation.x = Math.max(0, swingCycle * 0.15);
          return;
        }

        if (npc.builderState === 'celebrating') {
          // Celebratory jumping and cheering with arms raised!
          npc.cheerTimer -= delta;
          const baseGroundY = this.terrain ? this.terrain.getElevation(npc.group.position.x, npc.group.position.z) : 0;
          npc.group.position.y = baseGroundY + Math.abs(Math.sin(time * 14 + npc.walkCycle)) * 0.45;

          npc.toolArm.rotation.x = -Math.PI * 0.75 + Math.sin(time * 8) * 0.25;
          npc.torso.rotation.x = -0.1;
          npc.currentAction = '🎉 Comemorando a entrega da nova casa com a comunidade!';

          if (npc.cheerTimer <= 0) {
            this.releaseWorker(npc);
          }
          return;
        }
      }

      // Dynamic Beach Outfit Transition:
      // When stepping onto the sand (Z >= 22), citizens wear swimwear, shades & sun visors!
      // When returning to the morro (Z < 20), they switch back to street clothes.
      if (npc.group.position.z >= 22.0) {
        this.setNPCBeachOutfit(npc, true);
      } else if (npc.group.position.z < 20.0) {
        this.setNPCBeachOutfit(npc, false);
      }

      // 3. Pause/idle timer at waypoints (Civilian routine)
      if (npc.waitTimer > 0) {
        npc.waitTimer -= delta;
        npc.leftLeg.rotation.x = 0;
        npc.rightLeg.rotation.x = 0;
        return;
      }

      // 4. Ciclo Autônomo de Praia (Beach Trip) com Deslocamento Estrito por Ruas
      const beachStalls = [
        { x: -40, z: 46.5, action: 'Comprando água de coco fresca na barraca do Seu Baiano' },
        { x: -10, z: 46.5, action: 'Pedindo mate gelado com biscoito Globo na barraca do Leandro' },
        { x: 20, z: 46.5, action: 'Saboreando tigela de açaí geladinho com banana na barraca do Marcos' },
        { x: 50, z: 46.5, action: 'Pegando pasteis quentinhos de camarão na barraca da Dona Cida' }
      ];

      const beachLeisureSpots = [
        { x: 38, z: 59, action: 'Assistindo à empolgante partida de altinha na areia' },
        { x: -25, z: 56, action: 'Caminhando pela areia fofa sentindo o vento marítimo' },
        { x: 12, z: 66, action: 'Molhando os pés na beira da maré e sentindo a espuma' },
        { x: -50, z: 50, action: 'Relaxando na cadeira de praia sob o guarda-sol' },
        { x: 42, z: 49, action: 'Curtindo o visual do mar sob os guarda-sóis coloridos' },
        { x: -15, z: 65, action: 'Caminhando na beira d\'água apreciando as ondas' }
      ];

      const dirX = npc.targetPos.x - npc.group.position.x;
      const dirZ = npc.targetPos.z - npc.group.position.z;
      const dist = Math.hypot(dirX, dirZ);

      if (npc.beachTrip && !npc.isBuilder && !npc.isCourier && !npc.isBarraqueiro && !npc.isScenicMirante && npc.role !== 'Jogador da Pelada') {
        if (npc.beachTrip.state === 'going_to_beach') {
          if (dist < 1.3) {
            if (npc.pathQueue && npc.pathQueue.length > 0) {
              npc.currentNodeId = npc.targetNodeId;
              npc.targetNodeId = npc.pathQueue.shift();
              const nxt = this.roadNodesMap.get(npc.targetNodeId);
              if (nxt) npc.targetPos = nxt.position.clone();
            } else {
              // Atingiu o calçadão na entrada da praia! Transiciona para areia
              npc.beachTrip.state = 'at_beach';
              npc.beachTrip.beachTimer = 25.0 + Math.random() * 30.0;
              this.setNPCBeachOutfit(npc, true);

              const firstStall = beachStalls[Math.floor(Math.random() * beachStalls.length)];
              const nx = firstStall.x + (Math.random() - 0.5) * 2.0;
              const nz = firstStall.z + (Math.random() - 0.5) * 2.0;
              const ny = this.terrain ? this.terrain.getElevation(nx, nz) : 0.4;
              npc.targetPos = new THREE.Vector3(nx, ny, nz);
              npc.currentAction = firstStall.action;
              npc.waitTimer = 2.0;
              return;
            }
          }
        } else if (npc.beachTrip.state === 'at_beach') {
          npc.beachTrip.beachTimer -= delta;

          if (dist < 1.4) {
            if (!npc.beachTrip.hasPurchased && npc.group.position.z >= 42 && npc.group.position.z <= 50) {
              npc.beachTrip.hasPurchased = true;
              if (this.simulation && this.simulation.addEconomy) {
                this.simulation.addEconomy(5, 'Comércio na orla da praia');
              }
              if (this.arch && this.arch.spawnConstructionPuff) {
                this.arch.spawnConstructionPuff(npc.group.position);
              }
            }

            npc.waitTimer = 3.0 + Math.random() * 4.0;

            if (npc.beachTrip.beachTimer > 8.0) {
              const nextSpot = Math.random() < 0.5 
                ? beachStalls[Math.floor(Math.random() * beachStalls.length)]
                : beachLeisureSpots[Math.floor(Math.random() * beachLeisureSpots.length)];
              const nx = nextSpot.x + (Math.random() - 0.5) * 2.5;
              const nz = Math.min(68, Math.max(30, nextSpot.z + (Math.random() - 0.5) * 2.5));
              const ny = this.terrain ? this.terrain.getElevation(nx, nz) : 0.4;
              npc.targetPos = new THREE.Vector3(nx, ny, nz);
              npc.currentAction = nextSpot.action;
            }
          }

          if (npc.beachTrip.beachTimer <= 0) {
            // Retorno da praia pelas ruas pavimentadas (Prainha ou Várzea)
            const chosenExitId = (npc.group.position.x < 0) ? 'coast_w_3' : 'coast_e_2';
            const hillDestinations = ['spine_1', 'mid_w_3', 'mid_e_3', 'transv_w_2', 'transv_e_2', 'viela_w_2', 'viela_e_2'];
            const targetHillId = hillDestinations[Math.floor(Math.random() * hillDestinations.length)];
            const path = this.findRoadPath(chosenExitId, targetHillId);
            npc.beachTrip.state = 'returning';
            npc.pathQueue = path;
            npc.targetNodeId = npc.pathQueue.shift();
            const nxt = this.roadNodesMap.get(npc.targetNodeId);
            if (nxt) npc.targetPos = nxt.position.clone();
            npc.currentAction = 'Subindo as ruas do morro de volta para a comunidade';
          }
        } else if (npc.beachTrip.state === 'returning') {
          if (dist < 1.3) {
            if (npc.pathQueue && npc.pathQueue.length > 0) {
              npc.currentNodeId = npc.targetNodeId;
              npc.targetNodeId = npc.pathQueue.shift();
              const nxt = this.roadNodesMap.get(npc.targetNodeId);
              if (nxt) npc.targetPos = nxt.position.clone();
            } else {
              npc.beachTrip.state = 'idle';
              npc.beachTrip.hasPurchased = false;
              this.setNPCBeachOutfit(npc, false);
              npc.currentAction = 'Voltando para os afazeres no morro após um dia de praia';
              npc.waitTimer = 1.5;
            }
          }
        }
      }

      // Navegação Ordinária Guiada por Grafo Viário (Arestas Estritas de Ruas)
      if (dist < 1.2 && (!npc.beachTrip || npc.beachTrip.state === 'idle')) {
        npc.waitTimer = 1.0 + Math.random() * 2.5;

        // Oportunidade Orgânica e Esporádica de Sentar (Chance 5% em cadeiras de boteco ou bancos da Alameda)
        if (!npc.isBuilder && !npc.isCourier && !npc.isBarraqueiro && !npc.isScenicMirante && npc.role !== 'Jogador da Pelada' && Math.random() < 0.05) {
          let candidateSpot = null;
          if (this.arch && this.arch.botecoSpots) {
            candidateSpot = this.arch.botecoSpots.find(s => !s.isOccupied && Math.hypot(s.x - npc.group.position.x, s.z - npc.group.position.z) < 3.2);
          }
          if (!candidateSpot && this.arch && this.arch.alamedaBenches) {
            candidateSpot = this.arch.alamedaBenches.find(s => !s.isOccupied && Math.hypot(s.x - npc.group.position.x, s.z - npc.group.position.z) < 3.5);
          }
          if (candidateSpot) {
            candidateSpot.isOccupied = true;
            npc.isSitting = true;
            npc.sittingSpot = candidateSpot;
            npc.sittingTimer = 12.0 + Math.random() * 8.0;
            npc.group.position.set(candidateSpot.x, candidateSpot.y + 0.05, candidateSpot.z);
            npc.group.rotation.y = (candidateSpot.rotY !== undefined ? candidateSpot.rotY : candidateSpot.rot) || 0;
            npc.currentAction = candidateSpot.botecoName
              ? `🥤 Tomando um guaraná gelado no ${candidateSpot.botecoName}`
              : '🌳 Descansando no banco da Alameda sob os pergolados floridos';
            return;
          }
        }

        // Desejo autônomo de ir à praia
        if (npc.beachTrip && !npc.isBuilder && !npc.isCourier && !npc.isBarraqueiro && npc.role !== 'Jogador da Pelada') {
          const nearCoast = (npc.group.position.z >= 12.0);
          const rollBeach = nearCoast ? (Math.random() < 0.28) : (Math.random() < 0.05);

          if (rollBeach) {
            const curId = npc.currentNodeId || (this.getNearestRoadNode(npc.group.position.x, npc.group.position.z) ? this.getNearestRoadNode(npc.group.position.x, npc.group.position.z).id : 'coast_w_3');
            // Cidadãos no alto usam rotas seguras de encosta (Prainha a oeste ou Várzea a leste)
            const chosenEntranceId = (npc.group.position.x < 0) ? 'coast_w_3' : 'coast_e_2';
            const path = this.findRoadPath(curId, chosenEntranceId);
            npc.beachTrip.state = 'going_to_beach';
            npc.pathQueue = path.slice(1);
            if (npc.pathQueue.length > 0) {
              npc.targetNodeId = npc.pathQueue.shift();
              const nxt = this.roadNodesMap.get(npc.targetNodeId);
              if (nxt) npc.targetPos = nxt.position.clone();
            }
            npc.currentAction = 'Descendo pelas ruas urbanas em direção à praia';
            return;
          }
        }

        // Atualiza nó atual e escolhe próximo vizinho conectado
        if (npc.targetNodeId) {
          npc.currentNodeId = npc.targetNodeId;
        } else {
          npc.currentNodeId = (this.getNearestRoadNode(npc.group.position.x, npc.group.position.z) ? this.getNearestRoadNode(npc.group.position.x, npc.group.position.z).id : 'alameda_crossroads');
        }
        const currNode = (this.roadNodesMap && this.roadNodesMap.get(npc.currentNodeId)) || (this.roadNodes ? this.roadNodes[0] : null);

        if (npc.pathQueue && npc.pathQueue.length > 0) {
          npc.targetNodeId = npc.pathQueue.shift();
        } else if (currNode && currNode.neighbors && currNode.neighbors.length > 0) {
          const nonBacktrack = currNode.neighbors.filter(nid => nid !== npc.lastNodeId);
          const pool = (nonBacktrack.length > 0) ? nonBacktrack : currNode.neighbors;
          npc.lastNodeId = npc.currentNodeId;
          npc.targetNodeId = pool[Math.floor(Math.random() * pool.length)];
        } else {
          npc.targetNodeId = npc.currentNodeId;
        }

        const targetNode = (this.roadNodesMap && this.roadNodesMap.get(npc.targetNodeId)) || currNode;
        if (targetNode) {
          const nextWp = targetNode.position.clone();
          if (npc.role !== 'Jogador da Pelada') {
            nextWp.x += (Math.random() - 0.5) * 0.35;
            nextWp.z += (Math.random() - 0.5) * 0.35;
          }
          nextWp.y = this.getFloorElevation(nextWp.x, nextWp.z);
          npc.targetPos = nextWp;

          // Descrições contextuais vivas
          if (targetNode.id.startsWith('alameda')) {
            npc.currentAction = 'Caminhando pela Alameda do Samba sob os pergolados floridos';
          } else if (targetNode.id === 'sol_mirante') {
            npc.waitTimer = 4.0 + Math.random() * 4.0;
            npc.group.rotation.y = 0.0;
            npc.currentAction = 'Apreciando a vista panorâmica do oceano no Mirante Sul da Praça';
          } else if (targetNode.id === 'sol_plaza_center') {
            npc.currentAction = 'Cruzando o tablado central da Praça do Samba';
          } else if (targetNode.id.startsWith('coast')) {
            npc.currentAction = 'Caminhando pelo calçadão litorâneo sentindo a brisa';
          } else if (targetNode.id.startsWith('varzea')) {
            npc.currentAction = 'Passeando pelas ruas da Várzea próximo ao futebol';
          } else if (targetNode.id.startsWith('viela_w') || targetNode.id.startsWith('mid_w')) {
            npc.currentAction = 'Subindo as vielas e escadarias da encosta do Poente';
          } else if (targetNode.id.startsWith('viela_e') || targetNode.id.startsWith('mid_e')) {
            npc.currentAction = 'Caminhando pelas ladeiras da encosta do Levante';
          } else if (targetNode.id.startsWith('mirante_imp')) {
            npc.waitTimer = 5.0 + Math.random() * 4.0;
            npc.currentAction = 'Contemplando a paisagem espetacular no Mirante da Vista Imperial';
          } else {
            npc.currentAction = 'Caminhando pelas ruas pavimentadas da comunidade';
          }
        }
      } else if (dist >= 1.2) {
        const normX = dirX / dist;
        const normZ = dirZ / dist;

        const moveStep = Math.min(dist, npc.speed * delta);
        npc.group.position.x += normX * moveStep;
        npc.group.position.z += normZ * moveStep;

        const angle = Math.atan2(normX, normZ);
        npc.group.rotation.y = angle;

        npc.walkCycle += delta * 8;
        const swing = Math.sin(npc.walkCycle) * 0.55;
        if (npc.leftLeg) npc.leftLeg.rotation.x = swing;
        if (npc.rightLeg) npc.rightLeg.rotation.x = -swing;
        if (npc.leftArm) npc.leftArm.rotation.x = -swing * 0.65;
        if (npc.rightArm) npc.rightArm.rotation.x = swing * 0.65;
      }

      // 4. REAL-TIME OBSTACLE AVOIDANCE & TANGENTIAL WALL SLIDING:
      // Pushes NPC away from house envelopes and glides tangentially around corners
      // Completely prevents NPCs from getting stuck against walls or walking through buildings!
      if (this.arch && this.arch.houses) {
        for (let h = 0; h < this.arch.houses.length; h++) {
          const house = this.arch.houses[h];
          const hx = house.position.x;
          const hz = house.position.z;
          const hy = house.position.y;
          const dx = npc.group.position.x - hx;
          if (Math.abs(dx) > 3.8) continue;
          const dz = npc.group.position.z - hz;
          if (Math.abs(dz) > 3.8) continue;
          const dy = npc.group.position.y - hy;
          if (Math.abs(dy) > 3.5) continue;

          const distSq = dx * dx + dz * dz;
          const minSafeDist = 2.3; // Corrected radius: allows squeezing through 5.5m alleys without bouncing

          if (distSq < minSafeDist * minSafeDist && distSq > 0.0001) {
            const distH = Math.sqrt(distSq);
            // 1. Radial push to perimeter
            const nx = dx / distH;
            const nz = dz / distH;
            npc.group.position.x = hx + nx * minSafeDist;
            npc.group.position.z = hz + nz * minSafeDist;

            // 2. Tangential wall glide around corners
            const tanX = -nz;
            const tanZ = nx;
            const targetDirX = npc.targetPos.x - npc.group.position.x;
            const targetDirZ = npc.targetPos.z - npc.group.position.z;
            const dot = targetDirX * tanX + targetDirZ * tanZ;
            const slideSign = dot >= 0 ? 1 : -1;

            const slideDist = (npc.speed || 1.8) * delta * 1.35;
            npc.group.position.x += tanX * slideSign * slideDist;
            npc.group.position.z += tanZ * slideSign * slideDist;
          }
        }
      }

      // 5. STUCK WATCHDOG SYSTEM:
      // Detects if an NPC has traveled < 0.42m in 2.2s. If stalled, immediately advances waypoint and evades!
      if (!npc.isBuilder && npc.role !== 'Jogador da Pelada') {
        npc.stuckCheckTimer = (npc.stuckCheckTimer || 0) + delta;
        if (npc.stuckCheckTimer >= 2.2) {
          npc.stuckCheckTimer = 0;
          if (npc.waitTimer <= 0 && npc.stuckLastPos) {
            const distTraveled = Math.hypot(
              npc.group.position.x - npc.stuckLastPos.x,
              npc.group.position.z - npc.stuckLastPos.z
            );
            if (distTraveled < 0.42) {
              // Preso em obstáculo: seleciona outro vizinho conectado no grafo viário
              const curId = npc.currentNodeId || (this.getNearestRoadNode(npc.group.position.x, npc.group.position.z) ? this.getNearestRoadNode(npc.group.position.x, npc.group.position.z).id : 'alameda_crossroads');
              const cNode = (this.roadNodesMap && this.roadNodesMap.get(curId)) || null;
              if (cNode && cNode.neighbors && cNode.neighbors.length > 0) {
                npc.targetNodeId = cNode.neighbors[Math.floor(Math.random() * cNode.neighbors.length)];
                const nxt = this.roadNodesMap.get(npc.targetNodeId);
                if (nxt) {
                  npc.targetPos = nxt.position.clone();
                  npc.targetPos.y = this.getFloorElevation(nxt.position.x, nxt.position.z);
                }
              }
              // Impulso sutil de desvio lateral
              npc.group.position.x += (Math.random() - 0.5) * 0.6;
              npc.group.position.z += (Math.random() - 0.5) * 0.6;
            }
          }
          if (!npc.stuckLastPos) npc.stuckLastPos = new THREE.Vector3();
          npc.stuckLastPos.copy(npc.group.position);
        }
      } else if (npc.isBuilder && npc.builderState === 'traveling') {
        npc.stuckCheckTimer = (npc.stuckCheckTimer || 0) + delta;
        if (npc.stuckCheckTimer >= 2.5) {
          npc.stuckCheckTimer = 0;
          if (npc.stuckLastPos) {
            const distTraveled = Math.hypot(
              npc.group.position.x - npc.stuckLastPos.x,
              npc.group.position.z - npc.stuckLastPos.z
            );
            if (distTraveled < 0.4) {
              // Builder caught on corner, evade laterally
              npc.group.position.x += (Math.random() - 0.5) * 2.0;
              npc.group.position.z += (Math.random() - 0.5) * 2.0;
            }
          }
          if (!npc.stuckLastPos) npc.stuckLastPos = new THREE.Vector3();
          npc.stuckLastPos.copy(npc.group.position);
        }
      }

      // 6. SOCCER FIELD PERIMETER FENCE AVOIDANCE:
      // Non-players stay strictly outside the soccer pitch bounding box
      if (npc.role !== 'Jogador da Pelada') {
        const minX = 43.2;
        const maxX = 66.8;
        const minZ = -3.6;
        const maxZ = 11.6;
        const px = npc.group.position.x;
        const pz = npc.group.position.z;

        if (px > minX && px < maxX && pz > minZ && pz < maxZ) {
          const dLeft = px - minX;
          const dRight = maxX - px;
          const dTop = pz - minZ;
          const dBottom = maxZ - pz;
          const minD = Math.min(dLeft, dRight, dTop, dBottom);

          if (minD === dLeft) npc.group.position.x = minX;
          else if (minD === dRight) npc.group.position.x = maxX;
          else if (minD === dTop) npc.group.position.z = minZ;
          else npc.group.position.z = maxZ;
        }
      }
    });

    // Physics Spatial Separation: Otimizado com bounding check Manhattan rápido antes de Math.sqrt (60 FPS fluidos em 1x a 5x)
    const minDist = 0.84;
    const minDistSq = minDist * minDist;
    for (let i = 0; i < this.npcs.length; i++) {
      const n1 = this.npcs[i];
      if (n1.isSitting || n1.isScenicMirante) continue;
      const p1 = n1.group.position;
      for (let j = i + 1; j < this.npcs.length; j++) {
        const n2 = this.npcs[j];
        if (n2.isSitting || n2.isScenicMirante) continue;
        const p2 = n2.group.position;
        const dx = p2.x - p1.x;
        if (Math.abs(dx) > minDist) continue;
        const dz = p2.z - p1.z;
        if (Math.abs(dz) > minDist) continue;
        const dSq = dx * dx + dz * dz;
        if (dSq < minDistSq && dSq > 0.0001) {
          const d = Math.sqrt(dSq);
          const push = (minDist - d) * 0.5;
          const nx = dx / d;
          const nz = dz / d;
          p1.x -= nx * push;
          p1.z -= nz * push;
          p2.x += nx * push;
          p2.z += nz * push;
        }
      }
    }

    // Update Samba campfire celebration sparks
    for (let s = this.sambaSparks.length - 1; s >= 0; s--) {
      const spk = this.sambaSparks[s];
      spk.life -= delta * 1.2;
      spk.mesh.position.addScaledVector(spk.vel, delta);
      if (spk.mesh.material) {
        spk.mesh.material.opacity = Math.max(0, spk.life * 0.7);
      }
      if (spk.life <= 0) {
        this.group.remove(spk.mesh);
        spk.mesh.geometry.dispose();
        spk.mesh.material.dispose();
        this.sambaSparks.splice(s, 1);
      }
    }
  }

  spawnSambaSpark(pos) {
    if (this.sambaSparks.length > 25) return;
    const spark = new THREE.Mesh(this.sharedSparkGeo, this.sharedSparkMat);
    spark.position.set(pos.x + (Math.random() - 0.5) * 0.6, pos.y, pos.z + (Math.random() - 0.5) * 0.6);
    this.group.add(spark);
    this.sambaSparks.push({
      mesh: spark,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.35, 1.2 + Math.random() * 0.8, (Math.random() - 0.5) * 0.35),
      life: 1.4
    });
  }

  clearAll() {
    this.cleanKite();
    if (this.arch && this.arch.botecoSpots) {
      this.arch.botecoSpots.forEach(s => s.isOccupied = false);
    }
    if (this.arch && this.arch.alamedaBenches) {
      this.arch.alamedaBenches.forEach(b => b.isOccupied = false);
    }

    // Limpar moradores
    this.npcs.forEach(n => {
      this.group.remove(n.group);
      if (n.group.geometry) n.group.geometry.dispose();
      // Não damos dispose no material porque eles são compartilhados e genéricos (cores), mas as meshes sim
    });
    this.npcs = [];
    
    // Limpar fogueiras e faíscas
    this.sambaSparks.forEach(s => {
      this.group.remove(s.mesh);
      // Não damos dispose porque a geometria agora é compartilhada!
    });
    this.sambaSparks = [];
  }
}
