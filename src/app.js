import React from 'react';
import ReactDOM from 'react-dom';
import './style.css';

// loader needed by webpack for loading of assets
require('./config/fileLoader');

const App = () => (
  <div styleName="container">
    <a> Hello World</a>
    <img src="./static/images/sampleImage.jpg" alt="sample" />
  </div>
);

window.onload = () => {
  ReactDOM.render(
    <App />
    , document.getElementById('main'));
};

export default App;
