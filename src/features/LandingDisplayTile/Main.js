import React from 'react';
import PropTypes from 'prop-types';

const Main = ({ widthPriority, overlaycolor, backgroundImage, onClick }) => {
  const backgroundStyle = backgroundImage ? { backgroundImage } : {};
  const calcStyle = { flexGrow: widthPriority, height: 'calc(100%-3px)', margin: '1.5px', backgroundColor: overlaycolor };
  const style = Object.assign({}, calcStyle, backgroundStyle);


  return (
    <div role="menuItem" tabIndex={0} style={style} onClick={onClick} />
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
