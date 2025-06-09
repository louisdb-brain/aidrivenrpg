import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {NetworkClient} from "../scripts/networkclient.js";
import {Game} from "../scripts/gameLoop";
import {debug} from "three/tsl";

const thisgame=new Game();
const networkHandler = new NetworkClient("chatLog",thisgame);


networkHandler.onPlayerReady(() => {
    thisgame.localPlayerId = networkHandler.getsocket().id;
    thisgame.loop();

});




document.getElementById('chatButton').addEventListener("click", sendMessage);

const input=document.getElementById('chatInput');
if (document.activeElement !== input) {
    input.focus();
}
input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});
function sendMessage() {
    const input = document.getElementById('chatInput');
    networkHandler.socket.emit('chat-message',input.value);
    input.value = '';
}


const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();


const objectIntersects = raycaster.intersectObjects(thisgame.chests, true);
/*
if (objectIntersects.length > 0) {
    const clicked = objectIntersects[0].object;

    // Check if it's an NPC
    for (const id in thisgame.npcs) {
        const npc = thisgame.npcs[id];
        if (npc.model === clicked || npc.model.children.includes(clicked)) {
            npc.interact?.(); // call npc.interact() if defined
            return;
        }
    }

    // Check if it's a loot object
    if (thisgame.objects) {
        for (const obj of thisgame.objects) {
            if (obj === clicked || obj.children.includes(clicked)) {
                obj.pickup?.(); // call pickup() if defined
                return;
            }
        }
    }
}*/


window.addEventListener('mouseup', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, thisgame.camera); // use your camera instance
    const intersects = raycaster.intersectObject(thisgame.ground); // ground only
    if (intersects.length > 0) {

        const point = intersects[0].point;
        const socketid = networkHandler.getsocket().id;
        const player = thisgame.players[socketid];
        if (player) {
            const isRightClick = event.button === 2;

            // Optional: handle left/right click differently
            if (isRightClick) {
                networkHandler.sendTarget(point,true);
                console.log("rightclick");
            }
            else {
                networkHandler.sendTarget(point,false);
                console.log("leftclick");
            }

        } else {
            console.warn("Local player not ready yet.");
        }
    }
    //check if target is monster here

});

let lastPos = new THREE.Vector3()

function clickTarget(x,y){

}



