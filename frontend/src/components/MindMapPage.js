import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import './MindMapPage.css';

const MindMapPage = ({ mindmapId, onBack }) => {
  const [mindmap, setMindmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (mindmapId) {
      fetchMindmap();
    }
  }, [mindmapId]);

  useEffect(() => {
    if (mindmap && canvasRef.current) {
      renderMindMap();
    }
  }, [mindmap, zoom]);

  const fetchMindmap = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/uploads/mindmap/${mindmapId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Mindmap data received:', data.mindmap);
        setMindmap(data.mindmap);
      } else {
        console.error('Failed to fetch mindmap');
      }
    } catch (error) {
      console.error('Error fetching mindmap:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMindMap = () => {
    const canvas = canvasRef.current;
    if (!canvas || !mindmap) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // Apply zoom and center
    const centerX = width / 2;
    const centerY = height / 2;
    
    ctx.translate(centerX, centerY);
    ctx.scale(zoom, zoom);
    ctx.translate(-centerX, -centerY);

    // Calculate node positions
    const positions = {};
    const nodes = mindmap.nodes || [];
    const edges = mindmap.edges || [];

    // Find central node
    const centralNode = nodes.find(n => n.level === 0 || n.id === 'central' || n.id === 'start');
    const otherNodes = nodes.filter(n => n.id !== centralNode?.id);

    if (centralNode) {
      positions[centralNode.id] = { x: centerX, y: centerY };
    }

    // Arrange other nodes in a circle around center
    const radius = 200;
    otherNodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / otherNodes.length;
      positions[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    // Draw edges first (so they appear behind nodes)
    edges.forEach(edge => {
      const fromPos = positions[edge.from];
      const toPos = positions[edge.to];

      if (fromPos && toPos) {
        ctx.beginPath();
        ctx.moveTo(fromPos.x, fromPos.y);
        ctx.lineTo(toPos.x, toPos.y);
        
        // Style based on edge properties
        ctx.strokeStyle = edge.color || '#8b5cf6';
        ctx.lineWidth = edge.width || 2;
        
        if (edge.dashes || edge.dashed) {
          ctx.setLineDash([5, 5]);
        } else {
          ctx.setLineDash([]);
        }
        
        ctx.stroke();
        
        // Draw arrow if specified
        if (edge.arrows === 'to') {
          drawArrow(ctx, fromPos, toPos, edge.color || '#8b5cf6');
        }
      }
    });

    // Reset line dash
    ctx.setLineDash([]);

    // Draw nodes
    nodes.forEach(node => {
      const pos = positions[node.id];
      if (!pos) return;

      const nodeSize = node.size || 20;
      const nodeColor = node.color || '#8b5cf6';

      // Draw node circle/shape
      ctx.beginPath();
      
      if (node.shape === 'ellipse') {
        // Draw ellipse for start/end nodes
        ctx.ellipse(pos.x, pos.y, nodeSize * 1.5, nodeSize, 0, 0, 2 * Math.PI);
      } else {
        // Draw circle for regular nodes
        ctx.arc(pos.x, pos.y, nodeSize, 0, 2 * Math.PI);
      }
      
      ctx.fillStyle = nodeColor;
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw label
      ctx.fillStyle = '#1e293b';
      ctx.font = node.level === 0 ? 'bold 16px Arial' : '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Draw text background for better readability
      const textMetrics = ctx.measureText(node.label);
      const textWidth = textMetrics.width;
      const textHeight = 20;
      const textX = pos.x;
      const textY = pos.y + nodeSize + 15;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(textX - textWidth/2 - 5, textY - textHeight/2, textWidth + 10, textHeight);
      
      ctx.fillStyle = '#1e293b';
      ctx.fillText(node.label, textX, textY);
    });

    ctx.restore();
  };

  const drawArrow = (ctx, from, to, color) => {
    const headlen = 10;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headlen * Math.cos(angle - Math.PI / 6),
      to.y - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      to.x - headlen * Math.cos(angle + Math.PI / 6),
      to.y - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    const fileName = mindmap.document_name 
      ? `${mindmap.type}_${mindmap.document_name.replace(/\.[^/.]+$/, '')}.png`
      : `${mindmap.type}_${mindmap.title}.png`;
    link.download = fileName;
    link.href = canvas.toDataURL();
    link.click();
  };

  if (loading) {
    return (
      <div className="mindmap-page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading {mindmap?.type || 'mind map'}...</p>
        </div>
      </div>
    );
  }

  if (!mindmap) {
    return (
      <div className="mindmap-page-container">
        <div className="no-mindmap">
          <h3>Mind map not found</h3>
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mindmap-page-container">
      <div className="mindmap-content">
        <div className="mindmap-header">
          <button className="back-button" onClick={onBack}>
            <ArrowLeft size={20} />
            Back
          </button>

          <div className="mindmap-title-section">
            <h2>{mindmap.title}</h2>
            <p>{mindmap.type === 'mindmap' ? 'Mind Map' : 'Flowchart'}</p>
          </div>

          <div className="mindmap-controls">
            <button className="control-btn" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut size={20} />
            </button>
            <button className="control-btn" onClick={handleReset} title="Reset Zoom">
              <Maximize2 size={20} />
            </button>
            <button className="control-btn" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn size={20} />
            </button>
            <button className="download-btn" onClick={handleDownload}>
              <Download size={20} />
              Download
            </button>
          </div>
        </div>

        <div className="mindmap-canvas-container">
          <canvas
            ref={canvasRef}
            width={1200}
            height={800}
            className="mindmap-canvas"
          />
        </div>

        <div className="mindmap-legend">
          <h4>Legend</h4>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-circle central"></div>
              <span>Central Concept</span>
            </div>
            <div className="legend-item">
              <div className="legend-line solid"></div>
              <span>Direct Connection</span>
            </div>
            {mindmap.type === 'mindmap' && (
              <div className="legend-item">
                <div className="legend-line dashed"></div>
                <span>Related Concept</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MindMapPage;