export class magicSystem {
    constructor(canvas,scene,handlers) {
        this.networkhandlers=handlers;
        // Create canvas for drawing/targeting
        this.canvas = document.createElement('canvas');
        this.uiCanvas=canvas;
        this.scene=scene;

        this.canvas.id = "spellCanvas";
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.zIndex = '10';
        this.canvas.style.pointerEvents = 'none';
        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        this.spells = [];
        this.activeSpell = null;

        // Create spell menu container
        this.menuContainer = document.createElement('div');
        this.menuContainer.id = "spellMenu";
        this.menuContainer.style.position = 'absolute';
        this.menuContainer.style.bottom = '20px';
        this.menuContainer.style.left = '20px';
        this.menuContainer.style.zIndex = '1000';
        this.menuContainer.style.pointerEvents = 'auto';
        document.body.appendChild(this.menuContainer);

        // ✅ Fetch spells and build buttons dynamically
        fetch('/spells.json')
            .then(res => {
                if (!res.ok) throw new Error('spells.json not found');
                return res.json();
            })
            .then(data => {
                this.spells = data;
                this.createSpellMenu();
                console.log("spell menu created");
            })
            .catch(err => console.error(err));
        let spellActive=false;

        //attempt at hotkeysf
        window.addEventListener('keyup', (event) => {
            if(event.key==='a'){
                this.spellmenu.selectSpell("fireball")
            }});
        //canvas tester
        //this.canvas.style.background = 'rgba(0,0,255,0.1)';

    }

    createSpellMenu() {
        this.menuContainer.innerHTML = '';

        this.spells.forEach(spell => {
            console.log("creating spell " + spell.id);

            const btn = document.createElement('button');
            btn.innerHTML = `<img src="${spell.icon}" alt="${spell.name}" style="width:40px;height:40px;" />`;

            // ✅ Prevent the click from propagating to your raycaster handler
            btn.addEventListener('click', e => {
                //e.stopPropagation(); // stops click-to-move
                this.selectSpell(spell);
            });

            this.menuContainer.appendChild(btn);
        });
    }
    selectSpellByName(name) {
        const spell = this.spells.find(s => s.name === name);
        console.log("spritename "+spell.spellSprite);
        if (spell) {
            this.selectSpell(spell);
        } else {
            console.warn(`Spell '${name}' not found.`);
        }
    }

    selectSpell(spell) {
        this.activeSpell = spell;
        console.log(`${spell.name} selected`);
    }

    toggle() {
        const visible = this.canvas.style.display !== 'none';
        this.canvas.style.display = visible ? 'none' : 'block';
        this.menuContainer.style.display = visible ? 'none' : 'block';
    }
    updateAOEMarker( raycaster, ground) {
        // Clear previous drawings
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.activeSpell||this.activeSpell===null) return;

        // Raycast to ground

        const intersects = raycaster.intersectObject(ground);
        if (intersects.length === 0) return;

        const worldPos = intersects[0].point;

        // Convert world position to screen coordinates
        const screen = worldPos.clone().project(camera);
        const x = (screen.x +1) / 2 * this.canvas.width;
        const y = (-screen.y +1) / 2 * this.canvas.height;

        console.log(`AOE update running at x:${x}, y:${y}`);



        // Draw the AOE marker
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.activeSpell.radius, 0, Math.PI * 2); // ✅ use (x, y)
        this.ctx.fillStyle = 'rgba(255,0,0,0.3)';
        this.ctx.fill();
    }
    castSpell(position){

        if (!this.activeSpell) {
            console.warn('No spell selected');
            return;
        }

        const pos = { x: position.x, y: position.y, z: position.z };
        const spellData = {
            ...this.activeSpell, // copies id, name, damage, radius, lifetime, etc.
            position: pos,
            radius: Number(this.activeSpell.radius) ,     // enforce numeric
            damage: Number(this.activeSpell.damage) ,
            lifetime: Number(this.activeSpell.lifetime)
        };

        // ✅ Check if onSpellcast exists and is callable
        if (this.networkhandlers && typeof this.networkhandlers.onSpellcast === 'function') {
            this.networkhandlers.onSpellcast(spellData);
        } else {
            console.warn('onSpellcast handler is not defined');
        }
        this.activeSpell = null;
    }

    getMousePositionToGround(mouse, camera, raycaster, groundPlane) {
        if (!groundPlane) {
            console.error('getMousePositionToGround: groundPlane is undefined');
            return null;
        }
        const intersects = raycaster.intersectObject(groundPlane, false);

        if (intersects.length > 0) {
            return intersects[0].point.clone(); // ✅ World position on ground
        }

        return null; // No intersection found
    }



}
