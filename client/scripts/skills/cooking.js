
export class CookingGame {
    constructor(canvas) {
        // Create a new canvas for UI
        this.canvas = document.createElement('canvas');
        this.canvas.id = "uiCanvas";
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '500';
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
        this.potImage = new Image();
        this.potImage.src = '/sprites/pan.png';
        this.boardImage=new Image();
        this.boardImage.src='/sprites/cuttingboard.jpg'

        this.boardImage.onload = () => {
            console.log('Image loaded!');
            this.ctx.drawImage(this.boardImage, 30, 30, 400, 200);
        };
        this.boardImage.onerror = () => console.error('Failed to load image!');

        this.potImage.onload = () => {
            console.log('Image loaded!');
            this.ctx.drawImage(this.potImage, this.pot.x, this.pot.y, this.pot.w, this.pot.h);
        };
        this.potImage.onerror = () => console.error('Failed to load image!');

        this.currentRecipe = null;
        this.recipeImage = new Image();


        this.ingredientsReady = false;
        this.recipesReady = false;

        Promise.all([
            fetch('/ingredients.json').then(res => res.json()),
            fetch('/recipes.json').then(res => res.json())
        ])
            .then(([ingredientsData, recipesData]) => {
                ingredientsData.forEach(item => {
                    this.itemLibrary[item.id] = item;
                });

                this.recipes = recipesData;
                this.recipesReady = true;
                this.ingredientsReady = true;

                // Example: spawn a few starter ingredients
                this.addIngredient("minotaursteak");
                this.addIngredient("onion");
                this.addIngredient("butter");
                this.addIngredient("manaherb");
                this.addIngredient("vegetablestock");
                this.addIngredient("dragonbroth");
                this.addIngredient("dragonscale");
                this.addIngredient("tomato");
                this.addIngredient("eyeballsjar");
            });


        this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
        this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
        this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
        this.canvas.addEventListener("mouseleave", this.handleMouseLeave.bind(this));


        this.activeIngredients = [];
        this.addedIngredients = [];
        this.ghostGlowTime = 0;

        //cursor
        this.customCursor = document.createElement("div");
        this.customCursor.id = "customCursor";
        document.body.appendChild(this.customCursor);
        this.cursorAngle=0;
        //SOUND
        this.cutSound = new Audio("sounds/cooking_cut.mp3");
        this.sizzleSound=new Audio("sounds/cooking_longsizzle.mp3");
        this.shortSizzleSound=new Audio("sounds/cooking_sizzle.mp3");
        this.playsizzle=false;

        this.initializeDropListener();

    }




    addIngredient(name) {
        const info = this.itemLibrary[name];

        if (!info) {
            console.warn(`Ingredient "${name}" not found`);
            return;
        }

        const y = 50 + this.activeIngredients.length * 120;
        const imagePath = info.image;

        const ing = new Ingredient(
            200, y,
            name,
            this.ingredientPhase,
            imagePath,
            (success) => this.tryAddRecipe(this.addedIngredients, ing, success),
            this.shortSizzleSound,
            Number(info.cooktime) || 0,
            Number(info.burntime) || 9999
        );

        this.activeIngredients.push(ing);
        return ing;
        console.log("Spawned ingredient:", name, ing);
    }
    tryAddRecipe(list, ingredient, success) {
        if (success) {
            if (!list.includes(ingredient)) {
                list.push(ingredient);
                console.log(`✅ Added ${ingredient.name} to pot (done).`);
            }
        } else {
            const index = list.indexOf(ingredient);
            if (index !== -1) {
                list.splice(index, 1);
                console.log(`❌ Removed ${ingredient.name} from pot (burned or undone).`);
            }
        }
    }

    checkForRecipe() {
        if (!this.recipes || this.recipes.length === 0) return;

        // Get only DONE ingredients currently valid for recipes
        const validIngredients = this.addedIngredients.filter(
            i => i.state === this.ingredientPhase.DONE
        );
        const names = validIngredients.map(i => i.name);

        // Optional: cancel recipe if anything burned
        if (this.addedIngredients.some(i => i.state === this.ingredientPhase.BURNED)) {
            this.currentRecipe = null;
            return;
        }

        // Look for a matching recipe
        let matched = null;
        for (const recipe of this.recipes) {
            const allPresent = recipe.inputs.every(name => names.includes(name));
            if (allPresent) {
                matched = recipe;
                break;
            }
        }

        // Handle found recipe
        if (matched) {
            if (!this.currentRecipe || this.currentRecipe.output !== matched.output) {
                this.currentRecipe = matched;
                console.log(
                    `%c🍳 Recipe ready!`,
                    "color: gold; font-weight: bold;",
                    `Inputs: [${matched.inputs.join(", ")}] → Output: ${matched.output}`
                );
            }
        } else {
            if (this.currentRecipe) {
                console.log("❌ Recipe no longer valid.");
            }
            this.currentRecipe = null;
        }
    }

    finishRecipe() {
        if (!this.currentRecipe) return;

        console.log(`🍽️ Created ${this.currentRecipe.output}!`);

        // Remove used ingredients from the pot and from the ready list
        const usedNames = [...this.currentRecipe.inputs];

        // Remove from addedIngredients (recipe-ready list)
        this.addedIngredients = this.addedIngredients.filter(
            ing => !usedNames.includes(ing.name)
        );

        // Also remove from activeIngredients (visuals)
        this.activeIngredients = this.activeIngredients.filter(
            ing => !usedNames.includes(ing.name)
        );

        // Add the finished dish
        const ing=this.addIngredient(this.currentRecipe.output);
        ing.cut=true;
        ing.state = this.ingredientPhase.DONE;

        // Clear the current recipe so you can’t click again
        this.currentRecipe = null;
    }



    isInsidePot(ing) {
        return (
            ing.x + ing.w > this.pot.x &&
            ing.x < this.pot.x + this.pot.w &&
            ing.y + ing.h > this.pot.y &&
            ing.y < this.pot.y + this.pot.h
        );
    }




    handleMouseDown(e) {
        const { offsetX, offsetY } = e;
        if (this.currentRecipe) {
            const { ghostX, ghostY, ghostW, ghostH } = this.getGhostRect();
            if (
                offsetX >= ghostX &&
                offsetX <= ghostX + ghostW &&
                offsetY >= ghostY &&
                offsetY <= ghostY + ghostH
            ) {
                this.finishRecipe();
                return;
            }
        }

        for (const ing of this.activeIngredients) {
            if (!ing.cut && ing.hitTest(offsetX, offsetY)) {
                ing.cutCount++;
                this.cutSound.currentTime = 0;
                this.cutSound.play();
                if (ing.cutCount >= 3) {
                    ing.cut = true;
                    ing.state = this.ingredientPhase.CUT;
                }
            } else if (ing.cut && ing.hitTest(offsetX, offsetY)) {
                ing.dragging = true;

            }
        }

        // Animate knife
        this.customCursor.style.transition = 'transform 0.1s';
        this.customCursor.style.transform = `rotate(-45deg)`;



    }

    handleMouseMove(e) {
        const { offsetX, offsetY, pageX, pageY } = e;

        let isHoveringUncut = false;
        let isHoveringCut = false;

        for (const ing of this.activeIngredients) {
            if (!ing.cut && ing.hitTest(offsetX, offsetY)) {
                isHoveringUncut = true;
            } else if (ing.cut && ing.hitTest(offsetX, offsetY)) {
                isHoveringCut = true;
            }

            if (ing.dragging) {
                ing.x = offsetX - ing.w / 2;
                ing.y = offsetY - ing.h / 2;
            }
        }

        // Cursor logic
        if (isHoveringUncut || isHoveringCut) {
            document.body.classList.add("cursor-hidden");
            this.customCursor.style.display = "block";
            this.customCursor.style.left = `${pageX - 24}px`;
            this.customCursor.style.top = `${pageY - 24}px`;

            if (isHoveringUncut) {
                this.customCursor.className = "knife";
            } else if (isHoveringCut) {
                this.customCursor.className = "spatula";
            }
        } else {
            document.body.classList.remove("cursor-hidden");
            this.customCursor.style.display = "none";
        }
    }

    handleMouseUp(e) {
        for (const ing of this.activeIngredients) {
            if (ing.dragging) {
                ing.dragging = false;
                if (
                    ing.x + ing.w > this.pot.x &&
                    ing.x < this.pot.x + this.pot.w &&
                    ing.y + ing.h > this.pot.y &&
                    ing.y < this.pot.y + this.pot.h
                ) {
                    ing.isCooking = true;
                    this.sizzleSound.currentTime=0;
                    this.sizzleSound.play();
                } else {
                    ing.isCooking = false;

                }
            }
        }
        this.customCursor.style.transition = 'transform 0.05s';
        this.customCursor.style.transform = `rotate(0deg)`;

    }

    handleMouseLeave() {
        document.body.classList.remove("cursor-hidden");
        this.customCursor.style.display = "none";
    }
    getGhostRect() {
        const pulseY = Math.sin(this.ghostGlowTime * 2) * 5;
        const ghostW = 128;
        const ghostH = 128;
        const ghostX = this.pot.x + this.pot.w / 2 - ghostW / 2;
        const ghostY = this.pot.y - 200 + pulseY*2;

        return { ghostX, ghostY, ghostW, ghostH };
    }



    update() {
        this.playsizzle=false;
        for (let ing of this.activeIngredients) {
            ing.update();
            if(ing.isCooking){this.playsizzle=true;}
        }
        if (this.playsizzle) {
            if (this.sizzleSound.paused) {
                this.sizzleSound.currentTime = 0;
                this.sizzleSound.play().catch(console.error);
            }
        } else {
            if (!this.sizzleSound.paused) {
                this.sizzleSound.pause();
                this.sizzleSound.currentTime = 0;
            }
        }
        // 🔍 Check for possible recipes based on ingredients in the pot
        this.checkForRecipe();

        //  Animate ghost glow if recipe exists
        if (this.currentRecipe) {
            if (this.ghostGlowTime === undefined) this.ghostGlowTime = 0;
            this.ghostGlowTime += 0.05;
        } else {
            this.ghostGlowTime = 0;
        }



    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "#654321";
        this.ctx.drawImage(this.potImage, this.pot.x, this.pot.y, this.pot.w, this.pot.h);
        this.ctx.drawImage(this.boardImage, 30, 30, 400, 500);
        //const potrect=this.ctx.fillRect(this.pot.x, this.pot.y, this.pot.w, this.pot.h);

        // 🔮 Draw ghost recipe if a valid combo is detected
        if (this.currentRecipe && this.itemLibrary[this.currentRecipe.output]) {
            const outputItem = this.itemLibrary[this.currentRecipe.output];
            const img = new Image();
            img.src = outputItem.image;

            const pulse = (Math.sin(this.ghostGlowTime) + 1) / 2;
            const glowSize = 15 + pulse * 15;
            const alpha = 0.5 + pulse * 0.3;

            const { ghostX, ghostY, ghostW, ghostH } = this.getGhostRect();


            this.ctx.save();
            this.ctx.shadowColor = `rgba(255, 255, 150, ${0.3 + pulse * 0.5})`;
            this.ctx.shadowBlur = glowSize;
            this.ctx.globalAlpha = alpha;

            this.ctx.drawImage(img, ghostX, ghostY, ghostW, ghostH);

            this.ctx.restore();
            this.ctx.globalAlpha = 1.0;
        }


        for (let ing of this.activeIngredients) {
            ing.draw(this.ctx);
        }



        requestAnimationFrame(() => this.draw());
    }
    toggle() {
        this.canvas.style.display = this.canvas.style.display === 'none' ? 'block' : 'none';
    }

    show() {
        this.canvas.style.display = 'block';
    }

    hide() {
        this.canvas.style.display = 'none';
    }
    initializeDropListener() {
        window.addEventListener("inventoryDrop", (e) => {
            if (!this.ingredientsReady || this.canvas.style.display === 'none') return;

            const { name, x, y } = e.detail;

            // Check if drop was inside cooking canvas bounds
            const bounds = this.canvas.getBoundingClientRect();
            const isInside =
                x >= bounds.left &&
                x <= bounds.right &&
                y >= bounds.top &&
                y <= bounds.bottom;

            if (isInside) {
                console.log(`🍳 Dropped '${name}' into cooking menu at (${x}, ${y})`);
                this.addIngredient(name);
            } else {
                console.log(`❌ Drop ignored (outside cooking canvas): '${name}'`);
            }
        });
    }



}

export class Ingredient {
    constructor(x, y, name, phases,imagePath,cookedCallback,psizzlesound,cookTime, burnTime) {
        this.name=name;
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
        this.wasCooking = false;
        this.timeCooking = 0;
        this.cookTime = (typeof cookTime === "number" ? cookTime : 200);
        this.burnTime = (typeof burnTime === "number" ? burnTime : 400);
        this.phases = phases;
        this.state = this.phases.UNCUT;
        this.sizzlesound=psizzlesound;
        this.hasPlayedSound=false;
        this.cookedCallback=cookedCallback;
    }

    update() {
        const wasCooking = this.wasCooking;

        if (this.isCooking) {
            this.state = this.phases.COOKING;
            this.timeCooking++;

            if (this.timeCooking > this.burnTime && this.state !== this.phases.BURNED) {
                this.state = this.phases.BURNED;
                this.cookedCallback(false);
            }
            else if (this.timeCooking > this.cookTime && this.state !== this.phases.DONE) {
                this.state = this.phases.DONE;
                this.cookedCallback(true);
            }
        }
        else if (wasCooking && !this.isCooking && this.state !== this.phases.DONE) {
            // Ingredient was cooking last frame but just got removed from pan
            this.cookedCallback(false);
            console.log(`🥄 ${this.name} removed from pan mid-cook`);
        }

        // Remember this frame's cooking state
        this.wasCooking = this.isCooking;
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
        //console.log(this.x, this.y);
        return (
            x >= this.x &&
            x <= this.x + this.w &&
            y >= this.y &&
            y <= this.y + this.h
        );
    }
}
