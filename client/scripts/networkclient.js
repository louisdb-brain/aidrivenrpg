import { io } from 'socket.io-client';
import * as THREE from 'three';
import {Player} from "./player";
import {npc} from "./npc.js";
import handlersConfig from "/scripts/networkevents.json?import";



export function toVec3(obj) {
    return new THREE.Vector3(obj.x, obj.y, obj.z);
}
export class NetworkClient {
    constructor(pChat,pGame) {
        this.handlers = {};
        this.inputSequence = 0;
        this.pendingInputs = [];
        this.game = pGame;
        this.game.networkclient = this;
        this.spriteHandeler = pGame.spriteHandeler;
        // ✅ Works locally and on Render
        //this.socket = io(); console.log("RUNNING SERVER ONLINE"); // Uses same origin as page
        this.playerLevel="level1";
        this.socket = io('http://localhost:3000');

    }
    initSocketListeners() {
        const socket = this.socket;

        // Chat
        socket.on("chat-message", (msg) => {
            const log = document.getElementById(this.chatElementId);
            if (!log) return; // <-- Add this line

            const entry = document.createElement("li");
            entry.textContent = `[${msg.id.slice(0,5)}]: ${msg.message}`;
            log.appendChild(entry);
            log.scrollTop = log.scrollHeight;
        });


        socket.on("local-message", (msg) => {
            const log = document.getElementById(this.chatElementId);
            if (!log) return; // <-- Add this line

            const entry = document.createElement("li");
            entry.textContent = `[You]: ${msg}`;
            log.appendChild(entry);
            log.scrollTop = log.scrollHeight;
        });


        // Player join/leave
        socket.on("playerjoin", (data) => {
            if (!this.game.players[data.id]) this.game.addPlayer(data.id, data.position);
        });

        socket.on("player-left", (id) => {
            this.game.removePlayer(id);
        });

        // Position sync
        socket.on("player-positionupdate", (data) => {
            this.game.playerUpdate(data);
        });

        // NPC updates
        socket.on("npc-position-update", (npcList) => {
            npcList.forEach(n => {
                //if (n.id=="goblinid4")console.log(n.targetPosition);
                if(n.level!=this.playerLevel)return;
                if (!this.game.npcs[n.id]) {
                    this.game.addNpc(n.id, n.position, n.name, n.level);
                }
                this.game.updateNpc(
                    n.id,
                    n.name,
                    n.level,
                    toVec3(n.position),
                    toVec3(n.targetPosition),
                    n.angle,
                    n.health
                );
            });
        });

        socket.on("npc-kill", (data) => {
            if (this.game.npcs[data.id]) this.game.npcs[data.id].destroy();
        });

        socket.on("npc-takedamage", (data) => {
            if (!this.game.npcs[data.id]) return;
            const npc = this.game.npcs[data.id];
            npc.takedamage(data.amount);
            this.game.UI.drawHit(npc.position.clone(), data.amount);
        });

        socket.on("player-takedamage", (data) => {
            const player = this.game.players[data.id];
            if (player) {
                player.takedamage(data.amount);
                this.game.UI.drawHit(player.position.clone(), data.amount);
            }
        });

        socket.on("add-item", (data) => {
            if (this.socket.id === data.id) {
                this.game.UI.inventory.addItem(data.name, `./sprites/${data.name}.png`);
            }
        });
        socket.on("emitnode", (data) => {
            this.game.addNode(data.name, data.position, data.sprite);
            console.log("emit "+data.name);
        });


        socket.on("newloot", (data) => {
            const path = this.itemData?.get(data.name)
            this.game.levelHandeler.spawnLoot(data.id, data.name, data.location, path);
        });

        socket.on("spellcast", (data) => {
            this.game.spawnSpell(data);
        });

        console.log("✅ NetworkClient event listeners initialized");
    }
    initHandlers() {
        for (const [key, methodName] of Object.entries(handlersConfig)) {
            if (typeof this[methodName] === 'function') {
                this.handlers[key] = (...args) => this[methodName](...args);
            } else {
                console.warn(`Method '${methodName}' not found on NetworkClient`);
            }
        }
        if (this.game.UI) {
            this.game.UI.networkClient = this;
            this.game.UI.cookinggame.networkClient = this; // <-- the one you need
            this.game.UI.spellmenu.networkhandlers=this.handlers;
        }
    }
    async loadItemData() {
        const response = await fetch('/items.json');
        const items = await response.json();
        this.itemData = new Map(items.map(item => [item.name, item.image]));

    }
    setlevel(level){
        this.playerLevel=level;
        this.game.players[this.socket.id].level=level;
        this.game.cleanLevel();
        this.game.levelHandeler.setLevel(level);
        this.socket.emit("player-levelchange",level);
    }

    addInventoryItem(name) {
        console.log(" Sending request to add item:", name);
        this.socket.emit("store-item", { name });
    }

    onPlayerReady(callback) {
        this.socket.on('connect', () => {
            this.game.addPlayer(this.socket.id, { x: 0, y: 0, z: 0 });
            console.log("Local player created with ID:", this.socket.id);
            this.localPlayerId=this.socket.id;
            this.game.localPlayerId = this.socket.id;
            console.log("Local player created with ID:", this.socket.id);
            setTimeout(() => {
                callback();
            }, 0); // Wait one tick to ensure player is added
        });
    }
    sendNode(name)
    {
        this.socket.emit("click-node",name);
    }
    sendTarget(pTarget,rightmouse) {
        const player = this.game.players[this.socket.id];
        if (player) {

            this.socket.emit('player-target',pTarget,rightmouse);
            console.log('network click' + rightmouse);
            //this.socket.emit('move', player.position,player.targetPosition);
        } else {
            console.warn("Tried to send position but player doesn't exist yet.");
        }
    }
    attackNpc(pNpcID)
    {
        console.log('clicked and sendind ' +pNpcID);
        this.socket.emit('player-attacknpc',pNpcID);
    }
    getsocket(){
        return this.socket;
    }
    loot(lootId)
    {
        this.socket.emit('loot',lootId);
    }
    getTextureData(id){
        console.log("get texture data for "+id)
        this.socket.emit("get-texture-data",id);
    }
    castSpell(spellData) {
        console.log(spellData);
        if(!spellData.spellSprite){console.log("errorrr")}
        console.log(spellData.spellSprite)
        // Send a spellcast message to the server
        this.socket.emit('spellcast', {
            id: this.localPlayerId,
            name: spellData.name,
            sprite:spellData.spellSprite,
            position: spellData.position,
            lifetime:spellData.lifetime,
            damage:spellData.damage,
            radius:spellData.radius,
            level:this.game.level,

        });
        console.log(`Spellcast emitted:`, spellData);
    }

    /*sendInputVector(x, y)
    {
        const value=[x,y];
        const msg={x:value[0],y:value[1]}
        this.socket.emit("input-vector",msg);
    }*/


}
