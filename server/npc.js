//SERVER NPC//
import {toVec3} from "./utilities.js"
import * as THREE from 'three';


export class npc{

    constructor(pNpcID,positionObj,pName,io,onDestroy,spawnCallback,loot,level){
        this.io=io;
        this.npcid = pNpcID;

        this.position= new THREE.Vector3(positionObj.x,positionObj.y,positionObj.z);
        this.level="1";
        this.level=level;
        this.name=pName;
        this.health=10;
        this.attack=2;
        this.detectionRadius=10;
        this.boidsRadius=10;
        this.attackRadius= 3;
        this.hitboxRadius=1.5;
        this.detectionsphere= new THREE.Sphere(this.position, this.detectionRadius);
        this.onDestroy = onDestroy;
        this.hitTime=0;
        this.hitTimer=13;
        this.speed= 3;
        this.attackspeed=3;
        this.loot=loot;
        this.rareloot="mithrilsword"
        this.spawnCallback = spawnCallback;

        this.cooldown=50;
        this.targetPosition = this.position.clone();

        this.targetPlayerId=null;//later for targetting in combat

        this.decisiontimer=0;
        this.decisiontreshhold=20;
        this.angle=Math.atan2(0,0);



    }
    update(delta, players,allNpcs) {
        if (this._destroyed) return; // skip dead NPCs

        if (this.hitTimer > 0) this.hitTime--;

        this.aiupdate(delta);
        this.checkFollow(players);
        this.handleCombat(players);
        this.checkAvoid(allNpcs);
        this.move(delta);
    }

    setTarget(position) {
        let temppos=position.clone();
        temppos.y=0;
        this.targetPosition.copy(temppos); // store destination
        //console.log(this.targetPosition);
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

    checkFollow(players) {
        let foundTarget = false;

        for (const playerId in players) {
            if (players[playerId].level!=this.level) return;
            //console.log(players[playerId].level);
            const player = players[playerId];
            const playerpos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);

            if (this.detectionsphere.containsPoint(playerpos)) {

                this.targetPlayerId = playerId; // <-- REMEMBER THIS PLAYER
                this.setTarget(playerpos);
                foundTarget = true;
            }
        }

        // If target walked away, stop following
        if (!foundTarget) {
            this.targetPlayerId = null;
        }
    }

    checkAvoid(allNpcs) {
        let avoidVec = new THREE.Vector3(0, 0, 0);
        let nearbyCount = 0;

        for (const other of allNpcs) {
            if (other === this) continue; // Don't compare with self

            const dist = this.position.distanceTo(other.position);
            const minDistance = this.boidsRadius;

            if (dist < minDistance && dist > 0.001) {
                let push = this.position.clone().sub(other.position); // Direction away from other
                push.normalize().divideScalar(dist)*this.boidsRadius; // Make closer ones push more strongly
                avoidVec.add(push); // Accumulate pushes
                nearbyCount++;
            }
        }

        if (nearbyCount > 0) {
            avoidVec.divideScalar(nearbyCount); // Average the total push
            this.targetPosition.add(avoidVec);  // Apply the avoidance to target position
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
    handleCombat(players) {
        if (!this.targetPlayerId) return; // no target selected

        const player = players[this.targetPlayerId];
        if (player.level!=this.level)return;
        if (!player) return; // target disappeared

        const playerPos = player.position;
        const dist = this.position.distanceTo(new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z));

        // If close enough, attack instead of moving closer
        if (dist <= this.attackRadius) {
            this.performAttack(player);
        }
    }
    performAttack(player) {
        if (this.cooldown > 0) {
            this.cooldown -= this.attackspeed;
            return;
        }

        this.cooldown = 50; // reset attack cooldown

        const dmg = this.attack;
        player.takeDamage(dmg);
        this.io.emit('player-takedamage', {
            id: player.id,

            amount: this.attack,
        });

        // Send event to client UI (optional)
        this.io.emit('npc-attack', { npc: this.npcid});
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
            //this.spawnCallback();
            this.destroy();
        }
    }

    destroy() {
        if (this._destroyed) return; // prevent double cleanup
        this._destroyed = true;
        this.targetPlayerId = null;
        this.targetPosition = this.position.clone();
        const uniqueId = `${this.name}_loot_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        this.spawnCallback(uniqueId,this.loot,this.position,this.level);

        console.log(`NPC ${this.name} (${this.npcid}) destroyed`);
        this.io.emit('npc-kill', { id: this.npcid, name: this.name });

        if (typeof this.onDestroy === 'function') {

            this.onDestroy(this); // remove from manager
        }
    }



}