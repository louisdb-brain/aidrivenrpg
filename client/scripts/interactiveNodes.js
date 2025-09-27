import * as THREE from 'three';
import {SpriteBillboard} from "./animatedbillboard.js";

export class skillNode {
    constructor(scene, name, position = {x: 0, y: 0, z: 0}, spritePath) {
        this.scene = scene;
        this.name = name;
        this.position = new THREE.Vector3(position.x, position.y, position.z);

        // Create the billboard
        this.billboard = new SpriteBillboard(
            scene,
            0,          // fps
            this.position,
            1,          // frameCount
            0,          // animationRow
            spritePath, // image path
            1,          // rowCount
            3           // size (scale it bigger if needed)
        );

        this.type = "skillNode";
    }

    // Provide a getter for the actual clickable THREE.Sprite
    get mesh() {
        return this.billboard?.sprite;
    }
}
