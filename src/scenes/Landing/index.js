import React from 'react';
import Radium from 'radium';

// subscenes
import LandingImages from '../LandingImages';

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
