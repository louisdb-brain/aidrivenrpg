import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import {playermanager} from './playermanager.js';
import {debug, output} from "three/tsl";

const app = express();
const server = http.createServer(app);
const io = new Server(server,{cors:{origin:"*",methods:["GET","POST"]}});

app.use(express.static('public')); // Serve index.html and client.js

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    playermanager.addPlayer(socket.id);

    io.emit('existing-players',playermanager.getAllPlayers() );
    io.emit('playerjoin',{
        id:socket.id,
        position: {x: 0, y: 0, z: 0}
    });

    console.log('Sending existing players:', playermanager.getAllPlayers());

    socket.on('chat-message', (msg) => {
        io.emit('chat-message', {
            id: socket.id,
            message: msg
        });
    });


    socket.on('move',(pos,target)=> {

        playermanager.updatePlayerPosition(socket.id, pos,target);
        socket.broadcast.emit('player-positionupdate',{
            id: socket.id,
            position: playermanager.getPlayerPosition(socket.id),
            target:playermanager.getTarget(socket.id)
        })

    });

    socket.on('disconnect', () => {
        playermanager.removePlayer(socket.id);
        socket.emit('player-left', socket.id);

    });


});

server.listen(3000, () => {
    console.log('Socket.IO server running at http://localhost:3000');
});