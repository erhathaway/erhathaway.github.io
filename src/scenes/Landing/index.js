import React from 'react';
import Radium from 'radium';
import { Transition } from "react-transition-group";

// subscenes
import LandingImages from '../LandingImages';

// var slideInKeyFrames = Radium.keyframes({
//   '100%': { transform: 'translate(0%)' },
// }, 'slideIn');

const transitionStyles = {
  entering: {
    opacity: 0,
    transform: 'translateX(100%)',
  },
  entered: {
    opacity: 1,
  },
  exiting: {
    opacity: 1,
    transform: 'translateX(100%)',
  },
  exited: {
    opacity: 0,
  }
};

const styles = (duration) => ({
  container: {
    position: 'absolute',
    transition: `opacity ${duration}ms ease-in-out, transform ${duration}ms ease-in-out`,
    opacity: 0,
    marginLeft: '100px',
    paddingTop: '80px',
    width: '65vw',
    overflow: 'hidden',

  },
});

// const logState = (state) => { console.log(state) }

const Landing = ({ inState, transitionDuration }) => (
    <div style={{
      ...styles(transitionDuration).container,
      ...transitionStyles[inState],
    }}>
      <LandingImages />
    </div>
);

export default Radium(Landing);
