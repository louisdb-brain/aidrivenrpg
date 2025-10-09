export class Loot {
    constructor(itemID, name, location = { x: 0, y: 0, z: 0 }, iconPath = null, scaleDivisor = 100) {
        this.itemID = itemID;
        this.name = name;
        this.location = { ...location };
        this.iconPath = iconPath;
        this.scaleDivisor = scaleDivisor;
    }
}