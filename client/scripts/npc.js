//CLIENT SIDE NPC//
import * as THREE from 'three';
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import {SpriteBillboard} from "./animatedbillboard";

export class npc {

    constructor(scene,texture,level, pStartpos={x:0,y:0,z:0},npcid,onLoaded = () => {}) {
        this.scene = scene;
        this.model=null;

        this.pNpcID = npcid;
        this.position = new THREE.Vector3(pStartpos.x, pStartpos.y, pStartpos.z);
        this.name = "";
        this.texture="Goblin.png"
        this.level=level;
        this.health = 100;
        this.attack = 0;
        this.hitTime=0;
        this.speed= 2;
        this.targetPosition = this.position.clone();


        this.sprite = new SpriteBillboard(
            scene,
             4,
            this.position,
             2,
             0,
            texture,
             2,
            5
        );

         //   onLoaded(this); //callback after loaded mesh (i used this to add meshes to clickablelist)

    }
    get mesh()
    {
        return this.sprite;
    }
    update(delta, camera) {
        // Handle hit timer
        if (this.hitTime > 0) {
            this.hitTime -= delta;
            if (this.hitTime < 0) this.hitTime = 0;

            // Show bottom-right frame on a 2x2 sprite sheet (col 1, row 1)
            this.sprite.showStaticFrame(1, 1);
            if (this.sprite) this.sprite.update(delta, camera);
            return;
        }

        // When hitTime ends, resume normal animation row (row 0)
        if (this.sprite.isFrozen) {
            this.sprite.animationRow = 0; // 👈 Reset to top row (normal)
            this.sprite.resumeAnimation();
        }

        // Normal movement
        this.move(delta);
        if (this.sprite) this.sprite.update(delta, camera);
    }



    move(delta) {
        if (!this.sprite) return;

        const direction = new THREE.Vector3().subVectors(this.targetPosition, this.position);
        const distance = direction.length();

        if (distance > 0.1) {
            direction.normalize();
            const step = this.speed * delta;
            this.position.add(direction.clone().multiplyScalar(step));
            this.sprite.setFlippedX(direction.x > 0);
            this.sprite.play();
        } else {
            this.sprite.stop();
        }

        this.angle = Math.atan2(direction.x, direction.z);
        this.sprite.setTarget(this.position);
    }



    setTarget(position) {

        let temppos = position.clone();
        temppos.y = 0;
        this.targetPosition.copy(temppos);

    }
    takedamage(amount)
    {
        this.health-= amount;
        this.hitTime=0.25;

    }

}
