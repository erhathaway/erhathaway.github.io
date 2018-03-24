import React from 'react';
import PropTypes from 'prop-types';
import Radium from 'radium';

// routing
import { Switch, Route } from 'react-router-dom';
import { withRouter } from 'react-router';
import { TransitionGroup, Transition } from 'react-transition-group';

// scenes
import Landing from './Landing';
import Category from './Category';
import Project from './Project';
import Menu from './Menu';

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    height: '100vh',
    minWidth: '800px',
  },
  scenes: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '1200px',
    overflow: 'hidden',

    /* TODO: renable media queries for scenes */
    // '@media (max-width: 1200px)': {
    //   width: '1100px',
    // },
    // '@media (max-width: 1000px)': {
    //   width: '900px',
    // },
    // '@media (max-width: 800px)': {
    //   width: '700px',
    // },
    // '@media (max-width: 400px)': {
    //   width: '300px',
    // },
  },
  menuScene: {
    width: '220px',
    alignSelf: 'flex-start',
    paddingTop: '70px',
  },
  mainScene: {
    display: 'flex',
    width: '100%',
    height: '100vh',
    overflow: 'hidden',
  },
};

const duration = 300;

const routeTransition = (Scene, initialProps) => props => (
  <Scene {...initialProps} {...props} />
);

const Scenes = withRouter(({ location }) => (
  <div style={styles.container}>
    <div style={styles.scenes}>
      {/* Menu */}
      <div style={styles.menuScene}>
        <TransitionGroup>
          <Transition
            key={location.pathname.split('/').slice(0, 2).join('/')} /* only look at primary path */
            timeout={{ enter: duration, exit: 100 }}
          >
            {inState => (
              <Switch location={location}>
                <Route path="/category/software" render={routeTransition(Menu, { inState, transitionDuration: duration, showFullMenu: false })} />
                <Route exact path="*" render={routeTransition(Menu, { inState, transitionDuration: duration, showFullMenu: true })} />
              </Switch>
            )}
          </Transition>
        </TransitionGroup>
      </div>
      {/* Main */}
      <div style={styles.mainScene}>
        <TransitionGroup>
          <Transition
            key={location.pathname}
            timeout={duration}
          >
            {inState => (
              <Switch location={location}>
                <Route exact path="/" render={routeTransition(Landing, { inState, transitionDuration: duration })} />
                <Route exact path="/category/:id" render={routeTransition(Category, { inState, transitionDuration: duration })} />
                <Route path="/project/:id" component={Project} />
                <Route path="*" render={routeTransition(Landing, { inState, transitionDuration: duration })} />
              </Switch>

            )}
          </Transition>
        </TransitionGroup>
      </div>
    </div>
  </div>
));

Scenes.contextTypes = {
  router: PropTypes.object.isRequired,
};

export default Radium(Scenes);
