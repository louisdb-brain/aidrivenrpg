class UIWidget {
    constructor(name = "UIWidget") {
        this.name = name;
    }

    show() {
        console.log(`Showing ${this.name}`);
    }
}

class SpellcastingUI extends UIWidget {
    constructor() {
        super("SpellcastingUI");
    }

    castSpell() {
        console.log("Casting a spell!");
    }
}