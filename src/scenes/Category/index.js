import React from 'react';
import PropTypes from 'prop-types';
import LandingImages from '../LandingImages';

const transitionStyles = {
  entering: {
    opacity: 0,
    transform: 'translateY(100%)',
  },
  entered: {
    opacity: 1,
  },
  exiting: {
    opacity: 1,
    transform: 'translateY(-100%)',
  },
  exited: {
    opacity: 0,
  },
};

const styles = duration => ({
  container: {
    position: 'absolute',
    transition: `opacity ${duration}ms ease-in-out, transform ${duration}ms ease-in-out`,
    opacity: 0,
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    paddingTop: '80px',
    marginLeft: '100px',
    width: '50vw',
  },
});

const Component = ({ inState, transitionDuration }) => (
  <div style={{
    ...styles(transitionDuration).container,
    ...transitionStyles[inState],
  }}
  >
    <LandingImages inState={inState} />
  </div>
);

Component.propTypes = {
  inState: PropTypes.string,
  transitionDuration: PropTypes.number,
};

Component.defaultProps = {
  inState: undefined,
  transitionDuration: 300,
};

export default Component;
