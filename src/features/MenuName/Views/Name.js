import React from 'react';
import PropTypes from 'prop-types';

const styles = {
  fontSize: '24px',
  marginBottom: '11px',
  padding: '15px',
  textDecoration: 'none',
  letterSpacing: '1.8px',
  opacity: 0.8,
};

const Name = ({ style }) => {
  const computed = {
    ...styles,
    ...style,
  };
  return (
    <div style={computed}>Ethan Hathaway</div>
  );
};

Name.propTypes = {
  style: PropTypes.shape({
    color: PropTypes.string.isRequired,
  }).isRequired,
};

export default Name;
