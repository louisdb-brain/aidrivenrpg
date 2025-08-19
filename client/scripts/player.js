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
        this.locked=false;
        this.lockedPosition=this.position.clone();
        this.targetPosition = this.position.clone();
        this.speed = 1;
        this.angle = null;

        this.wantedlevel=0;

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
        var direction=null;

        const movedirection=new THREE.Vector3().subVectors(this.targetPosition,this.position);

        if (this.locked==false) {
            direction = new THREE.Vector3().subVectors(this.targetPosition, this.position);
        }
        else{
            direction = new THREE.Vector3().subVectors(this.lockedPosition, this.position);
        }
        const distance = movedirection.length();


        if (distance > 0.1) {
            movedirection.normalize();
            direction.normalize();
            const moveStep = this.speed * delta;
            this.position.add(movedirection.clone().multiplyScalar(moveStep));

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
    setLockedTarget(position) {
        let temppos=position.clone();
        temppos.y=0;
        this.lockedPosition.copy(temppos); // store destination
    }
    playAnimation(animationNumber)
    {

        if (!gltf.animations || gltf.animations.length <= animationNumber) {
            console.log("no extra animations")
            return;
        }

        // Clean up previous mixer/action if needed
        if (!this.mixer) {
            this.mixer = new THREE.AnimationMixer(this.model);
        }

        const clip = gltf.animations[animationNumber];
        const action = this.mixer.clipAction(clip);


        action.reset();
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true; // Keeps final frame visible
        //action.setDuration(time); // Optional: force the duration
        action.play();

        this.currentAction = action;


    }

    getposition()
    {return this.position.clone();}





}