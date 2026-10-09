import * as THREE from 'three';

/** Faíscas e paisagem sonora da roda de samba. */
export const SambaMixin = {
  spawnSambaSpark(pos) {
    if (this.sambaSparks.length > 25) return;
    const spark = new THREE.Mesh(this.sharedSparkGeo, this.sharedSparkMat);
    spark.position.set(pos.x + (Math.random() - 0.5) * 0.6, pos.y, pos.z + (Math.random() - 0.5) * 0.6);
    this.group.add(spark);
    this.sambaSparks.push({
      mesh: spark,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.35, 1.2 + Math.random() * 0.8, (Math.random() - 0.5) * 0.35),
      life: 1.4
    });
  },

  // CENTRALIZED SPATIAL SAMBA SOUNDSCAPE (Desacoplado de slots individuais)
  updateSambaSoundscape(delta, time) {
    if (!this.soundtrack || !this.soundtrack.playSambaRhythm) return;

    const curTime = this.env ? this.env.getTimeOfDay() : 'day';
    const curPhase = (typeof curTime === 'string') ? curTime : (curTime.phase || 'day');
    const isNightOrSunset = (curPhase === 'night' || curPhase === 'sunset');

    const plazaY = this.getFloorElevation(-2.0, -4.0);
    const plazaCenter = { x: -2.0, y: plazaY, z: -4.0 };

    this.sambaAudioCooldown = (this.sambaAudioCooldown || 0) - delta;

    if (isNightOrSunset) {
      // Conta quantos participantes já chegaram à Praça do Samba ou estão no raio de 14 metros
      let participantsInPlaza = 0;
      for (let i = 0; i < this.npcs.length; i++) {
        const n = this.npcs[i];
        if (n.sambaState && (n.sambaState.isActive || Math.hypot(n.group.position.x - (-2.0), n.group.position.z - (-4.0)) < 14.0)) {
          participantsInPlaza++;
        }
      }

      // Se houver pelo menos 1 participante na praça, a roda com surdo, pandeiro, cavaco e palmas toca a cada 2.30s!
      if (participantsInPlaza >= 1) {
        if (this.sambaAudioCooldown <= 0) {
          this.sambaAudioCooldown = 2.30;
          try {
            this.soundtrack.playSambaRhythm(plazaCenter, true);
          } catch (e) {
            console.warn('Samba soundscape guarded:', e);
          }
        }
        // Fogueira crepitando e fagulhas douradas ao redor
        if (Math.random() < 0.25) {
          this.spawnSambaSpark({ x: -2.0, y: plazaY + 0.8, z: -4.0 });
        }
      }
    } else {
      // Durante o Dia Tropical: solo acústico intimista de cavaquinho do Músico Cênico do Terreiro!
      if (this.sambaAudioCooldown <= 0) {
        this.sambaAudioCooldown = 3.60;
        try {
          this.soundtrack.playSambaRhythm(plazaCenter, false);
        } catch (e) {
          console.warn('Daytime samba guarded:', e);
        }
      }
    }
  }
};
