export class inventorySim{
    constructor(canvas) {
        // Create a new canvas for UI
        this.canvas = document.createElement('canvas');
        this.canvas.id = "uiCanvas";
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '';
        this.canvas.style.zIndex = '10';
        this.canvas.style.pointerEvents = 'auto'; // allow mouse input

        // Append to body (or to a wrapper if you prefer)
        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        this.items=[];
        this.itemLibrary = {};
        this.physicsResolved=false;
        this.libraryloaded=false;
        fetch('/ingredients.json')
            .then(res => res.json())
            .then(data => {
                data.forEach(item => {
                    this.itemLibrary[item.id] = item;
                    //console.log(this.itemLibrary);
                });
                this.libraryloaded = true;


            });
        this.backpack = { x: this.canvas.width - 500, y: 20, w: 500, h: 600 };
        this.backpackImg = new Image();
        this.backpackImg.src = '/sprites/backpack_open.png';

        this.backpackImg.onload = () => {
            console.log('Image loaded!');
            this.ctx.drawImage(this.backpackImg, this.backpack.x, this.backpack.y, this.backpack.w, this.backpack.h);
            this.debugFallboxDrawing();
        };
        this.backpack.onerror = () => console.error('Failed to load image!');
        this.fallbox={x:120,y:150,w:270,h:340}


        this.canvas.addEventListener("mousedown", e => this.handleMouseDown(e));
        this.canvas.addEventListener("mousemove", e => this.handleMouseMove(e));
        this.canvas.addEventListener("mouseup",   e => this.handleMouseUp(e));

        this.draggedItem = null;

        //this.items.push(new itemPhysical(200,20,"onion1","./sprites/onion.png","nosounds"));
        //this.items[0].bagBottom=this.fallbox.y+this.fallbox.h



        /*
        this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
        this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
        this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
        this.canvas.addEventListener("mouseleave", this.handleMouseLeave.bind(this));
        */

    }
    update()
    {

        this.physicsResolved=false;
        if(!this.physicsResolved){
            this.checkResolved()
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.backpackImg, this.backpack.x, this.backpack.y, this.backpack.w, this.backpack.h);

            for(let item of this.items){

                item.update(this.ctx,this.items);
            }

        }
    }
    checkResolved(){
        this.physicsResolved=true;
        for(let i of this.items){
            if(i.supported==false)
            {
                this.physicsResolved=false;
            }
        }
    }
    toggle() {
        this.canvas.style.display = this.canvas.style.display === 'none' ? 'block' : 'none';
    }
    debugFallboxDrawing()
    {
        this.ctx.fillStyle="orange";
        this.ctx.fillRect(this.fallbox.x,this.fallbox.y,this.fallbox.w,this.fallbox.h)
    }
    addItem(name, imagePath) {
        const randX = this.canvas.width - 500 + Math.random() * (370 - 120);

        const item = new itemPhysical(randX,20,name,imagePath,"nosound");

        item.bagBottom = this.fallbox.y + this.fallbox.h;
        this.items.push(item);

    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // check if an item was clicked (topmost first)
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            if (
                mouseX >= item.x && mouseX <= item.x + item.w &&
                mouseY >= item.y && mouseY <= item.y + item.h
            ) {
                item.dragging = true;
                this.draggedItem = item;
                item.offsetX = mouseX - item.x;
                item.offsetY = mouseY - item.y;

                // bring to front
                this.items.splice(i, 1);
                this.items.push(item);
                break;
            }
        }
    }

    handleMouseMove(e) {
        if (!this.draggedItem) return;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        this.draggedItem.x = mouseX - this.draggedItem.offsetX;
        this.draggedItem.y = mouseY - this.draggedItem.offsetY;
    }

    handleMouseUp(e) {
        if (this.draggedItem) {
            this.draggedItem.dragging = false;
            this.snapToInventoryBounds(this.draggedItem);

            // Make it fall again
            this.draggedItem.supported = false;
            this.draggedItem.fallspeed = 0;

            this.draggedItem = null;
        }
    }


    snapToInventoryBounds(item) {
        const bag = this.backpack;
        if (
            item.x < bag.x || item.x + item.w > bag.x + bag.w ||
            item.y < bag.y || item.y + item.h > bag.y + bag.h
        ) {
            // snap inside bounds
            item.x = Math.min(Math.max(item.x, bag.x), bag.x + bag.w - item.w);
            item.y = Math.min(Math.max(item.y, bag.y), bag.y + bag.h - item.h);
        }
    }


}
export class itemPhysical{
    constructor(x,y,name,imagePath,pickupsound) {
        this.name=name;
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
        this.supported = false;
        this.fallspeed = 0
        this.bagBottom=500;
        this.dragging = false;
        this.offsetX = 0;
        this.offsetY = 0;

    }
    draw(ctx){
        //ctx.fillStyle="orange";
        //ctx.fillRect(this.x,this.y,this.w,this.h);
        if (this.image && this.image.complete && this.image.naturalWidth !== 0) {
            ctx.drawImage(this.image,this.x,this.y,this.w,this.h);
        }
    }
    update(ctx, objectArray) {
        if (this.dragging) {
            // Don't apply gravity while dragging
            this.fallspeed = 0;

            // Draw slightly larger or highlighted while dragging
            ctx.save();
            ctx.globalAlpha = 0.9;
            ctx.shadowColor = "rgba(255,255,255,0.5)";
            ctx.shadowBlur = 10;
            this.draw(ctx);
            ctx.restore();
            return;
        }

        if (!this.supported) {
            this.fallspeed += 0.3; // gravity
            this.y += this.fallspeed;

            // ✅ Check collisions only against supported (stationary) items below
            for (const other of objectArray) {
                if (other === this) continue; // skip self
                if (!other.supported) continue; // skip moving items
                if (this.y > other.y) continue; // skip those above this item

                const horizontallyAligned =
                    this.x + this.w > other.x && this.x < other.x + other.w;

                const verticallyTouching =
                    this.y + this.h > other.y &&
                    this.y + this.h - this.fallspeed < other.y;

                if (horizontallyAligned && verticallyTouching) {
                    // ✅ Landed on a stable item
                    this.y = other.y - this.h - 0.5;
                    this.supported = true;
                    this.fallspeed = 0;
                    break;
                }
            }

            // ✅ Also check bottom of bag
            if (this.y + this.h > this.bagBottom) {
                this.y = this.bagBottom - this.h;
                this.supported = true;
                this.fallspeed = 0;
            }
        } else {
            this.fallspeed = 0;
        }


        this.draw(ctx);
    }

    checkCollision(objectArray) {
        let stable = false;


        for (let other of objectArray) {cd
            if (other === this || other.dragging) continue;


            const result = this.checkRay(other.x, other.y, other.w, other.h);

            if (result === "STABLE") {
                this.y = other.y - this.h; // snap on top
                this.fallspeed = 0;
                stable = true;
            } else if (result === "LEFT") {
                this.x -= 1;
            } else if (result === "RIGHT") {
                this.x += 1;
            }
        }

        this.supported = stable;
    }
    checkRay(x, y, width, height) {
        const checkPoint = offset =>
            this.x + offset > x &&
            this.x + offset < x + width &&
            this.y + this.fallspeed > y &&
            this.y + this.fallspeed < y + height;

        const [leftHit, rightHit] = [
            checkPoint(this.w / 8),
            checkPoint((this.w / 8) * 7)
        ];

        return leftHit && rightHit ? "STABLE"
            : rightHit ? "RIGHT"
                : leftHit ? "LEFT"
                    : undefined;
    }





}