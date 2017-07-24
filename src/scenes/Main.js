import React from 'react';
import PropTypes from 'prop-types';

// routing
import { Switch, Route } from 'react-router-dom';

// scenes
import Landing from './Landing/Main';
import Category from './Category/Main';
import Project from './Project/Main';

const Main = () => (
  <Switch>
    <Route exact path="/" component={Landing} />
    <Route exact path="/category/:id" component={Category} />
    <Route path="/project/:id" component={Project} />
    <Route path="*" component={Landing} />
  </Switch>
);

Main.contextTypes = {
  router: PropTypes.object.isRequired,
};

export default Main;
