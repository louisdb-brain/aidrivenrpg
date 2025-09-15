import * as THREE from 'three';
import {loadLevel} from "./loadlevel.js";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/* ---------- DOM ---------- */
const viewport       = document.getElementById('viewport');
const toggleCamBtn   = document.getElementById('toggleCam');
const spriteModeBtn  = document.getElementById('spriteModeBtn');
const modelSelector  = document.getElementById('modelSelector');
const contextMenu    = document.getElementById('contextMenu');

const nameInput      = document.getElementById('spriteName');
const posXInput      = document.getElementById('posX');
const posYInput      = document.getElementById('posY');
const posZInput      = document.getElementById('posZ');
const sliderX        = document.getElementById('sliderX');
const sliderY        = document.getElementById('sliderY');
const sliderZ        = document.getElementById('sliderZ');
const entityTypeSel  = document.getElementById('entityType');
const updateBtn      = document.getElementById('updateBtn');

const saveBtn        = document.getElementById('savebutton');
const loadBtn        = document.getElementById('loadbutton');
const loadInput      = document.getElementById('loadInput');

/* ---------- Renderer/Scene ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1f1f1f);

/* ---------- Cameras ---------- */
const perspCam = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
perspCam.position.set(6, 6, 8);

const FRUSTUM_SIZE = 20;
const orthoCam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 2000);
orthoCam.position.set(10, 10, 10);
orthoCam.lookAt(0, 0, 0);

let activeCamera = perspCam;

/* ---------- Controls ---------- */
const controls = new OrbitControls(activeCamera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

const transformControls = new TransformControls(activeCamera, renderer.domElement);
scene.add(transformControls);
transformControls.addEventListener('dragging-changed', e => controls.enabled = !e.value);

/* ---------- Lights / Ground / Helpers ---------- */
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(4, 10, 6);
scene.add(dirLight);

const grid = new THREE.GridHelper(200, 200, 0x444444, 0x2a2a2a);
grid.position.y = -1;
scene.add(grid);

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.MeshStandardMaterial({ color: 0x555555, side: THREE.DoubleSide })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.0;
ground.name = 'Ground';
scene.add(ground);

/* ---------- Raycasting ---------- */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
function setPointerFromEvent(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

/* ---------- Placement Mode (Decal/Billboard) ---------- */
let placementMode = 'decal'; // 'decal' | 'billboard'
function togglePlacementMode() {
    placementMode = (placementMode === 'decal') ? 'billboard' : 'decal';
    spriteModeBtn.textContent = `Mode: ${placementMode === 'decal' ? 'Decal' : 'Billboard'}`;
}
spriteModeBtn.addEventListener('click', togglePlacementMode);

/* ---------- Placed Objects Registry ---------- */
/*
  Entry shape:
  {
    id, type: 'sprite',
    asset: 'assets/...png',
    name: 'Spaceship',
    spriteMode: 'decal'|'billboard',
    entityType: 'billboard'|'npc'|'skill'|'drop',
    mesh: THREE.Mesh
  }
*/
const placed = [];
let selectedEntry = null;

/* ---------- Utilities ---------- */
const textureLoader = new THREE.TextureLoader();

function makeBillboard(mesh) {
    mesh.userData.billboard = true;
    // Face camera around Y only
    mesh.onBeforeRender = (r, s, cam) => {
        const toCam = new THREE.Vector3().subVectors(cam.position, mesh.position);
        toCam.y = 0;
        if (toCam.lengthSq() > 1e-6) {
            toCam.normalize();
            // Default plane faces +Z; rotate +Z to face toCam
            const quat = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, 1), toCam
            );
            mesh.quaternion.copy(quat);
        }
    };
}
function clearBillboard(mesh) {
    mesh.userData.billboard = false;
    mesh.onBeforeRender = null;
}

function createSpriteMesh(asset, mode, atPosition) {
    return new Promise((resolve, reject) => {
        textureLoader.load(
            asset,
            (tex) => {
                const imgW = tex.image?.width || 100;
                const imgH = tex.image?.height || 100;
                const worldW = imgW / 100; // 100px = 1 world unit (adjust if you like)
                const worldH = imgH / 100;

                const geo = new THREE.PlaneGeometry(worldW, worldH);
                const mat = new THREE.MeshStandardMaterial({
                    map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide
                });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.name = 'Sprite';
                mesh.position.copy(atPosition);

                if (mode === 'decal') {
                    // lay flat on the ground, centered at hit
                    mesh.rotation.x = -Math.PI / 2;
                    // keep slightly above ground to avoid z-fighting
                    mesh.position.y = ground.position.y + 0.001;
                } else {
                    // upright billboard: raise so bottom touches ground
                    mesh.position.y += worldH / 2;
                    makeBillboard(mesh);
                }

                resolve({ mesh, size: { w: worldW, h: worldH } });
            },
            undefined,
            (err) => reject(err)
        );
    });
}

function getEntryByMesh(mesh) {
    return placed.find(p => p.mesh === mesh);
}
function findEntryFromHit(object) {
    let o = object;
    while (o && !getEntryByMesh(o) && o.parent) o = o.parent;
    return getEntryByMesh(o || object);
}

function selectEntry(entry) {
    deselect();
    if (!entry) return;
    selectedEntry = entry;

    // highlight if possible
    const m = entry.mesh;
    if (m.material?.emissive) m.material.emissive.setHex(0x3333ff);

    transformControls.attach(m);
    // open & populate context
    contextMenu.style.display = 'block';
    nameInput.value = entry.name || 'Unnamed';
    posXInput.value = m.position.x.toFixed(2);
    posYInput.value = m.position.y.toFixed(2);
    posZInput.value = m.position.z.toFixed(2);
    sliderX.value = m.position.x;
    sliderY.value = m.position.y;
    sliderZ.value = m.position.z;
    entityTypeSel.value = entry.entityType || 'billboard';
}
function deselect() {
    if (selectedEntry?.mesh?.material?.emissive) {
        selectedEntry.mesh.material.emissive.setHex(0x000000);
    }
    transformControls.detach();
    selectedEntry = null;
    // Keep context visible; you can hide if preferred
}

/* ---------- Place New ---------- */
async function placeSprite(atPoint) {
    // Prepend the public path so Vite serves it correctly
    const asset = "/sprites/" + modelSelector.value;
    try {
        const { mesh } = await createSpriteMesh(asset, placementMode, atPoint);
        scene.add(mesh);
        const entry = {
            id: mesh.uuid,
            type: 'sprite',
            name: modelSelector.value,
            spriteMode: placementMode,      // decal or billboard
            entityType: 'billboard',        // default; editable in panel
            mesh
        };
        placed.push(entry);
        selectEntry(entry);
    } catch (e) {
        console.error('Sprite load error:', e);
    }
}

/* ---------- Delete ---------- */
function deleteEntry(entry) {
    if (!entry) return;
    if (entry.mesh?.parent) entry.mesh.parent.remove(entry.mesh);
    const i = placed.indexOf(entry);
    if (i > -1) placed.splice(i, 1);
    if (selectedEntry === entry) deselect();
}

/* ---------- Click vs Drag ---------- */
let clickStart = { x: 0, y: 0 };
let dragging = false;
const CLICK_THRESHOLD = 6;

renderer.domElement.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    clickStart = { x: e.clientX, y: e.clientY };
    dragging = false;
});
renderer.domElement.addEventListener('pointermove', e => {
    if (e.buttons !== 1) return;
    const dx = e.clientX - clickStart.x;
    const dy = e.clientY - clickStart.y;
    if (Math.sqrt(dx * dx + dy * dy) > CLICK_THRESHOLD) dragging = true;
});

/* ---------- Pointer Up (select/place) ---------- */
renderer.domElement.addEventListener('pointerup', async e => {
    if (e.button !== 0 || dragging || transformControls.dragging) return;

    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, activeCamera);

    // Try selecting existing
    const meshes = placed.map(p => p.mesh).filter(Boolean);
    const hits = raycaster.intersectObjects(meshes, true);
    if (hits.length) {
        const entry = findEntryFromHit(hits[0].object);
        selectEntry(entry);
        return;
    }

    // Otherwise, try placing on ground
    const groundHit = raycaster.intersectObject(ground, false);
    if (groundHit.length) {
        await placeSprite(groundHit[0].point);
    } else {
        deselect();
    }
});

/* ---------- Right-Click Delete ---------- */
renderer.domElement.addEventListener('contextmenu', e => {
    e.preventDefault();
    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, activeCamera);

    const meshes = placed.map(p => p.mesh).filter(Boolean);
    const hits = raycaster.intersectObjects(meshes, true);
    if (hits.length) {
        const entry = findEntryFromHit(hits[0].object);
        deleteEntry(entry);
    }
});

/* ---------- Transform -> update context fields ---------- */
transformControls.addEventListener('objectChange', () => {
    if (!selectedEntry) return;
    const p = selectedEntry.mesh.position;
    posXInput.value = p.x.toFixed(2);
    posYInput.value = p.y.toFixed(2);
    posZInput.value = p.z.toFixed(2);
    sliderX.value = p.x;
    sliderY.value = p.y;
    sliderZ.value = p.z;
});

/* ---------- Update Button ---------- */
updateBtn.addEventListener('click', () => {
    if (!selectedEntry) return;
    const m = selectedEntry.mesh;
    const x = parseFloat(posXInput.value) || 0;
    const y = parseFloat(posYInput.value) || 0;
    const z = parseFloat(posZInput.value) || 0;
    m.position.set(x, y, z);

    selectedEntry.name = nameInput.value || selectedEntry.name;
    m.name = selectedEntry.name;
    selectedEntry.entityType = entityTypeSel.value;

    // sync sliders in case numbers were typed
    sliderX.value = x;
    sliderY.value = y;
    sliderZ.value = z;
});

/* ---------- Sync sliders & inputs ---------- */
function bindSlider(input, slider) {
    input.addEventListener('input', () => { slider.value = input.value; });
    slider.addEventListener('input', () => { input.value = slider.value; });
}
bindSlider(posXInput, sliderX);
bindSlider(posYInput, sliderY);
bindSlider(posZInput, sliderZ);

/* ---------- Save / Load ---------- */
function serializeEntry(e) {
    const t = e.mesh;
    return {
        id: e.id,
        type: e.type,
        asset: e.asset,
        name: e.name,
        spriteMode: e.spriteMode,
        entityType: e.entityType,
        transform: {
            position: t.position.toArray(),
            rotation: [t.rotation.x, t.rotation.y, t.rotation.z, t.rotation.order],
            scale: t.scale.toArray()
        }
    };
}

saveBtn.addEventListener('click', () => {
    const data = placed.map(serializeEntry);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'levelData.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

loadBtn.addEventListener('click', () => loadInput.click());
loadInput.addEventListener('change', () => {
    const file = loadInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const data = JSON.parse(reader.result);
            await loadLevel(data);
        } catch (err) {
            console.error('Invalid level JSON:', err);
        }
    };
    reader.readAsText(file);
});

/* Clear all placed */
function clearPlaced() {
    placed.forEach(e => e.mesh?.parent?.remove(e.mesh));
    placed.length = 0;
    deselect();
}


/* ---------- Camera Toggle ---------- */
toggleCamBtn.addEventListener('click', () => {
    activeCamera = activeCamera === perspCam ? orthoCam : perspCam;
    controls.object = activeCamera;
    transformControls.camera = activeCamera;

    // Disable rotation in orthographic
    controls.enableRotate = activeCamera !== orthoCam;
});

/* ---------- Resize ---------- */
function resize() {
    const w = Math.max(1, viewport.clientWidth || viewport.offsetWidth || 300);
    const h = Math.max(1, viewport.clientHeight || viewport.offsetHeight || 150);
    renderer.setSize(w, h, false);

    // Perspective
    perspCam.aspect = w / h;
    perspCam.updateProjectionMatrix();

    // Ortho with frustum tied to aspect
    const aspect = w / h;
    orthoCam.left   = (-FRUSTUM_SIZE * aspect) / 2;
    orthoCam.right  = ( FRUSTUM_SIZE * aspect) / 2;
    orthoCam.top    =  FRUSTUM_SIZE / 2;
    orthoCam.bottom = -FRUSTUM_SIZE / 2;
    orthoCam.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ---------- Animate ---------- */
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, activeCamera);
}
animate();
