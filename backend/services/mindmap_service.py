# services/mindmap_service.py - FIXED VERSION
from keybert import KeyBERT
import spacy
import logging
import random
from collections import defaultdict
import re

logger = logging.getLogger(__name__)

# Initialize models
try:
    kw_model = KeyBERT()
    nlp = spacy.load("en_core_web_sm")
    logger.info("✅ KeyBERT and spaCy models loaded successfully")
except Exception as e:
    logger.error(f"❌ Failed to load models: {str(e)}")
    kw_model = None
    nlp = None

def extract_main_topics(text, max_topics=5):
    """Extract main topics from text using NLP"""
    doc = nlp(text[:10000])  # Limit for processing
    
    # Extract noun chunks and named entities
    topics = []
    seen = set()
    
    # Get named entities (people, places, organizations, etc.)
    for ent in doc.ents:
        if ent.label_ in ['PERSON', 'ORG', 'GPE', 'PRODUCT', 'EVENT']:
            topic = ent.text.strip()
            if topic.lower() not in seen and len(topic) > 2:
                topics.append({
                    'text': topic,
                    'type': ent.label_,
                    'importance': len(topic)
                })
                seen.add(topic.lower())
    
    # Get important noun phrases
    for chunk in doc.noun_chunks:
        topic = chunk.text.strip()
        if (topic.lower() not in seen and 
            len(topic.split()) <= 3 and 
            len(topic) > 3):
            topics.append({
                'text': topic,
                'type': 'CONCEPT',
                'importance': 1
            })
            seen.add(topic.lower())
    
    # Sort by importance and return top topics
    topics.sort(key=lambda x: x['importance'], reverse=True)
    return topics[:max_topics]

# Wrapper functions to maintain compatibility
def generate_mindmap(text, title="Mind Map", max_nodes=15):
    """Generate mind map - wrapper for hierarchical version"""
    return generate_hierarchical_mindmap(text, title, max_nodes)

def generate_flowchart(text, title="Flowchart", max_steps=10):
    """Generate flowchart - wrapper for process version"""
    return generate_process_flowchart(text, title, max_steps)


def generate_hierarchical_mindmap(text, title="Mind Map", max_nodes=20):
    """
    Generate a hierarchical mind map with better structure
    """
    if not kw_model or not nlp:
        raise Exception("Mind map models not available")
    
    if not text or len(text.strip()) < 50:
        raise ValueError("Text is too short to generate mind map")
    
    try:
        logger.info("🧠 Generating HIERARCHICAL mind map...")
        
        # Extract main topics (level 1)
        main_topics = extract_main_topics(text, max_topics=5)
        logger.info(f"✅ Extracted {len(main_topics)} main topics")
        
        # Extract keywords for each topic (level 2)
        all_keywords = kw_model.extract_keywords(
            text,
            keyphrase_ngram_range=(1, 3),
            stop_words='english',
            top_n=max_nodes,
            diversity=0.7  # Increase diversity
        )
        
        # Create central node
        nodes = [{
            'id': 'central',
            'label': title,
            'level': 0,
            'color': '#8b5cf6',
            'size': 40,
            'shape': 'circle'
        }]
        
        edges = []
        node_id = 0
        
        # Create topic nodes (level 1)
        topic_nodes = []
        for i, topic in enumerate(main_topics):
            node_id += 1
            topic_id = f'topic_{node_id}'
            
            nodes.append({
                'id': topic_id,
                'label': topic['text'].title(),
                'level': 1,
                'color': get_topic_color(i),
                'size': 30,
                'shape': 'box'
            })
            
            # Connect to central node
            edges.append({
                'from': 'central',
                'to': topic_id,
                'width': 3,
                'color': get_topic_color(i)
            })
            
            topic_nodes.append(topic_id)
        
        # Create keyword nodes (level 2)
        keywords_per_topic = len(all_keywords) // max(len(main_topics), 1)
        
        for i, (keyword, score) in enumerate(all_keywords):
            node_id += 1
            keyword_id = f'node_{node_id}'
            
            # Assign to a topic node
            parent_topic = topic_nodes[i % len(topic_nodes)] if topic_nodes else 'central'
            
            nodes.append({
                'id': keyword_id,
                'label': keyword.title(),
                'level': 2,
                'color': get_keyword_color(score),
                'size': 15 + int(score * 15),
                'shape': 'ellipse'
            })
            
            # Connect to parent topic
            edges.append({
                'from': parent_topic,
                'to': keyword_id,
                'width': 2,
                'dashes': False
            })
        
        # Add cross-connections between related keywords
        keyword_nodes = [n for n in nodes if n['level'] == 2]
        doc = nlp(text[:5000])
        
        for i, node1 in enumerate(keyword_nodes[:10]):
            for node2 in keyword_nodes[i+1:i+4]:
                if are_related_enhanced(node1['label'], node2['label'], doc):
                    edges.append({
                        'from': node1['id'],
                        'to': node2['id'],
                        'width': 1,
                        'dashes': True,
                        'color': '#cbd5e1'
                    })
        
        logger.info(f"✅ Created mindmap: {len(nodes)} nodes, {len(edges)} edges")
        
        return {
            'title': title,
            'nodes': nodes,
            'edges': edges,
            'type': 'mindmap'
        }
        
    except Exception as e:
        logger.error(f"❌ Mind map generation error: {str(e)}")
        raise Exception(f"Failed to generate mind map: {str(e)}")

def generate_process_flowchart(text, title="Process Flowchart", max_steps=15):
    """
    Generate a process flowchart with decision points and parallel processes
    """
    if not nlp:
        raise Exception("Flowchart models not available")
    
    if not text or len(text.strip()) < 50:
        raise ValueError("Text is too short to generate flowchart")
    
    try:
        logger.info("📊 Generating PROCESS flowchart...")
        
        doc = nlp(text[:10000])
        
        # Extract process steps
        steps = []
        decisions = []
        
        for sent in doc.sents:
            sent_text = sent.text.strip()
            
            # Identify decision points (if/whether/choose)
            if any(word in sent_text.lower() for word in ['if', 'whether', 'decide', 'choose', 'either']):
                decisions.append(sent_text)
            
            # Identify action steps (verbs)
            elif any(token.pos_ == 'VERB' for token in sent):
                steps.append(sent_text)
            
            if len(steps) + len(decisions) >= max_steps:
                break
        
        logger.info(f"✅ Extracted {len(steps)} steps and {len(decisions)} decisions")
        
        # Create nodes
        nodes = []
        edges = []
        
        # Start node
        nodes.append({
            'id': 'start',
            'label': 'Start',
            'type': 'start',
            'color': '#10b981',
            'shape': 'ellipse',
            'size': 25
        })
        
        current_id = 'start'
        node_counter = 0
        
        # Interleave steps and decisions
        combined = []
        step_idx = 0
        decision_idx = 0
        
        while step_idx < len(steps) or decision_idx < len(decisions):
            if step_idx < len(steps):
                combined.append(('step', steps[step_idx]))
                step_idx += 1
            
            if decision_idx < len(decisions) and len(combined) % 3 == 0:
                combined.append(('decision', decisions[decision_idx]))
                decision_idx += 1
        
        # Create nodes for combined elements
        for item_type, text in combined[:max_steps]:
            node_counter += 1
            node_id = f'{item_type}_{node_counter}'
            
            # Shorten label
            label = text if len(text) < 60 else text[:57] + '...'
            
            if item_type == 'step':
                nodes.append({
                    'id': node_id,
                    'label': label,
                    'type': 'process',
                    'color': '#3b82f6',
                    'shape': 'box',
                    'size': 20
                })
                
                # Connect from previous
                edges.append({
                    'from': current_id,
                    'to': node_id,
                    'arrows': 'to',
                    'width': 2
                })
                
                current_id = node_id
            
            elif item_type == 'decision':
                nodes.append({
                    'id': node_id,
                    'label': label,
                    'type': 'decision',
                    'color': '#f59e0b',
                    'shape': 'diamond',
                    'size': 25
                })
                
                # Connect from previous
                edges.append({
                    'from': current_id,
                    'to': node_id,
                    'arrows': 'to',
                    'width': 2
                })
                
                # Create two branches
                yes_id = f'step_{node_counter + 1}'
                no_id = f'step_{node_counter + 2}'
                
                # Yes branch
                if step_idx < len(steps):
                    label_yes = steps[step_idx][:57] + '...' if len(steps[step_idx]) > 60 else steps[step_idx]
                    nodes.append({
                        'id': yes_id,
                        'label': label_yes,
                        'type': 'process',
                        'color': '#10b981',
                        'shape': 'box',
                        'size': 20
                    })
                    edges.append({
                        'from': node_id,
                        'to': yes_id,
                        'arrows': 'to',
                        'label': 'Yes',
                        'width': 2,
                        'color': '#10b981'
                    })
                    step_idx += 1
                    node_counter += 1
                
                # No branch
                if step_idx < len(steps):
                    label_no = steps[step_idx][:57] + '...' if len(steps[step_idx]) > 60 else steps[step_idx]
                    nodes.append({
                        'id': no_id,
                        'label': label_no,
                        'type': 'process',
                        'color': '#ef4444',
                        'shape': 'box',
                        'size': 20
                    })
                    edges.append({
                        'from': node_id,
                        'to': no_id,
                        'arrows': 'to',
                        'label': 'No',
                        'width': 2,
                        'color': '#ef4444'
                    })
                    step_idx += 1
                    node_counter += 1
                
                current_id = yes_id  # Continue from yes branch
        
        # End node
        nodes.append({
            'id': 'end',
            'label': 'End',
            'type': 'end',
            'color': '#ef4444',
            'shape': 'ellipse',
            'size': 25
        })
        
        edges.append({
            'from': current_id,
            'to': 'end',
            'arrows': 'to',
            'width': 2
        })
        
        logger.info(f"✅ Created flowchart: {len(nodes)} nodes, {len(edges)} edges")
        
        return {
            'title': title,
            'nodes': nodes,
            'edges': edges,
            'type': 'flowchart'
        }
        
    except Exception as e:
        logger.error(f"❌ Flowchart generation error: {str(e)}")
        raise Exception(f"Failed to generate flowchart: {str(e)}")

def get_topic_color(index):
    """Get color for main topic nodes"""
    colors = [
        '#ec4899',  # pink
        '#8b5cf6',  # purple
        '#3b82f6',  # blue
        '#10b981',  # green
        '#f59e0b',  # amber
    ]
    return colors[index % len(colors)]

def get_keyword_color(score):
    """Get color based on keyword importance score"""
    if score > 0.7:
        return '#8b5cf6'  # High importance - purple
    elif score > 0.4:
        return '#3b82f6'  # Medium importance - blue
    else:
        return '#64748b'  # Low importance - gray

def are_related_enhanced(word1, word2, doc):
    """Enhanced relationship detection"""
    word1_lower = word1.lower()
    word2_lower = word2.lower()
    
    # Check co-occurrence in sentences
    for sent in doc.sents:
        sent_text = sent.text.lower()
        if word1_lower in sent_text and word2_lower in sent_text:
            words = sent_text.split()
            try:
                # Check proximity
                positions1 = [i for i, w in enumerate(words) if word1_lower in w]
                positions2 = [i for i, w in enumerate(words) if word2_lower in w]
                
                for p1 in positions1:
                    for p2 in positions2:
                        if abs(p1 - p2) <= 7:  # Within 7 words
                            return True
            except:
                continue
    
    return False