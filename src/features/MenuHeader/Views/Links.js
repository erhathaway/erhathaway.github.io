import React from 'react';

const styles = {
  container: {
    fontSize: '12px',
    marginTop: '29px',
    display: 'flex',
    justifyContent: 'flexStart',
  },
  link: {
    marginRight: '30px',
  },
};

const Links = () => (
  <div style={styles.container}>
    <div style={styles.link}>Linkedin</div>
    <div style={styles.link}>Twitter</div>
    <div style={styles.link}>Github</div>
  </div>
);

export default Links;
