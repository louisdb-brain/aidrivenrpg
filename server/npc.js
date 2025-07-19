//SERVER NPC//
import {toVec3} from "./utilities.js"
import * as THREE from 'three';
import {materialThickness} from "three/tsl";


export class npc{

    constructor(npcID,positionObj,pName,io){
        this.io=io;
        this.npcid = npcID;
        this.position= new THREE.Vector3(positionObj.x,positionObj.y,positionObj.z);
        this.zone=0;
        this.name=pName;
        this.health=10;
        this.attack=0;
        this.detectionRadius=1000;
        this.detectionsphere= new THREE.Sphere(this.position, this.detectionRadius);

        this.speed= 2;
        this.attackspeed=3;
        this.cooldown=50;
        this.targetPosition = this.position.clone();

        this.targetPlayerId=null;//later for targetting in combat

        this.decisiontimer=0;
        this.decisiontreshhold=5;
        this.angle=Math.atan2(0,0);



    }
    update(delta,players){
        this.aiupdate(delta);
        //this.checkFollow(players)
        this.move(delta);
        console.log(this.position)



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
        this.detectionsphere.center.copy(this.position);
    }

    checkFollow(players){

        for (const playerId in players) {
            const player = players[playerId];
            const playerpos=new THREE.Vector3(player.x, player.y,player.z);



            if (this.detectionsphere.containsPoint(playerpos)) {
                this.setTarget(playerpos);
                //console.log(playerId + "  is colliding with  "+this.name +" "+playerpos.x + " "+playerpos.y);
            }
        }
    }
    aiupdate(delta){
        //console.log(this.targetPosition.x +" " +this.position.x);
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
            const targetpos=randomVec.clone().add(this.position);
            console.log(targetpos)
            this.setTarget(targetpos);

        }

    }
    calculateCombat()
    {
        if( this.cooldown == 50)
        {
            this.cooldown-=this.attackspeed;
            return true; // register hit
        }else
        {
            this.cooldown-=this.attackspeed;
        }
        if (this.cooldown <=0){this.cooldown=50;}


    }
    takeDamage(pAmount){
        this.health-=pAmount;
        this.pNpcID-= pAmount;
        const payload=
            {
                id:this.npcid,
                name:this.name,
                amount:pAmount
            }
            console.log("damage taken = "+pAmount);;
            this.io.emit('npc-takedamage',payload);
    }


}