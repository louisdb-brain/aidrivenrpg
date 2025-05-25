//CLIENT SIDE NPC//
import * as THREE from 'three';
import {GLTFLoader} from "three/addons/loaders/GLTFLoader";

export class npc {

    constructor(scene, pStartpos={x:0,y:0,z:0}) {
        this.scene = scene;
        this.model=null;
        this.modelpath = 'models/goblin.glb';
        this.pNpcID = "";
        this.position = new THREE.Vector3(pStartpos.x, pStartpos.y, pStartpos.z);
        this.name = "";
        this.health = 10;
        this.attack = 0;
        this.speed= 2;
        this.targetPosition = this.position.clone();

        const loader = new GLTFLoader();

        loader.load(this.modelpath, (gltf) => {
            this.model = gltf.scene;
            this.model.position.copy(this.position);
            this.scene.add(this.model);});


    }

    update(delta) {
        this.move(delta);

    }
    move(delta){
        if (!this.model) return;
        const direction = new THREE.Vector3().subVectors(this.targetPosition, this.position);
        const distance = direction.length();

        if (distance > 0.1) {
            direction.normalize();
            const moveStep = this.speed * delta;

            this.position.add(direction.clone().multiplyScalar(moveStep));
            this.angle = Math.atan2(direction.x, direction.z);
            this.model.rotation.y = this.angle;
        }
        this.model.position.copy(this.position);
    }

    setTarget(position) {

        let temppos = position.clone();
        temppos.y = 0;
        this.targetPosition.copy(temppos);

    }

}