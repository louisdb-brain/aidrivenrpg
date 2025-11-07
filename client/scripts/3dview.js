import * as THREE from 'three';
import handlersConfig from './networkevents.json' assert { type: 'json' };
import { NetworkClient } from "./networkclient.js";
import { Game } from "./gameLoop.js";
import { gamepad } from "./gamepad.js";

const handlers = {};
const thisgame = new Game(handlers);

// Network client reference (assigned after start)
let networkHandler = null;

// Boot sequence: preload → start (builds UI etc) → create network → bind network-ready logic
thisgame.initTextures().then(() => {
    thisgame.start();

    networkHandler = new NetworkClient("chatLog", thisgame);
    thisgame.networkClient = networkHandler;


    // Only now is it safe to subscribe to network readiness
    let playerisReady = false;
    networkHandler.onPlayerReady(() => {
        thisgame.networkClient.initHandlers();
        thisgame.networkClient.initSocketListeners();
        const sock = networkHandler.getsocket?.();
        if (!sock?.id) return;
        thisgame.localPlayerId = sock.id;

        thisgame.loop();
        playerisReady = true;
    });
});

// Drag/orbit tracking
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let orbiting = false;

// Orbit state comes from controls created by Game
thisgame.controls.addEventListener('start', () => (orbiting = true));
thisgame.controls.addEventListener('end', () => (orbiting = false));

// Drag start
window.addEventListener('pointerdown', (e) => {
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
    isDragging = false;
});

// Drag move (+ spell target preview if spellmenu is active)
window.addEventListener('pointermove', (e) => {
    const dx = Math.abs(e.clientX - dragStart.x);
    const dy = Math.abs(e.clientY - dragStart.y);
    if (dx > 3 || dy > 3) isDragging = true;

    // Guard UI access until start() has created it
    if (thisgame.UI?.spellmenu?.activeSpell) {
        const rect = thisgame.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, thisgame.camera);
        raycaster.far = 100000;
        if (!thisgame.ground) return;

        const position = thisgame.UI.spellmenu.getMousePositionToGround?.(
            mouse,
            thisgame.camera,
            raycaster,
            thisgame.ground
        );
        if (!position) return;

        thisgame.VFX?.spawn?.('/icons/magiccircle.png', position, 'flat', 10, 50);
    }
});

// Level change button (guard level handler)
document.getElementById('levelButton')?.addEventListener('click', () => {
    const val = document.getElementById('chatInput')?.value;
    thisgame.levelHandeler?.setLevel?.(val);
});

// Chat wiring
const chatBtn = document.getElementById('chatButton');
const input = document.getElementById('chatInput');
chatBtn?.addEventListener('click', sendMessage);
if (input) {
    input.focus();
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') sendMessage();
    });
}

function sendMessage() {
    if (!input?.value) return;
    const sock = networkHandler?.socket;
    if (!sock) return console.warn('Network not ready; chat skipped.');
    sock.emit('chat-message', input.value);
    input.value = '';
}

// Gamepad setup
let gamepadOne = null;

window.addEventListener('gamepadconnected', (e) => {
    console.log('Gamepad connected:', e.gamepad.id);

    // Require network + game objects to exist
    if (!networkHandler) return console.warn('Network not ready; gamepad deferred.');
    gamepadOne = new gamepad(networkHandler, thisgame);
    thisgame.gamepad = gamepadOne;

    // Attach virtual cursor to UIs (if present)
    if (gamepadOne?.virtualCursor) {
        thisgame.UI?.attachVirtualCursor?.(gamepadOne.virtualCursor);
    }

    // Button 7 pressed → select melee spell
    gamepadOne.addEventListener('buttondown', (ev) => {
        if (ev.detail.button === 7) {
            thisgame.UI?.spellmenu?.selectSpellByName?.('MeleeAttack');
        }
    });

    // Button 7 released → cast at local player's current position
    gamepadOne.addEventListener('buttonup', (ev) => {
        if (ev.detail.button === 7) {
            const id = networkHandler?.socket?.id;
            const pos = id ? thisgame.players?.[id]?.position : null;
            if (pos) thisgame.UI?.spellmenu?.castSpell?.(pos);
        }
    });

    if (gamepadOne instanceof gamepad && gamepadOne.connected) {
        gamepadOne.loop();
    }
});

window.addEventListener('gamepaddisconnected', (e) => {
    console.log('Gamepad disconnected:', e.gamepad.id);
});

// Keyboard input to movement vectors
const keys = { w: false, a: false, s: false, d: false };

document.addEventListener('keydown', (event) => {
    const k = event.key.toLowerCase();
    if (k in keys) {
        keys[k] = true;
        sendInput();
    }
});

document.addEventListener('keyup', (event) => {
    const k = event.key.toLowerCase();
    if (k in keys) {
        keys[k] = false;
        sendInput();
    }
});

function sendInput() {
    const sockId = networkHandler?.getsocket?.()?.id;
    if (!sockId) return; // not ready yet

    let x = 0,
        y = 0;
    if (keys.w) y -= 1;
    if (keys.s) y += 1;
    if (keys.a) x -= 1;
    if (keys.d) x += 1;

    const len = Math.hypot(x, y);
    if (len > 0) {
        x /= len;
        y /= len;
    }

    networkHandler.sendInputVector?.(x, y, sockId);
    thisgame.sendInputVector?.(x, y, sockId);
}

// Global raycaster helpers
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});

// Click handling: spell targeting → nodes → NPCs → loot → ground movement
window.addEventListener('pointerup', (event) => {
    if (isDragging || orbiting) return;

    const rect = thisgame.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, thisgame.camera);
    raycaster.far = 100000;

    // 1) Spell targeting if menu active
    if (thisgame.UI?.spellmenu?.activeSpell) {
        const pos = thisgame.UI.spellmenu.getMousePositionToGround?.(
            mouse,
            thisgame.camera,
            raycaster,
            thisgame.ground
        );
        if (pos) {
            thisgame.UI.spellmenu.castSpell?.(pos);
            return;
        }
    }

    // 2) Skill node clicking
    if (thisgame.nodeMap && thisgame.nodeMap.size > 0) {
        const nodeMeshes = Array.from(thisgame.nodeMap.keys());
        const nodeHits = raycaster.intersectObjects(nodeMeshes, true);
        if (nodeHits.length > 0) {
            const mesh = nodeHits[0].object;
            const node = thisgame.nodeMap.get(mesh);
            if (node) {
                console.log('Clicked skillNode:', node.name);
                networkHandler?.sendNode?.(node.name);
                return;
            }
        }
    }

    // 3) NPC click
    const npcModels = Object.values(thisgame.npcs)
        .map((n) => n?.model)
        .filter((m) => m instanceof THREE.Object3D);
    const npcHits = raycaster.intersectObjects(npcModels, true);
    if (npcHits.length > 0) {
        const hitObj = npcHits[0].object;
        for (const id in thisgame.npcs) {
            const npc = thisgame.npcs[id];
            const mesh = npc?.model;
            if (!mesh) continue;

            const isThis =
                mesh === hitObj ||
                mesh.children.includes(hitObj) ||
                mesh.children.some((c) => c === hitObj);

            if (isThis) {
                console.log('NPC clicked:', id);
                networkHandler?.attackNpc?.(id);
                return;
            }
        }
    }

    // 4) Loot click
    const lootResult = thisgame.levelHandeler?.tryPickupLootFromRay?.(raycaster);
    if (lootResult) {
        networkHandler?.loot?.(lootResult.itemID);
        return;
    }

    // 5) Ground click → set movement target
    if (thisgame.ground) {
        const groundHit = raycaster.intersectObject(thisgame.ground);
        if (groundHit.length > 0) {
            const point = groundHit[0].point;
            const sockId = networkHandler?.getsocket?.()?.id;
            const player = sockId ? thisgame.players?.[sockId] : null;
            if (!sockId || !player) return;

            const isRightClick = event.button === 2;
            networkHandler?.sendTarget?.(point, isRightClick);
            console.log('Ground clicked:', point, isRightClick ? '(right)' : '(left)');
        }
    }
});

// Hover state + highlight helpers
let hoveredNPC = null;
let isOrbiting = false;

thisgame.controls.addEventListener('start', () => {
    isOrbiting = true;
});
thisgame.controls.addEventListener('end', () => {
    isOrbiting = false;
});

function applyHighlight(root) {
    if (!root) return;
    root.traverse((obj) => {
        if (obj.isMesh) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((mat) => {
                if (!mat || !('emissive' in mat)) return;

                if (!obj.userData._hoverBak) obj.userData._hoverBak = [];
                obj.userData._hoverBak.push({
                    mat,
                    color: mat.emissive.getHex(),
                    intensity: 'emissiveIntensity' in mat ? mat.emissiveIntensity : undefined
                });

                mat.emissive.setHex(0x333333);
                if ('emissiveIntensity' in mat) mat.emissiveIntensity = 1.25;
            });
        }
    });
}

function clearHighlight(root) {
    if (!root) return;
    root.traverse((obj) => {
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

// Helper: climb up from a hit child mesh to the owning NPC model
function findNPCModelFromHit(hitObj) {
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
