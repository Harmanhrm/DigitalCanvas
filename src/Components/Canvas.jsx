import { useState, useRef } from 'react';
import './Canvas.css';

const Canvas = () => {
    const [selectedTool, setSelectedTool] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState(null);
    const [shapes, setShapes] = useState([]);
    const canvasRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [mouseDownTime, setMouseDownTime] = useState(null); 
    const [selectedShapeId, setSelectedShapeId] = useState(null);
    
    // For connecting nodes of different shapes
    const [connections, setConnections] = useState([]);
    const [connectingFrom, setConnectingFrom] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);

    const TOOLS = {
        RECTANGLE: 'rectangle',
        ARROW: 'arrow-shape'
    };
    const [showNodes, setShowNodes] = useState(false);
    const handleNodeClick = (e, shapeId, nodePosition) => {
        e.stopPropagation();
        
        if (!connectingFrom) {
            setConnectingFrom({ shapeId, nodePosition });
            setIsConnecting(true);
        } else {
            // Create new connection
            setConnections(prev => [...prev, {
                id: Date.now(),
                from: connectingFrom,
                to: { shapeId, nodePosition }
            }]);
            setConnectingFrom(null);
            setIsConnecting(false);
        }
    };
    const renderConnections = () => {
        return connections.map(connection => (
            <svg
                key={connection.id}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none'
                }}
            >
                <line
                    x1={getNodePosition(connection.from).x}
                    y1={getNodePosition(connection.from).y}
                    x2={getNodePosition(connection.to).x}
                    y2={getNodePosition(connection.to).y}
                    stroke="black"
                    strokeWidth="2"
                />
            </svg>
        ));
    };
    
    // Helper to get node position
    const getNodePosition = (nodeInfo) => {
        const shape = shapes.find(s => s.id === nodeInfo.shapeId);
        if (!shape) return { x: 0, y: 0 };
    
        switch (nodeInfo.nodePosition) {
            case 'left':
                return { x: shape.x, y: shape.y + shape.height/2 };
            case 'right':
                return { x: shape.x + shape.width, y: shape.y + shape.height/2 };
            case 'top':
                return { x: shape.x + shape.width/2, y: shape.y };
            case 'bottom':
                return { x: shape.x + shape.width/2, y: shape.y + shape.height };
            default:
                return { x: 0, y: 0 };
        }
    };
    const getCanvasPosition = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };
    const handleShapeClick = (e, shapeId) => {
        e.stopPropagation();  
        setSelectedShapeId(shapeId);
    }
    const handleCanvasClick = (e) => {
        setSelectedShapeId(null)
    }
    const handleMouseDown = (e) => {
        const pos = getCanvasPosition(e);
        setStartPos(pos);
        if (selectedTool) {
            e.preventDefault();
            e.stopPropagation();
            setIsDrawing(true);
            setIsDragging(false);
            setMouseDownTime(Date.now());  
            
            const newShape = {
                id: Date.now(),
                type: selectedTool,
                startX: pos.x,
                startY: pos.y,
                x: pos.x,
                y: pos.y,
                width: 0,
                height: selectedTool === TOOLS.ARROW_SHAPE ? 20 : 0
            };
            setShapes(prev => [...prev, newShape]);
        }
        else if (selectedShapeId) {
            setIsDragging(true);
            e.preventDefault();
            e.stopPropagation();
        }
    };

    const handleMouseMove = (e) => {
        if (!startPos) return;

        const currentPos = getCanvasPosition(e);
        if (isDrawing && startPos) {
            setIsDragging(true);
            e.preventDefault();
            e.stopPropagation();
            const currentPos = getCanvasPosition(e);
            
            setShapes(prev => {
                const updated = [...prev];
                const currentShape = updated[updated.length - 1];
                
                if (currentShape) {
                    const width = currentPos.x - currentShape.startX;
                    const height = currentPos.y - currentShape.startY;
                    
                    currentShape.x = width < 0 ? currentPos.x : currentShape.startX;
                    currentShape.y = height < 0 ? currentPos.y : currentShape.startY;
                    currentShape.width = Math.abs(width);
                    currentShape.height = Math.abs(height);
                }
                
                return updated;
            });
        }
        else if (isDragging && selectedShapeId) {
            e.preventDefault();
            e.stopPropagation();
            const dx = currentPos.x - startPos.x;
        const dy = currentPos.y - startPos.y;

        setShapes(prev => prev.map(shape => {
            if (shape.id === selectedShapeId) {
                return {
                    ...shape,
                    x: shape.x + dx,
                    y: shape.y + dy,
                    startX: shape.startX + dx,
                    startY: shape.startY + dy
                };
            }
            return shape;
        }));
        
        setStartPos(currentPos);
        }
    };

    const handleMouseUp = () => {
        if (isDrawing) {
            const wasQuickClick = Date.now() - mouseDownTime < 200;
            
            if (wasQuickClick) {
                setShapes(prev => {
                    const updated = [...prev];
                    const currentShape = updated[updated.length - 1];
                    if (currentShape) {
                        currentShape.width = currentShape.type === TOOLS.ARROW_SHAPE ? 100 : 100;
                    currentShape.height = currentShape.type === TOOLS.ARROW_SHAPE ? 20 : 50;
                    }
                    return updated;
                });
            }
    
            setIsDrawing(false);
            setSelectedTool(null);
            setMouseDownTime(null);
        }
        
        setIsDragging(false);
        setStartPos(null);
    };

    const handleClick = (e) => {
        // We'll handle shape creation in mouseUp now
        if (isDragging) {
            setIsDragging(false);
        }
        handleCanvasClick();
    };

    const renderShape = (shape) => {
        const isSelected = shape.id === selectedShapeId;
        
        const ConnectionNode = ({ position, nodePosition }) => {
            const nodeStyle = {
                position: 'absolute',
                width: '8px',
                height: '8px',
                backgroundColor: isSelected ? '#4a9eff' : 'transparent',
                border: '2px solid #4a9eff',
                borderRadius: '50%',
                cursor: 'pointer',
                ...position
            };
    
            return (
                <div 
                    style={nodeStyle} 
                    onClick={(e) => handleNodeClick(e, shape.id, nodePosition)}
                />
            );
        };
    
        switch (shape.type) {
            case TOOLS.RECTANGLE:
                return (
                    <div
                        style={{
                            position: 'absolute',
                            left: shape.x,
                            top: shape.y,
                            width: shape.width,
                            height: shape.height,
                            border: `1px solid ${isSelected ? 'blue' : 'black'}`,
                            pointerEvents: 'all',
                            cursor: isSelected ? 'move' : 'pointer'
                        }}
                        onClick={(e) => handleShapeClick(e, shape.id)}
                    >
                        {(isSelected && showNodes) && (
                            <>
                                <ConnectionNode 
                                    position={{ left: '-6px', top: 'calc(50% - 4px)' }}
                                    nodePosition="left"
                                />
                                <ConnectionNode 
                                    position={{ right: '-6px', top: 'calc(50% - 4px)' }}
                                    nodePosition="right"
                                />
                                <ConnectionNode 
                                    position={{ top: '-6px', left: 'calc(50% - 4px)' }}
                                    nodePosition="top"
                                />
                                <ConnectionNode 
                                    position={{ bottom: '-6px', left: 'calc(50% - 4px)' }}
                                    nodePosition="bottom"
                                />
                            </>
                        )}
                    </div>
                );
            case TOOLS.ARROW_SHAPE:
                return (
                    <div
                        style={{
                            position: 'absolute',
                            left: shape.x,
                            top: shape.y,
                            width: shape.width,
                            height: shape.height,
                            pointerEvents: 'all',
                            cursor: isSelected ? 'move' : 'pointer'
                        }}
                        onClick={(e) => handleShapeClick(e, shape.id)}
                    >
                        <svg
                            width="100%"
                            height="100%"
                            style={{ pointerEvents: 'none' }}
                        >
                            <defs>
                                <marker
                                    id={`arrowhead-${shape.id}`}
                                    markerWidth="10"
                                    markerHeight="7"
                                    refX="9"
                                    refY="3.5"
                                    orient="auto"
                                >
                                    <polygon 
                                        points="0 0, 10 3.5, 0 7" 
                                        fill={isSelected ? 'blue' : 'black'}
                                    />
                                </marker>
                            </defs>
                            <line
                                x1="0"
                                y1={shape.height / 2}
                                x2={shape.width}
                                y2={shape.height / 2}
                                stroke={isSelected ? 'blue' : 'black'}
                                strokeWidth="2"
                                markerEnd={`url(#arrowhead-${shape.id})`}
                            />
                        </svg>
                        {(isSelected && showNodes) && (
                            <>
                                <ConnectionNode 
                                    position={{ left: '-6px', top: 'calc(50% - 4px)' }}
                                    nodePosition="start"
                                />
                                <ConnectionNode 
                                    position={{ right: '-6px', top: 'calc(50% - 4px)' }}
                                    nodePosition="end"
                                />
                            </>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className='Canvas'>
            <div className='toolbar-top'>
                <button 
                    className={`tool-button ${selectedTool === TOOLS.RECTANGLE ? 'selected' : ''}`}
                    onClick={() => setSelectedTool(TOOLS.RECTANGLE)}
                >
                    Rectangle
                </button>
                <button 
                    className={`tool-button ${selectedTool === TOOLS.ARROW_SHAPE ? 'selected' : ''}`}
                    onClick={() => setSelectedTool(TOOLS.ARROW_SHAPE)}
                >
                    Arrow
                </button>
            </div>
            <div className='toolbar-bottom' />
            <div className='toolbar-right' />
            <div className='toolbar-left'>
                <button 
                    className={`tool-button ${showNodes ? 'selected' : ''}`}
                    onClick={() => setShowNodes(!showNodes)}
                >
                    {showNodes ? 'Hide Nodes' : 'Show Nodes'}
                </button>
            </div>
            <div 
                ref={canvasRef}
                className='innerCanvas'
                onClick={handleClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {renderConnections()}
                {shapes.map(shape => (
                    <div key={shape.id}>
                        {renderShape(shape)}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Canvas;