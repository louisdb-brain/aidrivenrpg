import { VirtualCursor } from "./virtualCursor.js";

export class gamepad {
    constructor(networkhandeler, game) {
        this.navigator = navigator;
        this.networkhandeler = networkhandeler;
        this.game = game;
        this.connected = true;
        this.gamepadId = null;

        this._eventTarget = new EventTarget(); //  internal event system
        this._buttonStates = {}; // tracks held buttons

        this.virtualCursor = new VirtualCursor();

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
        let isDragging = false;  // internal drag state
        const loop = () => {
            const gp = this.navigator.getGamepads()[0];
            if (gp) {
                gp.buttons.forEach((button, index) => {
                    const isPressed = button.pressed;
                    const wasPressed = this._buttonStates[index] || false;

                    // --- Button pressed ---
                    if (isPressed && !wasPressed) {
                        this._eventTarget.dispatchEvent(new CustomEvent("buttondown", { detail: { button: index } }));

                        // 🎯 Right stick press (R3)
                        if (index === 10 && this.virtualCursor) {
                            this.virtualCursor.press(0);   // left mouse down
                            this.virtualCursor.flash();
                            isDragging = true;
                        }

                        // Example: Left stick press (L3) for right click
                        // if (index === 9 && this.virtualCursor) {
                        //     this.virtualCursor.press(2);
                        // }
                    }

                    // --- Button released ---
                    else if (!isPressed && wasPressed) {
                        this._eventTarget.dispatchEvent(new CustomEvent("buttonup", { detail: { button: index } }));

                        // 🎯 Release R3
                        if (index === 10 && this.virtualCursor) {
                            this.virtualCursor.release(0);
                            isDragging = false;
                        }

                        // if (index === 9 && this.virtualCursor) {
                        //     this.virtualCursor.release(2);
                        // }
                    }

                    this._buttonStates[index] = isPressed;
                });

                // 🌀 If dragging, send pointermove each frame to simulate dragging
                if (isDragging && this.virtualCursor) {
                    const dragEvt = new PointerEvent('pointermove', {
                        clientX: this.virtualCursor.position.x,
                        clientY: this.virtualCursor.position.y,
                        buttons: 1
                    });
                    window.dispatchEvent(dragEvt);
                }
            }

            requestAnimationFrame(loop);
        };
        loop();
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
