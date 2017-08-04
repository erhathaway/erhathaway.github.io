import React from 'react';
import Header from '../../features/MenuHeader/Main';
import Contents from '../../features/MenuContents/Main';

const styles = {
  container: {
    marginLeft: '100px',
    marginTop: '105px',
  },
  spacer: {
    marginTop: '100px',
  },
};

const Menu = () => (
  <div style={styles.container}>
    <Header />
    <div style={styles.spacer} />
    <Contents />
  </div>
);

export default Menu;
