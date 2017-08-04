import React from 'react';
import Menu from '../Menu/Main';

const styles = {
  height: '100vh',
  overflow: 'auto',
};

const Landing = () => (
  <div style={styles}>
    <Menu showFullMenu={false} />
  </div>
);

export default Landing;
