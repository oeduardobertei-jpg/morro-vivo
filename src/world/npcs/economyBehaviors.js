import * as THREE from 'three';

/**
 * Módulo de Micro-Economia Orgânica e Comunitária:
 * Simula a circulação real, autônoma e pacífica de moeda entre os cidadãos,
 * feiras livres, barracas de praia, horta e cais dos pescadores.
 */

// Pontos de comércio e convívio econômico permanente no mapa
const COMMERCE_SPOTS = [
  // 1. Barracas Tradicionais da Praia
  { id: 'coco', name: 'Barraca do Coco Verde', x: -40.0, z: 42.8, type: 'stall', district: 'prainha', itemName: 'Coco Gelado' },
  { id: 'mate', name: 'Barraca do Mate & Biscoito Globo', x: -10.0, z: 42.8, type: 'stall', district: 'prainha', itemName: 'Mate Gelado' },
  { id: 'acai', name: 'Barraca do Açaí da Colina', x: 20.0, z: 42.8, type: 'stall', district: 'varzea', itemName: 'Tigela de Açaí' },
  { id: 'petiscos', name: 'Barraca de Frutos do Mar & Petiscos', x: 50.0, z: 42.8, type: 'stall', district: 'varzea', itemName: 'Pastel de Camarão' },

  // 2. Extremos Costeiros & Cais
  { id: 'pier_fish', name: 'Píer dos Pescadores', x: -78.0, z: 74.0, type: 'fishery', district: 'prainha', itemName: 'Pescado Fresco' },
  { id: 'cove_fish', name: 'Rancho Caiçara da Enseada', x: -95.0, z: 0.0, type: 'fishery', district: 'prainha', itemName: 'Peixe Salgado' },

  // 3. Agrofloresta & Horta Comunitária
  { id: 'horta_dona_nair', name: 'Horta Comunitária em Socalcos', x: 82.0, z: -8.0, type: 'farm', district: 'varzea', itemName: 'Cesto de Verduras' },

  // 4. Polo da Várzea: Feira Livre e Mercado Cultural
  { id: 'feira_varzea', name: 'Feira Cultural Comunitária', x: 75.0, z: 4.0, type: 'market', district: 'varzea', itemName: 'Artesanato Local' },

  // 5. Olaria & Cerâmica (Venda de Tijolos)
  { id: 'olaria_centro', name: 'Olaria de Alvenaria da Colina', x: -22.0, z: -14.0, type: 'masonry', district: 'sol', itemName: 'Tijolos Cerâmicos' }
];

export const EconomyBehaviors = {
  /**
   * Atualiza o comportamento de consumo e troca econômica de um NPC
   */
  updateNPCEconomy(npc, delta, arch, simulation, soundtrack) {
    // 1. Decaimento do temporizador de segurar item/bebida
    if (npc.holdingDrinkTimer > 0) {
      npc.holdingDrinkTimer -= delta;
      if (npc.holdingDrinkTimer <= 0) {
        // Se for morador comum (não possui ofício fixo), recolhe o copo
        if (!npc.isFishermanRole && !npc.isFarmerRole && !npc.isMerchantRole && npc.handItem) {
          npc.handItem.visible = false;
        }
      }
    }

    // 2. Não compra se estiver trabalhando como operário ou empinando pipa
    if (npc.isBuilder || npc.isCourier || npc.isKiteFlyer) return;

    // 3. Temporizador de descanso entre compras
    if (npc.purchaseCooldown > 0) {
      npc.purchaseCooldown -= delta;
      return;
    }

    // 4. Detecta aproximação de algum ponto comercial ativo
    const px = npc.group.position.x;
    const pz = npc.group.position.z;

    for (let i = 0; i < COMMERCE_SPOTS.length; i++) {
      const spot = COMMERCE_SPOTS[i];
      const dist = Math.hypot(px - spot.x, pz - spot.z);

      if (dist <= 3.8) {
        // Transação Orgânica disparada!
        this.executeTransaction(npc, spot, arch, simulation, soundtrack);
        break;
      }
    }
  },

  /**
   * Executa a troca espontânea de moeda e produto
   */
  executeTransaction(npc, spot, arch, simulation, soundtrack) {
    const value = Math.floor(Math.random() * 3) + 2; // R$ 2 a R$ 4

    // 1. Animação de parada e gesto afetuoso
    npc.waitTimer = 1.35; // pausa curta para comprar
    if (npc.leftArm) {
      npc.leftArm.rotation.x = -1.1; // braço estendido acolhendo o produto
    }

    // Morador comum passa a segurar o copinho/produto na mão
    if (!npc.isFishermanRole && !npc.isFarmerRole && !npc.isMerchantRole && npc.handItem) {
      npc.handItem.visible = true;
      npc.holdingDrinkTimer = 16.0 + Math.random() * 10.0;
    }

    // 2. Centelha visual de moeda "+$" flutuante
    if (arch && arch.spawnCoinFeedback) {
      arch.spawnCoinFeedback({
        x: (npc.group.position.x + spot.x) * 0.5,
        y: npc.group.position.y,
        z: (npc.group.position.z + spot.z) * 0.5
      });
    }

    // 3. Efeito sonoro aveludado de copo/balcão
    if (soundtrack && soundtrack.playBeachCommerceSound) {
      soundtrack.playBeachCommerceSound(npc.group.position);
    }

    // 4. Impacto Econômico Comunitário Positivo (sem punição)
    if (simulation && simulation.factions && simulation.factions[spot.district]) {
      simulation.factions[spot.district].wealth += value;
    }
    if (simulation && simulation.globalMetrics) {
      simulation.globalMetrics.wealth += value;
    }

    // Aumenta a renda da casa mais próxima do morador
    if (arch && arch.houses && arch.houses.length > 0) {
      let nearestHouse = null;
      let minDist = Infinity;
      arch.houses.forEach(h => {
        const d = Math.hypot(h.position.x - npc.group.position.x, h.position.z - npc.group.position.z);
        if (d < minDist) {
          minDist = d;
          nearestHouse = h;
        }
      });
      if (nearestHouse && minDist < 35.0) {
        nearestHouse.wealth += Math.floor(value * 0.6);
      }
    }

    // Notícia ocasional no feed comunitário (baixa chance para manter natural)
    if (simulation && Math.random() < 0.12) {
      simulation.addEvent(
        `🪙 ${npc.citizenName} comprou ${spot.itemName} em ${spot.name}! A economia local prospera!`,
        'diplomacy'
      );
    }

    // Cooldown orgânico para próxima compra (~35 a 65 segundos)
    npc.purchaseCooldown = 35.0 + Math.random() * 30.0;
  }
};
