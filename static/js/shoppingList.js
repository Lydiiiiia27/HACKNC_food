let currentItem = null;

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
                listItem.textContent = `${item.name}`;
                listItem.onclick = () => showItemPopup(item);
                shoppingList.appendChild(listItem);
                console.log('Added item:', item.name);
            });
        })
        .catch(error => console.error('Error loading shopping list:', error));
}

function showItemPopup(item) {
    currentItem = item;
    document.getElementById('popup-item-name').textContent = item.name;
    document.getElementById('popup-category').value = item.category;
    document.getElementById('popup-quantity').value = item.quantity_or_weight;
    document.getElementById('popup-unit').value = item.unit;
    document.getElementById('popup-best-before').value = item.best_before_in_fridge;
    document.getElementById('item-popup').classList.add('visible');
}

function closePopup() {
    document.getElementById('item-popup').classList.remove('visible');
}

function saveItemChanges() {
    if (!currentItem) return;

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
            alert('Item updated successfully!');
            closePopup();
            loadShoppingList(); // Refresh the list
        } else {
            alert('Failed to update item.');
        }
    })
    .catch(error => console.error('Error updating item:', error));
}