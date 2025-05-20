//SERVER NPC//
import {toVec3} from "./utilities.js"
import * as THREE from 'three';
export class npc{

    constructor(npcID,positionObj,pName){
        this.npcid = npcID;
        this.position= new THREE.Vector3(positionObj.x,positionObj.y,positionObj.z);
        this.name=pName;
        this.health=10;
        this.attack=0;

        this.speed= 2;
        this.targetPosition = this.position.clone();

        this.targetPlayerId=null;//later for targetting in combat

        this.decisiontimer=0;
        this.decisiontreshhold=5;
        this.angle=Math.atan2(0,0);



    }
    update(delta){
        this.aiupdate(delta);
        this.move(delta);


    }
    setTarget(position) {
        let temppos=position.clone();
        temppos.y=0;
        this.targetPosition.copy(temppos); // store destination
    }
    move(delta){
        const direction = new THREE.Vector3().subVectors(this.targetPosition, this.position);
        const distance = direction.length();

        if (distance > 0.1) {
            direction.normalize();
            const moveStep = this.speed * delta;

            this.position.add(direction.clone().multiplyScalar(moveStep));
            this.angle = Math.atan2(direction.x, direction.z);
        }
    }
    aiupdate(delta){
        console.log(this.targetPosition.x +" " +this.position.x);
        //console.log(this.decisiontimer);
        if(this.decisiontimer<this.decisiontreshhold)
        {
            this.decisiontimer++;
            return;
        }
        else{
            this.decisiontimer=0;
            const randomVec = new THREE.Vector3(
                Math.random() * 20 - 10,
                0,
                Math.random() * 20 - 10

            );

            this.setTarget(randomVec.clone());

        }

    }


}