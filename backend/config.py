# config.py - COMPLETE WITH GEMINI INTEGRATION
import os
from pymongo import MongoClient
from dotenv import load_dotenv
import sys

# Enable model caching
CACHE_DIR = os.path.join(os.getcwd(), 'model_cache')
os.makedirs(CACHE_DIR, exist_ok=True)
os.environ['TRANSFORMERS_CACHE'] = CACHE_DIR

# Load environment variables from .env file
load_dotenv()

# Secret key for JWT tokens
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# MongoDB Atlas URI (cloud database)
MONGO_URI = os.environ.get('MONGO_URI', 
    'mongodb+srv://AyushiNegi:uIIHkWXwZfZn6pMs@cluster0.ciaq9nk.mongodb.net/?retryWrites=true&w=majority')

# ✅ GEMINI API KEY (CRITICAL FOR AI ENHANCEMENTS)
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', None)

# Debug output
print("\n" + "="*60)
print("🔧 CONFIGURATION")
print("="*60)
print(f"Using MongoDB: {'Atlas (Cloud)' if 'mongodb+srv' in MONGO_URI else 'Local'}")
print(f"Connection: {MONGO_URI[:50]}...")
print(f"🔑 Secret Key: {'✅ Set' if SECRET_KEY else '❌ Missing'}")
print(f"🤖 Gemini API: {'✅ Available' if GEMINI_API_KEY else '⚠️  Not configured (optional)'}")
print("="*60 + "\n")

# Initialize the database connection
db = None
try:
    print("📡 Connecting to MongoDB...")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
    db = client.get_database('prepify')
    client.admin.command('ping')
    print("✅ MongoDB connection successful.\n")
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    print("\n⚠️  TROUBLESHOOTING:")
    print("   1. Check your internet connection")
    print("   2. Verify MongoDB Atlas credentials")
    print("   3. Whitelist your IP: https://cloud.mongodb.com/")
    print("="*60 + "\n")