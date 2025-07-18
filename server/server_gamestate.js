
import {npcManager} from "./npcmanager.js";
import * as THREE from 'three';
import {playermanager} from "./playermanager.js";
import {objectManager} from "./dynamicObjectsManager.js";

export class gamestateClass{
    constructor(pIO) {
        this.io=pIO;
        this.ticks = 0;
        this.clock = new THREE.Clock();


        this.maps={}        //maplist for later
        this.maps[1]=true;  //later we check if players are on this map

        this.npcManager=new npcManager()
        this.objectManager=new objectManager();


        this.onNpcUpdate = null;


    }
    start() {


        let lastTime = Date.now();

        setInterval(() => {
            const now = Date.now();
            const delta = (now - lastTime) / 1000;
            lastTime = now;

            this.tick(delta);

            this.ticks++;
            if (this.ticks % 60 === 0) {
                console.log("Server tick:", this.ticks);
            }
        }, 50); // 20 FPS
    }
    tick(delta) {
        if(this.maps[1]==true){

           this.npcManager.update(delta);
           this.emitNpc();
           playermanager.update(delta);
           this.emitPlayers();
           this.objectManager.update(delta);
           this.emitChests();

        }


    }
    addnpc(pNPC){
        this.npcManager.addNpc(pNPC);
        this.emitNpc();

    }
    emitPlayers()
    {
        const playerMap=playermanager.getAllPlayers();

        const payload=Object.values(playerMap).map(player=>({
            id:player.id,
            pos:{
                x:player.position.x,
                y:player.position.y,
                z:player.position.z,
            },
            targetpos:{
                x:player.targetPosition.x,
                y:player.targetPosition.y,
                z:player.targetPosition.z
            },
            lockedpos:{
                x:player.lockedPosition.x,
                y:player.lockedPosition.y,
                z:player.lockedPosition.z
            },
            angle: player.angle,
            locked:player.locked


        }));
        //console.log(payload);;
        this.io.emit('player-positionupdate', payload);
    }
    emitNpc()
    {
        const npcMap = this.npcManager.getNpcList();

        const payload = Object.values(npcMap).map(npc => ({
            id: npc.npcid,
            name: npc.name,
            position: {
                x: npc.position.x,
                y: npc.position.y,
                z: npc.position.z
            },
            targetPosition: {
                x: npc.targetPosition.x,
                y: npc.targetPosition.y,
                z: npc.targetPosition.z
            },
            angle: npc.angle,
            health: npc.health,
            target: npc.targetPlayerId
        }));

        this.io.emit('npc-position-update', payload);
    }
    addChest(pChest){
    this.objectManager.addChest(pChest,pChest.chestId);
    }

    emitChests() {
        const chestmap = this.objectManager.getChestdict();

        const payload = Object.values(chestmap).map(chest => ({
            id: chestmap.chestId,
            pos: this.returnPos(chest),
            grounded: chestmap.grounded,
            parent: chestmap.parentObject,
            angle:chestmap.angle

        }));
        this.io.emit('chest-position-update', payload);

    }

    returnPos(pObj)
    {
        return {x:pObj.position.x,y:pObj.position.y,z:pObj.position.z};
    }


}