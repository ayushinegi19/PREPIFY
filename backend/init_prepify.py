from pymongo import MongoClient

MONGO_URI = "mongo_db_connection"
client = MongoClient(MONGO_URI)

try:
    # Select the 'prepify' database
    db = client["prepify"]

    # Insert a test document (creates the DB + collection if they don't exist)
    db.test_collection.insert_one({"status": "connected", "source": "init_prepify.py"})
    print("✅ Document inserted into 'prepify.test_collection'.")

    # List collections to verify access
    collections = db.list_collection_names()
    print("📂 Collections in 'prepify':", collections)

except Exception as e:
    print("❌ Failed to create/verify database:", e)
