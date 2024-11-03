const ITEMS_PER_PAGE = 6;
let currentPage = 1;
let totalPages = 1;
let allItems = [];
let currentSortMethod = 'best_before';

// Add a global variable to track the current hover box
let currentHoverBox = null;

document.addEventListener('DOMContentLoaded', function() {
    const sortSelect = document.getElementById('sort-select');
    sortSelect.value = 'best_before';
    sortSelect.addEventListener('change', (e) => {
        currentSortMethod = e.target.value;
        currentPage = 1; // Reset to first page on sort
        loadFridgeList();
    });
    
    loadFridgeList();
});

function checkPriority(item) {
    const quantity = parseFloat(item.quantity_or_weight) || 0;
    const unit = item.unit.toLowerCase();
    const daysLeft = parseInt(item.best_before_in_fridge) || 0;
    
    // Convert to common units (grams or pieces)
    let standardQuantity = quantity;
    if (unit === 'kg' || unit === 'liters') {
        standardQuantity *= 1000;
    }
    
    // Check both quantity and expiration date
    let quantityPriority = 'none';
    let expirationPriority = 'none';
    
    // Check quantity based on category
    switch (item.category.toLowerCase()) {
        case 'protein':
            if (standardQuantity < 30) quantityPriority = 'high';
            else if (standardQuantity < 50) quantityPriority = 'medium';
            else if (standardQuantity < 100) quantityPriority = 'low';
            break;
        case 'vegetables':
        case 'fruit':
            if (unit === 'pcs' && quantity < 1) quantityPriority = 'high';
            else if (standardQuantity < 5) quantityPriority = 'high';
            else if (standardQuantity < 10) quantityPriority = 'medium';
            else if (standardQuantity < 20) quantityPriority = 'low';
            break;
        case 'grain':
        case 'dairy':
            if (unit === 'pcs' && quantity < 1) quantityPriority = 'high';
            else if (standardQuantity < 5) quantityPriority = 'high';
            else if (standardQuantity < 10) quantityPriority = 'medium';
            else if (standardQuantity < 20) quantityPriority = 'low';
            break;
    }
    
    // Check expiration date
    if (daysLeft <= 1) expirationPriority = 'high';
    else if (daysLeft <= 3) expirationPriority = 'medium';
    else if (daysLeft <= 5) expirationPriority = 'low';
    
    // Return highest priority between quantity and expiration
    const priorities = ['high', 'medium', 'low', 'none'];
    const highestPriority = priorities.find(p => 
        p === quantityPriority || p === expirationPriority
    ) || 'none';
    
    return highestPriority;
}

function sortItems(items) {
    return items.sort((a, b) => {
        switch (currentSortMethod) {
            case 'best_before':
                return a.best_before_in_fridge - b.best_before_in_fridge;
            case 'name':
                return a.name.localeCompare(b.name);
            case 'category':
                return a.category.localeCompare(b.category);
            case 'frozen':
                return b.frozen - a.frozen;
            case 'residual':
                return (b.quantity_or_weight || 0) - (a.quantity_or_weight || 0);
            default:
                return 0;
        }
    });
}

async function loadFridgeList() {
    try {
        const response = await fetch('/fridge/get_fridge_items');
        allItems = await response.json();
        console.log('Loaded items:', allItems); // Debug log
        
        // Sort items
        allItems = sortItems(allItems);
        
        // Calculate total pages
        totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
        
        displayCurrentPage();
        updatePaginationControls();
    } catch (error) {
        console.error('Error loading fridge list:', error);
    }
}

function displayCurrentPage() {
    const fridgeList = document.getElementById('fridge-list');
    fridgeList.innerHTML = '';
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentItems = allItems.slice(startIndex, endIndex);
    
    currentItems.forEach(item => {
        const listItem = createFridgeListItem(item);
        fridgeList.appendChild(listItem);
    });
}

function createFridgeListItem(item) {
    const listItem = document.createElement('div');
    listItem.className = 'fridge-item';
    
    // Add priority warning class if needed
    const priority = checkPriority(item);
    if (priority !== 'none') {
        listItem.classList.add('priority-warning', `priority-${priority}`);
    }
    
    // Main content
    const mainContent = document.createElement('div');
    mainContent.className = 'item-main-content';
    
    const img = document.createElement('img');
    img.className = 'item-image';
    getItemImage(item.identify_name).then(imageUrl => {
        if (imageUrl) img.src = imageUrl;
    });
    
    const basicInfo = document.createElement('div');
    basicInfo.className = 'item-basic-info';
    basicInfo.innerHTML = `
        <div class="item-name">${item.name}</div>
        <div class="item-info">${item.quantity_or_weight} ${item.unit} • ${item.category}</div>
    `;
    
    mainContent.appendChild(img);
    mainContent.appendChild(basicInfo);
    
    // Update mouse event listeners
    listItem.addEventListener('mouseenter', (e) => {
        // Remove any existing hover box
        if (currentHoverBox) {
            currentHoverBox.remove();
        }

        const rect = listItem.getBoundingClientRect();
        const hoverBox = document.createElement('div');
        hoverBox.className = 'item-hover-box';
        
        // Add priority indicator to title if needed
        const priorityLabel = priority !== 'none' ? 
            `<span class="priority-indicator">
                ${priority === 'high' ? '⚠️ Urgent' : 
                  priority === 'medium' ? '⚠️ Warning' : '⚠️ Notice'}
            </span>` : '';
        
        hoverBox.innerHTML = `
            <h3>${item.name}${priorityLabel}</h3>
            <div><strong>Category:</strong> ${item.category}</div>
            <div><strong>Quantity:</strong> ${item.quantity_or_weight} ${item.unit}</div>
            <div><strong>Best Before:</strong> ${item.best_before_in_fridge} days</div>
            <div><strong>Storage:</strong> ${item.frozen ? '❄️ Frozen' : 'Regular'}</div>
            <div><strong>Compartment:</strong> ${item.compartment || 'Not specified'}</div>
            ${priority !== 'none' ? `<div><strong>Status:</strong> ${
                priority === 'high' ? 'Running very low or expires soon!' :
                priority === 'medium' ? 'Getting low or expiring soon' :
                'May need attention soon'
            }</div>` : ''}
        `;
        
        document.body.appendChild(hoverBox);
        currentHoverBox = hoverBox;
        
        // Position the hover box
        const hoverBoxRect = hoverBox.getBoundingClientRect();
        let left = rect.left - hoverBoxRect.width - 10;
        let top = rect.top;
        
        // Adjust position if it would go off screen
        if (left < 0) {
            left = rect.right + 10;
        }
        if (top + hoverBoxRect.height > window.innerHeight) {
            top = window.innerHeight - hoverBoxRect.height - 10;
        }
        
        hoverBox.style.left = `${left}px`;
        hoverBox.style.top = `${top}px`;
        hoverBox.style.opacity = '1';
    });

    listItem.addEventListener('mouseleave', (e) => {
        if (currentHoverBox) {
            currentHoverBox.remove();
            currentHoverBox = null;
        }
    });
    
    listItem.appendChild(mainContent);
    return listItem;
}

function updatePaginationControls() {
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination-controls';
    
    const prevButton = document.createElement('button');
    prevButton.className = 'page-button';
    prevButton.textContent = '← Previous';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            displayCurrentPage();
            updatePaginationControls();
        }
    };
    
    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `${currentPage}/${totalPages}`;
    
    const nextButton = document.createElement('button');
    nextButton.className = 'page-button';
    nextButton.textContent = 'Next →';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayCurrentPage();
            updatePaginationControls();
        }
    };
    
    paginationDiv.appendChild(prevButton);
    paginationDiv.appendChild(pageInfo);
    paginationDiv.appendChild(nextButton);
    
    // Replace existing pagination controls or append new ones
    const existingControls = document.querySelector('.pagination-controls');
    if (existingControls) {
        existingControls.replaceWith(paginationDiv);
    } else {
        document.querySelector('.fridge-list-container').appendChild(paginationDiv);
    }
}

// Update the event listener for fridge updates
document.addEventListener('fridgeUpdated', () => {
    currentPage = 1; // Reset to first page on updates
    loadFridgeList();
}); 