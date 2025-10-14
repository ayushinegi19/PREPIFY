from pymongo import MongoClient

MONGO_URI = "mongodb+srv://negiayushij:dND06pbDgcj28PAw@cluster0.ciaq9nk.mongodb.net/"
client = MongoClient(MONGO_URI)

try:
    print("Connected to MongoDB")
    print("Databases:", client.list_database_names())
except Exception as e:
    print("Connection failed:", e)
