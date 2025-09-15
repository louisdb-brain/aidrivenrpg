import * as THREE from 'three';
import { SpriteBillboard } from './animatedbillboard.js'; // Adjust path if needed

export class Player {
    constructor(scene, position = { x: 0, y: 0, z: 0 }, options = {}) {
        this.scene = scene;
        this.position = new THREE.Vector3(position.x, position.y, position.z);
        this.targetPosition = this.position.clone();
        this.locked = false;
        this.lockedPosition = this.position.clone();
        this.speed =  options.speed||5;

        this.angle = null; // ← reserved for future use (e.g., facing direction)

        this.sprite = new SpriteBillboard(
            scene,
            options.fps || 8,
            this.position,
            options.frameCount || 4,
            options.animationRow || 0,
            options.textureUrl || '/sprites/player.png',
            options.rowCount || 2,
            3
        );


    }

    update(delta, camera) {
        const target = this.locked ? this.lockedPosition : this.targetPosition;
        const direction = new THREE.Vector3().subVectors(target, this.position);
        const distance = direction.length();
        const moveStep = this.speed * delta;

        if (distance > moveStep) {
            direction.normalize();
            this.position.add(direction.clone().multiplyScalar(moveStep));
            this.sprite.setTarget(this.position);
            this.sprite.setFlippedX(direction.x > 0);
            this.sprite.play();
        } else {
            this.position.copy(target);
            this.sprite.setTarget(this.position);
            this.sprite.stop();
        }

        this.sprite.update(delta, camera);
    }

    setTarget(posVec3) {
        const temppos = posVec3.clone();
        temppos.y = 0;
        this.targetPosition.copy(temppos);
    }

    setLockedTarget(posVec3) {
        const temppos = posVec3.clone();
        temppos.y = 0;
        this.lockedPosition.copy(temppos);
    }

    getposition() {
        return this.position.clone();
    }

    setAnimationRow(row) {
        this.sprite.setAnimationRow(row);
    }
}

