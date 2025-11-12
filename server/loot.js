export class loot{
    constructor(itemID,name,level,location={x:0,y:0,z:0},emitCallback)
    {
        this.itemID=itemID;
        this.itemID = itemID;
        this.name = name;
        this.location = { ...location };
        this.emit=emitCallback;
        this.level=level;
        this.emitloot();



    }
    emitloot(){
        const payload={

            id:this.itemID,
            name:this.name,
            location:this.location,
            level:this.level
        }
        this.emit('newloot',payload);
    }
    pickup(){
    }
    deteriorate()
    {}
}