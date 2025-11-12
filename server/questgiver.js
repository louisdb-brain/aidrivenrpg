import {npc} from "./npc.js";

export class QuestGiver extends npc {
    constructor(pNpcID, positionObj, pName,io, onDestroy, spawncallback,loot,level) {
        super(pNpcID, positionObj, pName, io, onDestroy, spawncallback, loot,level);


         // array of quest objects
        this.isQuestGiver = true;

        // Quest givers generally do not move or attack
        this.speed = 0;
        this.detectionRadius = 3;

    }
    setAgressive(){
        this.io.emit('npc-agression',this.npcid);
    }


}
