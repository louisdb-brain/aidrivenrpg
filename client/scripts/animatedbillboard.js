import * as THREE from 'three';

export class SpriteBillboard {
    constructor(
        scene,
        fps,
        position = { x: 0, y: 0, z: 0 },
        frameCount,
        animationRow,
        textureInput,
        rowCount = 1,
        size = 1
    ) {
        this.scene = scene;
        this.frame = 0;
        this.frameTime = 1.5;
        this.frameCount = frameCount;
        this.rowCount = rowCount;
        this.animationRow = animationRow;
        this.fps = fps;
        this.timer = 0;
        this.isAnimating = false;
        this.flipped = false;
        this.isFrozen = false;
        this.size = size;

        this.position = new THREE.Vector3(position.x, position.y, position.z);

        // temporary material before texture loads
        const mat = new THREE.SpriteMaterial({ transparent: true });
        this.sprite = new THREE.Sprite(mat);
        this.sprite.center.set(0.5, 0.0);
        this.sprite.position.copy(this.position);
        this.sprite.scale.set(size, size, size);
        scene.add(this.sprite);

        this.baseTexture = null; // actual shared source
        this.texture = null;     // per-instance clone wrapper

        // ---- LOAD TEXTURE ----
        if (typeof textureInput === "string") {
            new THREE.TextureLoader().load(
                textureInput,
                (tex) => this._onTextureLoaded(tex),
                undefined,
                (err) => console.error("Failed loading sprite:", textureInput, err)
            );
        } else if (textureInput && textureInput.isTexture) {
            this._onTextureLoaded(textureInput);
        } else {
            console.error("Invalid texture input:", textureInput);
        }
    }

    _onTextureLoaded(tex) {
        // shared source
        this.baseTexture = tex;
        this.baseTexture.minFilter = THREE.NearestFilter;
        this.baseTexture.magFilter = THREE.NearestFilter;
        this.baseTexture.wrapS = THREE.RepeatWrapping;
        this.baseTexture.wrapT = THREE.RepeatWrapping;
        this.baseTexture.encoding = THREE.sRGBEncoding;

        // per-instance clone wrapper (only UV state differs)
        this.texture = this.baseTexture.clone();
        this.texture.repeat.set(1 / this.frameCount, 1 / this.rowCount);
        this.texture.needsUpdate = true;

        // apply texture to material
        this.sprite.material.map = this.texture;
        this.sprite.material.transparent = true;
        this.sprite.material.toneMapped = false;
        this.sprite.material.side = THREE.DoubleSide;
        this.sprite.material.needsUpdate = true;

        // Correct sprite aspect ratio
        const frameW = this.baseTexture.image.width / this.frameCount;
        const frameH = this.baseTexture.image.height / this.rowCount;
        const aspect = frameH / frameW;
        this.sprite.scale.set(this.size, aspect * this.size, this.size);

        // Start at frame 0
        this.setFrame(this.frame);
    }

    update(delta, camera) {
        if (camera) this.sprite.quaternion.copy(camera.quaternion);
        if (this.isFrozen) return;

        if (this.isAnimating) {
            this.timer += delta;
            const dur = this.frameTime / this.fps;
            if (this.timer >= dur) {
                this.timer -= dur;
                this.frame = (this.frame + 1) % this.frameCount;
                this.setFrame(this.frame);
            }
        } else if (this.frame !== 0) {
            this.frame = 0;
            this.setFrame(0);
        }
    }

    setFrame(frame) {
        this.frame = frame % this.frameCount;
        if (!this.texture) return;

        const offsetY = (this.rowCount - 1 - this.animationRow) / this.rowCount;

        if (this.flipped) {
            this.texture.repeat.x = -1 / this.frameCount;
            const offsetX = (this.frame + 1) / this.frameCount;
            this.texture.offset.set(offsetX, offsetY);
        } else {
            this.texture.repeat.x = 1 / this.frameCount;
            const offsetX = this.frame / this.frameCount;
            this.texture.offset.set(offsetX, offsetY);
        }
    }

    setCell(col, row) {
        this.animationRow = row;
        this.setFrame(col);
    }

    setAnimationRow(row) {
        this.animationRow = row;
        this.setFrame(0);
    }

    setFlippedX(flipped) {
        this.flipped = !!flipped;
        this.setFrame(this.frame);
    }

    setTarget(pos) {
        this.sprite.position.copy(pos);
        this.position.copy(pos);
    }

    getposition() {
        return this.position.clone();
    }
    setTexture(tex) {
        if (!tex) return;

        // new base atlas
        this.baseTexture = tex;

        // clone so we can still control UVs (repeat/offset)
        this.texture = this.baseTexture.clone();
        this.texture.repeat.set(1 / this.frameCount, 1 / this.rowCount);
        this.texture.needsUpdate = true;

        // assign to material
        this.sprite.material.map = this.texture;
        this.sprite.material.transparent = true;
        this.sprite.material.toneMapped = false;
        this.sprite.material.needsUpdate = true;

        // recalc scale based on new texture
        const frameW = this.baseTexture.image.width / this.frameCount;
        const frameH = this.baseTexture.image.height / this.rowCount;
        const aspect = frameH / frameW;
        this.sprite.scale.set(this.size, aspect * this.size, this.size);

        // keep current frame
        this.setFrame(this.frame);
    }



    showStaticFrame(col, row) {
        this.isFrozen = true;
        this.isAnimating = false;
        this.timer = 0;
        this.animationRow = row;
        this.setFrame(col);
    }

    resumeAnimation() {
        this.isFrozen = false;
        this.timer = 0;
        this.frame = 0;
        this.setFrame(0);
        this.play();
    }

    play() { this.isAnimating = true; }
    stop() { this.isAnimating = false; }
}
