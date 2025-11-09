import * as THREE from 'three';
import { placeSprite } from '../levelEditor/loadlevel.js';
import { SpriteBillboard } from './animatedbillboard.js';


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

        // Use SpriteBillboard
        node.sprite = new SpriteBillboard(
            scene,          // THREE.Scene
            0,              // fps (0 = no animation)
            position,       // { x, y, z }
            1,              // frameCount (1 if static)
            0,              // animationRow
            spritePath,     // texture path
            1,              // rowCount
            1               // size
        );

        return node;
    }

}
