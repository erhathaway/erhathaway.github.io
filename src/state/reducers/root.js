import { combineReducers } from 'redux';
import logState from './logState';
import menuState from './menuState';
import styleState from './styleState';

const rootReducer = combineReducers({
  logState,
  menuState,
  styleState,
});

export default rootReducer;
