import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { StyleRoot } from 'radium';

import './style.css';

// state
import store from './state/store';

// scene
import Scenes from './scenes';

// webpack
require('./config/fileLoader'); // loader needed by webpack for loading of assets

window.onload = () => {
  ReactDOM.render((
    <Provider store={store}>
      <StyleRoot>
        <BrowserRouter>
          <Scenes />
        </BrowserRouter>
      </StyleRoot>
    </Provider>
  ), document.getElementById('main'));
};

export default Scenes;
