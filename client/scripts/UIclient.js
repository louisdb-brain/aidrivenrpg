import * as THREE from 'three';
import {GLTFLoader} from "three/addons/loaders/GLTFLoader";

import {spriteHandeler}from './spriteHandeler.js';

export class UI{
    constructor(scene,ctx,camera,canvas) {
        this.scene = scene;
        this.ctx = ctx;
        this.camera=camera;
        this.canvas=canvas;
    }
    makeSprite()
    {

    }
    createRect()
    {
        const ctx=this.ctx;
        ctx.fillStyle  = 'green';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height/20);
        ctx.fillStyle ='green';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height/20);

        const texture = new THREE.CanvasTexture(this.canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true ,depthtest:false});
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1, 1, 1);
        sprite.position.set(0, 0, -1);
        sprite.renderOrder=99999;
        sprite.material.depthTest=false;
        texture.needsUpdate = true;
        this.scene.add(this.camera);
        this.camera.add(sprite);
        console.log("drawing sprite")

    }
    drawImage(imagePath) {
        const img = new Image();
        img.src = imagePath;

        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
            this.texture.needsUpdate = true;

        };
    }


}
