import * as THREE from 'three';
import {GLTFLoader} from "three/addons/loaders/GLTFLoader";
import {player} from "../../server/player";

export class  Chest {
    constructor(id,scene,grounded,pStartPos={x:0,y:0,z:0}){
        this.scene = scene;
        this.model=null;
        this.modelpath='models/chest.glb';
        this.chestId=id;
        this.grounded=grounded;
        this.position=new THREE.Vector3(pStartPos.x, pStartPos.y,pStartPos.z);
        this.targetObject=null;
        this.angle=null;

        const loader = new GLTFLoader();

        loader.load(this.modelpath, (gltf) => {
            this.model = gltf.scene;
            this.model.position.copy(this.position);
            this.model.angle.copy(this.angle);
            this.scene.add(this.model);});



    }
    update(delta){
        if(this.grounded!==null) {
            this.position = this.targetObject.position.clone();
        }

    }
}