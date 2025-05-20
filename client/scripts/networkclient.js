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
        this.socket = io('http://localhost:3000');
        window.addEventListener('DOMContentLoaded', () => {
            this.socket.on('chat-message', (msg) => {
                const log = document.getElementById(pChat);
                const entry = document.createElement('li');
                entry.textContent = `[${msg.id.slice(0, 5)}]: ${msg.message}`;
                log.appendChild(entry);
                log.scrollTop=log.scrollHeight;
            });
            this.socket.on('player-left', (id) => {
                this.game.removePlayer(id);
                console.log(id+ " player left");
            });

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
                console.log("position update received " );
                console.log(data);
                console.log("vector received");
                console.log(data.position);
                console.log(data.target);

                this.game.posUpdate(data.id, data.position,data.target);



            })
            this.socket.on('npc-position-update', (npcs) => {
                npcs.forEach(npc => {
                    if(!this.game.npcs[npc.id])
                    {
                        this.game.addNpc(npc.id);
                    }

                    this.game.updateNpc(npc.id,npc.name,toVec3(npc.position),toVec3(npc.targetPosition),npc.angle,npc.health);
                });
            });

            this.socket.on('existing-players', (data) => {
                //console.log(data);
                for (const id in data) {
                    if (id !== this.socket.id) {
                        pGame.addPlayer(id,data[id].position );
                    }
                }
            });
        });
    }

    onPlayerReady(callback) {
        this.socket.on('connect', () => {
            this.game.addPlayer(this.socket.id, { x: 0, y: 0, z: 0 });
            console.log("Local player created with ID:", this.socket.id);
            setTimeout(() => {
                callback();
            }, 0); // Wait one tick to ensure player is added
        });
    }
    sendPosition() {
        const player = this.game.players[this.socket.id];
        if (player) {
            this.socket.emit('move', player.position,player.targetPosition);
        } else {
            console.warn("Tried to send position but player doesn't exist yet.");
        }
    }
    getsocket(){
        return this.socket;
    }


}