export class inventory{
    constructor(playerid,emitCallback,holdMax){
        this.playerid = playerid;
        this.emit=emitCallback;

        this.itemslist="items/itemlist.json"
        this.holdmax=holdMax;
        this.items=[]
    }

    additem(itemId)
    {
        if(this.items.length<this.holdmax){
            this.items.push(itemId);
            const payload={
                id:this.playerid,
                name:itemId
            }
            this.emit('add-item', payload);
        }
    }
    removeitem(index){
        this.items.splice(1,index);
        const payload={
            id:this.playerid,
            index:index
        }
        //change this to socket
        this.emit('remove-item', payload);
    }
    searchItem(itemid){
        for(let i=0;i<this.items.length;i++){
            if (this.items[i].id == itemid){
                return i;
            }
        }
    }
    getItems(){
        return this.items;
    }
}