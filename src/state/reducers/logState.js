const defaultLogState = {
  errors: [],
  successes: [],
};

export default function (state = defaultLogState, action) {
  let newState;

  switch (action.type) {
    case 'LOG_ERROR': {
      const errors = state.errors.concat([action.data]);
      newState = Object.assign({}, state, { errors });
      return newState;
    }
    case 'LOG_SUCCESS': {
      const successes = state.successes.concat([action.data]);
      newState = Object.assign({}, state, { successes });
      return newState;
    }
    default: {
      return state;
    }
  }
}
