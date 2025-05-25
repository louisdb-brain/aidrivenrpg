import {npc} from "./npc.js";
import {playermanager} from "./playermanager.js";

export class npcManager {
    constructor() {
        this.npcs={};



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

}
