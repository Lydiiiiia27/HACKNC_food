# recipe_generator.py

import json
from datetime import datetime
from typing import List, Dict, Any
from openai import OpenAI
import re
import os

class RecipeGenerator:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = OpenAI(api_key=api_key)
        self.fridge_items = self._load_fridge_items()
        self.schedule = self._load_schedule()

    def _load_fridge_items(self) -> List[Dict]:
        with open('refrigerator_items.json', 'r') as f:
            return json.load(f)
            
    def _load_schedule(self) -> List[Dict]:
        schedule_path = os.path.join('static', 'recipe', 'meal_schedule.json')
        with open(schedule_path, 'r') as f:
            return json.load(f)
            
    def _create_recipe_prompt(self, meal: Dict, meal_time: datetime) -> str:
        # Format available ingredients with quantities and expiration
        available_ingredients = "\n".join([
            f"- {item['name']}: {item['quantity_or_weight']} {item['unit']} "
            f"(expires in {item['best_before_in_fridge']} days, "
            f"{'frozen' if item['frozen'] else 'fresh'})"
            for item in self.fridge_items
        ])
        print(available_ingredients)
        
        # Calculate time gaps between meals
        meal_times = [(m['meal'], datetime.strptime(m['time'], '%H:%M')) for m in self.schedule]
        current_idx = next(i for i, (name, _) in enumerate(meal_times) if name == meal['meal'])
        
        time_gap_before = ""
        time_gap_after = ""
        if current_idx > 0:
            prev_time = meal_times[current_idx - 1][1]
            time_diff = (meal_time - prev_time).total_seconds() / 3600
            time_gap_before = f"\nTime since last meal: {time_diff:.1f} hours"
        if current_idx < len(meal_times) - 1:
            next_time = meal_times[current_idx + 1][1]
            time_diff = (next_time - meal_time).total_seconds() / 3600
            time_gap_after = f"\nTime until next meal: {time_diff:.1f} hours"

        return f"""You are a professional chef planning {meal['meal']} at {meal['time']}.

AVAILABLE INGREDIENTS (Use only these with specified quantities):
{available_ingredients}

MEAL CONTEXT:
- Meal Type: {meal['meal']}
- Time: {meal['time']}
- Early meal considerations: {'Yes - design quick, energizing dishes' if meal_time.hour < 7 else 'No'}
{time_gap_before}{time_gap_after}
- Dining location: {'Eating out' if meal['eatingOut'] else 'At home'}

SPECIAL REQUIREMENTS:
Required Ingredients: {', '.join(meal['items']) if meal['items'] else 'None specified'}
(Must include at least one recipe using these items)

Dietary Restrictions and Preferences:
{self._format_filters(meal['filters'])}


For each recipe provide:
1. Name
2. Type (appetizer/main/side/dessert)
3. Ingredients with exact quantities
4. Steps
5. Prep & cook time
6. Nutrition facts
7. Storage info if making ahead

IMPORTANT CONSIDERATIONS:
1. Use ONLY available ingredients and respect quantity limits
2. Consider meal timing and energy requirements
3. If time gap to next meal is short (<4 hours), suggest lighter portions
4. For early meals (before 7 AM), focus on quick, digestible options
5. Balance the overall meal composition
6. Prioritize using items closer to expiration
7. Account for preparation time based on meal schedule
8. Provide at least five recipes for each meal, and three of them must be main type.
9. Privent repeating the same or similar recipe in the same day.
10. Ensure a variety of tastes and textures in the meal.
11. You need to be creative and innovative in your recipe ideas.

OUTPUT FORMAT REQUIREMENTS:
Return each recipe in the following exact JSON format:
{{
    "name": "Recipe Name",
    "type": "main/appetizer/side/dessert",
    "ingredients": [
        {{
            "item": "ingredient name",
            "amount": "numeric value",
            "unit": "measurement unit"
        }}
    ],
    "steps": [
        "Step 1 description",
        "Step 2 description"
    ],
    "time": {{
        "prep": "X minutes",
        "cook": "Y minutes",
        "total": "Z minutes"
    }},
    "nutrition": {{
        "calories": "X kcal",
        "protein": "X g",
        "carbs": "X g",
        "fat": "X g"
    }},
    "storage": "Storage instructions"
}}

Separate multiple recipes with three dashes (---).
Do not include any other text or formatting."""

    def _format_filters(self, filters: List[Dict]) -> str:
        if not filters:
            return "No specific dietary restrictions"
        
        formatted = []
        for f in filters:
            if f['type'] == 'dietary':
                formatted.append(f"Diet: {f['value']}")
            elif f['type'] == 'taste':
                formatted.append(f"Taste preference: {f['value']}")
            elif f['type'] == 'method':
                formatted.append(f"Cooking method: {f['value']}")
            elif f['type'] == 'complexity':
                formatted.append(f"Complexity level: {f['value']}")
            elif f['type'] == 'prep':
                formatted.append(f"Prep time preference: {f['value']}")
        
        return "\n".join(formatted)
    
    def _save_recipes_to_json(self, recipes: List[Dict], filename: str = None) -> None:
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            #filename = f"daily_meal_recipe.json"
            filename = f"static/recipe/daily_meal_recipe.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump({
                "generated_at": datetime.now().isoformat(),
                "recipes": recipes
            }, f, indent=4, ensure_ascii=False)

    def generate_recipes(self) -> List[Dict]:
        all_recipes = []
        current_time = datetime.now()
        
        for meal in self.schedule:
            meal_time = datetime.strptime(meal['time'], '%H:%M').replace(
                year=current_time.year,
                month=current_time.month,
                day=current_time.day
            )
            
            prompt = self._create_recipe_prompt(meal, meal_time)
            
            try:
                response = self.client.chat.completions.create(
                    model="gpt-4o-mini",  # or "gpt-3.5-turbo" depending on your needs
                    messages=[
                        {"role": "system", "content": "You are a professional chef. Respond only with the exact JSON format requested."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.9
                )
                print
                recipes_text = response.choices[0].message.content
                recipe_chunks = [chunk.strip() for chunk in recipes_text.split('---') if chunk.strip()]
                
                try:
                    recipes = [json.loads(chunk) for chunk in recipe_chunks]
                except json.JSONDecodeError as e:
                    print(f"Error parsing recipe JSON: {e}")
                    continue
                
                all_recipes.append({
                    "meal": meal['meal'],
                    "time": meal['time'],
                    "recipes": recipes
                })
                
            except Exception as e:
                print(f"Error generating recipes for meal {meal['meal']}: {e}")
                continue
        
        # Save to JSON file
        self._save_recipes_to_json(all_recipes)
        
        return all_recipes

    def update_fridge_quantities(self, used_recipes: List[Dict]):
        for recipe in used_recipes:
            for ingredient in recipe.get('ingredients', []):
                for fridge_item in self.fridge_items:
                    if fridge_item['name'].lower() in ingredient['name'].lower():
                        new_quantity = float(fridge_item['quantity_or_weight']) - float(ingredient['quantity'])
                        fridge_item['quantity_or_weight'] = str(max(0, new_quantity))
        
        with open('refrigerator_items.json', 'w') as f:
            json.dump(self.fridge_items, f, indent=4)