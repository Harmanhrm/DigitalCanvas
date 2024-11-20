export const Rectangle = ({ x, y, width, height }) => {
    return (
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width,
          height,
          border: '1px solid black',
          pointerEvents: 'none'
        }}
      />
    );
  };