import os
from pymongo import MongoClient
from dotenv import load_dotenv
import os

# Enable model caching
CACHE_DIR = os.path.join(os.getcwd(), 'model_cache')
os.makedirs(CACHE_DIR, exist_ok=True)
os.environ['TRANSFORMERS_CACHE'] = CACHE_DIR

# Load environment variables from .env file
load_dotenv()

# Secret key for JWT tokens (from environment variable)
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# MongoDB connection string from environment variable
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/prepify')

# Initialize the database connection
try:
    client = MongoClient(MONGO_URI)
    db = client.get_database('prepify')
    client.admin.command('ping')
    print("✅ MongoDB connection successful.")
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    db = None