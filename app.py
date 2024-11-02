import os
from flask import Flask, render_template, request, flash
from werkzeug.utils import secure_filename
import requests
import json
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "hacknc2024")

# Configuration
UPLOAD_FOLDER = os.path.join('static', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
API_KEY = os.getenv("TABSCANNER_API_KEY")

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

class TabScannerOCR:
    def __init__(self):
        self.base_url = "https://api.tabscanner.com/api"
        self.headers = {'apikey': API_KEY}

    def process_image(self, image_path):
        """Process the image and get the token"""
        endpoint = f"{self.base_url}/2/process"
        payload = {"documentType": "receipt"}
        
        try:
            with open(image_path, 'rb') as image_file:
                files = {'file': image_file}
                response = requests.post(
                    endpoint,
                    files=files,
                    data=payload,
                    headers=self.headers
                )
                response.raise_for_status()
                result = response.json()
                
                if not result.get('success'):
                    raise Exception(f"Process failed: {result.get('message')}")
                
                return result.get('token')
        except Exception as e:
            raise Exception(f"Error processing image: {str(e)}")

    def get_result(self, token):
        """Get the OCR results using the token"""
        endpoint = f"{self.base_url}/result/{token}"
        
        max_attempts = 10
        attempt = 0
        
        while attempt < max_attempts:
            response = requests.get(endpoint, headers=self.headers)
            result = response.json()
            
            if result.get('status') == 'done':
                return result
            
            if result.get('status') == 'pending':
                time.sleep(2)
                attempt += 1
                continue
            
            raise Exception(f"Result retrieval failed: {result.get('message')}")
        
        raise Exception("Maximum attempts reached while waiting for results")

    def save_to_json(self, data, output_path):
        """Save the results to a JSON file"""
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            return True
        except Exception as e:
            raise Exception(f"Failed to save JSON file: {str(e)}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return render_template('index.html', message='No file selected', error=True)
    
    file = request.files['file']
    if file.filename == '':
        return render_template('index.html', message='No file selected', error=True)

    if file and allowed_file(file.filename):
        try:
            # Save uploaded file
            filename = secure_filename(file.filename)
            image_path = os.path.join(UPLOAD_FOLDER, filename)
            file.save(image_path)

            # Process with OCR
            ocr = TabScannerOCR()
            
            # Get token
            token = ocr.process_image(image_path)
            
            # Get results
            results = ocr.get_result(token)
            
            # Save results to JSON
            json_filename = f"receipt_results_{int(time.time())}.json"
            json_path = os.path.join(UPLOAD_FOLDER, json_filename)
            ocr.save_to_json(results, json_path)

            return render_template('index.html', 
                                message='File processed successfully!',
                                json_path=json_path)

        except Exception as e:
            return render_template('index.html', 
                                message=f'Error processing file: {str(e)}',
                                error=True)

    return render_template('index.html', 
                         message='Invalid file type. Please upload a PNG or JPG file.',
                         error=True)

if __name__ == '__main__':
    app.run(debug=True) 