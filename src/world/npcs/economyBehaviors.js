import * as THREE from 'three';

/**
 * Módulo de Micro-Economia Orgânica e Comunitária:
 * Simula a circulação real, autônoma e pacífica de moeda entre os cidadãos,
 * feiras livres, barracas de praia, horta e cais dos pescadores.
 */

// Pontos de comércio e convívio econômico permanente no mapa
const COMMERCE_SPOTS = [
  // 1. Barracas Tradicionais da Praia (Toda a Orla de -215 a +225)
  { id: 'caldo', name: 'Barraca do Caldo de Cana & Pastel', x: -215.0, z: 42.8, type: 'stall', district: 'prainha', itemName: 'Caldo de Cana', resource: 'food', hubId: 'horta' },
  { id: 'caipirinha', name: 'Quiosque Brisa do Poente', x: -155.0, z: 42.8, type: 'stall', district: 'prainha', itemName: 'Água de Coco', resource: 'food', hubId: 'horta' },
  { id: 'coco', name: 'Barraca do Coco Verde', x: -40.0, z: 42.8, type: 'stall', district: 'prainha', itemName: 'Coco Gelado', resource: 'food', hubId: 'horta' },
  { id: 'mate', name: 'Barraca do Mate & Biscoito Globo', x: -10.0, z: 42.8, type: 'stall', district: 'prainha', itemName: 'Mate Gelado', resource: 'food', hubId: 'horta' },
  { id: 'acai', name: 'Barraca do Açaí da Colina', x: 20.0, z: 42.8, type: 'stall', district: 'varzea', itemName: 'Tigela de Açaí', resource: 'food', hubId: 'horta' },
  { id: 'petiscos', name: 'Barraca de Frutos do Mar & Petiscos', x: 50.0, z: 42.8, type: 'stall', district: 'varzea', itemName: 'Pastel de Camarão', resource: 'food', hubId: 'pier' },
  { id: 'milho', name: 'Barraca do Milho Verde & Coco', x: 160.0, z: 42.8, type: 'stall', district: 'varzea', itemName: 'Milho Cozido', resource: 'food', hubId: 'horta' },
  { id: 'sorvete', name: 'Quiosque Picolé & Sorvete do Levante', x: 225.0, z: 42.8, type: 'stall', district: 'varzea', itemName: 'Picolé de Fruta', resource: 'food', hubId: 'horta' },

  // 2. Extremos Costeiros, Cais & Vendas dos Vales Expandidos
  { id: 'pier_fish', name: 'Píer dos Pescadores', x: -78.0, z: 74.0, type: 'fishery', district: 'prainha', itemName: 'Pescado Fresco', resource: 'food', hubId: 'pier' },
  { id: 'cove_fish', name: 'Rancho Caiçara da Enseada', x: -95.0, z: 0.0, type: 'fishery', district: 'prainha', itemName: 'Peixe Salgado', resource: 'food', hubId: 'pier' },
  { id: 'boteco_poente', name: 'Boteco do Vale do Poente', x: -186.0, z: -17.0, type: 'market', district: 'prainha', itemName: 'Refresco & Empada', resource: 'food', hubId: 'horta' },
  { id: 'boteco_levante', name: 'Boteco do Vale do Levante', x: 186.0, z: -17.0, type: 'market', district: 'varzea', itemName: 'Suco & Salgado', resource: 'food', hubId: 'horta' },
  { id: 'venda_sela', name: 'Venda da Sela da Serra', x: -6.0, z: -150.2, type: 'market', district: 'serra', itemName: 'Café & Pão de Queijo', resource: 'food', hubId: 'horta' },

  // 3. Sítio Agroflorestal da Colina & Criação Caipira
  { id: 'horta_dona_nair', name: 'Sítio & Pomar Agroflorestal da Colina', x: 96.0, z: -22.5, type: 'farm', district: 'varzea', itemName: 'Cesto de Verduras & Frutas', resource: 'food', hubId: 'horta' },
  { id: 'criacao_caipira', name: 'Criação Caipira', x: 64.0, z: -24.0, type: 'farm', district: 'varzea', itemName: 'Ovos & Queijo Fresco', resource: 'food', hubId: 'horta' },

  // 4. Polo da Várzea: Feira Livre, Mercado Cultural & Açougue/Peixaria
  { id: 'feira_varzea', name: 'Feira Cultural Comunitária', x: 75.0, z: 4.0, type: 'market', district: 'varzea', itemName: 'Artesanato Local', resource: 'food', hubId: 'horta' },
  { id: 'acougue_feira', name: 'Açougue & Peixaria Artesanal', x: 69.6, z: -0.2, type: 'market', district: 'varzea', itemName: 'Corte & Pescado Fresco', resource: 'food', hubId: 'pier' },

  // 5. Polos de Construção: Olaria, Pedreira & Serraria Sustentável
  { id: 'olaria_centro', name: 'Olaria de Alvenaria da Colina', x: -22.0, z: -14.0, type: 'masonry', district: 'sol', itemName: 'Tijolos Cerâmicos', resource: 'stone', hubId: 'olaria' },
  { id: 'pedreira_serra', name: 'Pedreira da Serra', x: -46.0, z: -78.0, type: 'quarry', district: 'serra', itemName: 'Bloco de Granito', resource: 'stone', hubId: 'pedreira' },
  { id: 'serraria_levante', name: 'Serraria Sustentável', x: 112.0, z: -42.0, type: 'sawmill', district: 'varzea', itemName: 'Vigamento & Tábuas', resource: 'wood', hubId: 'serraria' }
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
    let value = Math.floor(Math.random() * 3) + 2; // R$ 2 a R$ 4
    let familySurname = npc.familySurname || null;
    let handledByEngine = false;

    if (simulation && simulation.economy && simulation.economy.executeNpcHouseholdPurchase) {
      const purchase = simulation.economy.executeNpcHouseholdPurchase(npc, spot);
      if (!purchase || !purchase.ok) {
        npc.purchaseCooldown = 14.0 + Math.random() * 10.0;
        return;
      }
      handledByEngine = true;
      if (Number.isFinite(purchase.value) && purchase.value > 0) {
        value = purchase.value;
      }
      if (purchase.familySurname) {
        familySurname = purchase.familySurname;
        npc.familySurname = familySurname;
      }
      if (npc.homeHouseId && arch && arch.houses && arch.syncHouseStagingPile) {
        const homeHouse = arch.houses.find((h) => h.id === npc.homeHouseId);
        if (homeHouse) arch.syncHouseStagingPile(homeHouse);
      }
    }

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

    // 4. Impacto Econômico Comunitário Positivo
    if (simulation && simulation.factions && simulation.factions[spot.district]) {
      simulation.factions[spot.district].wealth += value;
    }
    if (simulation && simulation.globalMetrics) {
      simulation.globalMetrics.wealth += value;
    }

    // Fallback para economias sem motor familiar ativo
    if (!handledByEngine && arch && arch.houses && arch.houses.length > 0) {
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
      const famTag = familySurname ? ` (Fam. ${familySurname})` : '';
      simulation.addEvent(
        `🪙 ${npc.citizenName}${famTag} adquiriu ${spot.itemName} em ${spot.name} (R$ ${value})!`,
        'diplomacy'
      );
    }

    // Cooldown orgânico para próxima compra (~35 a 65 segundos)
    npc.purchaseCooldown = 35.0 + Math.random() * 30.0;
  }
};
