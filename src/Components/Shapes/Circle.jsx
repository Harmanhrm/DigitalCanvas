// src/components/Canvas/shapes/Circle.jsx
export const Circle = ({ x, y, width, height }) => {
    return (
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width,
          height,
          border: '1px solid black',
          borderRadius: '50%',
          pointerEvents: 'none'
        }}
      />
    );
  };