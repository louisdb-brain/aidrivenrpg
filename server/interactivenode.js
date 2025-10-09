

export class skillNode {
    constructor( name,position,sprite,skill,level,resources,emitCallback,socketCallback,spawnCallback) {
        this.name=name;
        this.position = position
        this.sprite = sprite;
        this.type="skillNode";
        this.skill=skill;
        this.level=level;
        this.resources=resources;
        this.emitCallback=emitCallback;
        this.socketCallback=socketCallback;
        this.spawnCallback=spawnCallback;
        this.emitNode();
    }
    emitNode() {
        const payload={
            name:this.name,
            position:this.position,
            sprite:this.sprite
                    }
        this.emitCallback('emitnode',payload);
    }
    click(player, socket) {
        console.log("clicked " + this.name);

        if (this.checkSkill(player, this.skill, this.level)) {
            socket.emit('clickedNode', this.name);

            const randomnumber = Math.random() * 2 - 1;
            const randomYnumber = Math.random() / 2 - 1;
            const spawnposition = {
                x: this.position.x + randomnumber,
                y: this.position.y,
                z: this.position.z + 2 + randomYnumber
            };

            const uniqueId = `${this.name}_loot_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
            this.spawnCallback(uniqueId, this.resources, spawnposition);

            player.skillLevels[this.skill]++;

            socket.emit(
                "local-message",
                `You went a level up in ${this.skill}, you are now level ${player.skillLevels[this.skill]}`
            );
        } else {
            socket.emit(
                "local-message",
                `Skill level not high enough — need ${this.level} in ${this.skill}`
            );
        }
    }

    gatherResource(player,resource) {
        player.inventory.additem(resource);

    }
    checkSkill(player,skill,level)
    {
        if(player.skillLevels[skill]>level){return true;}
        else {return false;}
    }
    consumeResource(resourceNeeded,player) {
        console.log(resource +" consumed");
        player.inventory.searchItem(resource);
    }
}