# services/summarization_service.py
from transformers import pipeline
import logging

logger = logging.getLogger(__name__)

# Initialize the summarization model
try:
    summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")
    logger.info("Summarization model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load summarization model: {str(e)}")
    summarizer = None

def generate_summary(text, summary_type='medium'):
    """
    Generate a summary from the given text
    
    Args:
        text (str): The input text to summarize
        summary_type (str): Type of summary - 'short', 'medium', or 'long'
    
    Returns:
        dict: Summary data including the summary text and metadata
    """
    if not summarizer:
        raise Exception("Summarization model not available")
    
    if not text or len(text.strip()) < 100:
        raise ValueError("Text is too short to summarize")
    
    try:
        # Clean the text
        text = text.strip()
        
        # Define summary lengths based on type
        length_configs = {
            'short': {'max_length': 130, 'min_length': 30},
            'medium': {'max_length': 250, 'min_length': 80},
            'long': {'max_length': 500, 'min_length': 150}
        }
        
        config = length_configs.get(summary_type, length_configs['medium'])
        
        # Split text into chunks if it's too long (max 1024 tokens for the model)
        max_chunk_length = 1024
        chunks = []
        words = text.split()
        
        current_chunk = []
        current_length = 0
        
        for word in words:
            current_length += len(word) + 1  # +1 for space
            if current_length > max_chunk_length:
                chunks.append(' '.join(current_chunk))
                current_chunk = [word]
                current_length = len(word)
            else:
                current_chunk.append(word)
        
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        # Summarize each chunk
        summaries = []
        for chunk in chunks:
            if len(chunk.strip()) < 100:
                continue
                
            summary = summarizer(
                chunk,
                max_length=config['max_length'],
                min_length=config['min_length'],
                do_sample=False
            )
            summaries.append(summary[0]['summary_text'])
        
        # Combine summaries
        final_summary = ' '.join(summaries)
        
        # Extract key points (simple sentence splitting)
        sentences = [s.strip() + '.' for s in final_summary.split('.') if s.strip()]
        key_points = sentences[:5]  # Top 5 sentences as key points
        
        return {
            'summary': final_summary,
            'key_points': key_points,
            'summary_type': summary_type,
            'original_length': len(text),
            'summary_length': len(final_summary)
        }
        
    except Exception as e:
        logger.error(f"Summarization error: {str(e)}")
        raise Exception(f"Failed to generate summary: {str(e)}")

def get_summary_statistics(text, summary):
    """Calculate summary statistics"""
    return {
        'original_words': len(text.split()),
        'summary_words': len(summary.split()),
        'compression_ratio': round(len(summary) / len(text) * 100, 1)
    }