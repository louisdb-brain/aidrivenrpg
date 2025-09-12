import * as THREE from 'three';

export class SpriteBillboard {
    constructor(scene, fps, position = { x: 0, y: 0, z: 0 }, frameCount, animationRow, textureUrl, rowCount = 1) {
        this.scene = scene;
        this.frame = 0;
        this.frameCount = frameCount;
        this.rowCount = rowCount;
        this.animationRow = animationRow;
        this.fps = fps;
        this.timer = 0;
        this.isAnimating = false;
        this.flipped = false;
        this.position = new THREE.Vector3(position.x, position.y, position.z);

        // 🔹 Create a placeholder material with no map yet
        const placeholderMat = new THREE.SpriteMaterial({ transparent: true });
        this.sprite = new THREE.Sprite(placeholderMat);
        this.sprite.center.set(0.5, 0.0); // Anchor at feet
        this.sprite.position.copy(this.position);
        this.sprite.scale.set(1, 1, 1); // Temporary scale until texture loads
        scene.add(this.sprite);

        // 🔹 Now start loading the texture
        const loader = new THREE.TextureLoader();
        loader.load(
            textureUrl,
            (tex) => {
                tex.minFilter = THREE.NearestFilter;
                tex.magFilter = THREE.NearestFilter;
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(1 / this.frameCount, 1 / this.rowCount);
                tex.encoding = THREE.sRGBEncoding; // 🔹 preserve original colors

                // 🔹 Update the existing sprite’s material
                this.sprite.material.map = tex;

                // ✅ Add these lines for subtle lighting but original look
                this.sprite.material.toneMapped = false;
                this.sprite.material.color.setScalar(0.9); // adjust brightness (0.8–1.0)

                this.sprite.material.needsUpdate = true;

                // Scale the sprite based on texture dimensions
                const framePixelWidth = tex.image.width / this.frameCount;
                const framePixelHeight = tex.image.height / this.rowCount;
                const aspect = framePixelHeight / framePixelWidth;
                this.sprite.scale.set(1, aspect, 1);

                this.texture = tex;
                this.setFrame(this.frame);
            },
            undefined,
            (err) => {
                console.error('Failed to load texture:', textureUrl, err);
            }
        );
    }

    update(delta, camera) {
        if (camera) this.sprite.quaternion.copy(camera.quaternion);

        if (this.isAnimating) {
            this.timer += delta;
            const frameDuration = 1 / this.fps;
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
