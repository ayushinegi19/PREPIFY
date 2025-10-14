import os
import math
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import logging
from datetime import datetime
from bson import ObjectId

# Import the database object and authentication
from config import db
from routes.auth import token_required

# Import ML services
from services.text_extractor import extract_text
from services.summarization_service import generate_summary
from services.quiz_service import generate_quiz
from services.mindmap_service import generate_mindmap, generate_flowchart

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

uploads_bp = Blueprint('uploads', __name__)

# Define a folder to store uploaded files
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def format_file_size(size_bytes):
    if size_bytes == 0: return "0B"
    size_names = ["B", "KB", "MB", "GB"]
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_names[i]}"

@uploads_bp.route('/', methods=['POST'])
@token_required
def upload_file(current_user):
    logger.info("="*60)
    logger.info("FILE UPLOAD REQUEST")
    logger.info("="*60)
    
    if db is None:
        logger.error("Database connection is not available.")
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Only PDF, JPG, JPEG, PNG files are supported.'}), 400
        
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': 'File size exceeds 16MB limit'}), 400
            
        # Save the file to the server
        original_filename = file.filename
        secure_name = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{secure_filename(original_filename)}"
        file_path = os.path.join(UPLOAD_FOLDER, secure_name)
        file.save(file_path)
        logger.info(f"✅ File saved to: {file_path}")

        # Extract text from the file
        file_type = original_filename.rsplit('.', 1)[1].lower()
        extracted_text = ""
        extraction_error = None
        
        try:
            logger.info(f"🔍 Starting text extraction for {file_type} file...")
            extracted_text = extract_text(file_path, file_type)
            logger.info(f"✅ Extracted {len(extracted_text)} characters of text")
            
            # Check if extraction returned an error message
            if "OCR not available" in extracted_text or "Tesseract" in extracted_text or "Install" in extracted_text:
                extraction_error = extracted_text
                extracted_text = ""
                logger.warning(f"⚠️ OCR error detected: {extraction_error}")
            
            # Additional validation
            if len(extracted_text.strip()) < 50 and not extraction_error:
                logger.warning("⚠️ Very little text extracted")
                extraction_error = f"Only {len(extracted_text)} characters extracted. Document may be image-based or low quality."
                
        except Exception as e:
            logger.error(f"❌ Text extraction failed: {str(e)}")
            extraction_error = str(e)
            extracted_text = ""

        # Create a document to insert into MongoDB
        document_data = {
            'original_filename': original_filename,
            'saved_filename': secure_name,
            'file_path': file_path,
            'file_size': file_size,
            'file_type': file_type,
            'upload_date': datetime.utcnow(),
            'user_id': current_user['_id'],
            'extracted_text': extracted_text,
            'text_length': len(extracted_text),
            'extraction_status': 'success' if not extraction_error else 'warning',
            'extraction_error': extraction_error
        }

        # Insert into MongoDB 'documents' collection
        result = db.documents.insert_one(document_data)
        document_id = str(result.inserted_id)
        logger.info(f"✅ File metadata saved to MongoDB with ID: {document_id}")
        logger.info("="*60)

        response_data = {
            'success': True,
            'message': 'File uploaded and processed successfully!' if not extraction_error else 'File uploaded with warnings',
            'document_id': document_id,
            'file_info': {
                'original_filename': original_filename,
                'size_readable': format_file_size(file_size),
                'type': file_type.upper()
            },
            'upload_date': document_data['upload_date'].isoformat(),
            'text_extracted': len(extracted_text) > 0,
            'text_length': len(extracted_text),
            'extraction_warning': extraction_error,
            'available_actions': [
                {'id': 'summarize', 'label': 'Summarize', 'description': 'AI-powered summaries', 'icon': '📄', 'enabled': len(extracted_text) >= 100},
                {'id': 'create_quiz', 'label': 'Create Quiz', 'description': 'Generate practice questions', 'icon': '❓', 'enabled': len(extracted_text) >= 100},
                {'id': 'create_mindmap', 'label': 'Create Mind Map', 'description': 'Generate a visual mind map', 'icon': '🧠', 'enabled': len(extracted_text) >= 100},
                {'id': 'create_flowchart', 'label': 'Create Flowchart', 'description': 'Generate process flowcharts', 'icon': '📊', 'enabled': len(extracted_text) >= 100},
            ]
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"❌ Error in upload_file: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'An unexpected error occurred during upload: {str(e)}'}), 500

@uploads_bp.route('/user-notes', methods=['GET'])
@token_required
def get_user_notes(current_user):
    """Get all documents uploaded by the current user"""
    if db is None:
        logger.error("Database connection is not available.")
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        documents = list(db.documents.find(
            {'user_id': current_user['_id']},
            {'_id': 1, 'original_filename': 1, 'file_size': 1, 'file_type': 1, 'upload_date': 1, 'text_length': 1, 'extraction_status': 1}
        ).sort('upload_date', -1))

        for doc in documents:
            doc['_id'] = str(doc['_id'])

        return jsonify({
            'success': True,
            'documents': documents,
            'count': len(documents)
        }), 200

    except Exception as e:
        logger.error(f"Error fetching user notes: {str(e)}")
        return jsonify({'error': 'Failed to fetch user notes'}), 500

@uploads_bp.route('/<document_id>', methods=['DELETE'])
@token_required
def delete_document(current_user, document_id):
    """Delete a document uploaded by the current user"""
    if db is None:
        logger.error("Database connection is not available.")
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        document = db.documents.find_one({
            '_id': ObjectId(document_id),
            'user_id': current_user['_id']
        })

        if not document:
            return jsonify({'error': 'Document not found or access denied'}), 404

        if os.path.exists(document['file_path']):
            os.remove(document['file_path'])
            logger.info(f"Deleted file: {document['file_path']}")

        result = db.documents.delete_one({
            '_id': ObjectId(document_id),
            'user_id': current_user['_id']
        })

        if result.deleted_count == 1:
            return jsonify({'success': True, 'message': 'Document deleted successfully'}), 200
        else:
            return jsonify({'error': 'Failed to delete document'}), 500

    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@uploads_bp.route('/action/<document_id>/<action>', methods=['POST'])
@token_required
def perform_action(current_user, document_id, action):
    """Perform an action on a document"""
    logger.info("="*60)
    logger.info(f"ACTION REQUEST: {action} on document {document_id}")
    logger.info("="*60)
    
    if db is None:
        logger.error("Database connection is not available.")
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        # Verify the document belongs to the current user
        document = db.documents.find_one({
            '_id': ObjectId(document_id),
            'user_id': current_user['_id']
        })

        if not document:
            logger.error(f"❌ Document not found or access denied")
            return jsonify({'error': 'Document not found or access denied'}), 404

        # Get extracted text
        extracted_text = document.get('extracted_text', '')
        
        logger.info(f"📝 Document: {document.get('original_filename')}")
        logger.info(f"📝 Text length: {len(extracted_text)} characters")
        
        # Enhanced text validation
        if not extracted_text or len(extracted_text.strip()) < 50:
            logger.error(f"❌ Insufficient text: {len(extracted_text)} characters")
            
            # Check if there was an extraction error
            extraction_error = document.get('extraction_error', '')
            if extraction_error:
                error_message = f"Cannot process document due to text extraction issues:\n\n{extraction_error}"
            else:
                error_message = 'Insufficient text extracted from document. The document may be:\n• Image-based PDF without OCR\n• Encrypted or protected\n• Handwritten notes\n• Very low quality scan\n\nPlease:\n1. Try a text-based PDF\n2. Use a higher quality scan\n3. Ensure Tesseract OCR is installed'
            
            return jsonify({'error': error_message}), 400
        
        # Additional check: if text looks like an error message
        if any(phrase in extracted_text for phrase in ["OCR not available", "Tesseract", "Install", "pip install"]):
            logger.error(f"❌ OCR error detected in extracted text")
            return jsonify({'error': 'Text extraction failed. Please ensure Tesseract OCR is properly installed on the server.'}), 400

        # Perform the requested action
        if action == 'summarize':
            logger.info("📄 Calling summarization handler...")
            return handle_summarize(current_user, document, extracted_text)
        
        elif action == 'create_quiz':
            logger.info("📄 Calling quiz creation handler...")
            return handle_create_quiz(current_user, document, extracted_text)
        
        elif action == 'create_mindmap':
            logger.info("📄 Calling mindmap creation handler...")
            return handle_create_mindmap(current_user, document, extracted_text)
        
        elif action == 'create_flowchart':
            logger.info("📄 Calling flowchart creation handler...")
            return handle_create_flowchart(current_user, document, extracted_text)
        
        else:
            logger.error(f"❌ Unknown action: {action}")
            return jsonify({'error': f'Unknown action: {action}'}), 400

    except Exception as e:
        logger.error(f"❌ Error performing action: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

def handle_summarize(current_user, document, text):
    """Handle summarization action"""
    try:
        logger.info(f"🔍 Starting summarization...")
        
        # Get summary type from request or use default
        summary_type = request.json.get('summary_type', 'medium') if request.is_json else 'medium'
        logger.info(f"📊 Summary type: {summary_type}")
        
        # Generate summary
        logger.info(f"🤖 Generating summary with AI model...")
        summary_data = generate_summary(text, summary_type=summary_type)
        logger.info(f"✅ Summary generated: {len(summary_data['summary'])} characters")
        
        # Save to database
        summary_record = {
            'user_id': current_user['_id'],
            'document_id': str(document['_id']),
            'document_name': document['original_filename'],
            'summary': summary_data['summary'],
            'key_points': summary_data['key_points'],
            'summary_type': summary_data['summary_type'],
            'original_length': summary_data['original_length'],
            'summary_length': summary_data['summary_length'],
            'created_at': datetime.utcnow()
        }
        
        result = db.summaries.insert_one(summary_record)
        summary_id = str(result.inserted_id)
        
        logger.info(f"✅ Summary saved to database with ID: {summary_id}")
        logger.info("="*60)
        
        return jsonify({
            'success': True,
            'message': 'Summary generated successfully!',
            'summary_id': summary_id,
            'data': {
                'summary': summary_data['summary'],
                'key_points': summary_data['key_points'],
                'summary_type': summary_data['summary_type'],
                'stats': {
                    'original_length': summary_data['original_length'],
                    'summary_length': summary_data['summary_length'],
                    'reduction': round((1 - summary_data['summary_length'] / summary_data['original_length']) * 100, 1)
                }
            }
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Summarization error: {str(e)}")
        import traceback
        traceback.print_exc()
        logger.info("="*60)
        return jsonify({'error': f'Failed to generate summary: {str(e)}'}), 500

def handle_create_quiz(current_user, document, text):
    """Handle quiz creation action"""
    try:
        logger.info(f"🎯 Starting quiz creation...")
        
        # Get parameters from request or use defaults
        num_questions = request.json.get('num_questions', 10) if request.is_json else 10
        difficulty = request.json.get('difficulty', 'medium') if request.is_json else 'medium'
        
        logger.info(f"📊 Quiz parameters: {num_questions} questions, {difficulty} difficulty")
        
        # Generate quiz
        logger.info(f"🤖 Generating quiz with AI model...")
        quiz_data = generate_quiz(text, num_questions=num_questions, difficulty=difficulty)
        logger.info(f"✅ Quiz generated: {quiz_data['total_questions']} questions")
        
        # Save to database
        quiz_record = {
            'user_id': current_user['_id'],
            'document_id': str(document['_id']),
            'document_name': document['original_filename'],
            'questions': quiz_data['questions'],
            'total_questions': quiz_data['total_questions'],
            'difficulty': quiz_data['difficulty'],
            'time_limit': quiz_data['time_limit'],
            'created_at': datetime.utcnow(),
            'status': 'not_started',
            'attempts': [],
            'best_score': None
        }
        
        result = db.quizzes.insert_one(quiz_record)
        quiz_id = str(result.inserted_id)
        
        logger.info(f"✅ Quiz saved to database with ID: {quiz_id}")
        logger.info("="*60)
        
        return jsonify({
            'success': True,
            'message': 'Quiz generated successfully!',
            'quiz_id': quiz_id,
            'data': {
                'total_questions': quiz_data['total_questions'],
                'difficulty': quiz_data['difficulty'],
                'time_limit': quiz_data['time_limit']
            }
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Quiz generation error: {str(e)}")
        import traceback
        traceback.print_exc()
        logger.info("="*60)
        return jsonify({'error': f'Failed to generate quiz: {str(e)}'}), 500

def handle_create_mindmap(current_user, document, text):
    """Handle mind map creation action"""
    try:
        logger.info(f"🧠 Starting mindmap creation...")
        
        # Generate mind map
        title = document['original_filename'].rsplit('.', 1)[0]
        logger.info(f"🤖 Generating mindmap with AI model...")
        mindmap_data = generate_mindmap(text, title=title)
        logger.info(f"✅ Mindmap generated: {len(mindmap_data['nodes'])} nodes, {len(mindmap_data['edges'])} edges")
        
        # Save to database
        mindmap_record = {
            'user_id': current_user['_id'],
            'document_id': str(document['_id']),
            'document_name': document['original_filename'],
            'title': mindmap_data['title'],
            'nodes': mindmap_data['nodes'],
            'edges': mindmap_data['edges'],
            'type': 'mindmap',
            'created_at': datetime.utcnow()
        }
        
        result = db.mindmaps.insert_one(mindmap_record)
        mindmap_id = str(result.inserted_id)
        
        logger.info(f"✅ Mindmap saved to database with ID: {mindmap_id}")
        logger.info("="*60)
        
        return jsonify({
            'success': True,
            'message': 'Mind map generated successfully!',
            'mindmap_id': mindmap_id,
            'data': mindmap_data
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Mind map generation error: {str(e)}")
        import traceback
        traceback.print_exc()
        logger.info("="*60)
        return jsonify({'error': f'Failed to generate mind map: {str(e)}'}), 500

def handle_create_flowchart(current_user, document, text):
    """Handle flowchart creation action"""
    try:
        logger.info(f"📊 Starting flowchart creation...")
        
        # Generate flowchart
        title = document['original_filename'].rsplit('.', 1)[0]
        logger.info(f"🤖 Generating flowchart with AI model...")
        flowchart_data = generate_flowchart(text, title=title)
        logger.info(f"✅ Flowchart generated: {len(flowchart_data['nodes'])} nodes, {len(flowchart_data['edges'])} edges")
        
        # Save to database (using mindmaps collection with type='flowchart')
        flowchart_record = {
            'user_id': current_user['_id'],
            'document_id': str(document['_id']),
            'document_name': document['original_filename'],
            'title': flowchart_data['title'],
            'nodes': flowchart_data['nodes'],
            'edges': flowchart_data['edges'],
            'type': 'flowchart',
            'created_at': datetime.utcnow()
        }
        
        result = db.mindmaps.insert_one(flowchart_record)
        flowchart_id = str(result.inserted_id)
        
        logger.info(f"✅ Flowchart saved to database with ID: {flowchart_id}")
        logger.info("="*60)
        
        return jsonify({
            'success': True,
            'message': 'Flowchart generated successfully!',
            'mindmap_id': flowchart_id,
            'data': flowchart_data
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Flowchart generation error: {str(e)}")
        import traceback
        traceback.print_exc()
        logger.info("="*60)
        return jsonify({'error': f'Failed to generate flowchart: {str(e)}'}), 500

# ==================== FETCH ROUTES ====================

@uploads_bp.route('/summaries', methods=['GET'])
@token_required
def get_summaries(current_user):
    """Get all summaries for the current user"""
    try:
        summaries = list(db.summaries.find(
            {'user_id': current_user['_id']}
        ).sort('created_at', -1))
        
        for summary in summaries:
            summary['_id'] = str(summary['_id'])
        
        logger.info(f"✅ Fetched {len(summaries)} summaries for user")
        return jsonify({
            'success': True,
            'summaries': summaries
        }), 200
    except Exception as e:
        logger.error(f"Error fetching summaries: {str(e)}")
        return jsonify({'error': 'Failed to fetch summaries'}), 500

@uploads_bp.route('/summary/<summary_id>', methods=['GET'])
@token_required
def get_summary(current_user, summary_id):
    """Get a specific summary"""
    try:
        logger.info(f"📖 Fetching summary: {summary_id}")
        summary = db.summaries.find_one({
            '_id': ObjectId(summary_id),
            'user_id': current_user['_id']
        })
        
        if not summary:
            logger.error(f"❌ Summary not found: {summary_id}")
            return jsonify({'error': 'Summary not found'}), 404
        
        summary['_id'] = str(summary['_id'])
        logger.info(f"✅ Summary found and returned")
        
        return jsonify({
            'success': True,
            'summary': summary
        }), 200
    except Exception as e:
        logger.error(f"Error fetching summary: {str(e)}")
        return jsonify({'error': 'Failed to fetch summary'}), 500

@uploads_bp.route('/quizzes', methods=['GET'])
@token_required
def get_quizzes(current_user):
    """Get all quizzes for the current user"""
    try:
        quizzes = list(db.quizzes.find(
            {'user_id': current_user['_id']}
        ).sort('created_at', -1))
        
        for quiz in quizzes:
            quiz['_id'] = str(quiz['_id'])
        
        logger.info(f"✅ Fetched {len(quizzes)} quizzes for user")
        return jsonify({
            'success': True,
            'quizzes': quizzes
        }), 200
    except Exception as e:
        logger.error(f"Error fetching quizzes: {str(e)}")
        return jsonify({'error': 'Failed to fetch quizzes'}), 500

@uploads_bp.route('/quiz/<quiz_id>', methods=['GET'])
@token_required
def get_quiz(current_user, quiz_id):
    """Get a specific quiz"""
    try:
        logger.info(f"🎯 Fetching quiz: {quiz_id}")
        quiz = db.quizzes.find_one({
            '_id': ObjectId(quiz_id),
            'user_id': current_user['_id']
        })
        
        if not quiz:
            logger.error(f"❌ Quiz not found: {quiz_id}")
            return jsonify({'error': 'Quiz not found'}), 404
        
        quiz['_id'] = str(quiz['_id'])
        logger.info(f"✅ Quiz found with {len(quiz.get('questions', []))} questions")
        
        return jsonify({
            'success': True,
            'quiz': quiz
        }), 200
    except Exception as e:
        logger.error(f"Error fetching quiz: {str(e)}")
        return jsonify({'error': 'Failed to fetch quiz'}), 500

@uploads_bp.route('/quiz/<quiz_id>/submit', methods=['POST'])
@token_required
def submit_quiz(current_user, quiz_id):
    """Submit quiz answers and calculate score"""
    try:
        logger.info(f"📝 Submitting quiz: {quiz_id}")
        data = request.get_json()
        user_answers = data.get('answers', [])
        
        quiz = db.quizzes.find_one({
            '_id': ObjectId(quiz_id),
            'user_id': current_user['_id']
        })
        
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404
        
        # Calculate score
        correct_count = 0
        results = []
        
        for i, question in enumerate(quiz['questions']):
            user_answer = user_answers[i] if i < len(user_answers) else None
            correct_answer = question['correct_answer']
            is_correct = user_answer == correct_answer
            
            if is_correct:
                correct_count += 1
            
            results.append({
                'question_index': i,
                'user_answer': user_answer,
                'correct_answer': correct_answer,
                'is_correct': is_correct
            })
        
        score = round((correct_count / len(quiz['questions'])) * 100)
        logger.info(f"✅ Quiz scored: {score}% ({correct_count}/{len(quiz['questions'])})")
        
        # Save attempt
        attempt = {
            'date': datetime.utcnow(),
            'score': score,
            'answers': user_answers,
            'results': results
        }
        
        # Update quiz with attempt and best score
        best_score = quiz.get('best_score')
        if best_score is None or score > best_score:
            best_score = score
        
        db.quizzes.update_one(
            {'_id': ObjectId(quiz_id)},
            {
                '$push': {'attempts': attempt},
                '$set': {'best_score': best_score}
            }
        )
        
        return jsonify({
            'success': True,
            'score': score,
            'correct_count': correct_count,
            'total_questions': len(quiz['questions']),
            'results': results
        }), 200
        
    except Exception as e:
        logger.error(f"Error submitting quiz: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to submit quiz'}), 500

@uploads_bp.route('/mindmaps', methods=['GET'])
@token_required
def get_mindmaps(current_user):
    """Get all mindmaps and flowcharts for the current user"""
    try:
        mindmaps = list(db.mindmaps.find(
            {'user_id': current_user['_id']}
        ).sort('created_at', -1))
        
        for item in mindmaps:
            item['_id'] = str(item['_id'])
        
        logger.info(f"✅ Fetched {len(mindmaps)} mindmaps/flowcharts for user")
        return jsonify({
            'success': True,
            'mindmaps': mindmaps
        }), 200
    except Exception as e:
        logger.error(f"Error fetching mindmaps: {str(e)}")
        return jsonify({'error': 'Failed to fetch mindmaps'}), 500

@uploads_bp.route('/mindmap/<mindmap_id>', methods=['GET'])
@token_required
def get_mindmap(current_user, mindmap_id):
    """Get a specific mindmap or flowchart"""
    try:
        logger.info(f"🧠 Fetching mindmap: {mindmap_id}")
        mindmap = db.mindmaps.find_one({
            '_id': ObjectId(mindmap_id),
            'user_id': current_user['_id']
        })
        
        if not mindmap:
            logger.error(f"❌ Mindmap not found: {mindmap_id}")
            return jsonify({'error': 'Mindmap not found'}), 404
        
        mindmap['_id'] = str(mindmap['_id'])
        logger.info(f"✅ Mindmap found: {mindmap.get('type', 'unknown')} with {len(mindmap.get('nodes', []))} nodes")
        
        return jsonify({
            'success': True,
            'mindmap': mindmap
        }), 200
    except Exception as e:
        logger.error(f"Error fetching mindmap: {str(e)}")
        return jsonify({'error': 'Failed to fetch mindmap'}), 500

# Delete routes for content
@uploads_bp.route('/summary/<summary_id>', methods=['DELETE'])
@token_required
def delete_summary(current_user, summary_id):
    """Delete a summary"""
    try:
        result = db.summaries.delete_one({
            '_id': ObjectId(summary_id),
            'user_id': current_user['_id']
        })
        
        if result.deleted_count == 1:
            logger.info(f"✅ Summary deleted: {summary_id}")
            return jsonify({'success': True, 'message': 'Summary deleted'}), 200
        return jsonify({'error': 'Summary not found'}), 404
    except Exception as e:
        logger.error(f"Error deleting summary: {str(e)}")
        return jsonify({'error': 'Failed to delete summary'}), 500

@uploads_bp.route('/quiz/<quiz_id>', methods=['DELETE'])
@token_required
def delete_quiz(current_user, quiz_id):
    """Delete a quiz"""
    try:
        result = db.quizzes.delete_one({
            '_id': ObjectId(quiz_id),
            'user_id': current_user['_id']
        })
        
        if result.deleted_count == 1:
            logger.info(f"✅ Quiz deleted: {quiz_id}")
            return jsonify({'success': True, 'message': 'Quiz deleted'}), 200
        return jsonify({'error': 'Quiz not found'}), 404
    except Exception as e:
        logger.error(f"Error deleting quiz: {str(e)}")
        return jsonify({'error': 'Failed to delete quiz'}), 500

@uploads_bp.route('/mindmap/<mindmap_id>', methods=['DELETE'])
@token_required
def delete_mindmap(current_user, mindmap_id):
    """Delete a mindmap or flowchart"""
    try:
        result = db.mindmaps.delete_one({
            '_id': ObjectId(mindmap_id),
            'user_id': current_user['_id']
        })
        
        if result.deleted_count == 1:
            logger.info(f"✅ Mindmap deleted: {mindmap_id}")
            return jsonify({'success': True, 'message': 'Mindmap deleted'}), 200
        return jsonify({'error': 'Mindmap not found'}), 404
    except Exception as e:
        logger.error(f"Error deleting mindmap: {str(e)}")
        return jsonify({'error': 'Failed to delete mindmap'}), 500