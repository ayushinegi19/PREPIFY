import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import config and blueprints
from config import SECRET_KEY
from routes.auth import auth_bp
from routes.upload import uploads_bp
from routes.profile import profile_bp

# Configure Flask
app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')

# --- CONFIGURATION ---
app.config['SECRET_KEY'] = SECRET_KEY

# CORS configuration - tighten this in production
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://localhost:5000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

bcrypt = Bcrypt(app)

# --- BLUEPRINT REGISTRATION ---
# All API routes will be prefixed with /api
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(uploads_bp, url_prefix='/api/uploads')
app.register_blueprint(profile_bp, url_prefix='/api/profile')

# --- REACT APP SERVING ---
# Serves the main index.html file for any route not caught by the API
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# --- ERROR HANDLERS ---
@app.errorhandler(404)
def not_found(e):
    return {"error": "Route not found"}, 404

@app.errorhandler(500)
def server_error(e):
    return {"error": "Internal server error"}, 500

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🚀 Starting Prepify Backend Server")
    print("="*50)
    print(f"📍 Server URL: http://localhost:5000")
    print(f"🔐 Secret Key: {'✅ Set' if SECRET_KEY else '❌ Missing'}")
    print(f"💾 Database: {'✅ Connected' if os.environ.get('MONGO_URI') else '⚠️  Using default'}")
    print("="*50 + "\n")
    
    app.run(debug=True, port=5000, host='0.0.0.0')