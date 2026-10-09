import * as THREE from 'three';

/** Grafo viário: elevação do piso, construção da malha e busca de caminhos. */
export const RoadGraphMixin = {
  // Cálculo Preciso de Altura do Piso:
  // Interpola a superfície exata dos degraus, patamares e tablados para os pés dos NPCs
  getFloorElevation(x, z) {
    // 1. Alameda do Samba (de z: -19.5 até z: -12.8 em torno de x: -2.0)
    // Conecta de forma suave e majestosa a via alta ao Terreiro de Samba
    if (Math.abs(x - (-2.0)) <= 2.8 && z >= -19.8 && z <= -12.8) {
      const yTerr = this.terrain ? this.terrain.getElevation(x, z) : 20.0;
      return yTerr + 0.18;
    }

    // 2. Tablado da Praça do Samba em (-2, -4)
    const distPlaza = Math.hypot(x - (-2.0), z - (-4.0));
    if (distPlaza <= 9.5) {
      const yTerr = this.terrain ? this.terrain.getElevation(-2.0, -4.0) : 24.16;
      return yTerr + 0.35; // Sobre o deck de madeira elevado da praça
    }

    // Padrão: Elevação da malha de terreno
    return this.terrain ? this.terrain.getElevation(x, z) : 0;
  },

  // =========================================================================
  // SISTEMA VIÁRIO TOPOLÓGICO CONECTADO (Versão 3.5.0)
  // Grafo real com arestas estritas ligando exclusivamente ruas, lajes, escadarias e a Alameda.
  // Impede 100% que NPCs saltem de despenhadeiros ou cortem caminho através do relevo.
  // =========================================================================
  buildRoadGraph() {
    const rawNodes = [
      // 1. Morro do Sol & Alameda do Samba (Conexão Monumental via Alameda Norte e Encostas)
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
      { id: 'viela_e_5', x: 72.0, z: -62.0, type: 'viela', desc: 'Viela do Levante 6' },

      // 11. Praias dos Extremos (Prainha Caiçara a Oeste & Esportes/Dunas a Leste)
      { id: 'beach_west_cove', x: -115.0, z: 46.0, type: 'beach_west', desc: 'Prainha dos Pescadores' },
      { id: 'beach_west_boats', x: -92.0, z: 52.0, type: 'beach_west', desc: 'Varadouro das Canoas Caiçaras' },
      { id: 'beach_west_pier', x: -77.8, z: 88.0, type: 'beach_west', desc: 'Píer de Madeira dos Pescadores' },

      { id: 'beach_east_futevolei', x: 78.0, z: 42.0, type: 'beach_east', desc: 'Arena de Futevôlei Carioca' },
      { id: 'beach_east_volei', x: 98.0, z: 44.0, type: 'beach_east', desc: 'Quadra de Vôlei de Praia' },
      { id: 'beach_east_kiosk', x: 116.0, z: 32.0, type: 'beach_east', desc: 'Quiosque do Sol Nascente' },
      { id: 'beach_east_dunes', x: 132.0, z: 46.0, type: 'beach_east', desc: 'Dunas e Coqueiral do Levante' },

      // 12. Expansão 1.2.2: Encostas e Pontos Vivos
      { id: 'west_capoeira', x: -110.0, z: -15.0, type: 'capoeira', desc: 'Mirante do Poente & Terreiro de Capoeira' },
      { id: 'west_horta', x: -92.0, z: -25.0, type: 'horta', desc: 'Horta Comunitária em Socalcos' },
      { id: 'west_trail_foot', x: -105.0, z: 12.0, type: 'trail', desc: 'Trilha de Dormentes da Encosta Oeste' },
      { id: 'east_mototaxi', x: 92.0, z: 14.0, type: 'mototaxi', desc: 'Ponto Central de Mototáxi' },
      { id: 'east_academia', x: 112.0, z: -12.0, type: 'academia', desc: 'Academia ao Ar Livre da Colina' },
      { id: 'east_surf_school', x: 126.0, z: 58.0, type: 'surf', desc: 'Escola de Surfe & Pranchário' }
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

    // 1. Morro do Sol & Alameda do Samba (Conexão Monumental via Alameda Norte e Encostas)
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

    // 10. Conexões das Praias dos Extremos com o Calçadão e Enseadas
    addEdge('coast_far_w_2', 'beach_west_cove');
    addEdge('beach_west_cove', 'beach_west_boats');
    addEdge('beach_west_boats', 'coast_w_2');
    addEdge('coast_w_1', 'beach_west_pier');
    addEdge('beach_west_boats', 'beach_west_pier');

    addEdge('coast_e_3', 'beach_east_futevolei');
    addEdge('beach_east_futevolei', 'beach_east_volei');
    addEdge('coast_e_4', 'beach_east_volei');
    addEdge('coast_far_e_1', 'beach_east_kiosk');
    addEdge('beach_east_volei', 'beach_east_kiosk');
    addEdge('beach_east_kiosk', 'beach_east_dunes');
    addEdge('coast_far_e_2', 'beach_east_dunes');

    // 11. Conexões da Expansão 1.2.2 (Encostas, Terreiro, Horta, Mototáxi, Academia e Surfe)
    addEdge('west_capoeira', 'west_horta');
    addEdge('west_horta', 'viela_w_3');
    addEdge('west_capoeira', 'west_trail_foot');
    addEdge('west_trail_foot', 'coast_far_w_2');
    addEdge('west_trail_foot', 'beach_west_cove');

    addEdge('east_mototaxi', 'coast_e_4');
    addEdge('east_mototaxi', 'mid_e_0');
    addEdge('east_academia', 'mid_e_2');
    addEdge('east_academia', 'viela_e_2');
    addEdge('east_surf_school', 'beach_east_kiosk');
    addEdge('east_surf_school', 'beach_east_dunes');

    this.roadNodes = Array.from(nodeMap.values());
    this.roadNodesMap = nodeMap;
    this.waypoints = this.roadNodes.map(n => n.position);
  },

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
  },

  // Encontra o nó do grafo viário mais próximo de uma coordenada (X, Z), com penalidade de altitude 3D
  getNearestRoadNode(x, z, currentY = null, filterFn = null) {
    if (!this.roadNodes || this.roadNodes.length === 0) return null;
    let best = null;
    let minDist = Infinity;
    for (let i = 0; i < this.roadNodes.length; i++) {
      const n = this.roadNodes[i];
      if (filterFn && !filterFn(n)) continue;
      let d = Math.hypot(n.x - x, n.z - z);
      if (currentY !== null && n.y !== undefined) {
        // Penalidade vertical pesada para impedir que quem está na orla/ladeira selecione nós no cume do penhasco
        const dy = Math.abs(n.y - currentY);
        d += dy * 2.8;
      }
      if (d < minDist) {
        minDist = d;
        best = n;
      }
    }
    return best || this.roadNodes[0];
  }
};
