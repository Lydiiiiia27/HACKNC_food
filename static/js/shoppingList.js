
// Shopping list-related JavaScript
document.addEventListener('DOMContentLoaded', function() {
    loadShoppingList();
});

function loadShoppingList() {
    fetch('/fridge/get_food_items')
        .then(response => response.json())
        .then(data => {
            const shoppingList = document.getElementById('shopping-list');
            shoppingList.innerHTML = '';

            data.forEach(item => {
                const listItem = document.createElement('div');
                listItem.className = 'list-item';
                listItem.textContent = `${item.name}`;
                shoppingList.appendChild(listItem);
            });
        })
        .catch(error => console.error('Error loading shopping list:', error));
}