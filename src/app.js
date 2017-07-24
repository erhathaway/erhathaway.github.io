import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import './style.css';

// scene
import MainAppScene from './scenes/Main';

// webpack
require('./config/fileLoader'); // loader needed by webpack for loading of assets


window.onload = () => {
  ReactDOM.render((
    <BrowserRouter>
      <MainAppScene />
    </BrowserRouter>
  ), document.getElementById('main'));
};

export default MainAppScene;
