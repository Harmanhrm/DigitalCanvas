import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    TOOLS,
    getNodePosition,
    findNearestNode,
    isPointOnArrow,
    createShape,
    updateConnectedArrows
} from './ShapeSystem';
import './styles.css';

const Canvas = () => {
    const [selectedTool, setSelectedTool] = useState(null);
    const [shapes, setShapes] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedEndpoint, setDraggedEndpoint] = useState(null);
    const [showNodes, setShowNodes] = useState(false);
    const [startPos, setStartPos] = useState(null);
    const canvasRef = useRef(null);

    const [resizing, setResizing] = useState(null); 
    const [clipboard, setClipboard] = useState(null);

    const getCanvasPosition = useCallback((e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }, []);
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (selectedId) {
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    deleteSelectedShape();
                } else if (e.ctrlKey || e.metaKey) {
                    if (e.key === 'c') {
                        e.preventDefault();
                        copySelectedShape();
                    } else if (e.key === 'v') {
                        e.preventDefault();
                        pasteShape();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, shapes]);
    const deleteSelectedShape = () => {
        setShapes(prev => {
            
            const selectedShape = prev.find(s => s.id === selectedId);
            if (!selectedShape) return prev;

            
            if (selectedShape.type === TOOLS.RECTANGLE) {
                return prev.filter(shape => {
                    if (shape.type === TOOLS.ARROW) {
                        const isConnected = 
                            shape.snappedStart?.shapeId === selectedId ||
                            shape.snappedEnd?.shapeId === selectedId;
                        return !isConnected;
                    }
                    return shape.id !== selectedId;
                });
            }

            
            return prev.filter(s => s.id !== selectedId);
        });
        setSelectedId(null);
    };

    const copySelectedShape = () => {
        const shapeToCopy = shapes.find(s => s.id === selectedId);
        if (shapeToCopy) {
            setClipboard({
                ...shapeToCopy,
                id: null, 
                snappedStart: null, 
                snappedEnd: null
            });
        }
    };

    const pasteShape = () => {
        if (clipboard) {
            const offset = 20; 
            const newShape = {
                ...clipboard,
                id: Date.now(),
                x: clipboard.x + offset,
                y: clipboard.y + offset,
                ...(clipboard.type === TOOLS.ARROW ? {
                    startX: clipboard.startX + offset,
                    startY: clipboard.startY + offset,
                    endX: clipboard.endX + offset,
                    endY: clipboard.endY + offset
                } : {})
            };
            setShapes(prev => [...prev, newShape]);
            setSelectedId(newShape.id);
        }
    };
    const handleMouseDown = (e) => {
        const pos = getCanvasPosition(e);
        
        if (selectedTool) {
            e.preventDefault();
            setIsDrawing(true);
            setIsDragging(false);
            setStartPos(pos);
            
            const newShape = createShape(selectedTool, pos);
            setShapes(prev => [...prev, newShape]);
            return;
        }
        if (e.target === canvasRef.current) {
            setSelectedId(null);
            setIsDragging(false);
            setStartPos(null);
            setDraggedEndpoint(null);
            return;
        }
        if (selectedId && !draggedEndpoint) {
            e.preventDefault();
            setIsDragging(true);
            setStartPos(pos);
        }
    };

    const handleMouseMove = (e) => {
        if (!startPos) return;
        const currentPos = getCanvasPosition(e);
        if (resizing) {
            setShapes(prev => {
                const updatedShapes = prev.map(shape => {
                    if (shape.id !== resizing.id) return shape;
        
                    const dx = currentPos.x - startPos.x;
                    const dy = currentPos.y - startPos.y;
                    let newShape = { ...shape };
        
                    switch (resizing.handle) {
                        case 'se':
                            newShape.width = Math.max(10, shape.width + dx);
                            newShape.height = Math.max(10, shape.height + dy);
                            break;
                        case 'sw':
                            newShape.width = Math.max(10, shape.width - dx);
                            newShape.x = shape.x + dx;
                            newShape.height = Math.max(10, shape.height + dy);
                            break;
                        case 'ne':
                            newShape.width = Math.max(10, shape.width + dx);
                            newShape.height = Math.max(10, shape.height - dy);
                            newShape.y = shape.y + dy;
                            break;
                        case 'nw':
                            newShape.width = Math.max(10, shape.width - dx);
                            newShape.height = Math.max(10, shape.height - dy);
                            newShape.x = shape.x + dx;
                            newShape.y = shape.y + dy;
                            break;
                    }
                return newShape;
                });
                return updateConnectedArrows(updatedShapes, updatedShapes.find(s => s.id === resizing.id));
            });
            setStartPos(currentPos);
            return;
        }
        if (isDrawing) {
            setShapes(prev => {
                const current = prev[prev.length - 1];
                if (selectedTool === TOOLS.RECTANGLE) {
                    const width = Math.abs(currentPos.x - current.x);
                    const height = Math.abs(currentPos.y - current.y);
                    const x = currentPos.x < current.x ? currentPos.x : current.x;
                    const y = currentPos.y < current.y ? currentPos.y : current.y;
                    return [...prev.slice(0, -1), { ...current, x, y, width, height }];
                } else {
                    return [...prev.slice(0, -1), { ...current, endX: currentPos.x, endY: currentPos.y }];
                }
            });
        } else if (isDragging) {
            if (draggedEndpoint) {
                setShapes(prev => prev.map(shape => {
                    if (shape.id !== selectedId) return shape;
                    
                    const nearestNode = findNearestNode(currentPos, prev, selectedId);
                    const newPos = nearestNode?.point || currentPos;
                    
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
                }));
            } else {
                setShapes(prev => {
                    const moving = prev.find(s => s.id === selectedId);
                    if (!moving) return prev;
        
                    const dx = currentPos.x - startPos.x;
                    const dy = currentPos.y - startPos.y;
        
                    if (moving.type === TOOLS.RECTANGLE) {
                        
                        const movedShape = {
                            ...moving,
                            x: moving.x + dx,
                            y: moving.y + dy
                        };
                        
                        
                        const updatedShapes = prev.map(shape => 
                            shape.id === selectedId ? movedShape : shape
                        );
        
                        
                        return updateConnectedArrows(updatedShapes, movedShape);
                    } else if (moving.type === TOOLS.ARROW) {
                        return prev.map(shape => {
                            if (shape.id === selectedId) {
                                const newShape = {
                                    ...shape,
                                    startX: shape.startX + dx,
                                    startY: shape.startY + dy,
                                    endX: shape.endX + dx,
                                    endY: shape.endY + dy
                                };
                                
                                if (shape.snappedStart) {
                                    newShape.startX = shape.startX;
                                    newShape.startY = shape.startY;
                                }
                                if (shape.snappedEnd) {
                                    newShape.endX = shape.endX;
                                    newShape.endY = shape.endY;
                                }
                                return newShape;
                            }
                            return shape;
                        });
                    }
                    return prev;
                });
                setStartPos(currentPos);
            }
        }
    }

    const handleMouseUp = () => {
        if (resizing) {
            setResizing(null);
        }
        if (isDrawing) {
            setIsDrawing(false);
            setSelectedTool(null);
        }
        
        setIsDragging(false);
        setStartPos(null);
        setDraggedEndpoint(null);
    };

    const handleShapeClick = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (isDrawing || isDragging) return;
    
        const clickPos = getCanvasPosition(e);
        const shape = shapes.find(s => s.id === id);
        
        if (!shape) return;
    
        
        if (shape.type === TOOLS.RECTANGLE) {
            const buffer = 5;
            const isHit = clickPos.x >= shape.x - buffer && 
                         clickPos.x <= shape.x + shape.width + buffer && 
                         clickPos.y >= shape.y - buffer && 
                         clickPos.y <= shape.y + shape.height + buffer;
            
            if (isHit) {
                setSelectedId(selectedId === id ? null : id);
                return; 
            }
        }
        
        
        if (shape.type === TOOLS.ARROW && isPointOnArrow(clickPos, shape)) {
            setSelectedId(selectedId === id ? null : id);
        }
    };
    

    const handleCanvasClick = (e) => {
        if (e.target === canvasRef.current) {
            setSelectedId(null);
            setIsDragging(false);
        setStartPos(null);
        setDraggedEndpoint(null);
        }
    };

    const renderShape = (shape) => {
        const isSelected = shape.id === selectedId;
    
        if (shape.type === TOOLS.RECTANGLE) {
            return (
                <div
                    key={shape.id}
                    className={`shape rectangle ${isSelected ? 'selected' : ''}`}
                    style={{
                        position: 'absolute',
                        left: shape.x,
                        top: shape.y,
                        width: shape.width,
                        height: shape.height,
                        cursor: 'move',
                        backgroundColor: '#fff',
                        border: isSelected ? '2px solid #4a9eff' : '1px solid #000',
                        zIndex: isSelected ? 2 : 1
                    }}
                    onClick={(e) => handleShapeClick(e, shape.id)}
                >
                    {(showNodes || isSelected) && (
                        Object.entries({
                            left: { left: -6, top: '50%' },
                            right: { right: -6, top: '50%' },
                            top: { top: -6, left: '50%' },
                            bottom: { bottom: -6, left: '50%' }
                        }).map(([pos, style]) => (
                            <div
                                key={pos}
                                className="connection-node"
                                style={{
                                    ...style,
                                    position: 'absolute',
                                    width: '12px',
                                    height: '12px',
                                    backgroundColor: '#4a9eff',
                                    borderRadius: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    cursor: 'pointer',
                                    zIndex: 3
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setSelectedId(shape.id);
                                    setIsDragging(true);
                                    setDraggedEndpoint(pos);
                                    setStartPos(getCanvasPosition(e));
                                }}
                            />
                        ))
                    )}
                    {isSelected && (
                        <>
                            {['nw', 'ne', 'sw', 'se'].map(handle => (
                                <div
                                    key={handle}
                                    className="resize-handle"
                                    style={{
                                        position: 'absolute',
                                        width: '8px',
                                        height: '8px',
                                        backgroundColor: '#4a9eff',
                                        border: '1px solid white',
                                        borderRadius: '50%',
                                        ...(handle === 'nw' ? { top: '-4px', left: '-4px' } :
                                            handle === 'ne' ? { top: '-4px', right: '-4px' } :
                                            handle === 'sw' ? { bottom: '-4px', left: '-4px' } :
                                            { bottom: '-4px', right: '-4px' }),
                                        cursor: `${handle}-resize`,
                                        zIndex: 3
                                    }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setResizing({ handle, id: shape.id });
                                        setStartPos(getCanvasPosition(e));
                                    }}
                                />
                            ))}
                        </>
                    )}
                </div>
            );
        }

        
        const dx = shape.endX - shape.startX;
        const dy = shape.endY - shape.startY;
        const angle = Math.atan2(dy, dx);
        const arrowLength = 10;
        const arrowWidth = 6;

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
                key={shape.id}
                className={`shape arrow-container ${isSelected ? 'selected' : ''}`}
            >
                <svg
                    width="100%"
                    height="100%"
                    style={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        pointerEvents: 'all',
                        cursor: 'pointer'
                    }}
                    onClick={(e) => handleShapeClick(e, shape.id)}
                >
                    <line
                        x1={shape.startX}
                        y1={shape.startY}
                        x2={shape.endX}
                        y2={shape.endY}
                        className={`arrow-line ${isSelected ? 'selected' : ''}`}
                        stroke={isSelected ? '#4a9eff' : 'black'}
                    />
                    <polygon
                        points={arrowHeadPoints}
                        fill={isSelected ? '#4a9eff' : 'black'}
                    />
                </svg>
                {(isSelected || showNodes) && (
                    <>
                        <div
                            className="connection-node"
                            style={{
                                left: shape.startX - 4,
                                top: shape.startY - 4,
                                cursor: 'pointer'
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedId(shape.id);
                                setIsDragging(true);
                                setDraggedEndpoint('start');
                                setStartPos(getCanvasPosition(e));
                            }}
                        />
                        <div
                            className="connection-node"
                            style={{
                                left: shape.endX - 4,
                                top: shape.endY - 4,
                                cursor: 'pointer'
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedId(shape.id);
                                setIsDragging(true);
                                setDraggedEndpoint('end');
                                setStartPos(getCanvasPosition(e));
                            }}
                        />
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="canvas-container">
            <div className="toolbar toolbar-top">
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
            <div className="toolbar toolbar-left">
                <button 
                    className={`tool-button ${showNodes ? 'selected' : ''}`}
                    onClick={() => setShowNodes(!showNodes)}
                >
                    {showNodes ? 'Hide Nodes' : 'Show Nodes'}
                </button>
            </div>
            <div className='toolbar toolbar-right'>
            <button 
        className="tool-button"
        onClick={deleteSelectedShape}
        disabled={!selectedId}
    >
        Delete
    </button>
    <button 
        className="tool-button"
        onClick={copySelectedShape}
        disabled={!selectedId}
    >
        Copy
    </button>
    <button 
        className="tool-button"
        onClick={pasteShape}
        disabled={!clipboard}
    >
        Paste
    </button>
            </div>
            
            <div 
                ref={canvasRef}
                className="canvas-area"
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {shapes.map(renderShape)}
            </div>
        </div>
    );
};

export default Canvas;