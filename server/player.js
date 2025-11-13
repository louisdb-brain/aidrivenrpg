import * as THREE from 'three';
import {gamestateClass}     from './server_gamestate.js';
import {inventory} from "./inventory.js";
import {levelManager} from "./levelManager.js";
import {rand} from "three/tsl";
export class player {
    constructor(pId,emitCallback,position = { x: 0, y: 0, z: 0 },level,pName) {


        this.id=pId;
        //this.io=pIO; NEVER PASS IO->circular ref
        this.emit=emitCallback;
        this.position = new THREE.Vector3(position.x, position.y, position.z);

        this.targetPosition = this.position.clone();
        this.lockedPosition= this.position.clone();
        this.locked=false;
        this.inputMethods={CONTROLLER:false,MOUSE:true};
        this.speed = 8;
        this.angle=null;
        this.interactionRadius=0.8;
        this.maxcooldown=150;
        this.cooldown=50;

        this.attackspeed=3;
        this.basepower=2;
        this.equipmentpower=5;
        this.attacking=false;
        this.followTarget="";
        this.targetObject=null;
        this.follow=false;
        this.fistWeapon={name:"",power:"0",speed:3};
        this.weapon=this.fistWeapon;
        this.skillLevels={
            ADVENTURING:10,
            WOODCUTTING:10,
            CRAFTING:10,
            MINING:10,
            SMITHING:10,
            FISHING:10,
            COOKING:10}
        this.unlockedTalents={
            MININGCOPPER:true,
            MININGIRON:false,
            MININGGOLD:false,
            MININGMITHRIL:false
        }
        this.wantedlevel=0;
        this.zone=0;
        this.name=pName;

        this.level=level;

        this.inventory=new inventory(this.id,this.emit,20);
        //this.equipWeapon({name:"mithrilsword",power:"10",speed:"2.5"})
    }

    equipWeapon(data){
        this.weapon={name:data.name,power:data.attack,speed:data.speed};
        const payload={
            name:data.name,
            id:this.id
        }
        this.emit("weapon-sprite",payload);
        console.log(payload);
    }
    unequipWeapon()
    {
        this.weapon=this.fistWeapon;
        const payload={
            name:"fist",
            id:this.id
        }
        this.emit("weapon-sprite",payload);
    }
    update(delta) {

        this.combatlogic();
        if (this.followTarget!=0)
        {
            if(this.followTarget!="" && this.followTarget!=null) {

            }
            else
            {
               // console.log("tried to attack but followtarget not given")
            }
        }
        var angledirection= null;
        var movedirection=new THREE.Vector3().subVectors(this.targetPosition,this.position);

        if (this.locked==false) {
             angledirection = new THREE.Vector3().subVectors(this.targetPosition, this.position);
        }
        else{
            angledirection = new THREE.Vector3().subVectors(this.lockedPosition, this.position);
        }
        const distance = movedirection.length();

        if (distance > 0.2) {
            movedirection.normalize();
            angledirection.normalize();
            const moveStep = this.speed * delta;

            this.position.add(movedirection.clone().multiplyScalar(moveStep));
            this.angle = Math.atan2(angledirection.x, angledirection.z);


        }



    }
    setVector(x, y) {
        this.inputMethods.CONTROLLER = true;
        this.inputMethods.MOUSE = false;

        const input = new THREE.Vector3(x, 0, y);
        this.inputVector.copy(input);
    }
    combatlogic()
    {
        if(!this.targetObject)return;;
        if(this.followTarget=="" )
        {
            //console.log("error doing combat logic ,no follow target");

            return;
        }
        //console.log("combatlogic: attacking "+this.followTarget);

        //console.log(this.followTarget);


        this.targetPosition= this.targetObject.position.clone();
        const movedirection=new THREE.Vector3().subVectors(this.targetPosition,this.position);
        const distance=movedirection.length();
        this.attackspeed=this.weapon.speed;
            if (this.cooldown > 0) {
                this.cooldown -= this.attackspeed;
            }
            //hit register
            if (this.cooldown <= 0) {
                this.cooldown = this.maxcooldown;
                const randomhHit = (this.basepower + this.equipmentpower / 2);
                const calculatedHit=randomhHit+this.weapon.power;
                this.targetObject.takeDamage(calculatedHit);
                this.targetObject.takeDamage(calculatedHit);
                //console.log(randomhHit + "damage dealt to " + this.targetObject);
            }




    }
    meleeAttack()
    {
        //push damage on npc
        //set cooldown
    }
    takeDamage(pAmount) {
        if (this.hitTime > 0) return; // invulnerability frames
        //PLACEHOLDER DAMAGE IS NOT ACTUALLY TAKEN

    }
    setTarget(position) {
        this.followTarget = "";
        this.targetObject = null;
        // Convert plain object to Vector3 if needed
        const posVec = position instanceof THREE.Vector3
            ? position
            : new THREE.Vector3(position.x, position.y, position.z);

        let temppos = posVec.clone();
        temppos.y = 0;
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