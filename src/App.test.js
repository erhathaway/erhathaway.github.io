import renderer from 'react-test-renderer';

import React from 'react';
import App from './App';

// mock loader needed by webpack for loading of assets
jest.mock('./config/fileLoader', () => jest.fn(() => undefined));

it('renders without crashing', () => {
  const rendered = renderer.create(<App />).toJSON();
  expect(rendered).toBeTruthy();
});
