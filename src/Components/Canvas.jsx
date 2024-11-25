import { useState, useRef } from 'react';
import './Canvas.css';

const Canvas = () => {
    const [selectedTool, setSelectedTool] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState(null);
    const [shapes, setShapes] = useState([]);
    const canvasRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedEndpoint, setDraggedEndpoint] = useState(null);
    const [mouseDownTime, setMouseDownTime] = useState(null);
    const [selectedShapeId, setSelectedShapeId] = useState(null);
    const [showNodes, setShowNodes] = useState(false);

    const SNAP_DISTANCE = 20;
    const TOOLS = {
        RECTANGLE: 'rectangle',
        ARROW: 'arrow'
    };
    const getRectangleNodePosition = (shape, position) => {
        switch (position) {
            case 'left':
                return { x: shape.x, y: shape.y + shape.height/2 };
            case 'right':
                return { x: shape.x + shape.width, y: shape.y + shape.height/2 };
            case 'top':
                return { x: shape.x + shape.width/2, y: shape.y };
            case 'bottom':
                return { x: shape.x + shape.width/2, y: shape.y + shape.height };
            default:
                return null;
        }
    };
    const findNearestNode = (pos, shapes, currentShapeId) => {
        let nearest = null;
        let minDistance = SNAP_DISTANCE;
    
        shapes.forEach(shape => {
            if (shape.id !== currentShapeId && shape.type === TOOLS.RECTANGLE) {
                const nodePositions = ['left', 'right', 'top', 'bottom'];
                nodePositions.forEach(nodePos => {
                    const nodePoint = getRectangleNodePosition(shape, nodePos);
                    if (nodePoint) {
                        const distance = Math.sqrt(
                            Math.pow(pos.x - nodePoint.x, 2) + 
                            Math.pow(pos.y - nodePoint.y, 2)
                        );
                        
                        if (distance < minDistance) {
                            minDistance = distance;
                            nearest = { shape, position: nodePos, point: nodePoint };
                        }
                    }
                });
            }
        });
        
        return nearest;
    };
    const getCanvasPosition = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleMouseDown = (e) => {
        const pos = getCanvasPosition(e);
        
        // If we have a selected tool, prioritize drawing
        if (selectedTool) {
            e.preventDefault();
            e.stopPropagation();
            setIsDrawing(true);
            setIsDragging(false);
            setMouseDownTime(Date.now());
            setStartPos(pos);
            
            if (selectedTool === TOOLS.ARROW) {
                const newShape = {
                    id: Date.now(),
                    type: TOOLS.ARROW,
                    startX: pos.x,
                    startY: pos.y,
                    endX: pos.x,
                    endY: pos.y,
                    snappedStart: null,
                    snappedEnd: null
                };
                setShapes(prev => [...prev, newShape]);
            } else {
                const newShape = {
                    id: Date.now(),
                    type: TOOLS.RECTANGLE,
                    x: pos.x,
                    y: pos.y,
                    width: 0,
                    height: 0
                };
                setShapes(prev => [...prev, newShape]);
            }
            return; // Exit early to prevent other mouse down behavior
        } if (selectedShapeId && !draggedEndpoint) {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
    
            const shape = shapes.find(s => s.id === selectedShapeId);
            if (shape) {
                if (shape.type === TOOLS.RECTANGLE) {
                    setStartPos({
                        x: pos.x - shape.x,
                        y: pos.y - shape.y,
                        initialX: shape.x,
                        initialY: shape.y
                    });
                } else if (shape.type === TOOLS.ARROW) {
                    setStartPos({
                        x: pos.x,
                        y: pos.y,
                        startOffsetX: pos.x - shape.startX,
                        startOffsetY: pos.y - shape.startY,
                        endOffsetX: pos.x - shape.endX,
                        endOffsetY: pos.y - shape.endY
                    });
                }
            }
        } else {
            // Clicking on canvas or unselected shape
            setStartPos(pos);
        }
    };

    const handleMouseMove = (e) => {
        if (!startPos) return;

        const currentPos = getCanvasPosition(e);
        
        if (isDrawing && selectedTool === TOOLS.ARROW) {
            setShapes(prev => {
                const updated = [...prev];
                const currentShape = updated[updated.length - 1];
                if (currentShape) {
                    currentShape.endX = currentPos.x;
                    currentShape.endY = currentPos.y;
                }
                return updated;
            });
        } else if (isDrawing && selectedTool === TOOLS.RECTANGLE) {
            setShapes(prev => {
                const updated = [...prev];
                const currentShape = updated[updated.length - 1];
                
                if (currentShape) {
                    const width = currentPos.x - currentShape.x;
                    const height = currentPos.y - currentShape.y;
                    currentShape.width = Math.abs(width);
                    currentShape.height = Math.abs(height);
                    if (width < 0) currentShape.x = currentPos.x;
                    if (height < 0) currentShape.y = currentPos.y;
                }
                
                return updated;
            });
        } else if (isDragging && draggedEndpoint) {
            setShapes(prev => prev.map(shape => {
                if (shape.id === selectedShapeId) {
                    const nearestNode = findNearestNode(currentPos, prev, selectedShapeId);
                    const newPos = nearestNode ? nearestNode.point : currentPos;
                    
                    if (draggedEndpoint === 'start') {
                        return {
                            ...shape,
                            startX: newPos.x,
                            startY: newPos.y,
                            snappedStart: nearestNode ? {
                                shapeId: nearestNode.shape.id,
                                position: nearestNode.position
                            } : null
                        };
                    } else {
                        return {
                            ...shape,
                            endX: newPos.x,
                            endY: newPos.y,
                            snappedEnd: nearestNode ? {
                                shapeId: nearestNode.shape.id,
                                position: nearestNode.position
                            } : null
                        };
                    }
                }
                return shape;
            }));
        } else if (isDragging && selectedShapeId) {
            e.preventDefault();
            e.stopPropagation();
        
            setShapes(prev => {
                const updatedShapes = [...prev];
                const movingShape = updatedShapes.find(s => s.id === selectedShapeId);
                
                if (movingShape) {
                    if (movingShape.type === TOOLS.RECTANGLE) {
                        // Set exact position based on cursor and initial offset
                        const newX = currentPos.x - startPos.x;
                        const newY = currentPos.y - startPos.y;
                        movingShape.x = newX;
                        movingShape.y = newY;
                        
                        // Update connected arrows
                        updatedShapes.forEach(shape => {
                            if (shape.type === TOOLS.ARROW) {
                                if (shape.snappedStart?.shapeId === selectedShapeId) {
                                    const newStartPos = getRectangleNodePosition(
                                        { ...movingShape, x: newX, y: newY },
                                        shape.snappedStart.position
                                    );
                                    shape.startX = newStartPos.x;
                                    shape.startY = newStartPos.y;
                                }
                                if (shape.snappedEnd?.shapeId === selectedShapeId) {
                                    const newEndPos = getRectangleNodePosition(
                                        { ...movingShape, x: newX, y: newY },
                                        shape.snappedEnd.position
                                    );
                                    shape.endX = newEndPos.x;
                                    shape.endY = newEndPos.y;
                                }
                            }
                        });
                    
                    } else if (movingShape.type === TOOLS.ARROW) {
                        if (!movingShape.snappedStart) {
                            movingShape.startX = currentPos.x - startPos.startOffsetX;
                            movingShape.startY = currentPos.y - startPos.startOffsetY;
                        }
                        if (!movingShape.snappedEnd) {
                            movingShape.endX = currentPos.x - startPos.endOffsetX;
                            movingShape.endY = currentPos.y - startPos.endOffsetY;
                        }
                    }
                }
                return updatedShapes;
            });
        }
    };

    const handleMouseUp = () => {
        if (isDrawing) {
            const wasQuickClick = Date.now() - mouseDownTime < 200;
            
            if (wasQuickClick && selectedTool === TOOLS.RECTANGLE) {
                setShapes(prev => {
                    const updated = [...prev];
                    const currentShape = updated[updated.length - 1];
                    if (currentShape) {
                        currentShape.width = 100;
                        currentShape.height = 50;
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
        setDraggedEndpoint(null);
        if (!isDrawing) {  // Add this condition
            setSelectedTool(null);  // Clear selected tool after mouseup if not drawing
        }
    };

    const handleEndpointMouseDown = (e, shapeId, endpoint) => {
        e.stopPropagation();
        setSelectedShapeId(shapeId);
        setIsDragging(true);
        setDraggedEndpoint(endpoint);
        setStartPos(getCanvasPosition(e));
    };

    const handleShapeClick = (e, shapeId) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if we clicked on the SVG or its children
        const isArrowElement = e.target.tagName.toLowerCase() === 'line' || 
                             e.target.tagName.toLowerCase() === 'polygon' || 
                             e.target.tagName.toLowerCase() === 'svg';
    
        // Get the clicked shape
        const clickedShape = shapes.find(s => s.id === shapeId);
        
        // Only process the click if we're not drawing and not dragging
        if (!isDrawing && !isDragging && clickedShape) {
            if (clickedShape.type === TOOLS.ARROW && !isArrowElement) {
                // Ignore clicks on arrow's container div
                return;
            }
            
            // Toggle selection
            setSelectedShapeId(selectedShapeId === shapeId ? null : shapeId);
        }
    };

    const handleCanvasClick = (e) => {
        if (e.target === canvasRef.current) {
            setSelectedShapeId(null);
            setDraggedEndpoint(null);
        }
    };

    const renderShape = (shape) => {
        const isSelected = shape.id === selectedShapeId;

        const ConnectionNode = ({ position, nodePosition, onMouseDown }) => {
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
                    onMouseDown={onMouseDown}
                />
            );
        };

        switch (shape.type) {
            case TOOLS.ARROW: {
                const dx = shape.endX - shape.startX;
                const dy = shape.endY - shape.startY;
                // Calculate the angle for the arrow head
                const angle = Math.atan2(dy, dx);
                const arrowLength = 10;
                const arrowWidth = 6;
            
                // Calculate arrow head points
                const arrowHeadPoints = [
                    shape.endX,
                    shape.endY,
                    shape.endX - arrowLength * Math.cos(angle) + arrowWidth * Math.sin(angle),
                    shape.endY - arrowLength * Math.sin(angle) - arrowWidth * Math.cos(angle),
                    shape.endX - arrowLength * Math.cos(angle) - arrowWidth * Math.sin(angle),
                    shape.endY - arrowLength * Math.sin(angle) + arrowWidth * Math.cos(angle)
                ].join(',');
            
                return (
                    <div 
                        style={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            width: '100%', 
                            height: '100%',
                            pointerEvents: 'all',
                            cursor: isSelected ? 'move' : 'pointer',
                            zIndex: isSelected ? 2 : 1
                        }}
                    >
                        <svg
                            width="100%"
                            height="100%"
                            style={{ 
                                position: 'absolute', 
                                top: 0, 
                                left: 0, 
                                pointerEvents: 'all'
                            }}
                            onClick={(e) => handleShapeClick(e, shape.id)}
                        >
                            <line
                                x1={shape.startX}
                                y1={shape.startY}
                                x2={shape.endX}
                                y2={shape.endY}
                                stroke={isSelected ? 'blue' : 'black'}
                                strokeWidth="2"
                            />
                            <polygon
                                points={arrowHeadPoints}
                                fill={isSelected ? 'blue' : 'black'}
                            />
                        </svg>
                        {(isSelected || showNodes) && (
                            <>
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: shape.startX - 4,
                                        top: shape.startY - 4,
                                        width: '8px',
                                        height: '8px',
                                        backgroundColor: isSelected ? '#4a9eff' : 'transparent',
                                        border: '2px solid #4a9eff',
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        zIndex: 2
                                    }}
                                    onMouseDown={(e) => handleEndpointMouseDown(e, shape.id, 'start')}
                                />
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: shape.endX - 4,
                                        top: shape.endY - 4,
                                        width: '8px',
                                        height: '8px',
                                        backgroundColor: isSelected ? '#4a9eff' : 'transparent',
                                        border: '2px solid #4a9eff',
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        zIndex: 2
                                    }}
                                    onMouseDown={(e) => handleEndpointMouseDown(e, shape.id, 'end')}
                                />
                            </>
                        )}
                    </div>
                );
            }
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
                            cursor: isSelected ? 'move' : 'pointer',
                            zIndex: isSelected ? 2 : 1,
                            // Add background to make rectangle clickable
                            backgroundColor: 'rgba(255, 255, 255, 0.01)'
                        }}
                        onClick={(e) => handleShapeClick(e, shape.id)}
                    >
                        {showNodes && (
                            <>
                                <ConnectionNode 
                                    position={{ left: '-6px', top: 'calc(50% - 4px)' }}
                                    nodePosition="left"
                                    onMouseDown={(e) => handleEndpointMouseDown(e, shape.id, 'left')}
                                />
                                <ConnectionNode 
                                    position={{ right: '-6px', top: 'calc(50% - 4px)' }}
                                    nodePosition="right"
                                    onMouseDown={(e) => handleEndpointMouseDown(e, shape.id, 'right')}
                                />
                                <ConnectionNode 
                                    position={{ top: '-6px', left: 'calc(50% - 4px)' }}
                                    nodePosition="top"
                                    onMouseDown={(e) => handleEndpointMouseDown(e, shape.id, 'top')}
                                />
                                <ConnectionNode 
                                    position={{ bottom: '-6px', left: 'calc(50% - 4px)' }}
                                    nodePosition="bottom"
                                    onMouseDown={(e) => handleEndpointMouseDown(e, shape.id, 'bottom')}
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
                    className={`tool-button ${selectedTool === TOOLS.ARROW ? 'selected' : ''}`}
                    onClick={() => setSelectedTool(TOOLS.ARROW)}
                >
                    Arrow
                </button>
            </div>
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
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
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