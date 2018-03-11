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

const transitionStyles = {
  entering: { opacity: 0 },
  entered: { opacity: 1 },
};

const styles = {
  container: {
    transition: `opacity ${duration}ms ease-in-out`,
    opacity: 0,
    marginLeft: '100px',
    paddingTop: '80px',
    width: '65vw',
  },
};

const Landing = ({ location, match }) => (
  <Transition appear in={location.pathname === match.url} timeout={duration} >
    {(state) => (
      <div key={location.pathname} style={{
        ...styles.container,
        ...transitionStyles[state],
      }}>
        <LandingImages />
      </div>
    )}
  </Transition>
);

export default Radium(Landing);
