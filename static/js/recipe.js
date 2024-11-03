document.addEventListener('DOMContentLoaded', () => {
    const mealSlots = document.querySelectorAll('.meal-slot');
    const timeline = document.querySelector('.timeline');

    // Initialize fridge items click handlers
    initializeFridgeItems();

    // Set initial positions based on time
    function setInitialPositions() {
        mealSlots.forEach(meal => {
            const timeText = meal.querySelector('.meal-time').textContent;
            const [hours, minutes] = timeText.split(':').map(Number);
            const percentage = calculatePercentage(hours, minutes);
            meal.style.top = `${percentage}%`;
        });
    }

    function calculateTime(percentage) {
        const START_HOUR = 6;
        const TOTAL_MINUTES = (21 - START_HOUR) * 60;
        const minutes = (TOTAL_MINUTES * percentage) / 100;
        const totalMinutes = START_HOUR * 60 + minutes;
        
        // Round to nearest 15 minutes
        const roundedMinutes = Math.round(totalMinutes / 15) * 15;
        
        const hours = Math.floor(roundedMinutes / 60);
        const mins = roundedMinutes % 60;
        
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }
    
    // Update calculatePercentage function
    function calculatePercentage(hours, minutes) {
        const START_HOUR = 6;  // 6 AM
        const END_HOUR = 21;   // 9 PM
        const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
        
        // Round minutes to nearest 15
        const roundedMinutes = Math.round(minutes / 15) * 15;
        const currentMinutes = (hours - START_HOUR) * 60 + roundedMinutes;
        
        return (currentMinutes / TOTAL_MINUTES) * 100;
    }

    let activeMeal = null;
    let startY = 0;
    let startPercentage = 0;

    mealSlots.forEach(meal => {
        meal.addEventListener('mousedown', e => {
            e.preventDefault();
            activeMeal = meal;
            startY = e.clientY;
            startPercentage = parseFloat(meal.style.top) || 0;
            meal.classList.add('dragging');
        });
    });

    document.addEventListener('mousemove', e => {
        if (!activeMeal) return;

        const timelineRect = timeline.getBoundingClientRect();
        const deltaY = e.clientY - startY;
        const deltaPercentage = (deltaY / timelineRect.height) * 100;
        let newPercentage = startPercentage + deltaPercentage;

        // Constrain movement
        newPercentage = Math.max(0, Math.min(95, newPercentage));
        
        activeMeal.style.top = `${newPercentage}%`;
        
        const time = calculateTime(newPercentage);
        activeMeal.querySelector('.meal-time').textContent = time;
    });

    document.addEventListener('mouseup', () => {
        if (!activeMeal) return;
        activeMeal.classList.remove('dragging');
        activeMeal = null;
        saveMealSchedule();
    });

    // Initialize positions
    setInitialPositions();

    // Add location toggle functionality
    const locationToggles = document.querySelectorAll('.location-checkbox');
    locationToggles.forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const mealSlot = e.target.closest('.meal-slot');
            if (e.target.checked) {
                mealSlot.classList.add('eating-out');
            } else {
                mealSlot.classList.remove('eating-out');
            }
            saveMealSchedule();
        });
    });

    const fridgeItems = document.querySelectorAll('.fridge-item');

    // Setup drag and drop
    fridgeItems.forEach(item => {
        item.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', item.dataset.itemId);
        });
    });

    mealSlots.forEach(slot => {
        if (!slot.querySelector('.meal-items')) {
            slot.insertAdjacentHTML('beforeend', '<div class="meal-items"></div>');
        }

        slot.addEventListener('dragover', e => {
            e.preventDefault();
        });

        slot.addEventListener('drop', e => {
            e.preventDefault();
            const data = e.dataTransfer.getData('text/plain');
    
            try {
                const filterData = JSON.parse(data);
                if (filterData.type && filterData.filter) {
                    // Handle filter drop
                    addFilterToMeal(slot, filterData);
                } else {
                    // Handle existing item drop logic
                    const itemId = data;
                    const draggedItem = document.querySelector(`[data-item-id="${itemId}"]`);
                    addItemToMeal(draggedItem, slot.id);
                }
            } catch {
                // Handle as regular item if JSON parse fails
                const itemId = data;
                const draggedItem = document.querySelector(`[data-item-id="${itemId}"]`);
                addItemToMeal(draggedItem, slot.id);
            }
        });
    });

    initializeFilters();
});

function initializeFridgeItems() {
    const fridgeItems = document.querySelectorAll('.fridge-item');
    fridgeItems.forEach(item => {
        item.addEventListener('click', handleFridgeItemClick);
    });
}

function handleFridgeItemClick(e) {
    e.preventDefault();
    e.stopPropagation();
    createPopupMenu(e.pageX, e.pageY, this);
}

function createPopupMenu(x, y, itemElement) {
    // Remove existing popup if any
    const existingPopup = document.querySelector('.meal-popup');
    if (existingPopup) existingPopup.remove();

    const popup = document.createElement('div');
    popup.className = 'meal-popup';
    
    // Position popup near the clicked item
    const rect = itemElement.getBoundingClientRect();
    popup.style.left = `${rect.right + 5}px`;
    popup.style.top = `${rect.top}px`;

    const meals = ['Breakfast', 'Lunch', 'Dinner'];
    meals.forEach(meal => {
        const option = document.createElement('div');
        option.className = 'meal-option';
        option.textContent = meal;
        option.addEventListener('click', () => {
            addItemToMeal(itemElement, meal.toLowerCase());
            popup.remove();
        });
        popup.appendChild(option);
    });

    document.body.appendChild(popup);

    // Close popup when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target) && !itemElement.contains(e.target)) {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        });
    }, 0);
}

function addItemToMeal(itemElement, mealType) {
    const mealSlot = document.getElementById(mealType);
    const mealItems = mealSlot.querySelector('.meal-items');
    const itemName = itemElement.querySelector('.item-name').textContent;
    
    // Check if item already exists in this meal
    const existingItems = Array.from(mealItems.querySelectorAll('.selected-item'));
    if (existingItems.some(item => item.textContent === itemName)) {
        showToast('Item already added to this meal', 'warning');
        return;
    }
    
    const selectedItem = document.createElement('span');
    selectedItem.className = 'selected-item';
    selectedItem.textContent = itemName;
    
    // Add delete functionality
    selectedItem.addEventListener('click', () => {
        selectedItem.classList.add('removing');
        setTimeout(() => {
            selectedItem.remove();
            saveMealSchedule();
        }, 300);
    });
    
    mealItems.appendChild(selectedItem);
    saveMealSchedule();
}

// Add showToast function if not exists
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }, 100);
}

// Update saveMealSchedule function
function saveMealSchedule() {
    const schedule = [];
    
    const mealSlots = document.querySelectorAll('.meal-slot');
    mealSlots.forEach(slot => {
        const mealName = slot.querySelector('.meal-name').textContent;
        const mealTime = slot.querySelector('.meal-time').textContent;
        const isEatingOut = slot.querySelector('.location-checkbox').checked;
        const selectedItems = Array.from(slot.querySelectorAll('.selected-item'))
            .map(item => item.textContent);
        const filters = Array.from(slot.querySelectorAll('.meal-filter'))
            .map(filter => ({
                type: filter.dataset.type,
                value: filter.dataset.filter
            }));
        
        schedule.push({
            meal: mealName,
            time: mealTime,
            eatingOut: isEatingOut,
            items: selectedItems,
            filters: filters
        });
    });

    fetch('/save_schedule', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schedule })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Schedule saved:', data);
        showToast('Schedule saved successfully');
    })
    .catch(error => {
        console.error('Error saving schedule:', error);
        showToast('Failed to save schedule', 'error');
    });
}

function initializeFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: btn.parentElement.dataset.type,
                filter: btn.dataset.filter
            }));
        });
    });
}

function addFilterToMeal(slot, filterData) {
    if (!slot.querySelector('.meal-filters')) {
        slot.insertAdjacentHTML('beforeend', '<div class="meal-filters"></div>');
    }
    
    const filtersDiv = slot.querySelector('.meal-filters');
    
    // Check for duplicate filter
    if (filtersDiv.querySelector(`[data-filter="${filterData.filter}"]`)) {
        showToast('Filter already added', 'warning');
        return;
    }
    
    const filterElement = document.createElement('span');
    filterElement.className = 'meal-filter';
    filterElement.dataset.type = filterData.type;
    filterElement.dataset.filter = filterData.filter;
    filterElement.textContent = filterData.filter.replace('-', ' ');
    
    filterElement.addEventListener('click', () => {
        filterElement.remove();
        saveMealSchedule();
    });
    
    filtersDiv.appendChild(filterElement);
    saveMealSchedule();
}

document.getElementById('generate-recipe').addEventListener('click', async () => {
    // Show loading spinner
    document.querySelector('.loading-overlay').style.display = 'flex';
    
    try {
        const response = await fetch('/generate_recipe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        displayRecipes(data.recipes);
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to generate recipes', 'error');
    } finally {
        // Hide loading spinner
        document.querySelector('.loading-overlay').style.display = 'none';
    }
});

function displayRecipes(recipes) {
    recipes.forEach(mealGroup => {
        const container = document.getElementById(`${mealGroup.meal.toLowerCase()}-recipes`);
        if (!container) return;
        
        container.innerHTML = mealGroup.recipes.map(recipe => `
            <div class="recipe-card">
                <h3>${recipe.name}</h3>
                <p class="recipe-type">${recipe.type}</p>
                <div class="recipe-meta">
                    <span>Prep: ${recipe.time.prep}</span>
                    <span>Cook: ${recipe.time.cook}</span>
                </div>
                <div class="recipe-buttons">
                    <button class="show-details">View Details</button>
                    <button class="select-recipe">Select</button>
                </div>
            </div>
        `).join('');
    });
}
