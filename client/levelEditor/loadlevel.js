import {GLTFLoader} from "three/addons/loaders/GLTFLoader";
import * as THREE from "three";

const placedObjects = [];

export function loadLevel(data, pScene) {
    const loader = new GLTFLoader();
    const SPRITE_SCALE_DIVISOR = 100;

    const textureLoader = new THREE.TextureLoader();

    data.forEach(objData => {
        // Load GLB NPC
        if (objData.type === 'npc' && objData.name && objData.name.endsWith('.glb')) {
            // TODO: Load NPC .glb logic here
        }

        // Load GLB model
        if (objData.type === 'model' && objData.name && objData.name.endsWith('.glb')) {
            const pathname = "models/" + objData.name;
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
        else if (objData.type === 'sprite' && objData.name) {
            textureLoader.load('/sprites/environment/' + objData.name, (texture) => {
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


        // Cube
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

        // NEW: Sprite
        else if (objData.type === 'sprite' && objData.texture) {
            const texture = textureLoader.load("sprites/environment/" + objData.texture);

            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthWrite: false, // helps with blending
                sizeAttenuation: true // scale based on distance
            });

            const sprite = new THREE.Sprite(material);

            sprite.position.set(
                objData.position.x,
                objData.position.y,
                objData.position.z
            );

            // Optional scale
            const scale = objData.scale || 1;
            sprite.scale.set(scale, scale, 1);

            pScene.add(sprite);

            placedObjects.push({
                type: 'sprite',
                texture: objData.texture,
                position: objData.position
            });
        }
    });
}
