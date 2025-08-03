import * as THREE from 'three';
import {GLTFLoader} from "three/addons/loaders/GLTFLoader";

import {spriteHandeler}from './spriteHandeler.js';

export class UI{
    constructor(scene,ctx,camera,canvas) {
        this.scene = scene;
        this.ctx = ctx;
        this.camera=camera;
        this.canvas=canvas;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.currentHovered = null;

        this.clickableObjects=[];

        window.addEventListener('mousemove', (event) => {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
        });
    }
    makeSprite()
    {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');


    }

    drawchat(position,text)
    {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.font = '20px sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(text, canvas.width / 2, canvas.height / 1.8);

        // Create texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });

        const sprite = new THREE.Sprite(material);

        sprite.scale.set(2, 0.5, 1); // Adjust to your scene units
        sprite.position.copy(position.clone().add(new THREE.Vector3(0, 2.5, 0))); // float above head

        this.scene.add(sprite);

        // Remove after 3 seconds
        setTimeout(() => {
            this.scene.remove(sprite);
            texture.dispose();
            material.dispose();
        }, 3000);

    }
    drawHit(position, amount) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');


        const img = new Image();
        if (amount != 0)
        {
            img.src = './sprites/hit.png';
        }
        else
        {
            img.src='./sprites/miss.png';
        }


        img.onload = () => {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw background image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Draw text
            ctx.font = 'bold 28px sans-serif';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText(amount, canvas.width / 2, canvas.height / 1.8);

            // Create texture after drawing
            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthTest: false
            });

            const sprite = new THREE.Sprite(material);


            sprite.scale.set(0.7, 0.7, 0);
            sprite.position.copy(position.clone().add(new THREE.Vector3(0, 1.5, 0)));
            this.scene.add(sprite);


            setTimeout(() => {
                this.scene.remove(sprite);
                texture.dispose();
                material.dispose();
            }, 600);
        };
    }
    createRect()
    {
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 640;
        const ctx = canvas.getContext('2d');


        ctx.fillStyle  = 'green';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height/20);
        ctx.fillStyle ='green';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height/20);

        const texture = new THREE.CanvasTexture(this.canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true ,depthTest:false});
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1, 1, 1);
        sprite.position.set(0, 0, -1);
        sprite.renderOrder=99999;
        sprite.material.depthTest=false;
        texture.needsUpdate = true;
        this.scene.add(this.camera);
        this.camera.add(sprite);
        //console.log("drawing sprite")*/

    }
    drawImage(imagePath) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const img = new Image();
        img.src = imagePath;

        img.onload = () => {
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
            texture.needsUpdate = true;

        }
    }
    checkhover(clickableobjects) {
        this.clickableObjects=clickableobjects;
        //console.log(this.clickableObjects);
        if (!Array.isArray(this.clickableObjects) || this.clickableObjects.length === 0) {
            return; // Skip if there's nothing to check
        }
        this.raycaster.setFromCamera(this.mouse, this.camera);



        const intersects = this.raycaster.intersectObjects(this.clickableObjects, false);

        if (intersects.length > 0) {
            const hovered = intersects[0].object;

            if (hovered !== this.currentHovered) {
                // Hover ENTER: new object
                console.log('hovering over'+hovered);
            }
        } else {
            // Hover EXIT: no objects under mouse

        }
    }



}
