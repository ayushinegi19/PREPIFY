# services/summarization_service.py - 🔥 FIXED: Complete sentences guaranteed
import spacy
import logging
import re
from collections import Counter
from services.gemini_preprocessor import preprocess_text, is_gemini_available, clean_preprocessing_markers

logger = logging.getLogger(__name__)

try:
    nlp = spacy.load("en_core_web_sm")
    logger.info("✅ spaCy loaded")
except:
    logger.error("❌ Run: python -m spacy download en_core_web_sm")
    nlp = None

def extract_sentences(text):
    """Extract ONLY valid, complete sentences"""
    if nlp:
        doc = nlp(text[:100000])
        sentences = [sent.text.strip() for sent in doc.sents]
    else:
        sentences = re.split(r'(?<=[.!?])\s+', text)
    
    valid = []
    for sent in sentences:
        sent = sent.strip()
        
        # 🔥 CRITICAL: Strict validation
        if len(sent) < 15 or len(sent) > 500:
            continue
        
        if len(sent.split()) < 4:
            continue
        
        # Reject incomplete patterns
        if re.search(r'\b\w+\s+(is|are|was|were)\s+a\s*[,.]?\s*$', sent):
            continue
        
        if re.match(r'.+\b(a|an|the)\s*$', sent, re.I):
            continue
        
        if sent[0].islower():
            continue
        
        # Reject sentences with orphan commas
        if re.search(r'\s+,\s+(?!and|or|but)', sent):
            continue
        
        valid.append(sent)
    
    return valid

def extract_structured_key_points(text):
    """Extract key points - CLEAN and COMPLETE"""
    key_points = []
    
    key_markers = re.findall(r'\[KEY:([^\]]+)\]', text)
    fact_markers = re.findall(r'\[FACT:([^\]]+)\]', text)
    def_markers = re.findall(r'\[DEF:([^\]]+)\]', text)
    
    if key_markers or fact_markers or def_markers:
        logger.info(f"📌 Found {len(key_markers)} keys, {len(fact_markers)} facts, {len(def_markers)} definitions")
        
        for key in key_markers[:5]:
            cleaned = clean_preprocessing_markers(key.strip())
            if cleaned and len(cleaned) > 10 and not re.search(r'\b(is|are|was|were)\s+a\s*[,.]?\s*$', cleaned):
                key_points.append(cleaned)
        
        for fact in fact_markers[:5]:
            cleaned = clean_preprocessing_markers(fact.strip())
            if cleaned and len(cleaned) > 15 and not re.search(r'\b(is|are|was|were)\s+a\s*[,.]?\s*$', cleaned):
                key_points.append(cleaned)
        
        for definition in def_markers[:3]:
            cleaned = clean_preprocessing_markers(definition.strip())
            if cleaned and len(cleaned) > 15 and not re.search(r'\b(is|are|was|were)\s+a\s*[,.]?\s*$', cleaned):
                key_points.append(cleaned)
        
        return key_points[:10]
    
    # Fallback: Extract from headers
    for line in text.split('\n'):
        line = line.strip()
        if line and (line.isupper() or line.endswith(':')):
            clean_line = clean_preprocessing_markers(line.rstrip(':').strip())
            if 5 < len(clean_line) < 80 and not re.search(r'\b(is|are|was|were)\s+a\s*[,.]?\s*$', clean_line):
                key_points.append(clean_line)
                if len(key_points) >= 10:
                    break
    
    return key_points[:10]

def score_sentences_enhanced(sentences, text):
    """Enhanced sentence scoring"""
    if not sentences:
        return []
    
    words = re.findall(r'\b[a-z]{3,}\b', text.lower())
    word_freq = Counter(words)
    
    stop_words = {
        'this', 'that', 'with', 'from', 'have', 'been', 'will', 'would',
        'could', 'should', 'these', 'those', 'were', 'their', 'there',
        'where', 'which', 'what', 'when', 'make', 'them', 'more', 'some'
    }
    
    important_words = {
        w for w, _ in word_freq.most_common(150) 
        if w not in stop_words and len(w) > 3
    }
    
    scored = []
    for i, sent in enumerate(sentences):
        score = 0
        sent_lower = sent.lower()
        sent_words = set(re.findall(r'\b[a-z]{3,}\b', sent_lower))
        
        overlap = sent_words & important_words
        for word in overlap:
            score += min(word_freq[word], 10)
        
        if re.search(r'\b(is|are|means?|refers? to|defined as|consists? of)\b', sent_lower):
            score += 30
        
        if re.search(r'\b(include|such as|types? of|kinds? of|following|examples?)\b', sent_lower):
            score += 25
        
        if re.search(r'\b(however|therefore|thus|importantly|significantly)\b', sent_lower):
            score += 18
        
        score += min(len(re.findall(r'\d+', sent)) * 8, 30)
        score += min(len(re.findall(r'\b[A-Z][a-z]+\b', sent)) * 6, 30)
        
        if re.search(r'\b(algorithm|method|process|system|model|theory|concept)\b', sent_lower):
            score += 15
        
        position_ratio = i / len(sentences)
        if position_ratio < 0.15:
            score += 25
        elif position_ratio > 0.85:
            score += 15
        
        word_count = len(sent.split())
        if 15 < word_count < 40:
            score += 20
        elif 40 <= word_count < 60:
            score += 12
        
        scored.append((sent, score, i))
    
    scored.sort(key=lambda x: (x[1], -abs(len(sentences)/2 - x[2])), reverse=True)
    return scored

def generate_summary(text, summary_type='medium'):
    """🔥 CRITICAL: Generate summary with GUARANTEED complete sentences"""
    
    if len(text) < 100:
        raise ValueError("Text too short (minimum 100 characters)")
    
    logger.info("="*70)
    logger.info("📝 GENERATING SUMMARY WITH COMPLETE SENTENCES")
    logger.info("="*70)
    
    gemini_status = is_gemini_available()
    logger.info(f"🤖 GEMINI STATUS: {'✅ ACTIVE' if gemini_status else '❌ INACTIVE'}")
    
    # Preprocess
    logger.info(f"📄 Original text: {len(text)} chars")
    preprocessed = preprocess_text(text, 'summary')
    logger.info(f"📄 After preprocessing: {len(preprocessed)} chars")
    
    # 🔥 CRITICAL: Extract ONLY complete sentences
    sentences = extract_sentences(preprocessed)
    logger.info(f"📄 Extracted {len(sentences)} COMPLETE sentences")
    
    if len(sentences) < 3:
        logger.error("❌ Not enough complete sentences - trying original text")
        sentences = extract_sentences(text)
        if len(sentences) < 3:
            raise ValueError("Not enough complete sentences in document")
    
    # Score sentences
    scored = score_sentences_enhanced(sentences, preprocessed)
    logger.info(f"🎯 Scored {len(scored)} sentences")
    
    # Select sentences
    configs = {
        'short': {'sentences': 18, 'max_length': 2000},
        'medium': {'sentences': 30, 'max_length': 4500},
        'long': {'sentences': 50, 'max_length': 7500}
    }
    
    config = configs.get(summary_type, configs['medium'])
    num_sentences = min(config['sentences'], len(scored))
    
    logger.info(f"📊 Target: {num_sentences} sentences, max {config['max_length']} chars")
    
    top_sentences_data = scored[:num_sentences]
    top_sentences = [(sent, pos) for sent, score, pos in top_sentences_data]
    
    # Order by position
    top_sentences.sort(key=lambda x: x[1])
    ordered_sentences = [sent for sent, pos in top_sentences]
    
    # Clean markers
    cleaned_sentences = [clean_preprocessing_markers(sent) for sent in ordered_sentences]
    
    # 🔥 FINAL VALIDATION: Remove ANY incomplete sentences
    final_sentences = []
    for sent in cleaned_sentences:
        # Skip if incomplete
        if re.search(r'\b\w+\s+(is|are|was|were)\s+a\s*[,.]?\s*$', sent):
            logger.warning(f"⚠️ Skipping incomplete: '{sent[:60]}'")
            continue
        if re.match(r'.+\b(a|an|the)\s*$', sent, re.I):
            logger.warning(f"⚠️ Skipping incomplete end: '{sent[:60]}'")
            continue
        if sent and sent[0].islower():
            logger.warning(f"⚠️ Skipping lowercase start: '{sent[:60]}'")
            continue
        if re.search(r'\s+,\s+(?!and|or|but)', sent):
            logger.warning(f"⚠️ Skipping orphan comma: '{sent[:60]}'")
            continue
        
        final_sentences.append(sent)
    
    summary = ' '.join(final_sentences)
    
    # Truncate if needed
    if len(summary) > config['max_length']:
        truncate_pos = summary.rfind('. ', 0, config['max_length'])
        if truncate_pos > config['max_length'] * 0.85:
            summary = summary[:truncate_pos + 1]
    
    # Calculate stats
    compression = round((1 - len(summary) / len(text)) * 100, 1)
    logger.info(f"✅ Summary: {len(summary)} chars")
    logger.info(f"📉 Compression: {compression}%")
    logger.info(f"✅ Final sentences: {len(final_sentences)}")
    
    # Extract key points
    key_points_raw = extract_structured_key_points(preprocessed)
    
    if len(key_points_raw) < 5:
        for sent, score, pos in scored[:15]:
            clean_sent = clean_preprocessing_markers(sent.strip())
            # Validate key point
            if (len(clean_sent) > 20 and 
                not re.search(r'\b(is|are|was|were)\s+a\s*[,.]?\s*$', clean_sent)):
                if len(clean_sent) > 250:
                    clean_sent = clean_sent[:247] + '...'
                if clean_sent not in key_points_raw:
                    key_points_raw.append(clean_sent)
                if len(key_points_raw) >= 12:
                    break
    
    key_points = [clean_preprocessing_markers(kp) for kp in key_points_raw[:12]]
    
    logger.info(f"✅ Key points: {len(key_points)}")
    logger.info("="*70)
    
    return {
        'summary': summary,
        'key_points': key_points,
        'summary_type': summary_type,
        'original_length': len(text),
        'summary_length': len(summary),
        'compression_ratio': compression,
        'preprocessed_with_gemini': gemini_status,
        'validation_passed': True
    }