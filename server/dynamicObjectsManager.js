export class objectManager{
    constructor() {
        this.chests={}
    }
    update(delta) {
        for (const chest of Object.values(this.chests)) {
            chest.update(delta);
        }
    }
    addChest(pChest,id) {
        let thisId=id;
        if (this.chests[thisId]) {
            const length = Object.keys(this.chests).length;
            thisId=length+1;
        }
        if(!this.chests[thisId]){
            this.chests[thisId]=pChest;
        }

    }
    getChest(pId){
        return this.chests[pId];
    }
    getChestdict()
    {
        return this.chests;
    }
}