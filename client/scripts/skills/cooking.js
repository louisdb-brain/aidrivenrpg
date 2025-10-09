
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

        this.ingredientsReady = false;
        fetch('/ingredients.json')
            .then(res => res.json())
            .then(data => {
                data.forEach(item => {
                    this.itemLibrary[item.id] = item;
                    //console.log(this.itemLibrary);
                });
                this.ingredientsReady = true;

                this.addIngredient("steak");
                this.addIngredient("onion");
                this.addIngredient("steak");
            });

        this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
        this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
        this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
        this.canvas.addEventListener("mouseleave", this.handleMouseLeave.bind(this));


        this.activeIngredients = [];
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
            this.shortSizzleSound
        );

        this.activeIngredients.push(ing);
        console.log("Spawned ingredient:", name, ing);
    }

    handleMouseDown(e) {
        const { offsetX, offsetY } = e;
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


    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "#654321";
        this.ctx.drawImage(this.potImage, this.pot.x, this.pot.y, this.pot.w, this.pot.h);
        this.ctx.drawImage(this.boardImage, 30, 30, 400, 500);
        //const potrect=this.ctx.fillRect(this.pot.x, this.pot.y, this.pot.w, this.pot.h);


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
    constructor(x, y, name, phases,imagePath,psizzlesound) {

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
        this.sizzlesound=psizzlesound;
        this.hasPlayedSound=false;
    }

    update() {
        if (this.isCooking) {
            this.state = this.phases.COOKING;
            this.timeCooking++;

            if (this.timeCooking > this.burnTime && this.state !== this.phases.BURNED) {
                this.state = this.phases.BURNED;
                if (!this.hasPlayedSound) {
                    this.sizzlesound.currentTime = 0;
                    this.sizzlesound.play().catch(console.error);
                    this.hasPlayedSound = true;
                }
            } else if (this.timeCooking > this.cookTime && this.state !== this.phases.DONE) {
                this.state = this.phases.DONE;

                if (!this.hasPlayedSound) {
                    this.sizzlesound.currentTime = 0;
                    this.sizzlesound.play().catch(console.error);
                    this.hasPlayedSound = true;
                }
                if(this.timeCooking==this.burnTime-1) this.hasPlayedSound=false;
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
        //console.log(this.x, this.y);
        return (
            x >= this.x &&
            x <= this.x + this.w &&
            y >= this.y &&
            y <= this.y + this.h
        );
    }
}
