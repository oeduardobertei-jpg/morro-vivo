import * as THREE from 'three';

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.time = 0;
    this.kites = [];
    this.birds = [];
    this.fishingBoatTarget = null; // Can be set by fishing boats to attract gaivotas!

    // Automatic Continuous Day/Sunset/Night/Dawn Cycle:
    // Cycle duration: 220 seconds (approx 3.6 mins per 24h day at 1x speed)
    this.cycleTime = 25.0; // Start at pleasant mid-morning
    this.cycleDuration = 220.0;
    this.currentPhase = 'day'; // 'day', 'sunset', 'night', 'dawn'
    this.isAutoCycle = true;
    this.phaseListeners = [];

    this.init();
    this.scene.add(this.group);
  }

  init() {
    this.setupLightingAndSky();
    this.createStylizedTropicalOcean();
    this.createDynamicShorelineSurf();
    this.createStarsAndMoon();
    this.createKites();
    this.createSeabirds();
  }

  setupLightingAndSky() {
    // Crisp summer Rio azure sky initially
    this.scene.background = new THREE.Color('#58B4E3');
    this.scene.fog = new THREE.Fog('#7EC8E8', 120, 480);

    // Ambient Hemisphere Light (Sky vs Ground bounce)
    this.hemiLight = new THREE.HemisphereLight(0xE1F5FE, 0x2E7D32, 1.15);
    this.scene.add(this.hemiLight);

    // Directional Celestial Light (Sun by day / Moon by night)
    this.dirLight = new THREE.DirectionalLight(0xFFF9E6, 2.6);
    this.dirLight.position.set(-60, 95, 50);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 380;
    this.dirLight.shadow.camera.left = -140;
    this.dirLight.shadow.camera.right = 140;
    this.dirLight.shadow.camera.top = 140;
    this.dirLight.shadow.camera.bottom = -140;
    this.dirLight.shadow.bias = -0.0003;
    this.scene.add(this.dirLight);

    // Sun disc visible in sky
    const sunGeo = new THREE.SphereGeometry(9, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFF9C4 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.copy(this.dirLight.position).multiplyScalar(2.0);
    this.group.add(this.sunMesh);
  }

  createStarsAndMoon() {
    // 1. Crescent / Full Silver Luminous Moon for the Tropical Night
    const moonGeo = new THREE.SphereGeometry(7.5, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xEEF6FF });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.moonMesh.position.set(70, 110, -50);
    this.moonMesh.visible = false;
    this.group.add(this.moonMesh);

    // 2. Twinkling Low-Poly Starfield (160 stars scattered across the celestial dome)
    const starGeo = new THREE.BufferGeometry();
    const starCount = 180;
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.75 + 0.25); // Only upper hemisphere above horizon
      const radius = 260 + Math.random() * 40;

      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi);
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 2.8,
      transparent: true,
      opacity: 0.0,
      fog: false
    });

    this.stars = new THREE.Points(starGeo, this.starMat);
    this.group.add(this.stars);
  }

  createStylizedTropicalOcean() {
    const waterGeo = new THREE.PlaneGeometry(480, 360, 96, 72);
    waterGeo.rotateX(-Math.PI / 2);

    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x0077B6,
      roughness: 0.12,
      metalness: 0.20,
      flatShading: true,
      transparent: false
    });

    this.waterMesh = new THREE.Mesh(waterGeo, this.waterMat);
    this.waterMesh.position.set(0, 0.02, 180);
    this.waterMesh.receiveShadow = true;
    this.group.add(this.waterMesh);

    this.waterPos = waterGeo.attributes.position;
    this.waterOriginalY = [];
    for (let i = 0; i < this.waterPos.count; i++) {
      this.waterOriginalY.push(this.waterPos.getY(i));
    }
  }

  createDynamicShorelineSurf() {
    const surfGroup = new THREE.Group();

    this.surfFoamMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });

    this.surfWashMat = new THREE.MeshBasicMaterial({
      color: 0xCCFBF1,
      transparent: true,
      opacity: 0.40,
      side: THREE.DoubleSide
    });

    const buildCurvedSurfStrip = (xMin, xMax, widthLand = 1.1, widthSea = 1.4, step = 1.6) => {
      const positions = [];
      const indices = [];

      let vertCount = 0;
      for (let x = xMin; x <= xMax; x += step) {
        const shoreZ = 74.0 + Math.sin(x * 0.015) * 3.5;
        positions.push(x, 0.045, shoreZ - widthLand);
        positions.push(x, 0.025, shoreZ + widthSea);

        if (vertCount >= 2) {
          const v0 = vertCount - 2;
          const v1 = vertCount - 1;
          const v2 = vertCount;
          const v3 = vertCount + 1;
          indices.push(v0, v1, v2);
          indices.push(v2, v1, v3);
        }
        vertCount += 2;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    };

    // West strip (x: -120 to -84)
    const foamGeoWest = buildCurvedSurfStrip(-120, -84, 0.9, 1.2, 1.6);
    this.foamWest = new THREE.Mesh(foamGeoWest, this.surfFoamMat);
    surfGroup.add(this.foamWest);

    const washGeoWest = buildCurvedSurfStrip(-120, -84, 1.8, 0.7, 1.6);
    this.washWest = new THREE.Mesh(washGeoWest, this.surfWashMat);
    surfGroup.add(this.washWest);

    // East strip (x: -72 to 120)
    const foamGeoEast = buildCurvedSurfStrip(-72, 120, 0.9, 1.2, 1.6);
    this.foamEast = new THREE.Mesh(foamGeoEast, this.surfFoamMat);
    surfGroup.add(this.foamEast);

    const washGeoEast = buildCurvedSurfStrip(-72, 120, 1.8, 0.7, 1.6);
    this.washEast = new THREE.Mesh(washGeoEast, this.surfWashMat);
    surfGroup.add(this.washEast);

    this.group.add(surfGroup);
    this.surfGroup = surfGroup;
  }

  createKites() {
    const kitePositions = [
      { x: -78, y: 19, z: -50, color: 0xEF4444 },
      { x: -84, y: 22, z: -46, color: 0xFACC15 },
      { x: -74, y: 25, z: -56, color: 0x3B82F6 },
      { x: -90, y: 20, z: -54, color: 0x10B981 }
    ];

    kitePositions.forEach((kp, idx) => {
      const kiteGroup = new THREE.Group();
      kiteGroup.position.set(kp.x, kp.y, kp.z);

      const kiteGeo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0.9, 0,
        -0.7, 0, 0,
        0.7, 0, 0,
        0, -1.1, 0
      ]);
      const indices = [0, 1, 2, 1, 3, 2];
      kiteGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      kiteGeo.setIndex(indices);
      kiteGeo.computeVertexNormals();

      const kiteMat = new THREE.MeshBasicMaterial({ color: kp.color, side: THREE.DoubleSide });
      const kiteMesh = new THREE.Mesh(kiteGeo, kiteMat);
      kiteGroup.add(kiteMesh);

      // Tail with bows
      const tailGroup = new THREE.Group();
      tailGroup.position.set(0, -1.1, 0);
      for (let b = 1; b <= 4; b++) {
        const bow = new THREE.Mesh(
          new THREE.BoxGeometry(0.25, 0.08, 0.02),
          new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
        );
        bow.position.set(Math.sin(b * 0.9) * 0.15, -b * 0.45, 0);
        tailGroup.add(bow);
      }
      kiteGroup.add(tailGroup);

      this.group.add(kiteGroup);
      this.kites.push({
        group: kiteGroup,
        basePos: { ...kp },
        phase: idx * 1.3,
        tail: tailGroup
      });
    });
  }

  createSeabirds() {
    // 8 dynamic Carioca seabirds / gaivotas flying across the bay
    this.birds = [];
    for (let i = 0; i < 8; i++) {
      const birdGroup = new THREE.Group();
      const wingMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide });

      const leftWingGeo = new THREE.BufferGeometry();
      const leftVerts = new Float32Array([
        0, 0, 0,
        -1.3, 0.25, -0.3,
        0, 0, -0.5
      ]);
      leftWingGeo.setAttribute('position', new THREE.BufferAttribute(leftVerts, 3));
      const leftWing = new THREE.Mesh(leftWingGeo, wingMat);
      birdGroup.add(leftWing);

      const rightWingGeo = new THREE.BufferGeometry();
      const rightVerts = new Float32Array([
        0, 0, 0,
        1.3, 0.25, -0.3,
        0, 0, -0.5
      ]);
      rightWingGeo.setAttribute('position', new THREE.BufferAttribute(rightVerts, 3));
      const rightWing = new THREE.Mesh(rightWingGeo, wingMat);
      birdGroup.add(rightWing);

      birdGroup.position.set(-30 + i * 20, 16 + (i % 3) * 3, 60 + i * 12);
      this.group.add(birdGroup);

      this.birds.push({
        group: birdGroup,
        radius: 35 + i * 9,
        center: { x: -20 + (i % 4) * 25, z: 80 + (i % 3) * 20 },
        speed: 0.35 + i * 0.05,
        angle: (i / 8) * Math.PI * 2,
        swoopTimer: Math.random() * 8.0,
        isSwooping: false,
        baseY: 15 + (i % 3) * 3,
        leftWing,
        rightWing
      });
    }
  }

  // Set time of day manually or query current phase
  // Set time of day manually or query current phase
  getTimeOfDay() {
    return {
      phase: this.currentPhase,
      progress: this.getCycleProgress(),
      toString() { return this.phase; }
    };
  }

  getCycleProgress() {
    return (this.cycleTime % this.cycleDuration) / this.cycleDuration;
  }

  onPhaseChange(callback) {
    this.phaseListeners.push(callback);
  }

  notifyPhaseChange(phase) {
    const data = { phase: phase, progress: this.getCycleProgress() };
    this.phaseListeners.forEach(cb => cb(data));
  }

  setTimeOfDay(phaseKey) {
    if (phaseKey === 'day') this.cycleTime = 25.0;
    else if (phaseKey === 'sunset') this.cycleTime = 105.0;
    else if (phaseKey === 'night') this.cycleTime = 150.0;
    else if (phaseKey === 'dawn') this.cycleTime = 205.0;
    this.currentPhase = phaseKey;
    this.applyLighting(0, true);
    this.notifyPhaseChange(phaseKey);
  }

  toggleTimeOfDay() {
    const sequence = ['day', 'sunset', 'night'];
    const nextIdx = (sequence.indexOf(this.currentPhase) + 1) % sequence.length;
    this.setTimeOfDay(sequence[nextIdx]);
    return sequence[nextIdx];
  }

  applyLighting(delta, instant = false) {
    const progress = (this.cycleTime % this.cycleDuration) / this.cycleDuration;
    let targetPhase = 'day';

    // 0.00 .. 0.42: Day Tropical (Crisp summer azure)
    // 0.42 .. 0.58: Entardecer / Sunset (Amber, violet, golden horizon)
    // 0.58 .. 0.88: Noite Carioca Iluminada (Luminous deep blue, NEVER pitch black!)
    // 0.88 .. 1.00: Alvorecer / Dawn (Soft rose and azure morning glow)
    if (progress < 0.42) {
      targetPhase = 'day';
    } else if (progress < 0.58) {
      targetPhase = 'sunset';
    } else if (progress < 0.88) {
      targetPhase = 'night';
    } else {
      targetPhase = 'dawn';
    }

    if (targetPhase !== this.currentPhase) {
      this.currentPhase = targetPhase;
      this.notifyPhaseChange(this.currentPhase);
    }

    // Smoothly calculate celestial arc:
    // Sun rises in East (+X), peaks at noon, sets in West (-X)
    const sunAngle = progress * Math.PI * 2;
    const sunX = Math.cos(sunAngle) * 110;
    const sunY = Math.sin(sunAngle) * 95;
    const sunZ = Math.sin(sunAngle * 0.5) * 45 + 20;

    const isDaylight = (sunY > -10);
    this.sunMesh.visible = isDaylight;
    this.moonMesh.visible = !isDaylight || (progress > 0.45 && progress < 0.95);

    if (isDaylight) {
      this.dirLight.position.set(sunX, Math.max(12, sunY), sunZ);
      this.sunMesh.position.copy(this.dirLight.position).multiplyScalar(2.0);
    } else {
      // Moon lighting position
      const moonX = -sunX;
      const moonY = Math.max(25, -sunY);
      const moonZ = -sunZ;
      this.dirLight.position.set(moonX, moonY, moonZ);
      this.moonMesh.position.set(moonX * 1.8, moonY * 1.8, moonZ * 1.8);
    }

    // Color Palettes & Atmosphere Blend:
    // IMPORTANT: Night is calibrated with high ambient luminosity so the game is NEVER too dark!
    const lerpColor = (c1, c2, t) => new THREE.Color(c1).lerp(new THREE.Color(c2), t);
    const rate = instant ? 1.0 : 0.08;

    if (targetPhase === 'day') {
      this.scene.background.lerp(new THREE.Color('#58B4E3'), rate);
      this.scene.fog.color.lerp(new THREE.Color('#7EC8E8'), rate);
      this.hemiLight.color.lerp(new THREE.Color(0xE1F5FE), rate);
      this.hemiLight.groundColor.lerp(new THREE.Color(0x2E7D32), rate);
      this.hemiLight.intensity = 1.15;
      this.dirLight.color.lerp(new THREE.Color(0xFFF9E6), rate);
      this.dirLight.intensity = 2.6;
      if (this.starMat) this.starMat.opacity = instant ? 0.0 : Math.max(0, this.starMat.opacity - 0.08);
      if (this.waterMat) this.waterMat.color.lerp(new THREE.Color(0x0077B6), rate);
    } else if (targetPhase === 'sunset') {
      const sunsetT = (progress - 0.42) / 0.16;
      const skyCol = lerpColor('#F97316', '#7C3AED', sunsetT);
      this.scene.background.lerp(skyCol, rate);
      this.scene.fog.color.lerp(new THREE.Color('#FB923C'), rate);
      this.hemiLight.color.lerp(new THREE.Color(0xFED7AA), rate);
      this.hemiLight.groundColor.lerp(new THREE.Color(0x78350F), rate);
      this.hemiLight.intensity = 1.10;
      this.dirLight.color.lerp(new THREE.Color(0xF59E0B), rate);
      this.dirLight.intensity = 2.2;
      if (this.starMat) this.starMat.opacity = instant ? (sunsetT * 0.4) : Math.min(0.4, sunsetT * 0.4);
      if (this.waterMat) this.waterMat.color.lerp(new THREE.Color(0x0284C7), rate);
    } else if (targetPhase === 'night') {
      // LUMINOUS NIGHT: Deep cobalt blue sky, sparkling stars, bright moon bounce, zero murky darkness!
      this.scene.background.lerp(new THREE.Color('#111D33'), rate);
      this.scene.fog.color.lerp(new THREE.Color('#1A2C4A'), rate);
      this.hemiLight.color.lerp(new THREE.Color(0x6080A8), rate);
      this.hemiLight.groundColor.lerp(new THREE.Color(0x1F3A2E), rate);
      this.hemiLight.intensity = 0.95; // Crisp luminous ambient moonlight
      this.dirLight.color.lerp(new THREE.Color(0xD4E6F8), rate);
      this.dirLight.intensity = 1.35;
      if (this.starMat) this.starMat.opacity = instant ? 0.85 : Math.min(0.85, this.starMat.opacity + 0.08);
      if (this.waterMat) this.waterMat.color.lerp(new THREE.Color(0x0A3654), rate);
    } else if (targetPhase === 'dawn') {
      const dawnT = (progress - 0.88) / 0.12;
      const dawnCol = lerpColor('#F43F5E', '#38BDF8', dawnT);
      this.scene.background.lerp(dawnCol, rate);
      this.scene.fog.color.lerp(new THREE.Color('#FCA5A5'), rate);
      this.hemiLight.color.lerp(new THREE.Color(0xBAE6FD), rate);
      this.hemiLight.groundColor.lerp(new THREE.Color(0x166534), rate);
      this.hemiLight.intensity = 1.10;
      this.dirLight.color.lerp(new THREE.Color(0xFDE047), rate);
      this.dirLight.intensity = 2.0;
      if (this.starMat) this.starMat.opacity = instant ? 0.0 : Math.max(0, this.starMat.opacity - 0.06);
      if (this.waterMat) this.waterMat.color.lerp(new THREE.Color(0x0284C7), rate);
    }
  }

  update(delta) {
    this.time += delta;

    // Advance continuous automatic day/night cycle
    if (this.isAutoCycle) {
      this.cycleTime += delta;
      this.applyLighting(delta);
    }

    // Dynamic wave motion with shoreline dampening
    if (this.waterPos) {
      const meshCenterZ = this.waterMesh.position.z;

      for (let i = 0; i < this.waterPos.count; i++) {
        const u = this.waterPos.getX(i);
        const v = this.waterPos.getZ(i);
        const worldZ = meshCenterZ + v;

        const shoreZ = 74.0 + Math.sin(u * 0.015) * 3.5;
        const distFromShore = worldZ - shoreZ;
        const shoreFactor = Math.min(1.0, Math.max(0.0, distFromShore / 22.0));

        const wave = (
          Math.sin(u * 0.05 + this.time * 1.3) * 0.22 +
          Math.cos(worldZ * 0.06 + this.time * 1.0) * 0.18
        ) * shoreFactor;

        this.waterPos.setY(i, this.waterOriginalY[i] + wave);
      }
      this.waterPos.needsUpdate = true;
    }

    // Dynamic surf wash
    if (this.surfGroup) {
      const surfCycle = Math.sin(this.time * 1.4);
      const ebbFlow = (surfCycle + 1) * 0.5;

      if (this.foamWest && this.foamEast) {
        this.foamWest.position.z = surfCycle * 0.35;
        this.foamEast.position.z = surfCycle * 0.35;
      }
      if (this.washWest && this.washEast) {
        this.washWest.position.z = -ebbFlow * 0.85;
        this.washEast.position.z = -ebbFlow * 0.85;
      }
      this.surfGroup.position.y = 0.01 + ebbFlow * 0.02;

      if (this.surfFoamMat) this.surfFoamMat.opacity = 0.70 + ebbFlow * 0.25;
      if (this.surfWashMat) this.surfWashMat.opacity = 0.20 + ebbFlow * 0.25;
    }

    // Kites dance
    this.kites.forEach(k => {
      const sway = Math.sin(this.time * 2.2 + k.phase) * 0.15;
      const bob = Math.cos(this.time * 1.8 + k.phase) * 0.35;
      k.group.position.y = k.basePos.y + bob;
      k.group.rotation.z = sway;
      if (k.tail) k.tail.rotation.z = Math.sin(this.time * 3 + k.phase) * 0.25;
    });

    // Dynamic Seabirds / Gaivotas
    this.birds.forEach(b => {
      b.angle += b.speed * delta;

      // If fishing boat is active at sea, gaivotas flock towards the boat!
      let targetCenter = b.center;
      if (this.fishingBoatTarget) {
        targetCenter = this.fishingBoatTarget;
      }

      b.group.position.x += ((targetCenter.x + Math.cos(b.angle) * b.radius) - b.group.position.x) * delta * 0.8;
      b.group.position.z += ((targetCenter.z + Math.sin(b.angle) * b.radius) - b.group.position.z) * delta * 0.8;
      b.group.rotation.y = -b.angle - Math.PI / 2;

      // Periodic swooping down to water surface to catch fish
      b.swoopTimer -= delta;
      if (b.swoopTimer <= 0) {
        b.isSwooping = true;
        if (b.swoopTimer < -2.5) {
          b.isSwooping = false;
          b.swoopTimer = 6.0 + Math.random() * 8.0;
        }
      }

      const targetY = b.isSwooping ? Math.max(1.5, b.baseY - 11.5) : b.baseY;
      b.group.position.y += (targetY - b.group.position.y) * delta * 1.8;

      const flap = Math.sin(this.time * 7) * 0.28;
      b.leftWing.rotation.z = flap;
      b.rightWing.rotation.z = -flap;
    });
  }
}
