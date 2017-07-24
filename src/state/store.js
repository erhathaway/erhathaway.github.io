import { compose, createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { persistStore, autoRehydrate } from 'redux-persist';
import localForage from 'localforage';

import rootSaga from '../sagas/root';
import rootReducer from './reducers/root';

const sagaMiddleware = createSagaMiddleware();

const store = createStore(
  rootReducer,
  undefined,
  compose(
    applyMiddleware(sagaMiddleware), // allows sagas to catch actions
    autoRehydrate(), // add persistance to app
  ),
);

persistStore(store, { storage: localForage });

sagaMiddleware.run(rootSaga);

export default store;
