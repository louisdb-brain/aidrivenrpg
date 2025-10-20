import * as THREE from 'three';
export class plant{
    constructor(scene,position)
    {
        this.position =new THREE.Vector3(position.x,position.y,position.z);
        this.loot="";
    }
    update(){

    }
    harvest(){
        //spawn loot
    }

}