const players = {};

export const playerManager = {
    addPlayer(id, position = { x: 0, y: 0, z: 0 }) {
        players[id] = {
            id,
            position,
            target:0,
            name: `Player-${id.slice(0, 5)}`
        };
    },

    removePlayer(id) {
        delete players[id];
    },

    getAllPlayers() {
        return players;
    },

    updatePlayerPosition(id, pos) {
        if (players[id]) {
            players[id].position = pos;
        }
    },

    getPlayer(id) {
        return players[id];
    }
};