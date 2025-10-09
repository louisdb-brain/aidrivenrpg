export class inventorySim{
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
        this.backpack = { x: 20, y: 20, w: 500, h: 600 };
        this.backpackImg = new Image();
        this.backpackImg.src = '/sprites/backpack_open.png';

        this.backpackImg.onload = () => {
            console.log('Image loaded!');
            this.ctx.drawImage(this.backpackImg, this.backpack.x, this.backpack.y, this.backpack.w, this.backpack.h);
            this.debugFallboxDrawing();
        };
        this.backpack.onerror = () => console.error('Failed to load image!');
        this.fallbox={x:120,y:150,w:270,h:340}
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
        const randX = 120 + Math.random() * (370 - 120);

        const item = new itemPhysical(randX,20,name,imagePath,"nosound");
        this.items.push(item);

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

    }
    draw(ctx){
        //ctx.fillStyle="orange";
        //ctx.fillRect(this.x,this.y,this.w,this.h);
        if (this.image && this.image.complete && this.image.naturalWidth !== 0) {
            ctx.drawImage(this.image,this.x,this.y);
        }
    }
    update(ctx,objectArray) {
        if (!this.supported) {
            this.fallspeed += 0.3; // gravity
            this.y += this.fallspeed;
        } else {
            this.fallspeed = 0;
        }

        //this.checkCollision(objectArray);

        // keep inside bag (bottom edge at 900px for example)
        if (this.y + this.h > this.bagBottom) {
            this.y = this.bagBottom - this.h;
            this.supported = true;
        }
        this.draw(ctx);
    }
    checkCollision(objectArray) {
        let stable = false;


        for (let other of objectArray) {
            if (other === this) continue;

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