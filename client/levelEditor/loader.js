const selector = document.getElementById('modelSelector');
let models = [];

fetch('./list.json')
    .then(res => res.json())
    .then(data => {
        models = data;
        populateSelector();
    })
    .catch(err => console.error('Failed to load list.json:', err));

function populateSelector() {
    models.forEach(object => {
        const option = document.createElement('option');
        option.value = object;
        option.textContent = object;
        selector.appendChild(option);
    });
}

selector.addEventListener('change', () => {
    console.log('Selected:', selector.value);
});

