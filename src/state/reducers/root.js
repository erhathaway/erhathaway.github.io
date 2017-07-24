import { combineReducers } from 'redux';
import logState from './logState';

const rootReducer = combineReducers({
  logState,
});

export default rootReducer;
