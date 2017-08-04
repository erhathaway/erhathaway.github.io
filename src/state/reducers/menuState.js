const defaultMenuState = {
  activeCategory: undefined,
  activeDocument: undefined,
  activeProject: undefined,
  activeApps: [],
  showingMenu: false,
};

export default function (state = defaultMenuState, action) {
  let newState;

  switch (action.type) {
    case 'OPEN_CATEGORY': {
      const openCatState = {
        activeCategory: action.data,
        activeDocument: undefined,
      };
      newState = Object.assign({}, state, openCatState);
      return newState;
    }
    case 'CLOSE_CATEGORY': {
      newState = Object.assign({}, state, { activeCategory: undefined });
      return newState;
    }
    case 'OPEN_DOCUMENT': {
      const openDocState = {
        activeDocument: action.data,
        activeCategory: undefined,
        activeProject: undefined,
      };
      newState = Object.assign({}, state, openDocState);
      return newState;
    }
    case 'CLOSE_DOCUMENT': {
      newState = Object.assign({}, state, { activeDocument: undefined });
      return newState;
    }
    case 'OPEN_PROJECT': {
      const openProjState = {
        activeProject: action.data,
        activeDocument: undefined,
      };
      newState = Object.assign({}, state, openProjState);
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
    case 'SHOW_MENU': {
      newState = Object.assign({}, state, { showingMenu: true });
      return newState;
    }
    case 'HIDE_MENU': {
      newState = Object.assign({}, state, { showingMenu: false });
      return newState;
    }
    default: {
      return state;
    }
  }
}
