import {npc} from "./npc.js";

export class QuestGiver extends npc {
    constructor(pNpcID, positionObj, pName,pArtID,framex,framey, io, onDestroy, spawncallback,loot,personality) {
        super(pNpcID, positionObj, pName,pArtID,framex,framey, io, onDestroy, spawncallback, loot);


        this.personality=personality // array of quest objects
        this.isQuestGiver = true;

        // Quest givers generally do not move or attack
        this.speed = 0;
        this.detectionRadius = 3;

    }
    setAgressive(){
        this.io.emit('npc-agression',this.npcid);
    }


}
