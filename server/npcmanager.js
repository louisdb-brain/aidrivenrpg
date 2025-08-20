import {npc} from "./npc.js";
import {playermanager} from "./playermanager.js";
import {objectManager} from "./dynamicObjectsManager.js";
import {loot} from "./loot.js";


export class npcManager {
    constructor(objectmanager,io) {
        this.npcs= {};
        this.objectmanager=objectmanager;
        this.io=io;



    }
    update(delta) {
        for (const npc of Object.values(this.npcs)) {
            npc.update(delta,playermanager.getAllPlayers());

        }
    }
    addNpc(pNPC) {
        if(!this.npcs[pNPC.npcid]){
            this.npcs[pNPC.npcid]=pNPC;
        }
    }
    getNpcList(){
        return this.npcs;
    }
    removeNPC(npc) {
        console.log(`Removing NPC ${npc}`);
        delete this.npcs[npc];

        console.log(this.npcs);
        const itemamount=this.objectmanager.loot.length;
        const lootobject=new loot(itemamount+"steakid","steak",{x:0,y:0,z:0},(event, data) => {
            this.io.emit(event, data);
        });
        this.objectmanager.addloot(lootobject);
        console.log(lootobject);;
        // Optional: Do more cleanup if needed
    }
    getNpc(pID)
    {
        return this.npcs[pID];
    }



}
