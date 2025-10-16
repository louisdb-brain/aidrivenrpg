export const levelManager = {
    levels: new Map(),

    getLevel(id) {
        if (!this.levels.has(id)) {
            this.levels.set(id, new Level(id));
        }
        return this.levels.get(id);
    },

    updateAll(delta) {
        for (const level of this.levels.values()) {
            if (level.active) {
                level.update(delta);
            }
        }
    },

    addPlayerToLevel(id, player) {
        const level = this.getLevel(id);
        level.addPlayer(player);
    },

    cleanup() {
        for (const [id, level] of this.levels.entries()) {
            if (!level.active) {
                this.levels.delete(id);
            }
        }
    }
};
