const players = {};

export const playermanager = {
    addPlayer(id, position = { x: 0, y: 0, z: 0 }) {
        players[id] = {
            id,
            position,
            target:{ x: 0, y: 0, z: 0 },
            name: `Player-${id.slice(0, 5)}`
        };
        console.log(players[id]);

    },

    removePlayer(id) {
        delete players[id];
    },

    getAllPlayers() {
        return players;
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
        return players[id].target;
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
    }

};