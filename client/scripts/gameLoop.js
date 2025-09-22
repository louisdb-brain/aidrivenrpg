import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { Player } from './player.js';
import { npc } from './npc.js';
import { Chest } from './chest.js';
import { toVec3 } from './networkclient.js';
import { UI } from './UIclient.js';
import { loadLevel } from '../levelEditor/loadlevel.js';
import { levelHandler } from './levelHandler.js';
import {vfxHandler} from "./vfxHandeler.js";

export class Game {
    constructor(handlers) {
        this.handlers = handlers;
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x99ffcc, 0.004);
        this.scene.background = new THREE.Color(0x99ffcc);



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
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        this.renderer.outputEncoding = THREE.LinearEncoding;
        this.renderer.toneMapping = THREE.NoToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        this.renderer.physicallyCorrectLights = false;


        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableZoom = true;
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this.setCameraAngleAndLock(30, 45, 45, new THREE.Vector3(0, 0, 0));

        this.useOrbitControls = true;

        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'f') this.toggleCameraFocus();
        });



        const hemi = new THREE.HemisphereLight(0xF0B05B, 0xA1A1A1);
        hemi.position.set(0, 200, 0);
        this.scene.add(hemi);

        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambient);

        const pointlight = new THREE.PointLight(0xffffff, 1.2, 800);
        pointlight.position.set(5, 0, -4);
        this.scene.add(pointlight);
        this.scene.add(new THREE.PointLightHelper(pointlight, 0.3));

        this.clock = new THREE.Clock();
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');


        this.players = {};
        this.npcs = {};
        this.chests = {};
        this.clickableObjects = [];
        this.hoverFrameCounter = 10;
        this.hasStartedLoop = false;

        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x306844, side: THREE.DoubleSide });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = -1.05;
        this.scene.add(this.ground);

        this.UI = new UI(this.scene, this.ctx, this.camera, this.canvas,this.ground,this.handlers);
        this.levelHandeler = new levelHandler(this.scene);
        this.VFX=new vfxHandler(this.scene, this.camera);
        fetch('/level1.json')
            .then(res => res.json())
            .then(async data => {
                await loadLevel(data, this.scene);
            });
    }

    update() {
        const delta = this.clock.getDelta();
        for (const id in this.players) this.players[id].update(delta);
        for (const id in this.npcs) this.npcs[id].update(delta);
        for (const id in this.chests) this.chests[id].update(delta);

        const player = this.players[this.localPlayerId];
        this.levelHandeler.playerRef = player;
        this.UI.update();
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
            this.draw();
            requestAnimationFrame(loopInternal);
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

    addPlayer(id, position = { x: 0, y: 0, z: 0 }) {
        if (this.players[id]) return;
        const player = new Player(this.scene, position);
        this.players[id] = player;
    }

    addNpc(id, position = { x: 0, y: 0, z: 0 }, npcid) {
        const thisnpc = new npc(this.scene, position, npcid, (npcInstance) => {
            if (npcInstance.mesh) this.clickableObjects.push(npcInstance.mesh);
        });
        this.npcs[id] = thisnpc;
    }

    addChest(id) {
        const pos = { x: 5, y: 0, z: -3 };
        const thischest = new Chest(id, this.scene, true, pos);
        this.chests[id] = thischest;
    }

    updateNpc(id, name, position, targetposition, angle, health) {
        if (!this.npcs[id]) return;
        this.npcs[id].name = name;
        this.npcs[id].angle = angle;
        this.npcs[id].health = health;
        this.npcs[id].position.copy(toVec3(position));
        this.npcs[id].setTarget(toVec3(targetposition));
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

    playerUpdate(id, pos, target, locked, lockedpos, angle) {
        if (!this.players[id]) return;
        const player = this.players[id];
        player.angle = angle;
        player.position.copy(toVec3(pos));
        player.setTarget(toVec3(target));
        player.locked = locked;
        player.setLockedTarget(toVec3(lockedpos));
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
    }
    spawnSpell(spelldata) {
        console.log("spawning spell at "+spelldata.position.x)
        const pos=new THREE.Vector3(spelldata.position.x,spelldata.position.y+0.1, spelldata.position.z);
        this.VFX.spawn('/icons/fireball.png', pos, 'flat', 10, spelldata.lifetime);


    }
}
