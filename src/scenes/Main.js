import React from 'react';
import PropTypes from 'prop-types';
import Radium from 'radium';

// routing
import { Switch, Route } from 'react-router-dom';

// scenes
import Landing from './Landing/Main';
import Category from './Category/Main';
import Project from './Project/Main';

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    width: '100vw',
    overflow: 'none',
  },
  mainScene: {
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
const Main = () => (
  <div style={styles.container}>
    <div style={styles.mainScene}>
      <Switch>
        <Route exact path="/" component={Landing} />
        <Route exact path="/category/:id" component={Category} />
        <Route path="/project/:id" component={Project} />
        <Route path="*" component={Landing} />
      </Switch>
    </div>
  </div>
);

Main.contextTypes = {
  router: PropTypes.object.isRequired,
};

export default Radium(Main);
