document.addEventListener('DOMContentLoaded', () => {
    let selectedRecipes = [];

    fetch('/static/recipe/daily_meal_recipe.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Raw data:', data);

            // Extract recipes with safe defaults
            const recipes = data.recipes.map(mealGroup => ({
                meal: mealGroup.meal,
                recipes: mealGroup.recipes.map(recipe => ({
                    meal: mealGroup.meal,
                    name: recipe.name || 'Untitled Recipe',
                    type: recipe.type || 'General',
                    time: {
                        prep: recipe.time?.prep || 'N/A',
                        cook: recipe.time?.cook || 'N/A'
                    },
                    ingredients: recipe.ingredients || [],
                    instructions: recipe.steps?.join('\n') || 'No instructions available',
                    nutrition: recipe.nutrition || {
                        calories: 'N/A',
                        protein: 'N/A',
                        carbs: 'N/A',
                        fat: 'N/A'
                    }
                }))
            }));

            console.log('Processed recipes:', recipes);
            displayRecipes(recipes);
        })
        .catch(error => {
            console.error('Error loading recipes:', error);
            const containers = ['breakfast', 'lunch', 'dinner'];
            containers.forEach(type => {
                const container = document.getElementById(`${type}-recipes`);
                if (container) {
                    container.innerHTML = `
                        <div class="error-card">
                            <p class="error-message">Failed to load recipes: ${error.message}</p>
                            <p>Please check the JSON file format and try again</p>
                        </div>`;
                }
            });
        });

    // Add event listeners for popup display
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('show-details')) {
            e.preventDefault();
            const recipe = JSON.parse(e.target.dataset.recipe);
            const overlay = document.createElement('div');
            overlay.className = 'popup-overlay active';
            
            const popup = document.createElement('div');
            popup.className = 'recipe-details-popup active';
            popup.innerHTML = `
                <div class="popup-header">
                    <h2>${recipe.name}</h2>
                    <button class="popup-close">&times;</button>
                </div>
                <div class="popup-content">
                    <div class="recipe-section">
                        <h3>Ingredients</h3>
                        <ul class="ingredients-list">
                            ${recipe.ingredients.map(ing => `<li>${ing.item}: ${ing.amount} ${ing.unit}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="recipe-section">
                        <h3>Instructions</h3>
                        <div class="instructions">
                            ${recipe.instructions.split('\n').map((step, index) => `<p>Step ${index + 1}: ${step}</p>`).join('')}
                        </div>
                    </div>
                    <div class="recipe-section">
                        <h3>Nutrition Facts</h3>
                        <div class="nutrition-grid">
                            <div class="nutrition-item">
                                <span>${recipe.nutrition.calories}</span>
                                <label>Calories</label>
                            </div>
                            <div class="nutrition-item">
                                <span>${recipe.nutrition.protein}g</span>
                                <label>Protein</label>
                            </div>
                            <div class="nutrition-item">
                                <span>${recipe.nutrition.carbs}g</span>
                                <label>Carbs</label>
                            </div>
                            <div class="nutrition-item">
                                <span>${recipe.nutrition.fat}g</span>
                                <label>Fat</label>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            document.body.appendChild(popup);

            const closePopup = () => {
                overlay.remove();
                popup.remove();
            };

            popup.querySelector('.popup-close').addEventListener('click', closePopup);
            overlay.addEventListener('click', closePopup);
        }

        if (e.target.classList.contains('select-recipe')) {
            e.preventDefault();
            const recipe = JSON.parse(e.target.dataset.recipe);
            const index = selectedRecipes.findIndex(r => r.name === recipe.name);

            if (index === -1) {
                selectedRecipes.push(recipe);
                e.target.textContent = 'Deselect';
                e.target.classList.add('deselect-recipe');
            } else {
                selectedRecipes.splice(index, 1);
                e.target.textContent = 'Select';
                e.target.classList.remove('deselect-recipe');
            }
        }
    });

    // Add event listener for Done button
    document.getElementById('done-button').addEventListener('click', () => {
        saveSelectedRecipes();
    });

    function saveSelectedRecipes() {
        const json = JSON.stringify(selectedRecipes, null, 2);
        fetch('/recipe/save_selected_recipes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: json
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Selected recipes saved:', data);
            window.location.href = '/meal/meal';
        })
        .catch(error => {
            console.error('Error saving selected recipes:', error);
        });
    }
});

function displayRecipes(recipes) {
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    mealTypes.forEach(mealType => {
        const container = document.getElementById(`${mealType}-recipes`);
        if (!container) {
            console.error(`Container not found for ${mealType}`);
            return;
        }
        
        const mealRecipes = recipes.find(r => r.meal.toLowerCase() === mealType)?.recipes || [];
        
        container.innerHTML = mealRecipes.slice(0, 5).map(recipe => {
            return `
                <div class="recipe-card">
                    <h3>${recipe.name}</h3>
                    <p>Type: ${recipe.type}</p>
                    <p>Prep Time: ${recipe.time.prep}</p>
                    <p>Cook Time: ${recipe.time.cook}</p>
                    <div class="recipe-buttons">
                        <button class="show-details" data-recipe='${JSON.stringify(recipe)}'>Show Details</button>
                        <button class="select-recipe" data-recipe='${JSON.stringify(recipe)}'>Select</button>
                    </div>
                </div>
            `;
        }).join('');
    });
}