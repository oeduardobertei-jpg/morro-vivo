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

    // 3. Píer dos Pescadores & Rampa de Acesso em Madeira no Extremo Oeste (x ~ -78)
    if (Math.abs(x - (-78.0)) <= 2.2) {
      if (z >= 73.2 && z <= 96.5) {
        return 1.78; // Superfície firme do pranchão de madeira sobre as águas
      }
      if (z >= 60.8 && z < 73.2) {
        const rampT = Math.max(0, Math.min(1, (z - 60.8) / 12.4));
        return 0.40 + rampT * 1.38; // Sobe suavemente pela rampa de madeira até o deck do píer
      }
    }

    // 4. Deck de Madeira do Mercado Cultural da Várzea
    if (Math.hypot(x - 75.0, z - 4.0) <= 8.5) {
      const yTerr = this.terrain ? this.terrain.getElevation(75.0, 4.0) : 3.8;
      return yTerr + 0.25;
    }

    // 5. Decks Panorâmicos de Madeira nas Encostas, Terreiros & Cume (evita que NPCs afundem ou flutuem)
    if (Math.hypot(x - (-110.0), z - (-15.0)) <= 5.0) {
      return (this.terrain ? this.terrain.getElevation(-110.0, -15.0) : 5.4) + 0.44; // Terreiro de Capoeira
    }
    if (Math.abs(x - (-92.0)) <= 4.6 && Math.abs(z - (-25.0)) <= 3.3) {
      return (this.terrain ? this.terrain.getElevation(-92.0, -25.0) : 8.2) + 0.09; // Horta Comunitária
    }
    if (Math.abs(x - 112.0) <= 5.6 && Math.abs(z - (-12.0)) <= 3.8) {
      return (this.terrain ? this.terrain.getElevation(112.0, -12.0) : 6.2) + 0.25; // Academia ao Ar Livre
    }
    if (Math.hypot(x - (-95.0), z) <= 6.2) {
      return (this.terrain ? this.terrain.getElevation(-95.0, 0.0) : 3.6) + 0.18; // Vila dos Pescadores
    }
    if (Math.hypot(x - (-78.0), z - (-50.0)) <= 7.0) {
      return (this.terrain ? this.terrain.getElevation(-78.0, -50.0) : 10.4) + 0.20; // Mirante das Pipas
    }
    if (Math.hypot(x - 88.0, z - (-48.0)) <= 5.2) {
      return (this.terrain ? this.terrain.getElevation(88.0, -48.0) : 10.2) + 0.20; // Pipódromo do Alto do Levante
    }
    if (Math.hypot(x - 50.0, z - (-110.0)) <= 8.0) {
      return (this.terrain ? this.terrain.getElevation(50.0, -110.0) : 15.4) + 0.30; // Mirante da Vista Imperial
    }
    if (Math.hypot(x - (-95.0), z - (-68.0)) <= 3.7) {
      return (this.terrain ? this.terrain.getElevation(-95.0, -68.0) : 9.8) + 0.15; // Mirante das Falésias do Poente
    }
    if (Math.abs(x - (-88.0)) <= 2.1 && Math.abs(z - (-48.0)) <= 2.1) {
      return (this.terrain ? this.terrain.getElevation(-88.0, -48.0) : 5.2) + 0.22; // Deck da Mesa de Dominó
    }

    // 6. Terraços e Largos dos Núcleos de Bairro Expandidos & Polos Produtivos (ancorados em anchorY = max(yC, yMax - 0.06))
    const getElev = (px, pz) => (this.terrain ? this.terrain.getElevation(px, pz) : 6.0);
    const hubTerraces = [
      { cx: -142.0, cz: -42.0,  hw: 6.0,  hd: 4.5,  off: 0.36 }, // Feirinha do Poente
      { cx: 142.0,  cz: -42.0,  hw: 6.5,  hd: 4.5,  off: 0.36 }, // Quadra de Basquete
      { cx: -32.0,  cz: -102.0, hw: 5.5,  hd: 5.5,  off: 0.36 }, // Coreto da Serra
      { cx: 118.0,  cz: -82.0,  hw: 5.75, hd: 4.25, off: 0.36 }, // Galpão Cultural
      { cx: -118.0, cz: -82.0,  hw: 5.5,  hd: 5.0,  off: 0.36 }, // Terreiro do Jongo
      { cx: 28.0,   cz: -136.0, hw: 5.25, hd: 4.0,  off: 0.36 }, // Mirante Sela Norte
      { cx: -216.0, cz: -14.0,  hw: 6.0,  hd: 5.0,  off: 0.36 }, // Capela Caiçara Poente
      { cx: 216.0,  cz: -14.0,  hw: 6.5,  hd: 5.0,  off: 0.36 }, // Praça da Bocha Levante
      { cx: -66.0,  cz: -132.0, hw: 6.0,  hd: 4.5,  off: 0.36 }, // Sítio Agroecológico Sela
      { cx: -2.0,   cz: -170.0, hw: 6.0,  hd: 4.75, off: 0.36 }, // Anfiteatro Sela Norte
      { cx: -62.0,  cz: -60.0,  hw: 4.5,  hd: 4.5,  off: 0.22 }, // Largo do Ipê Oeste
      { cx: 46.0,   cz: -60.0,  hw: 4.5,  hd: 4.5,  off: 0.22 }, // Largo do Ipê Leste
      { cx: -46.0,  cz: -86.0,  hw: 5.8,  hd: 4.6,  off: 0.24 }, // Pedreira da Serra
      { cx: 118.0,  cz: -48.0,  hw: 5.4,  hd: 4.4,  off: 0.22 }, // Serraria Sustentável
      { cx: 64.0,   cz: -31.0,  hw: 4.8,  hd: 4.1,  off: 0.20 }, // Criação Caipira
      { cx: 96.0,   cz: -28.0,  hw: 6.4,  hd: 5.0,  off: 0.24 }, // Sítio & Pomar Agroflorestal
      { cx: -22.0,  cz: -14.0,  hw: 6.6,  hd: 4.7,  off: 0.18 }, // Olaria Comunitária Central
      { cx: -18.0,  cz: -72.0,  hw: 8.6,  hd: 6.0,  off: 0.36 }  // Parque Solar da Serra
    ];
    for (let i = 0; i < hubTerraces.length; i++) {
      const ht = hubTerraces[i];
      if (Math.abs(x - ht.cx) <= ht.hw && Math.abs(z - ht.cz) <= ht.hd) {
        const yC = getElev(ht.cx, ht.cz);
        const yMax = Math.max(
          yC,
          getElev(ht.cx - ht.hw, ht.cz - ht.hd),
          getElev(ht.cx + ht.hw, ht.cz - ht.hd),
          getElev(ht.cx - ht.hw, ht.cz + ht.hd),
          getElev(ht.cx + ht.hw, ht.cz + ht.hd)
        );
        return Math.max(yC, yMax - 0.06) + ht.off;
      }
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
      { id: 'sol_mirante', x: -1.0, z: 5.6, type: 'mirante', desc: 'Mirante Sul Panorâmico' },
      { id: 'sol_plaza_center', x: -2.0, z: -4.0, type: 'plaza', desc: 'Terreiro de Samba Central' },
      { id: 'sol_plaza_portico', x: -2.0, z: -8.8, type: 'portico', desc: 'Pórtico Norte das Fitinhas' },
      { id: 'alameda_patamar_3', x: -2.0, z: -13.5, type: 'alameda', desc: 'Alameda do Samba (Patamar Alto)' },
      { id: 'alameda_patamar_2', x: -2.0, z: -16.5, type: 'alameda', desc: 'Alameda do Samba (Pérgola das Flores)' },
      { id: 'alameda_crossroads', x: -2.0, z: -19.5, type: 'crossroads', desc: 'Encruzilhada Alta da Alameda' },

      // 2. Ladeira do Morro do Sol (Subida Suave da Orla à Colina Sul e Alameda)
      { id: 'sol_ladeira_1', x: 22.0, z: 10.0, type: 'street', desc: 'Ladeira do Morro do Sol 1' },
      { id: 'sol_ladeira_2', x: 24.0, z: 0.0, type: 'street', desc: 'Ladeira do Morro do Sol 2' },
      { id: 'sol_ladeira_3', x: 20.0, z: -10.0, type: 'street', desc: 'Ladeira do Morro do Sol 3' },
      { id: 'sol_ladeira_4', x: 14.0, z: -18.0, type: 'street', desc: 'Ladeira do Morro do Sol 4' },

      // 3. Eixo Central da Serra & Olaria (Alinhamento Real com a Ladeira de Asfalto)
      { id: 'olaria_dock', x: -20.0, z: -10.5, type: 'industry', desc: 'Cais de Carga da Olaria' },
      { id: 'spine_1', x: -15.0, z: -18.0, type: 'highway', desc: 'Entroncamento Central da Serra' },
      { id: 'spine_2', x: -18.0, z: -28.0, type: 'highway', desc: 'Curva Oeste da Serra' },
      { id: 'spine_mid', x: -16.0, z: -40.0, type: 'highway', desc: 'Subida da Serra Média' },
      { id: 'spine_3', x: -10.0, z: -52.0, type: 'highway', desc: 'Acesso Médio da Serra' },
      { id: 'spine_4', x: 0.0, z: -66.0, type: 'highway', desc: 'Promenade do Parque Solar' },
      { id: 'spine_5', x: 0.0, z: -76.0, type: 'highway', desc: 'Plataforma Solar Alta' },

      // 4. Transversal Central-Oeste
      { id: 'transv_w_0', x: -15.0, z: -18.0, type: 'street', desc: 'Transversal Oeste - Início' },
      { id: 'transv_w_1', x: -28.0, z: -18.0, type: 'street', desc: 'Transversal Oeste - Meio' },
      { id: 'transv_w_2', x: -38.0, z: -15.0, type: 'street', desc: 'Transversal Oeste - Curva' },
      { id: 'transv_w_3', x: -48.0, z: -28.0, type: 'street', desc: 'Transversal Oeste - Descida' },
      { id: 'transv_w_4', x: -65.0, z: -38.0, type: 'street', desc: 'Transversal Oeste - Poente' },

      // 5. Transversal Central-Leste
      { id: 'transv_e_0', x: 15.0, z: -18.0, type: 'street', desc: 'Transversal Leste - Início' },
      { id: 'transv_e_1', x: 28.0, z: -18.0, type: 'street', desc: 'Transversal Leste - Meio' },
      { id: 'transv_e_2', x: 38.0, z: -15.0, type: 'street', desc: 'Transversal Leste - Curva' },
      { id: 'transv_e_3', x: 48.0, z: -28.0, type: 'street', desc: 'Transversal Leste - Descida' },
      { id: 'transv_e_4', x: 65.0, z: -38.0, type: 'street', desc: 'Transversal Leste - Levante' },

      // 6. Ladeira da Prainha / Encosta Oeste (100% fiel à Ladeira de Asfalto Rota 5)
      { id: 'mid_w_0', x: -78.0, z: 18.0, type: 'street', desc: 'Início Ladeira da Prainha' },
      { id: 'mid_w_1', x: -75.0, z: 14.0, type: 'street', desc: 'Ladeira da Prainha Baixa' },
      { id: 'mid_w_2', x: -70.0, z: 2.0, type: 'street', desc: 'Ladeira da Prainha Média-Baixa' },
      { id: 'mid_w_3', x: -65.0, z: -10.0, type: 'street', desc: 'Ladeira da Prainha Média' },
      { id: 'mid_w_4', x: -52.0, z: -20.0, type: 'street', desc: 'Ladeira da Prainha Curva' },
      { id: 'mid_w_5', x: -35.0, z: -30.0, type: 'street', desc: 'Ladeira da Prainha Alta' },
      { id: 'mid_w_6', x: -20.0, z: -42.0, type: 'street', desc: 'Aproximação Serra Oeste' },

      // 7. Ladeira da Várzea / Encosta Leste (100% fiel à Ladeira de Asfalto Rota 4)
      { id: 'mid_e_0', x: 75.0, z: 18.0, type: 'street', desc: 'Início Ladeira da Várzea' },
      { id: 'mid_e_1', x: 85.0, z: 10.0, type: 'street', desc: 'Ladeira da Várzea Baixa' },
      { id: 'mid_e_2', x: 82.0, z: -2.0, type: 'street', desc: 'Ladeira da Várzea Curva 1' },
      { id: 'mid_e_3', x: 78.0, z: -14.0, type: 'street', desc: 'Ladeira da Várzea Média' },
      { id: 'mid_e_4', x: 62.0, z: -22.0, type: 'street', desc: 'Ladeira da Várzea Curva 2' },
      { id: 'mid_e_5', x: 46.0, z: -26.0, type: 'street', desc: 'Ladeira da Várzea Alta' },
      { id: 'mid_e_6', x: 28.0, z: -32.0, type: 'street', desc: 'Ladeira da Várzea Reta Alta' },
      { id: 'mid_e_7', x: 14.0, z: -46.0, type: 'street', desc: 'Aproximação Serra Leste' },

      // 7. Grand Coastal Highway (Z = 18.0 — De X = -280 a X = +280)
      { id: 'coast_exp_w_4', x: -278.0, z: 18.0, type: 'coast', desc: 'Calçadão Extremo Oeste' },
      { id: 'coast_exp_w_3', x: -242.0, z: 18.0, type: 'coast', desc: 'Calçadão das Dunas do Poente' },
      { id: 'coast_exp_w_2', x: -205.0, z: 18.0, desc: 'Calçadão do Vale do Poente', type: 'coast' },
      { id: 'coast_exp_w_1', x: -168.0, z: 18.0, desc: 'Calçadão Poente Novo', type: 'coast' },
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
      { id: 'coast_exp_e_1', x: 168.0, z: 18.0, type: 'coast', desc: 'Calçadão Levante Novo' },
      { id: 'coast_exp_e_2', x: 205.0, z: 18.0, type: 'coast', desc: 'Calçadão do Vale do Levante' },
      { id: 'coast_exp_e_3', x: 242.0, z: 18.0, type: 'coast', desc: 'Calçadão das Dunas do Levante' },
      { id: 'coast_exp_e_4', x: 278.0, z: 18.0, type: 'coast', desc: 'Calçadão Extremo Leste' },

      // 8. Várzea & Mercado Cultural (Perímetro 100% plano contornando o campinho por fora)
      { id: 'varzea_market', x: 75.0, z: 7.6, type: 'market', desc: 'Deck Cultural da Várzea' },
      { id: 'varzea_promenade', x: 55.0, z: 14.5, type: 'street', desc: 'Calçadão do Campinho' },
      { id: 'varzea_west', x: 36.0, z: 14.0, type: 'street', desc: 'Acesso Oeste do Campinho' },

      // 9. Highlands & Mirante Imperial (100% alinhados à Estrada da Crista R6 e Coroa das Alturas R8!)
      { id: 'mirante_imp_0', x: 50.0, z: -101.2, type: 'mirante', desc: 'Pórtico do Mirante Imperial' },
      { id: 'mirante_imp_1', x: 46.4, z: -110.0, type: 'mirante', desc: 'Luneta Poente' },
      { id: 'mirante_imp_2', x: 53.6, z: -110.0, type: 'mirante', desc: 'Luneta Levante' },
      { id: 'mirante_imp_center', x: 50.0, z: -111.0, type: 'mirante', desc: 'Rosa dos Ventos' },
      { id: 'crest_mid_e', x: 16.0, z: -74.0, type: 'highway', desc: 'Bifurcação da Crista Leste' },
      { id: 'solar_park_gate', x: -16.5, z: -64.5, type: 'highway', desc: 'Pórtico da Usina Eco-Solar' },
      { id: 'high_crista_w', x: -24.0, z: -92.0, type: 'crista', desc: 'Crista Poente' },
      { id: 'torre_radio', x: 0.0, z: -96.0, type: 'crista', desc: 'Torre de Transmissão' },
      { id: 'high_crista_e', x: 32.0, z: -86.0, type: 'crista', desc: 'Junção da Crista Levante' },

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
      { id: 'beach_west_pier_entry', x: -78.0, z: 58.0, type: 'beach_west', desc: 'Portal de Acesso ao Píer dos Pescadores' },
      { id: 'beach_west_pier', x: -78.0, z: 88.0, type: 'beach_west', desc: 'Píer de Madeira dos Pescadores' },

      { id: 'beach_east_futevolei', x: 78.0, z: 42.0, type: 'beach_east', desc: 'Arena de Futevôlei Carioca' },
      { id: 'beach_east_volei', x: 98.0, z: 44.0, type: 'beach_east', desc: 'Quadra de Vôlei de Praia' },
      { id: 'beach_east_kiosk', x: 116.0, z: 32.0, type: 'beach_east', desc: 'Quiosque do Sol Nascente' },
      { id: 'beach_east_dunes', x: 132.0, z: 46.0, type: 'beach_east', desc: 'Dunas e Coqueiral do Levante' },

      // 12. Expansão 1.2.2: Encostas e Pontos Vivos
      { id: 'west_capoeira', x: -110.0, z: -15.0, type: 'capoeira', desc: 'Mirante do Poente & Terreiro de Capoeira' },
      { id: 'west_horta', x: -92.0, z: -20.8, type: 'horta', desc: 'Horta Comunitária em Socalcos' },
      { id: 'west_trail_foot', x: -105.0, z: 12.0, type: 'trail', desc: 'Trilha de Dormentes da Encosta Oeste' },
      { id: 'east_mototaxi', x: 92.0, z: 14.0, type: 'mototaxi', desc: 'Ponto Central de Mototáxi' },
      { id: 'east_academia', x: 112.0, z: -12.0, type: 'academia', desc: 'Academia ao Ar Livre da Colina' },
      { id: 'east_surf_school', x: 126.0, z: 58.0, type: 'surf', desc: 'Escola de Surfe & Pranchário' },

      // 13. Revitalização dos Flancos (Flanco Oeste / Flanco Leste / Praia Sudeste)
      { id: 'west_domino', x: -88.0, z: -48.0, type: 'leisure', desc: 'Mesa de Dominó do Poente' },
      { id: 'west_rancho_cais', x: -100.0, z: -38.0, type: 'rancho', desc: 'Rancho das Canoas Caiçaras' },
      { id: 'west_trail_high', x: -95.0, z: -68.0, type: 'trail', desc: 'Trilha das Falésias do Poente' },

      { id: 'east_pipodromo', x: 88.0, z: -48.0, type: 'pipodromo', desc: 'Pipódromo do Alto do Levante' },
      { id: 'east_pomar_agro', x: 96.0, z: -22.5, type: 'agro', desc: 'Sítio & Pomar Agroflorestal da Colina' },
      { id: 'east_trail_crista', x: 68.0, z: -84.0, type: 'street', desc: 'Curva Alta do Anel Médio Leste' },

      { id: 'beach_east_lounge', x: 138.0, z: 38.0, type: 'beach_east', desc: 'Deck & Lounge das Dunas' },
      { id: 'beach_east_frescobol', x: 142.0, z: 52.0, type: 'beach_east', desc: 'Arena de Frescobol do Nascente' },
      { id: 'beach_east_breakwater', x: 146.0, z: 70.0, type: 'beach_east', desc: 'Quebra-Mar e Farolete do Nascente' },

      // 14. Expansão Continental Oeste (Vale do Poente: curvas orgânicas X de -140 a -268)
      { id: 'exp_w_1', x: -154.0, z: -16.0, type: 'street', desc: 'Estrada Sinuosa do Vale do Poente' },
      { id: 'exp_w_2', x: -186.0, z: -22.0, type: 'street', desc: 'Largo do Boteco do Poente' },
      { id: 'exp_w_3', x: -216.0, z: -34.0, type: 'street', desc: 'Curva Alta da Vila do Poente' },
      { id: 'exp_w_4', x: -244.0, z: -22.0, type: 'street', desc: 'Mirante Oeste do Pontal' },
      { id: 'exp_w_5', x: -266.0, z: 6.0,   type: 'street', desc: 'Descida Litorânea do Pontal Oeste' },
      { id: 'exp_w_viela_1', x: -188.0, z: -46.0, type: 'viela', desc: 'Beco da Encosta do Poente' },
      { id: 'exp_w_viela_2', x: -176.0, z: -68.0, type: 'viela', desc: 'Viela Sinuosa Noroeste' },
      { id: 'exp_w_viela_3', x: -142.0, z: -108.0, type: 'viela', desc: 'Passagem Noroeste da Serra' },

      // 15. Expansão Continental Leste (Vale do Levante: curvas orgânicas X de 140 a 268)
      { id: 'exp_e_1', x: 154.0, z: -16.0, type: 'street', desc: 'Estrada Sinuosa do Vale do Levante' },
      { id: 'exp_e_2', x: 186.0, z: -22.0, type: 'street', desc: 'Largo do Boteco do Levante' },
      { id: 'exp_e_3', x: 216.0, z: -34.0, type: 'street', desc: 'Curva Alta da Vila do Levante' },
      { id: 'exp_e_4', x: 244.0, z: -22.0, type: 'street', desc: 'Mirante Leste das Dunas' },
      { id: 'exp_e_5', x: 266.0, z: 6.0,   type: 'street', desc: 'Descida Litorânea das Dunas Leste' },
      { id: 'exp_e_viela_1', x: 188.0, z: -46.0, type: 'viela', desc: 'Beco da Encosta do Levante' },
      { id: 'exp_e_viela_2', x: 176.0, z: -68.0, type: 'viela', desc: 'Viela Sinuosa Nordeste' },
      { id: 'exp_e_viela_3', x: 142.0, z: -108.0, type: 'viela', desc: 'Passagem Nordeste da Serra' },

      // 16. Expansão Continental Norte (Anel da Sela da Serra: Z de -122 a -160)
      { id: 'exp_n_w2', x: -116.0, z: -132.0, type: 'crista', desc: 'Vila da Sela — Vertente Poente' },
      { id: 'exp_n_w1', x: -62.0,  z: -152.0, type: 'crista', desc: 'Caminho Sinuoso da Sela Oeste' },
      { id: 'exp_n_center', x: 0.0, z: -156.0, type: 'crista', desc: 'Largo da Venda da Sela da Serra' },
      { id: 'exp_n_e1', x: 62.0,   z: -152.0, type: 'crista', desc: 'Caminho Sinuoso da Sela Leste' },
      { id: 'exp_n_e2', x: 116.0,  z: -132.0, type: 'crista', desc: 'Vila da Sela — Vertente Levante' },

      // 17. Circuito Sela-Vales & Acessos dos Marcos Policêntricos (Sprint 8)
      { id: 'nw_climb_1', x: -160.0, z: -45.0,  type: 'street', desc: 'Subida Noroeste da Feirinha' },
      { id: 'nw_climb_2', x: -140.0, z: -90.0,  type: 'street', desc: 'Curva Noroeste do Jongo' },
      { id: 'ne_climb_1', x: 160.0,  z: -45.0,  type: 'street', desc: 'Subida Nordeste da Quadra' },
      { id: 'ne_climb_2', x: 140.0,  z: -90.0,  type: 'street', desc: 'Curva Nordeste do Galpão' },
      { id: 'sela_spine_1', x: 11.0, z: -124.0, type: 'crista', desc: 'Ramal Central da Sela' },
      { id: 'mid_ring_w_1', x: -52.0, z: -62.0, type: 'street', desc: 'Anel Médio do Poente' },
      { id: 'mid_ring_w_2', x: -96.0, z: -98.0, type: 'street', desc: 'Alto do Jongo Poente' },
      { id: 'mid_ring_e_1', x: 54.0,  z: -56.0, type: 'street', desc: 'Anel Médio do Levante' },
      { id: 'mid_ring_e_2', x: 96.0,  z: -98.0, type: 'street', desc: 'Alto do Galpão Levante' },
      { id: 'hub_capela_poente', x: -216.0, z: -8.5,   type: 'viela',  desc: 'Adro da Capela Caiçara do Poente' },
      { id: 'hub_praca_levante', x: 216.0,  z: -8.5,   type: 'viela',  desc: 'Calçadão da Praça da Bocha' },
      { id: 'hub_sitio_sela',    x: -66.0,  z: -138.5, type: 'viela',  desc: 'Entrada do Sítio Agroecológico' },
      { id: 'hub_anfiteatro_sela', x: -2.0, z: -163.0, type: 'viela',  desc: 'Esplanada do Anfiteatro da Sela' },
      { id: 'hub_pedreira', x: -46.0, z: -78.0, type: 'industry', desc: 'Acesso da Pedreira da Serra' },
      { id: 'hub_serraria', x: 112.0, z: -42.0, type: 'industry', desc: 'Pátio da Serraria Sustentável' },
      { id: 'hub_criacao', x: 64.0, z: -24.0, type: 'agro', desc: 'Acesso da Criação Caipira' }
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

    // 1. Morro do Sol & Alameda do Samba (Acesso exclusivo e seguro pela Alameda Norte — sem atalho pelo penhasco sul!)
    addEdge('sol_mirante', 'sol_plaza_center');
    addEdge('sol_plaza_center', 'sol_plaza_portico');
    addEdge('sol_plaza_portico', 'alameda_patamar_3');
    addEdge('alameda_patamar_3', 'alameda_patamar_2');
    addEdge('alameda_patamar_2', 'alameda_crossroads');

    // 2. Ladeira do Morro do Sol (Subida Suave da Orla à Alameda)
    addEdge('coast_e_1', 'sol_ladeira_1');
    addEdge('sol_ladeira_1', 'sol_ladeira_2');
    addEdge('sol_ladeira_2', 'sol_ladeira_3');
    addEdge('sol_ladeira_3', 'sol_ladeira_4');
    addEdge('sol_ladeira_4', 'alameda_crossroads');

    // 3. Encruzilhada da Alameda com Eixo da Serra, Olaria e Transversais
    addEdge('alameda_crossroads', 'spine_1');
    addEdge('alameda_crossroads', 'olaria_dock');
    addEdge('olaria_dock', 'spine_1');
    addEdge('spine_1', 'spine_2');
    addEdge('spine_2', 'spine_mid');
    addEdge('spine_mid', 'spine_3');
    addEdge('spine_3', 'spine_4');
    addEdge('spine_4', 'spine_5');

    // 4. Transversais
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

    // 5. Ladeira da Prainha / Mid-hill West
    addEdge('mid_w_0', 'mid_w_1');
    addEdge('mid_w_1', 'mid_w_2');
    addEdge('mid_w_2', 'mid_w_3');
    addEdge('mid_w_3', 'mid_w_4');
    addEdge('mid_w_4', 'mid_w_5');
    addEdge('mid_w_5', 'mid_w_6');
    addEdge('mid_w_6', 'spine_4');
    addEdge('mid_w_4', 'transv_w_3');

    // 6. Ladeira da Várzea / Mid-hill East
    addEdge('mid_e_0', 'mid_e_1');
    addEdge('mid_e_1', 'mid_e_2');
    addEdge('mid_e_2', 'mid_e_3');
    addEdge('mid_e_3', 'mid_e_4');
    addEdge('mid_e_4', 'mid_e_5');
    addEdge('mid_e_5', 'mid_e_6');
    addEdge('mid_e_6', 'mid_e_7');
    addEdge('mid_e_7', 'spine_4');
    addEdge('mid_e_4', 'transv_e_3');

    // 6. Coastal Highway Chain
    const coastalChain = [
      'coast_exp_w_4', 'coast_exp_w_3', 'coast_exp_w_2', 'coast_exp_w_1',
      'coast_far_w_1', 'coast_far_w_2', 'coast_w_1', 'coast_w_2', 'coast_w_3', 'coast_w_4', 'coast_w_5', 'coast_w_6',
      'coast_center', 'coast_e_1', 'coast_e_1b', 'coast_e_2', 'coast_e_3', 'coast_e_4', 'coast_far_e_1', 'coast_far_e_2',
      'coast_exp_e_1', 'coast_exp_e_2', 'coast_exp_e_3', 'coast_exp_e_4'
    ];
    for (let c = 0; c < coastalChain.length - 1; c++) {
      addEdge(coastalChain[c], coastalChain[c + 1]);
    }

    // Conexões Encosta <-> Rodovia Litorânea
    addEdge('coast_w_3', 'mid_w_0'); // Prainha
    addEdge('coast_e_2', 'mid_e_0'); // Várzea
    addEdge('coast_e_1b', 'varzea_west');

    // 7. Várzea & Mercado (Conexões perimetrais seguras e planas pelo calçadão)
    addEdge('mid_e_0', 'varzea_market');
    addEdge('varzea_market', 'varzea_promenade');
    addEdge('varzea_promenade', 'varzea_west');
    addEdge('varzea_west', 'coast_e_1b');
    addEdge('varzea_promenade', 'coast_e_2');

    // 8. Highlands & Cristas (Seguindo 100% as pistas de asfalto R6, R7, R8 e R18 — sem cortar por cima de casas!)
    addEdge('spine_4', 'solar_park_gate');
    addEdge('spine_4', 'crest_mid_e');
    addEdge('crest_mid_e', 'high_crista_e');
    addEdge('high_crista_e', 'mirante_imp_0');
    addEdge('mirante_imp_0', 'mirante_imp_1');
    addEdge('mirante_imp_0', 'mirante_imp_2');
    addEdge('mirante_imp_1', 'mirante_imp_center');
    addEdge('mirante_imp_2', 'mirante_imp_center');
    addEdge('spine_5', 'torre_radio');
    addEdge('mid_ring_w_1', 'high_crista_w');
    addEdge('high_crista_w', 'torre_radio');
    addEdge('torre_radio', 'high_crista_e');

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
    addEdge('beach_west_boats', 'coast_w_3');
    addEdge('coast_w_2', 'coast_w_3');
    // Acesso dedicado e limpo ao Píer dos Pescadores (sem estrangular o tráfego do calçadão)
    addEdge('coast_w_3', 'beach_west_pier_entry');
    addEdge('beach_west_pier_entry', 'beach_west_pier');

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

    // 12. Conexões da Revitalização dos Flancos e Praia Sudeste
    addEdge('west_horta', 'west_domino');
    addEdge('west_domino', 'west_rancho_cais');
    addEdge('west_rancho_cais', 'west_trail_high');
    addEdge('west_trail_high', 'viela_w_5');
    addEdge('west_domino', 'viela_w_4');

    addEdge('east_academia', 'east_pomar_agro');
    addEdge('east_pomar_agro', 'east_pipodromo');
    addEdge('east_pipodromo', 'east_trail_crista');
    addEdge('east_trail_crista', 'high_crista_e');
    addEdge('east_pipodromo', 'viela_e_4');

    addEdge('beach_east_dunes', 'beach_east_lounge');
    addEdge('beach_east_lounge', 'beach_east_frescobol');
    addEdge('beach_east_frescobol', 'beach_east_breakwater');
    addEdge('east_surf_school', 'beach_east_frescobol');

    // 13. Conexões da Expansão Continental (Vales Oeste, Leste e Sela Norte)
    addEdge('coast_far_w_1', 'exp_w_1');
    addEdge('coast_exp_w_1', 'exp_w_1');
    addEdge('west_capoeira', 'exp_w_1');
    addEdge('viela_w_3', 'exp_w_1');
    addEdge('exp_w_1', 'exp_w_2');
    addEdge('coast_exp_w_2', 'exp_w_2');
    addEdge('exp_w_2', 'exp_w_3');
    addEdge('coast_exp_w_3', 'exp_w_3');
    addEdge('exp_w_3', 'exp_w_4');
    addEdge('exp_w_4', 'exp_w_5');
    addEdge('exp_w_5', 'coast_exp_w_4');
    addEdge('exp_w_2', 'exp_w_viela_1');
    addEdge('west_domino', 'exp_w_viela_1');
    addEdge('exp_w_viela_1', 'exp_w_viela_2');
    addEdge('viela_w_5', 'exp_w_viela_2');
    addEdge('exp_w_viela_2', 'exp_w_viela_3');
    addEdge('exp_w_viela_3', 'exp_n_w2');

    addEdge('coast_far_e_2', 'exp_e_1');
    addEdge('coast_exp_e_1', 'exp_e_1');
    addEdge('east_academia', 'exp_e_1');
    addEdge('viela_e_3', 'exp_e_1');
    addEdge('exp_e_1', 'exp_e_2');
    addEdge('coast_exp_e_2', 'exp_e_2');
    addEdge('exp_e_2', 'exp_e_3');
    addEdge('coast_exp_e_3', 'exp_e_3');
    addEdge('exp_e_3', 'exp_e_4');
    addEdge('exp_e_4', 'exp_e_5');
    addEdge('exp_e_5', 'coast_exp_e_4');
    addEdge('exp_e_2', 'exp_e_viela_1');
    addEdge('east_pipodromo', 'exp_e_viela_1');
    addEdge('exp_e_viela_1', 'exp_e_viela_2');
    addEdge('viela_e_5', 'exp_e_viela_2');
    addEdge('exp_e_viela_2', 'exp_e_viela_3');
    addEdge('exp_e_viela_3', 'exp_n_e2');

    addEdge('west_trail_high', 'exp_n_w2');
    addEdge('high_crista_w', 'exp_n_w1');
    addEdge('exp_n_w2', 'exp_n_w1');
    addEdge('exp_n_w1', 'exp_n_center');
    addEdge('torre_radio', 'exp_n_center');
    addEdge('exp_n_center', 'exp_n_e1');
    addEdge('exp_n_e1', 'exp_n_e2');
    addEdge('mirante_imp_0', 'exp_n_e1');
    addEdge('east_trail_crista', 'exp_n_e2');

    // 14. Conexões do Circuito Completo Sela <-> Vales <-> Marcos (Sprint 8)
    addEdge('exp_w_1', 'nw_climb_1');
    addEdge('nw_climb_1', 'nw_climb_2');
    addEdge('nw_climb_2', 'exp_n_w2');
    addEdge('exp_e_1', 'ne_climb_1');
    addEdge('ne_climb_1', 'ne_climb_2');
    addEdge('ne_climb_2', 'exp_n_e2');
    addEdge('torre_radio', 'sela_spine_1');
    addEdge('high_crista_e', 'sela_spine_1');
    addEdge('sela_spine_1', 'exp_n_center');
    addEdge('mid_w_5', 'mid_ring_w_1');
    addEdge('mid_ring_w_1', 'mid_ring_w_2');
    addEdge('mid_ring_w_2', 'nw_climb_2');
    addEdge('mid_e_5', 'mid_ring_e_1');
    addEdge('mid_ring_e_1', 'mid_ring_e_2');
    addEdge('mid_ring_e_2', 'ne_climb_2');
    addEdge('exp_w_3', 'hub_capela_poente');
    addEdge('coast_exp_w_2', 'hub_capela_poente');
    addEdge('exp_e_3', 'hub_praca_levante');
    addEdge('coast_exp_e_2', 'hub_praca_levante');
    addEdge('exp_n_w1', 'hub_sitio_sela');
    addEdge('exp_n_center', 'hub_anfiteatro_sela');
    addEdge('mid_ring_w_1', 'hub_pedreira');
    addEdge('high_crista_w', 'hub_pedreira');
    addEdge('east_pipodromo', 'hub_serraria');
    addEdge('viela_e_4', 'hub_serraria');
    addEdge('mid_e_4', 'hub_criacao');
    addEdge('east_pomar_agro', 'hub_criacao');

    this.roadNodes = Array.from(nodeMap.values());
    this.roadNodesMap = nodeMap;
    this.waypoints = this.roadNodes.map(n => n.position);
  },

  // Roteador de Caminhos em Grafo (BFS Ultra-rápido):
  // Garante trajeto 100% contínuo e conectado entre quaisquer dois pontos da cidade.
  // O parâmetro opcional blockedTypes permite que carrinhos de mão e obras evitem atravessar a Praça do Samba.
  findRoadPath(startId, targetId, blockedTypes = null) {
    if (startId === targetId) return [targetId];
    if (!this.roadNodesMap || !this.roadNodesMap.has(startId) || !this.roadNodesMap.has(targetId)) {
      return [targetId];
    }

    const runBfs = (filterSet) => {
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
          if (visited.has(nbr)) continue;
          if (filterSet && nbr !== targetId) {
            const nbrNode = this.roadNodesMap.get(nbr);
            if (nbrNode && filterSet.has(nbrNode.type)) continue;
          }
          visited.add(nbr);
          cameFrom.set(nbr, curr);
          queue.push(nbr);
        }
      }
      return null;
    };

    const filtered = blockedTypes ? runBfs(blockedTypes) : null;
    if (filtered) return filtered;
    return runBfs(null) || [targetId];
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
