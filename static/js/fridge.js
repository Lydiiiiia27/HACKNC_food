let doorsOpen = { left: false, right: false };

function toggleDoor(door, side) {
    console.log('Toggling door:', side, 'Current state:', doorsOpen);
    doorsOpen[side] = !doorsOpen[side];
    door.classList.toggle(`open-${side}`);
    
    const leftCompartment = document.getElementById('left-compartment');
    const rightCompartment = document.getElementById('right-compartment');
    
    // Show items when respective door is opened
    if (side === 'left') {
        leftCompartment.style.visibility = doorsOpen.left ? 'visible' : 'hidden';
    } else {
        rightCompartment.style.visibility = doorsOpen.right ? 'visible' : 'hidden';
    }
    
    // Load items whenever any door is opened
    if (doorsOpen.left || doorsOpen.right) {
        loadFoodItems();
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
            
            // Simplified categories
            const leftCategories = ['vegetables', 'fruit', 'grain', 'dairy', 'oils', 'condiments'];
            const rightCategories = ['protein'];
            
            // Create shelves for left compartment
            for (const category of leftCategories) {
                const items = data.filter(item => 
                    item.category.toLowerCase() === category && 
                    item.compartment === 'left-compartment'
                );
                if (items.length > 0) {
                    await createShelf(leftCompartment, category, items);
                }
            }
            
            // Create shelves for right compartment
            for (const category of rightCategories) {
                const items = data.filter(item => 
                    item.category.toLowerCase() === category && 
                    item.compartment === 'right-compartment'
                );
                if (items.length > 0) {
                    await createShelf(rightCompartment, category, items);
                }
            }

            document.dispatchEvent(new CustomEvent('fridgeUpdated'));
        })
        .catch(error => {
            console.error('Error loading fridge items:', error);
        });
}

async function createShelf(compartment, category, items) {
    const shelf = document.createElement('div');
    shelf.className = 'shelf';
    shelf.setAttribute('data-category', category);
    
    // Add category label
    const categoryLabel = document.createElement('div');
    categoryLabel.className = 'category-label';
    categoryLabel.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    shelf.appendChild(categoryLabel);
    
    // Create items container
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'items-container';
    
    // Add items to shelf
    for (const item of items) {
        const foodItem = await createFoodItem(item, category);
        itemsContainer.appendChild(foodItem);
    }
    
    shelf.appendChild(itemsContainer);
    compartment.appendChild(shelf);
    
    // Add drag and drop event listeners
    shelf.addEventListener('dragover', (event) => {
        event.preventDefault();
        shelf.classList.add('shelf-drag-over');
    });
    
    shelf.addEventListener('dragleave', () => {
        shelf.classList.remove('shelf-drag-over');
    });
    
    shelf.addEventListener('drop', handleItemDrop);
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
    const imageUrl = await getItemImage(item.identify_name || item.name);
    if (imageUrl) {
        img.src = imageUrl;
    } else {
        img.src = '/static/images/default-food-icon.png';
    }
    imgContainer.appendChild(img);
    foodItem.appendChild(imgContainer);
    
    // Create hover info box
    const info = document.createElement('div');
    info.className = 'food-item-info';
    info.innerHTML = `
        <div><strong>${item.name}</strong></div>
        <div>Category: ${item.category}</div>
        ${item.quantity_or_weight ? `<div>Quantity: ${item.quantity_or_weight} ${item.unit}</div>` : ''}
        <div>Best Before: ${item.best_before_in_fridge} days</div>
        ${item.frozen ? `<div>Frozen: Yes</div>` : ''}
    `;
    
    // Add hover events
    foodItem.addEventListener('mouseenter', (e) => {
        const rect = foodItem.getBoundingClientRect();
        info.style.display = 'block';
        document.body.appendChild(info);
        
        // Position the info box
        const infoRect = info.getBoundingClientRect();
        let left = rect.right + 10;
        let top = rect.top;
        
        // Check if info box would go off screen
        if (left + infoRect.width > window.innerWidth) {
            left = rect.left - infoRect.width - 10;
        }
        if (top + infoRect.height > window.innerHeight) {
            top = window.innerHeight - infoRect.height - 10;
        }
        
        info.style.left = `${left}px`;
        info.style.top = `${top}px`;
    });
    
    foodItem.addEventListener('mouseleave', () => {
        if (info.parentNode) {
            info.parentNode.removeChild(info);
        }
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

// Replace the existing CATEGORIES and COMPARTMENT_RULES constants
const CATEGORIES = [
    'protein',
    'vegetables',
    'fruit',
    'grain',
    'dairy',
    'oils',
    'condiments'
];

const COMPARTMENT_RULES = {
    'protein': 'right-compartment'
    // All other categories default to left-compartment
};

// Simplify the determineCategory function since we already have the category
function determineCategory(itemCategory) {
    itemCategory = itemCategory.toLowerCase();
    console.log(`Determining category for: ${itemCategory}`);
    
    // If the category is already one of our valid categories, use it
    if (CATEGORIES.includes(itemCategory)) {
        console.log(`Using existing category: ${itemCategory}`);
        return itemCategory;
    }
    
    console.log(`Invalid category: ${itemCategory}, defaulting to condiments`);
    return 'condiments'; // Default category if none matches
}

// Modify handleItemDrop to use the simplified compartment rules
async function handleItemDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    
    const itemData = JSON.parse(event.dataTransfer.getData('application/json'));
    const compartmentId = event.currentTarget.id;
    const category = itemData.category.toLowerCase();
    
    // Check if the item should go in the right compartment (protein) or left (everything else)
    const correctCompartment = COMPARTMENT_RULES[category] || 'left-compartment';
    if (compartmentId !== correctCompartment) {
        // Silently return without showing alert
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

async function getItemImage(itemName) {
    // For now, return null or a default image URL
    return null;
}
