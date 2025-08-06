export class CookingGame {
    constructor() {
        // Create a new canvas for UI
        this.canvas = document.createElement('canvas');
        this.canvas.id = "uiCanvas";
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.zIndex = '10';
        this.canvas.style.pointerEvents = 'auto'; // allow mouse input

        // Append to body (or to a wrapper if you prefer)
        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');

        this.ingredientPhase = {
            UNCUT: "UNCUT",
            CUT: "CUT",
            THROWING: "THROWING",
            COOKING: "COOKING",
            DONE: "DONE",
            BURNED: "BURNED",
        };
    this.itemLibrary = {};
        this.pot = { x: 600, y: 400, w: 150, h: 100 };

        fetch('scripts/skills/ingredients.json')
            .then(res => res.json())
            .then(data => {
                data.forEach(item => {
                    this.itemLibrary[item.id] = item;
                    console.log(this.itemLibrary);
                });

                this.addIngredient("steak");
                this.addIngredient("onion");
                this.addIngredient("steak");
            });
        this.activeIngredients = [];
    }


    addIngredient(name) {

        const y = 50+this.activeIngredients.length * 120;

        const jsonobject=this.itemLibrary[name];
        const imagepath=jsonobject.image;



        const ing = new Ingredient(200, y, name, this.ingredientPhase,imagepath);

        // Event listeners (basic)
        this.canvas.addEventListener("mousedown", (e) => {
            const { offsetX, offsetY } = e;
            if (!ing.cut && ing.hitTest(offsetX, offsetY)) {
                ing.cutCount++;
                if (ing.cutCount >= 3) {
                    ing.cut = true;
                    ing.state = this.ingredientPhase.CUT;
                }
            } else if (ing.cut && ing.hitTest(offsetX, offsetY)) {
                ing.dragging = true;
            }
        });

        this.canvas.addEventListener("mousemove", (e) => {
            if (ing.dragging) {
                ing.x = e.offsetX - ing.w / 2;
                ing.y = e.offsetY - ing.h / 2;
            }
        });

        this.canvas.addEventListener("mouseup", (e) => {
            if (ing.dragging) {
                ing.dragging = false;
                if (
                    ing.x + ing.w > this.pot.x &&
                    ing.x < this.pot.x + this.pot.w &&
                    ing.y + ing.h > this.pot.y &&
                    ing.y < this.pot.y + this.pot.h
                ) {
                    alert("Success! Ingredient in the pot!");
                    ing.isCooking=true;
                }
                else {
                    ing.isCooking = false;
                }
            }
        });

        this.activeIngredients.push(ing);
    }

    update() {
        for (let ing of this.activeIngredients) {
            ing.update();
        }


    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "#654321";
        this.ctx.fillRect(this.pot.x, this.pot.y, this.pot.w, this.pot.h);

        for (let ing of this.activeIngredients) {
            ing.draw(this.ctx);
        }

        requestAnimationFrame(() => this.draw());
    }
}

export class Ingredient {
    constructor(x, y, name, phases,imagePath) {
        this.name = name;
        this.imagePath = imagePath;
        this.image = new Image();
        this.image.src = imagePath;
        this.image.onload = () => {
            console.log(`✅ Loaded: ${imagePath}`);
        };

        this.image.onerror = () => {
            console.error(`❌ FAILED TO LOAD IMAGE: ${imagePath}`);
        };
        this.x = x;
        this.y = y;
        this.w = 100;
        this.h = 100;
        this.cut = false;
        this.cutCount = 0;
        this.dragging = false;
        this.isCooking=false;
        this.timeCooking = 0;
        this.cookTime = 200;
        this.burnTime = 400;
        this.phases = phases;
        this.state = this.phases.UNCUT;
    }

    update() {
        if(this.isCooking) {
            this.state=this.phases.COOKING;
            this.timeCooking++;
            if (this.timeCooking > this.burnTime) {
                this.state = this.phases.BURNED;
            } else if (this.timeCooking > this.cookTime) {
                this.state = this.phases.DONE;
            }
        }

    }

    draw(ctx) {

        ctx.fillStyle = this.cut ? "lightgreen" : "blue";
        switch (this.state) {
            case this.phases.DONE:
                ctx.fillStyle="orange";
                break;


            case this.phases.BURNED:
                ctx.fillStyle="red";

        }
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = "yellow";
        ctx.fillText(`${this.name} (${this.state})`, this.x, this.y - 10);

        if (this.image && this.image.complete && this.image.naturalWidth !== 0) {
            const padding = 10;
            const imgX = this.x + padding;
            const imgY = this.y + padding;
            const imgW = this.w - padding * 2;
            const imgH = this.h - padding * 2;
            ctx.drawImage(this.image, imgX, imgY, imgW, imgH);



        }
    }

    hitTest(x, y) {
        console.log(this.x, this.y);
        return (
            x >= this.x &&
            x <= this.x + this.w &&
            y >= this.y &&
            y <= this.y + this.h
        );
    }
}
