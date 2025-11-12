import * as THREE from 'three';
import { SpriteBillboard } from './animatedbillboard.js';

export class skillNode {
    constructor(scene, name, position = { x: 0, y: 0, z: 0 }, spritePath) {
        this.scene = scene;
        this.name = name;
        this.position = new THREE.Vector3(position.x, position.y, position.z);
        this.type = 'skillNode';
        this.sprite = null;
        this.mesh = null; // ⬅️ important!
    }

    static async create(scene, name, position, spritePath) {
        const node = new skillNode(scene, name, position, spritePath);

        node.sprite = new SpriteBillboard(
            scene,
            0,              // fps
            position,
            1,              // frameCount
            0,              // row
            "/sprites/"+spritePath,     // texture path
            1,              // rows
            1.5             // size
        );

        node.mesh = node.sprite.sprite; // ⬅️ expose the THREE.Sprite

        return node;
    }

    update(delta, camera) {
        if (this.sprite) {
            this.sprite.update(delta, camera);
        }
    }
}
