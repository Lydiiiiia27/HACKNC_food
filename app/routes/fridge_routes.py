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
        json_path = os.path.join('static', 'revise', 'shoppingList.json')
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
        json_path = os.path.join('static', 'revise', 'shoppingList.json')
        
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

@fridge_bp.route('/add_to_fridge', methods=['POST'])
def add_to_fridge():
    try:
        data = request.json
        fridge_path = os.path.join('static', 'revise', 'fridge_items.json')
        
        # Create fridge file if it doesn't exist
        if not os.path.exists(fridge_path):
            with open(fridge_path, 'w', encoding='utf-8') as f:
                json.dump([], f)
        
        # Add item to fridge
        with open(fridge_path, 'r+', encoding='utf-8') as file:
            fridge_items = json.load(file)
            item_data = data['item']
            item_data['compartment'] = data['compartment']
            fridge_items.append(item_data)
            
            file.seek(0)
            json.dump(fridge_items, file, indent=4, ensure_ascii=False)
            file.truncate()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@fridge_bp.route('/remove_from_shopping', methods=['POST'])
def remove_from_shopping():
    try:
        item_name = request.json['name']
        shopping_path = os.path.join('static', 'revise', 'shoppingList.json')
        
        with open(shopping_path, 'r+', encoding='utf-8') as file:
            items = json.load(file)
            items = [item for item in items if item['name'] != item_name]
            
            file.seek(0)
            json.dump(items, file, indent=4, ensure_ascii=False)
            file.truncate()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@fridge_bp.route('/get_fridge_items')
def get_fridge_items():
    try:
        fridge_path = os.path.join('static', 'revise', 'fridge_items.json')
        
        # If fridge file doesn't exist, create it with empty array
        if not os.path.exists(fridge_path):
            with open(fridge_path, 'w', encoding='utf-8') as f:
                json.dump([], f)
                return jsonify([])
        
        # Read existing fridge items
        with open(fridge_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
        return jsonify(data)
    except Exception as e:
        print(f"Error loading fridge items: {str(e)}")
        return jsonify({'error': str(e)}), 500

@fridge_bp.route('/move_fridge_item', methods=['POST'])
def move_fridge_item():
    try:
        data = request.json
        fridge_path = os.path.join('static', 'revise', 'fridge_items.json')
        
        with open(fridge_path, 'r+', encoding='utf-8') as file:
            items = json.load(file)
            
            # Remove item from old position
            items = [item for item in items if item['name'] != data['item']['name']]
            
            # Add item to new position
            new_item = {
                'name': data['item']['name'],
                'category': data['item']['category'],
                'quantity_or_weight': data['item']['quantity_or_weight'],
                'unit': data['item']['unit'],
                'best_before_in_fridge': data['item']['best_before_in_fridge'],
                'compartment': data['targetCompartment']
            }
            items.append(new_item)
            
            # Save updated items
            file.seek(0)
            json.dump(items, file, indent=4, ensure_ascii=False)
            file.truncate()
            
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500