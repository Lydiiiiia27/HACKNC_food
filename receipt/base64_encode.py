import base64
import os

try:
    # Get the image filename and create output filename
    image_path = 'receipt/1.jpg'
    output_path = image_path.rsplit('.', 1)[0] + '.txt'  # Changes .jpg to .txt
    
    # Read and encode the image file
    with open(image_path, 'rb') as image_file:
        base64_string = base64.b64encode(image_file.read()).decode('utf-8')
    
    # Save the base64 string to a text file
    with open(output_path, 'w') as text_file:
        text_file.write(base64_string)
    
    print(f"Base64 encoded string has been saved to {output_path}")
    
except FileNotFoundError:
    print(f"Error: Could not find '{image_path}'")
except Exception as e:
    print(f"An error occurred: {str(e)}")
