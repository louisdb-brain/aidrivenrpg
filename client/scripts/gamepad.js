export class gamepad {
    constructor(networkhandeler, game) {
        this.navigator = navigator;
        this.networkhandeler = networkhandeler;
        this.game = game;
        this.connected = true;
        this.gamepadId = null;

        this._eventTarget = new EventTarget(); //  internal event system
        this._buttonStates = {}; // tracks held buttons

        this.watchButtons(); // 🔁 start tracking button states
    }

    addEventListener(...args) {
        this._eventTarget.addEventListener(...args);
    }

    removeEventListener(...args) {
        this._eventTarget.removeEventListener(...args);
    }

    dispatchEvent(...args) {
        this._eventTarget.dispatchEvent(...args);
    }

    watchButtons() {
        const loop = () => {
            const gp = this.navigator.getGamepads()[0];
            if (gp) {
                gp.buttons.forEach((button, index) => {
                    const isPressed = button.pressed;
                    const wasPressed = this._buttonStates[index] || false;

                    if (isPressed && !wasPressed) {
                        this._eventTarget.dispatchEvent(new CustomEvent("buttondown", { detail: { button: index } }));
                    } else if (!isPressed && wasPressed) {
                        this._eventTarget.dispatchEvent(new CustomEvent("buttonup", { detail: { button: index } }));
                    }

                    this._buttonStates[index] = isPressed;
                });
            }
            requestAnimationFrame(loop);
        };
        loop();
    }

    loop() {
        const gamepadvector = this.getGamepadVector();
        this.sendInputTarget(gamepadvector.x, gamepadvector.y);

        requestAnimationFrame(() => this.loop());
    }

    getGamepadVector() {
        const gp = this.navigator.getGamepads()[0];
        if (!gp) return { x: 0, y: 0 };

        let x = gp.axes[0] || 0;
        let y = gp.axes[1] || 0;

        const dead = 0.2;
        if (Math.abs(x) < dead) x = 0;
        if (Math.abs(y) < dead) y = 0;

        const len = Math.hypot(x, y);
        if (len > 1) { x /= len; y /= len; }

        return { x, y };
    }

    sendInputTarget(x, y) {
        const localid = this.networkhandeler.getsocket().id;
        const player = this.game.players[localid];
        let target = player.position.clone();
        target.x += x;
        target.z += y;
        player.setTarget(target);
        this.networkhandeler.sendTarget(target, false);
        //console.log(target);
        this.inputTick = 0;
    }
}
