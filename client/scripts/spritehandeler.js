import * as THREE from 'three';

export class  spriteHandeler {
    constructor(scene) {
        this.scene = scene;
        this.hitSprites={};
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });


    }

    draw(ctx) {

    }

    drawhit(pAmount,pLocation) {
        const thisSprite=new THREE.Sprite(spriteMaterial);
        const scale = 0.5 + pAmount * 0.1;
        thisSprite.scale.set(scale, scale, 1); // XY for size, Z is ignored for sprites

        thisSprite.frustumCulled = true;
        this.scene.add(thisSprite);

        setTimeout(() => {
            this.scene.remove(thisSprite);
            thisSprite.material.dispose();
            thisSprite.geometry?.dispose?.(); // geometry is usually not needed for sprites
        }, 500); // show for 500ms

    }
    drawtext(){}


}