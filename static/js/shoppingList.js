let currentItem = null;
let popupTimeout = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing shopping list...');
    loadShoppingList();
});

function loadShoppingList() {
    console.log('Loading shopping list...');
    fetch('/fridge/get_food_items')
        .then(response => {
            console.log('Response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Data received:', data);
            const shoppingList = document.getElementById('shopping-list');
            if (!shoppingList) {
                console.error('Shopping list container not found!');
                return;
            }
            
            shoppingList.innerHTML = '';

            data.forEach(item => {
                const listItem = document.createElement('div');
                listItem.className = 'list-item';
                listItem.draggable = true;

                // Add icon
                const icon = document.createElement('img');
                getIconUrl(item.identify_name || item.name, item.category).then(iconUrl => {
                    icon.src = iconUrl;
                    icon.className = 'item-icon enlarged-icon';
                    listItem.appendChild(icon);

                    const text = document.createElement('span');
                    text.textContent = `${item.name}`;
                    listItem.appendChild(text);
                });

                // Add drag events
                listItem.addEventListener('dragstart', (event) => {
                    event.dataTransfer.setData('application/json', JSON.stringify(item));
                    event.currentTarget.classList.add('dragging');
                });
                
                listItem.addEventListener('dragend', (event) => {
                    event.currentTarget.classList.remove('dragging');
                });
                
                // Add hover events
                listItem.addEventListener('mouseenter', (event) => {
                    clearTimeout(popupTimeout);
                    showItemPopup(item, event);
                });
                
                listItem.addEventListener('mouseleave', () => {
                    popupTimeout = setTimeout(() => {
                        const popup = document.getElementById('item-popup');
                        if (!popup.matches(':hover')) {
                            closePopup();
                        }
                    }, 300);
                });
                
                shoppingList.appendChild(listItem);
                console.log('Added item:', item.name);
            });
        })
        .catch(error => console.error('Error loading shopping list:', error));
}

function getIconUrl(identifyName, category) {
    const categoryIcons = {
        condiments: 'game-icons:cool-spices',
        fruit: 'carbon:fruit-bowl',
        vegetables: 'icon-park-twotone:vegetables',
        dairy: 'healthicons:dairy',
        protein: 'mdi:meat',
        grain: 'token:grain'
    };

    const defaultIcon = categoryIcons[category] || categoryIcons.condiments;
    const searchUrl = `https://api.iconify.design/search?query=${identifyName}`;

    return fetch(searchUrl)
        .then(response => response.json())
        .then(data => {
            if (data.total > 0) {
                return `https://api.iconify.design/${data.icons[0]}.svg`;
            } else {
                console.log(`No icon found for ${identifyName}, using default icon.`);
                return `https://api.iconify.design/${defaultIcon}.svg`;
            }
        })
        .catch(error => {
            console.error('Error fetching icon:', error);
            return `https://api.iconify.design/${defaultIcon}.svg`;
        });
}

function showItemPopup(item, event) {
    currentItem = item;
    const popup = document.getElementById('item-popup');
    const listItem = event.currentTarget;
    const listItemRect = listItem.getBoundingClientRect();
    const listContainer = document.querySelector('.list-container');
    const listContainerRect = listContainer.getBoundingClientRect();

    // Set popup content
    document.getElementById('popup-item-name').textContent = item.name;
    document.getElementById('popup-category').value = item.category;
    document.getElementById('popup-quantity').value = item.quantity_or_weight;
    document.getElementById('popup-unit').value = item.unit;
    document.getElementById('popup-best-before').value = item.best_before_in_fridge;

    // Position popup
    const topOffset = listItemRect.top - listContainerRect.top;
    popup.style.top = `${topOffset}px`;
    
    // Show popup
    popup.classList.add('visible');

    // Add hover event to popup
    popup.addEventListener('mouseenter', () => {
        clearTimeout(popupTimeout);
    });

    popup.addEventListener('mouseleave', () => {
        popupTimeout = setTimeout(closePopup, 300);
    });
}

function closePopup() {
    const popup = document.getElementById('item-popup');
    popup.classList.remove('visible');
}

function saveItemChanges() {
    if (!currentItem) return;

    const saveButton = document.querySelector('.popup-content button');
    const inputs = document.querySelectorAll('.popup-content input');
    
    // Update the item data
    currentItem.category = document.getElementById('popup-category').value;
    currentItem.quantity_or_weight = document.getElementById('popup-quantity').value;
    currentItem.unit = document.getElementById('popup-unit').value;
    currentItem.best_before_in_fridge = parseInt(document.getElementById('popup-best-before').value, 10);

    // Send updated item to the server
    fetch('/fridge/update_item', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(currentItem)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Add success class to button
            saveButton.classList.add('success');
            saveButton.textContent = '✓ Saved';
            
            // Add success indication to inputs
            inputs.forEach(input => {
                input.classList.add('input-success');
            });

            // Add subtle animation to popup
            const popup = document.getElementById('item-popup');
            popup.style.animation = 'successFlash 1s ease';

            // Reset everything after a delay
            setTimeout(() => {
                saveButton.classList.remove('success');
                saveButton.textContent = 'Save Changes';
                inputs.forEach(input => {
                    input.classList.remove('input-success');
                });
                popup.style.animation = '';
                
                // Close popup and refresh list
                closePopup();
                loadShoppingList();
            }, 1000);
        } else {
            // Subtle error indication
            saveButton.style.backgroundColor = '#e74c3c';
            saveButton.textContent = '× Error';
            setTimeout(() => {
                saveButton.style.backgroundColor = '';
                saveButton.textContent = 'Save Changes';
            }, 2000);
        }
    })
    .catch(error => {
        console.error('Error updating item:', error);
        // Subtle error indication
        saveButton.style.backgroundColor = '#e74c3c';
        saveButton.textContent = '× Error';
        setTimeout(() => {
            saveButton.style.backgroundColor = '';
            saveButton.textContent = 'Save Changes';
        }, 2000);
    });
}

// Add CSS for icons
const style = document.createElement('style');
style.innerHTML = `
    .enlarged-icon {
        width: 24px;
        height: 24px;
        margin-right: 8px;
        vertical-align: middle;
    }
    
    .list-item {
        display: flex;
        align-items: center;
    }
`;
document.head.appendChild(style);