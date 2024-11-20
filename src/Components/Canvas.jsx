import { useState, useRef } from 'react';
import './Canvas.css';

const Canvas = () => {
    const [selectedTool, setSelectedTool] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState(null);
    const [shapes, setShapes] = useState([]);
    const canvasRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [mouseDownTime, setMouseDownTime] = useState(null); // Add this for click vs drag detection
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
        if (selectedTool) {
            e.preventDefault();
            e.stopPropagation();
            const pos = getCanvasPosition(e);
            setIsDrawing(true);
            setStartPos(pos);
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
    };

    const handleMouseMove = (e) => {
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
    };

    const handleMouseUp = () => {
        if (isDrawing) {
            const wasQuickClick = Date.now() - mouseDownTime < 200; // Check if it was a quick click
            
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
            setStartPos(null);
            setSelectedTool(null);
            setMouseDownTime(null);
        }
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
                            pointerEvents: 'all' 
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