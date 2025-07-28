import React, { useState, useEffect } from 'react';
import './SpellEditor.css';



function SpellEditor() {
    const [spells, setSpells] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        window.electronAPI.loadSpells()
            .then(data => {
                setSpells(data);
                setSelectedIndex(0);
            })
            .catch(err => console.error('Failed to load spells:', err));
    }, []);

    const handleSpellChange = (field, value) => {
        const updated = [...spells];
        updated[selectedIndex][field] = value;
        setSpells(updated);
    };

    const selectedSpell = spells[selectedIndex];
    const handleAddSpell = () => {
        const newSpell = {
            id: `new_spell_${Date.now()}`,
            name: 'New Spell',
            description: null,
            cooldown: null,
            mana_cost:null ,
            effects: []
        };

        const updated = [...spells, newSpell];
        setSpells(updated);
        setSelectedIndex(updated.length - 1); // Focus the new spell
    };

    return (
        <div className="spell-editor">
            <h2>🧙 Spell Editor</h2>

            {/* Dropdown */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                <select
                    onChange={e => setSelectedIndex(parseInt(e.target.value))}
                    value={selectedIndex}
                    style={{ flex: 1 }}
                >
                    {spells.map((spell, i) => (
                        <option key={i} value={i}>
                            {spell.name || '(Unnamed Spell)'}
                        </option>
                    ))}
                </select>

                <button onClick={handleAddSpell}>➕ New</button>
            </div>

            {/* Selected Spell Details */}
            {selectedSpell && (
                <div className="spell-card">
                    <input
                        value={selectedSpell.name}
                        onChange={e => handleSpellChange('name', e.target.value)}
                        placeholder="Spell Name"
                    />
                    <input
                        value={selectedSpell.id}
                        onChange={e => handleSpellChange('id', e.target.value)}
                        placeholder="Spell ID"
                    />
                    <textarea
                        value={selectedSpell.description}
                        onChange={e => handleSpellChange('description', e.target.value)}
                        placeholder="Description"
                    />
                    <input
                        type="number"
                        value={selectedSpell.cooldown}
                        onChange={e => handleSpellChange('cooldown', parseFloat(e.target.value))}
                        placeholder="Cooldown"
                    />
                    <input
                        type="number"
                        value={selectedSpell.mana_cost}
                        onChange={e => handleSpellChange('mana_cost', parseFloat(e.target.value))}
                        placeholder="Mana Cost"
                    />
                </div>

            )}
            <button
                className="save-button"
                onClick={() => window.electronAPI.saveSpells(spells)}
            >
                💾 Save Spells
            </button>

        </div>

    );
}

export default SpellEditor;
