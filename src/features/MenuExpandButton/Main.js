import React from 'react';
import Radium from 'radium';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  button: {
    height: '6px',
    width: '6px',
    borderRadius: '3px',
    margin: '3px',
  },
  one: {
    backgroundColor: 'blue',
  },
  two: {
    backgroundColor: 'green',
  },
  three: {
    backgroundColor: 'red',
  },
};

const Main = () => (
  <div style={styles.container}>
    <div style={[styles.button, styles.one]} />
    <div style={[styles.button, styles.two]} />
    <div style={[styles.button, styles.three]} />
  </div>
);


export default Radium(Main);
