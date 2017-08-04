import React from 'react';
import PropTypes from 'prop-types';

const styles = {
  container: {
    fontSize: '14px',
    paddingBottom: '10px',
    paddingTop: '10px',
    paddingLeft: '20px',
  },
  selected: {
    color: '#78A15A',
  },
  unselected: {
    color: 'black',
  },
};

const Item = ({ name, selected, onClick, tabIndex }) => {
  const computed = selected
    ? Object.assign({}, styles.container, styles.selected)
    : Object.assign({}, styles.container, styles.unselected);

  return (
    <div role="menuItem" tabIndex={tabIndex} style={computed} onClick={onClick}>{ name }</div>
  );
};

Item.propTypes = {
  name: PropTypes.string.isRequired,
  selected: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  tabIndex: PropTypes.number.isRequired,
};

Item.defaultProps = {
  selected: false,
};

export default Item;
