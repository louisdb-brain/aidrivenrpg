import * as THREE from 'three';

// --- Perlin Noise Utilities ---
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
    return (THREE.MathUtils.lerp(x1, x2, v) + 1) / 2;
}

// --- RGB <-> HSL helpers ---
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r * 255, g * 255, b * 255];
}

// --- Main Exported Function ---
export async function generateUpscaledTexture(
    path,
    scale = 8,
    noiseStrength = 0.3,
    noiseScale = 0.05,
    lightness = 1.0,
    hueShift = 0.0
) {
    return new Promise((resolve) => {
        const loader = new THREE.TextureLoader();
        loader.load(path, (smallTex) => {
            const img = smallTex.image;
            const width = img.width * scale;
            const height = img.height * scale;

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            const perm = generatePermutation();

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const i = (y * width + x) * 4;
                    const n = perlinNoise(x * noiseScale, y * noiseScale, perm);
                    const factor = 1 - noiseStrength + noiseStrength * n;

                    // apply perlin variation
                    let r = data[i] * factor;
                    let g = data[i + 1] * factor;
                    let b = data[i + 2] * factor;

                    // convert to HSL
                    let [h, s, l] = rgbToHsl(r, g, b);

                    // apply hue rotation (0–360 degrees → 0–1 range)
                    h = (h + hueShift / 360) % 1.0;

                    // apply lightness adjustment
                    l = Math.min(1, Math.max(0, l * lightness));

                    [r, g, b] = hslToRgb(h, s, l);
                    data[i] = r;
                    data[i + 1] = g;
                    data[i + 2] = b;
                }
            }

            ctx.putImageData(imageData, 0, 0);
            const tex = new THREE.CanvasTexture(canvas);
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.minFilter = THREE.LinearMipMapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.needsUpdate = true;

            resolve(tex);
        });
    });
}
