import React from 'react';
import Radium from 'radium';

// subscenes
import LandingImages from '../LandingImages';

const styles = {
  container: {
    marginLeft: '100px',
    paddingTop: '80px',
    width: '65vw',
  },
};

const Landing = () => (
  <div style={styles.container}>
    <LandingImages />
  </div>
);

export default Radium(Landing);
