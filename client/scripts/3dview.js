import * as THREE from 'three';
import handlersConfig from './networkevents.json' assert { type: 'json' };
import { NetworkClient } from "./networkclient.js";
import { Game } from "./gameLoop";



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
networkHandler.onPlayerReady(() => {
    thisgame.localPlayerId = networkHandler.getsocket().id;
    thisgame.loop();
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
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
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

// Raycaster setup
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('pointerup', (event) => {
    if (isDragging || orbiting) return; // Ignore camera movements

    /*const clickedSpellMenu   = thisgame.UI.activeMenus.magic     && e.target.closest('#spellMenu');
    const clickedCookingMenu = thisgame.UI.activeMenus.cooking   && e.target.closest('#cookingMenu');
    const clickedInventory   = thisgame.UI.activeMenus.inventory && e.target.closest('#inventoryCanvas');

    if (clickedSpellMenu || clickedCookingMenu || clickedInventory) {
        //return; // Prevent moving player
    }*/

    const rect = thisgame.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, thisgame.camera);
    raycaster.far = 100000;

    if(thisgame.UI.spellmenu.activeSpell) {

        const position = thisgame.UI.spellmenu.getMousePositionToGround(mouse, thisgame.camera, raycaster, thisgame.ground);
        if (position) {
            thisgame.UI.spellmenu.castSpell(position);
        }
    }

    // 1. Check NPCs (deep match against child meshes)
    // Remove null/undefined items
    const npcModels = Object.values(thisgame.npcs).map(npc => npc.model);
    const validNpcModels = npcModels.filter(obj => obj instanceof THREE.Object3D);

    const npcIntersects = raycaster.intersectObjects(validNpcModels, true); // deep = true

    if (npcIntersects.length > 0) {
        const hitObject = npcIntersects[0].object;

        for (const id in thisgame.npcs) {
            const npc = thisgame.npcs[id];
            const mesh = npc.model;

            // Match parent or any child recursively
            if (mesh === hitObject || mesh.children.includes(hitObject) || mesh.children.some(child => child === hitObject)) {
                console.log("NPC clicked:", id);
                networkHandler.attackNpc(id);
                return; // done!
            }
        }
    }

    // 2. Check Loot
    const lootResult = thisgame.levelHandeler.tryPickupLootFromRay(raycaster);
    if (lootResult) {
        networkHandler.loot(lootResult.itemID);
        return;
    }

    // 3. Check ground click (movement)
    const groundHit = raycaster.intersectObject(thisgame.ground);
    if (groundHit.length > 0) {
        const point = groundHit[0].point;
        const socketid = networkHandler.getsocket().id;
        const player = thisgame.players[socketid];
        if (!player) return;

        const isRightClick = event.button === 2;
        networkHandler.sendTarget(point, isRightClick);

        console.log("GROUND hit at:", groundHit[0].point);
        console.log(point);
        console.log(isRightClick ? "Right click" : "Left click", point);
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
