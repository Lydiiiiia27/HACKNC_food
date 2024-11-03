from flask import Blueprint, jsonify, render_template
from app.services.dashboard import (
    get_daily_calories,
    get_country_counts,
    get_daily_nutrition,
    get_cooking_times,
    get_common_ingredients
)

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/dashboard')

@dashboard_bp.route('/')
def dashboard_index():
    return render_template('dashboard/index.html', title='Dashboard')

@dashboard_bp.route('/api/calories')
def get_calories():
    try:
        return jsonify(get_daily_calories())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route('/api/countries')
def get_countries():
    try:
        data = get_country_counts()
        print("Countries data:", data)
        return jsonify(data)
    except Exception as e:
        print("Error in get_countries:", str(e))
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route('/api/nutrition')
def get_nutrition():
    try:
        data = get_daily_nutrition()
        print("Nutrition data being sent:", data)
        return jsonify(data)
    except Exception as e:
        print("Error in get_nutrition:", str(e))
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route('/api/cooking-times')
def get_cooking_times_route():
    try:
        return jsonify(get_cooking_times())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route('/api/ingredients')
def get_ingredients():
    try:
        return jsonify(get_common_ingredients())
    except Exception as e:
        return jsonify({"error": str(e)}), 500