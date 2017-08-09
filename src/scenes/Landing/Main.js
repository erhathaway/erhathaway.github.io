import React from 'react';
import Radium from 'radium';

// subscenes
import Menu from '../Menu/Main';
import LandingImages from '../LandingImages/Main';

const styles = {
  container: {
    height: '100vh',
    overflow: 'auto',
    display: 'flex',
    justifyContent: 'spaceBetween',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
  },
  right: {
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
    marginLeft: '100px',
  },
};

const Landing = () => (
  <div style={styles.container}>
    <div style={styles.left}>
      <Menu showFullMenu />
    </div>
    <div style={styles.right}>
      <LandingImages />
    </div>
  </div>
);

export default Radium(Landing);
