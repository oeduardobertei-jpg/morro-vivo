// RoadNetworkData.js
// Fonte única de verdade geométrica para a malha viária pavimentada (18 rotas de asfalto + cruzamentos).
// Usada por Terrain.js (desconflitação de rochas/flora), roads.js (malha 3D sem meios-fios internos),
// hillsides.js e houses.js (recuo de lotes e mobiliário urbano).

export const ROAD_HALF_W = 1.7;
export const ROAD_CURB_W = 0.22;
export const ROAD_TOTAL_HALF_W = ROAD_HALF_W + ROAD_CURB_W; // 1.92m

export const ROAD_ROUTES = [
  // 1. Avenida Beira-Mar (Grande Calçadão Litorâneo: Z = 18.0, X de -285 a +285)
  [
    { x: -285, z: 18.0 }, { x: -245, z: 18.0 }, { x: -205, z: 18.0 }, { x: -165, z: 18.0 },
    { x: -125, z: 18.0 }, { x: -102, z: 18.0 }, { x: -78, z: 18.0 },  { x: -50, z: 18.0 },
    { x: -20, z: 18.0 },  { x: 0, z: 18.0 },    { x: 15, z: 18.0 },   { x: 45, z: 18.0 },
    { x: 75, z: 18.0 },   { x: 102, z: 18.0 },  { x: 125, z: 18.0 },  { x: 165, z: 18.0 },
    { x: 205, z: 18.0 },  { x: 245, z: 18.0 },  { x: 285, z: 18.0 }
  ],
  // 2. Ladeira do Morro do Sol (Subida Central do Morro: Orla -> Colina Sul -> Alameda -> Entroncamento Olaria)
  [
    { x: 15, z: 18.0 },   { x: 22, z: 10.0 },   { x: 24, z: 0.0 },    { x: 20, z: -10.0 },
    { x: 14, z: -18.0 },  { x: -2, z: -19.5 },  { x: -15, z: -18.0 }
  ],
  // 3. Eixo Central da Serra (Continuação suave subindo a encosta oeste até o Platô do Alto da Serra)
  [
    { x: -15, z: -18.0 }, { x: -18, z: -28.0 }, { x: -16, z: -40.0 }, { x: -10, z: -52.0 }, { x: 0, z: -66.0 }
  ],
  // 4. Ladeira da Várzea (Subida Oriental: Polo da Várzea contornando suavemente a encosta leste)
  [
    { x: 75, z: 18.0 },   { x: 85, z: 10.0 },   { x: 82, z: -2.0 },   { x: 78, z: -14.0 },
    { x: 62, z: -22.0 },  { x: 46, z: -26.0 },  { x: 28, z: -32.0 },  { x: 14, z: -46.0 }, { x: 0, z: -66.0 }
  ],
  // 5. Ladeira da Prainha (Subida Ocidental: Porto da Prainha contornando suavemente a encosta oeste)
  [
    { x: -78, z: 18.0 },  { x: -75, z: 14.0 },  { x: -70, z: 2.0 },   { x: -65, z: -10.0 },
    { x: -52, z: -20.0 }, { x: -35, z: -30.0 }, { x: -20, z: -42.0 }, { x: 0, z: -66.0 }
  ],
  // 6. Estrada da Crista & Mirante Imperial (Platô da Serra -> Soleira Sul do Mirante Imperial)
  [
    { x: 0, z: -66.0 },   { x: 16, z: -74.0 },  { x: 32, z: -86.0 },  { x: 46, z: -96.0 }, { x: 50, z: -101.2 }
  ],
  // 7. Estrada da Torre de Rádio (Platô da Serra -> Base Sul da Torre no Cume Norte)
  [
    { x: 0, z: -66.0 },   { x: 0, z: -82.0 },   { x: 0, z: -96.0 },   { x: 0, z: -99.8 }
  ],
  // 8. Trilha Panorâmica da Coroa das Alturas (Conecta Anel Médio Oeste -> Coroa Norte -> Junção Leste (32,-86) sem ponta morta!)
  [
    { x: -48, z: -56.0 }, { x: -36, z: -74.0 }, { x: -24, z: -92.0 }, { x: 0, z: -96.0 },   { x: 24, z: -92.0 }, { x: 32, z: -86.0 }
  ],
  // 9. Estrada das Falésias do Poente (Vale Ocidental — parte limpa em X=-102)
  [
    { x: -102, z: 18.0 }, { x: -118, z: 10.0 }, { x: -135, z: -20.0 }, { x: -154, z: -16.0 },
    { x: -186, z: -22.0 }, { x: -216, z: -34.0 }, { x: -244, z: -22.0 }, { x: -266, z: 6.0 }, { x: -278, z: 18.0 }
  ],
  // 10. Estrada do Vale do Levante (Vale Oriental — parte limpa em X=102 preservando o Ponto de Mototáxi em 92,14)
  [
    { x: 102, z: 18.0 },  { x: 118, z: 10.0 },  { x: 135, z: -20.0 }, { x: 154, z: -16.0 },
    { x: 186, z: -22.0 }, { x: 216, z: -34.0 }, { x: 244, z: -22.0 }, { x: 266, z: 6.0 },  { x: 278, z: 18.0 }
  ],
  // 11. Estrada da Sela da Serra Norte (Contorno norte profundo)
  [
    { x: -116, z: -132.0 }, { x: -62, z: -152.0 }, { x: 0, z: -156.0 }, { x: 62, z: -152.0 }, { x: 116, z: -132.0 }
  ],
  // 12. Ramal da Estação Alta do Bondinho (liga Estrada da Crista à escadaria norte da estação em X=32, Z=-58)
  [
    { x: 16, z: -74.0 }, { x: 25, z: -70.5 }, { x: 32, z: -63.5 }
  ],
  // 13. Subida Noroeste (Vale do Poente -> Vila da Sela Oeste, fechando anel noroeste)
  [
    { x: -154, z: -16.0 }, { x: -162, z: -34.0 }, { x: -158, z: -56.0 },
    { x: -144, z: -80.0 }, { x: -132, z: -108.0 }, { x: -116, z: -132.0 }
  ],
  // 14. Subida Nordeste (Vale do Levante -> Vila da Sela Leste, fechando anel nordeste)
  [
    { x: 154, z: -16.0 }, { x: 162, z: -34.0 }, { x: 158, z: -56.0 },
    { x: 144, z: -80.0 }, { x: 132, z: -108.0 }, { x: 116, z: -132.0 }
  ],
  // 15. Ramal Central da Sela Norte (liga Coroa das Alturas -> Largo/Anfiteatro da Sela)
  [
    { x: 0, z: -96.0 }, { x: 10, z: -104.0 }, { x: 12, z: -120.0 }, { x: 8, z: -138.0 }, { x: 0, z: -156.0 }
  ],
  // 16. Anel Médio Oeste (Ladeira da Prainha -> Largo Oeste -> Sela Poente)
  [
    { x: -35, z: -30.0 }, { x: -48, z: -56.0 }, { x: -66, z: -80.0 }, { x: -96, z: -98.0 }, { x: -136, z: -98.0 }
  ],
  // 17. Anel Médio Leste (Ladeira da Várzea -> Largo Leste -> Sela Levante)
  [
    { x: 46, z: -26.0 }, { x: 54, z: -52.0 }, { x: 68, z: -84.0 }, { x: 96, z: -98.0 }, { x: 136, z: -98.0 }
  ],
  // 18. Ramal Pavimentado da Usina Eco-Solar da Serra (Conecta o Entroncamento Central (0,-66) ao Pórtico Sul do Parque Solar)
  [
    { x: 0, z: -66.0 }, { x: -8.5, z: -68.0 }, { x: -16.5, z: -64.5 }
  ]
];

export const ROAD_TIERS = [
  0, // R1: Av. Beira-Mar
  1, // R2: Ladeira Morro do Sol
  1, // R3: Eixo Central da Serra
  1, // R4: Ladeira da Várzea
  1, // R5: Ladeira da Prainha
  1, // R6: Estrada da Crista
  2, // R7: Estrada da Torre de Rádio
  2, // R8: Coroa das Alturas
  1, // R9: Falésias do Poente
  1, // R10: Vale do Levante
  1, // R11: Sela da Serra Norte
  2, // R12: Ramal Bondinho
  2, // R13: Subida Noroeste
  2, // R14: Subida Nordeste
  2, // R15: Ramal Central Sela Norte
  2, // R16: Anel Médio Oeste
  2, // R17: Anel Médio Leste
  2  // R18: Ramal Parque Solar
];

export const ROAD_JUNCTIONS = [
  { x: 0, z: -66.0, r: 2.35 },
  { x: 16, z: -74.0, r: 2.05 },
  { x: 32, z: -86.0, r: 2.15 },
  { x: 0, z: -96.0, r: 2.15 },
  { x: -15, z: -18.0, r: 2.10 },
  { x: -48, z: -56.0, r: 2.10 },
  { x: -35, z: -30.0, r: 2.05 },
  { x: 46, z: -26.0, r: 2.05 },
  { x: -154, z: -16.0, r: 2.05 },
  { x: 154, z: -16.0, r: 2.05 },
  { x: -116, z: -132.0, r: 2.05 },
  { x: 116, z: -132.0, r: 2.05 },
  { x: 0, z: -156.0, r: 2.15 }
];

export function distToSegment2D(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const l2 = vx * vx + vz * vz;
  if (l2 === 0) return Math.hypot(px - ax, pz - az);
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / l2));
  return Math.hypot(px - (ax + t * vx), pz - (az + t * vz));
}

export function getMinRoadCenterDistance(x, z, excludeRouteIdx = -1) {
  let minD = Infinity;
  for (let r = 0; r < ROAD_ROUTES.length; r++) {
    if (r === excludeRouteIdx) continue;
    const rt = ROAD_ROUTES[r];
    for (let i = 0; i < rt.length - 1; i++) {
      const d = distToSegment2D(x, z, rt[i].x, rt[i].z, rt[i + 1].x, rt[i + 1].z);
      if (d < minD) minD = d;
    }
  }
  return minD;
}

export function getMinRoadEdgeDistance(x, z, excludeRouteIdx = -1) {
  return getMinRoadCenterDistance(x, z, excludeRouteIdx) - ROAD_TOTAL_HALF_W;
}

export function isNearRoad(x, z, clearance = 1.2, excludeRouteIdx = -1) {
  return getMinRoadEdgeDistance(x, z, excludeRouteIdx) < clearance;
}

