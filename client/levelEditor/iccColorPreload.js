// iccColorPreload.js
import * as THREE from 'three';

/**
 * ICC-aware texture loader that caches DataTextures.
 * Browser handles ICC -> sRGB when drawing to <canvas>.
 */
class ICCColorPreloader {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Loads an image, converts with browser ICC handling, and returns a THREE.DataTexture.
     * @param {string} url - Image path.
     * @returns {Promise<THREE.DataTexture>}
     */
    async load(url) {
        // Return cached texture if available
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        // Load the image
        const img = await this._loadImage(url);

        // Draw onto canvas (browser applies ICC profile)
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Extract pixel data
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.pow(data[i] / 255, 2.2) * 255;     // Red
            data[i + 1] = Math.pow(data[i + 1] / 255, 2.2) * 255; // Green
            data[i + 2] = Math.pow(data[i + 2] / 255, 2.2) * 255; // Blue
            // Alpha (data[i + 3]) is left untouched
        }

        // Create DataTexture from color-managed pixel data
        const tex = new THREE.DataTexture(
            imageData.data,
            img.width,
            img.height,
            THREE.RGBAFormat
        );
        tex.encoding = THREE.sRGBEncoding;
        tex.needsUpdate = true;
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;

        // Cache and return
        this.cache.set(url, tex);
        return tex;
    }

    /**
     * Clears the cached textures (optional utility).
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Internal helper to load an image as a Promise.
     */
    _loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // Enable CORS if needed
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(new Error(`Failed to load image: ${url}\n${err}`));
            img.src = url;
        });
    }
}

// Export a singleton instance for convenience
export const iccColorPreloader = new ICCColorPreloader();
