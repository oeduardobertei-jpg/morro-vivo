import * as THREE from 'three';

/** Alto da Serra: mirante imperial, turbinas, pipas, terraços, nascente e torre. */
export const HighlandsMixin = {
  // =========================================================================
  // CINTURÃO DAS ALTURAS & ENCOSTAS VIVAS (LANDMARKS, PARQUE EÓLICO, MIRANTE & HORTAS)
  // =========================================================================
  createHighlandLandmarks() {
    this.createMiranteDaVistaImperial({ x: 50, z: -110 });
    this.createWindTurbines();
    this.createMiranteDasPipas();
    this.createNascenteDaSerra();
  },

  // 1. MIRANTE DA VISTA IMPERIAL (Ponto Turístico Nobre & Deck Panorâmico no Cume)
  // Rodeado organicamente por lajes e afloramentos de granito decorativo, sem sobreposição alguma!
  createMiranteDaVistaImperial(pos = { x: 50, z: -110 }) {
    const miranteGroup = new THREE.Group();
    const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) : 15.4;
    miranteGroup.position.set(pos.x, y, pos.z);

    // 1. Base Monumental de Granito e Pedra Aparelhada (Fundações profundas ancoradas no topo da serra)
    const foundationGeo = new THREE.CylinderGeometry(8.2, 9.0, 3.8, 16);
    const foundationMat = new THREE.MeshLambertMaterial({ color: 0x4B5563, flatShading: true });
    const foundation = new THREE.Mesh(foundationGeo, foundationMat);
    foundation.position.y = -1.8;
    foundation.receiveShadow = true;
    miranteGroup.add(foundation);

    // 2. Deck Panorâmico em Madeira Nobre (Cumaru / Peroba Rosa Carioca)
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x5C3D28, flatShading: true });
    const deckSurface = new THREE.Mesh(new THREE.CylinderGeometry(8.0, 8.0, 0.28, 16), deckMat);
    deckSurface.position.y = 0.15;
    deckSurface.receiveShadow = true;
    miranteGroup.add(deckSurface);

    // Pranchões de madeira escurecida (Texturização geométrica do piso do deck)
    const plankMat = new THREE.MeshLambertMaterial({ color: 0x784F33, flatShading: true });
    const innerRim = new THREE.Mesh(new THREE.RingGeometry(7.5, 7.95, 16), plankMat);
    innerRim.rotation.x = -Math.PI / 2;
    innerRim.position.y = 0.3;
    innerRim.receiveShadow = true;
    miranteGroup.add(innerRim);

    // Rosa dos Ventos central embutida em latão e carvalho no centro do mirante
    const compassMat = new THREE.MeshLambertMaterial({ color: 0xD4AF37, flatShading: true });
    const compassCenter = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.04, 8), compassMat);
    compassCenter.position.y = 0.31;
    miranteGroup.add(compassCenter);

    // Pontas da Rosa dos Ventos
    for (let p = 0; p < 4; p++) {
      const tipGeo = new THREE.ConeGeometry(0.3, 1.8, 3);
      tipGeo.rotateX(Math.PI / 2);
      const tip = new THREE.Mesh(tipGeo, compassMat);
      tip.position.set(0, 0.32, 0);
      tip.rotation.y = p * (Math.PI / 2);
      miranteGroup.add(tip);
    }

    // 3. Guarda-corpo Rústico e Nobre (Balaústres em madeira maciça com corrimão contínuo + 4 arandelas quentes)
    const railMat = new THREE.MeshLambertMaterial({ color: 0x3E2718 });
    this.miranteLanternMat = new THREE.MeshLambertMaterial({
      color: 0xFEF3C7,
      emissive: 0xFF9F1C,
      emissiveIntensity: 0.25,
      flatShading: true
    });
    this.miranteLanternMat.userData = { dynamicEmissive: true };
    const miranteHaloMat = new THREE.MeshBasicMaterial({
      color: 0xFFB84D,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.miranteGlowMat = miranteHaloMat;

    const numPosts = 16;
    let arandelaCount = 0;
    for (let r = 0; r < numPosts; r++) {
      const angle = (r / numPosts) * Math.PI * 2;
      // Deixar abertura de entrada ao sul (onde a passarela conecta: ângulo em torno de Math.PI/2)
      if (Math.abs(angle - Math.PI / 2) < 0.38) continue;

      const px = Math.cos(angle) * 7.7;
      const pz = Math.sin(angle) * 7.7;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), railMat);
      post.position.set(px, 0.75, pz);
      post.castShadow = true;
      miranteGroup.add(post);

      if (r % 4 === 1 && arandelaCount < 4) {
        arandelaCount++;
        const postSconce = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.24), this.miranteLanternMat);
        postSconce.position.set(px, 1.48, pz);
        miranteGroup.add(postSconce);
      }
    }

    // Corrimão curvado superior de segurança
    const topRailGeo = new THREE.RingGeometry(7.55, 7.85, 24, 1, 0.45, Math.PI * 2 - 0.9);
    const topRail = new THREE.Mesh(topRailGeo, railMat);
    topRail.rotation.x = -Math.PI / 2;
    topRail.rotation.z = Math.PI / 2 + 0.45;
    topRail.position.y = 1.35;
    miranteGroup.add(topRail);

    // 4. Duas Lunetas Turísticas Panorâmicas de Alto Alcance em Latão Nobre
    const brassMat = new THREE.MeshLambertMaterial({ color: 0xEAB308, flatShading: true });
    const brassDarkMat = new THREE.MeshLambertMaterial({ color: 0xCA8A04, flatShading: true });

    const createBinocular = (bx, bz, rotY, rotX) => {
      const binocGroup = new THREE.Group();
      binocGroup.position.set(bx, 0.3, bz);

      // Degrau de apoio para turistas
      const step = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, 0.22, 8), plankMat);
      step.position.y = 0.11;
      step.receiveShadow = true;
      binocGroup.add(step);

      // Coluna pedestal de latão
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.18, 1.25, 8), brassMat);
      pedestal.position.y = 0.72;
      pedestal.castShadow = true;
      binocGroup.add(pedestal);

      // Caixa da ótica e tubo da luneta dupla
      const scopeHead = new THREE.Group();
      scopeHead.position.set(0, 1.45, 0);
      scopeHead.rotation.y = rotY;
      scopeHead.rotation.x = rotX;

      const scopeBody = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.55), brassDarkMat);
      scopeHead.add(scopeBody);

      // Duas lentes objetivas
      const lensL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8), brassMat);
      lensL.rotation.x = Math.PI / 2;
      lensL.position.set(-0.12, 0, 0.35);
      scopeHead.add(lensL);

      const lensR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8), brassMat);
      lensR.rotation.x = Math.PI / 2;
      lensR.position.set(0.12, 0, 0.35);
      scopeHead.add(lensR);

      binocGroup.add(scopeHead);
      return binocGroup;
    };

    // Luneta Oeste (Apontada para a Prainha e Pôr do Sol)
    miranteGroup.add(createBinocular(-3.6, -2.5, 0.45, 0.18));

    // Luneta Leste (Apontada para o Centro Histórico, Morro do Sol e Baía)
    miranteGroup.add(createBinocular(3.6, -2.5, -0.45, 0.18));

    // 5. Quatro Bancos Coloniais de Jardim em Madeira Maciça e Ferro
    const benchWoodMat = new THREE.MeshLambertMaterial({ color: 0x4E342E });
    const benchLegMat = new THREE.MeshLambertMaterial({ color: 0x1F2937 });

    const createColonialBench = (x, z, rotY) => {
      const bench = new THREE.Group();
      bench.position.set(x, 0.3, z);
      bench.rotation.y = rotY;

      // Pés de ferro fundido
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.55), benchLegMat);
      leg1.position.set(-1.0, 0.22, 0);
      bench.add(leg1);
      const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.55), benchLegMat);
      leg2.position.set(1.0, 0.22, 0);
      bench.add(leg2);

      // Assento ripado
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 0.52), benchWoodMat);
      seat.position.set(0, 0.46, 0);
      seat.castShadow = true;
      bench.add(seat);

      // Encosto confortável
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.42, 0.08), benchWoodMat);
      back.position.set(0, 0.74, -0.22);
      back.rotation.x = 0.15;
      bench.add(back);

      return bench;
    };

    // Bancos dispostos harmonicamente na curvatura norte do mirante
    miranteGroup.add(createColonialBench(-5.0, 2.5, 0.55));
    miranteGroup.add(createColonialBench(5.0, 2.5, -0.55));
    miranteGroup.add(createColonialBench(-2.2, 5.2, 0.2));
    miranteGroup.add(createColonialBench(2.2, 5.2, -0.2));

    // 6. Pórtico de Entrada do Mirante (Arco Monumental em Troncos Nobres)
    const portalGroup = new THREE.Group();
    portalGroup.position.set(0, 0, 7.8);

    const logMat = new THREE.MeshLambertMaterial({ color: 0x3E2723, flatShading: true });
    const postGeo = new THREE.CylinderGeometry(0.24, 0.28, 4.6, 6);

    const postL = new THREE.Mesh(postGeo, logMat);
    postL.position.set(-2.8, 2.2, 0);
    postL.castShadow = true;
    portalGroup.add(postL);

    const postR = new THREE.Mesh(postGeo, logMat);
    postR.position.set(2.8, 2.2, 0);
    postR.castShadow = true;
    portalGroup.add(postR);

    // Viga superior entalhada
    const beam = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.45, 0.5), logMat);
    beam.position.set(0, 4.4, 0);
    beam.castShadow = true;
    portalGroup.add(beam);

    // Placa entalhada: "MIRANTE DA VISTA IMPERIAL"
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 0.82, 0.12),
      new THREE.MeshLambertMaterial({ color: 0xD97706, flatShading: true })
    );
    signBoard.position.set(0, 3.65, 0);
    signBoard.castShadow = true;
    portalGroup.add(signBoard);

    // Lanternas de Boas-Vindas com halo suave + varal de lâmpadas quentes (sem PointLight extra)
    const lanternL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.48, 0.35), this.miranteLanternMat);
    lanternL.position.set(-2.8, 3.8, 0.4);
    portalGroup.add(lanternL);

    const lanternR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.48, 0.35), this.miranteLanternMat);
    lanternR.position.set(2.8, 3.8, 0.4);
    portalGroup.add(lanternR);

    [-2.8, 2.8].forEach((hx) => {
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), miranteHaloMat);
      halo.position.set(hx, 3.8, 0.4);
      halo.userData.dynamic = true;
      portalGroup.add(halo);
    });

    // Varal de 5 lâmpadas douradas sob a viga superior do pórtico
    const festoonGeo = new THREE.SphereGeometry(0.11, 6, 5);
    for (let b = 0; b < 5; b++) {
      const u = (b / 4) * 2 - 1;
      const bulb = new THREE.Mesh(festoonGeo, this.miranteLanternMat);
      bulb.position.set(u * 2.0, 4.12 - (1.0 - u * u) * 0.18, 0.15);
      portalGroup.add(bulb);
    }

    miranteGroup.add(portalGroup);

    // 7. Soleira de Granito na entrada sul conectando suavemente o deck à Estrada da Crista
    const rampMat = new THREE.MeshLambertMaterial({ color: 0x8D99AE, flatShading: true });
    for (let s = 1; s <= 2; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.24, 0.75), rampMat);
      step.position.set(0, 0.14 - s * 0.10, 7.8 + s * 0.65);
      step.receiveShadow = true;
      miranteGroup.add(step);
    }

    // 8. Paisagismo Orgânico na base circular: 5 pedras de granito musgoso + 5 moitas floridas de buganvília
    const mossStoneMat = new THREE.MeshLambertMaterial({ color: 0x67727E, flatShading: true });
    const shrubLeafMat = new THREE.MeshLambertMaterial({ color: 0x357A4B, flatShading: true });
    const bougColors = [0xDF4F7A, 0xE6A13C, 0x9B5DE5];
    const baseAngles = [-2.55, -1.85, -0.95, 0.05, 0.85];
    baseAngles.forEach((ang, idx) => {
      const rRock = 8.75 + (idx % 2) * 0.45;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 0), mossStoneMat);
      rock.scale.set(1.25, 0.72, 1.05);
      rock.rotation.set(idx * 0.4, ang, 0.15);
      rock.position.set(Math.cos(ang) * rRock, -0.25, Math.sin(ang) * rRock);
      rock.castShadow = true;
      rock.receiveShadow = true;
      miranteGroup.add(rock);

      const bushAng = ang + 0.34;
      const rBush = 8.95;
      const bx = Math.cos(bushAng) * rBush;
      const bz = Math.sin(bushAng) * rBush;
      const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 0), shrubLeafMat);
      foliage.scale.set(1.15, 0.85, 1.1);
      foliage.position.set(bx, 0.08, bz);
      miranteGroup.add(foliage);

      const bloomMat = new THREE.MeshLambertMaterial({ color: bougColors[idx % bougColors.length], flatShading: true });
      const bloom = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), bloomMat);
      bloom.position.set(bx + 0.15, 0.42, bz - 0.12);
      miranteGroup.add(bloom);
    });

    this.group.add(miranteGroup);
    this.miranteImperial = miranteGroup;
    this.propObstacles = this.propObstacles || [];
    this.propObstacles.push(
      { x: pos.x - 3.6, z: pos.z - 2.5, r: 0.72 },
      { x: pos.x + 3.6, z: pos.z - 2.5, r: 0.72 },
      { x: pos.x - 2.8, z: pos.z + 7.8, r: 0.55 },
      { x: pos.x + 2.8, z: pos.z + 7.8, r: 0.55 }
    );
  },

  // 2. PARQUE EÓLICO DA CHAPADA (3 Turbinas Eólicas Elegantes na Crista Norte, 100% fora das estradas!)
  createWindTurbines() {
    const turbinePositions = [
      { x: -42, z: -116 },
      { x: -16, z: -120 },
      { x: 26,  z: -116 }
    ];

    const mastMat = new THREE.MeshLambertMaterial({ color: 0xE2E8F0, flatShading: true });
    const bladeMat = new THREE.MeshLambertMaterial({ color: 0xF8FAFC, flatShading: true });
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xEF4444 }); // Ponta vermelha de aviação
    this.propObstacles = this.propObstacles || [];

    turbinePositions.forEach((pos, idx) => {
      if (this.infrastructureNodes) {
        this.infrastructureNodes.push({ x: pos.x, z: pos.z, r: 8.5 });
      }
      this.propObstacles.push({ x: pos.x, z: pos.z, r: 1.75 });
      const tGroup = new THREE.Group();
      const gy = this.terrain ? this.terrain.getElevation(pos.x, pos.z) : 12.0;
      tGroup.position.set(pos.x, gy, pos.z);

      // Deep foundation base ring (ancorado fundo na encosta)
      const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.3, 2.4, 8), new THREE.MeshLambertMaterial({ color: 0x6B665F, flatShading: true }));
      baseMesh.position.y = -0.2;
      baseMesh.receiveShadow = true;
      tGroup.add(baseMesh);

      // Tapered tower mast (15m tall)
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.75, 14.5, 8), mastMat);
      tower.position.y = 7.6;
      tower.castShadow = true;
      tGroup.add(tower);

      // Nacelle generator pod
      const nacelle = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 2.6), mastMat);
      nacelle.position.set(0, 15.0, 0);
      nacelle.castShadow = true;
      tGroup.add(nacelle);

      // Rotating Rotor Hub & 3 Aerodynamic Blades
      const rotorGroup = new THREE.Group();
      rotorGroup.position.set(0, 15.0, 1.35);

      const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.0, 8), mastMat);
      noseCone.rotation.x = Math.PI / 2;
      rotorGroup.add(noseCone);

      // 3 Blades (120 degrees apart)
      for (let b = 0; b < 3; b++) {
        const bladeAngle = (b / 3) * Math.PI * 2;
        const bladeHolder = new THREE.Group();
        bladeHolder.rotation.z = bladeAngle;

        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.32, 6.2, 0.08), bladeMat);
        blade.position.y = 3.2;
        blade.castShadow = true;
        bladeHolder.add(blade);

        // Red tip marker
        const redTip = new THREE.Mesh(new THREE.BoxGeometry(0.33, 1.0, 0.09), tipMat);
        redTip.position.y = 5.8;
        bladeHolder.add(redTip);

        rotorGroup.add(bladeHolder);
      }

      tGroup.add(rotorGroup);
      this.group.add(tGroup);

      // Register for smooth animation in update loop
      this.windTurbines.push({
        group: tGroup,
        rotor: rotorGroup,
        speed: 1.2 + idx * 0.25
      });
    });
  },

  // 3. MIRANTE DAS PIPAS (Noroeste / Colina do Poente: Deck de Observação & Pipas ao Vento)
  createMiranteDasPipas() {
    const miranteGroup = new THREE.Group();
    const my = this.terrain ? this.terrain.getElevation(-78, -50) : 10.4;
    miranteGroup.position.set(-78, my + 0.35, -50);

    // Fundação de pedra de mão argamassada ancorada na encosta
    const stoneBaseMat = new THREE.MeshLambertMaterial({ color: 0x64748B, flatShading: true });
    const stonePlinth = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.8, 3.2, 14), stoneBaseMat);
    stonePlinth.position.y = -1.75;
    stonePlinth.receiveShadow = true;
    miranteGroup.add(stonePlinth);

    // Solid wooden cliff-mounted deck (14m diameter)
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x5C4636, flatShading: true });
    const deckMesh = new THREE.Mesh(new THREE.CylinderGeometry(7.0, 7.3, 1.4, 14), deckMat);
    deckMesh.position.y = -0.65;
    deckMesh.receiveShadow = true;
    miranteGroup.add(deckMesh);

    // Deck plank surface
    const plankMat = new THREE.MeshLambertMaterial({ color: 0x8C6B4E, flatShading: true });
    const surface = new THREE.Mesh(new THREE.CylinderGeometry(6.9, 6.9, 0.2, 14), plankMat);
    surface.position.y = 0.1;
    surface.receiveShadow = true;
    miranteGroup.add(surface);

    // Wooden safety rail (guarda-corpo com abertura de entrada ao sul em direção à trilha)
    const railMat = new THREE.MeshLambertMaterial({ color: 0x3E2D22 });
    for (let r = 0; r < 14; r++) {
      if (r === 3 || r === 4) continue; // Abertura de acesso sul (+Z)
      const angle = (r / 14) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), railMat);
      post.position.set(Math.cos(angle) * 6.6, 0.65, Math.sin(angle) * 6.6);
      miranteGroup.add(post);
    }
    const topRail = new THREE.Mesh(new THREE.RingGeometry(6.4, 6.8, 18, 1, Math.PI * 0.68, Math.PI * 1.72), railMat);
    topRail.rotation.x = -Math.PI / 2;
    topRail.position.y = 1.15;
    miranteGroup.add(topRail);

    // Escadaria de madeira de acesso ao sul (+Z) conectando o deck ao patamar da viela
    for (let s = 1; s <= 3; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.55), deckMat);
      step.position.set(0, 0.1 - s * 0.18, 6.7 + s * 0.50);
      step.receiveShadow = true;
      miranteGroup.add(step);
    }

    // Viewing Telescope (Luneta de Observação)
    const brassMat = new THREE.MeshLambertMaterial({ color: 0xD4AF37 });
    const scopeStand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.2, 6), brassMat);
    scopeStand.position.set(0, 0.6, -5.2);
    miranteGroup.add(scopeStand);

    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 1.1, 8), brassMat);
    scopeTube.rotation.x = Math.PI / 3;
    scopeTube.position.set(0, 1.25, -5.2);
    miranteGroup.add(scopeTube);

    // Wooden benches for citizens to rest and watch the sunset
    const benchMat = new THREE.MeshLambertMaterial({ color: 0x6E4B33 });
    const bench1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 0.6), benchMat);
    bench1.position.set(-3.2, 0.25, 2.5);
    bench1.rotation.y = 0.4;
    miranteGroup.add(bench1);

    const bench2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 0.6), benchMat);
    bench2.position.set(3.2, 0.25, 2.5);
    bench2.rotation.y = -0.4;
    miranteGroup.add(bench2);

    this.group.add(miranteGroup);

    // 6 Dynamic Kites flying high above the Mirante in the brisk mountain updraft
    const kiteColors = [0xEF4444, 0x3B82F6, 0xFACC15, 0x10B981, 0x9333EA, 0xF97316];
    for (let k = 0; k < 6; k++) {
      const kGroup = new THREE.Group();
      const kx = -78 + (Math.random() - 0.5) * 18;
      const kz = -50 + (Math.random() - 0.5) * 18;
      const ky = my + 14.0 + Math.random() * 10;
      kGroup.position.set(kx, ky, kz);

      // Diamond kite sail
      const kiteGeo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 1.2, 0,
        -0.8, 0.2, 0,
        0, -1.0, 0,
        0, 1.2, 0,
        0, -1.0, 0,
        0.8, 0.2, 0
      ]);
      kiteGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      kiteGeo.computeVertexNormals();

      const kMat = new THREE.MeshBasicMaterial({
        color: kiteColors[k % kiteColors.length],
        side: THREE.DoubleSide
      });
      const sail = new THREE.Mesh(kiteGeo, kMat);
      kGroup.add(sail);

      // Bamboo cross sticks
      const stick = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.2, 0.04), new THREE.MeshBasicMaterial({ color: 0xD4B886 }));
      kGroup.add(stick);

      // Fluttering tail ribbon
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.02), new THREE.MeshBasicMaterial({ color: 0xFDFDFD }));
      tail.position.y = -1.8;
      kGroup.add(tail);

      this.group.add(kGroup);

      this.kites.push({
        mesh: kGroup,
        tail: tail,
        baseY: ky,
        baseRotY: Math.random() * Math.PI,
        phase: Math.random() * 10
      });
    }
  },

  // 4. AGROFLORESTA COMUNITÁRIA EM SOCALCOS (Nordeste / Encosta do Levante)
  createAgroflorestaTerraces() {
    const farmGroup = new THREE.Group();
    const fy = this.terrain ? this.terrain.getElevation(75, -45) : 8.5;
    farmGroup.position.set(75, fy, -45);

    // Stepped timber terrace retaining walls (muros de contenção de terraços agrícolas)
    const timberMat = new THREE.MeshLambertMaterial({ color: 0x4A301D, flatShading: true });
    for (let t = -1; t <= 1; t++) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(16.0, 1.2, 0.45), timberMat);
      wall.position.set(0, t * 1.1, t * 4.5);
      wall.receiveShadow = true;
      farmGroup.add(wall);
    }

    // Banana Trees (Bananeiras de encosta com cachos)
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5C4033 });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x22C55E, flatShading: true });
    const bananaMat = new THREE.MeshLambertMaterial({ color: 0xEAB308 });

    const bananaSpots = [
      { x: -5.5, z: -3.0 }, { x: -2.0, z: -3.5 }, { x: 3.5, z: -3.0 },
      { x: -4.5, z: 2.0 },  { x: 2.0, z: 2.5 },   { x: 5.5, z: 1.5 }
    ];

    bananaSpots.forEach(pt => {
      const bTree = new THREE.Group();
      bTree.position.set(pt.x, 0.2, pt.z);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.4, 5), trunkMat);
      trunk.position.y = 1.2;
      bTree.add(trunk);

      // Drooping lush leaves
      for (let l = 0; l < 5; l++) {
        const leafAngle = (l / 5) * Math.PI * 2;
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 1.6), leafMat);
        leaf.position.set(Math.cos(leafAngle) * 0.8, 2.3, Math.sin(leafAngle) * 0.8);
        leaf.rotation.y = leafAngle;
        leaf.rotation.x = 0.45;
        bTree.add(leaf);
      }

      // Yellow banana bunch
      const bunch = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 5), bananaMat);
      bunch.position.set(0.2, 1.6, 0.2);
      bunch.rotation.z = Math.PI;
      bTree.add(bunch);

      farmGroup.add(bTree);
    });

    // Rows of green cabbages / lettuce heads
    const vegMat = new THREE.MeshLambertMaterial({ color: 0x4ADE80, flatShading: true });
    for (let row = -1; row <= 1; row++) {
      for (let col = -5; col <= 5; col += 1.8) {
        const veg = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), vegMat);
        veg.position.set(col, row * 1.1 + 0.35, row * 4.5 + 2.0);
        farmGroup.add(veg);
      }
    }

    // Friendly scarecrow (Espantalho de palha carioca)
    const strawMat = new THREE.MeshLambertMaterial({ color: 0xD97706 });
    const scarecrow = new THREE.Group();
    scarecrow.position.set(0, 0.6, 0);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 4), timberMat);
    post.position.y = 1.1;
    scarecrow.add(post);

    const crossArm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), timberMat);
    crossArm.position.y = 1.7;
    scarecrow.add(crossArm);

    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.25), new THREE.MeshLambertMaterial({ color: 0xEF4444 }));
    shirt.position.y = 1.4;
    scarecrow.add(shirt);

    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.35, 6), strawMat);
    hat.position.y = 2.0;
    scarecrow.add(hat);

    farmGroup.add(scarecrow);

    // Tool shed and rainwater cistern
    const shed = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.2), new THREE.MeshLambertMaterial({ color: 0x78350F }));
    shed.position.set(-6.5, 1.1, -1.0);
    farmGroup.add(shed);

    const cistern = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.4, 8), new THREE.MeshLambertMaterial({ color: 0x0284C7 }));
    cistern.position.set(-6.5, 0.7, 1.2);
    farmGroup.add(cistern);

    this.group.add(farmGroup);
  },

  // 5. NASCENTE DA SERRA (Olho d'Água Cristalino & Bica de Bambu — 100% ancorado no relevo!)
  createNascenteDaSerra() {
    const springGroup = new THREE.Group();
    const cx = -19.5;
    const cz = -56.5;
    const getElev = (px, pz) => (this.terrain ? this.terrain.getElevation(px, pz) : 13.5);
    const sy = getElev(cx, cz);
    springGroup.position.set(cx, sy, cz);

    // Base circular de pedra musgosa profundamente ancorada na encosta
    const stoneBaseMat = new THREE.MeshLambertMaterial({ color: 0x525E4E, flatShading: true });
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x4D5A46, flatShading: true });
    const basinPlinth = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.9, 1.8, 12), stoneBaseMat);
    basinPlinth.position.y = -0.78;
    basinPlinth.receiveShadow = true;
    springGroup.add(basinPlinth);

    // Coroa de rochas naturais acompanhando a cota exata do terreno em cada ângulo
    for (let r = 0; r < 9; r++) {
      const angle = (r / 9) * Math.PI * 2;
      const rad = 1.95 + (r % 2) * 0.22;
      const lx = Math.cos(angle) * rad;
      const lz = Math.sin(angle) * rad;
      const localGroundY = getElev(cx + lx, cz + lz) - sy;
      const rockSize = 0.62 + (r % 3) * 0.16;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rockSize, 0), rockMat);
      rock.scale.set(1.15, 0.85, 1.05);
      rock.position.set(lx, Math.max(0.18, localGroundY + 0.25), lz);
      rock.rotation.set(r * 0.4, angle, 0.15);
      rock.castShadow = true;
      rock.receiveShadow = true;
      springGroup.add(rock);
    }

    // Espelho d'água cristalino da mina da serra
    const waterMat = new THREE.MeshLambertMaterial({
      color: 0x06B6D4,
      transparent: true,
      opacity: 0.88,
      flatShading: true
    });
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.55, 0.28, 12), waterMat);
    pool.position.y = 0.16;
    springGroup.add(pool);

    // Bica de bambu sobre 2 forquilhas de madeira fincadas verticalmente na bacia de pedra (zero peças soltas!)
    const bambooMat = new THREE.MeshLambertMaterial({ color: 0x84A942, flatShading: true });
    const postWoodMat = new THREE.MeshLambertMaterial({ color: 0x5C4033, flatShading: true });
    const spoutGroup = new THREE.Group();
    spoutGroup.position.set(0, 0.18, 1.45);
    [-0.55, 0.55].forEach((px) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.85, 5), postWoodMat);
      post.position.set(px, 0.12, 0);
      spoutGroup.add(post);
    });
    const flume = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.8, 6), bambooMat);
    flume.rotation.z = Math.PI / 2;
    flume.position.set(0, 0.52, 0);
    spoutGroup.add(flume);
    springGroup.add(spoutGroup);

    this.propObstacles = this.propObstacles || [];
    this.propObstacles.push({ x: cx, z: cz, r: 2.8 });
    this.group.add(springGroup);
  },

  // 10. A TORRE DE TRANSMISSÃO & RÁDIO COMUNITÁRIA (Crista da Serra)
  createTorreDeRadioCume(pos = { x: 0, z: -104 }) {
    const radioGroup = new THREE.Group();
    const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) : 15.2;
    radioGroup.position.set(pos.x, y, pos.z);

    // Hexagonal granite base plinth (fundações profundas ancoradas no topo da serra)
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.8, 3.2, 6),
      new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true })
    );
    plinth.position.y = -0.6;
    plinth.receiveShadow = true;
    radioGroup.add(plinth);

    // Tapered Steel Lattice Tower (15m tall, alternating red & white)
    const redMat = new THREE.MeshLambertMaterial({ color: 0xDC2626 });
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xF8FAFC });

    const totalSections = 6;
    for (let s = 0; s < totalSections; s++) {
      const mat = s % 2 === 0 ? redMat : whiteMat;
      const lowerR = 1.4 * (1 - s / (totalSections + 1));
      const upperR = 1.4 * (1 - (s + 1) / (totalSections + 1));
      const secH = 2.4;
      const sec = new THREE.Mesh(new THREE.CylinderGeometry(upperR, lowerR, secH, 4, 1, true), mat);
      sec.position.y = 1.0 + s * secH + secH * 0.5;
      sec.castShadow = true;
      radioGroup.add(sec);
    }

    // Microwave dish antennas
    const dishMat = new THREE.MeshLambertMaterial({ color: 0x94A3B8, flatShading: true });
    const dish1 = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.25, 10), dishMat);
    dish1.rotation.z = Math.PI / 2;
    dish1.position.set(0.8, 10.5, 0);
    radioGroup.add(dish1);

    const dish2 = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.25, 10), dishMat);
    dish2.rotation.x = Math.PI / 2;
    dish2.position.set(0, 12.0, 0.7);
    radioGroup.add(dish2);

    // Pulsing Red Aviation Beacon Light on Top
    const beaconGeo = new THREE.SphereGeometry(0.22, 6, 6);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 15.6, 0);
    radioGroup.add(beacon);
    this.beaconLight = null;

    // Technical radio hut (Cabine Técnica da Rádio)
    const hutMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
    const hut = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 2.2), hutMat);
    hut.position.set(2.4, 1.4, 1.2);
    hut.castShadow = true;
    radioGroup.add(hut);

    // Small solar panel on hut roof
    const solarMat = new THREE.MeshLambertMaterial({ color: 0x1E3A8A });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.2), solarMat);
    panel.position.set(2.4, 2.45, 1.2);
    panel.rotation.x = 0.25;
    radioGroup.add(panel);

    this.group.add(radioGroup);
  },

  // =========================================================================
  // REVITALIZAÇÃO DO FLANCO LESTE (PIPODROMO DO LEVANTE, POMAR & TRILHA DA CRISTA)
  // =========================================================================
  createEastHighlandLife() {
    const lifeGroup = new THREE.Group();

    // 1. PIPÓDROMO DO ALTO DO LEVANTE (x: 88, z: -48)
    const pipX = 88.0, pipZ = -48.0;
    const pipY = this.terrain ? this.terrain.getElevation(pipX, pipZ) : 10.2;
    const pipGroup = new THREE.Group();
    pipGroup.position.set(pipX, pipY + 0.35, pipZ);

    const stonePlinthMat = new THREE.MeshLambertMaterial({ color: 0x64748B, flatShading: true });
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x5C4636, flatShading: true });
    const plankMat = new THREE.MeshLambertMaterial({ color: 0x8C6B4E, flatShading: true });
    const railMat = new THREE.MeshLambertMaterial({ color: 0x3E2D22 });

    // Fundação de pedra argamassada nivelando o Pipódromo na encosta leste
    const stonePlinth = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 6.0, 2.8, 12), stonePlinthMat);
    stonePlinth.position.y = -1.5;
    stonePlinth.receiveShadow = true;
    pipGroup.add(stonePlinth);

    // Deck panorâmico elevado em madeira
    const deckBase = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.4, 1.2, 12), deckMat);
    deckBase.position.y = -0.55;
    deckBase.receiveShadow = true;
    pipGroup.add(deckBase);

    const deckFloor = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 5.1, 0.18, 12), plankMat);
    deckFloor.position.y = 0.1;
    deckFloor.receiveShadow = true;
    pipGroup.add(deckFloor);

    // Guarda-corpo perimetral com abertura de entrada ao sul (+Z)
    for (let r = 0; r < 12; r++) {
      if (r === 3) continue; // Abertura de acesso sul (+Z)
      const angle = (r / 12) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), railMat);
      post.position.set(Math.cos(angle) * 4.8, 0.65, Math.sin(angle) * 4.8);
      pipGroup.add(post);
    }
    const topRail = new THREE.Mesh(new THREE.RingGeometry(4.6, 5.0, 16, 1, Math.PI * 0.66, Math.PI * 1.74), railMat);
    topRail.rotation.x = -Math.PI / 2;
    topRail.position.y = 1.15;
    pipGroup.add(topRail);

    // Escadinha de madeira na entrada sul (+Z)
    for (let s = 1; s <= 3; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 0.5), deckMat);
      step.position.set(0, 0.1 - s * 0.18, 4.9 + s * 0.45);
      step.receiveShadow = true;
      pipGroup.add(step);
    }

    // Carretilhas de pipa profissionais coloridas sobre uma bancada
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 0.7), plankMat);
    bench.position.set(0, 0.35, -2.8);
    pipGroup.add(bench);

    const reelColors = [0xEF4444, 0x10B981, 0xF59E0B, 0x3B82F6];
    reelColors.forEach((col, idx) => {
      const reel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.25, 8),
        new THREE.MeshLambertMaterial({ color: col, flatShading: true })
      );
      reel.position.set(-0.8 + idx * 0.55, 0.75, -2.8);
      reel.rotation.x = Math.PI / 2;
      pipGroup.add(reel);
    });

    // Bandeirinhas triangulares festivas nos mastros
    const pennantColors = [0xEF4444, 0xFACC15, 0x3B82F6, 0x10B981];
    for (let p = 0; p < 6; p++) {
      const pAngle = (p / 6) * Math.PI - Math.PI / 2;
      const flag = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.45, 3),
        new THREE.MeshLambertMaterial({ color: pennantColors[p % pennantColors.length], side: THREE.DoubleSide })
      );
      flag.position.set(Math.cos(pAngle) * 4.6, 1.25, Math.sin(pAngle) * 4.6);
      flag.rotation.z = Math.PI / 2;
      pipGroup.add(flag);
    }

    // 4 Pipas no céu no alto desta crista
    if (this.kites) {
      const extraKiteColors = [0xF43F5E, 0x06B6D4, 0xF59E0B, 0x10B981];
      for (let ek = 0; ek < 4; ek++) {
        const kGroup = new THREE.Group();
        const kx = pipX + (Math.random() - 0.5) * 16;
        const kz = pipZ + (Math.random() - 0.5) * 16;
        const ky = pipY + 16.0 + Math.random() * 8;
        kGroup.position.set(kx, ky, kz);

        const kiteGeo = new THREE.BufferGeometry();
        const vertices = new Float32Array([
          0, 1.1, 0,
          -0.75, 0.2, 0,
          0, -0.9, 0,
          0, 1.1, 0,
          0, -0.9, 0,
          0.75, 0.2, 0
        ]);
        kiteGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        kiteGeo.computeVertexNormals();

        const kMat = new THREE.MeshBasicMaterial({ color: extraKiteColors[ek], side: THREE.DoubleSide });
        const sail = new THREE.Mesh(kiteGeo, kMat);
        kGroup.add(sail);

        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.02), new THREE.MeshBasicMaterial({ color: 0xFDFDFD }));
        tail.position.y = -1.6;
        kGroup.add(tail);

        this.group.add(kGroup);

        this.kites.push({
          mesh: kGroup,
          tail: tail,
          baseY: ky,
          baseRotY: Math.random() * Math.PI,
          phase: Math.random() * 10
        });
      }
    }

    lifeGroup.add(pipGroup);

    // 2. SÍTIO & POMAR AGROFLORESTAL DA COLINA (x: 96, z: -28 — Terraço Unificado em Pedra Carioca & Madeira)
    const agroX = 96.0, agroZ = -28.0;
    const getElev = (px, pz) => (this.terrain ? this.terrain.getElevation(px, pz) : 6.8);
    const agroYC = getElev(agroX, agroZ);
    const agroYMin = Math.min(
      agroYC,
      getElev(agroX - 6.5, agroZ - 5.0),
      getElev(agroX + 6.5, agroZ - 5.0),
      getElev(agroX - 6.5, agroZ + 5.0),
      getElev(agroX + 6.5, agroZ + 5.0)
    );
    const agroYMax = Math.max(
      agroYC,
      getElev(agroX - 6.5, agroZ - 5.0),
      getElev(agroX + 6.5, agroZ - 5.0)
    );
    const agroY = Math.max(agroYC, agroYMax - 0.06);
    const agroGroup = new THREE.Group();
    agroGroup.position.set(agroX, agroY, agroZ);

    // Embasamento profundo em pedra carioca e terra batida (elimina 100% muros flutuantes na encosta!)
    const stoneWallMat = new THREE.MeshLambertMaterial({ color: 0x645E58, flatShading: true });
    const warmEarthMat = new THREE.MeshLambertMaterial({ color: 0x8F6D4F, flatShading: true });
    const darkSoilMat = new THREE.MeshLambertMaterial({ color: 0x4A3423, flatShading: true });
    const timberBorderMat = new THREE.MeshLambertMaterial({ color: 0x5C3B24, flatShading: true });

    const baseH = Math.max(4.2, (agroY - agroYMin) + 3.2);
    const terracePlinth = new THREE.Mesh(new THREE.BoxGeometry(13.2, baseH, 10.4), stoneWallMat);
    terracePlinth.position.set(0, -baseH * 0.5 + 0.12, 0);
    terracePlinth.receiveShadow = true;
    terracePlinth.castShadow = true;
    agroGroup.add(terracePlinth);

    const terraceTop = new THREE.Mesh(new THREE.BoxGeometry(12.8, 0.20, 10.0), warmEarthMat);
    terraceTop.position.set(0, 0.14, 0);
    terraceTop.receiveShadow = true;
    agroGroup.add(terraceTop);

    // Escadinha frontal de pedra conectando o patamar agrícola à encosta sul (+Z)
    for (let st = 0; st < 3; st++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.36, 0.52), stoneWallMat);
      step.position.set(-1.2, 0.02 - st * 0.22, 5.2 + st * 0.48);
      step.receiveShadow = true;
      agroGroup.add(step);
    }

    // 4 Canteiros escalonados em moldura de madeira com hortaliças variadas
    const bedSpecs = [
      { x: -3.2, z: -2.0, col: 0x16A34A },
      { x: -3.2, z: 0.6,  col: 0x22C55E },
      { x: -3.2, z: 3.0,  col: 0x15803D },
      { x: 1.4,  z: 2.8,  col: 0x4ADE80 }
    ];
    bedSpecs.forEach((bs) => {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.38, 1.55), timberBorderMat);
      frame.position.set(bs.x, 0.38, bs.z);
      frame.receiveShadow = true;
      agroGroup.add(frame);

      const soil = new THREE.Mesh(new THREE.BoxGeometry(4.15, 0.10, 1.32), darkSoilMat);
      soil.position.set(bs.x, 0.56, bs.z);
      agroGroup.add(soil);

      const cropMat = new THREE.MeshLambertMaterial({ color: bs.col, flatShading: true });
      for (let cx = -1.5; cx <= 1.5; cx += 0.75) {
        const plant = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), cropMat);
        plant.position.set(bs.x + cx, 0.75, bs.z);
        agroGroup.add(plant);
      }
    });

    // Árvores frutíferas tropicais (mamoeiros e cítricos na ala norte/leste do terraço)
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4E342E, flatShading: true });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x16A34A, flatShading: true });
    const fruitMat = new THREE.MeshLambertMaterial({ color: 0xF59E0B, flatShading: true });

    const fruitSpots = [
      { x: -4.6, z: -3.8 }, { x: -1.4, z: -3.8 }, { x: 1.6, z: -3.6 },
      { x: 4.8,  z: -0.4 }, { x: 4.6,  z: 2.8 }
    ];
    fruitSpots.forEach(pt => {
      const tree = new THREE.Group();
      tree.position.set(pt.x, 0.22, pt.z);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.15, 2.2, 5), trunkMat);
      trunk.position.y = 1.1;
      trunk.castShadow = true;
      tree.add(trunk);

      for (let l = 0; l < 5; l++) {
        const lAngle = (l / 5) * Math.PI * 2;
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.4, 4), leafMat);
        leaf.position.set(Math.cos(lAngle) * 0.42, 2.0, Math.sin(lAngle) * 0.42);
        leaf.rotation.x = Math.cos(lAngle) * 0.55;
        leaf.rotation.z = Math.sin(lAngle) * 0.55;
        tree.add(leaf);
      }

      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), fruitMat);
      fruit.position.set(0, 1.78, 0.16);
      tree.add(fruit);

      agroGroup.add(tree);
    });

    // Bica d'água da serra com cocho de pedra
    const troughMat = new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true });
    const waterMat = new THREE.MeshBasicMaterial({ color: 0x38BDF8, transparent: true, opacity: 0.80 });
    const trough = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.8), troughMat);
    trough.position.set(1.2, 0.44, -0.4);
    agroGroup.add(trough);

    const waterSurface = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.65), waterMat);
    waterSurface.position.set(1.2, 0.65, -0.4);
    agroGroup.add(waterSurface);

    // Paiol de ferramentas & Pergolado de colheita com lanterna quente
    const shedMat = new THREE.MeshLambertMaterial({ color: 0x6C4A2D, flatShading: true });
    const shed = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.1, 2.2), shedMat);
    shed.position.set(4.1, 1.25, -2.9);
    shed.castShadow = true;
    agroGroup.add(shed);

    const shedRoof = new THREE.Mesh(new THREE.ConeGeometry(2.1, 0.9, 4), new THREE.MeshLambertMaterial({ color: 0xB45309, flatShading: true }));
    shedRoof.rotation.y = Math.PI / 4;
    shedRoof.position.set(4.1, 2.7, -2.9);
    agroGroup.add(shedRoof);

    // Lanterna quente de alpendre no paiol do Sítio Agroflorestal (mantém contrato de 5 PointLights na cena)
    const porchLight = new THREE.PointLight(0xF59E0B, 1.4, 8);
    porchLight.position.set(2.5, 2.1, -2.4);
    agroGroup.add(porchLight);

    this.propObstacles = this.propObstacles || [];
    this.propObstacles.push({ x: agroX, z: agroZ, hw: 6.4, hd: 5.0, rotY: 0 });
    if (this.infrastructureNodes) {
      this.infrastructureNodes.push({ x: agroX, z: agroZ, r: 7.8, name: 'Pomar & Sítio Agroflorestal' });
    }

    lifeGroup.add(agroGroup);
    this.group.add(lifeGroup);
  }
};
