export class gamepad {
    constructor(networkhandeler,game){
        this.navigator=navigator;
        this.networkhandeler=networkhandeler;
        this.game=game;
        this.connected =true;
        this.gamepadId=null;
    }
    loop(){
        const gamepadvector=this.getGamepadVector();
        if(gamepadvector.x!=0&&gamepadvector.y!=0){
            this.sendInputVector(gamepadvector);
            console.log(gamepadvector);
        }
    }
    getGamepadVector() {
        const gp = this.navigator.getGamepads()[0]; // first gamepad
        if (!gp) return { x: 0, y: 0 };

        let x = gp.axes[0] || 0;
        let y = gp.axes[1] || 0;

        // deadzone
        const dead = 0.2;
        if (Math.abs(x) < dead) x = 0;
        if (Math.abs(y) < dead) y = 0;

        const len = Math.hypot(x, y);
        if (len > 1) { x /= len; y /= len; }

        return { x, y };
    }
    sendInputVector(x, y) {
        this.networkhandeler.sendInputVector(x, y);
        this.game.sendInputVector(x, y,this.networkhandeler.getsocket());
    }
}



