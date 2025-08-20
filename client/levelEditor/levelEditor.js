import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';



const SPRITE_SCALE_DIVISOR = 100; // 100px = 1 world unit. Adjust for your game!

const placedObjects = [];
const scene = new THREE.Scene();
const localPlayerId = 0;


const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.update();



let selectedObject = null;
const transformControls = new TransformControls(camera, renderer.domElement);
console.log("TransformControls proto", Object.getPrototypeOf(transformControls));
console.log("THREE.Object3D proto", THREE.Object3D.prototype);
console.log("transformControls instanceof THREE.Object3D", transformControls instanceof THREE.Object3D);


scene.add(transformControls);
// Prevent orbit controls when using gizmo
transformControls.addEventListener('dragging-changed', function (event) {
    controls.enabled = !event.value;
});

const light = new THREE.HemisphereLight(0xffffff, 0x444444);
light.position.set(0, 200, 0);
scene.add(light);

const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x555555,
    side: THREE.DoubleSide,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.05;
scene.add(ground);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const selector = document.getElementById('modelSelector');

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return; // left click only

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Ignore TransformControls if currently dragging
    if (transformControls.dragging) return;

    // Try to select an object
    const clickableObjects = placedObjects.map(o => o.mesh).filter(obj => obj instanceof THREE.Object3D);
    const intersects = raycaster.intersectObjects(clickableObjects, false);

    if (intersects.length > 0) {
        selectObject(intersects[0].object);
        //ransformControls.setMode('translate'); // Only allow move, not rotate/scale
        transformControls.attach(intersects[0].object);

    } else {
        // Only place if you clicked the ground (optional: skip if selecting an object)
        const groundIntersect = raycaster.intersectObject(ground);
        if (groundIntersect.length > 0) {
            placeObject(groundIntersect[0].point);
            deselectObject();
        } else {
            deselectObject();
        }
    }
});
function selectObject(object) {
    deselectObject();
    selectedObject = object;
    transformControls.attach(selectedObject);
    selectedObject.material.emissive?.set(0x3333ff); // only for MeshStandard/Phong materials
}
function deselectObject() {
    if (selectedObject && selectedObject.material.emissive) {
        selectedObject.material.emissive.set(0x000000);
    }
    selectedObject = null;
    transformControls.detach();
}


document.getElementById('moveMode').onclick = () => transformControls.setMode('translate');
document.getElementById('rotateMode').onclick = () => transformControls.setMode('rotate');
document.getElementById('scaleMode').onclick = () => transformControls.setMode('scale');



window.addEventListener('contextmenu', (event) => {
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, false);

    if (intersects.length > 0) {
        const obj = intersects[0].object;
        if (obj === ground) return; // Don't remove ground

        scene.remove(obj);
        // Remove from placedObjects by matching position and type
        for (let i = 0; i < placedObjects.length; i++) {
            const po = placedObjects[i];
            if (
                (po.mesh === obj) ||
                (po.type === 'cube' && obj.position.equals(new THREE.Vector3(po.position.x, po.position.y, po.position.z))) ||
                (po.type === 'model' && obj.position.equals(new THREE.Vector3(po.position.x, po.position.y, po.position.z))) ||
                (po.type === 'sprite' && obj.position.equals(new THREE.Vector3(po.position.x, po.position.y + (po.spriteScale ? po.spriteScale.h / 2 : 0), po.position.z)))
            ) {
                placedObjects.splice(i, 1);
                break;
            }
        }
    }
});/*
window.addEventListener('keydown', (e) => {
    if (e.key === "Delete" && selectedObject) {
        scene.remove(selectedObject);
        // Remove from placedObjects array
        for (let i = 0; i < placedObjects.length; i++) {
            if (placedObjects[i].mesh === selectedObject) {
                placedObjects.splice(i, 1);
                break;
            }
        }
        deselectObject();
    }
});*/


function placeObject(position) {
    const value = selector.value;

    // Place GLB model
    if (value.endsWith('.glb')) {
        const loader = new GLTFLoader();
        loader.load('/models/' + value, function (gltf) {
            const model = gltf.scene;
            model.position.copy(position);
            scene.add(model);

            placedObjects.push({
                type: 'model',
                name: value,
                position: { x: position.x, y: position.y, z: position.z },
                mesh: model
            });
        });
    }
    // Place Sprite
    else if (value.endsWith('.png') || value.endsWith('.jpg') || value.endsWith('.jpeg')) {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load('/sprites/environment/' + value, (texture) => {
            const imgW = texture.image.width;
            const imgH = texture.image.height;
            const planeW = imgW / SPRITE_SCALE_DIVISOR;
            const planeH = imgH / SPRITE_SCALE_DIVISOR;

            const geometry = new THREE.PlaneGeometry(planeW, planeH);
            const material = new THREE.MeshStandardMaterial({
                map: texture,
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide
            });

            const plane = new THREE.Mesh(geometry, material);

            // Place with origin at bottom
            plane.position.copy(position);
            plane.position.y += planeH / 2;

            // Optionally rotate: for example, to make it vertical in world space
            // plane.rotation.y = Math.PI / 4; // Example: 45° around Y

            scene.add(plane);

            placedObjects.push({
                type: 'sprite',
                name: value,
                position: { x: position.x, y: position.y, z: position.z },
                spriteScale: { w: planeW, h: planeH },
                mesh: plane
            });
        });
    }


    // Place Cube
    else {
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ color: value })
        );
        cube.position.copy(position);
        scene.add(cube);

        placedObjects.push({
            type: 'cube',
            color: value,
            position: { x: position.x, y: position.y, z: position.z },
            mesh: cube
        });
    }
}

document.getElementById('savebutton').addEventListener('click', savemodels);

function savemodels() {
    const saveData = placedObjects.map(obj => {
        if (obj.type === 'cube') {
            return {
                type: 'cube',
                color: obj.color,
                position: obj.position
            };
        } else if (obj.type === 'model') {
            return {
                type: 'model',
                name: obj.name,
                position: obj.position
            };
        } else if (obj.type === 'sprite') {
            return {
                type: 'sprite',
                name: obj.name,
                position: obj.position
                // Optional: also save scale if you want custom size reload
                //, spriteScale: obj.spriteScale
            };
        }
    });

    const json = JSON.stringify(saveData, null, 2);
    download('levelData.json', json);
}

function download(filename, text) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

document.getElementById('loadbutton').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const data = JSON.parse(reader.result);
            loadLevel(data, scene);
        };
        reader.readAsText(file);
    };

    input.click();
});

export function loadLevel(data, pScene) {
    clearPlacedObjects();

    const loader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();

    data.forEach(objData => {
        // GLB Models
        if (objData.type === 'model' && objData.name && objData.name.endsWith('.glb')) {
            loader.load('/models/' + objData.name, gltf => {
                const model = gltf.scene;
                model.position.set(
                    objData.position.x,
                    objData.position.y,
                    objData.position.z
                );
                pScene.add(model);

                placedObjects.push({
                    type: 'model',
                    name: objData.name,
                    position: objData.position,
                    mesh: model
                });
            });
        }
        // Sprites
        else if (objData.type === 'sprite' && objData.name) {
            textureLoader.load('/sprites/environment/' + objData.name, (texture) => {
                const imgW = texture.image.width;
                const imgH = texture.image.height;
                const planeW = imgW / SPRITE_SCALE_DIVISOR;
                const planeH = imgH / SPRITE_SCALE_DIVISOR;

                const geometry = new THREE.PlaneGeometry(planeW, planeH);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });

                const plane = new THREE.Mesh(geometry, material);

                plane.position.set(
                    objData.position.x,
                    objData.position.y + planeH / 2,
                    objData.position.z
                );
                // Optionally rotate here too if desired
                // plane.rotation.y = ...;

                pScene.add(plane);

                placedObjects.push({
                    type: 'sprite',
                    name: objData.name,
                    position: objData.position,
                    spriteScale: { w: planeW, h: planeH },
                    mesh: plane
                });
            });
        }

        // Cubes
        else if (objData.type === 'cube') {
            const cube = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 1),
                new THREE.MeshStandardMaterial({ color: objData.color || '#ffffff' })
            );
            cube.position.set(
                objData.position.x,
                objData.position.y,
                objData.position.z
            );
            pScene.add(cube);

            placedObjects.push({
                type: 'cube',
                color: objData.color,
                position: objData.position,
                mesh: cube
            });
        }
    });
}

function clearPlacedObjects() {
    placedObjects.forEach(obj => {
        if (obj.mesh && obj.mesh.parent) {
            obj.mesh.parent.remove(obj.mesh);
        }
    });
    placedObjects.length = 0;
}
