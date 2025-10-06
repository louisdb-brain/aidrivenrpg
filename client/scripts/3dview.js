import * as THREE from 'three';
import handlersConfig from './networkevents.json' assert { type: 'json' };
import { NetworkClient } from "./networkclient.js";
import { Game } from "./gameLoop.js";
import {gamepad} from "./gamepad.js";


const handlers = {};
const thisgame = new Game(handlers);
const networkHandler = new NetworkClient("chatLog", thisgame);

for (const [key, methodName] of Object.entries(handlersConfig)) {
    if (typeof networkHandler[methodName] === 'function') {
        handlers[key] = (...args) => networkHandler[methodName](...args);
    } else {
        console.warn(`Method '${methodName}' not found on NetworkClient`);
    }
}

var playerisReady=false;
networkHandler.onPlayerReady(() => {
    thisgame.localPlayerId = networkHandler.getsocket().id;
    thisgame.loop();
    playerisReady = true;

});



let isDragging = false;
let dragStart = { x: 0, y: 0 };
let orbiting = false;

// Track if the OrbitControls is rotating the camera
thisgame.controls.addEventListener('start', () => orbiting = true);
thisgame.controls.addEventListener('end',   () => orbiting = false);

// Track drag start
window.addEventListener('pointerdown', (e) => {
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
    isDragging = false;
});

// Track drag move

window.addEventListener('pointermove', (e) => {
    const dx = Math.abs(e.clientX - dragStart.x);
    const dy = Math.abs(e.clientY - dragStart.y);
    if (dx > 3 || dy > 3) isDragging = true;

    if(thisgame.UI.spellmenu.activeSpell)
    {
        const rect = thisgame.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, thisgame.camera);
        raycaster.far = 100000;
        if(!thisgame.ground)return;


        const position = thisgame.UI.spellmenu.getMousePositionToGround(
            mouse, thisgame.camera, raycaster, thisgame.ground
        );
        if (!position) return;
        //thisgame.VFX.spawn('/icons/magiccircle.png', new THREE.Vector3(0, 0, 0), 'billboard', 20, 5000);

        thisgame.VFX.spawn('/icons/magiccircle.png', position, 'flat', 10, 50);

    }
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
//gamepad setup

var gamepadOne = null;
window.addEventListener("gamepadconnected", (e) => {
    console.log("Gamepad connected:", e.gamepad.id);

    gamepadOne=new gamepad(networkHandler,thisgame);
    gamepadOne.addEventListener("buttondown", (e) => {
        if (e.detail.button === 7) {
            console.log("Gamepad down");
            thisgame.UI.spellmenu.selectSpellByName("MeleeAttack");
        }
    });
    gamepadOne.addEventListener("buttonup", (e) => {
        if (e.detail.button === 7) {
            console.log("Gamepad up");
            thisgame.UI.spellmenu.castSpell(thisgame.players[networkHandler.socket.id].position)
        }
    });
    if(gamepadOne instanceof gamepad && gamepadOne.connected)
    {
        gamepadOne.loop();
    }
});

const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

window.addEventListener("gamepaddisconnected", (e) => {
    console.log("Gamepad disconnected:", e.gamepad.id);
});
//input setup
document.addEventListener('keydown', event => {
    const k = event.key.toLowerCase();
    if(keys[k] !== undefined) { keys[k] = true; sendInput(); }
});
document.addEventListener('keyup', event => {
    const k = event.key.toLowerCase();
    if(keys[k] !== undefined) { keys[k] = false; sendInput(); }
});

function sendInput() {
    let x = 0, y = 0;
    if (keys.w) y -= 1;
    if (keys.s) y += 1;
    if (keys.a) x -= 1;
    if (keys.d) x += 1;

    // normalize
    const len = Math.hypot(x, y);
    if (len > 0) {
        x /= len;
        y /= len;
    }
    const playerId=networkHandler.getsocket().id;
    networkHandler.sendInputVector(x, y,playerId);
    thisgame.sendInputVector(x,y,playerId);
}
// Raycaster setup
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener("unhandledrejection", e => {
    console.error("Unhandled promise rejection:", e.reason);
});
window.addEventListener('pointerup', (event) => {
    if (isDragging || orbiting) return; // ignore camera drag/rotate

    const rect = thisgame.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, thisgame.camera);
    raycaster.far = 100000;

    // ---- 1. Spell targeting (if spell menu is active) ----
    if (thisgame.UI.spellmenu.activeSpell) {
        const pos = thisgame.UI.spellmenu.getMousePositionToGround(mouse, thisgame.camera, raycaster, thisgame.ground);
        if (pos) {
            thisgame.UI.spellmenu.castSpell(pos);
            return; // handled, stop further click logic
        }
    }

    // ---- 2. SkillNode click ----
    if (thisgame.nodeMap && thisgame.nodeMap.size > 0) {
        const nodeMeshes = Array.from(thisgame.nodeMap.keys());
        const nodeHits = raycaster.intersectObjects(nodeMeshes, true);
        if (nodeHits.length > 0) {
            const mesh = nodeHits[0].object;
            const node = thisgame.nodeMap.get(mesh);
            if (node) {
                console.log("Clicked skillNode:", node.name);
                networkHandler.sendNode( node.name);
                return; // stop — we clicked a node
            }
        }
    }

    // ---- 3. NPC click ----
    const npcModels = Object.values(thisgame.npcs)
        .map(n => n?.model)
        .filter(m => m instanceof THREE.Object3D);
    const npcHits = raycaster.intersectObjects(npcModels, true);
    if (npcHits.length > 0) {
        const hitObj = npcHits[0].object;
        for (const id in thisgame.npcs) {
            const npc = thisgame.npcs[id];
            const mesh = npc.model;
            if (!mesh) continue;

            // check parent/children
            if (mesh === hitObj || mesh.children.includes(hitObj) || mesh.children.some(c => c === hitObj)) {
                console.log("NPC clicked:", id);
                networkHandler.attackNpc(id);
                return;
            }
        }
    }

    // ---- 4. Loot click ----
    const lootResult = thisgame.levelHandeler?.tryPickupLootFromRay(raycaster);
    if (lootResult) {
        networkHandler.loot(lootResult.itemID);
        return;
    }

    // ---- 5. Ground click (movement) ----
    if (thisgame.ground) {
        const groundHit = raycaster.intersectObject(thisgame.ground);
        if (groundHit.length > 0) {
            const point = groundHit[0].point;
            const socketid = networkHandler.getsocket().id;
            const player = thisgame.players[socketid];
            if (!player) return;

            const isRightClick = event.button === 2;
            networkHandler.sendTarget(point, isRightClick);
            console.log("Ground clicked:", point, isRightClick ? "(right)" : "(left)");
        }
    }
});


// Hover state + helpers
let hoveredNPC = null;
let isOrbiting = false;

thisgame.controls.addEventListener('start', () => { isOrbiting = true; });
thisgame.controls.addEventListener('end',   () => { isOrbiting = false; });

function applyHighlight(root) {
    if (!root) return;
    root.traverse(obj => {
        if (obj.isMesh) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach(mat => {
                if (!mat || !('emissive' in mat)) return;

                if (!obj.userData._hoverBak) obj.userData._hoverBak = [];
                obj.userData._hoverBak.push({
                    mat,
                    color: mat.emissive.getHex(),
                    intensity: ('emissiveIntensity' in mat) ? mat.emissiveIntensity : undefined
                });

                mat.emissive.setHex(0x333333);           // subtle highlight
                if ('emissiveIntensity' in mat) mat.emissiveIntensity = 1.25;
            });
        }
    });
}

function clearHighlight(root) {
    if (!root) return;
    root.traverse(obj => {
        const bak = obj.userData._hoverBak;
        if (!bak) return;
        bak.forEach(({ mat, color, intensity }) => {
            if (!mat || !('emissive' in mat)) return;
            mat.emissive.setHex(color);
            if (intensity !== undefined && 'emissiveIntensity' in mat) {
                mat.emissiveIntensity = intensity;
            }
        });
        obj.userData._hoverBak = null;
    });
}

// Helper: given a mesh hit, return the owning NPC model (top-level)
function findNPCModelFromHit(hitObj) {
    // hitObj could be a child mesh; climb up until you match an npc.model
    for (const id in thisgame.npcs) {
        const npc = thisgame.npcs[id];
        if (!npc || !npc.model) continue;
        let p = hitObj;
        while (p) {
            if (p === npc.model) return npc.model;
            p = p.parent;
        }
    }
    return null;
}


 // Unused currently, but fine to leave
