const TOOLS = {
    RECTANGLE: 'rectangle',
    ARROW: 'arrow',
    TEXT: ''
};

const getNodePosition = (shape, position) => {
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

const findNearestNode = (pos, shapes, currentShapeId, snapDistance = 20) => {
    let nearest = null;
    let minDistance = snapDistance;

    shapes.forEach(shape => {
        if (shape.id !== currentShapeId && shape.type === TOOLS.RECTANGLE) {
            ['left', 'right', 'top', 'bottom'].forEach(nodePos => {
                const nodePoint = getNodePosition(shape, nodePos);
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

const isPointOnArrow = (point, arrow, tolerance = 10) => {
    
    const distToStart = Math.sqrt(
        Math.pow(point.x - arrow.startX, 2) + 
        Math.pow(point.y - arrow.startY, 2)
    );
    const distToEnd = Math.sqrt(
        Math.pow(point.x - arrow.endX, 2) + 
        Math.pow(point.y - arrow.endY, 2)
    );
    
    
    const arrowLength = Math.sqrt(
        Math.pow(arrow.endX - arrow.startX, 2) + 
        Math.pow(arrow.endY - arrow.startY, 2)
    );
    
    
    if (distToStart <= tolerance || distToEnd <= tolerance) return true;
    
    
    
    return Math.abs((distToStart + distToEnd) - arrowLength) <= tolerance;
};

const createShape = (type, position) => {
    return {
        id: Date.now(),
        type,
        text: '',  
        isEditing: false,  
        ...(type === TOOLS.RECTANGLE ? {
            x: position.x,
            y: position.y,
            width: 0,
            height: 0
        } : type === TOOLS.TEXT ? {
            x: position.x,
            y: position.y,
            width: 100,  
            height: 30   
        } : {
            startX: position.x,
            startY: position.y,
            endX: position.x,
            endY: position.y,
            snappedStart: null,
            snappedEnd: null
        })
    };
};


const updateConnectedArrows = (shapes, movingShape) => {
    return shapes.map(shape => {
        if (shape.type === TOOLS.ARROW) {
            let updates = {};
            
            
            if (shape.snappedStart?.shapeId === movingShape.id) {
                const newStartPos = getNodePosition(
                    movingShape,
                    shape.snappedStart.position
                );
                if (newStartPos) {
                    updates.startX = newStartPos.x;
                    updates.startY = newStartPos.y;
                }
            }
            
            
            if (shape.snappedEnd?.shapeId === movingShape.id) {
                const newEndPos = getNodePosition(
                    movingShape,
                    shape.snappedEnd.position
                );
                if (newEndPos) {
                    updates.endX = newEndPos.x;
                    updates.endY = newEndPos.y;
                }
            }
            
            return Object.keys(updates).length > 0 ? { ...shape, ...updates } : shape;
        }
        return shape;
    });
};

export {
    TOOLS,
    getNodePosition,
    findNearestNode,
    isPointOnArrow,
    createShape,
    updateConnectedArrows
};