# routes/profile.py - COMPLETE FIXED VERSION
from flask import Blueprint, request, jsonify
from flask_bcrypt import Bcrypt
from config import db
from routes.auth import token_required
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)
bcrypt = Bcrypt()

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/', methods=['GET'])
@token_required
def get_profile(current_user):
    """Get current user profile"""
    try:
        return jsonify({
            'success': True,
            'user': current_user
        }), 200
    except Exception as e:
        logger.error(f"Error fetching profile: {str(e)}")
        return jsonify({'error': 'Failed to fetch profile'}), 500

@profile_bp.route('/update', methods=['PUT'])
@token_required
def update_profile(current_user):
    """Update user profile"""
    try:
        data = request.get_json()
        
        # Fields that can be updated
        allowed_fields = ['username', 'degree', 'sem', 'year', 'college']
        update_data = {}
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        # Convert string _id back to ObjectId for MongoDB query
        from bson import ObjectId
        user_object_id = ObjectId(current_user['_id'])
        
        # Update user in database
        result = db.users.update_one(
            {'_id': user_object_id},
            {'$set': update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'No changes made'}), 400
        
        # Get updated user
        updated_user = db.users.find_one({'_id': user_object_id})
        updated_user['_id'] = str(updated_user['_id'])
        if 'password' in updated_user:
            del updated_user['password']
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': updated_user
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating profile: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to update profile: {str(e)}'}), 500

@profile_bp.route('/change-password', methods=['PUT'])
@token_required
def change_password(current_user):
    """Change user password"""
    try:
        data = request.get_json()
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Both current and new passwords are required'}), 400
        
        # Convert string _id back to ObjectId
        from bson import ObjectId
        user_object_id = ObjectId(current_user['_id'])
        
        # Get user with password
        user = db.users.find_one({'_id': user_object_id})
        
        # Verify current password
        if not bcrypt.check_password_hash(user['password'], current_password):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Hash new password
        hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')
        
        # Update password
        db.users.update_one(
            {'_id': user_object_id},
            {'$set': {'password': hashed_password}}
        )
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error changing password: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to change password: {str(e)}'}), 500