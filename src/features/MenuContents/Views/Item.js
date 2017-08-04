import React from 'react';
import PropTypes from 'prop-types';
import Radium from 'radium';
// add relative path to skip eslint's
// import/no-extraneous-dependencies error caused by this library being
// installed as part of Radium
import color from '../../../../node_modules/color';

const styles = {
  container: {
    fontSize: '14px',
    paddingBottom: '10px',
    paddingTop: '10px',
    paddingLeft: '20px',
    borderRadius: '2px',
    cursor: 'pointer',
  },
  selected: {
    color: '#78A15A',
    ':hover': {
      background: color('#78A15A').lighten(0.9).hexString(),
    },
  },
  unselected: {
    color: 'black',
    ':hover': {
      background: color('#78A15A').lighten(0.7).hexString(),
    },
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

export default Radium(Item);