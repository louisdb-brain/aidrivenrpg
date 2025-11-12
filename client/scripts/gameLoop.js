import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { Player } from './player.js';
import { npc } from './npc.js';
import { Chest } from './chest.js';
import { toVec3 } from './networkclient.js';
import { UI } from './UI/UIclient.js';
import { loadLevel,placeSprite } from '../levelEditor/loadlevel.js';
import { levelHandler } from './levelHandler.js';
import {vfxHandler} from "./vfxHandeler.js";
import { iccColorPreloader } from '../levelEditor/iccColorPreload.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import {skillNode} from "./interactiveNodes";
import { generateUpscaledTexture } from './textureUtils.js';

export class Game {
    constructor(handlers, gamepad = null) {
        this.networkclient=null;
        this.handlers = handlers;
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x99ffcc, 0.004);
        this.scene.background = new THREE.Color(0x99ffcc);
        this.localPlayerId = 0;
        // Camera & renderer setup
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 30;
        this.camera = new THREE.OrthographicCamera(
            (-frustumSize * aspect) / 2,
            (frustumSize * aspect) / 2,
            frustumSize / 2,
            -frustumSize / 2,
            0.1,
            2000
        );

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio || 1);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        this.renderer.outputEncoding = THREE.LinearEncoding;
        this.renderer.toneMapping = THREE.NoToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.physicallyCorrectLights = false;

        window.addEventListener('resize', () => {
            // 3D sharpness
            this.renderer.setPixelRatio(window.devicePixelRatio || 1);
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();

            //  UI canvas sharpness and correct size
            const dpr = window.devicePixelRatio || 1;
            this.canvas.style.width = this.canvas.clientWidth + "px";
            this.canvas.style.height = this.canvas.clientHeight + "px";
            this.canvas.width = this.canvas.clientWidth * dpr;
            this.canvas.height = this.canvas.clientHeight * dpr;
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.ctx.imageSmoothingEnabled = false;
        });



        // Orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableZoom = true;
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this.setCameraAngleAndLock(30, 45, 45, new THREE.Vector3(0, 0, 0));
        this.useOrbitControls = true;

        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'f') this.toggleCameraFocus();
        });

        // Lighting
        const hemi = new THREE.HemisphereLight(0xF0B05B, 0xA1A1A1);
        hemi.position.set(0, 200, 0);
        this.scene.add(hemi);

        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambient);

        const pointlight = new THREE.PointLight(0xE0B746, 800, 8000);
        pointlight.position.set(5, 10, 4);
        this.scene.add(pointlight);
        this.scene.add(new THREE.PointLightHelper(pointlight, 0.3));

        // Clock, UI canvas, data containers
        this.clock = new THREE.Clock();
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        this.npcTexturesLoaded = false; // ✅ define default state
        this.textureCache = {};
        this.NPC_SPRITE_TABLE = {};
        this.players = {};
        this.npcs = {};
        this.chests = {};
        this.clickableObjects = [];
        this.nodeMap = new Map();
        this.nodeList = [];
        this.hoverFrameCounter = 10;
        this.hasStartedLoop = false;

        // 🧱 Create placeholder ground immediately
        this.ground = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshStandardMaterial({ color: 0x99ffcc })
        );
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = -1.05;
        this.ground.name = 'ground';
        this.scene.add(this.ground);

        // 🎨 Generate grass texture in the background (non-blocking)
        generateUpscaledTexture(
            '/grasstexture.jpg',
            1,    // upscale factor
            0.3,  // noise strength
            10,   // noise scale
            0.1,  // lightness
            5     // hue shift
        ).then((tex) => {
            this.ground.material.map = tex;
            this.ground.material.needsUpdate = true;
            console.log("✅ Ground texture applied.");
        }).catch((err) => {
            console.warn("⚠️ Failed to generate ground texture:", err);
        });

        // Load level asynchronously, but no blocking
        fetch('/level1.json')
            .then(res => res.json())
            .then(data => loadLevel(data, this.scene))
            .catch(console.error);




        // Postprocessing
        this.composer = new EffectComposer(this.renderer);
        this.composer.renderTarget1.texture.encoding = THREE.sRGBEncoding;
        this.composer.renderTarget2.texture.encoding = THREE.sRGBEncoding;
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        this.bokehPass = new BokehPass(this.scene, this.camera, {
            focus: 29.1,
            aperture: 0.0005,
            maxblur: 0.001,
        });
        // this.composer.addPass(this.bokehPass);

        // Raycaster setup
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        window.addEventListener("click", (e) => this.handleClick(e));

        // Gamepad setup
        this.gamepad = gamepad;
        this.caveposition={x:10,y:0,z:20}



    }
    async caveDoor(position ) {
        const textureLoader = new THREE.TextureLoader();
        const tex = await textureLoader.loadAsync('/sprites/cavedoor.png');
        tex.encoding = THREE.LinearEncoding;
        tex.flipY = true;
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;

        const material = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const doorSprite = new THREE.Sprite(material);

        // billboard effect and scale
        doorSprite.scale.set(4, 4, 1);
        doorSprite.position.copy(position);
         // lift off the ground a bit
        doorSprite.name = "cavedoor";
        this.scene.add(doorSprite);

        // Optional glow or helper
        // const helper = new THREE.BoxHelper(doorSprite, 0xff0000);
        // this.scene.add(helper);

        // proximity check each frame
        const checkDistance = () => {
            const player = this.players[this.localPlayerId];
            if (!player) return;

            const dist = player.position.distanceTo(doorSprite.position);
            if (dist < 10) {

                console.log("🚪 Player is near the cave door!" +this.networkclient.playerLevel);
                if(this.networkclient.playerLevel=="level1"){
                    this.networkclient.setlevel("cavelevel");
                    this.caveposition.x=0;


                }
                if(this.networkclient.playerLevel=="cavelevel"){
                    //this.networkclient.setLevel("level1")
                    this.caveposition.x=20;


                }

                // You can trigger a level load or teleport here
            }
        };

        // hook into your game loop
        const originalUpdate = this.update.bind(this);
        this.update = () => {
            originalUpdate();
            checkDistance();
        };

        console.log("🪄 Cave door created at", position);
    }


    start(){

        // UI + Handlers
        this.UI = new UI(this.scene, this.ctx, this.camera, this.canvas, this.ground,this.networkclient, this.handlers);
        this.levelHandeler = new levelHandler(this.scene,"","",this.networkclient);
        this.VFX = new vfxHandler(this.scene, this.camera);
        // Initialize UI + camera focus

        this.UI.cookinggame.toggle();
        this.UI.inventory.toggle();

        //gamepad attach
        if (this.gamepad && this.gamepad.virtualCursor) {
            this.UI.attachVirtualCursor(this.gamepad.virtualCursor);
        }

        // === CONNECT UI BUTTONS ===
        document.getElementById("btn-inventory").addEventListener("click", () => {
            this.UI.inventory.toggle();
        });

        document.getElementById("btn-cooking").addEventListener("click", () => {
            this.UI.cookinggame.toggle();
        });

        // Optional placeholders until implemented:
        document.getElementById("btn-skills").addEventListener("click", () => {
            console.log("Skills UI not implemented yet");
        });

        document.getElementById("btn-equipment").addEventListener("click", () => {
            console.log("Equipment UI not implemented yet");
        });



    }
    initTextures() {
        this.npcTexturesLoaded = false;

        return fetch("/npcs.json")
            .then(res => res.json())
            .then(json => {
                this.NPC_SPRITE_TABLE = json;
                this.textureCache = {};

                const loadPromises = Object.entries(json).map(([type, def]) => {
                    return iccColorPreloader.load(`/${def.file}`).then(tex => {
                        tex.encoding = THREE.LinearEncoding;
                        tex.flipY = true;
                        tex.magFilter = THREE.NearestFilter;
                        tex.minFilter = THREE.NearestFilter;
                        tex.needsUpdate = true;
                        this.textureCache[type] = tex;
                    });
                });

                return Promise.all(loadPromises);
            })
            .then(() => {
                this.npcTexturesLoaded = true;
                console.log("✅ Textures ready");
            });
    }


    update() {
        const delta = this.clock.getDelta();
        this.levelHandeler.attractLoot(this.players[this.localPlayerId]);
        for (const id in this.players) this.players[id].update(delta);
        for (const id in this.npcs) this.npcs[id].update(delta,this.camera);
        for (const id in this.chests) this.chests[id].update(delta);

        const player = this.players[this.localPlayerId];
        this.levelHandeler.player = player;
        this.levelHandeler.attractLoot(player);
        //this.levelHandeler.level=player.level;
        this.UI.update();
        this.caveDoor(new THREE.Vector3(this.caveposition.x, 0, this.caveposition.x));
    }


    draw() {
        this.renderer.render(this.scene, this.camera);
    }

    loop() {

        if (this.hasStartedLoop) return;
        this.hasStartedLoop = true;

        const loopInternal = () => {
            if (!this.useOrbitControls) this.followPlayer();
            else this.controls.update();

            this.update();
            if (this.VFX) {
                this.VFX.update();  // Update your VfxHandler each frame
            }
            if (this.gamepad) this.gamepad.loop(); // ✅ Start polling gamepad input

            this.draw();
            requestAnimationFrame(loopInternal);
            this.composer.render();
        };



        loopInternal();
    }


    followPlayer() {
        const player = this.players[this.localPlayerId];
        if (!player) return;
        const offset = new THREE.Vector3(0, 20, 20);
        const desiredPos = player.getposition().clone().add(offset);
        this.camera.position.copy(desiredPos);
    }

    toggleCameraFocus() {
        this.useOrbitControls = !this.useOrbitControls;
        this.controls.enabled = this.useOrbitControls;
        if (!this.useOrbitControls) {
            this.followPlayer();
        } else {
            const player = this.players[this.localPlayerId];
            if (player) {
                this.controls.target.copy(player.getposition());
                this.controls.update();
            }
        }
    }

    setCameraAngleAndLock(distance = 30, azimuthDeg = 45, elevationDeg = 45, target = new THREE.Vector3(0, 0, 0)) {
        const azimuth = THREE.MathUtils.degToRad(azimuthDeg);
        const elevation = THREE.MathUtils.degToRad(elevationDeg);
        const x = distance * Math.sin(azimuth) * Math.cos(elevation);
        const z = distance * Math.cos(azimuth) * Math.cos(elevation);
        const y = distance * Math.sin(elevation);
        this.camera.position.set(x, y, z);
        this.controls.target.copy(target);
        this.controls.enableRotate = false;
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        this.controls.update();
    }

    async addPlayer(id, position = { x: 0, y: 0, z: 0 }) {
        // Somewhere else in your code
        const tex = await iccColorPreloader.load('/sprites/player.png');
        tex.encoding = THREE.LinearEncoding;
        tex.flipY = true;
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.needsUpdate = true;


        if (this.players[id]) return;
        const player = new Player(this.scene,position,tex);
        this.players[id] = player;
        if (id === this.localPlayerId) {
            this.levelHandeler.playerRef = player;  // Assign here
        }
    }


    async addNpc(id, position, npcType, level) {

        // Lookup sprite info from your preloaded table
        const def = this.NPC_SPRITE_TABLE[npcType];
        if (!def) {
            console.warn(`No sprite definition found for NPC type '${npcType}'`);
            return;
        }

        const texture = this.textureCache[npcType];
        if (!texture) {
            console.warn(`Texture missing for NPC type '${npcType}'`);
            return;
        }

        const npcInstance = new npc(
            this.scene,
            texture,
            def.size,
            def.cols,
            def.rows,
            level,
            position,
            id,
            (inst) => { this.clickableObjects.push(inst.mesh); },
            (inst) => { delete this.npcs[id]; }
        );

        this.npcs[id] = npcInstance;
    }


    async addNode(name, position, sprite) {
        const node = await skillNode.create(this.scene, name, position, sprite);

        // Ensure the sprite (mesh) is valid and clickable
        if (node.mesh instanceof THREE.Object3D) {
            this.nodeMap.set(node.mesh, node);
            this.clickableObjects.push(node.mesh);
            this.nodeMap.push(node); // ✅ Track for animation/update
        } else {
            console.warn(`⚠️ Failed to create valid mesh for skill node '${name}'`);
        }

        return node;
    }

    addChest(id) {
        const pos = { x: 5, y: 0, z: -3 };
        const thischest = new Chest(id, this.scene, true, pos);
        this.chests[id] = thischest;
    }

    updateNpc(id, name,level, position, targetposition, angle, health) {
        if (!this.npcs[id]) return;
        //if(id=="goblinid4")console.log(targetposition);
        const npc=this.npcs[id];
        npc.name = name;
        npc.angle = angle;
        npc.health = health;
        npc.level = level;
        npc.position.copy(toVec3(position));
        npc.setTarget(toVec3(targetposition));

    }

    removePlayer(id) {
        const player = this.players[id];
        if (!player) return;
        if (player.model) {
            this.scene.remove(player.model);
            if (player.model.geometry) player.model.geometry.dispose();
            if (player.model.material) {
                if (Array.isArray(player.model.material)) {
                    player.model.material.forEach(mat => mat.dispose());
                } else {
                    player.model.material.dispose();
                }
            }
        }
        delete this.players[id];
    }

    playerUpdate(playerDataArray) {
        for (const data of playerDataArray) {
            const id = data.id;

            // Skip if player not found
            if (!this.players[id]) {
                console.warn(`[Game] Skipping update: Unknown player ID ${id}`);
                continue;
            }

            const player = this.players[id];

            // Skip update for new players not yet initialized
            if (!data.pos) {
                console.warn(`[Game] Skipping update: No position for ${id}`);
                continue;
            }

            // Set current server-authoritative position (snap or lerp)
            const serverPos = new THREE.Vector3(data.pos.x, data.pos.y, data.pos.z);

            if (id === this.localPlayerId) {
                // Local player: trust server fully, but optionally smooth a little
                player.position.lerp(serverPos, 0.5); // or .copy(serverPos) for hard snap
            } else {
                // Remote player: always lerp to avoid jitter
                player.position.lerp(serverPos, 0.2);
            }

            // Server-set movement data
            if (data.lockedpos) {
                player.lockedPosition.set(data.lockedpos.x, data.lockedpos.y, data.lockedpos.z);
            }

            if (data.targetpos) {
                player.setTarget(new THREE.Vector3(
                    data.targetpos.x,
                    data.targetpos.y,
                    data.targetpos.z
                ));
            }

            player.locked = data.locked ?? false;
            player.angle = data.angle ?? 0;
        }
    }


    UpdateChest(id, pos, grounded, targetObject, angle) {
        if (!this.chests[id]) return;
        this.chests[id].position.copy(toVec3(pos));
        this.chests[id].grounded = grounded;
        this.chests[id].targetObject = targetObject;
        this.chests[id].angle = angle;
    }

    debuglocktarget() {
        const targetGeometry = new THREE.BoxGeometry(1, 1, 1);
        const targetMaterial = new THREE.MeshStandardMaterial({ color: 'red' });
        this.object = new THREE.Mesh(targetGeometry, targetMaterial);
        this.scene.add(this.object);
    }

    debugmovetarget() {
        this.object.position.copy(this.players[this.localPlayerId].lockedPosition);
    }

    getScene() {
        return this.scene;
    }

    handleClick(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const hits = this.raycaster.intersectObject(this.ground);
        if (hits.length > 0) {
            const point = hits[0].point;
            const dist = this.camera.position.distanceTo(point);
            console.log(`Clicked at: ${point.toArray().map(v => v.toFixed(2))}, distance = ${dist.toFixed(2)}`);
        }
    }
    /*sendInputVector(x, y,playerId) {
        if(!this.players[playerId])
        {
            console.warn("player not yet connected but you are sending inputs")
            return;
        }
        this.players[playerId].inputVector(x,y);
    }*/
    spawnSpell(spelldata) {
        console.log("spawning spell at "+spelldata.position.x)
        const pos=new THREE.Vector3(spelldata.position.x,spelldata.position.y+0.1, spelldata.position.z);
        const pathname=spelldata.sprite;
        this.VFX.spawn(pathname, pos, 'flat', 10, spelldata.lifetime);


    }
    cleanLevel() {
        // Remove each NPC mesh from the scene and dispose resources
        for (const id in this.npcs) {
            const npc = this.npcs[id];
            if (!npc || !npc.mesh) continue;

            this.scene.remove(npc.mesh);

            if (npc.mesh.geometry) npc.mesh.geometry.dispose();
            if (npc.mesh.material) {
                if (Array.isArray(npc.mesh.material)) {
                    npc.mesh.material.forEach(mat => mat.dispose());
                } else {
                    npc.mesh.material.dispose();
                }
            }
        }

        // Empty the npc dictionary and clickable objects related to them
        this.npcs = {};
        this.clickableObjects = this.clickableObjects.filter(obj => obj.type !== 'Sprite' && obj.type !== 'Mesh');

        console.log("🧹 All NPCs cleared from scene.");
    }

}
