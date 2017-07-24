const defaultStyleState = {
  fontColor: '#78A15A',
};

export default function (state = defaultStyleState, action) {
  let newState;

  switch (action.type) {
    case 'SET_FONT_COLOR': {
      newState = Object.assign({}, state, { fontColor: action.data });
      return newState;
    }
    default: {
      return state;
    }
  }
}
