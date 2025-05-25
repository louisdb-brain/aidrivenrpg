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

//this is the main function that ticks the position in client and updates it on server
//I need to ajust this part because it is easily abused (i need to make the movement check in the server)
//basically i have to do this in reverse
/*
function startSendingPosition() {
    setInterval(() => {
        const player = thisgame.players[networkHandler.socket.id];
        if (!player) return;
        if (!player.position.equals(lastPos)) {
            networkHandler.sendPosition(player.position);
            lastPos.copy(player.position);
        }
    }, 100); // every 100ms
}*/

