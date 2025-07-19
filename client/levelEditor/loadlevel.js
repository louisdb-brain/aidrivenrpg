import {GLTFLoader} from "three/addons/loaders/GLTFLoader";
import * as THREE from "three";
const placedObjects = [];
export function loadLevel(data,pScene) {


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