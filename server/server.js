import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import {playermanager} from './playermanager.js';
import {gamestateClass} from './server_gamestate.js';
import * as THREE from 'three';
import {npc} from "./npc.js";
import {toVec3} from "./utilities.js"
import {Chest} from "./chest.js";
import {loot} from "./loot.js";
import {skillNode} from "./interactivenode.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server,{cors:{origin:"*",methods:["GET","POST"]}});
//BUILD

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server running on ${port}`));
app.use(express.static('dist'));





app.use(express.static('public')); // Serve index.html and client.js

const gamestate=new gamestateClass(io);

//CALLBACKS
const destroynpcmethod=(npcInstance) => gamestate.npcManager.removeNPC(npcInstance.npcid);
const emitCallback=(event, data) => {io.emit(event, data)}


gamestate.addnpc(new npc("goblin1id",{x:10,y:0,z:0},"goblin_1",io,destroynpcmethod));
gamestate.addnpc(new npc("goblin2id",{x:20,y:0,z:0},"goblin_2",io,destroynpcmethod));
gamestate.addChest(new Chest({x:10,y:0,z:0},"chest1"))
gamestate.start();
//hardcoded temporary npcs




io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    const socketCallback=(event,data)=>{socket.emit(event,data)};
    playermanager.addPlayer(socket.id,(event, data) => {
        io.to(socket.id).emit(event, data);//callback function for events
    });
    io.emit('chat-message',{id:socket.id,message:"welcome to the game press F to fix camera, press I ,S and 1 for overlays"});
    //socket.emit('session-token', sessionToken);


    socket.emit('existing-players', Object.values(playermanager.getAllPlayers())); // only to new client
    socket.broadcast.emit('playerjoin', {
        id: socket.id,
        position: {x:0,y:0,z:0}
    });

    playermanager.additem(socket.id,"onion");
    playermanager.additem(socket.id,"onion");
    playermanager.additem(socket.id,"onion");

    gamestate.objectManager.addloot(new loot("steakid1","steak",{x:0,y:0,z:0},emitCallback));
    const spawnCallback=(pLootid,pName,pLocation)=>{gamestate.objectManager.addloot(new loot(pLootid,pName,pLocation,emitCallback))}
    gamestate.objectManager.addNode(new skillNode("woodcutting1",{x:5,y:0,z:0},"plants/woodcutting_tree_oak","WOODCUTTING","0","log",emitCallback,socketCallback,spawnCallback));
    gamestate.objectManager.addNode(new skillNode("mining1",{x:-5,y:0,z:0},"miningrock_copper","MINING","0","ore_copper",emitCallback,socketCallback,spawnCallback));
    gamestate.objectManager.addNode(new skillNode("mining2",{x:-5,y:0,z:+5},"miningrock_mithril","MINING","30","ore_mithril",emitCallback,socketCallback,spawnCallback));


    //gamestate.emitNpc();
    //gamestate.emitPlayers();
    socket.on('spellcast',(data)=>
    {
        console.log(data)
        gamestate.castSpell(data);

    })
    //console.log('Sending existing players:', playermanager.getAllPlayers());
    socket.on('login',(playerID=>
    {

    }));

    socket.on('chat-message', (msg) => {
        io.emit('chat-message', {
            id: socket.id,
            message: msg
        });
    });


    socket.on('player-target', (target, rightmouse) => {
        const player = playermanager.getPlayer(socket.id);
        if (!player) return;
        player.setTarget(target);
    });
    socket.on('player-attacknpc',(npcid)=>
    {
        console.log("received attack target" +npcid+" for player "+socket.id);
        const player=playermanager.getPlayer(socket.id);
        const npcobject=gamestate.npcManager.npcs[npcid];
        player.setTargetEntity(npcid,npcobject);
        player.attacking=true;

    }
    )
    socket.on('clickchest',(chestid)=>
    {
        const chest=gamestate.objectManager.getChest(chestid);
        chest.parentObject=playermanager.getPlayer(socket.id);
        chest.toggleGrounded(socket.id);


    })
    socket.on('loot',(lootID)=>{
    gamestate.objectManager.lootObject(lootID,socket.id);
    console.log(lootID);
    })

    socket.on('click-node', (nodeId) => {

        const node = gamestate.objectManager.getNode(nodeId);
        const player = playermanager.getPlayer(socket.id);
        node.click(player,socket);//passes in the socket to get the actual player clicking,not the last one

    });

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


});/*
server.listen(3000, () => {
    console.log('Socket.IO server running at http://localhost:3000');
});*/



