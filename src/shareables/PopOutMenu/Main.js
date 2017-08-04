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

const PopOutMenu = ({ children }) => (
  <div style={styles.container}>
    <div styleName="container">
      { children }
    </div>
  </div>
);

PopOutMenu.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Radium(PopOutMenu);
