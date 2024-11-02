let currentItem = null;
let popupTimeout = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing shopping list...');
    loadShoppingList();
});

const UNSPLASH_API_KEY = 'lBsiCLPHlsKNbkcts9DPF3rniPHq-vaIgMEaSZTLXTA';
const imageCache = new Map();

async function getItemImage(itemName) {
    // Check cache first
    if (imageCache.has(itemName)) {
        return imageCache.get(itemName);
    }

    const endpoint = 'https://api.unsplash.com/search/photos';
    const params = new URLSearchParams({
        query: itemName,
        per_page: 1
    });

    try {
        const response = await fetch(`${endpoint}?${params}`, {
            headers: {
                'Authorization': `Client-ID ${UNSPLASH_API_KEY}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const imageUrl = data.results[0].urls.small;
                imageCache.set(itemName, imageUrl);
                return imageUrl;
            }
        }
        return null;
    } catch (error) {
        console.error('Error fetching image:', error);
        return null;
    }
}

function loadShoppingList() {
    console.log('Loading shopping list...');
    fetch('/fridge/get_shopping_items')
        .then(response => response.json())
        .then(async data => {
            const shoppingList = document.getElementById('shopping-list');
            shoppingList.innerHTML = '';

            for (const item of data) {
                const listItem = document.createElement('div');
                listItem.className = 'list-item';
                listItem.draggable = true;

                // Add image
                const img = document.createElement('img');
                img.className = 'item-image';
                const imageUrl = await getItemImage(item.identify_name);
                if (imageUrl) {
                    img.src = imageUrl;
                }
                
                const text = document.createElement('span');
                text.textContent = item.name;
                
                listItem.appendChild(img);
                listItem.appendChild(text);

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
            }
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


const style = document.createElement('style');
style.innerHTML = `
    .item-image {
        width: 50px;
        height: 50px;
        object-fit: cover;
        border-radius: 8px;
        margin-right: 12px;
    }
    
    .list-item {
        display: flex;
        align-items: center;
        padding: 8px;
    }
`;
document.head.appendChild(style);