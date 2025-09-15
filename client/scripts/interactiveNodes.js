import * as THREE from 'three';
import { SpriteBillboard } from './animatedbillboard.js'; // Adjust path if needed

export class interactiveNode {
    constructor(scene, position = {x: 0, y: 0, z: 0},jsonID,sprite) {
        this.scene = scene;
        this.position = new THREE.Vector3(position.x, position.y, position.z);


        this.sprite = new SpriteBillboard(
            scene,
            options.fps || 8,
            this.position,
            options.frameCount || 4,
            options.animationRow || 0,
            options.textureUrl || '/sprites/player.png',
            options.rowCount || 2
        );
        this.type
    }
}