import * as THREE from "three";
import { iccColorPreloader } from './iccColorPreload.js';

const placedObjects = [];
const SPRITE_SCALE_DIVISOR = 100;

/**
 * Wraps ICC preloader output and applies sRGB encoding + orientation fixes.
 */
async function loadSpriteMaterial(path) {
    const texture = await iccColorPreloader.load(path);

    // ✅ Apply proper encoding and orientation
    texture.encoding = THREE.LinearEncoding;
    texture.flipY = true;                 // Prevent upside-down sprites (try true if still flipped)
    texture.needsUpdate = true;

    return new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        toneMapped: false // Keep tone mapping off for exact PNG colors
    });
}

export async function loadLevel(data, pScene) {
    for (const objData of data) {
        if (objData.type === "sprite" && objData.name) {
            const texturePath = `/sprites/${objData.texture || objData.name}`;
            const texture = await iccColorPreloader.load(texturePath);

            texture.encoding = THREE.LinearEncoding;
            texture.flipY = true;
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.needsUpdate = true;

            const img = texture.image;
            const imgW = img.width;
            const imgH = img.height;
            const planeW = imgW / SPRITE_SCALE_DIVISOR;
            const planeH = imgH / SPRITE_SCALE_DIVISOR;

            const geometry = new THREE.PlaneGeometry(planeW, planeH);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                toneMapped: false,
                depthWrite: false // Optional: no z-fighting
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(
                objData.position.x,
                objData.position.y + planeH / 2,
                objData.position.z
            );

            // Add tag for later camera-facing
            mesh.userData.faceCamera = true;

            pScene.add(mesh);

            placedObjects.push({
                type: "facingMesh",
                name: objData.name,
                position: objData.position,
                spriteScale: { w: planeW, h: planeH },
                mesh: mesh
            });
        }


     else if (objData.type === 'decal') {
            const tex = new THREE.TextureLoader().load('/sprites/' + objData.texture);
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            tex.encoding = THREE.sRGBEncoding; // Also mark decals as sRGB
            tex.flipY = false;
            tex.needsUpdate = true;

            const geo = new THREE.PlaneGeometry(1, 1);
            const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
            const decal = new THREE.Mesh(geo, mat);
            decal.position.set(objData.position.x, objData.position.y, objData.position.z);
            pScene.add(decal);
            placedObjects.push({ type: 'decal', name: objData.texture, mesh: decal });
        }
    }

}
export function faceAllToCamera(camera) {
    for (const obj of placedObjects) {
        if (obj.mesh && obj.mesh.lookAt) {
            obj.mesh.lookAt(camera.position);
        }
    }
}

