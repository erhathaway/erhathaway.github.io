import React from 'react';
import PropTypes from 'prop-types';

const styles = {
  fontSize: '24px',
  marginBottom: '26px',
  width: '100%',

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
