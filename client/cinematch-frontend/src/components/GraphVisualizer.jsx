import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { X, Network, ZoomIn, ZoomOut, RefreshCw, Info, Sparkles, Layers } from 'lucide-react';
import { fetchMovieGraph } from '../services/api';

const NODE_COLORS = {
  Movie: '#6366f1',     
  Person: '#06b6d4',    
  Genre: '#f59e0b',    
  Theater: '#f43f5e',   
  Showtime: '#10b981',  
  SeatType: '#8b5cf6',  
  User: '#a855f7',      
};

export default function GraphVisualizer({ movie, onClose }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const graphRef = useRef();

  useEffect(() => {
    const loadGraph = async () => {
      if (!movie?.id) return;
      setLoading(true);
      try {
        const res = await fetchMovieGraph(movie.id);
        if (res.data?.data) {
          setGraphData(res.data.data);
        }
      } catch (error) {
        console.error("Failed to load graph data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadGraph();
  }, [movie]);

  const handleZoomIn = () => {
    if (graphRef.current) graphRef.current.zoom(graphRef.current.zoom() * 1.3, 400);
  };

  const handleZoomOut = () => {
    if (graphRef.current) graphRef.current.zoom(graphRef.current.zoom() / 1.3, 400);
  };

  const handleResetZoom = () => {
    if (graphRef.current) graphRef.current.zoomToFit(400, 50);
  };

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const renderNodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const isMain = node.group === 'Movie';
    const isSelected = selectedNode?.id === node.id;
    const isHovered = hoveredNode?.id === node.id;
    const baseRadius = isMain ? 10 : isSelected ? 9 : 7;
    const color = NODE_COLORS[node.group] || '#94a3b8';

    // Draw glowing aura ring for central node or selected node
    if (isMain || isSelected || isHovered) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, baseRadius + (4 / globalScale), 0, 2 * Math.PI, false);
      ctx.fillStyle = isMain ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.2)';
      ctx.fill();
    }

    // Draw main circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, baseRadius, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();

    // Draw border
    ctx.lineWidth = 1.5 / globalScale;
    ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(15, 23, 42, 0.8)';
    ctx.stroke();

    // Render node label
    const label = `${node.name}`;
    const fontSize = (isMain ? 12 : 10) / globalScale;
    ctx.font = `${isMain ? 'bold' : 'normal'} ${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = isSelected ? '#38bdf8' : isMain ? '#ffffff' : '#cbd5e1';
    ctx.fillText(label, node.x + baseRadius + 4, node.y + (fontSize / 3));
  }, [selectedNode, hoveredNode]);

  
  const nodeCounts = graphData.nodes.reduce((acc, node) => {
    acc[node.group] = (acc[node.group] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-6xl h-[90vh] rounded-3xl flex flex-col overflow-hidden shadow-2xl relative">
        
        
        <div className="px-6 py-4 bg-slate-900/95 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white">Graph Topology: {movie?.title}</h2>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  {graphData.nodes.length} Nodes • {graphData.links.length} Links
                </span>
              </div>
              <p className="text-xs text-slate-400">Interactive 2-Hop Neo4j Knowledge Graph Traversal</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

      
        <div className="px-6 py-2.5 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-slate-400 font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" /> Node Groups:
            </span>
            {Object.entries(NODE_COLORS).map(([group, color]) => (
              <div key={group} className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-lg">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-slate-300 font-medium">{group}</span>
                <span className="text-[10px] text-slate-500 font-mono">({nodeCounts[group] || 0})</span>
              </div>
            ))}
          </div>

         
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button onClick={handleZoomIn} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors" title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={handleZoomOut} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors" title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button onClick={handleResetZoom} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors" title="Fit to Screen">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

      
        <div className="flex-1 bg-slate-950 relative overflow-hidden flex">
          {loading ? (
            <div className="flex flex-col items-center justify-center w-full h-full text-slate-400 gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <span className="text-sm font-semibold">Traversing Neo4j Graph Network...</span>
            </div>
          ) : (
            <>
              <div className="flex-1 h-full">
                <ForceGraph2D
                  ref={graphRef}
                  graphData={graphData}
                  nodeCanvasObject={renderNodeCanvasObject}
                  onNodeClick={handleNodeClick}
                  onNodeHover={setHoveredNode}
                  linkColor={() => 'rgba(100, 116, 139, 0.35)'}
                  linkWidth={1.5}
                  linkLabel={link => link.label || ''}
                  cooldownTicks={100}
                  onEngineStop={() => graphRef.current?.zoomToFit(400, 40)}
                />
              </div>

             
              {selectedNode && (
                <div className="w-72 bg-slate-900/95 border-l border-slate-800 p-5 flex flex-col gap-4 overflow-y-auto shrink-0 shadow-2xl">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: NODE_COLORS[selectedNode.group] }}>
                      {selectedNode.group}
                    </span>
                    <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white">{selectedNode.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {selectedNode.id}</p>
                  </div>

                  <div className="border-t border-slate-800 pt-3 text-xs text-slate-300 flex flex-col gap-2">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-indigo-400" /> Graph Connections
                    </span>
                    
                    {graphData.links
                      .filter(l => (typeof l.source === 'object' ? l.source.id : l.source) === selectedNode.id || (typeof l.target === 'object' ? l.target.id : l.target) === selectedNode.id)
                      .map((l, idx) => {
                        const targetId = (typeof l.source === 'object' ? l.source.id : l.source) === selectedNode.id 
                          ? (typeof l.target === 'object' ? l.target.name : l.target) 
                          : (typeof l.source === 'object' ? l.source.name : l.source);
                        return (
                          <div key={idx} className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 flex justify-between items-center">
                            <span className="font-medium text-white">{targetId}</span>
                            <span className="text-[10px] text-indigo-400 font-mono">{l.label || 'CONNECTED'}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}