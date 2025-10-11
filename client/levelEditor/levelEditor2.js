// levelEditor2.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/* ---------- DOM ---------- */
const viewport       = document.getElementById('viewport');
const toggleCamBtn   = document.getElementById('toggleCam');
const spriteModeBtn  = document.getElementById('spriteModeBtn');
const modelSelector  = document.getElementById('modelSelector');
const undoBtn        = document.getElementById('undoBtn');
const saveBtn        = document.getElementById('savebutton');
const loadBtn        = document.getElementById('loadbutton');
const loadInput      = document.getElementById('loadInput');

const nameInput      = document.getElementById('spriteName');
const posXInput      = document.getElementById('posX');
const posYInput      = document.getElementById('posY');
const posZInput      = document.getElementById('posZ');
const sliderX        = document.getElementById('sliderX');
const sliderY        = document.getElementById('sliderY');
const sliderZ        = document.getElementById('sliderZ');
const entityTypeSel  = document.getElementById('entityType');
const lockCheckbox   = document.getElementById('lockCheckbox');
const updateBtn      = document.getElementById('updateBtn');
const contextMenu    = document.getElementById('contextMenu');

/* ---------- Scene ---------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const renderer = new THREE.WebGLRenderer({ antialias: true });
viewport.appendChild(renderer.domElement);

/* ---------- Cameras ---------- */
const perspCam = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
perspCam.position.set(20, 30, 20);
perspCam.lookAt(0, 0, 0);

const orthoCam = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 2000);
orthoCam.position.set(20, 30, 20);
orthoCam.lookAt(0, 0, 0);

let activeCamera = perspCam;
const controls = new OrbitControls(activeCamera, renderer.domElement);
controls.enableDamping = true;

/* ---------- Lights ---------- */
scene.add(new THREE.AmbientLight(0x555555));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

/* ---------- Ground + Grid ---------- */
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000),
    new THREE.MeshStandardMaterial({ color: 0x222222, opacity: 0, transparent: true })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const grid = new THREE.GridHelper(1000, 200, 0x666666, 0x333333);
scene.add(grid);

/* ---------- State ---------- */
let placementMode = 'decal';
let isPlacing = false;
let ghostMesh = null;
let placed = [];
let selectedEntry = null;
let undoStack = [];
let highlightMesh = null;

/* ---------- Helpers ---------- */
const textureLoader = new THREE.TextureLoader();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function setPointerFromEvent(e) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
}

function resolveSpritePath(asset) {
    if (!asset) return null;
    return asset.startsWith('sprites/') ? `/${asset}` : `/sprites/${asset}`;
}

function createSpriteMesh(asset, mode, atPoint) {
    return new Promise((resolve, reject) => {
        const path = resolveSpritePath(asset);
        if (!path) return reject(new Error('No sprite selected'));

        textureLoader.load(
            path,
            (tex) => {
                const imgW = tex.image.width || 100;
                const imgH = tex.image.height || 100;
                const worldW = imgW / 100;
                const worldH = imgH / 100;

                const geo = new THREE.PlaneGeometry(worldW, worldH);
                const mat = new THREE.MeshStandardMaterial({
                    map: tex,
                    transparent: true,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });

                const mesh = new THREE.Mesh(geo, mat);
                mesh.name = 'Sprite';
                mesh.position.copy(atPoint);

                if (mode === 'decal') {
                    mesh.rotation.x = -Math.PI / 2;
                    mesh.position.y = 0.01;
                } else {
                    mesh.position.y = worldH / 2;
                }

                resolve({ mesh, worldH });
            },
            undefined,
            (err) => reject(err)
        );
    });
}

async function placeObject(atPoint) {
    const { mesh } = await createSpriteMesh(modelSelector.value, placementMode, atPoint);
    scene.add(mesh);
    const entry = {
        id: mesh.uuid,
        mesh,
        name: modelSelector.value,
        asset: modelSelector.value,
        entityType: placementMode === 'billboard' ? 'billboard' : 'decal',
        locked: !!lockCheckbox.checked
    };
    placed.push(entry);
    return entry;
}

/* ---------- Selection ---------- */
function selectEntry(entry) {
    deselect();
    if (!entry) return;
    selectedEntry = entry;
    contextMenu.style.display = 'block';
    nameInput.value = entry.name || '';
    entityTypeSel.value = entry.entityType || 'billboard';
    lockCheckbox.checked = !!entry.locked;
    syncUIToSelection();

    // highlight mesh
    if (highlightMesh) scene.remove(highlightMesh);
    const size = new THREE.Box3().setFromObject(entry.mesh).getSize(new THREE.Vector3());
    const geo = new THREE.BoxGeometry(size.x * 1.15, size.y * 1.15, 0.01);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.5 });
    highlightMesh = new THREE.Mesh(geo, mat);
    highlightMesh.position.copy(entry.mesh.position);
    highlightMesh.rotation.copy(entry.mesh.rotation);
    scene.add(highlightMesh);
}

function deselect() {
    selectedEntry = null;
    contextMenu.style.display = 'none';
    if (highlightMesh) {
        scene.remove(highlightMesh);
        highlightMesh = null;
    }
}

function syncUIToSelection() {
    if (!selectedEntry) return;
    const p = selectedEntry.mesh.position;
    posXInput.value = p.x.toFixed(2);
    posYInput.value = p.y.toFixed(2);
    posZInput.value = p.z.toFixed(2);
    sliderX.value = p.x;
    sliderY.value = p.y;
    sliderZ.value = p.z;
}

/* ---------- Undo ---------- */
function pushUndo(entry) { undoStack.push(entry); }
function undoLast() {
    const last = undoStack.pop();
    if (!last) return;
    scene.remove(last.mesh);
    placed = placed.filter(e => e !== last);
    if (selectedEntry === last) deselect();
}

/* ---------- Events ---------- */
renderer.domElement.addEventListener('pointerdown', async (e) => {
    if (e.button !== 0) return;
    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, activeCamera);

    const hits = raycaster.intersectObjects(placed.map(p => p.mesh), true);
    if (hits.length) {
        const hitMesh = hits[0].object;
        const entry = placed.find(p => p.mesh === hitMesh || p.mesh === hitMesh.parent);
        if (entry) return selectEntry(entry);
    }

    const groundHit = raycaster.intersectObject(ground, false);
    if (!groundHit.length || isPlacing) return;

    isPlacing = true;
    const { mesh } = await createSpriteMesh(modelSelector.value, placementMode, groundHit[0].point);
    mesh.material.opacity = 0.4;
    ghostMesh = mesh;
    scene.add(ghostMesh);
});

renderer.domElement.addEventListener('pointermove', (e) => {
    if (!ghostMesh) return;
    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, activeCamera);
    const hit = raycaster.intersectObject(ground, false);
    if (hit.length) {
        ghostMesh.position.x = hit[0].point.x;
        ghostMesh.position.z = hit[0].point.z;
    }
});

renderer.domElement.addEventListener('pointerup', async (e) => {
    if (e.button !== 0) return;
    if (ghostMesh) {
        const finalPos = ghostMesh.position.clone();
        scene.remove(ghostMesh);
        ghostMesh.geometry.dispose();
        ghostMesh.material.dispose();
        ghostMesh = null;

        const entry = await placeObject(finalPos);
        if (entry) {
            pushUndo(entry);
            selectEntry(entry);
        }
        isPlacing = false;
    }
});

renderer.domElement.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, activeCamera);
    const hits = raycaster.intersectObjects(placed.map(p => p.mesh), true);
    if (hits.length) {
        const hitMesh = hits[0].object;
        const entry = placed.find(p => p.mesh === hitMesh || p.mesh === hitMesh.parent);
        if (entry) {
            scene.remove(entry.mesh);
            placed = placed.filter(e => e !== entry);
            if (selectedEntry === entry) deselect();
        }
    }
});

/* ---------- Live sliders ---------- */
function bindSliderAndInput(slider, input, axis) {
    slider.addEventListener('input', () => {
        if (!selectedEntry || selectedEntry.locked) return;
        const v = parseFloat(slider.value);
        selectedEntry.mesh.position[axis] = v;
        input.value = v.toFixed(2);
        if (highlightMesh) highlightMesh.position.copy(selectedEntry.mesh.position);
    });
    input.addEventListener('input', () => {
        if (!selectedEntry || selectedEntry.locked) return;
        const v = parseFloat(input.value);
        selectedEntry.mesh.position[axis] = v;
        slider.value = v;
        if (highlightMesh) highlightMesh.position.copy(selectedEntry.mesh.position);
    });
}
bindSliderAndInput(sliderX, posXInput, 'x');
bindSliderAndInput(sliderY, posYInput, 'y');
bindSliderAndInput(sliderZ, posZInput, 'z');

/* ---------- Buttons ---------- */
updateBtn.addEventListener('click', () => {
    if (!selectedEntry) return;
    selectedEntry.name = nameInput.value;
    selectedEntry.entityType = entityTypeSel.value;
    selectedEntry.locked = lockCheckbox.checked;
});
undoBtn.addEventListener('click', undoLast);

toggleCamBtn.addEventListener('click', () => {
    activeCamera = (activeCamera === perspCam) ? orthoCam : perspCam;
    controls.object = activeCamera;
});

spriteModeBtn.addEventListener('click', () => {
    placementMode = placementMode === 'decal' ? 'billboard' : 'decal';
    spriteModeBtn.textContent = `Mode: ${placementMode.charAt(0).toUpperCase() + placementMode.slice(1)}`;
});
spriteModeBtn.textContent = `Mode: ${placementMode.charAt(0).toUpperCase() + placementMode.slice(1)}`;

/* ---------- Save & Load ---------- */
saveBtn.addEventListener('click', () => {
    const data = placed.map(p => ({
        type: p.entityType === 'billboard' ? 'sprite' : 'decal',
        name: p.name || p.asset,
        texture: p.asset,
        position: {
            x: p.mesh.position.x,
            y: p.mesh.position.y,
            z: p.mesh.position.z
        }
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'level.json';
    a.click();
    URL.revokeObjectURL(a.href);
});

loadBtn.addEventListener('click', () => loadInput.click());
loadInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async evt => {
        const json = JSON.parse(evt.target.result);
        for (const item of json) {
            const pos = new THREE.Vector3(item.position.x, item.position.y, item.position.z);
            const entry = await placeObject(pos);
            entry.name = item.name;
            entry.entityType = item.type === 'sprite' ? 'billboard' : 'decal';
        }
    };
    reader.readAsText(file);
});

/* ---------- Animation + Resize ---------- */
function animate() {
    requestAnimationFrame(animate);

    // Pulse highlight
    if (highlightMesh) {
        highlightMesh.material.opacity = 0.4 + Math.sin(Date.now() * 0.005) * 0.15;
    }

    controls.update();
    renderer.render(scene, activeCamera);
}
animate();

function resize() {
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    perspCam.aspect = w / h;
    perspCam.updateProjectionMatrix();
    const scale = 25;
    orthoCam.left = -w / scale;
    orthoCam.right = w / scale;
    orthoCam.top = h / scale;
    orthoCam.bottom = -h / scale;
    orthoCam.updateProjectionMatrix();
    renderer.setSize(w, h, false);
}
window.addEventListener('resize', resize);
resize();

console.log('✅ Level editor ready with highlight + save/load + live sliders');
