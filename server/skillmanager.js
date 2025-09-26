export class skillManager{
    constructor(){
        this.skillList=[
            "ADVENTURING",
            "FORESTRY",
            "CRAFTING",
            "MINING",
            "SMITHING",
            "FISHING",
            "COOKING"
        ];
        this.nodeList=[];

    }
    createNodes()
    {

    }
    addNode(node){
        this.nodeList.push(node);
    }
}