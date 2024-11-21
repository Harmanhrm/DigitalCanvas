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
                height: 0
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
        switch (shape.type) {
            case 'rectangle':
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
                            cursor: isSelected ? 'move' : 'pointer' // Add cursor style
                        }}
                        onClick={(e) => handleShapeClick(e, shape.id)}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className='Canvas'>
            <div className='toolbar-top'>
                <button 
                    className={`rectangular-box ${selectedTool === 'rectangle' ? 'selected' : ''}`}
                    onClick={() => setSelectedTool('rectangle')}
                >
                    Rectangle
                </button>
            </div>
            <div className='toolbar-bottom' />
            <div className='toolbar-right' />
            <div className='toolbar-left' />
            <div 
                ref={canvasRef}
                className='innerCanvas'
                onClick={handleClick}
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