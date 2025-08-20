export class Inventory {
    constructor({
                    cols = 4,
                    rows = 2,
                    slotSize = 64,
                    parent = document.body,
                    position = 'fixed',
                    left = 20,
                    top = 20,
                    zIndex = 1000
                } = {}) {
        this.cols = cols;
        this.rows = rows;
        this.slotSize = slotSize;

        // Create canvas
        this.canvas = document.createElement('canvas');
        Object.assign(this.canvas.style, {
            position,
            left: `${left}px`,
            top: `${top}px`,
            zIndex,
            background: '#222',
            borderRadius: '8px',
            touchAction: 'none'
        });
        parent.appendChild(this.canvas);

        // Handle high-DPI displays
        this.setupCanvasResolution();

        this.ctx = this.canvas.getContext('2d');
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        // Slots & items
        this.slots = [];
        this.items = [];
        this.inventory = new Array(cols * rows).fill(null);
        this.draggingItem = null;
        this.dragOffset = { x: 0, y: 0 };
        this.hoverSlotIndex = -1;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                this.slots.push(new Slot(x, y, slotSize));
            }
        }

        this.initEvents();
        this.draw();

        // Dummy item
        //this.addItem('onion', 'sprites/onion.png', 0);
    }

    setupCanvasResolution() {
        this.dpr = window.devicePixelRatio || 1;
        const w = this.cols * this.slotSize;
        const h = this.rows * this.slotSize;
        this.canvas.style.width = `${w}px`;
        this.canvas.style.height = `${h}px`;
        this.canvas.width = w * this.dpr;
        this.canvas.height = h * this.dpr;
    }

    initEvents() {
        this.canvas.addEventListener('pointerdown', this.onDown.bind(this));
        this.canvas.addEventListener('pointermove', this.onMove.bind(this));
        this.canvas.addEventListener('pointerup', this.onUp.bind(this));
        this.canvas.addEventListener('pointerleave', this.onLeave.bind(this));
    }

    addItem(name, imagePath, slotIndex = null) {
        const item = new Item(name, imagePath, this.slotSize, () => this.draw());
        const index = slotIndex ?? this.inventory.findIndex(v => v === null);
        if (index !== -1) {
            this.placeItemInSlot(item, index);
        }
        this.items.push(item);
        this.draw();
        return item;
    }

    placeItemInSlot(item, index) {
        const slot = this.slots[index];
        item.x = slot.x;
        item.y = slot.y;
        item.slotIndex = index;
        this.inventory[index] = item;
    }

    pointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width) / this.dpr;
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height) / this.dpr;
        return { x, y };
    }

    slotIndexFromPos(x, y, clamp = true) {
        const col = clamp
            ? Math.max(0, Math.min(this.cols - 1, Math.floor(x / this.slotSize)))
            : Math.floor(x / this.slotSize);
        const row = clamp
            ? Math.max(0, Math.min(this.rows - 1, Math.floor(y / this.slotSize)))
            : Math.floor(y / this.slotSize);
        const idx = row * this.cols + col;
        return idx >= 0 && idx < this.slots.length ? idx : -1;
    }

    onDown(e) {
        this.canvas.setPointerCapture(e.pointerId);
        const { x, y } = this.pointerPos(e);

        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            if (item.hitTest(x, y)) {
                this.draggingItem = item;
                this.dragOffset.x = x - item.x;
                this.dragOffset.y = y - item.y;
                this.items.splice(i, 1);
                this.items.push(item);
                if (item.slotIndex !== null) {
                    this.inventory[item.slotIndex] = null;
                    item.slotIndex = null;
                }
                break;
            }
        }

        this.hoverSlotIndex = this.slotIndexFromPos(x, y);
        this.draw();
    }

    onMove(e) {
        const { x, y } = this.pointerPos(e);
        if (this.draggingItem) {
            this.draggingItem.x = x - this.dragOffset.x;
            this.draggingItem.y = y - this.dragOffset.y;
        }
        this.hoverSlotIndex = this.slotIndexFromPos(x, y);
        this.draw();
    }

    onUp(e) {
        const { x, y } = this.pointerPos(e);
        if (this.draggingItem) {
            const target = this.slotIndexFromPos(x, y);
            if (target !== -1) {
                const occupying = this.inventory[target];
                if (occupying) {
                    const oldIndex = occupying.slotIndex;
                    this.placeItemInSlot(this.draggingItem, target);
                    if (oldIndex !== null) this.placeItemInSlot(occupying, oldIndex);
                } else {
                    this.placeItemInSlot(this.draggingItem, target);
                }
            }
        }
        this.draggingItem = null;
        this.hoverSlotIndex = -1;
        this.canvas.releasePointerCapture(e.pointerId);
        this.draw();
    }

    onLeave() {
        this.draggingItem = null;
        this.hoverSlotIndex = -1;
        this.draw();
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);

        for (let i = 0; i < this.slots.length; i++) {
            this.slots[i].draw(ctx, i === this.hoverSlotIndex);
        }

        for (const item of this.items) {
            item.draw(ctx);
        }
    }
}

class Slot {
    constructor(col, row, size) {
        this.x = col * size;
        this.y = row * size;
        this.size = size;
    }

    draw(ctx, highlight = false) {
        ctx.strokeStyle = 'gray';
        ctx.strokeRect(this.x + 0.5, this.y + 0.5, this.size - 1, this.size - 1);
        if (highlight) {
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(this.x, this.y, this.size, this.size);
        }
    }
}

class Item {
    constructor(name, imagePath, size, onLoad) {
        this.name = name;
        this.image = new Image();
        this.image.src = imagePath;
        this.image.onload = () => onLoad?.();
        this.image.onerror = () => console.warn(`Failed to load image: ${imagePath}`);
        this.size = size;
        this.x = 0;
        this.y = 0;
        this.slotIndex = null;
    }

    draw(ctx) {
        ctx.fillStyle = '#ccc';
        ctx.fillRect(this.x, this.y, this.size, this.size);

        if (this.image?.complete && this.image.naturalWidth) {
            const pad = this.size * 0.125;
            ctx.drawImage(this.image, this.x + pad, this.y + pad, this.size - 2 * pad, this.size - 2 * pad);
        } else {
            ctx.fillStyle = '#000';
            ctx.fillText(this.name, this.x + 4, this.y + this.size / 2);
        }
    }

    hitTest(x, y) {
        return (
            x >= this.x &&
            x <= this.x + this.size &&
            y >= this.y &&
            y <= this.y + this.size
        );
    }
}
