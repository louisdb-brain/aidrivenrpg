import * as THREE from 'three';

export class  spriteHandeler {
    constructor(scene) {
        this.scene = scene;
        this.hitSprites={};
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        this.hitSprite=new THREE.Sprite(spriteMaterial);

    }

    draw(ctx) {

    }

    drawhit(pAmount,pLocation) {
        const thisSprite=new THREE.Sprite(spriteMaterial);
        thisSprite.
        thisSprite.frustumCulled = true;
        this.scene.add(thisSprite);

    }
    drawUi()
}