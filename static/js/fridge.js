let doorsOpen = { left: false, right: false };

function toggleDoor(door, side) {
    console.log('Toggling door:', side, 'Current state:', doorsOpen);
    doorsOpen[side] = !doorsOpen[side];
    door.classList.toggle(`open-${side}`);
    
    const leftCompartment = document.getElementById('left-compartment');
    const rightCompartment = document.getElementById('right-compartment');
    
    console.log('Door states after toggle:', doorsOpen);
    
    if (doorsOpen.left && doorsOpen.right) {
        console.log('Both doors open, loading items...');
        setTimeout(() => {
            leftCompartment.classList.add('visible');
            rightCompartment.classList.add('visible');
            loadFoodItems();
        }, 300);
    } else {
        console.log('Closing compartments');
        leftCompartment.classList.remove('visible');
        rightCompartment.classList.remove('visible');
    }
}

async function loadFoodItems() {
    console.log('Loading food items...');
    fetch('/fridge/get_fridge_items')
        .then(response => response.json())
        .then(async data => {
            console.log('Received fridge items:', data);
            if (!data || !Array.isArray(data)) {
                console.error('No fridge items found or invalid data format');
                data = [];
            }
            
            const leftCompartment = document.getElementById('left-compartment');
            const rightCompartment = document.getElementById('right-compartment');
            
            console.log('Left compartment:', leftCompartment);
            console.log('Right compartment:', rightCompartment);
            
            leftCompartment.innerHTML = '';
            rightCompartment.innerHTML = '';
            
            // Create fixed category shelves for each compartment
            for (const category of Object.keys(CATEGORIES)) {
                console.log(`Creating shelves for category: ${category}`);
                const leftItems = data.filter(item => 
                    item.compartment === 'left-compartment' && 
                    determineCategory(item.category) === category
                );
                const rightItems = data.filter(item => 
                    item.compartment === 'right-compartment' && 
                    determineCategory(item.category) === category
                );
                
                console.log(`Left items for ${category}:`, leftItems);
                console.log(`Right items for ${category}:`, rightItems);
                
                await createShelf(leftCompartment, category, leftItems);
                await createShelf(rightCompartment, category, rightItems);
            }
        })
        .catch(error => {
            console.error('Error loading fridge items:', error);
        });
}

async function createShelf(compartment, classification, items) {
    console.log(`Creating shelf for ${classification} with items:`, items);
    
    const shelf = document.createElement('div');
    shelf.className = 'shelf';
    shelf.dataset.category = classification;
    
    const title = document.createElement('div');
    title.className = 'shelf-title';
    title.textContent = classification;
    shelf.appendChild(title);
    
    // Add items to shelf - now with await
    for (const item of items) {
        console.log(`Adding item to shelf:`, item);
        const foodItem = await createFoodItem(item, classification);
        shelf.appendChild(foodItem);
    }
    
    // Add drop zone functionality
    shelf.addEventListener('dragover', (event) => {
        event.preventDefault();
        const draggedItem = JSON.parse(event.dataTransfer.getData('application/json') || '{}');
        const itemCategory = determineCategory(draggedItem.category || '');
        
        // Only show drop indicator if category matches
        if (itemCategory === classification) {
            event.currentTarget.classList.add('shelf-drag-over');
        }
    });

    shelf.addEventListener('dragleave', (event) => {
        event.currentTarget.classList.remove('shelf-drag-over');
    });

    shelf.addEventListener('drop', handleFridgeItemDrop);
    
    compartment.appendChild(shelf);
}

async function createFoodItem(item, shelfCategory) {
    const foodItem = document.createElement('div');
    foodItem.className = 'food-item';
    foodItem.draggable = true;
    
    // Add image
    const img = document.createElement('img');
    img.className = 'item-image';
    const imageUrl = await getItemImage(item.name);
    if (imageUrl) {
        img.src = imageUrl;
    }
    
    const itemName = document.createElement('span');
    itemName.textContent = item.name;
    
    foodItem.appendChild(img);
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

    // Add drag event listeners for both shopping list and fridge items
    foodItem.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('application/json', JSON.stringify({
            ...item,
            sourceShelf: shelfCategory,
            sourceCompartment: compartment.id
        }));
        event.currentTarget.classList.add('dragging');
    });

    foodItem.addEventListener('dragend', (event) => {
        event.currentTarget.classList.remove('dragging');
    });
    
    return foodItem;
}

// Modified drop handler to enforce category restrictions
async function handleFridgeItemDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('shelf-drag-over');
    
    const itemData = JSON.parse(event.dataTransfer.getData('application/json'));
    const targetShelf = event.currentTarget;
    const targetCategory = targetShelf.dataset.category;
    const targetCompartment = targetShelf.closest('.compartment').id;
    
    // Check if item belongs to this category
    const itemCategory = determineCategory(itemData.category);
    if (itemCategory !== targetCategory) {
        console.log('Item cannot be moved to this category');
        return;
    }
    
    // If item hasn't moved compartments, do nothing
    if (itemData.sourceCompartment === targetCompartment) {
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
                targetCompartment: targetCompartment,
                targetCategory: targetCategory
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

const CATEGORIES = {
    'Fruits & Vegetables': ['fruits', 'vegetables', 'produce'],
    'Dairy & Eggs': ['dairy', 'eggs', 'milk', 'cheese'],
    'Meat & Seafood': ['meat', 'seafood', 'poultry'],
    'Beverages': ['drinks', 'beverages', 'juice'],
    'Condiments': ['sauce', 'condiments', 'spices'],
    'Others': ['other', 'miscellaneous', 'general']
};

function determineCategory(itemCategory) {
    itemCategory = itemCategory.toLowerCase();
    console.log(`Determining category for: ${itemCategory}`);
    for (const [mainCategory, subCategories] of Object.entries(CATEGORIES)) {
        if (subCategories.some(sub => itemCategory.includes(sub))) {
            console.log(`Found category: ${mainCategory}`);
            return mainCategory;
        }
    }
    console.log(`No category found, using Others`);
    return 'Others';
}

async function getItemImage(itemName) {
    // For now, return null or a default image URL
    return null;
}
