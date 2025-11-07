# init_prepify.py
import os
from pymongo import MongoClient

MONGO_URI = "mongo_db_connection"
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Get MongoDB URI from environment variable
MONGO_URI = os.environ.get('MONGO_URI')

if not MONGO_URI:
    print("❌ ERROR: MONGO_URI not found in .env file")
    print("📝 Please create a .env file in the backend folder with:")
    print("   MONGO_URI=mongodb+srv://...")
    exit(1)

# Hide password in output for security
def hide_password(uri):
    if '@' in uri and '://' in uri:
        parts = uri.split('://')
        if len(parts) == 2:
            protocol = parts[0]
            rest = parts[1]
            if '@' in rest:
                credentials, host = rest.split('@', 1)
                if ':' in credentials:
                    username = credentials.split(':')[0]
                    return f"{protocol}://{username}:****@{host[:30]}..."
    return uri[:50] + "..."

print("="*60)
print("🔧 PREPIFY DATABASE INITIALIZATION")
print("="*60)
print(f"📍 Connecting to: {hide_password(MONGO_URI)}")
print("="*60 + "\n")

client = MongoClient(MONGO_URI)

try:
    # Test connection
    client.admin.command('ping')
    print("✅ MongoDB connection successful!")
    
    # Select the 'prepify' database
    db = client["prepify"]

    # Insert a test document (creates the DB + collection if they don't exist)
    result = db.test_collection.insert_one({
        "status": "connected", 
        "source": "init_prepify.py"
    })
    print(f"✅ Document inserted into 'prepify.test_collection'")
    print(f"   Document ID: {result.inserted_id}")

    # List collections to verify access
    collections = db.list_collection_names()
    print("\n📂 Collections in 'prepify':", collections)
    
    # Show document count for each collection
    if collections:
        print("\n📊 Document counts:")
        for collection in collections:
            count = db[collection].count_documents({})
            print(f"   • {collection}: {count} documents")
    
    print("\n" + "="*60)
    print("✅ DATABASE INITIALIZATION COMPLETE!")
    print("="*60)

except Exception as e:
    print("❌ Failed to create/verify database:", e)
    print("\n⚠️  Check:")
    print("   1. Internet connection")
    print("   2. MongoDB Atlas credentials")
    print("   3. IP whitelist in Atlas")