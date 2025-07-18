import { io } from 'socket.io-client';
import * as THREE from 'three';
import {Player} from "./player";
import {player} from "../../server/player_server";
import {debug} from "three/tsl";

export function toVec3(obj) {
    return new THREE.Vector3(obj.x, obj.y, obj.z);
}
export class NetworkClient {
    constructor(pChat,pGame) {
        this.game=pGame;
        this.spriteHandeler=pGame.spriteHandeler;
        this.socket = io('http://localhost:3000');
        window.addEventListener('DOMContentLoaded', () => {
            //CHAT MESSAGE
            this.socket.on('chat-message', (msg) => {
                const log = document.getElementById(pChat);
                const entry = document.createElement('li');
                entry.textContent = `[${msg.id.slice(0, 5)}]: ${msg.message}`;
                log.appendChild(entry);
                log.scrollTop=log.scrollHeight;
                const npc=this.game.players[msg.id];
                this.game.UI.drawchat(npc.position.clone(),msg.message)
            });
            //PLAYER LEAVE
            this.socket.on('player-left', (id) => {
                this.game.removePlayer(id);
                console.log(id+ " player left");
            });
            //PLAYER JOIN
            this.socket.on('playerjoin',(data)=>
            {
                //🎅making other players on client
                if (data.id !== this.socket.id) {
                    this.game.addPlayer(data.id, data);
                }
            });


            this.socket.on('disconnect', () => {
                this.game.removePlayer(this.socket.id);
            })
            this.socket.on("player-positionupdate", (data) => {
               data.forEach(player => {
                   this.game.playerUpdate(player.id,player.pos,player.targetpos,player.locked,player.lockedpos,player.angle)

               })


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
            this.socket.on('npc-takedamage',(payload) => {
                console.log(payload)
                if (this.game.npcs[payload.id]) {
                    const npc=this.game.npcs[payload.id];
                    npc.takedamage(payload.amount);
                    this.game.UI.drawHit(npc.position.clone(),payload.amount);
                    this.game.players[this.socket.id].playAnimation(1);
                }
                else
                {
                    console.log("no npc with id " + this.game.npcs[payload.id]);
                }
            })
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
            this.socket.on('existing-players', (data) => {
                //console.log(data);
                for (const id in data) {
                    if (id !== this.socket.id) {
                        this.game.addPlayer(id,data[id].position );
                    }
                }
            });

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


}