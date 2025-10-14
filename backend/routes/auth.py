from flask import Blueprint, request, jsonify, current_app
from flask_bcrypt import Bcrypt
from config import db
import jwt
from functools import wraps
import datetime

auth_bp = Blueprint('auth_bp', __name__)
bcrypt = Bcrypt()

# This ensures bcrypt is initialized with the app context
@auth_bp.record_once
def on_load(state):
    bcrypt.init_app(state.app)

users_collection = db.users

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Debug logging
        print("\n" + "="*50)
        print("TOKEN VERIFICATION DEBUG")
        print("="*50)
        print(f"Request URL: {request.url}")
        print(f"Request Method: {request.method}")
        print(f"Request Headers:")
        for key, value in request.headers:
            if key.lower() == 'authorization':
                print(f"  {key}: {value[:50]}..." if len(value) > 50 else f"  {key}: {value}")
            else:
                print(f"  {key}: {value}")
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            print(f"\nAuthorization header found: {auth_header[:50]}...")
            
            try:
                # Split "Bearer <token>"
                parts = auth_header.split(" ")
                if len(parts) != 2:
                    print(f"ERROR: Authorization header has {len(parts)} parts, expected 2")
                    return jsonify({'message': 'Token format invalid! Expected: Bearer <token>'}), 401
                
                if parts[0] != 'Bearer':
                    print(f"ERROR: Authorization scheme is '{parts[0]}', expected 'Bearer'")
                    return jsonify({'message': 'Token format invalid! Expected: Bearer <token>'}), 401
                
                token = parts[1]
                print(f"Token extracted successfully: {token[:20]}...")
                
            except Exception as e:
                print(f"ERROR extracting token: {str(e)}")
                return jsonify({'message': 'Token format invalid!'}), 401
        else:
            print("ERROR: No Authorization header found in request")
            print(f"Available headers: {list(request.headers.keys())}")

        if not token:
            print("ERROR: Token is missing after extraction attempt")
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            print("\nAttempting to decode token...")
            secret_key = current_app.config['SECRET_KEY']
            print(f"Using secret key: {secret_key[:10]}...")
            
            data = jwt.decode(token, secret_key, algorithms=["HS256"])
            print(f"Token decoded successfully!")
            print(f"Token payload: {data}")
            
            email = data.get('email')
            if not email:
                print("ERROR: No email in token payload")
                return jsonify({'message': 'Invalid token payload!'}), 401
            
            print(f"Looking up user with email: {email}")
            current_user = users_collection.find_one({'email': email})
            
            if not current_user:
                print(f"ERROR: No user found with email: {email}")
                return jsonify({'message': 'User not found!'}), 401
            
            print(f"User found: {current_user.get('username')}")
            
            # Convert ObjectId to string and remove password
            current_user['_id'] = str(current_user['_id'])
            if 'password' in current_user:
                del current_user['password']
            
            print("Token verification successful!")
            print("="*50 + "\n")

        except jwt.ExpiredSignatureError:
            print("ERROR: Token has expired")
            print("="*50 + "\n")
            return jsonify({'message': 'Token has expired!'}), 401
            
        except jwt.InvalidTokenError as e:
            print(f"ERROR: Invalid token - {str(e)}")
            print("="*50 + "\n")
            return jsonify({'message': f'Token is invalid: {str(e)}'}), 401
            
        except Exception as e:
            print(f"ERROR: Unexpected error during token verification - {str(e)}")
            print(f"Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            print("="*50 + "\n")
            return jsonify({'message': f'Token verification failed: {str(e)}'}), 401

        return f(current_user, *args, **kwargs)
    
    return decorated


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    degree = data.get('degree')
    sem = data.get('sem')
    year = data.get('year')
    college = data.get('college')

    if not all([username, email, password]):
        return jsonify({'message': 'Missing required fields'}), 400

    if users_collection.find_one({'email': email}):
        return jsonify({'message': 'An account with this email already exists'}), 409

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    
    user_data = {
        'username': username, 
        'email': email, 
        'password': hashed_password,
        'degree': degree,
        'sem': sem,
        'year': year,
        'college': college,
        'created_at': datetime.datetime.utcnow()
    }
    
    users_collection.insert_one(user_data)
    return jsonify({'message': 'User registered successfully!'}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'message': 'Missing email or password'}), 400

    user = users_collection.find_one({'email': email})

    if not user or not bcrypt.check_password_hash(user['password'], password):
        return jsonify({'message': 'Invalid credentials'}), 401

    # Create token
    token = jwt.encode({
        'email': user['email'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, current_app.config['SECRET_KEY'], algorithm="HS256")

    print(f"\n=== LOGIN SUCCESS ===")
    print(f"User: {user['email']}")
    print(f"Token generated: {token[:50]}...")
    print("="*20 + "\n")

    user_data = {
        'username': user['username'], 
        'email': user['email'],
        'degree': user.get('degree'),
        'sem': user.get('sem'),
        'year': user.get('year'),
        'college': user.get('college'),
        'created_at': user.get('created_at')
    }
    
    return jsonify({'message': 'Login successful!', 'token': token, 'user': user_data}), 200


@auth_bp.route('/verify-token', methods=['POST'])
@token_required
def verify_token(current_user):
    return jsonify({'message': 'Token is valid', 'user': current_user}), 200