import React from 'react';
import Radium from 'radium';

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
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      color: 'transparent',
      cursor: 'alias',
    },
  },
  linkedin: {
    ':hover': {
      backgroundImage: 'url("../static/images/linkedin.png")',
    },
  },
  twitter: {
    ':hover': {
      backgroundImage: 'url("../static/images/twitter.png")',
    },
  },
  github: {
    ':hover': {
      backgroundImage: 'url("../static/images/github.png")',
    },
  },
};

const Links = () => (
  <div style={styles.container}>
    <a
      href="https://www.linkedin.com/in/erhathaway"
      target="_blank"
      rel="noopener noreferrer"
      key={1}
      style={[styles.link, styles.linkedin]}
    >
      Linkedin
    </a>
    <a
      href="https://twitter.com/erhathaway"
      target="_blank"
      rel="noopener noreferrer"
      key={2}
      style={[styles.link, styles.twitter]}
    >
      Twitter
    </a>
    <a
      href="https://github.com/erhathaway"
      target="_blank"
      rel="noopener noreferrer"
      key={3}
      style={[styles.link, styles.github]}
    >
      Github
    </a>
  </div>
);

export default Radium(Links);
