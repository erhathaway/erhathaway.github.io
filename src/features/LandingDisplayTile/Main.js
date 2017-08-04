import React from 'react';
import PropTypes from 'prop-types';
import Radium from 'radium';
// add relative path to skip eslint's
// import/no-extraneous-dependencies error caused by this library being
// installed as part of Radium
import color from '../../../node_modules/color';

const styles = {
};

const Main = ({ widthPriority, flexBasis, overlaycolor, backgroundImage, onClick }) => {
  const computed = { flexGrow: widthPriority, height: 'calc(100%-3px)', margin: '1.5px', backgroundColor: overlaycolor, };

  return (
    <div role="menuItem" tabIndex={0} style={computed} onClick={onClick}></div>
  );
};

Main.propTypes = {
  widthPriority: PropTypes.number.isRequired,
  flexBasis: PropTypes.string.isRequired,
  overlaycolor: PropTypes.string.isRequired,
  backgroundImage: PropTypes.string,
  onClick: PropTypes.func.isRequired,
};

Main.defaultProps = {
  backgroundImage: undefined,
};

export default Main;
