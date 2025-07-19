import * as THREE from 'three';
import {gamestateClass}     from './server_gamestate.js';

export class player {
    constructor(pId,position = { x: 0, y: 0, z: 0 },pName) {


        this.id=pId;
        this.position = new THREE.Vector3(position.x, position.y, position.z);
        this.targetPosition = this.position.clone();
        this.lockedPosition= this.position.clone();
        this.locked=false;
        this.speed = 1;
        this.angle=null;
        this.maxcooldown=150;
        this.cooldown=50;

        this.attackspeed=3;
        this.basepower=2;
        this.equipmentpower=5;
        this.attacking=false;
        this.followTarget="";
        this.targetObject=null;
        this.follow=false;

        this.wantedlevel=0;
        this.zone=0;
        this.name=pName;
    }


    update(delta) {

        this.combatlogic();
        if (this.followTarget!=0)
        {
            if(this.followTarget!="" && this.followTarget!=null) {

            }
            else
            {
                console.log("tried to attack but followtarget not given")
            }
        }
        var angledirection= null;
        const movedirection=new THREE.Vector3().subVectors(this.targetPosition,this.position);;
        if (this.locked==false) {
             angledirection = new THREE.Vector3().subVectors(this.targetPosition, this.position);
        }
        else{
            angledirection = new THREE.Vector3().subVectors(this.lockedPosition, this.position);
        }
        const distance = movedirection.length();

        if (distance > 0.1) {
            movedirection.normalize();
            angledirection.normalize();
            const moveStep = this.speed * delta;

            this.position.add(movedirection.clone().multiplyScalar(moveStep));
            this.angle = Math.atan2(angledirection.x, angledirection.z);


        }



    }
    combatlogic()
    {

        if(this.followTarget=="" )
        {
            //console.log("error doing combat logic ,no follow target");

            return;
        }
        console.log("combatlogic: attacking "+this.followTarget);

        console.log(this.followTarget);


        this.targetPosition= this.targetObject.position.clone();
        const movedirection=new THREE.Vector3().subVectors(this.targetPosition,this.position);
        const distance=movedirection.length();

            if (this.cooldown > 0) {
                this.cooldown -= this.attackspeed;
            }
            //hit register
            if (this.cooldown <= 0) {
                this.cooldown = this.maxcooldown;
                const randomhHit = Math.floor(Math.random() * (this.basepower + this.equipmentpower / 2));
                this.targetObject.takeDamage(randomhHit);
                this.targetObject.takeDamage(randomhHit);
                console.log(randomhHit + "damage dealt to " + this.targetObject);
            }




    }
    meleeAttack()
    {
        //push damage on npc
        //set cooldown
    }
    setTarget(position) {
        let temppos=position.clone();
        temppos.y=0;
        this.targetPosition.copy(temppos); // store destination
    }
    setTargetEntity(entityID,npcobject)
    {
        this.followTarget=entityID;
        this.targetObject=npcobject;
    }

    getposition()
    {return this.position.clone();}





}