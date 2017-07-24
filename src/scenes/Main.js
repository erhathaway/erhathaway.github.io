import React from 'react';

// routing
import { Switch, Route } from 'react-router-dom';

// scenes
import Landing from './Landing/Main';
import Category from './Category/Main';
import Project from './Project/Main';

const Main = () => (
  <main>
    <Switch>
      <Route exact path="/" component={Landing} />
      <Route exact path="/category/:id" component={Category} />
      <Route path="/project/:id" component={Project} />
      <Route path="*" component={Landing} />
    </Switch>
  </main>
);

export default Main;
