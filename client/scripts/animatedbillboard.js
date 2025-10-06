import * as THREE from 'three';

export class SpriteBillboard {
    constructor(
        scene,
        fps,
        position = { x: 0, y: 0, z: 0 },
        frameCount,
        animationRow,
        textureInput,          // Can be URL string or preloaded THREE.Texture
        rowCount = 1,
        size = 1
    ) {
        this.scene = scene;
        this.frame = 0;
        this.frameTime=1.5;
        this.frameCount = frameCount;
        this.rowCount = rowCount;
        this.animationRow = animationRow;
        this.fps = fps;
        this.timer = 0;
        this.isAnimating = false;
        this.flipped = false;
        this.position = new THREE.Vector3(position.x, position.y, position.z);

        // Placeholder sprite while texture loads
        const placeholderMat = new THREE.SpriteMaterial({ transparent: true });
        this.sprite = new THREE.Sprite(placeholderMat);
        this.sprite.center.set(0.5, 0.0); // Anchor at feet
        this.sprite.position.copy(this.position);
        this.sprite.scale.set(10, 10, 10);
        scene.add(this.sprite);

        // Handle both URL strings and preloaded textures
        const loader = new THREE.TextureLoader();

        if (typeof textureInput === 'string') {
            // URL string → load texture
            loader.load(
                textureInput,
                (tex) => this._onTextureLoaded(tex, size),
                undefined,
                (err) => console.error('Failed to load texture:', textureInput, err)
            );
        } else if (textureInput && textureInput.isTexture) {
            // Preloaded THREE.Texture or DataTexture → use directly
            this._onTextureLoaded(textureInput, size);
        } else {
            console.error('Invalid texture input for SpriteBillboard:', textureInput);
        }
    }

    /**
     * Private helper to configure the sprite once the texture is ready.
     */
    _onTextureLoaded(tex, size) {
        tex.minFilter = THREE.NearestFilter;
        tex.magFilter = THREE.NearestFilter;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1 / this.frameCount, 1 / this.rowCount);
        tex.encoding = THREE.sRGBEncoding;

        this.sprite.material.map = tex;
        this.sprite.material.toneMapped = false;
        this.sprite.material.color.setScalar(0.9);
        this.sprite.material.needsUpdate = true;

        const framePixelWidth = tex.image.width / this.frameCount;
        const framePixelHeight = tex.image.height / this.rowCount;
        const aspect = framePixelHeight / framePixelWidth;
        this.size = size;
        this.sprite.scale.set(this.size, aspect * this.size, this.size);

        this.texture = tex;
        this.setFrame(this.frame);
    }

    update(delta, camera) {
        if (camera) this.sprite.quaternion.copy(camera.quaternion);

        if (this.isAnimating) {
            this.timer += delta;
            const frameDuration = this.frameTime / this.fps;
            if (this.timer >= frameDuration) {
                this.timer -= frameDuration;
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
        const offsetX = this.frame / this.frameCount;
        const offsetY = (this.rowCount - 1 - this.animationRow) / this.rowCount;
        this.texture.offset.set(offsetX, offsetY);
    }

    setAnimationRow(row) {
        this.animationRow = row;
        this.setFrame(0);
    }

    setFlippedX(flipped) {
        if (this.flipped === flipped) return;
        this.flipped = flipped;
        this.sprite.scale.x = Math.abs(this.sprite.scale.x) * (flipped ? -1 : 1);
    }

    setTarget(posVec3) {
        this.sprite.position.copy(posVec3);
        this.position.copy(posVec3);
    }

    getposition() {
        return this.position.clone();
    }


    play() { this.isAnimating = true; }
    stop() { this.isAnimating = false; }
}
