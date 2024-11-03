from flask import Blueprint, render_template, request, jsonify
from app.services.ocr_service import TabScannerOCR
from app.services.voice_input import VoiceToJsonConverter
from app.services.process_json import process_json_file
from app.utils.file_handler import save_uploaded_file
import os
import time
import json
from app.services.recipe_generator import RecipeGenerator

recipe_bp = Blueprint('recipe', __name__, url_prefix='/recipe')

with open('refrigerator_items.json', 'r') as f:
    refrigerator_items = json.load(f)

@recipe_bp.route('/recipe', methods=['GET'])
def upload():
    return render_template('recipe/recipe.html', items=refrigerator_items)

    

@recipe_bp.route('/generate_recipe', methods=['POST'])
def generate_recipe():
    try:
        generator = RecipeGenerator(api_key = os.getenv("OPENAI_API_KEY"))
        recipes = generator.generate_recipes()
        return jsonify({"recipes": recipes})
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@recipe_bp.route('/save_schedule', methods=['POST'])
def save_schedule():
    try:
        data = request.json
        # Add debug logging
        print("Received data:", data)
        
        if not data or 'schedule' not in data:
            return jsonify({
                'status': 'error',
                'message': 'No schedule data provided'
            }), 400
            
        with open('meal_schedule.json', 'w') as f:
            json.dump(data['schedule'], f, indent=4)
            # Verify write completed
            print("Schedule saved to meal_schedule.json")
            
        return jsonify({
            'status': 'success',
            'message': 'Meal schedule saved successfully'
        })
    except Exception as e:
        print("Error saving schedule:", str(e))
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500