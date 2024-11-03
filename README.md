# Smart Kitchen – HackNC24 Project

## Introduction
Smart Kitchen is an AI-powered fridge management and recipe assistant developed as part of HackNC24 and submitted on Devpost. This project is designed to simplify meal planning, reduce food waste, and keep track of fridge inventory seamlessly. It offers users an intelligent way to organize their food storage, get timely reminders for items that are about to expire, and generate healthy, customized recipes based on available ingredients and personal preferences. Whether you're living alone, with a partner, or in a family setting, Smart Kitchen is adaptable to your lifestyle, making your kitchen experience smarter and more efficient.

## Features
- **Interactive Fridge Simulation**: A digital display of your fridge that separates chilled and frozen sections. Hover over any item to see details like expiration dates and quantities.
- **Automated Receipt Scanning**: Upload a photo of your grocery receipt, and the AI automatically recognizes and adds items to your inventory.
- **Voice Input**: Easily add items to your inventory using voice commands.
- **Customized Meal Planning**: Set your meal preferences and times, and let the AI suggest nutritious recipes tailored to your inventory and dietary needs.
- **Daily Meal Review**: View your selected meals and keep track of your meal plan in the *My Daily Meal* section.
- **Personal Dashboard (Upcoming Feature)**: Track your weekly calorie intake, favorite cuisines, nutritional goals, and more to improve future meal recommendations.

## How to Run Smart Kitchen
To run this project on your local machine, follow these steps:

1. **Clone the Repository**: Ensure you have the project files in your development environment.
2. **Install Dependencies**: Run the following command to install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
3. **Add OpenAI API Key**:
   - Create a `.dev` file in the project root directory.
   - Add your OpenAI API key in the format:
     ```bash
     OPENAI_API_KEY=your_openai_api_key_here
     ```
4. **Start the Application**: Run the `run.py` file with:
   ```bash
   python run.py
   ```
5. **Access the Application**: Open your web browser and go to `http://localhost:5000` to start using Smart Kitchen.

## Acknowledgements
This project was created as part of HackNC24 and submitted on Devpost. We’re excited to continue developing *Smart Kitchen* and look forward to enhancing its capabilities in the future.
