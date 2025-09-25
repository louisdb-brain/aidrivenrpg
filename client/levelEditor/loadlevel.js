import * as THREE from "three";
import { iccColorPreloader } from './iccColorPreload.js';

const derivedTextureCache = new Map();
const placedObjects = [];
const SPRITE_SCALE_DIVISOR = 100;

// ---- Sun direction (WORLD space). Change this if you like; only used at load-time.
let SUN_DIR = new THREE.Vector3(1, 2, 0).normalize();
export function setSunDirection(x, y, z) {
    SUN_DIR.set(x, y, z).normalize();
}

/**
 * Create (and cache) a black silhouette with vertical fade from an existing THREE.Texture.
 * Works with HTMLImageElement, ImageBitmap, or raw {data,width,height}.
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
    // keep tone mapping off on materials; encoding can follow your renderer
    shadowTex.needsUpdate = true;

    derivedTextureCache.set(texture.uuid, shadowTex);
    return shadowTex;
}

/**
 * Skew a ground-plane quad in the sun's projected direction.
 * We bake BOTH: rotation-to-ground and in-plane shear into the GEOMETRY.
 *
 * Steps:
 * 1) Start with an XY-oriented PlaneGeometry (as you already have).
 * 2) Rotate geometry to ground (X Z) by -PI/2 around X.
 * 3) Align the sun's XZ projection to +X via a Y-rotation, apply shear (X by Z), rotate back.
 */
function buildSkewedShadowGeometry(srcPlaneGeometry, sunDir, shearAmount = 0.6) {
    const g = srcPlaneGeometry.clone();

    // 1) rotate plane (XY) to ground (XZ)
    const rotToGround = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    g.applyMatrix4(rotToGround);

    // 2) compute yaw to align sun's XZ proj with +X
    const p = new THREE.Vector3(sunDir.x, 0, sunDir.z);
    if (p.lengthSq() < 1e-8) {
        // sun straight up/down -> no skew needed
        g.computeBoundingBox(); g.computeBoundingSphere();
        return g;
    }
    p.normalize();
    const theta = Math.atan2(p.z, p.x); // yaw from +X to projected sun dir

    const Ralign = new THREE.Matrix4().makeRotationY(-theta);
    const Runalign = new THREE.Matrix4().makeRotationY(theta);

    // 3) shear along X by Z: x' = x + k * z
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
 * Offset the shadow on the floor so that it anchors at the sprite's base.
 * The sprite's mesh is placed with +planeH/2 in Y, so we push the shadow along -sunDir.xz * (planeH/2).
 */
function positionShadowUnderSprite(shadowMesh, spriteMesh, planeH, sunDir) {
    const halfH = planeH * 0.5;
    const offsetXZ = new THREE.Vector3(-sunDir.x, 0, -sunDir.z).multiplyScalar(halfH);

    shadowMesh.position.set(
        spriteMesh.position.x + offsetXZ.x,
        0.01, // just above floor
        spriteMesh.position.z + offsetXZ.z
    );
}

export async function loadLevel(data, pScene) {
    for (const objData of data) {

        if (objData.type === "sprite" && objData.name) {
            const texturePath = `/sprites/${objData.texture || objData.name}`;
            const texture = await iccColorPreloader.load(texturePath);

            // Keep your original choices; if your renderer is sRGB, consider sRGBEncoding instead.
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

            // ---- MAIN VERTICAL SPRITE ----
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                toneMapped: false,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            const spriteMesh = new THREE.Mesh(geometry, material);
            spriteMesh.position.set(
                objData.position.x,
                objData.position.y +planeH/2,
                objData.position.z
            );
            spriteMesh.userData.faceCamera = true;
            pScene.add(spriteMesh);

            // ---- FLOOR SHADOW (baked skew, no per-frame updates) ----
            const shadowTex = getShadowTextureFor(texture);
            const shadowMat = new THREE.MeshBasicMaterial({
                map: shadowTex,
                transparent: true,
                opacity: 0.7,            // tune as desired
                toneMapped: false,
                depthWrite: false,
                side: THREE.DoubleSide,
                //blending: THREE.MultiplyBlending
            });

            // Bake rotation-to-ground + skew into geometry
            const shadowGeo = buildSkewedShadowGeometry(geometry, SUN_DIR, /*shear*/ 0.6);
            const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
            shadowMesh.position.set(
                objData.position.x -planeW/2,
                0,                           // just above floor
                objData.position.z - planeH / 2 // move in +Z by half sprite height
            );

            pScene.add(shadowMesh);

            placedObjects.push({
                type: "facingMesh",
                name: objData.name,
                position: objData.position,
                spriteScale: { w: planeW, h: planeH },
                mesh: spriteMesh,
                shadow: shadowMesh
            });
        }

        else if (objData.type === 'decal') {
            const tex = new THREE.TextureLoader().load('/sprites/' + objData.texture);
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            tex.encoding = THREE.sRGBEncoding;
            tex.flipY = false;
            tex.needsUpdate = true;

            const geo = new THREE.PlaneGeometry(1, 1);
            const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
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

