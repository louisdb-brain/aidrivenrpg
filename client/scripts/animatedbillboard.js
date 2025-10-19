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
        this.position = new THREE.Vector3(position.x, position.y, position.z);
        this.isFrozen = false;

        const placeholderMat = new THREE.SpriteMaterial({ transparent: true });
        this.sprite = new THREE.Sprite(placeholderMat);
        this.sprite.center.set(0.5, 0.0);
        this.sprite.position.copy(this.position);
        this.sprite.scale.set(10, 10, 10);
        scene.add(this.sprite);

        const loader = new THREE.TextureLoader();

        if (typeof textureInput === 'string') {
            loader.load(
                textureInput,
                (tex) => this._onTextureLoaded(tex, size),
                undefined,
                (err) => console.error('Failed to load texture:', textureInput, err)
            );
        } else if (textureInput && textureInput.isTexture) {
            this._onTextureLoaded(textureInput, size);
        } else {
            console.error('Invalid texture input for SpriteBillboard:', textureInput);
        }
    }

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
        this.sprite.material.side = THREE.DoubleSide;

        const framePixelWidth = tex.image.width / this.frameCount;
        const framePixelHeight = tex.image.height / this.rowCount;
        const aspect = framePixelHeight / framePixelWidth;
        this.size = size;
        this.sprite.scale.set(this.size, aspect * this.size, this.size);
        if (this.flipped) this.sprite.scale.x *= -1;

        this.texture = tex;
        this.setFrame(this.frame);
    }

    update(delta, camera) {
        if (camera) this.sprite.quaternion.copy(camera.quaternion);
        if (this.isFrozen) return; // 👈 stops animation when frozen

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

    setCell(col, row) {
        this.animationRow = row;
        this.setFrame(col);
    }

    setFrame(frame) {
        this.frame = frame % this.frameCount;
        if (!this.texture) return;

        let offsetX;
        const offsetY = (this.rowCount - 1 - this.animationRow) / this.rowCount;

        if (this.flipped) {
            offsetX = 1 - (this.frame + 1) / this.frameCount;
            this.texture.repeat.x = -Math.abs(this.texture.repeat.x);
        } else {
            offsetX = this.frame / this.frameCount;
            this.texture.repeat.x = Math.abs(this.texture.repeat.x);
        }

        this.texture.offset.set(offsetX, offsetY);
    }

    setAnimationRow(row) {
        this.animationRow = row;
        this.setFrame(0);
    }

    setFlippedX(flipped) {
        const want = !!flipped;
        if (this.flipped === want) return;
        this.flipped = want;

        if (!this.texture) return;

        const repeatX = 1 / this.frameCount;
        const repeatY = 1 / this.rowCount;
        this.texture.repeat.set(this.flipped ? -repeatX : repeatX, repeatY);
        this.texture.offset.x = this.flipped
            ? (1 - this.frame / this.frameCount - 1 / this.frameCount)
            : (this.frame / this.frameCount);
        this.texture.needsUpdate = true;
    }

    setTarget(posVec3) {
        this.sprite.position.copy(posVec3);
        this.position.copy(posVec3);
    }

    getposition() {
        return this.position.clone();
    }

    // 👇 NEW — to show one specific frame and freeze it
    showStaticFrame(col, row) {
        this.isFrozen = true;
        this.isAnimating = false;
        this.timer = 0;
        this.animationRow = row;
        this.setFrame(col);
    }

    // 👇 NEW — unfreeze and reset animation cleanly
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
