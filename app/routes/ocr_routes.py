from flask import Blueprint, render_template, request
from app.services.ocr_service import TabScannerOCR
from app.utils.file_handler import save_uploaded_file

ocr_bp = Blueprint('ocr', __name__, url_prefix='/ocr')

@ocr_bp.route('/upload', methods=['GET'])
def upload():
    return render_template('ocr/upload.html')

@ocr_bp.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return render_template('ocr/upload.html', 
                             message='No file selected', 
                             error=True)
    
    file = request.files['file']
    if file.filename == '':
        return render_template('ocr/upload.html', 
                             message='No file selected', 
                             error=True)

    try:
        filepath = save_uploaded_file(file)
        if not filepath:
            return render_template('ocr/upload.html', 
                                 message='Invalid file type', 
                                 error=True)

        ocr = TabScannerOCR()
        token = ocr.process_image(filepath)
        results = ocr.get_result(token)
        
        json_filename = f"receipt_results_{int(time.time())}.json"
        json_path = os.path.join('static', 'revise', json_filename)
        ocr.save_to_json(results, json_path)

        return render_template('ocr/upload.html', 
                             message='File processed successfully!',
                             json_path=json_path)

    except Exception as e:
        return render_template('ocr/upload.html', 
                             message=f'Error: {str(e)}', 
                             error=True)