

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
    click(player) {
        console.log("clicked " + this.name);
        if(this.checkSkill(player,this.skill,this.level)) {
            this.socketCallback('clickedNode', this.name);
            const spawnposition = {
                x: this.position.x ,
                y: this.position.y-2,
                z: this.position.z
            };
            this.spawnCallback(this.name+'lootid',this.resources,spawnposition);


        }else {
            console.log("skill not high enough");
            this.socketCallback("chat-message",{id:"warning:",message:" skill level nog high enough"});
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