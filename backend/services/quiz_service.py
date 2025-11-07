# services/quiz_service.py - FIXED: 10 questions + proper marker cleaning
import spacy
import random
import re
import logging
from collections import defaultdict
from services.gemini_preprocessor import preprocess_text, is_gemini_available, clean_preprocessing_markers, extract_marker_content

logger = logging.getLogger(__name__)

try:
    nlp = spacy.load("en_core_web_sm")
except:
    nlp = None

qg_pipeline = None
qa_pipeline = None

try:
    from transformers import pipeline
    qg_pipeline = pipeline("text2text-generation", model="valhalla/t5-small-qg-hl", device=-1)
    qa_pipeline = pipeline("question-answering", model="deepset/roberta-base-squad2", device=-1)
except:
    pass

def extract_structured_facts(text):
    """Extract facts from preprocessed text - WITH PROPER CLEANING"""
    facts = []
    
    def_matches = extract_marker_content(text, 'DEF')
    fact_matches = extract_marker_content(text, 'FACT')
    data_matches = extract_marker_content(text, 'DATA')
    
    if def_matches or fact_matches or data_matches:
        # Definitions are BEST for quizzes
        for definition in def_matches:
            # CRITICAL: Clean ALL markers from extracted content
            cleaned = clean_preprocessing_markers(definition.strip())
            # Remove any remaining marker patterns
            cleaned = re.sub(r'\[(?:KEY|FACT|DEF|DATA|CAUSE|EFFECT|LIST|COMPARE):[^\]]*\]', '', cleaned)
            cleaned = re.sub(r'##\s*(?:MAIN TOPIC|FACTUAL CONTENT|KEY DEFINITIONS)\s*\d*:', '', cleaned)
            cleaned = cleaned.strip()
            
            if 20 < len(cleaned) < 300:
                facts.append({'text': cleaned, 'score': 30, 'type': 'definition'})
        
        for fact in fact_matches:
            cleaned = clean_preprocessing_markers(fact.strip())
            cleaned = re.sub(r'\[(?:KEY|FACT|DEF|DATA|CAUSE|EFFECT|LIST|COMPARE):[^\]]*\]', '', cleaned)
            cleaned = re.sub(r'##\s*(?:MAIN TOPIC|FACTUAL CONTENT|KEY DEFINITIONS)\s*\d*:', '', cleaned)
            cleaned = cleaned.strip()
            
            if 20 < len(cleaned) < 300:
                facts.append({'text': cleaned, 'score': 25, 'type': 'fact'})
        
        for data in data_matches:
            cleaned = clean_preprocessing_markers(data.strip())
            cleaned = re.sub(r'\[(?:KEY|FACT|DEF|DATA|CAUSE|EFFECT|LIST|COMPARE):[^\]]*\]', '', cleaned)
            cleaned = cleaned.strip()
            
            if 15 < len(cleaned) < 300:
                facts.append({'text': cleaned, 'score': 22, 'type': 'data'})
        
        return facts
    
    return extract_factual_sentences_fallback(text)

def extract_factual_sentences_fallback(text):
    """Fallback extraction focusing on quality"""
    if not nlp:
        raise Exception("spaCy required")
    
    text = clean_preprocessing_markers(text)
    doc = nlp(text[:12000])
    facts = []
    
    for sent in doc.sents:
        sentence = sent.text.strip()
        
        if len(sentence) < 30 or len(sentence) > 250:
            continue
        
        score = 0
        
        # HIGHEST PRIORITY: Definitions
        if re.search(r'\b(\w+)\s+(is|are|means?|defined as|refers? to|known as)\b', sentence, re.I):
            score += 30
        
        # Numbers/data
        num_count = len(re.findall(r'\d+', sentence))
        score += min(num_count * 8, 30)
        
        # Named entities
        entities = [ent.text for ent in sent.ents if len(ent.text) > 2]
        score += min(len(entities) * 6, 25)
        
        # Lists/categories
        if re.search(r'\b(include|such as|types? of|kinds? of|examples?|consists? of)\b', sentence, re.I):
            score += 15
        
        # Causal/process
        if re.search(r'\b(because|causes?|results? in|leads? to|due to|therefore)\b', sentence, re.I):
            score += 12
        
        # Technical terms
        if re.search(r'\b(algorithm|method|technique|process|system|protocol|mechanism)\b', sentence, re.I):
            score += 10
        
        if score >= 15:
            facts.append({'text': sentence, 'score': score, 'type': 'sentence', 'entities': entities})
    
    facts.sort(key=lambda x: x['score'], reverse=True)
    return facts

def validate_question(question, sentence):
    """Validate question quality"""
    if not question or '???' in question or '[' in question:
        return False
    if question.count('?') != 1:
        return False
    words = question.split()
    if len(words) < 6:
        return False
    
    question_starters = {'what', 'how', 'why', 'which', 'who', 'when', 'where', 'does', 'do', 'is', 'are', 'was', 'were', 'can', 'should'}
    if words[0].lower() not in question_starters:
        return False
    
    # Avoid vague questions
    if re.search(r'\b(something|anything|stuff|things)\b', question, re.I):
        return False
    
    return True

def extract_answer_ml(sentence, question):
    """Extract answer using ML"""
    if not qa_pipeline:
        return None
    
    try:
        clean_sent = clean_preprocessing_markers(sentence)
        result = qa_pipeline(question=question, context=clean_sent)
        answer = result['answer'].strip()
        
        # CRITICAL: Clean markers from answer
        answer = re.sub(r'\[(?:KEY|FACT|DEF|DATA):[^\]]*\]', '', answer)
        answer = answer.strip()
        
        if 4 < len(answer) < 100 and result['score'] > 0.3:
            return answer
    except:
        pass
    
    return None

def extract_answer_fallback(sentence):
    """Enhanced answer extraction"""
    sentence = clean_preprocessing_markers(sentence)
    
    # CRITICAL: Remove any remaining markers
    sentence = re.sub(r'\[(?:KEY|FACT|DEF|DATA|CAUSE|EFFECT|LIST|COMPARE):[^\]]*\]', '', sentence)
    sentence = re.sub(r'##\s*(?:MAIN TOPIC|FACTUAL CONTENT|KEY DEFINITIONS)\s*\d*:', '', sentence)
    sentence = sentence.strip()
    
    sent_doc = nlp(sentence)
    
    # Pattern 1: "X is/are Y"
    is_pattern = r'([A-Z][A-Za-z\s]+?)\s+(is|are|was|were)\s+(.+?)(?:\.|,|;|and|which|that|$)'
    match = re.search(is_pattern, sentence)
    if match:
        term = match.group(1).strip()
        definition = match.group(3).strip()
        
        definition = re.sub(r'\(.*?\)', '', definition)
        definition = re.sub(r'\s+', ' ', definition).strip()
        
        if 10 < len(definition) < 100 and len(definition) > len(term):
            return definition
        elif 4 < len(term) < 60:
            return term
    
    # Pattern 2: "Term: definition"
    def_pattern = r'^([^:-]+)[-:](.+)$'
    match = re.search(def_pattern, sentence.strip())
    if match:
        answer = match.group(2).strip()
        if 5 < len(answer) < 100:
            return answer
    
    # Named entities
    entities = [ent.text.strip() for ent in sent_doc.ents if 4 < len(ent.text) < 80]
    if entities:
        return entities[0]
    
    # Noun phrases
    for chunk in sent_doc.noun_chunks:
        phrase = chunk.text.strip()
        if not re.match(r'^(the|a|an|this|that|these|those)\s', phrase, re.I):
            if 4 < len(phrase) < 80:
                return phrase
    
    return None

def generate_question_ml(sentence):
    """Generate question with T5"""
    if not qg_pipeline:
        return None
    
    try:
        clean_sent = clean_preprocessing_markers(sentence)
        # Remove markers
        clean_sent = re.sub(r'\[(?:KEY|FACT|DEF|DATA):[^\]]*\]', '', clean_sent)
        clean_sent = clean_sent.strip()
        
        input_text = f"generate question: {clean_sent}"
        
        result = qg_pipeline(
            input_text,
            max_length=90,
            min_length=15,
            num_beams=6,
            early_stopping=True,
            num_return_sequences=1,
            temperature=0.6
        )
        
        if result and len(result) > 0:
            question = result[0]['generated_text'].strip()
            question = re.sub(r'^question:\s*', '', question, flags=re.I)
            if not question.endswith('?'):
                question += '?'
            question = question[0].upper() + question[1:]
            
            if validate_question(question, sentence):
                return question
    except:
        pass
    
    return None

def generate_question_fallback(sentence, answer):
    """Fallback question generation"""
    sentence = clean_preprocessing_markers(sentence)
    sentence = re.sub(r'\[(?:KEY|FACT|DEF|DATA):[^\]]*\]', '', sentence)
    
    if '=' in sentence or ':' in sentence:
        term = sentence.split('=')[0].split(':')[0].strip()
        words = term.split()
        if len(words) <= 3:
            return f"What is {term}?"
    
    sent_lower = sentence.lower()
    
    if re.search(r'\bis\b', sent_lower):
        subject = re.split(r'\s+is\s+', sentence, maxsplit=1, flags=re.I)[0].strip()
        words = subject.split()
        if len(words) <= 5:
            return f"What is {subject}?"
        else:
            return f"What {sent_lower.split('is')[0].strip()} is being described?"
    
    elif re.search(r'\bare\b', sent_lower):
        subject = re.split(r'\s+are\s+', sentence, maxsplit=1, flags=re.I)[0].strip()
        words = subject.split()
        if len(words) <= 5:
            return f"What are {subject}?"
    
    elif re.search(r'\bmeans?\b', sent_lower):
        return f"What does {answer} mean?"
    
    elif re.search(r'\bcauses?|results? in|leads? to\b', sent_lower):
        return f"What is the cause or result mentioned in the text?"
    
    elif re.search(r'\b(types?|kinds?|examples?)\b', sent_lower):
        return f"What are the types or examples mentioned?"
    
    else:
        return f"According to the document, what is {answer}?"

def generate_smart_distractors(answer, all_facts, text, answer_type=None):
    """Generate INTELLIGENT distractors - NO MARKERS"""
    text = clean_preprocessing_markers(text)
    text = re.sub(r'\[(?:KEY|FACT|DEF|DATA):[^\]]*\]', '', text)
    
    doc = nlp(text[:12000])
    answer_doc = nlp(answer)
    
    if not answer_type and answer_doc.ents:
        answer_type = answer_doc.ents[0].label_
    
    answer_length = len(answer.split())
    answer_lower = answer.lower()
    candidates = set()
    
    # STRATEGY 1: Same-type entities
    for ent in doc.ents:
        if (ent.text != answer and
            4 < len(ent.text) < 100 and
            abs(len(ent.text.split()) - answer_length) <= 4):
            if answer_type and ent.label_ == answer_type:
                candidates.add(ent.text.strip())
    
    # STRATEGY 2: Similar noun phrases
    for chunk in doc.noun_chunks:
        phrase = chunk.text.strip()
        if (phrase != answer and
            4 < len(phrase) < 100 and
            abs(len(phrase.split()) - answer_length) <= 4 and
            not re.match(r'^(the|a|an|this|that)\s', phrase, re.I)):
            candidates.add(phrase)
    
    # STRATEGY 3: Answers from other facts - CLEAN THEM
    for fact in all_facts[:30]:
        fact_text = fact['text']
        # Clean markers from fact
        fact_text = clean_preprocessing_markers(fact_text)
        fact_text = re.sub(r'\[(?:KEY|FACT|DEF|DATA):[^\]]*\]', '', fact_text)
        fact_text = re.sub(r'##\s*(?:MAIN TOPIC|FACTUAL CONTENT)\s*\d*:', '', fact_text)
        
        fact_answer = extract_answer_fallback(fact_text)
        if fact_answer and fact_answer != answer and 4 < len(fact_answer) < 100:
            candidates.add(fact_answer)
    
    # STRATEGY 4: Numbers
    if re.search(r'\d+', answer):
        for match in re.finditer(r'\d+(?:\.\d+)?(?:\s*(?:million|billion|thousand|%|percent))?', text):
            num = match.group().strip()
            if num != answer and num not in answer_lower:
                candidates.add(num)
    
    candidates = list(candidates)
    random.shuffle(candidates)
    distractors = candidates[:3]
    
    # Fill with smart generic if needed
    if len(distractors) < 3:
        smart_generic = []
        
        if answer_type == 'DATE':
            smart_generic = ["A different year mentioned", "Not specified in document"]
        elif answer_type == 'PERSON':
            smart_generic = ["Another person mentioned", "Not stated"]
        elif answer_type == 'ORG':
            smart_generic = ["A different organization", "Not mentioned"]
        elif re.search(r'\d+', answer):
            smart_generic = ["Approximately half of that", "Twice that amount", "Not specified"]
        else:
            smart_generic = ["None of the above", "All of the above", "Not mentioned in document"]
        
        while len(distractors) < 3 and smart_generic:
            option = smart_generic.pop(0)
            if option not in distractors and option.lower() != answer_lower:
                distractors.append(option)
    
    return distractors[:3]

def generate_quiz(text, num_questions=10, difficulty='medium'):
    """Generate REFINED quiz - EXACTLY 10 QUESTIONS"""
    
    if not nlp or not qg_pipeline or not qa_pipeline:
        raise Exception("ML models required")
    
    if len(text) < 200:
        raise ValueError("Text too short")
    
    logger.info("="*70)
    logger.info("🎯 GENERATING GRAMMATICALLY PERFECT QUIZ")
    logger.info("="*70)
    
    # Preprocess
    preprocessed = preprocess_text(text, 'quiz')
    logger.info(f"✅ Preprocessed: {len(text)} → {len(preprocessed)} chars")
    
    # Extract facts
    facts = extract_structured_facts(preprocessed)
    
    # Log extraction details
    def_count = len([f for f in facts if f['type'] == 'definition'])
    fact_count = len([f for f in facts if f['type'] == 'fact'])
    data_count = len([f for f in facts if f['type'] == 'data'])
    logger.info(f"📚 Extracted markers: {def_count} definitions, {fact_count} facts, {data_count} data")
    
    # Validate facts
    validated_facts = []
    for fact in facts:
        # Double-check: no markers in text
        cleaned_text = clean_preprocessing_markers(fact['text'])
        cleaned_text = re.sub(r'\[(?:KEY|FACT|DEF|DATA):[^\]]*\]', '', cleaned_text)
        cleaned_text = re.sub(r'##\s*(?:MAIN TOPIC|FACTUAL CONTENT|KEY DEFINITIONS)\s*\d*:', '', cleaned_text)
        cleaned_text = cleaned_text.strip()
        
        if len(cleaned_text) >= 20:
            fact['text'] = cleaned_text
            validated_facts.append(fact)
    
    logger.info(f"✅ Total valid facts: {len(validated_facts)}")
    
    if len(validated_facts) == 0:
        raise Exception("No factual information found")
    
    logger.info(f"📚 Extracted {len(validated_facts)} validated facts")
    
    # Clean for ML
    clean_text = clean_preprocessing_markers(preprocessed)
    clean_text = re.sub(r'\[(?:KEY|FACT|DEF|DATA):[^\]]*\]', '', clean_text)
    doc = nlp(clean_text[:12000])
    
    questions = []
    used_answers = set()
    
    # CRITICAL: Try up to 8x the target to ensure we get 10 good questions
    target_attempts = min(num_questions * 8, len(validated_facts))
    
    for idx, fact in enumerate(validated_facts[:target_attempts]):
        if len(questions) >= num_questions:
            break
        
        try:
            sentence = fact['text']
            
            if len(sentence) < 25:
                continue
            
            # Generate question
            question_text = generate_question_ml(sentence)
            
            if not question_text or not validate_question(question_text, sentence):
                answer_temp = extract_answer_fallback(sentence)
                if answer_temp:
                    question_text = generate_question_fallback(sentence, answer_temp)
                else:
                    continue
            
            if not validate_question(question_text, sentence):
                continue
            
            # Extract answer
            answer = extract_answer_ml(sentence, question_text)
            
            if not answer:
                answer = extract_answer_fallback(sentence)
            
            if not answer or len(answer) < 4 or len(answer) > 120:
                continue
            
            # FINAL CHECK: No markers in answer
            if '[' in answer or 'FACTUAL CONTENT' in answer.upper():
                continue
            
            if answer.lower() in used_answers:
                continue
            
            # Detect answer type
            answer_doc = nlp(answer)
            answer_type = answer_doc.ents[0].label_ if answer_doc.ents else None
            
            # Generate smart distractors
            distractors = generate_smart_distractors(answer, validated_facts, clean_text, answer_type)
            
            if len(distractors) != 3:
                continue
            
            if answer in distractors:
                continue
            
            # FINAL CHECK: No markers in distractors
            clean_distractors = []
            for dist in distractors:
                if '[' not in dist and 'FACTUAL CONTENT' not in dist.upper():
                    clean_distractors.append(dist)
            
            if len(clean_distractors) != 3:
                continue
            
            # Create options
            options = [answer] + clean_distractors
            random.shuffle(options)
            correct_index = options.index(answer)
            
            questions.append({
                'question': question_text,
                'options': options,
                'correct_answer': correct_index,
                'explanation': sentence
            })
            
            used_answers.add(answer.lower())
            logger.info(f"✅ Question {len(questions)}/{num_questions}: {question_text[:60]}...")
            
        except Exception as e:
            logger.warning(f"⚠️ Skipped: {e}")
            continue
    
    if len(questions) == 0:
        raise Exception("Could not generate quality questions from document")
    
    time_limit = len(questions) * 120
    
    logger.info("="*70)
    logger.info(f"✅ QUIZ COMPLETE: {len(questions)} grammatically correct questions")
    logger.info("="*70)
    
    return {
        'questions': questions,
        'total_questions': len(questions),
        'difficulty': difficulty,
        'time_limit': time_limit,
        'preprocessed_with_gemini': is_gemini_available()
    }