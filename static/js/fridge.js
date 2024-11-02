// Refrigerator-related JavaScript
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
    fetch('/fridge/get_food_items')
        .then(response => response.json())
        .then(data => {
            const leftCompartment = document.getElementById('left-compartment');
            const rightCompartment = document.getElementById('right-compartment');
            
            leftCompartment.innerHTML = '';
            rightCompartment.innerHTML = '';
            
            const groupedItems = {};
            data.forEach(item => {
                const classification = item.category || 'Other';
                if (!groupedItems[classification]) {
                    groupedItems[classification] = [];
                }
                groupedItems[classification].push(item);
            });

            const classifications = Object.keys(groupedItems);
            const midPoint = Math.ceil(classifications.length / 2);
            
            classifications.slice(0, midPoint).forEach(classification => {
                createShelf(leftCompartment, classification, groupedItems[classification]);
            });
            
            classifications.slice(midPoint).forEach(classification => {
                createShelf(rightCompartment, classification, groupedItems[classification]);
            });
        })
        .catch(error => console.error('Error loading food items:', error));
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
        foodItem.textContent = `${item.name} - ${item.quantity_or_weight} ${item.unit}`;
        shelf.appendChild(foodItem);
    });

    compartment.appendChild(shelf);
}
