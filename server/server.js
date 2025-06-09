import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import {playermanager} from './playermanager.js';
import {gamestateClass} from './server_gamestate.js';
import * as THREE from 'three';
import {npc} from "./npc.js";
import {toVec3} from "./utilities.js"
import {Chest} from "./chest.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server,{cors:{origin:"*",methods:["GET","POST"]}});

app.use(express.static('public')); // Serve index.html and client.js

const gamestate=new gamestateClass(io);

gamestate.addnpc(new npc("goblin1id",{x:10,y:0,z:0},"goblin_1"))
gamestate.addnpc(new npc("goblin2id",{x:20,y:0,z:0},"goblin_2"))
gamestate.addChest(new Chest({x:10,y:0,z:0},"chest1"))
gamestate.start();
//hardcoded temporary npcs




io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    playermanager.addPlayer(socket.id);

    io.emit('existing-players',playermanager.getAllPlayers() );
    io.emit('playerjoin',{
        id:socket.id,
        position: {x: 0, y: 0, z: 0}
    });

    //gamestate.emitNpc();
    //gamestate.emitPlayers();

    //console.log('Sending existing players:', playermanager.getAllPlayers());


    socket.on('chat-message', (msg) => {
        io.emit('chat-message', {
            id: socket.id,
            message: msg
        });
    });

    socket.on('player-target',(target,rightmouse)=>
    {
        playermanager.setTarget(socket.id,target,rightmouse)

    })
    socket.on('clickchest',(chestid)=>
    {
        const chest=gamestate.objectManager.getChest(chestid);
        chest.parentObject=playermanager.getPlayer(socket.id);
        chest.toggleGrounded(socket.id);


    })
    /*
    socket.on('move',(pos,target)=> {

        playermanager.updatePlayerPosition(socket.id, pos,target);
        socket.broadcast.emit('player-positionupdate',{
            id: socket.id,
            position: playermanager.getPlayerPosition(socket.id),
            target:playermanager.getTarget(socket.id)
        })

    });*/

    socket.on('disconnect', () => {
        playermanager.removePlayer(socket.id);
        socket.broadcast.emit('player-left', socket.id);

    });


});

server.listen(3000, () => {
    console.log('Socket.IO server running at http://localhost:3000');
});

