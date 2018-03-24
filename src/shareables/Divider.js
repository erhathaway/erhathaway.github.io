import React from 'react';
import PropTypes from 'prop-types';

const styles = {
  borderBottom: '1px solid white',
  height: '1px',
  backgroundColor: '#DFDFDF',
};

const Component = ({ width, marginTop, marginBottom, marginLeft }) => {
  const computed = Object.assign({}, styles, { width, marginTop, marginBottom, marginLeft });
  return (
    <div style={computed} />
  );
};

Component.propTypes = {
  width: PropTypes.number.isRequired,
  marginTop: PropTypes.number,
  marginBottom: PropTypes.number,
  marginLeft: PropTypes.number,
};

Component.defaultProps = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
};

export default Component;
