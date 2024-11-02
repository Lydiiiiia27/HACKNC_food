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
            
            const leftCompartment = document.getElementById('left-compartment');
            const rightCompartment = document.getElementById('right-compartment');
            
            leftCompartment.innerHTML = '';
            rightCompartment.innerHTML = '';
            
            // Categories for each compartment
            const leftCategories = ['Fruits & Vegetables', 'Dairy & Eggs', 'Beverages', 'Condiments'];
            const rightCategories = ['Meat & Seafood', 'Others'];
            
            // Create shelves for left compartment
            for (const category of leftCategories) {
                const items = data.filter(item => 
                    determineCategory(item.category) === category && 
                    item.compartment === 'left-compartment'
                );
                if (items.length > 0) {
                    await createShelf(leftCompartment, category, items);
                }
            }
            
            // Create shelves for right compartment
            for (const category of rightCategories) {
                const items = data.filter(item => 
                    determineCategory(item.category) === category && 
                    item.compartment === 'right-compartment'
                );
                if (items.length > 0) {
                    await createShelf(rightCompartment, category, items);
                }
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
    
    // Add image container
    const imgContainer = document.createElement('div');
    imgContainer.className = 'item-image-container';
    
    // Add image or fallback icon
    const img = document.createElement('img');
    img.className = 'item-image';
    const imageUrl = await getItemImage(item.name);
    if (imageUrl) {
        img.src = imageUrl;
    } else {
        img.src = '/static/images/default-food-icon.png';
    }
    imgContainer.appendChild(img);
    foodItem.appendChild(imgContainer);
    
    // Add hover info with dynamic positioning
    const info = document.createElement('div');
    info.className = 'food-item-info';
    info.innerHTML = `
        <div><strong>${item.name}</strong></div>
        <div>Category: ${item.category}</div>
        ${item.quantity_or_weight ? `<div>Quantity: ${item.quantity_or_weight} ${item.unit}</div>` : ''}
        <div>Best Before: ${item.best_before_in_fridge} days</div>
    `;
    foodItem.appendChild(info);
    
    // Add mousemove event for dynamic positioning of hover info
    foodItem.addEventListener('mousemove', (e) => {
        const rect = foodItem.getBoundingClientRect();
        const infoRect = info.getBoundingClientRect();
        
        // Calculate position
        let left = e.clientX + 20; // 20px offset from cursor
        let top = e.clientY - infoRect.height / 2;
        
        // Check if info would go off screen to the right
        if (left + infoRect.width > window.innerWidth) {
            left = e.clientX - infoRect.width - 20;
        }
        
        // Check if info would go off screen at the top or bottom
        if (top < 0) {
            top = 0;
        } else if (top + infoRect.height > window.innerHeight) {
            top = window.innerHeight - infoRect.height;
        }
        
        info.style.left = `${left}px`;
        info.style.top = `${top}px`;
    });
    
    // Add drag event listeners
    foodItem.addEventListener('dragstart', (event) => {
        event.currentTarget.classList.add('dragging');
        event.dataTransfer.setData('application/json', JSON.stringify(item));
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
    const itemCategory = determineCategory(itemData.category || '');
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

// Add this constant to define compartment rules
const COMPARTMENT_RULES = {
    'Meat & Seafood': 'right-compartment',
    'Others': 'right-compartment'
};

// Modify the handleItemDrop function to enforce compartment rules
async function handleItemDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    
    const itemData = JSON.parse(event.dataTransfer.getData('application/json'));
    const compartmentId = event.currentTarget.id;
    const category = determineCategory(itemData.category);
    
    // Check if the item is being dropped in the correct compartment
    const correctCompartment = COMPARTMENT_RULES[category] || 'left-compartment';
    if (compartmentId !== correctCompartment) {
        alert(`${category} items must go in the ${correctCompartment === 'left-compartment' ? 'left' : 'right'} compartment`);
        return;
    }
    
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
