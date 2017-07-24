import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';

import './style.css';

// state
import store from './state/store';

// scene
import MainAppScene from './scenes/Main';

// webpack
require('./config/fileLoader'); // loader needed by webpack for loading of assets

window.onload = () => {
  ReactDOM.render((
    <Provider store={store}>
      <BrowserRouter>
        <MainAppScene />
      </BrowserRouter>
    </Provider>
  ), document.getElementById('main'));
};

export default MainAppScene;
