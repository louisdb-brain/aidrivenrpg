import {playermanager} from "./playermanager.js";

export class objectManager{
    constructor() {
        this.chests={}
        this.loot={};
        this.nodes={};
    }
    update(delta) {
        for (const chest of Object.values(this.chests)) {
            chest.update(delta);
        }
    }
    addNode(node,level) {
        if(!this.nodes[node.name]) {
            this.nodes[node.name] = node;
            this.nodes[node.name].level=level;
        }
    }
    clickNode(id,player) {
        if(this.nodes[id]){
            this.nodes[id].click(player);
        }else {
            console.log("no nodes with id: "+id);
        }
    }
    addloot(loot, id) {
        let thisId = id;
        if (!this.loot[thisId]) {
            console.log("[ADDLOOT] Storing new loot:", thisId);
            this.loot[thisId] = loot;
        } else {
            console.warn("[ADDLOOT] Loot with ID already exists:", thisId);
        }
    }
    getloot(id){
        return this.loot[id];
    }
    getNode(name){
        return this.nodes[name];
    }
    lootObject(id, socketid) {
        console.log("[DEBUG] lootObject called with id:", id, "by", socketid);
        const lootObj = this.getloot(id);
        if (!lootObj) {
            console.warn("[WARN] Loot not found for ID:", id);
            return;
        }
        console.log("[DEBUG] lootObj.name:", lootObj.name);
        playermanager.additem(socketid, lootObj.name);
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