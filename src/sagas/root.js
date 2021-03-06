import { all } from 'redux-saga/effects';
import store from '../state/store';
import { logError } from '../actions/logger';

export default function* rootSaga() {
  try {
    yield all([

    ]);
  } catch (error) {
    store.dispatch(logError(error));
  }
}
