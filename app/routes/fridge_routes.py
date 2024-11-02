from flask import Blueprint, render_template, jsonify
import os
import json

fridge_bp = Blueprint('fridge', __name__, url_prefix='/fridge')

@fridge_bp.route('/')
def index():
    return render_template('fridge/index.html')

@fridge_bp.route('/get_food_items')
def get_food_items():
    try:
        json_path = os.path.join('static', 'revise', '1.json')
        with open(json_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500