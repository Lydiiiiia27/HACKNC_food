from flask import Blueprint, render_template, request, jsonify
from app.services.ocr_service import TabScannerOCR
from app.services.voice_input import VoiceToJsonConverter
from app.services.process_json import process_json_file
from app.utils.file_handler import save_uploaded_file
import os
import time

ocr_bp = Blueprint('ocr', __name__, url_prefix='/ocr')

@ocr_bp.route('/upload', methods=['GET'])
def upload():
    return render_template('ocr/upload.html')

@ocr_bp.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return render_template('ocr/upload.html', message='No file selected', error=True)
    
    file = request.files['file']
    if file.filename == '':
        return render_template('ocr/upload.html', message='No file selected', error=True)
    
    try:
        filepath = save_uploaded_file(file)
        if not filepath:
            return render_template('ocr/upload.html', message='Invalid file type', error=True)
        
        ocr = TabScannerOCR()
        token = ocr.process_image(filepath)
        results = ocr.get_result(token)
        
        json_filename = f"receipt_results_{int(time.time())}.json"
        json_path = os.path.join('static', 'uploads', json_filename)
        ocr.save_to_json(results, json_path)
        
        # Process the JSON file
        processed_json_path = os.path.join('static', 'revise', f"shoppingList.json")
        api_key = os.getenv("OPENAI_API_KEY")
        process_json_file(json_path, processed_json_path, api_key)
        
        return render_template('ocr/upload.html', message='File processed successfully!', json_path=processed_json_path)
    except Exception as e:
        return render_template('ocr/upload.html', message=f'Error: {str(e)}', error=True)

@ocr_bp.route('/voice_input', methods=['POST'])
def voice_input():
    if 'audio_data' not in request.files:
        return jsonify(success=False, message='No audio data received')
    
    audio_data = request.files['audio_data']
    
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return jsonify(success=False, message='OPENAI_API_KEY environment variable not set')
        
        converter = VoiceToJsonConverter(api_key)
        converter.process_voice_input(audio_data.read(), audio_data.filename)
        
        json_filename = f"voice_results_{int(time.time())}.json"
        json_path = os.path.join('static', 'revise', json_filename)
        
        return jsonify(success=True, json_path=json_path)
    except Exception as e:
        return jsonify(success=False, message=str(e))