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
    const [editingText, setEditingText] = useState(null);

    
    const handleTextChange = (id, newText) => {
        setShapes(prev => prev.map(shape => 
            shape.id === id ? { ...shape, text: newText } : shape
        ));
    };
    const handleDoubleClick = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingText(id);
        setSelectedId(id);
    };

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
                        
                        
                        let updatedShapes = prev.map(shape =>
                            shape.id === selectedId ? movedShape : shape
                        );
                        
                        
                        updatedShapes = updatedShapes.map(shape => {
                            if (shape.type === TOOLS.ARROW) {
                                let newShape = { ...shape };
                                
                                
                                if (shape.snappedStart?.shapeId === selectedId) {
                                    const newPos = getNodePosition(movedShape, shape.snappedStart.position);
                                    newShape.startX = newPos.x;
                                    newShape.startY = newPos.y;
                                }
                                
                                
                                if (shape.snappedEnd?.shapeId === selectedId) {
                                    const newPos = getNodePosition(movedShape, shape.snappedEnd.position);
                                    newShape.endX = newPos.x;
                                    newShape.endY = newPos.y;
                                }
                                
                                return newShape;
                            }
                            return shape;
                        });
                
                        return updatedShapes;
                    }
                    else if (moving.type === TOOLS.ARROW) {
                        
                        return prev.map(shape => {
                            if (shape.id === selectedId) {
                                const newShape = { ...shape };
                                
                                
                                if (!shape.snappedStart) {
                                    newShape.startX = shape.startX + dx;
                                    newShape.startY = shape.startY + dy;
                                }
                                
                                
                                if (!shape.snappedEnd) {
                                    newShape.endX = shape.endX + dx;
                                    newShape.endY = shape.endY + dy;
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
            setSelectedId(id);
        }
    } else if (shape.type === TOOLS.ARROW) {
        
        const buffer = 5;  
        const dx = shape.endX - shape.startX;
        const dy = shape.endY - shape.startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        
        const crossProduct = (clickPos.x - shape.startX) * dy - (clickPos.y - shape.startY) * dx;
        const distance = Math.abs(crossProduct / length);
        
        
        const dotProduct = ((clickPos.x - shape.startX) * dx + (clickPos.y - shape.startY) * dy) / length;
        const isWithinBounds = dotProduct >= 0 && dotProduct <= length;
        
        if (distance <= buffer && isWithinBounds) {
            setSelectedId(id);
            return;
        }

        
        const startDistance = Math.sqrt(
            Math.pow(clickPos.x - shape.startX, 2) + 
            Math.pow(clickPos.y - shape.startY, 2)
        );
        const endDistance = Math.sqrt(
            Math.pow(clickPos.x - shape.endX, 2) + 
            Math.pow(clickPos.y - shape.endY, 2)
        );

        if (startDistance <= buffer || endDistance <= buffer) {
            setSelectedId(id);
        }
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
        const isEditing = editingText === shape.id;

        if (shape.type === TOOLS.TEXT) {
            return (
                <div
                    key={shape.id}
                    className={`shape text ${isSelected ? 'selected' : ''}`}
                    style={{
                        position: 'absolute',
                        left: shape.x,
                        top: shape.y,
                        minWidth: '50px',
                        padding: '4px',
                        cursor: 'move',
                        border: isSelected ? '2px solid #4a9eff' : '1px solid transparent',
                        zIndex: isSelected ? 2 : 1
                    }}
                    onClick={(e) => handleShapeClick(e, shape.id)}
                    onDoubleClick={(e) => handleDoubleClick(e, shape.id)}
                >
                    {isEditing ? (
                        <textarea
                            value={shape.text}
                            onChange={(e) => handleTextChange(shape.id, e.target.value)}
                            onBlur={() => setEditingText(null)}
                            autoFocus
                            style={{
                                width: '100%',
                                minHeight: '20px',
                                border: 'none',
                                outline: 'none',
                                resize: 'both'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <div>{shape.text || 'Double click to edit'}</div>
                    )}
                </div>
            );
        }
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
                        zIndex: isSelected ? 2 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onClick={(e) => handleShapeClick(e, shape.id)}
                    onDoubleClick={(e) => handleDoubleClick(e, shape.id)}
                    >
                        {isEditing ? (
                            <textarea
                                value={shape.text}
                                onChange={(e) => handleTextChange(shape.id, e.target.value)}
                                onBlur={() => setEditingText(null)}
                                autoFocus
                                style={{
                                    width: '90%',
                                    height: '90%',
                                    border: 'none',
                                    outline: 'none',
                                    resize: 'none',
                                    backgroundColor: 'transparent',
                                    textAlign: 'center'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <div>{shape.text || 'Double click to add text'}</div>
                        )}
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

        
        const padding = 10;
        const minX = Math.min(shape.startX, shape.endX) - padding;
        const minY = Math.min(shape.startY, shape.endY) - padding;
        const maxX = Math.max(shape.startX, shape.endX) + padding;
        const maxY = Math.max(shape.startY, shape.endY) + padding;
        const width = maxX - minX;
        const height = maxY - minY;
    
        const dx = shape.endX - shape.startX;
        const dy = shape.endY - shape.startY;
        const angle = Math.atan2(dy, dx);
        const arrowLength = 10;
        const arrowWidth = 6;

        const arrowHeadPoints = [
            shape.endX - minX,
            shape.endY - minY,
            shape.endX - minX - arrowLength * Math.cos(angle) + arrowWidth * Math.sin(angle),
            shape.endY - minY - arrowLength * Math.sin(angle) - arrowWidth * Math.cos(angle),
            shape.endX - minX - arrowLength * Math.cos(angle) - arrowWidth * Math.sin(angle),
            shape.endY - minY - arrowLength * Math.sin(angle) + arrowWidth * Math.cos(angle)
        ].join(',');

        return (
            <div 
                key={shape.id}
                className={`shape arrow-container ${isSelected ? 'selected' : ''}`}
                style={{
                    position: 'absolute',
                    left: minX,
                    top: minY,
                    width,
                    height,
                    pointerEvents: 'none',  
                    zIndex: isSelected ? 2 : 1
                }}
            >
                <svg
                    width={width}
                    height={height}
                    style={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                    }}
                >
                    {/* Invisible wider line for hit detection */}
                    <line
                        x1={shape.startX - minX}
                        y1={shape.startY - minY}
                        x2={shape.endX - minX}
                        y2={shape.endY - minY}
                        stroke="transparent"
                        strokeWidth="20"
                        style={{ 
                            cursor: 'pointer',
                            pointerEvents: 'all'
                        }}
                        onClick={(e) => handleShapeClick(e, shape.id)}
                    />
                    {/* Visible line */}
                    <line
                        x1={shape.startX - minX}
                        y1={shape.startY - minY}
                        x2={shape.endX - minX}
                        y2={shape.endY - minY}
                        stroke={isSelected ? '#4a9eff' : 'black'}
                        strokeWidth="2"
                        style={{ pointerEvents: 'none' }}
                    />
                    {/* Arrow head */}
                    <polygon
                        points={arrowHeadPoints}
                        fill={isSelected ? '#4a9eff' : 'black'}
                        style={{ pointerEvents: 'none' }}
                    />
                </svg>
    
                {/* Connection nodes */}
                {(isSelected || showNodes) && (
                    <>
                        <div
                            className="connection-node"
                            style={{
                                position: 'absolute',
                                left: shape.startX - minX - 6,
                                top: shape.startY - minY - 6,
                                width: '12px',
                                height: '12px',
                                backgroundColor: '#4a9eff',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                pointerEvents: 'all',
                                zIndex: 3
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
                                position: 'absolute',
                                left: shape.endX - minX - 6,
                                top: shape.endY - minY - 6,
                                width: '12px',
                                height: '12px',
                                backgroundColor: '#4a9eff',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                pointerEvents: 'all',
                                zIndex: 3
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