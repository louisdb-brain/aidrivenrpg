export class inventory{
    constructor(playerid,emitCallback,holdMax){
        this.playerid = playerid;
        this.emit=emitCallback;

        this.itemslist="items/itemlist.json"
        this.holdmax=holdMax;
        this.items=[]
    }

    additem(itemname)
    {

        if(this.items.length<this.holdmax){
            this.items.push(itemname);
            const payload={
                id:this.playerid,
                name:itemname
            }
            console.log("[SERVER] Inventory additem:", itemname);
            this.emit('add-item', payload);
        }
        else{
            //CODE FOR DROPPING LOOT ON FLOOR;
        }
    }
    removeitem(itemName) {
        const index = this.items.findIndex(item => item.name === itemName);

        if (index !== -1) {
            this.items.splice(index, 1);
            return true;  // removed successfully
        }
        console.log(this.items);
        return false; // nothing removed
    }
    getItems(){
        return this.items;
    }
}