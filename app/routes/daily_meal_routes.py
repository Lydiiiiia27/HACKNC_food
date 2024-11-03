from flask import Blueprint, render_template, request, jsonify
from app.services.ocr_service import TabScannerOCR
from app.services.voice_input import VoiceToJsonConverter
from app.services.process_json import process_json_file
from app.utils.file_handler import save_uploaded_file
import os
import time
import json
from app.services.recipe_generator import RecipeGenerator

meal_bp = Blueprint('meal', __name__, url_prefix='/meal')

@meal_bp.route('/meal', methods=['GET'])
def upload():
    return render_template('meal/my_daily_meal.html')
