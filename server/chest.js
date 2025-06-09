import * as THREE from 'three';
export class Chest{
    constructor(position,chestId) {
        this.chestId=chestId;
        this.position=new THREE.Vector3(position.x,position.y,position.z);
        this.zone=0;
        this.grounded=true;
        this.parentObject=null;
        this.angle=0;
    }
    update(delta)
    {
        if(!this.grounded && !this.parentObject==null){

            this.position=this.parentObject.position.clone();
        }
    }
    pickUp(parentobject)
    {
        this.parentObject=parentobject;
        this.grounded=false;
    }
    drop(){
        this.parentObject=null;
        this.grounded=true;
    }
    toggleGrounded(parentobject)
    {
        if(!this.grounded){
            this.drop();

        }
        else
        {
            this.pickUp(parentobject.position);
        }
    }
    getChestId()
    {
        return this.chestId;
    }
}