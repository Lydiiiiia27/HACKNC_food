import json
from collections import defaultdict
import os

# Get the absolute path to the static directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RECIPE_PATH = os.path.join(BASE_DIR, 'static', 'recipe.json')

# Load JSON data
try:
    with open(RECIPE_PATH, 'r') as f:
        data = json.load(f)
except FileNotFoundError:
    # Initialize with empty data if file doesn't exist
    data = {"week_meals": []}

# 1. Calculate daily calories
def get_daily_calories():
    daily_calories = defaultdict(int)
    for day in data['week_meals']:
        day_name = day['day']
        for meal_type in ['breakfast', 'lunch', 'dinner']:
            if meal_type in day['meals']:
                for meal in day['meals'][meal_type]:
                    daily_calories[day_name] += meal['calories']
    
    # Log the daily calories to verify the data
    print("Daily Calories Data:", daily_calories)
    
    return dict(daily_calories)

# 2. Count dishes by country
def get_country_counts():
    country_counts = defaultdict(int)
    for day in data['week_meals']:
        for meal_type in ['breakfast', 'lunch', 'dinner']:
            if meal_type in day['meals']:
                for meal in day['meals'][meal_type]:
                    country_counts[meal['country']] += 1
    return dict(country_counts)

# 3. Calculate daily nutrition
def get_daily_nutrition():
    daily_nutrition = defaultdict(lambda: {'carbs': 0, 'protein': 0, 'fat': 0})
    for day in data['week_meals']:
        day_name = day['day']
        for meal_type in ['breakfast', 'lunch', 'dinner']:
            if meal_type in day['meals']:
                for meal in day['meals'][meal_type]:
                    nutrition = meal.get('nutrition', {})  # Use get() to handle missing data
                    daily_nutrition[day_name]['carbs'] += float(nutrition.get('carbs', 0))
                    daily_nutrition[day_name]['protein'] += float(nutrition.get('protein', 0))
                    daily_nutrition[day_name]['fat'] += float(nutrition.get('fat', 0))
    
    # Debug print
    print("Calculated nutrition data:", dict(daily_nutrition))
    return dict(daily_nutrition)

# 4. Calculate cooking times
def get_cooking_times():
    daily_cooking = defaultdict(int)
    for day in data['week_meals']:
        day_name = day['day']
        for meal_type in ['breakfast', 'lunch', 'dinner']:
            if meal_type in day['meals']:
                for meal in day['meals'][meal_type]:
                    # Convert "XX minutes" to float to handle decimal values
                    time_str = meal['estimated_time']
                    minutes = float(time_str.split()[0])
                    daily_cooking[day_name] += minutes
    return dict(daily_cooking)

# Add this function if you need ingredient analysis
def get_common_ingredients():
    ingredient_counts = defaultdict(lambda: defaultdict(int))
    
    for entry in data['week_meals']:
        for meal_type, meals in entry['meals'].items():
            for meal in meals:
                for ingredient in meal['ingredients']:
                    ingredient_counts['all'][ingredient['name']] += 1
    
    return {
        'all': [
            {"text": ingredient, "count": count}
            for ingredient, count in ingredient_counts['all'].items()
        ]
    }

# Example usage:
calories = get_daily_calories()
countries = get_country_counts()
nutrition = get_daily_nutrition()
cooking_times = get_cooking_times()

# Print results
print("Daily Calories:", calories)
print("Country Distribution:", countries)
print("Daily Nutrition:", nutrition)
print("Daily Cooking Times:", cooking_times)
