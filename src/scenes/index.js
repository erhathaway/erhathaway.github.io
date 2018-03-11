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
    alignSelf: 'flex-start',
    paddingTop: '70px',
  },
  mainScene: {
    display: 'flex',
    width: '100%',
    height: '100vh',
    overflowX: 'hidden',
  },
};
const Scenes = () => (
  <div style={styles.container}>
    <div style={styles.scenes}>
      {/* Menu */}
      <div style={styles.menuScene}>
        <Switch>
          <Route exact path="/category/hardware" render={() => <Menu showFullMenu={false} />} />
          <Route exact path="*" render={() => <Menu showFullMenu />} />
        </Switch>
      </div>
      {/* Main */}
      <div style={styles.mainScene}>
        <Switch>
          <Route exact path="/" component={Landing} />
          <Route exact path="/category/:id" component={Category} />
          <Route path="/project/:id" component={Project} />
          <Route path="*" component={Landing} />
        </Switch>
      </div>
    </div>
  </div>
);

Scenes.contextTypes = {
  router: PropTypes.object.isRequired,
};

export default Radium(Scenes);
