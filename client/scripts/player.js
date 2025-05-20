import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

//🦝 animal script
//🎅player script
export class Player {
    constructor(scene,position = { x: 0, y: 0, z: 0 }) {

        this.scene = scene;
        this.model=null;
        this.modelpath = 'models/character.glb';
        this.mixer = null;
        this.position = new THREE.Vector3(position.x, position.y, position.z);


        this.targetPosition = this.position.clone();
        this.speed = 1;

        const loader = new GLTFLoader();

        loader.load(this.modelpath, (gltf) => {
            this.model = gltf.scene;
            this.model.position.copy(this.position);
            this.scene.add(this.model);

            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.model);
                const action = this.mixer.clipAction(gltf.animations[0]);
                this.currentAction = action;
                this.currentAction.play();
            }
        });
    }


    update(delta) {
        if (!this.model) return;

        const direction = new THREE.Vector3().subVectors(this.targetPosition, this.position);
        const distance = direction.length();


        if (distance > 0.1) {
            direction.normalize();
            const moveStep = this.speed * delta;
            this.position.add(direction.clone().multiplyScalar(moveStep));

            const angle = Math.atan2(direction.x, direction.z);
            this.model.rotation.y = angle;

            if (this.currentAction && !this.currentAction.isRunning()) {
                this.currentAction.play();
            }
        } else {
            // Stop animation when target reached
            if (this.currentAction) {
                this.currentAction.stop();
            }
        }

        // Apply new position to the model
        this.model.position.copy(this.position);

        // Animate
        if (this.mixer) this.mixer.update(delta);

    }
    setTarget(position) {
        let temppos=position.clone();
        temppos.y=0;
        this.targetPosition.copy(temppos); // store destination
    }
    getposition()
    {return this.position.clone();}





}