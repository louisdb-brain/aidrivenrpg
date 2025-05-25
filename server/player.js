import * as THREE from 'three';

export class player {
    constructor(pId,position = { x: 0, y: 0, z: 0 },pName) {

        this.id=pId;
        this.position = new THREE.Vector3(position.x, position.y, position.z);
        this.targetPosition = this.position.clone();
        this.lockedPosition= this.position.clone();
        this.locked=false;
        this.speed = 1;
        this.angle=null;

        this.followTarget="";
        this.follow=false;

        this.wantedlevel=0;
        this.zone=0;
        this.name=pName;
    }


    update(delta) {

        var angledirection= null;
        const movedirection=new THREE.Vector3().subVectors(this.targetPosition,this.position);;
        if (this.locked==false) {
             angledirection = new THREE.Vector3().subVectors(this.targetPosition, this.position);
        }
        else{
            angledirection = new THREE.Vector3().subVectors(this.lockedPosition, this.position);
        }
        const distance = movedirection.length();

        if (distance > 0.1) {
            movedirection.normalize();
            angledirection.normalize();
            const moveStep = this.speed * delta;

            this.position.add(movedirection.clone().multiplyScalar(moveStep));
            this.angle = Math.atan2(angledirection.x, angledirection.z);


        }



    }
    setTarget(position) {
        let temppos=position.clone();
        temppos.y=0;
        this.targetPosition.copy(temppos); // store destination
    }

    getposition()
    {return this.position.clone();}





}