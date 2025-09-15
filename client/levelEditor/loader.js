// Single reference for the selector and preview
const modelSelect   = document.getElementById('modelSelector');
const spritePreview = document.getElementById('spritePreview');

const addBtn        = document.getElementById('addToPaletteBtn');
const saveBtn       = document.getElementById('savePaletteBtn');
const loadBtn       = document.getElementById('loadPaletteBtn');
const paletteDisplay = document.getElementById('paletteDisplay');

let models  = [];
let palette = [];

/* ---------- Fetch list.json and populate ---------- */
fetch('./list.json')   // Use /list.json so Vite serves from /public
    .then(res => {
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        return res.json();
    })
    .then(data => {
        models = data;
        populateSelector();
        if (models.length > 0) {
            modelSelect.value = models[0];
            spritePreview.src = "/sprites/" + models[0];
        }
    })
    .catch(err => console.error('Failed to load list.json:', err));

/* ---------- Populate dropdown selector ---------- */
function populateSelector() {
    modelSelect.innerHTML = '';
    models.forEach(file => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file;
        modelSelect.appendChild(option);
    });
}

/* ---------- Render palette thumbnails ---------- */
function renderPalette() {
    paletteDisplay.innerHTML = '';
    palette.forEach(file => {
        const img = document.createElement('img');
        img.src = "/sprites/" + file;
        img.dataset.file = file;

        img.addEventListener('click', () => {
            // Deselect all thumbnails
            document.querySelectorAll('#paletteDisplay img')
                .forEach(el => el.classList.remove('selected'));
            img.classList.add('selected');

            // Sync selector and preview
            modelSelect.value = file;
            spritePreview.src = "/sprites/" + file;
        });

        paletteDisplay.appendChild(img);
    });
}

/* ---------- Selector change updates preview ---------- */
modelSelect.addEventListener('change', () => {
    spritePreview.src = "/sprites/" + modelSelect.value;
});

/* ---------- Add current item to palette ---------- */
addBtn.addEventListener('click', () => {
    const current = modelSelect.value;
    if (!palette.includes(current)) {
        palette.push(current);
        renderPalette();
    } else {
        alert('This item is already in the palette.');
    }
});

/* ---------- Save palette to JSON ---------- */
saveBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(palette, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'palette.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

/* ---------- Load palette from JSON ---------- */
loadBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                if (Array.isArray(data)) {
                    palette = data;
                    renderPalette();
                } else {
                    alert('Invalid palette format.');
                }
            } catch (err) {
                alert('Failed to load palette: ' + err.message);
            }
        };
        reader.readAsText(file);
    });
    input.click();
});
