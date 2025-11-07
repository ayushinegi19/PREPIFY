#!/usr/bin/env python3
"""
RUN THIS SCRIPT ONCE TO FIX ALL EXISTING MINDMAPS
Usage: python recalculate_mindmaps.py
"""

import os
import sys
from pymongo import MongoClient
import math

# MongoDB connection
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/prepify')
client = MongoClient(MONGO_URI)
db = client.get_database()

def calculate_node_positions_fixed(nodes, edges, canvas_width=5000, canvas_height=4000):
    """
    ACTUAL FIXED LAYOUT - ORGANIC RADIAL
    """
    center_x = canvas_width / 2
    center_y = canvas_height / 2
    
    # Separate by levels
    level0 = [n for n in nodes if n.get('level') == 0]
    level1 = [n for n in nodes if n.get('level') == 1]
    level2 = [n for n in nodes if n.get('level') == 2]
    
    # Place center
    for node in level0:
        node['x'] = center_x
        node['y'] = center_y
    
    if not level1:
        return nodes
    
    # LEVEL 1: Full circle around center
    num_main = len(level1)
    radius_main = 1000  # Large radius
    
    print(f"  Placing {num_main} main nodes in circle (radius={radius_main})")
    
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
        
        print(f"  Placing {len(children)} children around {parent['id']}")
        
        # Parent's angle from center
        parent_angle = math.atan2(parent['y'] - center_y, parent['x'] - center_x)
        
        num_children = len(children)
        
        # Spread children in arc around parent
        arc_spread = math.pi / 3  # 60 degrees total
        
        for i, child in enumerate(children):
            if num_children == 1:
                offset = 0
            else:
                offset = (i - (num_children - 1) / 2) * (arc_spread / (num_children - 1))
            
            child_angle = parent_angle + offset
            child['x'] = parent['x'] + radius_sub * math.cos(child_angle)
            child['y'] = parent['y'] + radius_sub * math.sin(child_angle)
    
    return nodes

def calculate_flowchart_positions_fixed(nodes, edges, canvas_width=1800):
    """
    FIXED FLOWCHART - NO OVERLAPS
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

def recalculate_all_mindmaps():
    """
    Recalculate positions for all mindmaps in database
    """
    mindmaps_collection = db['mindmaps']
    
    # Get all mindmaps
    mindmaps = list(mindmaps_collection.find({}))
    
    if not mindmaps:
        print("No mindmaps found in database")
        return
    
    print(f"Found {len(mindmaps)} mindmaps to recalculate\n")
    
    for i, mindmap in enumerate(mindmaps, 1):
        mindmap_id = mindmap['_id']
        mindmap_type = mindmap.get('type', 'mindmap')
        title = mindmap.get('title', 'Untitled')
        
        print(f"[{i}/{len(mindmaps)}] Processing: {title} (type: {mindmap_type})")
        
        nodes = mindmap.get('nodes', [])
        edges = mindmap.get('edges', [])
        
        if not nodes:
            print("  ⚠️  No nodes found, skipping")
            continue
        
        # Recalculate positions
        if mindmap_type == 'flowchart':
            canvas_width = 1800
            nodes, canvas_height = calculate_flowchart_positions_fixed(nodes, edges, canvas_width)
        else:
            canvas_width = 5000
            canvas_height = 4000
            nodes = calculate_node_positions_fixed(nodes, edges, canvas_width, canvas_height)
        
        # Update in database
        result = mindmaps_collection.update_one(
            {'_id': mindmap_id},
            {
                '$set': {
                    'nodes': nodes,
                    'canvas_width': canvas_width,
                    'canvas_height': canvas_height
                }
            }
        )
        
        if result.modified_count > 0:
            print(f"  ✅ Updated successfully")
        else:
            print(f"  ⚠️  No changes made")
        
        print()
    
    print(f"\n✅ Recalculation complete! Updated {len(mindmaps)} mindmaps")
    print("Refresh your browser to see the changes")

if __name__ == '__main__':
    print("=" * 60)
    print("MINDMAP POSITION RECALCULATION SCRIPT")
    print("=" * 60)
    print()
    
    try:
        recalculate_all_mindmaps()
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)