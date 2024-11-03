from flask import Flask
from config import Config

def create_app(config_class=Config):
    app = Flask(__name__, 
                template_folder='../templates',
                static_folder='../static')
    
    app.config.from_object(config_class)

    # Register blueprints
    from app.routes.main_routes import main_bp
    from app.routes.fridge_routes import fridge_bp
    from app.routes.ocr_routes import ocr_bp
    from app.routes.recipe_routes import recipe_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(fridge_bp)
    app.register_blueprint(ocr_bp)
    app.register_blueprint(recipe_bp)

    return app