import {drawHorizontalFadeRect,drawSlider,drawCrosshair} from "../uiDrawUtils.js";

export class CookingGame {
    constructor(canvas,networkclient, gamepadInstance = null) {

        // Create a new canvas for UI
        this.canvas = document.createElement('canvas');
        this.canvas.id = "uiCanvas";
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0px';
        this.canvas.style.left = '0px';
        this.canvas.style.zIndex = '10';
        this.canvas.style.pointerEvents = 'auto'; // allow mouse input



        this.networkClient=networkclient;
        // Append to body (or to a wrapper if you prefer)
        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        this.usingGamepad = false;
        this.crosshair = {x: this.canvas.width / 2, y: this.canvas.height / 2};
        this.crosshairTarget = {x: this.crosshair.x, y: this.crosshair.y};
        this.animationStep = 0;
        this.crosshairRadius = 16;
        this.isGamepadDragging = false;
        this.snapIndex = 0;
        this.aButtonHoldStart = 0;
        this.holdThreshold = 100;
        this.crosshairspeed = 10;


        this.ingredientPhase = {
            UNCUT: "UNCUT",
            CUT: "CUT",
            THROWING: "THROWING",
            COOKING: "COOKING",
            DONE: "DONE",
            BURNED: "BURNED",
        };

        this.itemLibrary = {};
        //this.inventorybag = {x: 800, y: 800, w: 400, h: 800};
        // pot (bottom center)
        this.pot = {
            x:  200,
            y:  100,
            w: 800,
            h: 650
        };
        this.potHit={
            x: this.pot.x+this.pot.w/2,
            y:this.pot.y+20,
            w:this.pot.w/2,
            h:this.pot.h/2
        }


        this.inventorybag = {
            x: this.canvas.width - 500,
            y: 100,
            w: 500,
            h: 800
        };

        this.potImage = new Image();
        this.potImage.src = '/sprites/stove.png';

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
        this.cursorAngle = 0;
        //SOUND
        this.cutSound = new Audio("sounds/cooking_cut.mp3");
        this.sizzleSound = new Audio("sounds/cooking_longsizzle.mp3");
        this.shortSizzleSound = new Audio("sounds/cooking_sizzle.mp3");
        this.grabSound = new Audio("sounds/grabsound.mp3");
        this.playsizzle = false;
        this.dropsound=new Audio("sounds/lootsound.mp3");
        this.ringsound=new Audio("sounds/ringsound.mp3");

        this.initializeDropListener();

    }

    update() {
        this.playsizzle = false;

        for (let ing of this.activeIngredients) {
            ing.update();
            if (ing.isCooking) this.playsizzle = true;
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

        this.checkForRecipe();

        if (this.currentRecipe) {
            if (this.ghostGlowTime === undefined) this.ghostGlowTime = 0;
            this.ghostGlowTime += 0.05;
        } else {
            this.ghostGlowTime = 0;
        }

        // 🎮 Gamepad input handling
        const gamepads = navigator.getGamepads();
        const gp = gamepads[0];
        const now = performance.now();

        if (gp && gp.connected) {
            this.usingGamepad = true;

            // 🕹️ Move crosshair
            const deadzone = 0.2;
            const lx = Math.abs(gp.axes[0]) > deadzone ? gp.axes[0] : 0;
            const ly = Math.abs(gp.axes[1]) > deadzone ? gp.axes[1] : 0;
            const speed = this.crosshairspeed;

            this.crosshairTarget.x += lx * speed;
            this.crosshairTarget.y += ly * speed;

            this.crosshairTarget.x = Math.max(0, Math.min(this.canvas.width, this.crosshairTarget.x));
            this.crosshairTarget.y = Math.max(0, Math.min(this.canvas.height, this.crosshairTarget.y));

            // 🅰️ A button (click or hold)
            if (gp.buttons[0].pressed) {
                if (!this.aPressedLastFrame && this.animationStep >= 1.0) {
                    this.aHoldStart = now;

                    // ✅ Start dragging immediately on hold
                    const fakeEvt = {offsetX: this.crosshair.x, offsetY: this.crosshair.y};
                    this.handleMouseDown(fakeEvt);
                    this.isGamepadDragging = true;
                }
                this.aPressedLastFrame = true;
            } else {
                if (this.aPressedLastFrame && this.animationStep >= 1.0) {
                    const heldFor = now - this.aHoldStart;
                    const fakeEvt = {offsetX: this.crosshair.x, offsetY: this.crosshair.y};

                    if (heldFor < this.holdThreshold) {
                        this.simulateClick(this.crosshair.x, this.crosshair.y);
                    } else {
                        this.handleMouseUp(fakeEvt); // ✅ drop
                        this.isGamepadDragging = false;
                    }
                }
                this.aPressedLastFrame = false;
            }


            // 🔁 L1 (button 4): Snap to previous (with repeat)
            if (gp.buttons[4].pressed && !this.isGamepadDragging && this.animationStep >= 1.0) {
                if (this.leftBumperHeldTime === 0) {
                    this.snapToPrevIngredient();
                    this.leftBumperHeldTime = now;
                } else if (now - this.leftBumperHeldTime > this.snapRepeatDelay) {
                    if (!this.lastLeftSnap || now - this.lastLeftSnap > this.snapRepeatRate) {
                        this.snapToPrevIngredient();
                        this.lastLeftSnap = now;
                    }
                }
            } else {
                this.leftBumperHeldTime = 0;
                this.lastLeftSnap = 0;
            }

            // 🔁 R1 (button 5): Snap to next (with repeat)
            if (gp.buttons[5].pressed && !this.isGamepadDragging && this.animationStep >= 1.0) {
                if (this.rightBumperHeldTime === 0) {
                    this.snapToNextIngredient();
                    this.rightBumperHeldTime = now;
                } else if (now - this.rightBumperHeldTime > this.snapRepeatDelay) {
                    if (!this.lastRightSnap || now - this.lastRightSnap > this.snapRepeatRate) {
                        this.snapToNextIngredient();
                        this.lastRightSnap = now;
                    }
                }
            } else {
                this.rightBumperHeldTime = 0;
                this.lastRightSnap = 0;
            }
        }

        // 🧲 Drag follows crosshair
        if (this.isGamepadDragging) {
            const draggingIng = this.activeIngredients.find(i => i.dragging);
            if (draggingIng) {
                const lerp = 0.4;
                draggingIng.x += (this.crosshair.x - draggingIng.w / 2 - draggingIng.x) * lerp;
                draggingIng.y += (this.crosshair.y - draggingIng.h / 2 - draggingIng.y) * lerp;
            }
        }

        // 🎯 Crosshair easing
        const lerpFactor = 0.6;
        this.crosshair.x += (this.crosshairTarget.x - this.crosshair.x) * lerpFactor;
        this.crosshair.y += (this.crosshairTarget.y - this.crosshair.y) * lerpFactor;

        // ⏱️ Snap animation progress
        if (this.animationStep < 1.0) {
            this.animationStep += 0.1;
        }
    }


    draw() {


        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        drawHorizontalFadeRect(this.ctx, 50, 50, 800, 600, "rgba(30, 30, 60, 0.4)", "both");
        drawSlider(this.ctx, 50, 30, 300, 20);
        this.ctx.fillStyle = "#654321";
        this.ctx.drawImage(this.potImage, this.pot.x, this.pot.y, this.pot.w, this.pot.h);
        this.ctx.fillStyle = "rgba(100, 60, 30, 0.5)";
        this.ctx.fillRect(this.inventorybag.x, this.inventorybag.y, this.inventorybag.w, this.inventorybag.h);
        this.ctx.strokeStyle = "white";
        this.ctx.strokeRect(this.inventorybag.x, this.inventorybag.y, this.inventorybag.w, this.inventorybag.h);
        this.ctx.fillStyle = "white";
        this.ctx.fillText("Inventory", this.inventorybag.x + 10, this.inventorybag.y + 20);


        //const potrect=this.ctx.fillRect(this.pot.x, this.pot.y, this.pot.w, this.pot.h);

        // 🔮 Draw ghost recipe if a valid combo is detected
        if (this.currentRecipe && this.itemLibrary[this.currentRecipe.output]) {
            const outputItem = this.itemLibrary[this.currentRecipe.output];
            const img = new Image();
            img.src = outputItem.image;

            const pulse = (Math.sin(this.ghostGlowTime) + 1) / 2;
            const glowSize = 15 + pulse * 15;
            const alpha = 0.5 + pulse * 0.3;

            const {ghostX, ghostY, ghostW, ghostH} = this.getGhostRect();


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
            this.ctx.strokeStyle = 'yellow';
            for (const ing of this.activeIngredients) {
                this.ctx.strokeRect(ing.x, ing.y, ing.w, ing.h);
            }

        }

        //gamepad crosshair drawing
        if (this.usingGamepad) {
            drawCrosshair(this.ctx, this.crosshair.x, this.crosshair.y, this.crosshairRadius);
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
        const ing = this.addIngredient(this.currentRecipe.output);
        ing.cut = true;
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
        const {offsetX, offsetY} = e;
        if (this.currentRecipe) {
            const {ghostX, ghostY, ghostW, ghostH} = this.getGhostRect();
            if (
                offsetX >= ghostX &&
                offsetX <= ghostX + ghostW &&
                offsetY >= ghostY &&
                offsetY <= ghostY + ghostH
            ) {
                this.finishRecipe();
                this.ringsound.play();
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
                this.grabSound.play();

            }
        }

        // Animate knife
        this.customCursor.style.transition = 'transform 0.1s';
        this.customCursor.style.transform = `rotate(-45deg)`;


    }

    handleMouseMove(e) {
        const {offsetX, offsetY, pageX, pageY} = e;

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

                const insidePot =
                    ing.x + ing.w > this.potHit.x &&
                    ing.x < this.potHit.x + this.potHit.w &&
                    ing.y + ing.h > this.potHit.y &&
                    ing.y < this.potHit.y + this.potHit.h;


                const insideInventory =
                    ing.x + ing.w > this.inventorybag.x &&
                    ing.x < this.inventorybag.x + this.inventorybag.w &&
                    ing.y + ing.h > this.inventorybag.y &&
                    ing.y < this.inventorybag.y + this.inventorybag.h;

                if (insidePot) {
                    ing.isCooking = true;
                    this.sizzleSound.currentTime = 0;
                    this.sizzleSound.play();
                } else {
                    ing.isCooking = false;
                }

                //  Move to inventory if dropped there
                if (insideInventory) {
                    this.networkClient.addInventoryItem(ing.name);
                    this.removeIngredient(ing);


                    //  Notify server / network client
                    if (this.networkClient) {
                        this.networkClient.addInventoryItem(ing.name);
                        this.dropsound.play();
                    } else {
                        console.warn("⚠️ No network client linked to CookingGame!");
                    }
                    // Optional: visual feedback
                    this.ctx.fillStyle = "rgba(255,255,255,0.1)";
                    this.ctx.fillText(`+ ${ing.name} added to inventory`, this.inventorybag.x + 20, this.inventorybag.y + 40);
                }

                //  Snap back if dropped outside valid zones (unless burned)
                else if (!insidePot && !insideInventory) {
                    if (ing.state !== this.ingredientPhase.BURNED) {
                        ing.x = ing.originalX ?? 200;
                        ing.y = ing.originalY ?? 50;
                    }
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
        const ghostW = 100;
        const ghostH = 100;
        const ghostX = this.pot.x + 130+ this.pot.w / 2 - ghostW / 2;
        const ghostY = this.pot.y + 400 + pulseY*2;

        return { ghostX, ghostY, ghostW, ghostH };
    }
    removeIngredient(ingredient) {
        this.activeIngredients = this.activeIngredients.filter(i => i !== ingredient);
        this.addedIngredients = this.addedIngredients.filter(i => i !== ingredient);
    }

    //GAMEPAD FUNCTIONS
    snapToNextIngredient() {
        if (this.animationStep < 1.0) return; // 🧱 don't allow snapping mid-animation
        if (!this.activeIngredients?.length) return;

        this.animationStep = 0;
        this.snapIndex = (this.snapIndex + 1) % this.activeIngredients.length;
        const ing = this.activeIngredients[this.snapIndex];
        this.crosshairTarget.x = ing.x + ing.w / 2;
        this.crosshairTarget.y = ing.y + ing.h / 2;
    }

    snapToPrevIngredient() {
        if (this.animationStep < 1.0) return; // 🧱 block mid-animation
        if (!this.activeIngredients?.length) return;

        this.animationStep = 0;
        this.snapIndex = (this.snapIndex - 1 + this.activeIngredients.length) % this.activeIngredients.length;
        const ing = this.activeIngredients[this.snapIndex];
        this.crosshairTarget.x = ing.x + ing.w / 2;
        this.crosshairTarget.y = ing.y + ing.h / 2;
    }
    trySnapNext() {
        // don't snap while animating or dragging
        if (this.animationStep < 1.0) return;
        if (this.isGamepadDragging) return;
        this.snapToNextIngredient();
    }

    trySnapPrev() {
        if (this.animationStep < 1.0) return;
        if (this.isGamepadDragging) return;
        this.snapToPrevIngredient();
    }


    simulateClick(x, y) {
        // Prevent clicking while snapping
        if (this.animationStep < 1.0) return;
        const fakeEvent = { offsetX: x, offsetY: y };
        this.handleMouseDown(fakeEvent);
        setTimeout(() => this.handleMouseUp(fakeEvent), 100);
    }


    initializeDropListener() {
        console.log("bounds was:" +this.canvas.getBoundingClientRect());
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
        this.originalX = x;
        this.originalY = y;
        this.w = 70;
        this.h = 70;
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
