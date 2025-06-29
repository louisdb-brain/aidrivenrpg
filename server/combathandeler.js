export class combathandeler {
    constructor() {
        this.combatlist={}
    }


    update(){
    if (!this.combatlist.empty){
        for(const conflict in this.combatlist){
            const damage=calculaterhit(this.combatlist[conflict].combater,this.combatlist[conflict].target);

        }
    }
    }
    addCombater(combater,target){
        this.combatlist[combater.id]={combater,target};
    }
    caulculatehit(hitpower,hitchance,targetdefence){

    }
}