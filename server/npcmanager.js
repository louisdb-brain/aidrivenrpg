import {npc} from "./npc.js";
import {playermanager} from "./playermanager.js";
import {objectManager} from "./dynamicObjectsManager.js";
import {loot} from "./loot.js";
import {QuestGiver} from "./questgiver.js";


export class npcManager {
    constructor(objectmanager,io) {
        this.spawnCallback=null;
        this.npcs= {};
        this.objectmanager=objectmanager;
        this.io=io;
        this.respawnQueue = {};


    }
    update(delta) {
        const npcs = Object.values(this.npcs);
        const players = playermanager.getAllPlayers();

        this.updateRespawns();

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
                npc.update(delta, players,npcs);
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

        console.log(`Removing NPC ${id} and adding it to the queue` );
        this.respawnQueue[npc.npcid]={
            id:npc.npcid,
            name:npc.name,
            io:npc.io,
            destroynpcmethod:npc.destroynpcmethod,
            spawnCallback:npc.spawnCallback,
            loot:npc.loot,
            respawnTime: Date.now() + 200  // 1 minute
        };
        delete this.npcs[id];

        // Drop loot
        const lootId = `loot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const lootObject = new loot(lootId, "steak", { x: npc.position.x, y: 0, z: npc.position.z }, (event, data) => {
            this.io.emit(event, data);
        });
        this.objectmanager.addloot(lootObject);
    }
    updateRespawns() {
        const now = Date.now();
        if(Object.keys(this.respawnQueue).length === 0){}

        for (const npcid in this.respawnQueue) {
            const data = this.respawnQueue[npcid];

            if (data.respawnTime <= now) {
                if (this.npcs[npcid]) {
                    console.warn(`⚠️ Tried to respawn NPC ${npcid}, but it already exists! Skipping.`);
                    delete this.respawnQueue[npcid];
                    continue; // skip to next entry
                }

                console.log(`✨ Respawning NPC ${npcid}`);

                //  Recreate NPC using the same callbacks and drops
                const newNpc = new npc(
                    data.id,
                    {x:0,y:0,z:0},
                    data.name,
                    this.io,
                    (npc)=>this.removeNPC(npc),   // ✅ fresh onDestroy
                    this.spawnCallback,
                    data.loot
                );
                console.log(newNpc);

                this.addNpc(newNpc);

                delete this.respawnQueue[npcid];
            }
        }
    }



    getNpc(pID)
    {
        return this.npcs[pID];
    }



}
