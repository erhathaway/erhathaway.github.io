const defaultMenuState = {
  activeCategory: undefined,
  activeDocument: undefined,
  activeProject: undefined,
  activeApps: [],
};

export default function (state = defaultMenuState, action) {
  let newState;

  switch (action.type) {
    case 'OPEN_CATEGORY': {
      newState = Object.assign({}, state, { activeCategory: action.data });
      return newState;
    }
    case 'CLOSE_CATEGORY': {
      newState = Object.assign({}, state, { activeCategory: undefined });
      return newState;
    }
    case 'OPEN_DOCUMENT': {
      newState = Object.assign({}, state, { activeDocument: action.data });
      return newState;
    }
    case 'CLOSE_DOCUMENT': {
      newState = Object.assign({}, state, { activeDocument: undefined });
      return newState;
    }
    case 'OPEN_PROJECT': {
      newState = Object.assign({}, state, { activeProject: action.data });
      return newState;
    }
    case 'CLOSE_PROJECT': {
      newState = Object.assign({}, state, { activeProject: undefined });
      return newState;
    }
    case 'OPEN_APP': {
      const moreActiveApps = state.activeApps.concat([action.data]);
      newState = Object.assign({}, state, { activeApps: moreActiveApps });
      return newState;
    }
    case 'CLOSE_APP': {
      const lessActiveApps = state.activeApps.filter(a => a !== action.data);
      newState = Object.assign({}, state, { activeApps: lessActiveApps });
      return newState;
    }
    default: {
      return state;
    }
  }
}
