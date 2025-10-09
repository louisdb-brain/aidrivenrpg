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

        this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
        this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
        this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
        this.canvas.addEventListener("mouseleave", this.handleMouseLeave.bind(this));


    }

}
export class itemPhysical{
    constructor(x,y,name,imagepath,pickupsound) {

        this.x = x;
        this.y = y;
        this.w = 100;
        this.h = 100;
        this.supported = false;
        this.fallspeed = 0
        this.bagBottom=900;
    }
    update(objectArray) {
        if (!this.supported) {
            this.fallspeed += 0.3; // gravity
            this.y += this.fallspeed;
        } else {
            this.fallspeed = 0;
        }

        this.checkCollision(objectArray);

        // keep inside bag (bottom edge at 900px for example)
        if (this.y + this.h > 900) {
            this.y = this.bagBottom - this.h;
            this.supported = true;
        }
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