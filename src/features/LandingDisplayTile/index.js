import React from 'react';
import PropTypes from 'prop-types';

const Main = ({ widthPriority, overlaycolor, backgroundImage, onClick }) => {
  const backgroundStyle = backgroundImage ? { backgroundImage } : {};
  const calcStyle = { flexGrow: widthPriority, height: 'calc(100%-3px)', margin: '1.5px' };
  const style = Object.assign({}, calcStyle, backgroundStyle);

  return (
    <div role="menuItem" tabIndex={0} style={style} onClick={onClick}>
      <div style={{
        backgroundColor: overlaycolor, height: '80%', width: '80%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'
      }}>
      </div>
    </div>
  );
};

Main.propTypes = {
  widthPriority: PropTypes.number.isRequired,
  overlaycolor: PropTypes.string.isRequired,
  backgroundImage: PropTypes.string,
  onClick: PropTypes.func.isRequired,
};

Main.defaultProps = {
  backgroundImage: undefined,
};

export default Main;
