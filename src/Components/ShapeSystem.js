const TOOLS = {
    RECTANGLE: 'rectangle',
    ARROW: 'arrow'
};

// Shape utilities
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

const isPointOnArrow = (point, arrow, tolerance = 5) => {
    const { startX, startY, endX, endY } = arrow;
    
    const lengthSquared = Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2);
    if (lengthSquared === 0) return false;
    
    const t = Math.max(0, Math.min(1, (
        (point.x - startX) * (endX - startX) +
        (point.y - startY) * (endY - startY)
    ) / lengthSquared));
    
    const nearestX = startX + t * (endX - startX);
    const nearestY = startY + t * (endY - startY);
    
    return Math.sqrt(
        Math.pow(point.x - nearestX, 2) +
        Math.pow(point.y - nearestY, 2)
    ) <= tolerance;
};

const createShape = (type, position) => {
    return {
        id: Date.now(),
        type,
        ...(type === TOOLS.RECTANGLE ? {
            x: position.x,
            y: position.y,
            width: 0,
            height: 0
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

const updateConnectedArrows = (shapes, movingShape, newX, newY) => {
    return shapes.map(shape => {
        if (shape.type === TOOLS.ARROW) {
            const updates = {};
            
            if (shape.snappedStart?.shapeId === movingShape.id) {
                const newPos = getNodePosition(
                    { ...movingShape, x: newX, y: newY },
                    shape.snappedStart.position
                );
                updates.startX = newPos.x;
                updates.startY = newPos.y;
            }
            
            if (shape.snappedEnd?.shapeId === movingShape.id) {
                const newPos = getNodePosition(
                    { ...movingShape, x: newX, y: newY },
                    shape.snappedEnd.position
                );
                updates.endX = newPos.x;
                updates.endY = newPos.y;
            }
            
            return { ...shape, ...updates };
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