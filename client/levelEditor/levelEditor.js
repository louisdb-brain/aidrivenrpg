import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const placedObjects=[];
const scene = new THREE.Scene();
const localPlayerId=0;
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0); // optional: focus on character height
controls.update();


const light = new THREE.HemisphereLight(0xffffff, 0x444444);
light.position.set(0, 200, 0);
scene.add(light);

const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x555555,
    side: THREE.DoubleSide,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotate to face up
ground.position.y = -1.05;
scene.add(ground);

function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Keeps OrbitControls responsive
    renderer.render(scene, camera);
}
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const selector = document.getElementById('modelSelector');
window.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return; // Only left-click (button 0)

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(ground);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        placeObject(point,scene);
    }
});
window.addEventListener('contextmenu', (event) => {
    event.preventDefault(); // Prevent default browser right-click menu

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(placedObjects, false); // Only check placed objects

    if (intersects.length > 0) {
        const obj = intersects[0].object;

        // Safety check: Ignore ground, even if accidentally included
        if (obj === ground) {
            console.log('Cannot remove ground plane.');
            return;
        }

        scene.remove(obj);

        const index = placedObjects.indexOf(obj);
        if (index > -1) {
            placedObjects.splice(index, 1);
        }

        console.log('Object removed.');
    }
});
/*
function placeCube(position) {
    const color = selector.value;
    if (value.endsWith('.glb')) {
        const loader = new THREE.GLTFLoader();

        loader.load(value, function (gltf) {
            const model = gltf.scene;
            model.position.copy(position);
            scene.add(model);
        }


            const cube = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color })
    );

    cube.position.copy(position);
    scene.add(cube);
    placedObjects.push(cube);
}*/
function placeObject(position) {
    const value = selector.value;
    const pathname='/models/house.glb';
    //CHECK FOR .GLB MODELS
    if (value.endsWith('.glb')) {
        const loader = new GLTFLoader();
        console.log("Trying to load:", pathname);
        console.log(pathname);
        loader.load(pathname, function (gltf) {
            const model = gltf.scene;
            model.position.copy(position);
            scene.add(model);

            placedObjects.push({
                type: 'model',
                name: value, // glb file name or path
                position: {
                    x: position.x,
                    y: position.y,
                    z: position.z
                }
            });
        });
    }
    else {
        // You can ignore this part if you want to load models  .glb
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ color: value })
        );
        cube.position.copy(position);
        scene.add(cube);

        // Optional: Save cube info too
        placedObjects.push({
            type: 'cube',
            color: value,
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            }
        });
    }
}


document.getElementById('savebutton').addEventListener('click', savemodels)

function savemodels()
{
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
            loadLevel(data,scene);
        };
        reader.readAsText(file);
    };

    input.click();
});
export function loadLevel(data,pScene) {
    clearPlacedObjects();

    const loader = new GLTFLoader();

    data.forEach(objData => {
        if(objData.type==='npc'&& objData.name && objData.name.endsWith('.glb')){
            //LOAD NPCS TROUGH THIS
        }
        // Handle GLB models
        if (objData.type === 'model' && objData.name && objData.name.endsWith('.glb')) {
            const pathname="models/"+objData.name;
            loader.load(pathname, gltf => {
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
                    position: objData.position
                });
            }, undefined, error => {
                console.error('Failed to load model:', objData.name, error);
            });
        }

        // Handle cubes
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
                position: objData.position
            });
        }
    });
}
function clearPlacedObjects() {
    placedObjects.forEach(obj => {
        scene.remove(obj);
    });
    placedObjects.length = 0; // Clear the array
}

animate();