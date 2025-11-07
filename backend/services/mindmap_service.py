# services/mindmap_service.py - ACTUALLY FIXED LAYOUT
import spacy
import logging
import random
import re
import math
import textwrap
from collections import Counter
from services.gemini_preprocessor import preprocess_text, is_gemini_available, clean_preprocessing_markers

logger = logging.getLogger(__name__)

def wrap_text(text, width=25):
    lines = textwrap.wrap(text, width=width, break_long_words=True, replace_whitespace=False)
    return '\n'.join(lines)

try:
    nlp = spacy.load("en_core_web_md")
except:
    try:
        nlp = spacy.load("en_core_web_sm")
    except:
        nlp = None

kw_model = None
try:
    from keybert import KeyBERT
    kw_model = KeyBERT(model='all-MiniLM-L6-v2')
except:
    pass

def validate_label(text, max_words=4, min_words=1):
    if not text:
        return None
    
    cleaned = clean_preprocessing_markers(text.strip())
    cleaned = re.sub(r'^#+\s*', '', cleaned)
    cleaned = re.sub(r'^\d+\.\s*', '', cleaned)
    cleaned = re.sub(r'^[-*•]\s*', '', cleaned)
    cleaned = re.sub(r'^(Topic|Main|Section|Chapter|Part|Unit|Concept|Idea)\s*\d*[:\s]*', '', cleaned, flags=re.I)
    cleaned = re.sub(r'^(Subtopic|Sub|Point|Item)\s*[\d.]*[:\s]*', '', cleaned, flags=re.I)
    cleaned = re.sub(r'^(Introduction|Intro|Overview|Summary|Conclusion)[:\s]+to\s+', '', cleaned, flags=re.I)
    cleaned = cleaned.rstrip(':;,.-').strip()
    
    words = cleaned.split()
    if len(words) > max_words:
        cleaned = ' '.join(words[:max_words])
        words = cleaned.split()
    
    if len(cleaned) < 3 or len(cleaned) > 60:
        return None
    
    garbage_patterns = [
        r'^(sub|pow|main|technology|blockchain)\s+(sub|technology|blockchain|pow)$',
        r'^(introduction|intro)\s+(blockchain|technology|sub)$',
        r'\bsub\s+sub\b',
        r'^(the|a|an|and|or|of|to|in|for|with)\s',
        r'^[\d\s]+$',
        r'^(technology|blockchain|system)\s+(sub|technology|blockchain)$',
        r'challenges\s+limit',
    ]
    
    for pattern in garbage_patterns:
        if re.search(pattern, cleaned.lower()):
            return None
    
    if len(words) == 1:
        generic = {'topic', 'section', 'content', 'information', 'details', 'overview', 
                   'introduction', 'conclusion', 'summary', 'continue', 'main', 'key',
                   'concept', 'idea', 'sub', 'technology', 'blockchain', 'system'}
        if cleaned.lower() in generic:
            return None
    
    if len(words) != len(set(w.lower() for w in words)):
        return None
    
    if words:
        cleaned = ' '.join(word.capitalize() if word.islower() else word for word in words)
    
    return cleaned

def extract_hierarchical_structure(text):
    hierarchy = {'central': None, 'main_topics': [], 'subtopics': {}}
    
    central_match = re.search(r'#\s*CENTRAL[:\s]+(.+?)(?:\n|$)', text, re.I)
    if central_match:
        raw = central_match.group(1)
        central = validate_label(raw, max_words=4, min_words=1)
        if central:
            hierarchy['central'] = central
    
    main_patterns = [
        r'##\s*MAIN\s*\d+[:\s]+(.+?)(?:\n|$)',
        r'##\s*([^#\n]+?)(?:\n|$)'
    ]
    
    for pattern in main_patterns:
        matches = re.findall(pattern, text, re.I)
        for match in matches:
            clean = validate_label(match, max_words=4)
            if clean and clean not in hierarchy['main_topics']:
                hierarchy['main_topics'].append(clean)
        if hierarchy['main_topics']:
            break
    
    current_main = None
    for line in text.split('\n'):
        line = line.strip()
        if not line:
            continue
        
        main_match = re.match(r'##\s*(?:MAIN\s*\d+[:\s]+)?(.+)', line, re.I)
        if main_match:
            candidate = validate_label(main_match.group(1), max_words=4)
            if candidate and candidate in hierarchy['main_topics']:
                current_main = candidate
                if current_main not in hierarchy['subtopics']:
                    hierarchy['subtopics'][current_main] = []
                continue
        
        sub_match = re.match(r'###\s*(?:SUB\s*[\d.]+[:\s]+)?(.+)', line, re.I)
        if sub_match and current_main:
            subtopic = validate_label(sub_match.group(1), max_words=4)
            if subtopic and subtopic not in hierarchy['subtopics'][current_main]:
                if subtopic.lower() != current_main.lower():
                    hierarchy['subtopics'][current_main].append(subtopic)
    
    return hierarchy

def calculate_node_positions(nodes, edges, canvas_width=5000, canvas_height=4000):
    """
    ORGANIC RADIAL LAYOUT - SPREADS PROPERLY
    """
    center_x = canvas_width / 2
    center_y = canvas_height / 2
    
    # Separate by levels
    level0 = [n for n in nodes if n['level'] == 0]
    level1 = [n for n in nodes if n['level'] == 1]
    level2 = [n for n in nodes if n['level'] == 2]
    
    # Place center
    for node in level0:
        node['x'] = center_x
        node['y'] = center_y
    
    if not level1:
        return nodes
    
    # LEVEL 1: Full circle around center
    num_main = len(level1)
    radius_main = 1000  # Large radius
    
    for i, node in enumerate(level1):
        angle = (2 * math.pi * i / num_main)  # Full 360 degrees
        node['x'] = center_x + radius_main * math.cos(angle)
        node['y'] = center_y + radius_main * math.sin(angle)
    
    # LEVEL 2: Around each parent in its own arc
    radius_sub = 800  # Distance from parent
    
    for parent in level1:
        # Find children
        children = []
        for node in level2:
            # Find edge connecting to this parent
            for edge in edges:
                if edge['to'] == node['id'] and edge['from'] == parent['id']:
                    children.append(node)
                    break
        
        if not children:
            continue
        
        # Parent's angle from center
        parent_angle = math.atan2(parent['y'] - center_y, parent['x'] - center_x)
        
        num_children = len(children)
        
        # Spread children in arc around parent
        arc_spread = math.pi / 3  # 60 degrees total
        
        for i, child in enumerate(children):
            if num_children == 1:
                # Single child: straight out from parent
                offset = 0
            else:
                # Multiple: spread evenly
                offset = (i - (num_children - 1) / 2) * (arc_spread / (num_children - 1))
            
            child_angle = parent_angle + offset
            child['x'] = parent['x'] + radius_sub * math.cos(child_angle)
            child['y'] = parent['y'] + radius_sub * math.sin(child_angle)
    
    return nodes

def generate_mindmap(text, title="Mind Map", max_nodes=40):
    if not nlp:
        raise Exception("spaCy required")
    
    preprocessed = preprocess_text(text, 'mindmap')
    hierarchy = extract_hierarchical_structure(preprocessed)
    
    nodes = []
    edges = []
    
    central_label = hierarchy['central'] or validate_label(title, max_words=4, min_words=1) or "Main Topic"
    nodes.append({
        'id': 'central', 'label': central_label, 'level': 0,
        'color': '#8b5cf6', 'size': 40, 'shape': 'circle'
    })
    
    main_topics = hierarchy['main_topics']
    
    if not main_topics and kw_model:
        try:
            clean_text = clean_preprocessing_markers(preprocessed)
            keywords = kw_model.extract_keywords(
                clean_text, keyphrase_ngram_range=(2, 4),
                stop_words='english', top_n=15, diversity=0.8
            )
            for kw, score in keywords:
                validated = validate_label(kw, max_words=4, min_words=2)
                if validated:
                    main_topics.append(validated)
                if len(main_topics) >= 10: break
        except Exception as e:
            logger.error(f"KeyBERT failed: {e}")
    
    if not main_topics:
        doc = nlp(clean_preprocessing_markers(preprocessed)[:10000])
        for chunk in doc.noun_chunks:
            validated = validate_label(chunk.text, max_words=4, min_words=2)
            if validated and validated not in main_topics:
                main_topics.append(validated)
            if len(main_topics) >= 8: break
    
    colors = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
              '#06b6d4', '#8b5cf6', '#a855f7', '#14b8a6', '#f43f5e']
    
    node_id = 0
    max_main = min(len(main_topics), 10)
    
    for i, topic in enumerate(main_topics[:max_main]):
        node_id += 1
        topic_id = f'topic_{node_id}'
        color = colors[i % len(colors)]
        
        nodes.append({
            'id': topic_id, 'label': topic, 'level': 1,
            'color': color, 'size': 30, 'shape': 'box'
        })
        edges.append({'from': 'central', 'to': topic_id, 'width': 4, 'color': color})
        
        subtopics = hierarchy['subtopics'].get(topic, [])
        
        if not subtopics and kw_model:
            try:
                doc = nlp(clean_preprocessing_markers(preprocessed)[:10000])
                topic_sentences = [sent.text for sent in doc.sents if topic.lower() in sent.text.lower()]
                if topic_sentences:
                    context = ' '.join(topic_sentences[:3])
                    sub_kw = kw_model.extract_keywords(context, keyphrase_ngram_range=(2, 4), stop_words='english', top_n=6, diversity=0.7)
                    for kw, score in sub_kw:
                        validated = validate_label(kw, max_words=4, min_words=2)
                        if validated and validated.lower() != topic.lower():
                            subtopics.append(validated)
                        if len(subtopics) >= 6: break
            except:
                pass
        
        for subtopic in subtopics[:6]:
            if node_id >= max_nodes - 1: break
            node_id += 1
            subtopic_id = f'node_{node_id}'
            sub_color = lighten_color(color)
            nodes.append({
                'id': subtopic_id, 'label': subtopic, 'level': 2,
                'color': sub_color, 'size': 22, 'shape': 'ellipse'
            })
            edges.append({'from': topic_id, 'to': subtopic_id, 'width': 2, 'color': color})
        
        if node_id >= max_nodes - 1: break
    
    nodes = calculate_node_positions(nodes, edges)
    
    return {
        'title': title, 'nodes': nodes, 'edges': edges,
        'type': 'mindmap', 'canvas_width': 5000, 'canvas_height': 4000,
        'preprocessed_with_gemini': is_gemini_available()
    }

def extract_process_steps(text):
    steps = []
    decisions = []
    
    step_matches = re.findall(r'##\s*STEP\s*\d+[:\s]+(.+?)(?:\n|$)', text, re.I)
    decision_matches = re.findall(r'##\s*DECISION\s*\d*[:\s]+(.+?)(?:\n|$)', text, re.I)
    
    if step_matches:
        for s in step_matches:
            cleaned = clean_preprocessing_markers(s.strip())
            if 10 < len(cleaned) < 150: steps.append(cleaned)
        for d in decision_matches:
            cleaned = clean_preprocessing_markers(d.strip())
            if not cleaned.endswith('?'): cleaned += '?'
            if 10 < len(cleaned) < 150: decisions.append(cleaned)
        return steps, decisions
    
    clean_text = clean_preprocessing_markers(text)
    doc = nlp(clean_text[:15000])
    
    for sent in doc.sents:
        sentence = sent.text.strip()
        if len(sentence) < 15 or len(sentence) > 180: continue
        is_decision = any(['?' in sentence, re.search(r'\b(if|whether|decide|check|verify)\b', sentence, re.I)])
        if is_decision:
            if not sentence.endswith('?'): sentence += '?'
            decisions.append(sentence)
        else:
            is_step = any([re.match(r'^(First|Second|Next|Then)', sentence, re.I), re.search(r'\b(create|generate|process|calculate)\b', sentence, re.I), sent[0].pos_ == 'VERB'])
            if is_step:
                steps.append(sentence)
    return steps[:30], decisions[:12]

def calculate_flowchart_positions(nodes, edges, canvas_width=1800, canvas_height=1200):
    """
    VERTICAL FLOWCHART - NO OVERLAPS
    """
    x_center = canvas_width / 2
    x_yes = 500      # YES branch X
    x_no = 1300      # NO branch X (far right)
    
    y_start = 100
    y_gap = 250      # Vertical spacing
    y_current = y_start
    
    for node in nodes:
        if node['type'] == 'start':
            node['x'] = x_center
            node['y'] = y_current
            y_current += y_gap
            
        elif node['type'] == 'decision':
            node['x'] = x_center
            node['y'] = y_current
            y_current += y_gap
            
        elif node['type'] == 'process':
            if 'yes_' in node['id']:
                node['x'] = x_yes
                node['y'] = y_current
                
            elif 'no_' in node['id']:
                node['x'] = x_no
                node['y'] = y_current  # SAME Y as YES
                
            elif 'merge_' in node['id']:
                y_current += y_gap  # Move down AFTER both branches
                node['x'] = x_center
                node['y'] = y_current
                y_current += y_gap
                
            else:
                node['x'] = x_center
                node['y'] = y_current
                y_current += y_gap
                
        elif node['type'] == 'end':
            node['x'] = x_center
            node['y'] = y_current
            y_current += y_gap
    
    return nodes, y_current + 200

def generate_flowchart(text, title="Flowchart", max_steps=35):
    if not nlp:
        raise Exception("spaCy required")
    
    preprocessed = preprocess_text(text, 'flowchart')
    steps, decisions = extract_process_steps(preprocessed)
    
    if len(steps) < 2:
        raise Exception("Not enough process steps")
    
    nodes = []
    edges = []
    
    nodes.append({'id': 'start', 'label': 'Start', 'type': 'start', 'color': '#10b981', 'shape': 'ellipse', 'size': 25})
    
    node_id = 0
    current_id = 'start'
    branch_count = 0
    decision_freq = max(4, len(steps) // min(len(decisions), 5)) if decisions else 100
    
    i = 0
    while i < len(steps) and len(nodes) < max_steps - 2:
        node_id += 1
        step_id = f'step_{node_id}'
        
        nodes.append({'id': step_id, 'label': wrap_text(steps[i][:90], width=22), 'type': 'process', 'color': '#3b82f6', 'shape': 'box', 'size': 24})
        edges.append({'from': current_id, 'to': step_id, 'arrows': 'to', 'width': 3})
        
        can_branch = (i > 0 and i % decision_freq == 0 and decisions and len(nodes) < max_steps - 8 and branch_count < 6 and i + 2 < len(steps))
        
        if can_branch:
            decision = decisions.pop(0)
            node_id += 1
            decision_id = f'decision_{node_id}'
            nodes.append({'id': decision_id, 'label': wrap_text(decision[:100], width=25), 'type': 'decision', 'color': '#f59e0b', 'shape': 'diamond', 'size': 28})
            edges.append({'from': step_id, 'to': decision_id, 'arrows': 'to', 'width': 3})
            
            node_id += 1
            yes_id = f'yes_{node_id}'
            yes_label = steps[i + 1][:90] if i + 1 < len(steps) else "Continue"
            nodes.append({'id': yes_id, 'label': wrap_text(yes_label, width=22), 'type': 'process', 'color': '#10b981', 'shape': 'box', 'size': 22})
            edges.append({'from': decision_id, 'to': yes_id, 'arrows': 'to', 'label': 'Yes', 'width': 3, 'color': '#10b981'})
            
            node_id += 1
            no_id = f'no_{node_id}'
            no_label = steps[i + 2][:90] if i + 2 < len(steps) else "Handle exception"
            nodes.append({'id': no_id, 'label': wrap_text(no_label, width=22), 'type': 'process', 'color': '#ef4444', 'shape': 'box', 'size': 22})
            edges.append({'from': decision_id, 'to': no_id, 'arrows': 'to', 'label': 'No', 'width': 3, 'color': '#ef4444'})
            
            node_id += 1
            merge_id = f'merge_{node_id}'
            nodes.append({'id': merge_id, 'label': 'Continue', 'type': 'process', 'color': '#8b5cf6', 'shape': 'box', 'size': 22})
            edges.append({'from': yes_id, 'to': merge_id, 'arrows': 'to', 'width': 3})
            edges.append({'from': no_id, 'to': merge_id, 'arrows': 'to', 'width': 3})
            
            current_id = merge_id
            branch_count += 1
            i += 3
        else:
            current_id = step_id
            i += 1
    
    nodes.append({'id': 'end', 'label': 'End', 'type': 'end', 'color': '#ef4444', 'shape': 'ellipse', 'size': 25})
    edges.append({'from': current_id, 'to': 'end', 'arrows': 'to', 'width': 3})
    
    nodes, total_height = calculate_flowchart_positions(nodes, edges)
    
    return {
        'title': title, 'nodes': nodes, 'edges': edges, 
        'type': 'flowchart', 'canvas_width': 1800, 'canvas_height': total_height,
        'preprocessed_with_gemini': is_gemini_available()
    }

def lighten_color(hex_color):
    hex_color = hex_color.lstrip('#')
    r, g, b = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    r = min(255, int(r + (255 - r) * 0.3))
    g = min(255, int(g + (255 - g) * 0.3))
    b = min(255, int(b + (255 - b) * 0.3))
    return f'#{r:02x}{g:02x}{b:02x}'