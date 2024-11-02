let doorsOpen = { left: false, right: false };

function toggleDoor(door, side) {
    doorsOpen[side] = !doorsOpen[side];
    door.classList.toggle(`open-${side}`);
    
    const leftCompartment = document.getElementById('left-compartment');
    const rightCompartment = document.getElementById('right-compartment');
    
    if (doorsOpen.left && doorsOpen.right) {
        setTimeout(() => {
            leftCompartment.classList.add('visible');
            rightCompartment.classList.add('visible');
            loadFoodItems();
        }, 300);
    } else {
        leftCompartment.classList.remove('visible');
        rightCompartment.classList.remove('visible');
    }
}

function loadFoodItems() {
    fetch('/fridge/get_fridge_items')
        .then(response => response.json())
        .then(data => {
            const leftCompartment = document.getElementById('left-compartment');
            const rightCompartment = document.getElementById('right-compartment');
            
            leftCompartment.innerHTML = '';
            rightCompartment.innerHTML = '';
            
            const compartmentItems = {
                'left-compartment': {},
                'right-compartment': {}
            };

            data.forEach(item => {
                const compartment = item.compartment;
                const category = item.category || 'Other';
                
                if (!compartmentItems[compartment][category]) {
                    compartmentItems[compartment][category] = [];
                }
                compartmentItems[compartment][category].push(item);
            });

            Object.entries(compartmentItems).forEach(([compartmentId, categories]) => {
                const compartment = document.getElementById(compartmentId);
                Object.entries(categories).forEach(([category, items]) => {
                    createShelf(compartment, category, items);
                });
            });
        })
        .catch(error => console.error('Error loading fridge items:', error));
}

function createShelf(compartment, classification, items) {
    const shelf = document.createElement('div');
    shelf.className = 'shelf';
    
    const title = document.createElement('div');
    title.className = 'shelf-title';
    title.textContent = classification;
    shelf.appendChild(title);
    
    items.forEach(item => {
        const foodItem = document.createElement('div');
        foodItem.className = 'food-item';
        foodItem.draggable = true;
        
        const itemName = document.createElement('span');
        itemName.textContent = item.name;
        foodItem.appendChild(itemName);
        
        const hoverInfo = document.createElement('div');
        hoverInfo.className = 'food-item-info';
        const quantity = item.quantity_or_weight && item.unit ? 
            `${item.quantity_or_weight}${item.unit} left` : 
            'Quantity not specified';
        const bestBefore = `${item.best_before_in_fridge}天变质`;
        hoverInfo.innerHTML = `
            <div>${quantity}</div>
            <div>${bestBefore}</div>
        `;
        foodItem.appendChild(hoverInfo);

        foodItem.addEventListener('dragstart', (event) => {
            event.dataTransfer.setData('application/json', JSON.stringify({
                ...item,
                sourceShelf: classification,
                sourceCompartment: compartment.id
            }));
            event.currentTarget.classList.add('dragging');
        });

        foodItem.addEventListener('dragend', (event) => {
            event.currentTarget.classList.remove('dragging');
        });
        
        shelf.appendChild(foodItem);
    });
    
    shelf.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.currentTarget.classList.add('shelf-drag-over');
    });

    shelf.addEventListener('dragleave', (event) => {
        event.currentTarget.classList.remove('shelf-drag-over');
    });

    shelf.addEventListener('drop', handleFridgeItemDrop);
    
    compartment.appendChild(shelf);
}

async function handleFridgeItemDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('shelf-drag-over');
    
    const itemData = JSON.parse(event.dataTransfer.getData('application/json'));
    const targetShelf = event.currentTarget;
    const targetCompartment = targetShelf.closest('.compartment').id;
    
    if (itemData.sourceCompartment === targetCompartment && 
        itemData.sourceShelf === targetShelf.querySelector('.shelf-title').textContent) {
        return;
    }
    
    try {
        const response = await fetch('/fridge/move_fridge_item', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                item: itemData,
                targetCompartment: targetCompartment
            })
        });

        if (response.ok) {
            loadFoodItems();
        }
    } catch (error) {
        console.error('Error moving fridge item:', error);
    }
}

function initializeFridge() {
    const compartments = document.querySelectorAll('.compartment');
    
    compartments.forEach(compartment => {
        compartment.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.currentTarget.classList.add('drag-over');
        });

        compartment.addEventListener('dragleave', (event) => {
            event.currentTarget.classList.remove('drag-over');
        });

        compartment.addEventListener('drop', handleItemDrop);
    });
}

async function handleItemDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    
    const itemData = JSON.parse(event.dataTransfer.getData('application/json'));
    const compartmentId = event.currentTarget.id;
    
    try {
        const response = await fetch('/fridge/add_to_fridge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                item: itemData,
                compartment: compartmentId
            })
        });

        const result = await response.json();
        if (result.success) {
            await fetch('/fridge/remove_from_shopping', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: itemData.name })
            });

            loadFoodItems();
            loadShoppingList();
        }
    } catch (error) {
        console.error('Error adding item to fridge:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeFridge();
    window.toggleDoor = toggleDoor;
});
