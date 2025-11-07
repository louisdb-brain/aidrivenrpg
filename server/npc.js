//SERVER NPC//
import {toVec3} from "./utilities.js"
import * as THREE from 'three';


export class npc{

    constructor(pNpcID,positionObj,pName,io,onDestroy,spawnCallback,loot){
        this.io=io;
        this.npcid = pNpcID;

        this.position= new THREE.Vector3(positionObj.x,positionObj.y,positionObj.z);
        this.level="1";
        this.zone=0;
        this.name=pName;
        this.health=10;
        this.attack=2;
        this.detectionRadius=10;
        this.attackRadius= 1;
        this.hitboxRadius=1.5;
        this.detectionsphere= new THREE.Sphere(this.position, this.detectionRadius);
        this.onDestroy = onDestroy;
        this.hitTime=0;
        this.hitTimer=13;
        this.speed= 2;
        this.attackspeed=3;
        this.loot=loot;
        this.spawnCallback = spawnCallback;

        this.cooldown=50;
        this.targetPosition = this.position.clone();

        this.targetPlayerId=null;//later for targetting in combat

        this.decisiontimer=0;
        this.decisiontreshhold=20;
        this.angle=Math.atan2(0,0);



    }
    update(delta, players) {
        if (this._destroyed) return; // skip dead NPCs

        if (this.hitTimer > 0) this.hitTime--;

        this.aiupdate(delta);
        this.checkFollow(players);
        this.move(delta);
    }

    setTarget(position) {
        let temppos=position.clone();
        temppos.y=0;
        this.targetPosition.copy(temppos); // store destination
    }
    move(delta){
        if(this.hitTime>0)return; //check invincibleframes
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
            const playerpos = new THREE.Vector3(
                player.position.x,
                player.position.y,
                player.position.z
            );


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
            //console.log(targetpos)
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
    takeDamage(pAmount) {
        if (this.hitTime > 0) return; // invulnerability frames

        this.health -= pAmount;
        this.hitTime = this.hitTimer;

        // Broadcast damage event
        this.io.emit('npc-takedamage', {
            id: this.npcid,
            name: this.name,
            amount: pAmount,
            health: this.health
        });

        // If dead, destroy safely
        if (this.health <= 0) {
            this.spawnCallback();
            this.destroy();
        }
    }

    destroy() {
        if (this._destroyed) return; // prevent double cleanup
        this._destroyed = true;
        const uniqueId = `${this.name}_loot_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        this.spawnCallback(uniqueId,this.loot,this.position)

        console.log(`NPC ${this.name} (${this.npcid}) destroyed`);
        this.io.emit('npc-kill', { id: this.npcid, name: this.name });

        if (typeof this.onDestroy === 'function') {

            this.onDestroy(this); // remove from manager
        }
    }



}