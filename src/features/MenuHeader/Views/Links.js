import React from 'react';
import Radium from 'radium';
import color from 'color';

const styles = {
  container: {
    fontSize: '12px',
    marginTop: '14px',
    display: 'flex',
    justifyContent: 'flexStart',
  },
  link: {
    color: 'inherit',
    textDecoration: 'none',
    padding: '15px',
    borderRadius: '2px',
    ':hover': {
      cursor: 'alias',
      background: color('#78A15A').lighten(0.9).hexString(),
    },
  },
};

const Links = () => (
  <div style={styles.container}>
    <a href="https://www.linkedin.com/in/erhathaway" target="_blank" key={1} style={styles.link}>Linkedin</a>
    <a href="https://twitter.com/erhathaway" target="_blank" key={2} style={styles.link}>Twitter</a>
    <a href="https://github.com/erhathaway" target="_blank" key={3} style={styles.link}>Github</a>
  </div>
);

export default Radium(Links);
