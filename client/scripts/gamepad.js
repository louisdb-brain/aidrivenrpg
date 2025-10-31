import { VirtualCursor } from "./virtualCursor.js";

export class gamepad {
    constructor(networkhandeler, game) {
        this.navigator = navigator;
        this.networkhandeler = networkhandeler;
        this.game = game;
        this.connected = false;
        this.gamepadId = null;

        this._eventTarget = new EventTarget();
        this._buttonStates = {};
        this.virtualCursor = new VirtualCursor();
        this.prevButtons = [];

        window.addEventListener("gamepadconnected", (e) => {
            console.log("🎮 Gamepad connected:", e.gamepad.id);
            this.connected = true;
            this.index = e.gamepad.index;
            this.watchButtons(); // ✅ Start polling only when connected
        });

        window.addEventListener("gamepaddisconnected", () => {
            console.log("❌ Gamepad disconnected");
            this.connected = false;
        });
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
        const gamepads = navigator.getGamepads();
        const gp = gamepads[this.index];
        if (!gp) {
            requestAnimationFrame(() => this.watchButtons());
            return;
        }

        // ✅ Debug feedback
        if (!this._debugLog || performance.now() - this._debugLog > 1000) {
            console.log("Polling gamepad:", gp.id);
            this._debugLog = performance.now();
        }

        for (let i = 0; i < gp.buttons.length; i++) {
            const button = gp.buttons[i];
            const pressed = button.pressed;

            if (pressed && !this.prevButtons[i]) {
                this._eventTarget.dispatchEvent(
                    new CustomEvent("buttondown", { detail: { button: i } })
                );
            }

            if (!pressed && this.prevButtons[i]) {
                this._eventTarget.dispatchEvent(
                    new CustomEvent("buttonup", { detail: { button: i } })
                );
            }

            this.prevButtons[i] = pressed;
        }

        requestAnimationFrame(() => this.watchButtons());
    }




    loop() {
        const gp = this.navigator.getGamepads()[0];
        if (!gp) {
            requestAnimationFrame(() => this.loop());
            return;
        }

        // Left stick still moves player
        const move = this.getGamepadVector();
        this.sendInputTarget(move.x, move.y);

        // Right stick moves the cursor
        const xAxis = gp.axes[2] || 0;
        const yAxis = gp.axes[3] || 0;
        this.virtualCursor.updateFromAxes(xAxis, yAxis);

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
