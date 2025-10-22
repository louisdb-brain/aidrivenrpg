import * as THREE from 'three';
import { placeSprite } from '../levelEditor/loadlevel.js';

export class skillNode {
    constructor(scene, name, position = { x: 0, y: 0, z: 0 }, spritePath) {
        this.scene = scene;
        this.name = name;
        this.position = new THREE.Vector3(position.x, position.y, position.z);
        this.type = 'skillNode';
        this.mesh = null;
    }

    static async create(scene, name, position, spritePath) {
        const node = new skillNode(scene, name, position, spritePath);


        const record = await placeSprite({
            name,
            texturePath: spritePath,
            position,
            scene
        });

        node.mesh = record.mesh;
        return node;
    }
}
