/**
 * PoliticsEngine.js
 * Motor de Inteligência Artificial Política, Eleições Comunitárias e Afinidade Ideológica (Utility AI).
 * Simula a massa de votantes, correntes ideológicas, candidatos a gestores por bairro,
 * alianças políticas e decisões autônomas de orçamento dos líderes eleitos.
 */

export const IDEOLOGIES = {
  cultura: {
    id: 'cultura',
    name: 'Raiz & Cultura de Laje',
    shortName: 'Cultura & Samba',
    icon: '🥁',
    color: '#F4A261',
    desc: 'Valoriza rodas de samba, capoeira, identidade comunitária e festas populares.'
  },
  infra: {
    id: 'infra',
    name: 'Frente Urbanismo & Lajes',
    shortName: 'Obras & Saneamento',
    icon: '🏗️',
    color: '#E76F51',
    desc: 'Prioriza mutirões de alvenaria, puxadinhos seguros, escadarias e caixas d\'água.'
  },
  eco: {
    id: 'eco',
    name: 'Coletivo Sol & Agrofloresta',
    shortName: 'Ecologia & Energia',
    icon: '🌱',
    color: '#38BDF8',
    desc: 'Defende usinas solares, hortas em socalcos, nascentes puras e reflorestamento.'
  },
  comercio: {
    id: 'comercio',
    name: 'Aliança do Comércio & Orla',
    shortName: 'Comércio & Pesca',
    icon: '⚓',
    color: '#0EA5E9',
    desc: 'Foca no giro financeiro das barracas de praia, feira livre, pesca e mobilidade.'
  },
  esporte: {
    id: 'esporte',
    name: 'União Esporte & Juventude',
    shortName: 'Esporte & Lazer',
    icon: '⚽',
    color: '#2A9D8F',
    desc: 'Promove o campinho de várzea, futevôlei, escola de surfe, calistenia e pipódromo.'
  }
};

export class PoliticsEngine {
  constructor(simulation) {
    this.sim = simulation;
    this.electionIntervalDays = 15;
    this.lastElectionDay = 1;
    this.electionCount = 1;

    // Distribuição macro da Massa de Votos (% nacional na colina)
    this.massIdeologies = {
      cultura: 24,
      infra: 23,
      eco: 18,
      comercio: 20,
      esporte: 15
    };

    // Candidatos a Gestores Comunitários por Distrito (12 líderes com IA própria)
    this.candidates = [
      // 1. PORTO & PRAINHA (OESTE)
      {
        id: 'cand_zeca',
        name: 'Seu Zeca do Farol',
        role: 'Mestre Naval & Guardião Costeiro',
        district: 'prainha',
        ideology: 'comercio',
        secondaryIdeology: 'infra',
        avatar: '⚓',
        charisma: 84,
        approval: 88,
        voteShare: 46,
        isElected: true,
        terms: 1,
        platform: 'Frota Pesqueira Forte & Manutenção do Cais',
        aiPolicyDesc: 'Investe no comércio marítimo (+R$ 18/ciclo) e conserva a orla oeste.',
        alliances: ['Dona Valéria', 'Profª Cláudia'],
        rivalries: ['Mestre Bimba'],
        ideoBias: { comercio: 1.4, infra: 1.15 }
      },
      {
        id: 'cand_cida',
        name: 'Dona Cida da Orla',
        role: 'Líder dos Barraqueiros da Praia',
        district: 'prainha',
        ideology: 'comercio',
        secondaryIdeology: 'cultura',
        avatar: '🦐',
        charisma: 79,
        approval: 81,
        voteShare: 32,
        isElected: false,
        terms: 0,
        platform: 'Quiosques Populares & Festival Gastronômico',
        aiPolicyDesc: 'Multiplica vendas das barracas de praia (+R$ 24) e eleva alegria costeira.',
        alliances: ['Tião do Cavaco', 'Profª Cláudia'],
        rivalries: ['Seu Zeca do Farol'],
        ideoBias: { comercio: 1.35, cultura: 1.2 }
      },
      {
        id: 'cand_bimba',
        name: 'Mestre Bimba do Poente',
        role: 'Mestre de Capoeira & Educador',
        district: 'prainha',
        ideology: 'cultura',
        secondaryIdeology: 'esporte',
        avatar: '🥋',
        charisma: 82,
        approval: 85,
        voteShare: 22,
        isElected: false,
        terms: 0,
        platform: 'Roda no Mirante & Juventude no Esporte',
        aiPolicyDesc: 'Eleva harmonia (+4%) e cultura (+3%) com rodas afro-brasileiras no poente.',
        alliances: ['Tião do Cavaco', 'Beto do Campinho'],
        rivalries: ['Seu Zeca do Farol'],
        ideoBias: { cultura: 1.45, esporte: 1.25 }
      },

      // 2. MORRO DO SOL (CENTRO)
      {
        id: 'cand_valeria',
        name: 'Dona Valéria',
        role: 'Presidente da Associação de Moradores',
        district: 'sol',
        ideology: 'infra',
        secondaryIdeology: 'cultura',
        avatar: '🏘️',
        charisma: 88,
        approval: 91,
        voteShare: 48,
        isElected: true,
        terms: 1,
        platform: 'Mutirão de Lajes Seguras & Água na Caixa',
        aiPolicyDesc: 'Subsidia puxadinhos automaticamente e preserva o nível de água (+4%).',
        alliances: ['Seu Zeca do Farol', 'Iara da Chapada'],
        rivalries: ['Tião do Cavaco'],
        ideoBias: { infra: 1.45, cultura: 1.15 }
      },
      {
        id: 'cand_tiao',
        name: 'Tião do Cavaco',
        role: 'Patriarca do Terreiro de Samba',
        district: 'sol',
        ideology: 'cultura',
        secondaryIdeology: 'comercio',
        avatar: '🎶',
        charisma: 90,
        approval: 89,
        voteShare: 34,
        isElected: false,
        terms: 0,
        platform: 'Noite do Samba & Turismo Cultural na Ladeira',
        aiPolicyDesc: 'Promove rodas noturnas que elevam Harmonia (+5%) e atraem visitantes (+R$ 15).',
        alliances: ['Mestre Bimba', 'Dona Cida da Orla'],
        rivalries: ['Dona Valéria'],
        ideoBias: { cultura: 1.5, comercio: 1.1 }
      },
      {
        id: 'cand_jorge',
        name: 'Mestre Jorge da Olaria',
        role: 'Coordenador dos Pedreiros e Carreteiros',
        district: 'sol',
        ideology: 'infra',
        secondaryIdeology: 'eco',
        avatar: '🧱',
        charisma: 76,
        approval: 80,
        voteShare: 18,
        isElected: false,
        terms: 0,
        platform: 'Tijolo Ecológico & Escadarias Drenadas',
        aiPolicyDesc: 'Acelera obras da encosta e reduz custos de construção para a comunidade.',
        alliances: ['Iara da Chapada', 'Tiago do Mototáxi'],
        rivalries: ['Tião do Cavaco'],
        ideoBias: { infra: 1.4, eco: 1.2 }
      },

      // 3. ALTO DA SERRA (NORTE)
      {
        id: 'cand_iara',
        name: 'Iara da Chapada',
        role: 'Engenheira Comunitária Solar',
        district: 'serra',
        ideology: 'eco',
        secondaryIdeology: 'infra',
        avatar: '☀️',
        charisma: 86,
        approval: 90,
        voteShare: 47,
        isElected: true,
        terms: 1,
        platform: 'Soberania Solar & Proteção das Nascentes',
        aiPolicyDesc: 'Regenera Energia (+5%) e Água (+4%) distribuindo excedente pelo aqueduto.',
        alliances: ['Dona Valéria', 'Dona Nair da Horta'],
        rivalries: ['Lucas da Rádio'],
        ideoBias: { eco: 1.5, infra: 1.2 }
      },
      {
        id: 'cand_nair',
        name: 'Dona Nair da Horta',
        role: 'Líder da Agrofloresta & Socalcos',
        district: 'serra',
        ideology: 'eco',
        secondaryIdeology: 'cultura',
        avatar: '🌱',
        charisma: 83,
        approval: 86,
        voteShare: 31,
        isElected: false,
        terms: 0,
        platform: 'Horta Comunitária & Alimentação Orgânica',
        aiPolicyDesc: 'Abastece a feira com colheitas (+R$ 16) e eleva o bem-estar da Serra.',
        alliances: ['Iara da Chapada', 'Profª Cláudia'],
        rivalries: [],
        ideoBias: { eco: 1.4, cultura: 1.2 }
      },
      {
        id: 'cand_lucas',
        name: 'Lucas da Rádio',
        role: 'Comunicador da Rádio & Guia do Cume',
        district: 'serra',
        ideology: 'cultura',
        secondaryIdeology: 'comercio',
        avatar: '📻',
        charisma: 81,
        approval: 82,
        voteShare: 22,
        isElected: false,
        terms: 0,
        platform: 'Voz Comunitária & Ecoturismo no Mirante Imperial',
        aiPolicyDesc: 'Atrai turistas ao Mirante Imperial e Bondinho (+R$ 20) e une os bairros.',
        alliances: ['Tião do Cavaco', 'Tiago do Mototáxi'],
        rivalries: ['Iara da Chapada'],
        ideoBias: { cultura: 1.35, comercio: 1.25 }
      },

      // 4. POLO DA VÁRZEA (LESTE)
      {
        id: 'cand_claudia',
        name: 'Profª Cláudia',
        role: 'Coordenadora da Feira Cultural & Escola',
        district: 'varzea',
        ideology: 'comercio',
        secondaryIdeology: 'cultura',
        avatar: '🎪',
        charisma: 87,
        approval: 92,
        voteShare: 44,
        isElected: true,
        terms: 1,
        platform: 'Feira Livre Continental & Economia Criativa',
        aiPolicyDesc: 'Impulsiona a arrecadação da Feira (+R$ 22) e fortalece pactos entre bairros.',
        alliances: ['Seu Zeca do Farol', 'Dona Nair da Horta'],
        rivalries: ['Tiago do Mototáxi'],
        ideoBias: { comercio: 1.35, cultura: 1.3 }
      },
      {
        id: 'cand_beto',
        name: 'Beto do Campinho',
        role: 'Organizador da Pelada & Esportes de Areia',
        district: 'varzea',
        ideology: 'esporte',
        secondaryIdeology: 'cultura',
        avatar: '⚽',
        charisma: 85,
        approval: 88,
        voteShare: 35,
        isElected: false,
        terms: 0,
        platform: 'Copa da Várzea, Futevôlei & Escola de Surfe',
        aiPolicyDesc: 'Promove torneios que elevam a Harmonia (+5%) e movimentam o comércio local.',
        alliances: ['Mestre Bimba', 'Guga do Surfe'],
        rivalries: ['Profª Cláudia'],
        ideoBias: { esporte: 1.5, cultura: 1.2 }
      },
      {
        id: 'cand_tiago',
        name: 'Tiago do Mototáxi',
        role: 'Líder da Cooperativa de Mototáxi & Bonde',
        district: 'varzea',
        ideology: 'infra',
        secondaryIdeology: 'comercio',
        avatar: '🛵',
        charisma: 80,
        approval: 83,
        voteShare: 21,
        isElected: false,
        terms: 0,
        platform: 'Mobilidade Rápida nas Ladeiras & Integração',
        aiPolicyDesc: 'Aumenta a eficiência logística das motos e bondinho (+R$ 20 e +obras rápidas).',
        alliances: ['Mestre Jorge da Olaria', 'Lucas da Rádio'],
        rivalries: ['Profª Cláudia'],
        ideoBias: { infra: 1.35, comercio: 1.35 }
      }
    ];

    // Histórico recente de decisões da IA dos gestores e eleições
    this.politicalLog = [
      '🗳️ Conselho Comunitário instalado! Os 4 gestores pioneiros iniciaram seus mandatos democráticos.',
      '🤝 Pacto de Cooperação assinado entre Dona Valéria (Morro do Sol) e Iara da Chapada (Alto da Serra).'
    ];
  }

  /**
   * Atribui ou retorna o perfil político individual de um NPC baseado em sua função e bairro.
   */
  ensureNPCPolitics(npc) {
    if (!npc) return null;
    if (npc.politics) return npc.politics;

    const roleTitle = (npc.role || '').toLowerCase();
    let primaryIdeo = 'cultura';
    let district = 'sol';

    if (roleTitle.includes('pescador') || roleTitle.includes('barraqueiro') || roleTitle.includes('farol') || roleTitle.includes('barqueiro')) {
      primaryIdeo = 'comercio';
      district = 'prainha';
    } else if (roleTitle.includes('solar') || roleTitle.includes('horta') || roleTitle.includes('eólica') || roleTitle.includes('trilheiro')) {
      primaryIdeo = 'eco';
      district = 'serra';
    } else if (roleTitle.includes('pelada') || roleTitle.includes('futevôlei') || roleTitle.includes('surfe') || roleTitle.includes('calistenia') || roleTitle.includes('pipa')) {
      primaryIdeo = 'esporte';
      district = 'varzea';
    } else if (roleTitle.includes('obras') || roleTitle.includes('oleiro') || roleTitle.includes('mototáxi') || npc.isBuilder || npc.isCourier) {
      primaryIdeo = 'infra';
      district = 'sol';
    } else if (roleTitle.includes('feira')) {
      primaryIdeo = 'comercio';
      district = 'varzea';
    } else if (roleTitle.includes('samba') || roleTitle.includes('músico') || roleTitle.includes('capoeira') || roleTitle.includes('rádio')) {
      primaryIdeo = 'cultura';
      district = 'sol';
    } else {
      // Distribuir organicamente pela posição X/Z no mapa
      const px = npc.group ? npc.group.position.x : 0;
      const pz = npc.group ? npc.group.position.z : 0;
      if (px < -35) district = 'prainha';
      else if (px > 35) district = 'varzea';
      else if (pz < -30) district = 'serra';
      else district = 'sol';

      const ideoKeys = Object.keys(IDEOLOGIES);
      const seed = Math.abs(Math.floor((px * 13 + pz * 7) % ideoKeys.length));
      primaryIdeo = ideoKeys[seed] || 'cultura';
    }

    // Escolher candidato preferido no distrito com maior afinidade ideológica
    const districtCands = this.candidates.filter(c => c.district === district);
    let chosenCand = districtCands.find(c => c.ideology === primaryIdeo)
      || districtCands.find(c => c.secondaryIdeology === primaryIdeo)
      || districtCands[0];

    npc.politics = {
      ideology: primaryIdeo,
      district,
      votedCandidateId: chosenCand ? chosenCand.id : null,
      votedCandidateName: chosenCand ? chosenCand.name : 'Conselho Popular',
      activism: 70 + Math.floor(Math.random() * 28)
    };

    return npc.politics;
  }

  /**
   * Atualiza o humor ideológico da Massa Eleitoral (Utility AI) de acordo com as necessidades reais do morro
   * e recalcula intenções de voto para todos os candidatos.
   */
  updateElectorateDynamics() {
    const m = this.sim.globalMetrics;

    // 1. Urgência utilitária: o que a população mais sente falta ganha clamor popular
    const waterNeed = Math.max(0, (92 - m.water) * 0.45);
    const energyNeed = Math.max(0, (90 - m.energy) * 0.42);
    const cultureNeed = Math.max(0, (92 - m.culture) * 0.40);
    const economyNeed = m.wealth < 250 ? (250 - m.wealth) * 0.06 : 0;

    // Pesos brutos das 5 correntes ideológicas
    const rawWeights = {
      infra: 22 + waterNeed * 0.7 + (this.sim.arch.activeConstructions.length * 2.5),
      eco: 18 + energyNeed * 0.8 + waterNeed * 0.4,
      cultura: 24 + cultureNeed * 0.6 + (m.culture > 94 ? 4 : 0),
      comercio: 20 + economyNeed + (m.wealth > 500 ? 3 : 0),
      esporte: 16 + cultureNeed * 0.35 + (this.sim.arch.soccerScore.yellow + this.sim.arch.soccerScore.blue) * 0.6
    };

    // Suavização com o estado anterior para evitar oscilações bruscas
    let sum = 0;
    Object.keys(this.massIdeologies).forEach(k => {
      this.massIdeologies[k] = this.massIdeologies[k] * 0.72 + rawWeights[k] * 0.28;
      sum += this.massIdeologies[k];
    });

    // Normalizar para somar exatos 100%
    let accum = 0;
    const keys = Object.keys(this.massIdeologies);
    keys.forEach((k, idx) => {
      if (idx === keys.length - 1) {
        this.massIdeologies[k] = Math.max(5, 100 - accum);
      } else {
        const val = Math.max(5, Math.round((this.massIdeologies[k] / sum) * 100));
        this.massIdeologies[k] = val;
        accum += val;
      }
    });

    // 2. Recalcular intenção de voto (voteShare) e aprovação dentro de cada Distrito
    ['prainha', 'sol', 'serra', 'varzea'].forEach(dist => {
      const cands = this.candidates.filter(c => c.district === dist);
      const faction = this.sim.factions[dist];
      const districtHarmony = faction ? faction.harmony : 90;

      let totalScore = 0;
      const scores = cands.map(c => {
        const ideoWeight = this.massIdeologies[c.ideology] || 20;
        const secWeight = this.massIdeologies[c.secondaryIdeology] || 15;
        // Se está no cargo e a harmonia do bairro está alta, ganha bônus de incumbência; se baixa, sofre desgaste
        const incumbencyMod = c.isElected ? ((districtHarmony - 84) * 0.8) : 0;
        const randomFluct = (Math.random() - 0.5) * 2.2;

        const score = Math.max(10,
          c.charisma * 0.45 +
          ideoWeight * 1.35 +
          secWeight * 0.55 +
          incumbencyMod +
          randomFluct
        );
        c.approval = Math.max(45, Math.min(99, Math.round(62 + (score / 2.8))));
        totalScore += score;
        return score;
      });

      let shareSum = 0;
      cands.forEach((c, i) => {
        if (i === cands.length - 1) {
          c.voteShare = Math.max(5, 100 - shareSum);
        } else {
          const share = Math.max(5, Math.round((scores[i] / totalScore) * 100));
          c.voteShare = share;
          shareSum += share;
        }
      });

      // Atualizar os votos dos NPCs daquele bairro para refletir o líder nas pesquisas ou afinidade
      if (this.sim.npcs && this.sim.npcs.npcs) {
        this.sim.npcs.npcs.forEach(npc => {
          const pol = this.ensureNPCPolitics(npc);
          if (pol && pol.district === dist) {
            const match = cands.find(c => c.ideology === pol.ideology) || cands[0];
            if (match) {
              pol.votedCandidateId = match.id;
              pol.votedCandidateName = match.name;
            }
          }
        });
      }
    });
  }

  /**
   * IA Autônoma dos Gestores Eleitos:
   * Cada gestor eleito usa parte da riqueza do seu bairro para aplicar políticas da sua ideologia!
   */
  stepGestorAI() {
    const electedLeaders = this.candidates.filter(c => c.isElected);
    if (electedLeaders.length === 0) return;

    // Escolhe 1 gestor eleito por turno político para agir autonomamente
    const leader = electedLeaders[Math.floor(Math.random() * electedLeaders.length)];
    const faction = this.sim.factions[leader.district];
    if (!faction) return;

    switch (leader.ideology) {
      case 'comercio': {
        const bonus = 16 + Math.floor(Math.random() * 10);
        this.sim.globalMetrics.wealth += bonus;
        faction.wealth += Math.floor(bonus * 0.5);
        const msg = `${leader.avatar} Gestor(a) ${leader.name} (${faction.name}) articulou giro comercial e gerou +R$ ${bonus} para o caixa!`;
        this.logPoliticalAction(msg);
        break;
      }
      case 'infra': {
        this.sim.globalMetrics.water = Math.min(100, this.sim.globalMetrics.water + 3);
        faction.harmony = Math.min(100, faction.harmony + 2);
        const msg = `${leader.avatar} Gestor(a) ${leader.name} reforçou o abastecimento de caixas d'água e escadarias em ${faction.name}!`;
        this.logPoliticalAction(msg);
        break;
      }
      case 'eco': {
        this.sim.globalMetrics.energy = Math.min(100, this.sim.globalMetrics.energy + 4);
        this.sim.globalMetrics.water = Math.min(100, this.sim.globalMetrics.water + 2);
        const msg = `${leader.avatar} Gestor(a) ${leader.name} expandiu a rede limpa e agrofloresta em ${faction.name} (+Energia e +Água)!`;
        this.logPoliticalAction(msg);
        break;
      }
      case 'cultura': {
        this.sim.globalMetrics.culture = Math.min(100, this.sim.globalMetrics.culture + 4);
        this.sim.globalMetrics.wealth += 12;
        faction.harmony = Math.min(100, faction.harmony + 3);
        const msg = `${leader.avatar} Gestor(a) ${leader.name} promoveu encontro cultural comunitário em ${faction.name} (+Harmonia e +R$ 12)!`;
        this.logPoliticalAction(msg);
        break;
      }
      case 'esporte': {
        this.sim.globalMetrics.culture = Math.min(100, this.sim.globalMetrics.culture + 3);
        faction.harmony = Math.min(100, faction.harmony + 4);
        const msg = `${leader.avatar} Gestor(a) ${leader.name} patrocinou torneio esportivo para a juventude de ${faction.name}!`;
        this.logPoliticalAction(msg);
        break;
      }
    }
  }

  /**
   * Realiza a Eleição Comunitária nos 4 distritos com base na Massa de Votos atual.
   */
  runElectionNow(manualTrigger = false) {
    this.updateElectorateDynamics();
    this.lastElectionDay = this.sim.totalDays;
    this.electionCount++;

    const changes = [];
    ['prainha', 'sol', 'serra', 'varzea'].forEach(dist => {
      const cands = this.candidates.filter(c => c.district === dist);
      // Ordena pelo maior voteShare
      const sorted = cands.slice().sort((a, b) => b.voteShare - a.voteShare);
      const winner = sorted[0];
      const previous = cands.find(c => c.isElected);

      cands.forEach(c => {
        c.isElected = (c.id === winner.id);
      });
      winner.terms = (winner.terms || 0) + 1;

      if (this.sim.factions[dist]) {
        this.sim.factions[dist].leader = winner.name;
        this.sim.factions[dist].harmony = Math.min(100, this.sim.factions[dist].harmony + 3);
      }

      if (previous && previous.id !== winner.id) {
        changes.push(`${winner.avatar} ${winner.name} venceu em ${this.sim.factions[dist]?.name || dist} (${winner.voteShare}%)`);
      } else {
        changes.push(`${winner.avatar} ${winner.name} reeleito(a) (${winner.voteShare}%)`);
      }
    });

    const summaryText = `🗳️ Urnas Apuradas (${this.electionCount}ª Eleição do Morro): ${changes.slice(0, 2).join(' | ')}!`;
    this.logPoliticalAction(summaryText);
    this.sim.addEvent(summaryText, 'diplomacy');
    this.sim.performAutoSave();
    return summaryText;
  }

  /**
   * Permite ao jogador apoiar/impulsionar a campanha de um candidato com fundos da comunidade.
   */
  supportCandidate(candidateId, cost = 35) {
    if (this.sim.globalMetrics.wealth < cost) {
      return { ok: false, reason: `Caixa insuficiente! São necessários R$ ${cost} para impulsionar a campanha.` };
    }
    const cand = this.candidates.find(c => c.id === candidateId);
    if (!cand) return { ok: false, reason: 'Candidato não encontrado.' };

    this.sim.globalMetrics.wealth -= cost;
    cand.charisma = Math.min(99, cand.charisma + 6);
    this.massIdeologies[cand.ideology] = Math.min(60, (this.massIdeologies[cand.ideology] || 20) + 4);
    this.updateElectorateDynamics();

    const msg = `📢 Mobilização Popular! Apoio à campanha de ${cand.name} (${IDEOLOGIES[cand.ideology]?.shortName}) elevou suas intenções de voto para ${cand.voteShare}%!`;
    this.logPoliticalAction(msg);
    this.sim.addEvent(msg, 'diplomacy');
    this.sim.performAutoSave();
    return { ok: true, candidate: cand, message: msg };
  }

  /**
   * Registra tendência ideológica quando o jogador realiza uma ação estratégica.
   */
  boostIdeology(ideoKey, amount = 3) {
    if (this.massIdeologies[ideoKey] !== undefined) {
      this.massIdeologies[ideoKey] += amount;
      this.updateElectorateDynamics();
    }
  }

  logPoliticalAction(text) {
    this.politicalLog.unshift(`Dia ${this.sim.totalDays}: ${text}`);
    if (this.politicalLog.length > 15) this.politicalLog.pop();
  }

  getDaysUntilNextElection() {
    const elapsed = this.sim.totalDays - this.lastElectionDay;
    return Math.max(1, this.electionIntervalDays - elapsed);
  }

  getSummary() {
    const totalVoters = Math.max(30, Math.round(this.sim.globalMetrics.population * 0.78));
    return {
      electionCount: this.electionCount,
      daysUntilElection: this.getDaysUntilNextElection(),
      totalVoters,
      ideologies: IDEOLOGIES,
      massIdeologies: { ...this.massIdeologies },
      candidates: this.candidates.map(c => ({ ...c })),
      politicalLog: this.politicalLog.slice(0, 8)
    };
  }

  serialize() {
    return {
      lastElectionDay: this.lastElectionDay,
      electionCount: this.electionCount,
      massIdeologies: { ...this.massIdeologies },
      candidatesState: this.candidates.map(c => ({
        id: c.id,
        charisma: c.charisma,
        approval: c.approval,
        voteShare: c.voteShare,
        isElected: c.isElected,
        terms: c.terms
      })),
      politicalLog: this.politicalLog.slice(0, 10)
    };
  }

  rehydrate(savedPolitics) {
    if (!savedPolitics) return;
    this.lastElectionDay = savedPolitics.lastElectionDay || 1;
    this.electionCount = savedPolitics.electionCount || 1;
    if (savedPolitics.massIdeologies) {
      this.massIdeologies = { ...this.massIdeologies, ...savedPolitics.massIdeologies };
    }
    if (Array.isArray(savedPolitics.candidatesState)) {
      savedPolitics.candidatesState.forEach(sc => {
        const target = this.candidates.find(c => c.id === sc.id);
        if (target) {
          target.charisma = sc.charisma ?? target.charisma;
          target.approval = sc.approval ?? target.approval;
          target.voteShare = sc.voteShare ?? target.voteShare;
          target.isElected = sc.isElected ?? target.isElected;
          target.terms = sc.terms ?? target.terms;
        }
      });
    }
    if (Array.isArray(savedPolitics.politicalLog)) {
      this.politicalLog = savedPolitics.politicalLog;
    }
  }
}

