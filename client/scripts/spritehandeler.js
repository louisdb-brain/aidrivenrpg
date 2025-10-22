import * as THREE from 'three';


export class spriteHandeler {

    constructor(scene, opts = {}) {
        this.scene = scene;

        // Options
        this.opts = {
            hitImageUrl: './sprites/hit.png',
            poolSize: 24,
            lifetimeMs: 600,
            scale: { x: 1.5, y: 0.75, z: 1 },
            canvasSize: { w: 256, h: 128 },
            ...opts,
        };

        // Pool of reusable sprites (each has its own canvas & texture)
        this.pool = [];

        // Preload base image once (optional)
        this.baseImg = new Image();
        this.baseImgLoaded = false;
        this.baseImg.onload = () => { this.baseImgLoaded = true; };
        this.baseImg.src = this.opts.hitImageUrl;
    }


    draw(position, text) {
        const item = this.#acquire();
        this.#renderToCanvas(item.ctx, item.canvas, () => {
            const { w, h } = this.opts.canvasSize;
            // Transparent background, just text
            item.ctx.clearRect(0, 0, w, h);
            item.ctx.font = 'bold 28px sans-serif';
            item.ctx.fillStyle = 'yellow';
            item.ctx.textAlign = 'center';
            item.ctx.textBaseline = 'middle';
            item.ctx.fillText(text, w / 2, h / 2);
        });
        this.#deploy(item, position);
    }

    drawHit(position, amount) {
        const item = this.#acquire();
        this.#renderToCanvas(item.ctx, item.canvas, () => {
            const { w, h } = this.opts.canvasSize;
            // Background image if loaded; otherwise just clear
            item.ctx.clearRect(0, 0, w, h);
            if (this.baseImgLoaded) {
                item.ctx.drawImage(this.baseImg, 0, 0, w, h);
            }
            // Text overlay
            item.ctx.font = 'bold 28px sans-serif';
            item.ctx.fillStyle = 'white';
            item.ctx.textAlign = 'center';
            item.ctx.textBaseline = 'middle';
            item.ctx.fillText(String(amount), w / 2, h * 0.55);
        });
        this.#deploy(item, position);
    }
    spawnDisintegration(sourceSprite) {
        if (!sourceSprite || !sourceSprite.material?.map) return;

        const { w, h } = this.opts.canvasSize;

        // Create a copy canvas for this sprite
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        // Draw the original texture onto the canvas
        const image = sourceSprite.material.map.image;
        if (image) ctx.drawImage(image, 0, 0, w, h);

        // Create texture + sprite from canvas
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 1,
            depthTest: false,
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.copy(sourceSprite.scale);
        sprite.position.copy(sourceSprite.position);
        this.scene.add(sprite);

        // Animate disintegration
        const duration = 1.5; // seconds
        const startTime = performance.now();
        const noise = new Image();
        noise.src = '/sprites/noise.png';

        const animate = (time) => {
            const elapsed = (time - startTime) / 1000;
            const t = Math.min(elapsed / duration, 1);

            // Optional: expand slightly as it dissolves
            const scale = 1 + t * 0.2;
            sprite.scale.setScalar(scale);

            // Noise flicker
            if (noise.complete) {
                ctx.clearRect(0, 0, w, h);
                ctx.drawImage(image, 0, 0, w, h);

                // Apply noise mask
                const nW = noise.width, nH = noise.height;
                const noiseData = this.#getNoiseData(noise);
                const imgData = ctx.getImageData(0, 0, w, h);
                const data = imgData.data;

                for (let i = 0; i < data.length; i += 4) {
                    const x = (i / 4) % w;
                    const y = Math.floor(i / 4 / w);
                    const nIdx = ((y % nH) * nW + (x % nW)) * 4;
                    const nVal = noiseData[nIdx] / 255;

                    if (nVal < t) {
                        // remove pixel
                        data[i + 3] = 0;
                    }
                }
                ctx.putImageData(imgData, 0, 0);
                texture.needsUpdate = true;
            }

            material.opacity = 1 - t * 1.2;

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(sprite);
                texture.dispose();
                material.dispose();
            }
        };

        requestAnimationFrame(animate);
    }

    // Utility: cache noise pixel data
    #getNoiseData(image) {
        if (!this._noiseCache) {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);
            this._noiseCache = ctx.getImageData(0, 0, image.width, image.height).data;
        }
        return this._noiseCache;
    }



    dispose() {
        for (const item of this.pool) {
            if (item.timeoutId) clearTimeout(item.timeoutId);
            this.scene.remove(item.sprite);
            item.texture.dispose();
            item.material.dispose();
            // canvases/contexts are GC'd automatically
        }
        this.pool.length = 0;
    }

    // --- Internal helpers -----------------------------------------------------

    #acquire() {
        // Find an available sprite in pool
        let item = this.pool.find(p => !p.busy);
        if (!item && this.pool.length < this.opts.poolSize) {
            item = this.#createPoolItem();
            this.pool.push(item);
        }
        // If pool is exhausted, reuse the oldest (first) item (best-effort)
        if (!item) item = this.pool[0];
        // Cancel any pending return timers if we’re force-reusing
        if (item.timeoutId) {
            clearTimeout(item.timeoutId);
            item.timeoutId = undefined;
        }
        item.busy = true;
        return item;
    }

    #createPoolItem() {
        const { w, h } = this.opts.canvasSize;

        // Offscreen canvas per item (so simultaneous popups don’t overwrite)
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        // Texture->Material->Sprite chain
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(this.opts.scale.x, this.opts.scale.y, this.opts.scale.z ?? 1);

        return { sprite, material, texture, canvas, ctx, busy: false };
    }

    #renderToCanvas(ctx, canvas, drawFn) {
        drawFn();
        // tell Three.js the canvas content changed
        // (texture bound to this canvas will update on next render)
        // We locate the pool item via canvas reference:
        const item = this.pool.find(p => p.canvas === canvas);
        if (item) item.texture.needsUpdate = true;
    }

    #deploy(item, position) {
        // Set position and add to scene
        item.sprite.position.copy(position);
        item.sprite.material.opacity = 1;
        if (!item.sprite.parent) this.scene.add(item.sprite);

        // Simple lifetime; could be replaced with tween/fade if desired
        item.timeoutId = setTimeout(() => {
            this.scene.remove(item.sprite);
            item.busy = false;
            item.timeoutId = undefined;
        }, this.opts.lifetimeMs);
    }
}
