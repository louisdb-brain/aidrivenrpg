// drawUtils.js

export function drawHorizontalFadeRect(ctx, x, y, width, height, color = "rgba(100,150,200,1)", fadeMode = "both") {
    let gradient = ctx.createLinearGradient(x, y, x + width, y);

    if (fadeMode === "left") {
        // Solid on the right, faded on the left
        gradient.addColorStop(0, color.replace(/[\d.]+\)$/g, "0)"));
        gradient.addColorStop(1, color);
    } else if (fadeMode === "right") {
        // Solid on the left, faded on the right
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, color.replace(/[\d.]+\)$/g, "0)"));
    } else if (fadeMode === "both") {
        // Faded on both sides, solid in the center
        gradient.addColorStop(0, color.replace(/[\d.]+\)$/g, "0)"));
        gradient.addColorStop(0.15, color);
        gradient.addColorStop(0.85, color);
        gradient.addColorStop(1, color.replace(/[\d.]+\)$/g, "0)"));
    } else {
        console.warn("Invalid fadeMode. Use 'left', 'right', or 'both'.");
        return;
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
}

export function drawSlider(ctx,x, y, width, height, lineColor = "#8B8770", indicatorColor = "#FF8800") {
    const lineHeight = 8;
    const radius = lineHeight / 2;

    // Draw the rounded ends + bar (main rectangle)
    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.lineTo(x + width - radius, y + lineHeight);
    ctx.lineTo(x + radius, y + lineHeight);
    ctx.closePath();
    ctx.fill();

    // Draw left and right caps
    ctx.beginPath();
    ctx.arc(x + radius, y + lineHeight/2, radius, 0, Math.PI*2);
    ctx.arc(x + width - radius, y + lineHeight/2, radius, 0, Math.PI*2);
    ctx.fill();

    // Draw the inner line (parallel)
    ctx.fillStyle = lineColor;
    const innerOffset = 3;
    ctx.fillRect(x + radius, y + innerOffset, width - 2*radius, 2);

    // Draw the triangle indicator
    const triangleWidth = 12;
    const triangleHeight = 6;
    const triX = x + width / 2;
    const triY = y + lineHeight;
    ctx.beginPath();
    ctx.moveTo(triX - triangleWidth/2, triY);
    ctx.lineTo(triX + triangleWidth/2, triY);
    ctx.lineTo(triX, triY + triangleHeight);
    ctx.closePath();
    ctx.fill();

    // Draw the top semi-circle
    const semiRadius = 20;
    ctx.strokeStyle = indicatorColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(triX, y, semiRadius, Math.PI, 2*Math.PI);
    ctx.stroke();
}
// --- Gamepad Crosshair Drawing Utility ---
export function drawCrosshair(ctx, x, y, radius = 16, color = "rgba(255,255,255,0.8)") {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // inner dot
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.restore();
}
import * as THREE from 'three';

// Simple Perlin noise implementation
function perlinNoise(x, y, perm) {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);

    const aa = perm[perm[xi] + yi];
    const ab = perm[perm[xi] + yi + 1];
    const ba = perm[perm[xi + 1] + yi];
    const bb = perm[perm[xi + 1] + yi + 1];

    const grad = (hash, x, y) => ((hash & 1 ? x : -x) + (hash & 2 ? y : -y));

    const x1 = THREE.MathUtils.lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = THREE.MathUtils.lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return (THREE.MathUtils.lerp(x1, x2, v) + 1) / 2; // normalize 0–1
}

function generatePermutation() {
    const p = new Uint8Array(512);
    const perm = new Uint8Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;
    for (let i = 0; i < 256; i++) {
        const r = Math.floor(Math.random() * 256);
        [perm[i], perm[r]] = [perm[r], perm[i]];
    }
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
    return p;
}

// Load and process texture
const loader = new THREE.TextureLoader();
loader.load('', async (smallTex) => {
    const img = smallTex.image;

    const scale = 8;
    const width = img.width * scale;
    const height = img.height * scale;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const perm = generatePermutation();

    // Apply 30% Perlin noise as multiplier
    const noiseScale = 0.05; // frequency of noise
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const n = perlinNoise(x * noiseScale, y * noiseScale, perm);
            const factor = 1 - 0.3 + 0.3 * n; // blend 70% texture + 30% noise
            data[idx] *= factor;     // R
            data[idx + 1] *= factor; // G
            data[idx + 2] *= factor; // B
        }
    }

    ctx.putImageData(imageData, 0, 0);

    const upscaledTexture = new THREE.CanvasTexture(canvas);
    upscaledTexture.wrapS = upscaledTexture.wrapT = THREE.RepeatWrapping;
    upscaledTexture.minFilter = THREE.LinearMipMapLinearFilter;
    upscaledTexture.magFilter = THREE.LinearFilter;

    const groundMaterial = new THREE.MeshStandardMaterial({
        map: upscaledTexture,
        side: THREE.DoubleSide
    });

    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.05;

    scene.add(ground);
});

