import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {NetworkClient} from "../scripts/networkclient.js";
import {Game} from "../scripts/gameLoop";
import {debug} from "three/tsl";

const thisgame=new Game();
const networkHandler = new NetworkClient("chatLog",thisgame);

thisgame.loop();




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


window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, thisgame.camera); // use your camera instance
    const intersects = raycaster.intersectObject(thisgame.ground); // ground only

    if (intersects.length > 0) {
        const point = intersects[0].point;
        thisgame.players[networkHandler.socket.id].setTarget(point);
        // Move player toward this point
    }
});


