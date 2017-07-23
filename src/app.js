import React from 'react';
import ReactDOM from 'react-dom';
import './style.css';

require.context('./', true, /^\.\/.*\.html/);
require.context('./assets/images/', true, /^\.\/.*\.(jpg|png|svg|gif)/);

const HelloWorld = () => (
  <div styleName="container">Hello World</div>
);

window.onload = () => {
  ReactDOM.render(
    <HelloWorld />
    , document.getElementById('main'));
};
