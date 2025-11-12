import * as THREE from 'three';
export class Spell {
    constructor(id,caster,sprite,radius,damage,time,position,level) {
        this.id = id;
        this.manager = "" ; // reference to manager holds all active spells
        this.caster=caster;
        this.sprite=sprite;
        this.position = position;
        console.log(this.position);
        this.velocity = new THREE.Vector3();
        this.radius=radius;
        this.damage=damage;
        this.time=time;
        this.dealtdamage = false;
        this.level=level;

    }

    tick() {
        this.dealtdamage = true;
       /* this.time--;
        if(this.time<0)
        {
            //destroy this
        }*/

    }

    destroy() {
        // 1. Remove from manager list/map
        if (this.manager) {
            this.manager.removeSpell(this.id);
            this.manager = null;
        }

        // 2. Unsubscribe or clear intervals/timeouts
        clearInterval(this.interval);
        this.interval = null;

        // 3. Remove any event listeners
        if (this.io) {
            this.io.off('some-event', this.handleEvent);
            this.io = null;
        }

        // 4. Null out big references
        this.position = null;
        this.velocity = null;
    }
}
