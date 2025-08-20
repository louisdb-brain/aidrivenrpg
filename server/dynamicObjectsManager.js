import {playermanager} from "./playermanager.js";

export class objectManager{
    constructor() {
        this.chests={}
        this.loot={};
    }
    update(delta) {
        for (const chest of Object.values(this.chests)) {
            chest.update(delta);
        }
    }
    addloot(loot,id){
        let thisId=id;
        if(!this.loot[thisId])
        {
            this.loot[thisId]=loot;
        }

    }
    getloot(id){
        return this.loot[id];
    }
    lootDo(id,socketid)
    {
        const itemname=this.getloot(id);
        playermanager.additem(socketid,itemname);
        this.removeloot(id);

    }
    removeloot(id){
        delete this.loot[id];
    }
    addChest(pChest,id) {
        let thisId=id;
        if (this.chests[thisId]) {
            const length = Object.keys(this.chests).length;
            thisId=length+1;
        }
        if(!this.chests[thisId]){
            this.chests[thisId]=pChest;
            console.log("chest"+thisId);
        }
        console.log("tried to add chest");

    }
    getChest(pId){
        return this.chests[pId];
    }
    getChestdict()
    {
        return this.chests;
    }
}