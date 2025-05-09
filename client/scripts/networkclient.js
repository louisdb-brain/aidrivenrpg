import { io } from 'socket.io-client';
import {Player} from "./player";


export class NetworkClient {
    constructor(pChat,pGame) {
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
                pGame.removePlayer(id);
            });

            this.socket.on('playerjoin',(data)=>
            {
                //🎅making other players on client
                if (data.id !== this.socket.id) {
                    pGame.addPlayer(data.id, data);
                }
            });

            this.socket.on('connect', () => {
                //🎅making a new player here
                pGame.addPlayer(this.socket.id, { x: 0, y: 0, z: 0 });
            });
            this.socket.on('disconnect', () => {
                pGame.removePlayer(this.socket.id);
            })
            this.socket.on("player-positionupdate", (data) => {
                pGame.players[data.id].posUpdate(data.pos)
            })
            this.socket.on('existing-players', (data) => {
                for (const id in data) {
                    if (id !== this.socket.id) {
                        pGame.addPlayer(id,data[id].position );
                    }
                }
            });
        });
    }


    sendPosition(pos) {
        this.socket.emit('move', pos);
        console.log('pos:', pos);
    }
    getsocket(){
        return this.socket;
    }


}