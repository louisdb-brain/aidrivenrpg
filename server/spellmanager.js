
import {Spell} from "./spell.js";

export class SpellManager {
    constructor( npcManager, playerManager,socket) {
       // this.io = io;
        this.npcManager = npcManager;
        this.playerManager = playerManager;
        this.activeSpells = []; // {id, casterId, position, velocity, radius, ttl}

    }

    castSpell(casterId, spellData) {
        const spell = new Spell(spellData.id,casterId,spellData.radius,spellData.damage,spellData.lifetime);
        this.activeSpells.push(spell);
    }

    update() {
        for(const spell in this.activeSpells) {
        this.checkCollisions(spell);
        /*if (spell.velocity!=0) {



                // move spell
                const step = spell.velocity.clone().multiplyScalar(deltaMs / 1000);
                spell.position.add(step);

                // check collisions
                this.checkCollisions(spell);

            }*/

        }
    }

    checkCollisions(spell) {
        // NPC collisions
        for (const npcId in this.npcManager.npcs) {
            const npc = this.npcManager.npcs[npcId];
            const dist = spell.position.distanceTo(npc.position);
            if (dist <= spell.radius + npc.hitRadius) {
                npc.takeDamage(spell.damage);
                this.io.emit('npc-takedamage', { id: npcId, amount: spell.damage });
                // Remove spell on first hit (optional)
                //spell.ttl = 0;
                return;
            }
        }

        // Player collisions (PvP or friendly fire)
        const players = this.playerManager.getAllPlayers();
        for (const playerId in players) {
            if (playerId === spell.casterId) continue;
            const pl = players[playerId];
            const dist = spell.position.distanceTo(pl.position);
            if (dist <= spell.radius + 0.5) {
                // apply damage or effect
                this.io.emit('player-hit', { id: playerId, amount: spell.damage });
                spell.ttl = 0;
                return;
            }
        }
    }
}
