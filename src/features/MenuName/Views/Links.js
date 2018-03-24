import React from 'react';
import Radium from 'radium';
import anime from 'animejs';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

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

class Component extends React.Component {
  constructor(props) {
    super(props);
    this.childRefs = {};
  }

  componentDidUpdate({ inState: oldInState }) {
    const { inState: newInState } = this.props;
    if (oldInState !== newInState && (newInState === 'exiting' || newInState === 'exited')) {
      this.animate();
    }
  }

  animate = () => {
    const links = [1, 2, 3].map(n => this.childRefs[n]).map(el => ReactDOM.findDOMNode(el));

    anime.timeline()
      .add({
        targets: links,
        fontSize: [
          { value: 0, duration: 1000, delay: 0, easing: 'easeOutExpo' },
        ],
      });
  }

  addRef = index => (el) => { this.childRefs[index] = el; }

  render() {
    return (
      <div style={styles.container}>
        <a
          ref={this.addRef(1)}
          href="https://www.linkedin.com/in/erhathaway"
          target="_blank"
          rel="noopener noreferrer"
          key={1}
          style={[styles.link, styles.linkedin]}
        >
          Linkedin
        </a>
        <a
          ref={this.addRef(2)}
          href="https://twitter.com/erhathaway"
          target="_blank"
          rel="noopener noreferrer"
          key={2}
          style={[styles.link, styles.twitter]}
        >
          Twitter
        </a>
        <a
          ref={this.addRef(3)}
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
  }
}

Component.propTypes = {
  inState: PropTypes.string,
};

Component.defaultProps = {
  inState: undefined,
};

export default Radium(Component);
