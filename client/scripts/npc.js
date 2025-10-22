// CLIENT SIDE NPC //
import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { SpriteBillboard } from "./animatedbillboard";

export class npc {
    constructor(scene, texture, level, pStartpos = { x: 0, y: 0, z: 0 }, npcid, onLoaded = () => {}, onDestroy = () => {}) {
        this.scene = scene;
        this.model = null;

        this.pNpcID = npcid;
        this.position = new THREE.Vector3(pStartpos.x, pStartpos.y, pStartpos.z);
        this.name = "";
        this.texture = "Goblin.png";
        this.level = level;

        // === Health / damage flags ===
        this.maxHealth = 100;
        this.health = 100;
        this.damage = false;          // <- flip to true when we just took damage
        this.damageTimer = 0;         // seconds remaining to show damage state/healthbar
        this.damageFlashDuration = 0.25; // how long the sprite flashes
        this.healthbarVisibleTime = 1.2; // how long to keep the bar visible after a hit

        this.attack = 0;
        this.hitTime = 0;
        this.speed = 2;
        this.targetPosition = this.position.clone();

        this.onDestroy = onDestroy;

        // Main animated sprite
        this.sprite = new SpriteBillboard(
            scene,
            4,              // fps
            this.position,
            2,              // frameCount
            0,              // animationRow
            texture,
            2,              // rowCount
            5               // size
        );

        // Simple world-space healthbar
        this.healthbar = this.initHealthBar();

        // Optional callback when loaded if you use it for clickables, etc.
        // onLoaded(this);
    }

    get mesh() {
        // expose the billboard sprite for raycasting/clicking
        return this.sprite;
    }

    // --- Healthbar creation: a back (dark) and a fill (colored) plane ---
    initHealthBar() {
        const group = new THREE.Group();
        group.name = `hpbar_${this.pNpcID}`;

        const width = 1.2;     // world units
        const height = 0.12;
        const corner = 0.02;   // small corner rounding via geometry segments if desired

        const geo = new THREE.PlaneGeometry(width, height);
        const backMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.8, depthWrite: false });
        const fillMat = new THREE.MeshBasicMaterial({ color: 0x36d936, transparent: true, opacity: 0.95, depthWrite: false });

        const back = new THREE.Mesh(geo, backMat);
        const fill = new THREE.Mesh(geo.clone(), fillMat);

        // Anchor the fill to the left so scaling looks like it empties left->right
        fill.position.x = -width / 2;
        fill.scale.x = 1.0; // 100%

        // We’ll scale the X of fill from 0..1 and shift to keep left edge anchored
        fill.userData.baseWidth = width;

        group.add(back);
        group.add(fill);

        // place above the sprite; you can tweak Y based on your billboard size
        group.position.copy(this.position);
        group.position.y += 1.6;

        // Start hidden until damage occurs
        group.visible = false;

        this.scene.add(group);
        group.userData = { back, fill, width, height };

        return group;
    }

    update(delta, camera) {
        // Damage flash countdown (controls sprite flash & hpbar visibility window)
        if (this.hitTime > 0) {
            this.hitTime -= delta;
            if (this.hitTime < 0) this.hitTime = 0;

            // Flash frame (bottom-right) while hit
            this.sprite.showStaticFrame(1, 1);
            if (this.sprite) this.sprite.update(delta, camera);
        } else {
            // When hitTime ends, return to idle row
            if (this.sprite.isFrozen) {
                this.sprite.animationRow = 0;
                this.sprite.resumeAnimation();
            }
            this.move(delta);
            if (this.sprite) this.sprite.update(delta, camera);
        }

        // Handle damage flag timing (for UI decisions like painting the bar)
        if (this.damageTimer > 0) {
            this.damageTimer -= delta;
            if (this.damageTimer <= 0) {
                this.damage = false;
                this.damageTimer = 0;
            }
        }

        // Update healthbar (position, facing camera, scale to health, visibility)
        this.updateHealthBar(camera);
    }

    move(delta) {
        if (!this.sprite) return;

        const direction = new THREE.Vector3().subVectors(this.targetPosition, this.position);
        const distance = direction.length();

        if (distance > 0.1) {
            direction.normalize();
            const step = this.speed * delta;
            this.position.add(direction.clone().multiplyScalar(step));
            this.sprite.setFlippedX(direction.x > 0);
            this.sprite.play();
        } else {
            this.sprite.stop();
        }

        this.angle = Math.atan2(direction.x, direction.z);
        this.sprite.setTarget(this.position);
    }

    setTarget(position) {
        const temppos = position.clone();
        temppos.y = 0;
        this.targetPosition.copy(temppos);
    }

    // Called from your NetworkClient when 'npc-takedamage' arrives
    takedamage(amount) {
        // Clamp & update health
        this.health = Math.max(0, Math.min(this.maxHealth, this.health - amount));

        // Flip damage state booleans/timers
        this.damage = true;
        this.hitTime = this.damageFlashDuration;     // sprite flash duration
        this.damageTimer = this.healthbarVisibleTime; // how long to keep the bar visible

        // Immediate healthbar refresh
        this.refreshHealthBarFill();
    }

    // --- Healthbar updates each frame ---
    updateHealthBar(camera) {
        if (!this.healthbar) return;

        // Track NPC position
        this.healthbar.position.x = this.position.x;
        this.healthbar.position.z = this.position.z;
        // Hover above sprite a bit (optional small bob)
        this.healthbar.position.y = this.position.y + 1.6;

        // Always face the camera (billboard behavior)
        if (camera && this.healthbar.lookAt) {
            // Make the bar face the camera; keep it upright
            const look = new THREE.Vector3().copy(camera.position);
            look.y = this.healthbar.position.y;
            this.healthbar.lookAt(look);
        }

        // Show only when recently damaged OR if not full HP
        const shouldShow = this.damage || this.health < this.maxHealth;
        this.healthbar.visible = shouldShow;

        // Keep fill scaled to current health
        this.refreshHealthBarFill();
    }

    refreshHealthBarFill() {
        if (!this.healthbar) return;
        const { fill, width } = this.healthbar.userData;

        const pct = this.maxHealth > 0 ? (this.health / this.maxHealth) : 0;
        const clamped = Math.max(0, Math.min(1, pct));

        // Scale the fill from left edge
        fill.scale.x = clamped;

        // Reposition so left edge stays put as it scales
        fill.position.x = -width / 2 + (width * clamped) / 2;

        // Optional: color shift (green -> red) as HP goes down
        const color = new THREE.Color().setHSL(clamped * 0.33, 0.9, 0.45); // 0.33≈green, 0≈red
        fill.material.color.copy(color);
    }

    // Call when removing NPC from the world
    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;

        // Use spriteHandler to create disintegration clone
        if (this.scene.spriteHandler) {
            this.scene.spriteHandler.spawnDisintegration(this.sprite.sprite);
        }

        // Hide and clean up NPC itself
        if (this.sprite?.sprite) this.scene.remove(this.sprite.sprite);
        if (this.healthbar) this.scene.remove(this.healthbar);

        if (typeof this.onDestroy === 'function') {
            this.onDestroy(this);
        }

        console.log(`💨 NPC ${this.pNpcID} dissolved into dust`);
    }

}
