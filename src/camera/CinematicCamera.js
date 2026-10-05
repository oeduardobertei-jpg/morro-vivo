import * as THREE from 'three';

export class CinematicCamera {
  constructor(camera, controls) {
    this.camera = camera;
    this.controls = controls;
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

  setPreset(presetKey) {
    this.currentPreset = presetKey;
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
      // User is manually rotating/panning with the mouse: allow OrbitControls full control
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

    // Smooth lerp: seamlessly blends from wherever the camera currently is into the cinematic flight path
    // Lerp factor tuned to be buttery smooth (~1.6 * dt gives graceful transitions)
    const lerpSpeed = Math.min(1.0, dt * 1.6);
    this.camera.position.lerp(this.desiredCam, lerpSpeed);
    this.controls.target.lerp(this.desiredTarget, lerpSpeed);
    this.controls.update();
  }

  calculateCinematicTrajectory(preset, t, outCam, outTarget) {
    switch (preset) {
      case 'prainha': {
        // PORTO, BEIRA DA PRAIA & CAIS DOS PESCADORES:
        // Slow coastal glide past the deep-water fishing pier, boats, leaning palms, beach stalls, and bathers
        const s = t * 0.080;
        outCam.set(
          -65.0 + Math.sin(s) * 35.0,
          26.0 + Math.sin(s * 1.4) * 4.0,
          92.0 + Math.cos(s) * 16.0
        );
        outTarget.set(
          -35.0 + Math.sin(s * 0.8) * 25.0,
          3.5 + Math.sin(s * 0.5) * 1.5,
          48.0 + Math.cos(s * 0.9) * 12.0
        );
        break;
      }

      case 'serra': {
        // ALTO DA SERRA (Norte):
        // Majestic high-altitude sweep across solar panels, aqueduct, windmills, and alpine peaks
        const s = t * 0.075;
        outCam.set(
          Math.sin(s) * 38.0,
          48.0 + Math.cos(s * 1.3) * 6.0,
          -22.0 + Math.sin(s * 0.7) * 14.0
        );
        outTarget.set(
          Math.sin(s * 0.9) * 14.0,
          16.5 + Math.sin(s * 0.5) * 3.0,
          -68.0 + Math.cos(s * 0.8) * 8.0
        );
        break;
      }

      case 'varzea': {
        // POLO DA VÁRZEA (Leste):
        // Sweeping drone tracking the soccer match at the campinho, the cultural fair, and palm grove
        const s = t * 0.09;
        outCam.set(
          84.0 + Math.cos(s) * 16.0,
          24.0 + Math.sin(s * 1.4) * 4.0,
          46.0 + Math.sin(s) * 14.0
        );
        outTarget.set(
          58.0 + Math.sin(s * 0.8) * 10.0,
          4.8 + Math.cos(s * 0.5) * 1.8,
          4.0 + Math.cos(s * 0.9) * 7.0
        );
        break;
      }

      case 'morro': {
        // MORRO DO SOL (Centro):
        // Intimate 360° circular glide around the Samba Plaza, bustling stairs, and colorful tiered houses
        const s = t * 0.08;
        const radius = 38.0;
        outCam.set(
          -2.0 + Math.sin(s) * radius,
          27.0 + Math.sin(s * 1.6) * 4.5,
          -4.0 + Math.cos(s) * radius
        );
        outTarget.set(
          -2.0 + Math.sin(s * 0.6) * 6.0,
          11.5 + Math.cos(s * 0.4) * 2.0,
          -4.0 + Math.cos(s * 0.6) * 6.0
        );
        break;
      }

      case 'cume': {
        // FENDA DO CUME & MIRANTES:
        // Alpine ridge flight overlooking the sunset mirante and red aviation beacon on the radio tower
        const s = t * 0.07;
        outCam.set(
          Math.sin(s) * 34.0,
          40.0 + Math.sin(s * 1.2) * 5.0,
          -48.0 + Math.cos(s) * 16.0
        );
        outTarget.set(
          Math.sin(s * 0.8) * 16.0,
          14.0 + Math.cos(s * 0.5) * 3.0,
          -92.0 + Math.cos(s * 0.7) * 10.0
        );
        break;
      }

      case 'pan':
      default: {
        // PANORÂMICA CONTINENTAL (Visão Geral):
        // Ultra-slow grand 360° orbital survey of the entire island, beach, and mountains
        const s = t * 0.045;
        const panRadius = 138.0;
        outCam.set(
          Math.sin(s) * panRadius,
          58.0 + Math.sin(s * 1.5) * 8.0,
          -15.0 + Math.cos(s) * panRadius
        );
        outTarget.set(
          Math.sin(s * 0.5) * 12.0,
          12.0 + Math.cos(s * 0.3) * 3.0,
          -15.0 + Math.cos(s * 0.5) * 12.0
        );
        break;
      }
    }
  }
}
