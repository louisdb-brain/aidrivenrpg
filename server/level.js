class Level {
    constructor(id) {
        this.id = id;
        this.players = new Map(); // playerId -> Player
        this.entities = new Map(); // entityId -> Entity
        this.active = true; // used for sleeping logic
    }
    addPlayer(player) {
        this.players.set(player.id, player);
        this.setActive(true);
    }
    removePlayer(playerId) {
        if (this.players.size === 0 && this.entities.size === 0) {
            this.active = false;
        }
    }
    addEntity(entity) {
        this.entities.set(entity.id, entity);
    }
    setActive(state = true) {
        this.active = state;
    }

    update(delta) {
        if (!this.active) return;
        for (const player of this.players.values()) player.update(delta);
        for (const entity of this.entities.values()) entity.update(delta);

        if (this.players.size === 0 && this.entities.size === 0) {
            this.active = false;
        }
    }
    getPlayers() {
        return this.players;
    }
}
