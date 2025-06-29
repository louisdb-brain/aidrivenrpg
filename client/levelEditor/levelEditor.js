import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';

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
        placeCube(point);
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

function placeCube(position) {
    const color = selector.value;

    const cube = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color })
    );

    cube.position.copy(position);
    scene.add(cube);
    placedObjects.push(cube);
}

document.getElementById('savebutton').addEventListener('click',savemodels)
function savemodels()
{
    const saveData = placedObjects.map(obj => ({
        color: obj.material.color.getStyle(),
        position: { x: obj.position.x, y: obj.position.y, z: obj.position.z }
    }));
    const json=JSON.stringify(saveData, null,2);
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
            loadLevel(data);
        };
        reader.readAsText(file);
    };

    input.click();
});
function loadLevel(data) {
    clearPlacedObjects()
    data.forEach(objData => {
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ color: objData.color })
        );

        cube.position.set(objData.position.x, objData.position.y, objData.position.z);
        scene.add(cube);
        placedObjects.push(cube);
    });

    console.log('Loaded', data.length, 'objects.');
}
function clearPlacedObjects() {
    placedObjects.forEach(obj => {
        scene.remove(obj);
    });
    placedObjects.length = 0; // Clear the array
}

animate();