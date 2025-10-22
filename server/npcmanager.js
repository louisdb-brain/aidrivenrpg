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
        const npcs = Object.values(this.npcs);
        const players = playermanager.getAllPlayers();

        for (const npc of npcs) {
            // Skip invalid or destroyed NPCs safely
            if (!npc) {
                console.warn("⚠️ Skipping undefined NPC entry in npcManager");
                continue;
            }

            if (npc._destroyed) {
                console.log(`🪦 Skipping destroyed NPC: ${npc.name} (${npc.npcid})`);
                continue;
            }

            try {
                npc.update(delta, players);
            } catch (err) {
                console.error(`💥 Error updating NPC '${npc.name}' (${npc.npcid}):`, err);
            }
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
    removeNPC(npcOrId) {
        const id = typeof npcOrId === 'string' ? npcOrId : npcOrId.npcid;
        const npc = this.npcs[id];
        if (!npc) return;

        console.log(`Removing NPC ${id}`);
        delete this.npcs[id];

        // Drop loot
        const lootId = `loot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const lootObject = new loot(lootId, "steak", { x: npc.position.x, y: 0, z: npc.position.z }, (event, data) => {
            this.io.emit(event, data);
        });
        this.objectmanager.addloot(lootObject);
    }

    getNpc(pID)
    {
        return this.npcs[pID];
    }



}
