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
        this.baseTexture=texture;
        this.baseImage = this.convertTextureToCanvasImage(texture);

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

        if (distance > 0.2) {
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
    mergeFullSpritesheet(weaponTex) {
        // baseImage is an <img> created from iccColorPreloader texture
        if (!this.baseImage || !weaponTex?.image) {
            console.warn("mergeFullSpritesheet: images not ready", this.baseImage, weaponTex);
            return this.baseTexture; // fall back
        }

        const pw = this.baseImage.width;
        const ph = this.baseImage.height;
        const rowHeight = ph / 2;

        const canvas = document.createElement("canvas");
        canvas.width = pw;
        canvas.height = ph;

        const ctx = canvas.getContext("2d");

        // draw full player sheet
        ctx.drawImage(this.baseImage, 0, 0);

        // weaponImg is one-row sheet with same width
        const weaponImg = weaponTex.image;

        // row 0
        ctx.drawImage(
            weaponImg,
            0, 0,
            pw, rowHeight,
            0, 0,
            pw, rowHeight
        );

        // row 1
        ctx.drawImage(
            weaponImg,
            0, 0,
            pw, rowHeight,
            0, rowHeight,
            pw, rowHeight
        );

        const merged = new THREE.CanvasTexture(canvas);
        merged.needsUpdate = true;
        return merged;
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
    async setWeaponSprite(name) {
        await this.loadWeapons();

        const weapon = this.weapons.find(w => w.name === name);

        if (!weapon) {
            console.warn("Weapon not found:", name);
            this.weaponTexture = null;
            this.sprite.setTexture(this.baseImage);
            return;
        }
        console.log(weapon);

        const loader = new THREE.TextureLoader();
        loader.load(
            weapon.sprite,
            (weaponTex) => {
                // Wait until weaponTex.image is FULLY loaded
                if (weaponTex.image instanceof HTMLImageElement) {
                    this.applyWeaponTexture(weaponTex);
                } else {
                    // If it's not yet a proper image, hook onload
                    weaponTex.image.onload = () => {
                        this.applyWeaponTexture(weaponTex);
                    };
                }
            }
        );

    }
    applyWeaponTexture(weaponTex) {
        this.weaponTexture = weaponTex;

        const merged = this.mergeFullSpritesheet(this.weaponTexture);

        this.sprite.setTexture(merged);
    }

    convertTextureToCanvasImage(tex) {
        const src = tex.image; // this is ImageData-like

        // Create canvas
        const canvas = document.createElement("canvas");
        canvas.width = src.width;
        canvas.height = src.height;

        // Draw the ImageData onto this new canvas
        const ctx = canvas.getContext("2d");
        const imageData = new ImageData(src.data, src.width, src.height);
        ctx.putImageData(imageData, 0, 0);

        // Now create a normal image object from the canvas
        const img = new Image();
        img.src = canvas.toDataURL(); // safe & fast for small sheets

        return img;
    }



    async loadWeapons() {
        if (this.weapons) return; // already loaded

        const response = await fetch("/weapons.json");
        this.weapons = await response.json();

        console.log("Loaded weapons:", this.weapons);
    }


}

