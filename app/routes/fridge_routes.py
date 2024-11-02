from flask import Blueprint, render_template, jsonify, request
import os
import json

fridge_bp = Blueprint('fridge', __name__, url_prefix='/fridge')

@fridge_bp.route('/')
def index():
    return render_template('fridge/index.html')

@fridge_bp.route('/get_food_items')
def get_food_items():
    try:
        json_path = os.path.join('static', 'revise', 'processed_receipt_results_1730570107.json')
        print(f"Attempting to load JSON from: {os.path.abspath(json_path)}")
        with open(json_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
        print(f"Successfully loaded {len(data)} items")
        return jsonify(data)
    except Exception as e:
        print(f"Error loading JSON: {str(e)}")
        return jsonify({'error': str(e)}), 500

@fridge_bp.route('/update_item', methods=['POST'])
def update_item():
    try:
        item_data = request.json
        json_path = os.path.join('static', 'revise', 'processed_receipt_results_1730570107.json')
        
        with open(json_path, 'r+', encoding='utf-8') as file:
            data = json.load(file)
            for item in data:
                if item['name'] == item_data['name']:
                    item.update(item_data)
                    break
            file.seek(0)
            json.dump(data, file, indent=4, ensure_ascii=False)
            file.truncate()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500