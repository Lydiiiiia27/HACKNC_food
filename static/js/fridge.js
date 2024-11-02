let doorsOpen = { left: false, right: false };

function toggleDoor(door, side) {
    console.log('Toggling door:', side, 'Current state:', doorsOpen);
    doorsOpen[side] = !doorsOpen[side];
    door.classList.toggle(`open-${side}`);
    
    const leftCompartment = document.getElementById('left-compartment');
    const rightCompartment = document.getElementById('right-compartment');
    
    if (doorsOpen.left && doorsOpen.right) {
        console.log('Both doors open, loading items...');
        leftCompartment.style.visibility = 'visible';
        rightCompartment.style.visibility = 'visible';
        loadFoodItems();
    } else {
        console.log('Closing compartments');
        if (!doorsOpen.left) {
            leftCompartment.style.visibility = 'hidden';
        }
        if (!doorsOpen.right) {
            rightCompartment.style.visibility = 'hidden';
        }
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
        <div>Identify Name: ${item.identify_name}</div>
    `;
    document.body.appendChild(info);
    
    // Add mousemove event for dynamic positioning of hover info
    foodItem.addEventListener('mousemove', (e) => {
        info.style.display = 'block';
        const rect = foodItem.getBoundingClientRect();
        
        // Calculate position relative to viewport
        let left = e.clientX + 20;
        let top = e.clientY - info.offsetHeight / 2;
        
        // Adjust if would go off screen
        if (left + info.offsetWidth > window.innerWidth) {
            left = e.clientX - info.offsetWidth - 20;
        }
        if (top < 0) {
            top = 0;
        } else if (top + info.offsetHeight > window.innerHeight) {
            top = window.innerHeight - info.offsetHeight;
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
    
    foodItem.addEventListener('mouseleave', () => {
        info.style.display = 'none';
        // Remove the info element from the DOM when not hovering
        if (info.parentNode) {
            info.parentNode.removeChild(info);
        }
    });
    
    // Clean up when the item is removed
    foodItem.addEventListener('dragstart', () => {
        // Remove the info element if it exists
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
    const category = itemData.category.toLowerCase(); // Use the existing category directly
    
    // Check if the item should go in the right compartment (protein) or left (everything else)
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

async function getItemImage(itemName) {
    // For now, return null or a default image URL
    return null;
}
