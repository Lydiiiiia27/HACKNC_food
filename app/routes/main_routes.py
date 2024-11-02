from flask import Blueprint, redirect, url_for

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return redirect(url_for('fridge.index'))

@main_bp.route('/other-route')
def other_route():
    # Your other route logic
    pass