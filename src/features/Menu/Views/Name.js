import React from 'react';
import PropTypes from 'prop-types';

const styles = {
  fontSize: '24px',
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
    fontColor: PropTypes.string.isRequired,
  }).isRequired,
};

export default Name;
