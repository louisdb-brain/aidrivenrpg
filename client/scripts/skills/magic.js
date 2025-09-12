export class magicSystem {
    constructor() {
        // Create canvas for drawing/targeting
        this.canvas = document.createElement('canvas');
        this.canvas.id = "spellCanvas";
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.zIndex = '10';
        this.canvas.style.pointerEvents = 'auto';
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
        this.menuContainer.style.zIndex = '11';
        document.body.appendChild(this.menuContainer);

        // ✅ Fetch spells and build buttons dynamically
        fetch('scripts/skills/spells.json')
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


        this.canvas.style.background = 'rgba(0,0,255,0.1)';

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

    selectSpell(spell) {
        this.activeSpell = spell;
        console.log(`${spell.name} selected`);
    }

    toggle() {
        const visible = this.canvas.style.display !== 'none';
        this.canvas.style.display = visible ? 'none' : 'block';
        this.menuContainer.style.display = visible ? 'none' : 'block';
    }
    updateAOEMarker(mouse, camera, raycaster, ground) {
        // Clear previous drawings
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.activeSpell||this.activeSpell===null) return;

        // Raycast to ground
        raycaster.setFromCamera(mouse, camera);
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

    getMousePositionToGround(mouse, camera, raycaster, groundPlane) {

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(groundPlane, false);

        if (intersects.length > 0) {
            return intersects[0].point.clone(); // ✅ World position on ground
        }

        return null; // No intersection found
    }



}
