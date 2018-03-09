import React from 'react';
import PropTypes from 'prop-types';
import Radium from 'radium';
import './style.css';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
};

const PopOutMenu = ({ children, hide }) => (
  <div style={styles.container}>
    <div styleName={hide ? 'closed-container' : 'open-container'} >
      { hide ? null : children }
    </div>
  </div>
);

PopOutMenu.propTypes = {
  children: PropTypes.node.isRequired,
  hide: PropTypes.bool.isRequired,
};

export default Radium(PopOutMenu);
