
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { Player } from './player.js';
import {npc} from './npc.js';
import {Chest} from './chest.js';
import {NetworkClient} from './networkclient.js';
import { toVec3 } from './networkclient.js';
import https from 'https';;
import{UI}from'./uiclient.js';
import { loadLevel } from '../leveleditor/loadlevel.js';

export class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.localPlayerId=0;
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

        this.canvas=document.createElement('canvas');
        this.ctx=this.canvas.getContext('2d');
        this.UI=new UI(this.scene,this.ctx,this.camera,this.canvas);


        this.players = {};
        this.npcs={};
        this.chests={};
        this.clickableObjects=[];

        //this.loadLevel()




        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x555555,
            side: THREE.DoubleSide,
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2; // Rotate to face up
        this.ground.position.y = -1.05;
        this.scene.add(this.ground);

        fetch('/levels/level1.json')
            .then(res => res.json())
            .then(data => {
                loadLevel(data, this.scene); // scene should be the same one you render in
            });



    }
    loadLevel() {


    }

    update() {
        this.UI.createRect();
        //this.UI.drawImage("sprites/uitest.png")

        const delta = this.clock.getDelta();
        for (const id in this.players) {
            this.players[id].update(delta);
        }
        for (const id in this.npcs) {
            this.npcs[id].update(delta);

        }
        for (const id in this.chests)
        {
            this.chests[id].update(delta);
        }

        const player = this.players[this.localPlayerId];
        if (player) {
            const offset = new THREE.Vector3(0, 10, -15); // tweak to your taste
            const targetPos = player.position.clone()
            //this.controls.target.set(targetPos);
            this.camera.lookAt(targetPos);
            //this.camera.position.lerp(targetPos, 0.1);
            /*this.camera.lookAt(player.position);*/
        }
        //places cube where locktarget is for debugging
        //this.debuglocktarget();

    }

    draw() {
        this.renderer.render(this.scene, this.camera);
    }

    loop() {
        requestAnimationFrame(() => this.loop());
        this.update();
        this.draw();
        //this.debugmovetarget()

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
        this.cacheClickableObjects();

    }

    addNpc(id, position = { x: 0, y: 0, z: 0 },npcid)
    {
        const thisnpc=new npc(this.scene, position,npcid);

        this.npcs[id]=thisnpc;
        this.cacheClickableObjects();
    }
    addChest(id)
    {
        const pos = { x: 5, y: 0, z: -3 };
        const thischest=new Chest(id,this.scene,true,pos);
        this.chests[id]=thischest;
        this.cacheClickableObjects();
    }
    updateNpc(id,name,position,targetposition,angle,health)
    {
        if (!this.npcs[id]) return;

        this.npcs[id].name = name;
        this.npcs[id].angle = angle;
        this.npcs[id].health = health;

        this.npcs[id].position.copy(toVec3(position));
        this.npcs[id].setTarget(toVec3(targetposition));

    }
    removePlayer(id) {
        const player = this.players[id];

        if (!player) {
            console.warn(`Tried to remove player with ID ${id}, but they do not exist.`);
            return;
        }

        if (player && player.model) {
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
    playerUpdate(id,pos,target,locked,lockedpos,angle)
    {
        if (!this.players[id]) return;
        const player=this.players[id]
        player.angle = angle;
        player.position.copy(toVec3(pos));
        player.setTarget(toVec3(target));
        player.locked = locked;
        player.setLockedTarget(toVec3(lockedpos));
    }
    UpdateChest(id,pos,grounded,targetObject,angle)
    {
        if(this.chests[id]) {

            this.chests[id].position.copy(toVec3(pos));
            this.chests[id].grounded=grounded;
            this.chests[id].targetObject=targetObject;
            this.chests[id].angle=angle;


        }
    }
    debuglocktarget() {
        const targetGeometry = new THREE.BoxGeometry(1, 1, 1);
        const targetMaterial = new THREE.MeshStandardMaterial({color: 'red'});
        this.object = new THREE.Mesh(targetGeometry, targetMaterial);

        this.scene.add(this.object);
    }
    debugmovetarget()
    {
        this.object.position.copy(this.players[this.localPlayerId].lockedPosition);
    }
    getScene()
    {
        return this.scene;
    }
    handleClick(event)
    {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

    }
    cacheClickableObjects()
    {
        //code here for clickable objects like npc or players
    }




}
