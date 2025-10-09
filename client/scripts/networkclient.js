import { io } from 'socket.io-client';
import * as THREE from 'three';
import {Player} from "./player";
import {npc} from "./npc.js";


export function toVec3(obj) {
    return new THREE.Vector3(obj.x, obj.y, obj.z);
}
export class NetworkClient {
    constructor(pChat,pGame) {
        this.inputSequence = 0;
        this.pendingInputs = [];
        this.game=pGame;
        this.spriteHandeler=pGame.spriteHandeler;
        // ✅ Works locally and on Render
        //this.socket = io(); console.log("RUNNING SERVER ONLINE"); // Uses same origin as page

        this.socket = io('http://localhost:3000');

        window.addEventListener('DOMContentLoaded', () => {
            //socket token
            /*socket.on('session-token', (token) => {
                localStorage.setItem('sessionToken', token);
            });*/

            //CHAT MESSAGE
            this.socket.on('chat-message', (msg) => {
                const log = document.getElementById(pChat);
                const entry = document.createElement('li');
                entry.textContent = `[${msg.id.slice(0, 5)}]: ${msg.message}`;
                log.appendChild(entry);
                log.scrollTop=log.scrollHeight;
                if (npc && npc.position) {
                    this.game.UI.drawchat(npc.position.clone(), msg.message);
                } else {
                    console.warn(`Chat received for unknown player: ${msg.id}`);
                }
            });
            //private server messages
            this.socket.on('local-message', (msg) => {
                const log = document.getElementById(pChat);
                const entry = document.createElement('li');
                entry.textContent = `[You]: ${msg}`;
                log.appendChild(entry);
                log.scrollTop = log.scrollHeight;
            });

            //PLAYER LEAVE
            this.socket.on('player-left', (id) => {
                this.game.removePlayer(id);
                console.log(id+ " player left");
            });
            //PLAYER JOIN
            this.socket.on('playerjoin', (data) => {
                if (!this.game.players[data.id]) {
                    this.game.addPlayer(data.id, data.position);
                }
            });



            this.socket.on('disconnect', () => {
                this.game.removePlayer(this.socket.id);
            })
            this.socket.on("player-positionupdate", (data) => {
                this.game.playerUpdate(data);

            })


            this.socket.on('npc-position-update', (npcs) => {
                npcs.forEach(npc => {
                    if(!this.game.npcs[npc.id])
                    {
                        this.game.addNpc(npc.id);
                    }

                    this.game.updateNpc(npc.id,npc.name,toVec3(npc.position),toVec3(npc.targetPosition),npc.angle,npc.health);
                    //console.log("updated " + npc.name);
                });
            });
            this.socket.on('npc-kill',(payload)=>
            {

                delete this.game.npcs[payload.id];
                //manager.npcs = manager.npcs.filter(n => n !== npc)
            });
            this.socket.on('npc-takedamage',(payload) => {
                //console.log(payload.amount);
                if (this.game.npcs[payload.id]) {
                    const npc=this.game.npcs[payload.id];
                    npc.takedamage(payload.amount);
                    this.game.UI.drawHit(npc.position.clone(),payload.amount);
                    //this.game.players[this.socket.id].playAnimation(1);
                }
                else
                {
                    console.log("no npc with id " + this.game.npcs[payload.id]);
                }
            })
            this.socket.on("player-takedamage",(payload) => {
                //console.log(payload);
                if(this.game.players[payload.id])
                {
                    const player=this.game.players[payload.id];
                    player.takedamage(payload.amount);
                    this.game.UI.drawHit(player.position.clone(),payload.amount);
                }

                console.log(payload);
            });
            /*this.socket.on('chest-position-update',(chests)=>{
                chests.forEach(chest => {
                    if(!this.game.chests[chest.id])
                    {
                        this.game.addChest(chest.id);
                    }
                    else {
                        this.game.UpdateChest(chest.id, toVec3(chest.position), chest.grounded, toVec3(chest.parent), chest.angle);
                        console.log("updated " + chest.id);
                    }
                })
            })*/
            this.socket.on('existing-players', (players) => {
                for (const p of players) {
                    if (p.id !== this.socket.id) {
                        this.game.addPlayer(p.id, p.pos); // or p.position if that's the correct field
                    }
                }
            });
            this.socket.on('add-item', (data) => {
                console.log(data);
                if(this.socket.id === data.id) {

                    this.game.UI.inventory.addItem(data.name,"./sprites/"+data.name+".png");
                }
            })
            this.socket.on('newloot', (data) => {
                const pathname="./sprites/"+data.name+".png";
                console.log(pathname);
                this.game.levelHandeler.spawnLoot(data.id,data.name,data.location,pathname);
            })
            this.socket.on('emitnode', (data) => {
                const pathname="./sprites/"+data.sprite+".png";

                this.game.addNode(data.name,data.position,pathname);
            })
            this.socket.on("spellcast",(data)=>
            {
                console.log("spell received from server "+data.name)
                this.game.spawnSpell(data);
            })

        });
    }

    onPlayerReady(callback) {
        this.socket.on('connect', () => {
            this.game.addPlayer(this.socket.id, { x: 0, y: 0, z: 0 });
            console.log("Local player created with ID:", this.socket.id);
            this.localPlayerId=this.socket.id;
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
            radius:spellData.radius

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
