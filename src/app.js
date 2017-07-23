import React from 'react';
import ReactDOM from 'react-dom';
import './style.css';

// loader needed by webpack for loading of assets
const fileLoaderModule = require('./config/fileLoader')

const HelloWorld = () => (
  <div styleName="container">
    <a> Hello World</a>
    <img src='./static/images/sampleImage.jpg' alt='sample image'></img>
  </div>
);

window.onload = () => {
  ReactDOM.render(
    <HelloWorld />
    , document.getElementById('main'));
};

export default HelloWorld
