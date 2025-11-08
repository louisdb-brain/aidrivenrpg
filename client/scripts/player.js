import * as THREE from 'three';
import { SpriteBillboard } from './animatedbillboard.js';
import {iccColorPreloader} from "../levelEditor/iccColorPreload"; // Adjust path if needed

export class Player {
    constructor(scene, position = { x: 0, y: 0, z: 0 },texture, options = {}) {
        this.scene = scene;
        this.position = new THREE.Vector3(position.x, position.y, position.z);
        this.targetPosition = this.position.clone();
        this.locked = false;
        this.lockedPosition = this.position.clone();
        this.speed =  8;
        this.interactionRadius=0.8;
        this.level="level1";
        this.angle = null;

        this.sprite = new SpriteBillboard(
            scene,
            options.fps || 8,
            this.position,
            options.frameCount || 4,
            options.animationRow || 0,
            texture,
            options.rowCount || 2,
            3
        );


    }

    update(delta, camera) {
        // inside update(delta, camera)


        const direction = new THREE.Vector3().subVectors(this.targetPosition, this.position);


        const distance = direction.length();
        const moveStep = this.speed * delta;

        if (distance > 0.0002) {
            direction.normalize();
            this.position.add(direction.multiplyScalar(moveStep));
            this.sprite.setTarget(this.position);
            this.sprite.setFlippedX(direction.x > 0);
            this.sprite.play();
        } else {
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
    takedamage(amount)
    {
        console.log(amount+" damage taken only console log");
    }
}

