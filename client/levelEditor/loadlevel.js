import * as THREE from "three";

const placedObjects = [];


export function loadLevel(data, pScene) {
    const SPRITE_SCALE_DIVISOR = 100;
    const textureLoader = new THREE.TextureLoader();

    data.forEach(objData => {
        if (objData.type === "sprite" && objData.name) {
            // Use relative path unless your server serves /sprites at root
            const texturePath = `/sprites/${objData.texture || objData.name}`;

            textureLoader.load(
                texturePath,
                texture => {
                    // ✅ Validate the texture
                    if (!texture.image || texture.image.width === 0 || texture.image.height === 0) {
                        console.warn(`[LevelLoader] Invalid texture dimensions: ${texturePath}`);
                        return;
                    }

                    // ✅ Configure texture for crisp pixels
                    texture.encoding = THREE.sRGBEncoding;
                    texture.magFilter = THREE.NearestFilter;
                    texture.minFilter = THREE.NearestFilter;

                    const imgW = texture.image.width;
                    const imgH = texture.image.height;
                    const planeW = imgW / SPRITE_SCALE_DIVISOR;
                    const planeH = imgH / SPRITE_SCALE_DIVISOR;

                    // Billboard sprite
                    const material = new THREE.SpriteMaterial({
                        map: texture,
                        transparent: true,
                        depthWrite: false,
                        sizeAttenuation: true
                    });


                    material.toneMapped = false;
                    material.color.setScalar(0.7); // tweak brightness

                    const billboard = new THREE.Sprite(material);


                    billboard.scale.set(planeW, planeH, 1);
                    billboard.position.set(
                        objData.position.x,
                        objData.position.y + planeH / 2,
                        objData.position.z
                    );

                    pScene.add(billboard);

                    placedObjects.push({
                        type: "billboard",
                        name: objData.name,
                        position: objData.position,
                        spriteScale: { w: planeW, h: planeH },
                        mesh: billboard
                    });
                },
                undefined,
                error => {
                    console.error(`[LevelLoader] Failed to load texture: ${texturePath}`, error);
                }
            );
        }
        else if (objData.type === 'decal') {
            const tex = textureLoader.load('/sprites/' + objData.texture);
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            const geo = new THREE.PlaneGeometry(1, 1);
            const mat = new THREE.MeshStandardMaterial({
                map: tex,
                transparent: true,
                side: THREE.DoubleSide
            });
            const decal = new THREE.Mesh(geo, mat);
            decal.position.set(objData.position.x, objData.position.y, objData.position.z);
            // Unlike billboards, do NOT copy camera quaternion each frame.
            pScene.add(decal);
            placedObjects.push({ type: 'decal', name: objData.texture, mesh: decal });
        }
    });
}
