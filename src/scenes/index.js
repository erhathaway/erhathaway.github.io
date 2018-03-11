import React from 'react';
import PropTypes from 'prop-types';
import Radium from 'radium';

// routing
import { Switch, Route } from 'react-router-dom';

// scenes
import Landing from './Landing';
import Category from './Category';
import Project from './Project';
import Menu from './Menu';

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    width: '100vw',
    overflow: 'hidden',
  },
  mainScene: {
    display: 'flex',
    marginLeft: '50px',
    marginRight: '50px',
    width: '1200px',
    height: '100vh',
    overflowX: 'none',
    '@media (max-width: 1200px)': {
      width: '1100px',
    },
    '@media (max-width: 1000px)': {
      width: '900px',
    },
    '@media (max-width: 800px)': {
      width: '700px',
    },
    '@media (max-width: 400px)': {
      width: '300px',
    },
  },
};
const Scenes = () => (
  <div style={styles.container}>
    <div style={styles.mainScene}>
      <Menu showFullMenu />
      <Switch>
        <Route exact path="/" component={Landing} />
        <Route exact path="/category/:id" component={Category} />
        <Route path="/project/:id" component={Project} />
        <Route path="*" component={Landing} />
      </Switch>
    </div>
  </div>
);

Scenes.contextTypes = {
  router: PropTypes.object.isRequired,
};

export default Radium(Scenes);
