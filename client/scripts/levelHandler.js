// LevelHandler.js

import * as THREE from 'three';
import {Loot} from './Loot.js';

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
    constructor(scene, playerRef) {
        this.scene = scene;
        this.playerRef = playerRef; // Should be a THREE.Object3D or something with .position
        this.loots = new Map();     // id -> { loot, mesh }
        this.nextLootId = 1;
        this.PICKUP_RADIUS = 10;
    }

    // Spawns loot, returns lootId
    spawnLoot(itemID, name, location, iconPath) {
        const loot = new Loot(itemID, name, location, iconPath);
        const lootId = itemID;


        const loader = new THREE.TextureLoader();
        loader.load(loot.iconPath, (texture) => {
            const imgW = texture.image.width;
            const imgH = texture.image.height;
            const planeW = imgW / loot.scaleDivisor;
            const planeH = imgH / loot.scaleDivisor;

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
