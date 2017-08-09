// import renderer from 'react-test-renderer';

import React from 'react';
import { shallow } from 'enzyme';
import configureStore from 'redux-mock-store';
import { StyleRoot } from 'radium';

import App from './app';

// mock loader needed by webpack for loading of assets
jest.mock('./config/fileLoader', () => jest.fn(() => undefined));

// redux store mocking
const middlewares = [];
const storeCreator = configureStore(middlewares);
const initialState = {};

const store = storeCreator(initialState);

it('renders without crashing', () => {
  const context = { router: { hi: 'hello' } };
  const component = shallow(
    <StyleRoot>
      <App store={store} />
    </StyleRoot>,
    { context },
  );
  expect(component.exists()).toBeTruthy();
});
