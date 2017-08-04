import React from 'react';
import Menu from '../Menu/Main';
import LandingImages from '../LandingImages/Main';

const styles = {
  container: {
    height: '100vh',
    overflow: 'auto',
    display: 'flex',
    justifyContent: 'center',
  },
  left: {

  },
  right: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: '100px',
  },
};

const Landing = () => (
  <div style={styles.container}>
    <Menu showFullMenu />
    <div style={styles.right}>
      <LandingImages />
    </div>
  </div>
);

export default Landing;
