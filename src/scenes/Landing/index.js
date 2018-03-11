import React from 'react';
import Radium from 'radium';
import { Transition } from "react-transition-group";

// subscenes
import LandingImages from '../LandingImages';

const duration = 300;

// const defaultStyle = {
//   transition: `opacity ${duration}ms ease-in-out`,
//   opacity: 0,
// }

var slideInKeyFrames = Radium.keyframes({
  '100%': { transform: 'translate(0%)' },
}, 'slideIn');

const transitionStyles = {
  entering: {
    opacity: 0,
    transform: 'translate(100%)',
  },
  entered: {
    opacity: 1,
  },
  exiting: {
    opacity: 1,
    transform: 'translate(0%)',
    backgroundColor: 'red',
  },
  exited: {
    opacity: 0,
    backgroundColor: 'yellow',
    transform: 'translate(-100%)',
  }
};

const styles = {
  container: {
    transition: `opacity ${duration*1.4}ms ease-in-out, transform ${duration}ms ease-in-out`,
    opacity: 0,
    marginLeft: '100px',
    paddingTop: '80px',
    width: '65vw',
  },
};

const logState = (state) => { console.log(state) }

// const Landing = ({ location, match }) => (
//   <Transition appear in={location.pathname === match.url} timeout={duration} >
//     {(state) => (
//       <div key={location.pathname} style={{
//         ...styles.container,
//         ...transitionStyles[state],
//       }}>
//       { logState(state) }
//         <LandingImages />
//       </div>
//     )}
//   </Transition>
// );

const Landing = ({ inState }) => (
    <div style={{
      ...styles.container,
      ...transitionStyles[inState],
    }}>
    { logState(inState) }
      <LandingImages />
    </div>
);

export default Radium(Landing);
