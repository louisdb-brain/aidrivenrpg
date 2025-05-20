
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { Player } from './player.js';
import {npc} from './npc.js';
import {NetworkClient} from './networkclient.js';
import { toVec3 } from './networkclient.js';
import https from 'https';;

export class Game {
    constructor() {
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 5;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 1, 0); // optional: focus on character height
        this.controls.update();


        const light = new THREE.HemisphereLight(0xffffff, 0x444444);
        light.position.set(0, 200, 0);
        this.scene.add(light);

        this.clock = new THREE.Clock();
        //this.player = new Player(this.scene,0,0,0,'/models/character.glb');

        this.players = {};
        this.npcs={};


        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x555555,
            side: THREE.DoubleSide,
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2; // Rotate to face up
        this.ground.position.y = -1.05;
        this.scene.add(this.ground);



    }

    update() {
        const delta = this.clock.getDelta();
        for (const id in this.players) {
            this.players[id].update(delta);
        }
        for (const id in this.npcs) {
            this.npcs[id].update(delta);
        }
        console.log(this.npcs)
    }

    draw() {
        this.renderer.render(this.scene, this.camera);
    }

    loop() {
        requestAnimationFrame(() => this.loop());
        this.update();
        this.draw();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);

    }
    addPlayer(id, position = { x: 0, y: 0, z: 0 }){
         {

             //add more code here in future to make adding position on other location
            if (this.players[id]) return;
            const player = new Player(this.scene,position);
            this.players[id] = player;
        }

    }

    addNpc(id, position = { x: 0, y: 0, z: 0 })
    {
        const thisnpc=new npc(this.scene, position);
        console.log(thisnpc);
        this.npcs[id]=thisnpc;
    }
    updateNpc(id,name,position,targetposition,angle,health)
    {
        if (!this.npcs[id]) return;

        this.npcs[id].name = name;
        this.npcs[id].angle = angle;
        this.npcs[id].health = health;

        this.npcs[id].position.copy(position);
        this.npcs[id].setTarget(targetposition);

    }
    removePlayer(id) {
        const player = this.players[id];
        if (player && player.model) {
            this.scene.remove(player.model);
        }
        delete this.players[id];

    }
    posUpdate(id,pos,target)
    {
        //need this function to change from plain data to three vector object
        //const temppos = new THREE.Vector3(pos.x, pos.y, pos.z);
        //const temptarget = new THREE.Vector3(target.x, target.y, target.z);
        //const temppos=toVec3(target)
        //const temptarget=toVec3(target);

        this.players[id].position.copy(toVec3(pos));
        this.players[id].targetPosition.copy(toVec3(target));
    }






}
