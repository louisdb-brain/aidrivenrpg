import {player} from "./player.js";

const players = {};

export const playermanager = {

    addPlayer(id, position = { x: 0, y: 0, z: 0 }) {
        players[id] = new player(id,position,`Player-${id.slice(0, 5)}`)

        //console.log(players[id]);

    },

    removePlayer(id) {
        delete players[id];
    },

    getAllPlayers() {
        return players;
    },
    update(delta)
    {
        for(const player in players) {
            players[player].update(delta);
        }
    },
    setTarget(id,pTarget,rightmouse){

        if(rightmouse==true)
        {

            if(!players[id].locked){
                players[id].locked = true;
                players[id].lockedPosition=pTarget;
                players[id].targetPosition = pTarget;
            }
            else players[id].locked = false;
        }
        else{
            players[id].targetPosition = pTarget;
        }
    },
    updatePlayerPosition(id, pos,target) {

        //console.log(pos);
        if (players[id]&& players[id].position) {
            players[id].position = pos;
            players[id].target = target;
        }
    },
    getTarget(id)
    {
        return players[id].targetPosition;
    },
    getPlayerPosition(id) {

        if (players[id] && players[id].position) {
            return players[id].position;
        } else {
            return { x: 0, y: 0, z: 0 }; // or `null` if you prefer
        }
    },

    getPlayer(id) {
        return players[id];
    },

    setwantedLevel(id, pwantedlevel) {
        if (players[id] )
        {
            players[id].wantedlevel = pwantedlevel;
        }
    }

};