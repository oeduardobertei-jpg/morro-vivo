import * as THREE from 'three';

export class CinematicCamera {
  constructor(camera, controls, terrain = null) {
    this.camera = camera;
    this.controls = controls;
    this.terrain = terrain;
    this.enabled = false;
    this.currentPreset = 'pan';
    this.time = 0;
    this.isUserInteracting = false;
    this.userInteractionCooldown = 0;

    // Working vectors to prevent allocation in animation loop
    this.desiredCam = new THREE.Vector3();
    this.desiredTarget = new THREE.Vector3();

    // Listen to user mouse interaction on OrbitControls
    if (this.controls) {
      this.controls.addEventListener('start', () => {
        this.isUserInteracting = true;
      });
      this.controls.addEventListener('end', () => {
        this.isUserInteracting = false;
        this.userInteractionCooldown = 1.8; // Wait 1.8s before resuming cinematic drift
      });
    }
  }

  setTerrain(terrain) {
    this.terrain = terrain;
  }

  setPreset(presetKey) {
    this.currentPreset = presetKey;
    this.userInteractionCooldown = 0;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.userInteractionCooldown = 0;
    }
    return this.enabled;
  }

  update(delta) {
    if (!this.enabled || !this.camera || !this.controls) return;

    // Wall-clock delta protection
    const dt = Math.min(delta, 0.1);
    this.time += dt;

    if (this.isUserInteracting) {
      this.controls.update();
      return;
    }

    if (this.userInteractionCooldown > 0) {
      this.userInteractionCooldown -= dt;
      this.controls.update();
      return;
    }

    // Compute smooth continuous cinematic path based on selected district / bookmark
    this.calculateCinematicTrajectory(this.currentPreset, this.time, this.desiredCam, this.desiredTarget);

    // Terrain-aware anti-clipping guarantee:
    // Ensure camera always floats high above local ground and line-of-sight ridges
    if (this.terrain && typeof this.terrain.getElevation === 'function') {
      const groundAtCam = this.terrain.getElevation(this.desiredCam.x, this.desiredCam.z);
      const midX = (this.desiredCam.x + this.desiredTarget.x) * 0.5;
      const midZ = (this.desiredCam.z + this.desiredTarget.z) * 0.5;
      const groundAtMid = this.terrain.getElevation(midX, midZ);
      const minSafeY = Math.max(groundAtCam + 11.5, groundAtMid + 9.0, 8.0);
      if (this.desiredCam.y < minSafeY) {
        this.desiredCam.y = minSafeY;
      }

      const groundAtTarget = this.terrain.getElevation(this.desiredTarget.x, this.desiredTarget.z);
      if (this.desiredTarget.y < groundAtTarget + 1.8) {
        this.desiredTarget.y = groundAtTarget + 1.8;
      }
    }

    // Smooth lerp: seamlessly blends from wherever the camera currently is into the cinematic flight path
    const lerpSpeed = Math.min(1.0, dt * 1.85);
    this.camera.position.lerp(this.desiredCam, lerpSpeed);
    this.controls.target.lerp(this.desiredTarget, lerpSpeed);
    this.controls.update();
  }

  calculateCinematicTrajectory(preset, t, outCam, outTarget) {
    switch (preset) {
      case 'prainha': {
        // PORTO PESQUEIRO, FAROL DO CABO, PÍER & FROTA EM ALTO-MAR:
        // Enquadra diretamente o Píer dos Pescadores (-78, 74..96), o Farol (-60, 68),
        // a Enseada das Canoas (-96, 54) e os barcos/cardumes navegando no mar fundo!
        const s = t * 0.085;
        outCam.set(
          -78.0 + Math.sin(s) * 34.0,
          20.0 + Math.sin(s * 1.3) * 3.5,
          122.0 + Math.cos(s) * 16.0
        );
        outTarget.set(
          -78.0 + Math.cos(s * 0.85) * 15.0,
          2.2 + Math.sin(s * 0.5) * 0.8,
          84.0 + Math.sin(s * 0.7) * 14.0
        );
        break;
      }

      case 'morro': {
        // MORRO DO SOL (Centro):
        // Panoramic frontal amphitheater arc on the sunny seaward side (never dipping behind the hill or staring at the dirt base).
        // Frames the Terreiro de Samba, Pórtico das Fitinhas, Alameda do Samba, Olaria, and tiered community houses!
        const s = t * 0.085;
        outCam.set(
          -2.0 + Math.sin(s) * 36.0,
          33.0 + Math.cos(s * 1.4) * 4.0,
          28.0 + Math.cos(s * 0.9) * 10.0
        );
        outTarget.set(
          -2.0 + Math.sin(s * 0.7) * 12.0,
          16.5 + Math.cos(s * 0.5) * 1.5,
          -16.0 + Math.cos(s * 0.6) * 6.0
        );
        break;
      }

      case 'bonde': {
        // LINHA DO BONDINHO & MOTOTÁXIS DA SERRA:
        // Glides parallel to the cable car line (X=13.5, Z=14 to -60), tracking cabins and hillside roads
        const s = t * 0.09;
        outCam.set(
          38.0 + Math.cos(s) * 8.0,
          32.0 + Math.sin(s * 1.2) * 5.0,
          -4.0 + Math.sin(s) * 26.0
        );
        outTarget.set(
          13.5 + Math.sin(s * 0.6) * 4.0,
          15.5 + Math.cos(s * 0.8) * 3.5,
          -26.0 + Math.sin(s * 0.9) * 18.0
        );
        break;
      }

      case 'serra': {
        // ALTO DA SERRA (Norte):
        // Majestic high-altitude sweep across the Solar Park, Upper Bondinho Station, Mirante Imperial, and Radio Tower
        const s = t * 0.075;
        outCam.set(
          Math.sin(s) * 38.0,
          49.0 + Math.cos(s * 1.3) * 5.0,
          -18.0 + Math.cos(s * 0.8) * 14.0
        );
        outTarget.set(
          Math.sin(s * 0.9) * 18.0,
          19.5 + Math.sin(s * 0.5) * 2.5,
          -70.0 + Math.cos(s * 0.8) * 10.0
        );
        break;
      }

      case 'varzea': {
        // POLO DA VÁRZEA (Leste):
        // Sweeping drone tracking the Pelada soccer match, Cultural Fair, Mototáxi Point, and Surf School
        const s = t * 0.09;
        outCam.set(
          82.0 + Math.cos(s) * 18.0,
          26.0 + Math.sin(s * 1.3) * 4.0,
          42.0 + Math.sin(s) * 12.0
        );
        outTarget.set(
          62.0 + Math.sin(s * 0.8) * 12.0,
          6.2 + Math.cos(s * 0.5) * 1.5,
          2.0 + Math.cos(s * 0.9) * 8.0
        );
        break;
      }

      case 'cume': {
        // CRISTA DO CUME, MIRANTE IMPERIAL (50, -102), TORRE DE RÁDIO (0, -104) & PIPÓDROMO:
        const s = t * 0.075;
        outCam.set(
          16.0 + Math.sin(s) * 42.0,
          52.0 + Math.cos(s * 1.2) * 4.5,
          -56.0 + Math.cos(s * 0.85) * 14.0
        );
        outTarget.set(
          14.0 + Math.sin(s * 0.8) * 26.0,
          26.5 + Math.cos(s * 0.5) * 2.0,
          -100.0 + Math.cos(s * 0.7) * 6.0
        );
        break;
      }

      case 'pan':
      default: {
        // PANORÂMICA CONTINENTAL (Visão Geral):
        // Grand coastal crescent survey from the Atlantic bay (never flying behind the northern backwall)
        const s = t * 0.055;
        outCam.set(
          Math.sin(s) * 105.0,
          56.0 + Math.cos(s * 1.4) * 7.0,
          105.0 + Math.cos(s * 0.8) * 24.0
        );
        outTarget.set(
          Math.sin(s * 0.6) * 24.0,
          14.0 + Math.cos(s * 0.4) * 2.5,
          -16.0 + Math.cos(s * 0.5) * 10.0
        );
        break;
      }
    }
  }
}
