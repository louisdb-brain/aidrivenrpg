import * as THREE from 'three';
import { SpriteBillboard } from './animatedbillboard.js';
import {io} from "socket.io-client"; // Adjust path if needed

export class skillNode {
    constructor( name,position,jsonID,skill,level,resources,emitCallback) {
        this.name=name;
        this.position = position

        this.type="skillNode";
        this.skill=skill;
        this.level=level;
        this.resources=resources;
        this.emitCallback=emitCallback
        this.emitNode();
    }
    emitNode() {
        const payload={
            name:this.name,
            position:this.position,
            skill:this.skill,
                    }
        this.emitCallback('emitnode',payload);
    }
    click(player) {
        this.checkSkill(player,this.skill,this.level);
    }
    gatherResource(player,resource) {
        player.inventory.additem(resource);

    }
    checkSkill(player,skill,level)
    {
        if(player.skillLevels[skill])
        {
            return true;
        }
        else
        {return false;}
    }
    consumeResource(resourceNeeded,player) {
        console.log(resource +" consumed");
        player.inventory.searchItem(resource);
    }
}