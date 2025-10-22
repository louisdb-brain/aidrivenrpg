export class VirtualCursor {
    constructor(uiCanvases = []) {
        this.uiCanvases = Array.isArray(uiCanvases) ? uiCanvases : [uiCanvases];
        this.position = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        this.speed = 15;
        this.deadzone = 0.2;
        this.isDragging = false;

        // --- Create visible cursor element ---
        this.cursorEl = document.createElement('div');
        Object.assign(this.cursorEl.style, {
            position: 'fixed',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'white',
            border: '2px solid black',
            pointerEvents: 'none',
            zIndex: '999999',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 10px rgba(0,0,0,0.6)'
        });
        document.body.appendChild(this.cursorEl);

        window.addEventListener('resize', () => {
            this.position.x = Math.min(this.position.x, window.innerWidth);
            this.position.y = Math.min(this.position.y, window.innerHeight);
        });
    }

    /** Update cursor from right stick input */
    updateFromAxes(xAxis, yAxis) {
        if (Math.abs(xAxis) < this.deadzone) xAxis = 0;
        if (Math.abs(yAxis) < this.deadzone) yAxis = 0;

        this.position.x += xAxis * this.speed;
        this.position.y += yAxis * this.speed;

        // Clamp to window bounds
        this.position.x = Math.max(0, Math.min(window.innerWidth, this.position.x));
        this.position.y = Math.max(0, Math.min(window.innerHeight, this.position.y));

        // Move visible cursor
        this.cursorEl.style.left = `${this.position.x}px`;
        this.cursorEl.style.top = `${this.position.y}px`;

        // --- Fire pointermove for hover / drag ---
        const target = this.getTargetCanvas();
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const offsetX = this.position.x - rect.left;
        const offsetY = this.position.y - rect.top;

        const moveEvt = new PointerEvent('pointermove', {
            clientX: this.position.x,
            clientY: this.position.y,
            bubbles: true,
            buttons: this.isDragging ? 1 : 0
        });

        // Manually patch offsetX/Y so canvas logic (like CookingGame) works
        Object.defineProperties(moveEvt, {
            offsetX: { value: offsetX, configurable: true },
            offsetY: { value: offsetY, configurable: true }
        });

        target.dispatchEvent(moveEvt);
    }

    /** Simulate mouse press */
    press(button = 0) {
        const target = this.getTargetCanvas();
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const offsetX = this.position.x - rect.left;
        const offsetY = this.position.y - rect.top;

        const ev = new PointerEvent('pointerdown', {
            clientX: this.position.x,
            clientY: this.position.y,
            button,
            bubbles: true
        });
        Object.defineProperties(ev, {
            offsetX: { value: offsetX, configurable: true },
            offsetY: { value: offsetY, configurable: true }
        });

        this.isDragging = true;
        target.dispatchEvent(ev);
        this.flash();
    }

    /** Simulate mouse release */
    release(button = 0) {
        const target = this.getTargetCanvas();
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const offsetX = this.position.x - rect.left;
        const offsetY = this.position.y - rect.top;

        const ev = new PointerEvent('pointerup', {
            clientX: this.position.x,
            clientY: this.position.y,
            button,
            bubbles: true
        });
        Object.defineProperties(ev, {
            offsetX: { value: offsetX, configurable: true },
            offsetY: { value: offsetY, configurable: true }
        });

        target.dispatchEvent(ev);

        // Optionally trigger a click
        const clickEvt = new MouseEvent('click', {
            clientX: this.position.x,
            clientY: this.position.y,
            button
        });
        Object.defineProperties(clickEvt, {
            offsetX: { value: offsetX, configurable: true },
            offsetY: { value: offsetY, configurable: true }
        });

        target.dispatchEvent(clickEvt);
        this.isDragging = false;
    }

    /** Flash the cursor visually when clicking */
    flash() {
        this.cursorEl.style.transform = 'scale(0.8) translate(-50%, -50%)';
        setTimeout(() => {
            this.cursorEl.style.transform = 'scale(1) translate(-50%, -50%)';
        }, 100);
    }

    /** Determine which canvas or element to send events to */
    getTargetCanvas() {
        if (!this.uiCanvases || this.uiCanvases.length === 0)
            return document.elementFromPoint(this.position.x, this.position.y);

        // Iterate from topmost to bottom
        for (let i = this.uiCanvases.length - 1; i >= 0; i--) {
            const canvas = this.uiCanvases[i];
            if (!canvas || canvas.style.display === 'none') continue;

            const rect = canvas.getBoundingClientRect();
            if (
                this.position.x >= rect.left &&
                this.position.x <= rect.right &&
                this.position.y >= rect.top &&
                this.position.y <= rect.bottom
            ) {
                return canvas;
            }
        }

        return document.elementFromPoint(this.position.x, this.position.y);
    }
}
