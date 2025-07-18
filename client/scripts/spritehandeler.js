import * as THREE from 'three';

export class  spriteHandeler {
    constructor(scene) {
        this.scene = scene;
        this.hitSprites={};
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });


    }

    draw(position,text) {
        const ctx = this.ctx;
        const canvas = this.canvas;

        ctx.font = 'bold 28px sans-serif';
        ctx.fillStyle = 'yellow';
        ctx.textAlign = 'center';
        ctx.fillText(text, canvas.width / 2, canvas.height / 1.8);

    }

    drawHit(position, amount) {
        const ctx = this.ctx;
        const canvas = this.canvas;

        const img = new Image();
        img.src = './sprites/hit.png';

        img.onload = () => {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw background image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Draw text
            ctx.font = 'bold 28px sans-serif';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText(amount, canvas.width / 2, canvas.height / 1.8);

            // Create texture after drawing
            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthTest: false
            });

            const sprite = new THREE.Sprite(material);
            sprite.scale.set(1.5, 0.75, 1);
            sprite.position.copy(position);

            scene.add(sprite);

            setTimeout(() => {
                scene.remove(sprite);
                texture.dispose();
                material.dispose();
            }, 600);
        };
    }
    drawtext(){}


}