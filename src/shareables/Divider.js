import React from 'react';
import PropTypes from 'prop-types';

const styles = {
  borderBottom: '1px solid white',
  height: '1px',
  backgroundColor: '#DFDFDF',
};

const Divider = ({ width, marginTop, marginBottom, marginLeft }) => {
  const computed = Object.assign({}, styles, { width, marginTop, marginBottom, marginLeft });
  return (
    <div style={computed} />
  );
};

Divider.propTypes = {
  width: PropTypes.number.isRequired,
  marginTop: PropTypes.number,
  marginBottom: PropTypes.number,
  marginBottom: PropTypes.number,
};

Divider.defaultProps = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
};

export default Divider;
