import requests
import json
import time
import os
from dotenv import load_dotenv

class TabScannerOCR:
    def __init__(self):
        # Load environment variables
        load_dotenv()
        self.api_key = os.getenv("TABSCANNER_API_KEY")
        self.base_url = "https://api.tabscanner.com/api"
        self.headers = {'apikey': self.api_key}

    def process_image(self, image_path):
        """Process the image and get the token"""
        endpoint = f"{self.base_url}/2/process"
        
        # Prepare the payload
        payload = {"documentType": "receipt"}
        
        # Open and prepare the image file
        try:
            files = {'file': open(image_path, 'rb')}
        except FileNotFoundError:
            raise Exception(f"Image file not found: {image_path}")

        # Make the API request
        try:
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
        finally:
            files['file'].close()

    def get_result(self, token):
        """Get the OCR results using the token"""
        endpoint = f"{self.base_url}/result/{token}"
        
        max_attempts = 10
        attempt = 0
        
        while attempt < max_attempts:
            response = requests.get(endpoint, headers=self.headers)
            result = response.json()
            
            # Check if processing is complete
            if result.get('status') == 'done':
                return result
            
            # If still processing, wait and try again
            if result.get('status') == 'pending':
                time.sleep(2)  # Wait 2 seconds before next attempt
                attempt += 1
                continue
            
            # If failed, raise exception
            raise Exception(f"Result retrieval failed: {result.get('message')}")
        
        raise Exception("Maximum attempts reached while waiting for results")

    def save_to_json(self, data, output_path):
        """Save the results to a JSON file"""
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            print(f"Results saved to: {output_path}")
        except Exception as e:
            raise Exception(f"Failed to save JSON file: {str(e)}")

def main():
    # Initialize the OCR processor
    ocr = TabScannerOCR()
    
    # Define paths
    image_path = "./receipt/3.jpg"  # Replace with your image path
    output_path = "output_results.json"
    
    try:
        # Process the image
        print("Processing image...")
        token = ocr.process_image(image_path)
        print(f"Got token: {token}")
        
        # Get the results
        print("Getting results...")
        results = ocr.get_result(token)
        
        # Save to JSON file
        print("Saving results...")
        ocr.save_to_json(results, output_path)
        
        print("Process completed successfully!")
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()
