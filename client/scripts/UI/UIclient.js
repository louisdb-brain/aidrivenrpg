import * as THREE from 'three';



import {CookingGame} from "../skills/cooking.js";
import{magicSystem} from "../skills/magic.js";

import{Inventory} from "../inventory.js";
import{inventorySim} from "../inventorySimulation.js";

export class UI{
    constructor(scene,ctx,camera,canvas,groundplane,networkclient,handlers) {
        this.networkclient=networkclient;
        this.networkhandlers=handlers;
        this.groundplane = groundplane;
        this.scene = scene;
        this.ctx = ctx;
        this.camera=camera;
        this.canvas=canvas;
        this.activeMenus= {
            inventory: false,
            cooking: false,
            magic: false

        }
        this.music = new Audio('/music/pubsong.mp3');
        this.music.loop = true;




        this.inventory=new inventorySim();
        this.playerInventory=["potion","sword"]
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.currentHovered = null;

        this.clickableObjects=[];

        this.itemLibrary = {};
        fetch('./items.json')
            .then(res => res.json())
            .then(data => {
                data.forEach(item => {
                    this.itemLibrary[item.id] = item;
                    //console.log(this.itemLibrary);
                });
            });
        this.cookinggame=new CookingGame(this.canvas,this.networkclient);
        this.cookinggame.addIngredient("tomato");
        this.cookinggame.addIngredient("steak");
        this.spellmenu=new magicSystem(this.canvas,this.scene,this.networkhandlers);



        window.addEventListener('mousemove', (event) => {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
        });
        window.addEventListener('keyup', (event) => {
            if(event.key==='&'){
                console.log("pressed &")
                this.activeMenus.cooking=!this.activeMenus.cooking;
                this.cookinggame?.toggle();

                if (this.virtualCursor) {
                    this.virtualCursor.active = !this.activeMenus.cooking; // disable it
                }
            }
            if (event.key === 'i' || event.key === 'I') {
                this.activeMenus.inventory=!this.activeMenus.inventory;
                this.inventory?.toggle();
            }
            if (event.key === 'é' || event.key === '2') {
                this.activeMenus.magic = !this.activeMenus.magic;
                this.spellmenu?.toggle();
            }



        })

        const musicButton = document.createElement('button');
        musicButton.textContent = "Toggle Music";
        musicButton.style.position = "absolute";
        musicButton.style.top = "10px";
        musicButton.style.right = "10px";
        document.body.appendChild(musicButton);

        musicButton.addEventListener('click', () => this.toggleMusic());





    }
    attachVirtualCursor(virtualCursor) {
        this.virtualCursor = virtualCursor;

        // Build the list dynamically from existing sub-UIs
        this.virtualCursor.uiCanvases = [
            this.inventory?.canvas,
            this.cookinggame?.canvas,
            this.spellmenu?.canvas
        ].filter(Boolean); // ignore nulls

        console.log("VirtualCursor attached to UIs:", this.virtualCursor.uiCanvases);
    }
    get uiCanvases() {
        return [
            this.inventory?.canvas,
            this.cookinggame?.canvas,
            this.spellmenu?.canvas,

        ].filter(Boolean);
    }



    toggleMusic() {
        if (this.musicplaying) {
            this.music.pause();
            this.musicplaying = false;
        } else {
            this.music.play();
            this.musicplaying = true;
        }
    }

    makeSprite()
    {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');


    }

    update()
    {
        this.cookinggame.update();
        this.cookinggame.draw();
        this.inventory.update();


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


            sprite.scale.set(2 , 2, 0);
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
