import React from 'react';
import Radium from 'radium';

// subscenes
import Menu from '../Menu';
import LandingImages from '../LandingImages/Main';

const styles = {
  container: {
    overflow: 'hidden',
    display: 'flex',
    flexGrow: 1,
    alignItems: 'center',
    marginLeft: '100px',
  },
};

const Landing = () => (
  <div style={styles.container}>
    <LandingImages />
  </div>
);

export default Radium(Landing);
