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

        this.pot = { x: 600, y: 400, w: 150, h: 100 };
        this.activeIngredients = [];
    }

    addIngredient(name) {
        const y = this.activeIngredients.length * 120;
        const ing = new Ingredient(200, y, name, this.ingredientPhase);

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
                    ing.state = this.ingredientPhase.COOKING;
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
    constructor(x, y, name, phases) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.w = 100;
        this.h = 100;
        this.cut = false;
        this.cutCount = 0;
        this.dragging = false;
        this.timeCooking = 0;
        this.cookTime = 200;
        this.burnTime = 500;
        this.phases = phases;
        this.state = this.phases.UNCUT;
    }

    update() {
        if (this.state === this.phases.COOKING) {
            this.timeCooking++;
            if (this.timeCooking > this.burnTime) {
                this.state = this.phases.BURNED;
            } else if (this.timeCooking > this.cookTime) {
                this.state = this.phases.DONE;
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.cut ? "lightgreen" : "tomato";
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = "black";
        ctx.fillText(`${this.name} (${this.state})`, this.x, this.y - 10);
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
