import * as THREE from 'three';

/** Evento do Menino da Pipa. */
export const KiteMixin = {
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
  },

  createKiteLine() {
    const lineMat = new THREE.LineBasicMaterial({ color: 0xCBD5E1, transparent: true, opacity: 0.65 });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 10, 0)
    ]);
    return new THREE.Line(lineGeo, lineMat);
  },

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
  },

  triggerAutonomousKite() {
    const candidates = this.npcs.filter(n =>
      !n.isBuilder && !n.isCourier && !n.isBarraqueiro && !n.isScenicMirante &&
      !n.isFisherman && !n.isAthlete && !n.isMateiro &&
      !n.isCapoeira && !n.isHorta && !n.isMototaxi && !n.isSurfer && !n.isCalistenia &&
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
  },

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
};
