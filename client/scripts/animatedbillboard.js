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

        const loader = new THREE.TextureLoader();
        this.texture = loader.load(textureUrl, (tex) => {
            tex.minFilter = THREE.NearestFilter;
            tex.magFilter = THREE.NearestFilter;
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(1 / this.frameCount, 1 / this.rowCount);

            // Fix correct aspect ratio based on actual pixel dimensions
            const framePixelWidth = tex.image.width / this.frameCount;
            const framePixelHeight = tex.image.height / this.rowCount;
            const aspect = framePixelHeight / framePixelWidth;

            this.sprite.scale.set(1, aspect, 1); // final scale
            this.setFrame(this.frame);
        });

        const material = new THREE.SpriteMaterial({ map: this.texture, transparent: true });
        this.sprite = new THREE.Sprite(material);
        this.sprite.center.set(0.5, 0.0); // origin at feet
        this.sprite.scale.set(1, 1, 1); // temporary scale until texture loads
        this.sprite.position.copy(this.position);
        this.scene.add(this.sprite);
        if (this.flipped) {
            this.sprite.scale.x *= -1;
        }
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
        } else {
            if (this.frame !== 0) {
                this.frame = 0;
                this.setFrame(0);
            }
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
        if (this.flipped === flipped) return; // no change needed

        this.flipped = flipped;
        if (this.sprite) {
            this.sprite.scale.x = Math.abs(this.sprite.scale.x) * (flipped ? -1 : 1);
        }
    }


    setTarget(posVec3) {
        this.sprite.position.copy(posVec3);
        this.position.copy(posVec3);
    }

    getposition() {
        return this.position.clone();
    }

    play() {
        this.isAnimating = true;
    }

    stop() {
        this.isAnimating = false;
    }
}
