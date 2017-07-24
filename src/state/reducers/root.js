import { combineReducers } from 'redux';
import logState from './logState';
import menuState from './menuState';

const rootReducer = combineReducers({
  logState,
  menuState,
});

export default rootReducer;
