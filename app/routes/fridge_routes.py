from flask import Blueprint, render_template, jsonify, request
import os
import json

# Create a new blueprint with a unique name
fridge_bp = Blueprint('fridge', __name__, url_prefix='/fridge')

@fridge_bp.route('/')
def index():
    return render_template('fridge/index.html')

@fridge_bp.route('/get_shopping_items')
def get_shopping_items():
    try:
        json_path = os.path.join('static', 'revise', 'shoppingList.json')
        with open(json_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@fridge_bp.route('/get_fridge_items')
def list_fridge_items():
    try:
        fridge_path = os.path.join('static', 'revise', 'fridge_items.json')
        print(f"Loading fridge items from: {fridge_path}")
        
        # Initialize with empty array if file doesn't exist or is empty
        if not os.path.exists(fridge_path) or os.path.getsize(fridge_path) == 0:
            print("File doesn't exist or is empty")
            with open(fridge_path, 'w', encoding='utf-8') as f:
                json.dump([], f, indent=4)
        
        with open(fridge_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
            print(f"Loaded fridge items: {data}")
        return jsonify(data)
    except Exception as e:
        print(f"Error loading fridge items: {str(e)}")
        # Initialize with empty array on error
        with open(fridge_path, 'w', encoding='utf-8') as f:
            json.dump([], f, indent=4)
        return jsonify([])

COMPARTMENT_RULES = {
    'Meat & Seafood': 'right-compartment',
    'Others': 'right-compartment'
}

def determine_category(item_category):
    # Your existing category determination logic
    CATEGORIES = {
        'Fruits & Vegetables': ['fruits', 'vegetables', 'produce'],
        'Dairy & Eggs': ['dairy', 'eggs', 'milk', 'cheese'],
        'Meat & Seafood': ['meat', 'seafood', 'poultry'],
        'Beverages': ['drinks', 'beverages', 'juice'],
        'Condiments': ['sauce', 'condiments', 'spices'],
        'Others': ['other', 'miscellaneous', 'general']
    }
    
    item_category = item_category.lower()
    for category, keywords in CATEGORIES.items():
        if any(keyword in item_category for keyword in keywords):
            return category
    return 'Others'

@fridge_bp.route('/add_to_fridge', methods=['POST'])
def add_to_fridge():
    try:
        data = request.json
        item_data = data['item']
        category = determine_category(item_data['category'])
        
        # Determine correct compartment based on category
        correct_compartment = COMPARTMENT_RULES.get(category, 'left-compartment')
        
        # Override the requested compartment with the correct one
        data['compartment'] = correct_compartment
        
        # Rest of your existing add_to_fridge code...
        fridge_path = os.path.join('static', 'revise', 'fridge_items.json')
        
        if not os.path.exists(fridge_path) or os.path.getsize(fridge_path) == 0:
            with open(fridge_path, 'w', encoding='utf-8') as f:
                json.dump([], f, indent=4)
        
        with open(fridge_path, 'r+', encoding='utf-8') as file:
            try:
                fridge_items = json.load(file)
            except json.JSONDecodeError:
                fridge_items = []
            
            # Check for duplicates
            if not any(item['name'] == item_data['name'] for item in fridge_items):
                new_item = {
                    'name': item_data['name'],
                    'category': category,
                    'quantity_or_weight': item_data.get('quantity_or_weight', ''),
                    'unit': item_data.get('unit', ''),
                    'best_before_in_fridge': item_data.get('best_before_in_fridge', 7),
                    'compartment': correct_compartment
                }
                fridge_items.append(new_item)
                
                file.seek(0)
                json.dump(fridge_items, file, indent=4, ensure_ascii=False)
                file.truncate()
                return jsonify({'success': True})
            else:
                return jsonify({'success': False, 'error': 'Item already exists in fridge'}), 400
                
    except Exception as e:
        print(f"Error in add_to_fridge: {str(e)}")
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

@fridge_bp.route('/move_fridge_item', methods=['POST'])
def move_fridge_item():
    try:
        data = request.json
        fridge_path = os.path.join('static', 'revise', 'fridge_items.json')
        
        with open(fridge_path, 'r+', encoding='utf-8') as file:
            try:
                items = json.load(file)
            except json.JSONDecodeError:
                items = []
            
            # Remove the item from its current position
            items = [item for item in items if item['name'] != data['item']['name']]
            
            # Add the item in its new position with updated category and compartment
            new_item = {
                'name': data['item']['name'],
                'category': data.get('targetCategory', data['item']['category']),  # Use new category if provided
                'quantity_or_weight': data['item']['quantity_or_weight'],
                'unit': data['item']['unit'],
                'best_before_in_fridge': data['item']['best_before_in_fridge'],
                'compartment': data['targetCompartment']
            }
            items.append(new_item)
            
            file.seek(0)
            json.dump(items, file, indent=4, ensure_ascii=False)
            file.truncate()
            
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error in move_fridge_item: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500