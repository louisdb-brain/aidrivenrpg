
import {Spell} from "./spell.js";


export class SpellManager {
    constructor( npcManager, playerManager,socket,io) {
        this.io = io;
        this.npcManager = npcManager;
        this.playerManager = playerManager;
        this.activeSpells = []; // {id, casterId, position, velocity, radius, ttl}

    }

    castSpell(casterId, spellData) {
        const radius = Number(spellData.radius) || 2;
        const damage = Number(spellData.damage) || 1;
        const lifetime = Number(spellData.lifetime) || 150;

        const spell = new Spell(
            spellData.id,
            casterId,
            spellData.sprite,
            radius,
            damage,
            lifetime,
            spellData.position
        );

        this.activeSpells.push(spell);
    }

    update() {
        this.activeSpells.forEach(spell => this.checkCollisions(spell));
        //this.activeSpells.forEach(spell => this.activeSpells[spell].tick());


        /*if (spell.velocity!=0) {



                // move spell
                const step = spell.velocity.clone().multiplyScalar(deltaMs / 1000);
                spell.position.add(step);

                // check collisions
                this.checkCollisions(spell);

            }*/


    }

    checkCollisions(spell) {


        if(spell.dealtdamage){return};
        // NPC collisions
        for (const npcId in this.npcManager.npcs) {
            const npc = this.npcManager.npcs[npcId];

            const dx = spell.position.x - npc.position.x;
            const dz = spell.position.z - npc.position.z; // or .y if you’re using y
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist <= spell.radius ) {
                npc.takeDamage(spell.damage);
                this.io.emit('npc-takedamage', { id: npcId, amount: spell.damage });

                    console.log(`Hit ${npc.id} at dist ${dist.toFixed(2)} (radius ${spell.radius})`);


            }
        }

        // Player collisions (PvP or friendly fire)
        const players = this.playerManager.getAllPlayers();
        for (const player of Object.values(players)) {

            const dx = spell.position.x - player.position.x;
            const dz = spell.position.z - player.position.z; // or .y if you’re using y
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist <= spell.radius + 0.5) {
                // apply damage or effect
                this.io.emit('player-takedamage', { id: player.id, amount: spell.damage });

            }
        }
        spell.dealtdamage = true;
    }
}
