# services/quiz_service.py - Fixed Version
from transformers import pipeline
import random
import re
import logging

logger = logging.getLogger(__name__)

# Initialize the question generation model
try:
    qg_pipeline = pipeline("text2text-generation", model="valhalla/t5-small-qg-hl")
    logger.info("Quiz generation model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load quiz generation model: {str(e)}")
    qg_pipeline = None

def generate_quiz(text, num_questions=10, difficulty='medium'):
    """
    Generate quiz questions from text - FIXED to ensure 10 questions
    
    Args:
        text (str): The input text to generate questions from
        num_questions (int): Number of questions to generate (default: 10)
        difficulty (str): Difficulty level - 'easy', 'medium', or 'hard'
    
    Returns:
        dict: Quiz data including questions and metadata
    """
    if not qg_pipeline:
        raise Exception("Quiz generation model not available")
    
    if not text or len(text.strip()) < 100:
        raise ValueError("Text is too short to generate quiz")
    
    try:
        # Clean and prepare text
        text = text.strip()
        
        # Split into sentences
        sentences = [s.strip() + '.' for s in text.split('.') if len(s.strip()) > 20]
        
        if len(sentences) < 5:
            raise ValueError("Not enough content to generate quiz questions")
        
        # Ensure we have enough sentences
        num_sentences_needed = max(num_questions * 3, len(sentences))
        
        questions = []
        attempted_sentences = []
        
        # Try to generate questions from sentences
        random.shuffle(sentences)  # Shuffle for variety
        
        for sentence in sentences:
            if len(questions) >= num_questions:
                break
            
            # Skip if sentence too short or already attempted
            if len(sentence.strip()) < 30 or sentence in attempted_sentences:
                continue
                
            attempted_sentences.append(sentence)
            
            try:
                # Generate question using T5 model
                input_text = f"generate question: {sentence}"
                result = qg_pipeline(input_text, max_length=64, num_return_sequences=1)
                
                if result and len(result) > 0:
                    question_text = result[0]['generated_text'].strip()
                    
                    # Clean up question
                    if not question_text.endswith('?'):
                        question_text += '?'
                    
                    # Generate answer from the sentence
                    answer = extract_answer(sentence)
                    
                    # Generate distractors (wrong options)
                    options = generate_options(answer, sentence, text)
                    
                    if len(options) == 4 and answer in options:
                        # Find correct answer index
                        correct_index = options.index(answer)
                        
                        questions.append({
                            'question': question_text,
                            'options': options,
                            'correct_answer': correct_index,
                            'explanation': sentence
                        })
                        
                        logger.info(f"Generated question {len(questions)}/{num_questions}")
                        
            except Exception as e:
                logger.warning(f"Failed to generate question from sentence: {str(e)}")
                continue
        
        # If we still don't have enough questions, use fallback method
        if len(questions) < num_questions:
            logger.info(f"Using fallback method. Current questions: {len(questions)}")
            fallback_questions = generate_keyword_questions(text, num_questions - len(questions))
            questions.extend(fallback_questions)
        
        # If still not enough, generate simple MCQs
        if len(questions) < num_questions:
            logger.info(f"Generating simple MCQs. Current questions: {len(questions)}")
            simple_questions = generate_simple_mcqs(text, num_questions - len(questions))
            questions.extend(simple_questions)
        
        # Ensure we have exactly the requested number of questions
        questions = questions[:num_questions]
        
        if len(questions) == 0:
            raise Exception("Failed to generate any questions from the text")
        
        # Calculate time limit (2 minutes per question)
        time_limit = len(questions) * 120
        
        logger.info(f"Successfully generated {len(questions)} questions")
        
        return {
            'questions': questions,
            'total_questions': len(questions),
            'difficulty': difficulty,
            'time_limit': time_limit
        }
        
    except Exception as e:
        logger.error(f"Quiz generation error: {str(e)}")
        raise Exception(f"Failed to generate quiz: {str(e)}")

def extract_answer(sentence):
    """Extract a potential answer from a sentence"""
    # Remove common words
    words = sentence.replace('.', '').replace(',', '').split()
    
    # Filter out common words
    common_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 
                    'of', 'with', 'by', 'from', 'as', 'this', 'that', 'these', 'those', 'it'}
    
    important_words = [w for w in words if w.lower() not in common_words and len(w) > 3]
    
    if important_words:
        # Prefer capitalized words (proper nouns) or longer words
        capitalized = [w for w in important_words if w[0].isupper()]
        if capitalized:
            return random.choice(capitalized)
        return random.choice(important_words)
    
    # Fallback: return a phrase
    if len(words) > 3:
        start = len(words) // 3
        return ' '.join(words[start:start + 2])
    
    return words[0] if words else "answer"

def generate_options(correct_answer, sentence, full_text):
    """Generate multiple choice options including the correct answer"""
    options = [correct_answer]
    
    # Extract potential distractors from full text
    words = full_text.replace('.', ' ').replace(',', ' ').split()
    
    # Get words of similar length to correct answer
    answer_word_count = len(correct_answer.split())
    
    potential_distractors = []
    for i in range(len(words) - answer_word_count + 1):
        phrase = ' '.join(words[i:i + answer_word_count])
        
        # Filter out the correct answer and very short phrases
        if (phrase.lower() != correct_answer.lower() and 
            len(phrase) > 3 and 
            phrase not in sentence):
            potential_distractors.append(phrase)
    
    # Remove duplicates
    potential_distractors = list(set(potential_distractors))
    
    # Add distractors
    if len(potential_distractors) >= 3:
        selected = random.sample(potential_distractors, 3)
        options.extend(selected)
    else:
        # Generate generic distractors
        generic = [
            f"Not {correct_answer}",
            f"All of the above",
            f"None of the above"
        ]
        options.extend(generic[:3 - len(potential_distractors)])
    
    # Ensure exactly 4 options
    options = options[:4]
    
    # Shuffle options
    random.shuffle(options)
    
    return options

def generate_keyword_questions(text, num_questions):
    """Generate fill-in-the-blank style questions as fallback"""
    questions = []
    sentences = [s.strip() + '.' for s in text.split('.') if len(s.strip()) > 30]
    
    if not sentences:
        return questions
    
    random.shuffle(sentences)
    
    for sentence in sentences[:num_questions * 2]:
        if len(questions) >= num_questions:
            break
            
        words = sentence.replace('.', '').split()
        
        if len(words) > 5:
            # Find a good word to blank out (not at start/end, not too common)
            common_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at'}
            
            candidate_indices = [i for i, w in enumerate(words) 
                               if i > 0 and i < len(words) - 1 
                               and w.lower() not in common_words 
                               and len(w) > 3]
            
            if candidate_indices:
                blank_index = random.choice(candidate_indices)
                answer = words[blank_index]
                
                # Create question with blank
                question_words = words.copy()
                question_words[blank_index] = "_____"
                question = ' '.join(question_words) + '?'
                
                # Generate options
                options = generate_options(answer, sentence, text)
                
                if len(options) == 4 and answer in options:
                    correct_index = options.index(answer)
                    
                    questions.append({
                        'question': question,
                        'options': options,
                        'correct_answer': correct_index,
                        'explanation': sentence
                    })
    
    return questions

def generate_simple_mcqs(text, num_questions):
    """Generate simple multiple choice questions as last resort"""
    questions = []
    
    # Split text into chunks
    chunks = [chunk.strip() for chunk in text.split('\n\n') if len(chunk.strip()) > 50]
    
    if not chunks:
        chunks = [text[i:i+500] for i in range(0, len(text), 500)]
    
    for i, chunk in enumerate(chunks[:num_questions]):
        if len(questions) >= num_questions:
            break
        
        # Extract key information
        sentences = [s.strip() for s in chunk.split('.') if len(s.strip()) > 20]
        
        if sentences:
            sentence = sentences[0]
            answer = extract_answer(sentence)
            
            # Create a "What is mentioned about..." question
            question = f"According to the text, what is mentioned about {answer.lower()}?"
            
            # Generate options
            options = generate_options(answer, sentence, text)
            
            if len(options) == 4 and answer in options:
                correct_index = options.index(answer)
                
                questions.append({
                    'question': question,
                    'options': options,
                    'correct_answer': correct_index,
                    'explanation': sentence
                })
    
    return questions

def generate_quiz_from_summary(summary_text, num_questions=10, difficulty='medium'):
    """Generate quiz from a summary"""
    return generate_quiz(summary_text, num_questions, difficulty)