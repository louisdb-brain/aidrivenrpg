import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { NetworkClient } from "./networkclient.js";
import { Game } from "./gameLoop";

const thisgame = new Game();
const networkHandler = new NetworkClient("chatLog", thisgame);

networkHandler.onPlayerReady(() => {
    thisgame.localPlayerId = networkHandler.getsocket().id;
    thisgame.loop();
});

// Chat functionality
document.getElementById('chatButton').addEventListener("click", sendMessage);
const input = document.getElementById('chatInput');
input.focus();
input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') sendMessage();
});

function sendMessage() {
    networkHandler.socket.emit('chat-message', input.value);
    input.value = '';
}

// Raycaster setup
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('mouseup', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, thisgame.camera);
    raycaster.far = 100000;

    const npcModels = Object.values(thisgame.npcs).map(npc => npc.model);


    if (npcModels.length === 0) {
        console.log("no models")
    }

    const npcIntersects = raycaster.intersectObjects(npcModels, true);

    if (npcIntersects.length > 0) {
        console.log("ping");
        const clicked = npcIntersects[0].object;


        // Find which NPC was clicked
        for (const id in thisgame.npcs) {
            const npc = thisgame.npcs[id];
            if (npc.model === clicked || npc.model.children.includes(clicked) || npc.model.children.some(child => child === clicked))   {
                console.log("NPC clicked:",  id);
                networkHandler.attackNpc(id);
                // You could trigger dialogue, selection, etc. here
            }
        }
    }

    // Optionally also check for ground click
    const groundIntersects = raycaster.intersectObject(thisgame.ground);
    if (groundIntersects.length > 0) {
        const point = groundIntersects[0].point;
        const socketid = networkHandler.getsocket().id;
        const player = thisgame.players[socketid];

        if (player) {
            const isRightClick = event.button === 2;
            networkHandler.sendTarget(point, isRightClick);
            console.log(isRightClick ? "rightclick" : "leftclick", point);
        } else {
            console.warn("Local player not ready yet.");
        }
    }
});

 // Unused currently, but fine to leave
