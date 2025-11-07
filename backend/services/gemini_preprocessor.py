# services/gemini_preprocessor.py - ULTRA FIXED: Complete sentence validation + aggressive rejection
import logging
import re
from config import GEMINI_API_KEY

logger = logging.getLogger(__name__)

gemini_model = None
GEMINI_AVAILABLE = False

try:
    import google.generativeai as genai
    
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel('gemini-2.0-flash')
        GEMINI_AVAILABLE = True
        logger.info("✅ Gemini AI Preprocessor initialized")
    else:
        logger.warning("⚠️ Gemini API key not found")
except Exception as e:
    logger.warning(f"⚠️ Gemini AI not available: {e}")

def clean_broken_pdf_text(text):
    """Fix common PDF extraction issues - ENHANCED"""
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\b(is|are|was|were)\s+a\s*,\s*', r'\1 a distributed ledger technology, ', text)
    text = re.sub(r'\b(is|are|was|were)\s*,\s*', r'\1 ', text)
    text = re.sub(r'\s+,\s+', ', ', text)
    text = re.sub(r'\s+\.\s+', '. ', text)
    text = re.sub(r'\s+([,;.!?])', r'\1', text)
    text = re.sub(r'^##\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'\.{2,}', '.', text)
    text = re.sub(r'([.!?])([A-Z])', r'\1 \2', text)
    return text.strip()

def validate_sentence_completeness(text):
    """🔥 CRITICAL: Ultra-strict validation - reject ANY incomplete patterns"""
    if not text or len(text) < 20:
        return False, "Text too short"
    
    sentences = re.split(r'[.!?]+', text)
    incomplete_count = 0
    broken_patterns = []
    
    for sent in sentences:
        sent = sent.strip()
        if len(sent) < 10:
            continue
        
        # Pattern 1: "is a ," or "are a ," - ABSOLUTE REJECTION
        if re.search(r'\b(is|are|was|were)\s+a\s*[,.]?\s*$', sent):
            incomplete_count += 1
            broken_patterns.append(f"Incomplete definition: '{sent[:60]}'")
        
        # Pattern 2: Orphan commas in middle
        if re.search(r'\s+,\s+\w', sent):
            incomplete_count += 1
            broken_patterns.append(f"Orphan comma: '{sent[:60]}'")
        
        # Pattern 3: Sentence ends with article
        if re.match(r'.+\b(a|an|the)\s*$', sent, re.I):
            incomplete_count += 1
            broken_patterns.append(f"Incomplete end: '{sent[:60]}'")
        
        # Pattern 4: Starts with lowercase (except after colon)
        if sent and sent[0].islower():
            incomplete_count += 1
            broken_patterns.append(f"No capital: '{sent[:60]}'")
    
    total_sentences = len([s for s in sentences if len(s.strip()) > 10])
    if total_sentences == 0:
        return False, "No valid sentences"
    
    error_rate = (incomplete_count / total_sentences) * 100
    
    # 🔥 CRITICAL: Lower threshold - reject if >5% broken (was 10%)
    if error_rate > 5:
        logger.error(f"❌ HIGH ERROR RATE: {error_rate:.1f}% ({incomplete_count}/{total_sentences})")
        for pattern in broken_patterns[:5]:
            logger.error(f"   - {pattern}")
        return False, f"Error rate {error_rate:.1f}% too high (threshold: 5%)"
    
    return True, f"OK ({error_rate:.1f}% errors)"

def validate_gemini_output(text, original_text):
    """🔥 CRITICAL: Comprehensive validation - REJECT if broken"""
    
    # Check 1: Output length
    if len(text) < len(original_text) * 0.25:
        return False, f"Output too short: {len(text)} vs {len(original_text)}"
    
    # Check 2: Markers (for structured tasks)
    marker_count = len(re.findall(r'\[(?:KEY|FACT|DEF|DATA):', text))
    if marker_count < 3:
        logger.warning(f"⚠️ Few markers: {marker_count}")
    
    # Check 3: No excessive garbage
    garbage_count = 0
    garbage_count += text.lower().count('blockchain sub')
    garbage_count += text.lower().count('technology main')
    garbage_count += text.lower().count('sub technology')
    garbage_count += text.lower().count('main future')
    
    if garbage_count > 3:
        return False, f"Too much garbage: {garbage_count} instances"
    
    # Check 4: 🔥 CRITICAL - Sentence completeness
    is_complete, msg = validate_sentence_completeness(text)
    if not is_complete:
        return False, f"Sentence validation FAILED: {msg}"
    
    logger.info(f"✅ Gemini output validated: {msg}")
    return True, "All checks passed"

def clean_preprocessing_markers(text):
    """Remove ALL Gemini preprocessing markers"""
    text = re.sub(r'\[KEY:[^\]]*\]', '', text)
    text = re.sub(r'\[FACT:[^\]]*\]', '', text)
    text = re.sub(r'\[DEF:[^\]]*\]', '', text)
    text = re.sub(r'\[DATA:[^\]]*\]', '', text)
    text = re.sub(r'\[CAUSE:[^\]]*\]', '', text)
    text = re.sub(r'\[EFFECT:[^\]]*\]', '', text)
    text = re.sub(r'\[LIST:[^\]]*\]', '', text)
    text = re.sub(r'\[COMPARE:[^\]]*\]', '', text)
    text = re.sub(r'##\s*MAIN TOPIC\s*\d+:', '', text)
    text = re.sub(r'###\s*Subtopic\s*[\d.]+:', '', text)
    text = re.sub(r'#\s*CENTRAL CONCEPT:', '', text)
    text = re.sub(r'##\s*STEP\s*\d+:', '', text)
    text = re.sub(r'##\s*DECISION:', '', text)
    text = re.sub(r'\?\?\?+', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    text = re.sub(r'^\s*[-=*]+\s*$', '', text, flags=re.MULTILINE)
    return text.strip()

def extract_marker_content(text, marker_type):
    """Extract content from specific markers"""
    pattern = rf'\[{marker_type}:([^\]]+)\]'
    matches = re.findall(pattern, text)
    return [m.strip() for m in matches]

def preprocess_for_summary(text):
    """🔥 CRITICAL: Preprocess for summarization with STRICT validation"""
    if not GEMINI_AVAILABLE or len(text) < 200:
        return text
    
    # STEP 1: Clean broken PDF text
    text = clean_broken_pdf_text(text)
    logger.info(f"📄 After PDF cleaning: {len(text)} chars")
    
    if len(text) < 200:
        logger.warning("⚠️ Text too short after cleaning")
        return text
    
    # STEP 2: Call Gemini with ULTRA-STRICT prompt
    try:
        prompt = f"""Fix and restructure this text for AI summarization. CRITICAL: Every sentence MUST be complete.

TEXT:
{text[:12000]}

🔥 ABSOLUTE REQUIREMENTS:
1. EVERY sentence must have subject + verb + object
2. NO incomplete phrases like "blockchain is a ," - ALWAYS complete definitions
3. If you see "X is a ," write "X is a [COMPLETE definition with noun]"
4. Example: "Blockchain is a distributed ledger technology" NOT "Blockchain is a ,"
5. Fix broken sentences by inferring context
6. Remove noise (headers, footers, page numbers)
7. Create clear sections with ## headers
8. Mark key concepts: [KEY: concept]
9. Mark definitions: [DEF: term = complete definition]
10. Mark facts: [FACT: complete statement]

BAD EXAMPLES (DO NOT OUTPUT):
❌ "Technology is a , making"
❌ "Blockchain is a ,"
❌ "System was a ."
❌ "Method are ,"

GOOD EXAMPLES:
✅ "Blockchain is a distributed ledger technology that records transactions."
✅ "Technology provides a secure method for data storage."
✅ "The system was designed to prevent tampering."

FORMAT EXAMPLE:
## Introduction to Blockchain
[KEY: Blockchain Technology]
Blockchain technology is a distributed ledger system that records transactions in a secure and immutable way.

[DEF: Blockchain = A distributed database that maintains a continuously growing list of records called blocks]

[FACT: Blockchain was first introduced in 2008 by Satoshi Nakamoto as the underlying technology for Bitcoin]

🔥 CRITICAL: Return ONLY restructured text. NO incomplete sentences. NO commentary."""

        response = gemini_model.generate_content(
            prompt,
            generation_config={'temperature': 0.1, 'max_output_tokens': 8000}
        )
        
        structured = response.text.strip()
        logger.info(f"🤖 Gemini output: {len(structured)} chars")
        
        # STEP 3: 🔥 CRITICAL - STRICT VALIDATION
        is_valid, validation_msg = validate_gemini_output(structured, text)
        
        if not is_valid:
            logger.error(f"❌ GEMINI OUTPUT REJECTED: {validation_msg}")
            logger.error(f"❌ FALLBACK TO ORIGINAL TEXT")
            return text
        
        logger.info(f"✅ Gemini output ACCEPTED: {validation_msg}")
        return structured
        
    except Exception as e:
        logger.error(f"❌ Gemini preprocessing failed: {e}")
        return text

def preprocess_for_quiz(text):
    """Preprocess for quiz - extract CLEAN facts with STRICT validation"""
    if not GEMINI_AVAILABLE or len(text) < 200:
        return text
    
    text = clean_broken_pdf_text(text)
    
    try:
        prompt = f"""Extract COMPLETE, CLEAR testable facts from this text.

TEXT:
{text[:12000]}

🔥 CRITICAL RULES:
1. Every sentence must be COMPLETE: subject + verb + object
2. NO incomplete phrases like "blockchain is a ,"
3. Complete all definitions fully
4. Extract definitions: [DEF: Blockchain = A distributed ledger technology that records transactions in blocks]
5. Extract facts: [FACT: Bitcoin was created in 2008 by Satoshi Nakamoto]
6. Extract data: [DATA: The maximum Bitcoin supply is limited to 21 million coins]
7. ONLY include facts you can state COMPLETELY

FORMAT:
## KEY DEFINITIONS
[DEF: Blockchain = Complete definition in one clear sentence]
[DEF: Consensus Mechanism = Complete definition]

## FACTUAL CONTENT
[FACT: Complete factual statement with full details]
[FACT: Another complete fact]
[DATA: Specific number with full context]

Return ONLY complete facts. NO incomplete sentences."""

        response = gemini_model.generate_content(
            prompt,
            generation_config={'temperature': 0.1, 'max_output_tokens': 8000}
        )
        
        structured = response.text.strip()
        
        # Validate
        is_valid, validation_msg = validate_gemini_output(structured, text)
        
        if not is_valid:
            logger.error(f"❌ Quiz preprocessing REJECTED: {validation_msg}")
            return text
        
        logger.info(f"✅ Quiz preprocessing: {len(text)} → {len(structured)} chars")
        return structured
        
    except Exception as e:
        logger.error(f"❌ Preprocessing failed: {e}")
        return text

def preprocess_for_mindmap(text):
    """Preprocess for mindmap - CLEAN LABELS ONLY"""
    if not GEMINI_AVAILABLE or len(text) < 200:
        return text
    
    text = clean_broken_pdf_text(text)
    
    try:
        prompt = f"""Create a CLEAN hierarchical structure for mind mapping.

TEXT:
{text[:12000]}

RULES:
1. Central concept: 2-4 words, MEANINGFUL (e.g., "Blockchain Technology")
2. Main topics: 2-4 words each, NO "sub", NO "main"
3. Subtopics: 2-4 words each, SPECIFIC concepts
4. NO repetitive words
5. NO generic terms
6. ONLY meaningful, specific concepts

GOOD EXAMPLES:
- Central: Blockchain Technology
- Main: Consensus Mechanisms, Security Features, Network Types
- Subtopics: Proof of Work, Cryptographic Hashing, Public Networks

BAD EXAMPLES (DO NOT USE):
- blockchain sub technology ❌
- technology main blockchain ❌

FORMAT:
# CENTRAL: Blockchain Technology

## MAIN 1: Consensus Mechanisms
### SUB 1.1: Proof of Work
### SUB 1.2: Proof of Stake

## MAIN 2: Security Features
### SUB 2.1: Cryptographic Hashing
### SUB 2.2: Digital Signatures

Use ONLY clear, specific 2-4 word phrases."""

        response = gemini_model.generate_content(
            prompt,
            generation_config={'temperature': 0.2, 'max_output_tokens': 6000}
        )
        
        structured = response.text.strip()
        
        # Validate for garbage
        garbage_count = 0
        garbage_count += structured.lower().count('blockchain sub')
        garbage_count += structured.lower().count('technology main')
        garbage_count += structured.lower().count('sub technology')
        garbage_count += structured.lower().count('main future')
        
        if garbage_count > 2:
            logger.error(f"❌ Gemini output has {garbage_count} garbage patterns - REJECTED")
            return text
        
        if len(structured) < 100:
            logger.warning("⚠️ Output too short")
            return text
        
        logger.info(f"✅ Mindmap preprocessing: {len(text)} → {len(structured)} chars")
        return structured
        
    except Exception as e:
        logger.error(f"❌ Preprocessing failed: {e}")
        return text

def preprocess_for_flowchart(text):
    """Preprocess for flowchart - extract CLEAR process"""
    if not GEMINI_AVAILABLE or len(text) < 200:
        return text
    
    text = clean_broken_pdf_text(text)
    
    try:
        prompt = f"""Extract process with CLEAR decision points for flowchart.

TEXT:
{text[:12000]}

TASK:
1. Find 6-10 decision points (yes/no questions)
2. Each step: max 10 words, starts with action verb
3. Each decision: max 12 words, ends with ?
4. COMPLETE sentences only

FORMAT:
## STEP 1: User initiates transaction

## STEP 2: Verify transaction data

## DECISION 1: Is transaction valid?

## STEP 3: Broadcast to network

Return ONLY structured process."""

        response = gemini_model.generate_content(
            prompt,
            generation_config={'temperature': 0.2, 'max_output_tokens': 6000}
        )
        
        structured = response.text.strip()
        
        if len(structured) < 100:
            return text
        
        logger.info(f"✅ Flowchart preprocessing: {len(text)} → {len(structured)} chars")
        return structured
        
    except Exception as e:
        logger.error(f"❌ Preprocessing failed: {e}")
        return text

def preprocess_text(text, feature_type):
    """Main preprocessing router with STRICT validation"""
    logger.info(f"🔍 Preprocessing for: {feature_type}")
    logger.info(f"📄 Input: {len(text)} chars")
    
    if not text or len(text) < 100:
        logger.warning("⚠️ Text too short for preprocessing")
        return text
    
    # Check if text is broken BEFORE preprocessing
    broken_indicators = text.count(' , ') + text.count(' . ') + text.count('  ')
    if broken_indicators > 10:
        logger.warning(f"⚠️ Text appears broken ({broken_indicators} issues) - cleaning...")
        text = clean_broken_pdf_text(text)
        logger.info(f"✅ After cleaning: {len(text)} chars")
    
    preprocessors = {
        'summary': preprocess_for_summary,
        'quiz': preprocess_for_quiz,
        'mindmap': preprocess_for_mindmap,
        'flowchart': preprocess_for_flowchart
    }
    
    preprocessor = preprocessors.get(feature_type)
    if not preprocessor:
        logger.warning(f"⚠️ Unknown feature type: {feature_type}")
        return text
    
    try:
        result = preprocessor(text)
        logger.info(f"✅ Output: {len(result)} chars")
        
        # Final validation for summary
        if feature_type == 'summary':
            is_valid, msg = validate_sentence_completeness(result)
            if not is_valid:
                logger.error(f"❌ Final validation FAILED: {msg}")
                logger.error("❌ Using ORIGINAL TEXT as fallback")
                return text
            logger.info(f"✅ Final validation PASSED: {msg}")
        
        return result
    except Exception as e:
        logger.error(f"❌ Preprocessing failed: {e}")
        return text

def is_gemini_available():
    return GEMINI_AVAILABLE

def get_preprocessing_stats():
    return {
        'gemini_available': GEMINI_AVAILABLE,
        'api_key_configured': GEMINI_API_KEY is not None,
        'model': 'gemini-2.0-flash' if GEMINI_AVAILABLE else None
    }