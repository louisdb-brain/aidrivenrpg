import * as THREE from "three";
import { iccColorPreloader } from './iccColorPreload.js';

const derivedTextureCache = new Map();
const placedObjects = [];
const SPRITE_SCALE_DIVISOR = 100;

// ---- Sun direction (WORLD space). Change if you like; only used at load-time.
let SUN_DIR = new THREE.Vector3(1, 2, 0).normalize();
export function setSunDirection(x, y, z) {
    SUN_DIR.set(x, y, z).normalize();
}

/**
 * Create (and cache) a black silhouette with vertical fade from an existing THREE.Texture.
 */
function getShadowTextureFor(texture) {
    if (derivedTextureCache.has(texture.uuid)) return derivedTextureCache.get(texture.uuid);

    const img = texture.image;
    if (!img) {
        console.warn("Shadow gen skipped; texture has no image:", texture);
        return texture;
    }

    const w = img.width || texture.imageWidth || texture.source?.data?.width;
    const h = img.height || texture.imageHeight || texture.source?.data?.height;
    if (!w || !h) {
        console.warn("Shadow gen skipped; no width/height:", texture);
        return texture;
    }

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');

    if (img instanceof HTMLImageElement || img instanceof HTMLCanvasElement || img instanceof ImageBitmap) {
        ctx.drawImage(img, 0, 0, w, h);
    } else if (img.data && img.data.length) {
        const imageData = new ImageData(
            img.data instanceof Uint8ClampedArray ? img.data : new Uint8ClampedArray(img.data),
            w, h
        );
        ctx.putImageData(imageData, 0, 0);
    } else {
        console.warn("Shadow gen skipped; unsupported image type:", img);
        return texture;
    }

    // Make black silhouette (keep alpha)
    const data = ctx.getImageData(0,0,w,h);
    const d = data.data;
    for (let i=0; i<d.length; i+=4){ d[i]=0; d[i+1]=0; d[i+2]=0; }
    ctx.putImageData(data,0,0);

    // Fade from top -> bottom
    const fade = ctx.createLinearGradient(0,0,0,h);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(1, "rgba(0,0,0,1)");
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = fade;
    ctx.fillRect(0,0,w,h);
    ctx.globalCompositeOperation = "source-over";

    const shadowTex = new THREE.CanvasTexture(canvas);
    shadowTex.needsUpdate = true;

    derivedTextureCache.set(texture.uuid, shadowTex);
    return shadowTex;
}

/**
 * Skew a ground-plane quad in the sun's projected direction.
 */
function buildSkewedShadowGeometry(srcPlaneGeometry, sunDir, shearAmount = 0.6) {
    const g = srcPlaneGeometry.clone();

    const rotToGround = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    g.applyMatrix4(rotToGround);

    const p = new THREE.Vector3(sunDir.x, 0, sunDir.z);
    if (p.lengthSq() < 1e-8) {
        g.computeBoundingBox(); g.computeBoundingSphere();
        return g;
    }
    p.normalize();
    const theta = Math.atan2(p.z, p.x);

    const Ralign = new THREE.Matrix4().makeRotationY(-theta);
    const Runalign = new THREE.Matrix4().makeRotationY(theta);

    const shear = new THREE.Matrix4().set(
        1, 0, shearAmount, 0,
        0, 1, 0,           0,
        0, 0, 1,           0,
        0, 0, 0,           1
    );

    const M = new THREE.Matrix4().multiplyMatrices(Runalign, shear).multiply(Ralign);
    g.applyMatrix4(M);

    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
}

/**
 * Place a vertical sprite + baked shadow and add it to the scene.
 * Returns a record with mesh, shadow, and scale info.
 */
export async function placeSprite({ name, texturePath, position, scene, sunDir = SUN_DIR, type = "sprite" }) {
    const texture = await iccColorPreloader.load(texturePath);
    texture.encoding = THREE.LinearEncoding;
    texture.flipY = true;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.needsUpdate = true;

    const img = texture.image;
    const planeW = img.width / SPRITE_SCALE_DIVISOR;
    const planeH = img.height / SPRITE_SCALE_DIVISOR;

    const geometry = new THREE.PlaneGeometry(planeW, planeH);

    // ---- Sprite mesh ----
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        toneMapped: false,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const spriteMesh = new THREE.Mesh(geometry, material);
    spriteMesh.position.set(position.x, position.y + planeH / 2, position.z);
    spriteMesh.userData.faceCamera = true;
    scene.add(spriteMesh);

    let shadowMesh = null;

    // ---- Only create shadow for actual sprites ----
    if (type === "sprite") {
        const shadowTex = getShadowTextureFor(texture);
        const shadowMat = new THREE.MeshBasicMaterial({
            map: shadowTex,
            transparent: true,
            opacity: 0.7,
            toneMapped: false,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const shadowGeo = buildSkewedShadowGeometry(geometry, sunDir, 0.6);
        shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
        // Compute projected offset based on sun direction
        const offsetX = -sunDir.x * (planeW * 0.5);
        const offsetZ = planeH/2;

        shadowMesh.position.set(
            position.x + offsetX,
            position.y - 0.1,
            position.z - offsetZ
        );


        scene.add(shadowMesh);
    }

    const record = {
        type,
        name,
        position,
        spriteScale: { w: planeW, h: planeH },
        mesh: spriteMesh,
        shadow: shadowMesh
    };
    placedObjects.push(record);
    return record;
}

export async function placeDecal({ name, texturePath, position, scene }) {
    try {
        const tex = await iccColorPreloader.load(texturePath);
        tex.encoding = THREE.LinearEncoding;
        tex.flipY = false;
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.needsUpdate = true;

        const img = tex.image;
        if (!img) {
            console.warn("Decal image not loaded:", texturePath);
            return null;
        }

        const planeW = img.width  / SPRITE_SCALE_DIVISOR;
        const planeH = img.height / SPRITE_SCALE_DIVISOR;

        const geo = new THREE.PlaneGeometry(planeW, planeH);
        const mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            toneMapped: false,
            depthWrite: false,
            side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geo, mat);
        // flat on ground, tiny lift to avoid z-fighting
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(position.x, 0.01, position.z);

        mesh.userData = { type: "decal", asset: name };

        scene.add(mesh);

        const record = {
            type: "decal",
            name,
            mesh,
            asset: name,
            position: { x: position.x, y: 0, z: position.z }
        };

        placedObjects.push(record);
        return record;
    } catch (err) {
        console.error("Failed to place decal:", texturePath, err);
        return null;
    }
}





/**
 * Load a level from a JSON-like array of object data.
 */
export async function loadLevel(data, pScene) {
    const newObjects = [];

    for (const objData of data) {
        if (objData.type === "sprite" && objData.name) {
            const record = await placeSprite({
                name: objData.name,
                texturePath: `/sprites/${objData.texture || objData.name}`,
                position: objData.position,
                scene: pScene
            });
            record.type = "sprite";
            record.asset = objData.texture || objData.name;
            newObjects.push(record);
        }
        else if (objData.type === "decal") {
            const record = await placeDecal({
                name: objData.name || objData.texture,
                texturePath: `/sprites/${objData.texture || objData.name}`,
                position: objData.position,
                scene: pScene
            });
            if (record) {
                record.type = "decal";
                record.asset = objData.texture || objData.name;
                newObjects.push(record);
            }
        }

    }

    placedObjects.push(...newObjects);
    return newObjects; // ✅ Return for the editor
}

export function clearLevel(scene) {
    for (const obj of placedObjects) {
        if (obj.mesh) {
            scene.remove(obj.mesh);
            obj.mesh.geometry?.dispose();
            obj.mesh.material?.dispose();
        }
        if (obj.shadow) {
            scene.remove(obj.shadow);
            obj.shadow.geometry?.dispose();
            obj.shadow.material?.dispose();
        }
    }
    placedObjects.length = 0;
    //renderer.clear();
}


/**
 * Make all sprite meshes face the given camera.
 */
export function faceAllToCamera(camera) {
    for (const obj of placedObjects) {
        if (obj.mesh && obj.mesh.lookAt) {
            obj.mesh.lookAt(camera.position);
        }
    }
}
