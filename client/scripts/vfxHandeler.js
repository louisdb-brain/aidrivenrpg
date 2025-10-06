
import * as THREE from 'three';

export class vfxHandler {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.effects = [];
    }

    spawn(texturePath, position, mode = 'billboard', size = 1, lifetime = 1000) {
        const texture = new THREE.TextureLoader().load(texturePath);
        if (mode === 'flat') {
            const geometry = new THREE.PlaneGeometry(size, size);
            const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
            const plane = new THREE.Mesh(geometry, material);
            plane.rotation.x = -Math.PI / 2; // lie on ground
            plane.position.copy(position);
            this.scene.add(plane);

            this.effects.push({
                sprite: plane,
                mode,
                lifetime,
                startTime: performance.now(),
                material
            });
        } else {
            const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const sprite = new THREE.Sprite(material);
            sprite.position.copy(position);
            sprite.scale.set(size, size, 1);
            this.scene.add(sprite);

            this.effects.push({
                sprite,
                mode,
                lifetime,
                startTime: performance.now(),
                material
            });
        }
    }


    update() {
        const now = performance.now();
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];

            if (effect.mode === 'billboard') {
                effect.sprite.lookAt(this.camera.position);
            } else if (effect.mode === 'flat') {
                effect.sprite.rotation.set(-Math.PI / 2, 0, 0); // force to stay flat
            }

            if (now - effect.startTime > effect.lifetime) {
                this.scene.remove(effect.sprite);
                this.effects.splice(i, 1);
            }
        }
    }

}
