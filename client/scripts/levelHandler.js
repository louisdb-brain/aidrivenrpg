// LevelHandler.js

import * as THREE from 'three';
import {Loot} from './Loot.js';
import {clearLevel, loadLevel} from "../levelEditor/loadlevel";

// (Your Loot class - unchanged, can import it from another file)


function makeBillboard(mesh, mode = 'y') {
    const __tmpV = new THREE.Vector3();
    mesh.userData.billboardMode = mode;
    mesh.onBeforeRender = (renderer, scene, camera) => {
        if (mode === 'full') {
            mesh.quaternion.copy(camera.quaternion);
        } else {
            const pos = mesh.getWorldPosition(__tmpV);
            __tmpV.copy(camera.position);
            __tmpV.y = pos.y;
            mesh.lookAt(__tmpV);
        }
    };
}

export class levelHandler {
    constructor(scene, player,level,networkclient) {
        this.scene = scene;
        this.networkclient = networkclient;
        //this.networkHandler=networkhandler
        this.level=level;
        this.player = player; // Should be a THREE.Object3D or something with .position
        this.loots = new Map();     // id -> { loot, mesh }
        this.nextLootId = 1;
        this.PICKUP_RADIUS = 10;
        this.pickupDistance=0.7;
        this.lootSound = new Audio("sounds/lootsound.mp3");
    }
    setLevel(levelname) {
        fetch('/'+levelname+'.json')
            .then(res => res.json())
            .then(async data => {
                await clearLevel(this.scene);
                await loadLevel(data, this.scene);
            });
    }
    // Spawns loot, returns lootId
    spawnLoot(itemID, name, location, iconPath) {
        const loot = new Loot(itemID, name, location, iconPath);
        const lootId = itemID;


        const loader = new THREE.TextureLoader();
        loader.load(loot.iconPath, (texture) => {
            const imgW = texture.image.width;
            const imgH = texture.image.height;
            const planeW = 2 ;
            const planeH = 2;

            const geometry = new THREE.PlaneGeometry(planeW, planeH);
            const material = new THREE.MeshStandardMaterial({
                map: texture,
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide
            });

            const plane = new THREE.Mesh(geometry, material);
            plane.position.set(
                loot.location.x,
                loot.location.y + planeH / 2,
                loot.location.z
            );

            makeBillboard(plane, 'y');

            plane.userData.isLoot = true;
            plane.userData.lootRef = loot;
            plane.userData.lootId = lootId;

            this.scene.add(plane);
            this.loots.set(lootId, { loot, mesh: plane });
        });

        //return lootId;
    }
    attractLoot(player, radius = 3, speed = 6) {
        if (!player) return;

        const playerPos = player.position;

        for (const [id, lootObj] of this.loots.entries()) {
            const mesh = lootObj.mesh;
            if (!mesh) continue;

            const lootPos = mesh.position;
            const dist = lootPos.distanceTo(playerPos);

            if (dist < radius) {
                const direction = new THREE.Vector3().subVectors(playerPos, lootPos).normalize();
                lootPos.addScaledVector(direction, speed * 0.016); // delta-time approx

                // Auto-pickup if very close
                if (dist < this.pickupDistance) {
                    // Remove from map & scene
                    this.scene.remove(mesh);
                    mesh.geometry.dispose();
                    mesh.material.dispose();
                    this.loots.delete(id);

                    // Tell server you picked it up
                    this.networkclient.loot(id);
                    this.lootSound.play();
                    console.log("✅ Auto-picked loot:", lootObj.loot.name);
                }
            }
        }
    }


    // Call this from your click/pointer handler
    tryPickupLootFromRay(raycaster) {
        if(this.playerRef) {
            const lootMeshes = Array.from(this.loots.values()).map(o => o.mesh);
            const intersects = raycaster.intersectObjects(lootMeshes, true);

            if (intersects.length === 0) return false;

            const hit = intersects[0].object;
            const lootId = hit.userData.lootId;
            const lootObj = this.loots.get(String(lootId));


            if (!lootObj) return false;

            // Get player position (as THREE.Vector3)
            const playerPos = this.playerRef.position;
            const lootPos = new THREE.Vector3();
            hit.getWorldPosition(lootPos);

            const dist = lootPos.distanceTo(playerPos);

            if (dist <= this.PICKUP_RADIUS) {
                // Within range - pick up
                this.scene.remove(lootObj.mesh);
                lootObj.mesh.geometry.dispose();
                lootObj.mesh.material.dispose();
                this.loots.delete(lootId);

                // TODO: notify backend, update inventory, etc.
                console.log('Picked up loot:', lootObj.loot);

                return lootObj.loot;
            } else {
                // Optional: UI feedback ("move closer!")
                console.log('Too far to pick up.');
                return false;
            }
        }
    }
}
