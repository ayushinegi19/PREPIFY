// MindMapPage.js - ALL TEXT VISIBLE, NO OVERLAPS
import React, { useState, useEffect, useRef } from 'react';
import { Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import './MindMapPage.css';

const MindMapPage = ({ mindmapId, onBack }) => {
  const [mindmap, setMindmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.5 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const transformRef = useRef(transform);
  
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    if (mindmapId) fetchMindmap();
  }, [mindmapId]);

  useEffect(() => {
    if (mindmap && canvasRef.current) renderVisualization();
  }, [mindmap, transform]);

  useEffect(() => {
    const resizeCanvas = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        if (mindmap) renderVisualization();
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [mindmap]);

  const fetchMindmap = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/uploads/mindmap/${mindmapId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMindmap(data.mindmap);
        
        const isFlowchart = data.mindmap.type === 'flowchart';
        const virtualWidth = data.mindmap.canvas_width || (isFlowchart ? 1800 : 5000);
        const initialZoom = 0.5;
        const initialPanX = (containerRef.current.clientWidth / 2) - (virtualWidth / 2) * initialZoom;
        const initialPanY = 100 * initialZoom;
        
        setTransform({ x: initialPanX, y: initialPanY, k: initialZoom });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const wrapText = (ctx, text, maxWidth) => {
    const lines = [];
    const preSplitLines = text.split('\n');
    for (const preSplitLine of preSplitLines) {
      const words = preSplitLine.split(' ');
      let currentLine = '';
      for (let word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
    }
    return lines;
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY, color = '#666') => {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  const renderVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas || !mindmap) return;
    
    const ctx = canvas.getContext('2d');
    const isFlowchart = mindmap.type === 'flowchart';

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    const nodes = mindmap.nodes || [];
    const edges = mindmap.edges || [];

    // Draw edges FIRST
    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) return;

      const edgeColor = edge.color || '#8b5cf6';
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 3;

      if (isFlowchart) {
        drawArrow(ctx, fromNode.x, fromNode.y, toNode.x, toNode.y, edgeColor);
        if (edge.label && (edge.label === 'Yes' || edge.label === 'No')) {
          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2;
          ctx.fillStyle = 'white';
          ctx.strokeStyle = edgeColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(midX - 28, midY - 14, 56, 28, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = edgeColor;
          ctx.font = 'bold 13px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(edge.label, midX, midY);
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = (edge.width || 2) * 2;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.restore();
    });

    // Draw nodes
    nodes.forEach(node => {
      if (node.x === undefined) return;

      const fontSize = isFlowchart ? 14 : (node.level === 0 ? 20 : (node.level === 1 ? 16 : 14));
      const fontWeight = node.level === 0 ? 'bold' : (node.level === 1 ? '600' : '500');
      ctx.font = `${fontWeight} ${fontSize}px Arial, sans-serif`;
      
      const maxWidth = isFlowchart ? 150 : 200;
      const lines = wrapText(ctx, node.label, maxWidth);
      const lineHeight = fontSize * 1.5;
      const textBlockHeight = lines.length * lineHeight;

      let textBlockWidth = 0;
      lines.forEach(line => {
        textBlockWidth = Math.max(textBlockWidth, ctx.measureText(line).width);
      });

      // Calculate shape size
      let shapeWidth, shapeHeight;
      const paddingX = 35;
      const paddingY = 28;

      if (node.shape === 'diamond') {
        shapeWidth = (textBlockWidth / 2) + paddingX + 20;
        shapeHeight = (textBlockHeight / 2) + paddingY + 15;
      } else if (node.shape === 'box') {
        shapeWidth = textBlockWidth + paddingX * 2;
        shapeHeight = textBlockHeight + paddingY * 2;
      } else if (node.shape === 'ellipse') {
        shapeWidth = (textBlockWidth / 2) + paddingX;
        shapeHeight = (textBlockHeight / 2) + paddingY;
      } else {
        const radius = Math.max((node.size || 20) * 1.5, (textBlockWidth / 2) + 25, (textBlockHeight / 2) + 25);
        shapeWidth = radius;
        shapeHeight = radius;
      }

      // Draw shape
      const nodeColor = node.color || '#8b5cf6';
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      
      if (node.shape === 'diamond') {
        ctx.moveTo(node.x, node.y - shapeHeight);
        ctx.lineTo(node.x + shapeWidth, node.y);
        ctx.lineTo(node.x, node.y + shapeHeight);
        ctx.lineTo(node.x - shapeWidth, node.y);
        ctx.closePath();
      } else if (node.shape === 'box') {
        const rectX = node.x - shapeWidth / 2;
        const rectY = node.y - shapeHeight / 2;
        const radius = 14;
        ctx.moveTo(rectX + radius, rectY);
        ctx.lineTo(rectX + shapeWidth - radius, rectY);
        ctx.quadraticCurveTo(rectX + shapeWidth, rectY, rectX + shapeWidth, rectY + radius);
        ctx.lineTo(rectX + shapeWidth, rectY + shapeHeight - radius);
        ctx.quadraticCurveTo(rectX + shapeWidth, rectY + shapeHeight, rectX + shapeWidth - radius, rectY + shapeHeight);
        ctx.lineTo(rectX + radius, rectY + shapeHeight);
        ctx.quadraticCurveTo(rectX, rectY + shapeHeight, rectX, rectY + shapeHeight - radius);
        ctx.lineTo(rectX, rectY + radius);
        ctx.quadraticCurveTo(rectX, rectY, rectX + radius, rectY);
        ctx.closePath();
      } else if (node.shape === 'ellipse') {
        ctx.ellipse(node.x, node.y, shapeWidth, shapeHeight, 0, 0, 2 * Math.PI);
      } else {
        ctx.arc(node.x, node.y, shapeWidth, 0, 2 * Math.PI);
      }
      
      const gradient = ctx.createRadialGradient(node.x - 20, node.y - 20, 0, node.x, node.y, shapeWidth * 2);
      gradient.addColorStop(0, lightenColor(nodeColor, 35));
      gradient.addColorStop(1, nodeColor);
      
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = darkenColor(nodeColor, 20);
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.restore();

      // Draw text INSIDE
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000000';
      ctx.font = `${fontWeight} ${fontSize}px Arial, sans-serif`;
      
      const textStartY = node.y - (textBlockHeight / 2) + (lineHeight / 2);
      
      lines.forEach((line, index) => {
        const lineY = textStartY + (index * lineHeight);
        // Add text shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 3;
        ctx.fillText(line, node.x, lineY);
      });
      
      ctx.restore();
    });

    ctx.restore();
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.nativeEvent.offsetX - transformRef.current.x, y: e.nativeEvent.offsetY - transformRef.current.y });
  };
  
  const handleMouseMove = (e) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.nativeEvent.offsetX - dragStart.x,
        y: e.nativeEvent.offsetY - dragStart.y
      }));
    }
  };
  
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);
  
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const { offsetX, offsetY } = e.nativeEvent;
    const currentTransform = transformRef.current;
    const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
    const newZoom = Math.max(0.1, Math.min(currentTransform.k + delta, 3));
    const wx = (offsetX - currentTransform.x) / currentTransform.k;
    const wy = (offsetY - currentTransform.y) / currentTransform.k;
    const newX = offsetX - wx * newZoom;
    const newY = offsetY - wy * newZoom;
    setTransform({ x: newX, y: newY, k: newZoom });
  };
  
  const handleZoomIn = () => setTransform(prev => ({ ...prev, k: Math.min(prev.k * 1.5, 3) }));
  const handleZoomOut = () => setTransform(prev => ({ ...prev, k: Math.max(prev.k / 1.5, 0.1) }));
  const handleReset = () => { 
    const isFlowchart = mindmap.type === 'flowchart';
    const virtualWidth = mindmap.canvas_width || (isFlowchart ? 1800 : 5000);
    const initialZoom = 0.5;
    const initialPanX = (containerRef.current.clientWidth / 2) - (virtualWidth / 2) * initialZoom;
    const initialPanY = 100 * initialZoom;
    setTransform({ x: initialPanX, y: initialPanY, k: initialZoom });
  };

  const handleDownload = () => {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    const isFlowchart = mindmap.type === 'flowchart';
    const virtualWidth = mindmap.canvas_width || (isFlowchart ? 1800 : 5000);
    const virtualHeight = mindmap.canvas_height || (isFlowchart ? 1400 : 4000);
    
    tempCanvas.width = virtualWidth;
    tempCanvas.height = virtualHeight;
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, virtualWidth, virtualHeight);

    // Reuse the same rendering logic...
    const nodes = mindmap.nodes || [];
    const edges = mindmap.edges || [];
    
    edges.forEach(edge => {
      const from = nodes.find(n => n.id === edge.from);
      const to = nodes.find(n => n.id === edge.to);
      if (!from || !to) return;
      const color = edge.color || '#8b5cf6';
      if (isFlowchart) {
        drawArrow(tempCtx, from.x, from.y, to.x, to.y, color);
      } else {
        tempCtx.beginPath();
        tempCtx.moveTo(from.x, from.y);
        tempCtx.lineTo(to.x, to.y);
        tempCtx.strokeStyle = color;
        tempCtx.lineWidth = (edge.width || 2) * 2;
        tempCtx.stroke();
      }
    });
    
    // Draw nodes (same as render)
    nodes.forEach(node => {
      const fontSize = isFlowchart ? 14 : (node.level === 0 ? 20 : (node.level === 1 ? 16 : 14));
      const fontWeight = node.level === 0 ? 'bold' : (node.level === 1 ? '600' : '500');
      tempCtx.font = `${fontWeight} ${fontSize}px Arial`;
      const maxWidth = isFlowchart ? 150 : 200;
      const lines = wrapText(tempCtx, node.label, maxWidth);
      const lineHeight = fontSize * 1.5;
      const textBlockHeight = lines.length * lineHeight;
      let textBlockWidth = 0;
      lines.forEach(line => { textBlockWidth = Math.max(textBlockWidth, tempCtx.measureText(line).width); });
      
      const paddingX = 35, paddingY = 28;
      let shapeWidth, shapeHeight;
      if (node.shape === 'diamond') {
        shapeWidth = (textBlockWidth / 2) + paddingX + 20;
        shapeHeight = (textBlockHeight / 2) + paddingY + 15;
      } else if (node.shape === 'box') {
        shapeWidth = textBlockWidth + paddingX * 2;
        shapeHeight = textBlockHeight + paddingY * 2;
      } else if (node.shape === 'ellipse') {
        shapeWidth = (textBlockWidth / 2) + paddingX;
        shapeHeight = (textBlockHeight / 2) + paddingY;
      } else {
        shapeWidth = Math.max((node.size || 20) * 1.5, (textBlockWidth / 2) + 25);
        shapeHeight = shapeWidth;
      }
      
      const nodeColor = node.color || '#8b5cf6';
      tempCtx.beginPath();
      if (node.shape === 'diamond') {
        tempCtx.moveTo(node.x, node.y - shapeHeight);
        tempCtx.lineTo(node.x + shapeWidth, node.y);
        tempCtx.lineTo(node.x, node.y + shapeHeight);
        tempCtx.lineTo(node.x - shapeWidth, node.y);
        tempCtx.closePath();
      } else if (node.shape === 'box') {
        const rx = node.x - shapeWidth / 2, ry = node.y - shapeHeight / 2, r = 14;
        tempCtx.moveTo(rx + r, ry);
        tempCtx.lineTo(rx + shapeWidth - r, ry);
        tempCtx.quadraticCurveTo(rx + shapeWidth, ry, rx + shapeWidth, ry + r);
        tempCtx.lineTo(rx + shapeWidth, ry + shapeHeight - r);
        tempCtx.quadraticCurveTo(rx + shapeWidth, ry + shapeHeight, rx + shapeWidth - r, ry + shapeHeight);
        tempCtx.lineTo(rx + r, ry + shapeHeight);
        tempCtx.quadraticCurveTo(rx, ry + shapeHeight, rx, ry + shapeHeight - r);
        tempCtx.lineTo(rx, ry + r);
        tempCtx.quadraticCurveTo(rx, ry, rx + r, ry);
        tempCtx.closePath();
      } else if (node.shape === 'ellipse') {
        tempCtx.ellipse(node.x, node.y, shapeWidth, shapeHeight, 0, 0, 2 * Math.PI);
      } else {
        tempCtx.arc(node.x, node.y, shapeWidth, 0, 2 * Math.PI);
      }
      
      const grad = tempCtx.createRadialGradient(node.x - 20, node.y - 20, 0, node.x, node.y, shapeWidth * 2);
      grad.addColorStop(0, lightenColor(nodeColor, 35));
      grad.addColorStop(1, nodeColor);
      tempCtx.fillStyle = grad;
      tempCtx.fill();
      tempCtx.strokeStyle = darkenColor(nodeColor, 20);
      tempCtx.lineWidth = 3.5;
      tempCtx.stroke();
      
      tempCtx.textAlign = 'center';
      tempCtx.textBaseline = 'middle';
      tempCtx.fillStyle = '#FFFFFF';
      const textStartY = node.y - (textBlockHeight / 2) + (lineHeight / 2);
      lines.forEach((line, i) => {
        tempCtx.fillText(line, node.x, textStartY + i * lineHeight);
      });
    });

    const link = document.createElement('a');
    link.download = `${mindmap.type}_${mindmap.title}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  };

  if (loading) return <div className="mindmap-page-container"><div className="loading-state"><div className="spinner"></div><p>Loading...</p></div></div>;
  if (!mindmap) return <div className="mindmap-page-container"><div className="no-mindmap"><h3>Not found</h3><button className="back-btn" onClick={onBack}>Go Back</button></div></div>;

  return (
    <div className="mindmap-page-container">
      <div className="mindmap-content">
        <div className="mindmap-controls">
          <button className="control-btn" onClick={handleZoomOut}><ZoomOut size={18} /></button>
          <button className="control-btn" onClick={handleReset}><Maximize2 size={18} /></button>
          <button className="control-btn" onClick={handleZoomIn}><ZoomIn size={18} /></button>
          <button className="download-btn" onClick={handleDownload}><Download size={18} /> <span>Download</span></button>
        </div>
        <div ref={containerRef} className="mindmap-canvas-container" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} onWheel={handleWheel}>
          <canvas ref={canvasRef} className="mindmap-canvas" style={{ cursor: isDragging ? 'grabbing' : 'grab' }} />
        </div>
        <div className="mindmap-legend">
          <h4>Legend</h4>
          <div className="legend-items">
            {mindmap.type === 'mindmap' ? (
              <>
                <div className="legend-item"><div className="legend-circle central"></div><span>Central Topic</span></div>
                <div className="legend-item"><div className="legend-circle" style={{background: '#ec4899'}}></div><span>Main Topics</span></div>
                <div className="legend-item"><div className="legend-circle" style={{background: '#93c5fd'}}></div><span>Subtopics</span></div>
              </>
            ) : (
              <>
                <div className="legend-item"><div className="legend-circle" style={{background: '#10b981', borderRadius: '50%'}}></div><span>Start/End</span></div>
                <div className="legend-item"><div className="legend-circle" style={{background: '#3b82f6', borderRadius: '4px'}}></div><span>Process</span></div>
                <div className="legend-item"><div className="legend-circle" style={{background: '#f59e0b', transform: 'rotate(45deg)'}}></div><span>Decision</span></div>
              </>
            )}
          </div>
          <p style={{marginTop: '0.75rem', color: '#64748b', fontSize: '0.85rem'}}>💡 Drag to pan • Scroll to zoom</p>
        </div>
      </div>
    </div>
  );
};

const lightenColor = (hex, percent) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, ((num >> 16) & 0xff) + amt);
  const G = Math.min(255, ((num >> 8) & 0xff) + amt);
  const B = Math.min(255, (num & 0xff) + amt);
  return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
};

const darkenColor = (hex, percent) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, ((num >> 16) & 0xff) - amt);
  const G = Math.max(0, ((num >> 8) & 0xff) - amt);
  const B = Math.max(0, (num & 0xff) - amt);
  return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
};

export default MindMapPage;