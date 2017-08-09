function MenuItemNotFoundException(name) {
  this.message = `Menu item class not found for: ${name}`;
  this.name = 'MenuItemClassNotFoundException';
}

function menuItemClassName(className) {
  switch (className) {
    case 'category': {
      return 'CATEGORY';
    }
    case 'document': {
      return 'DOCUMENT';
    }
    case 'project': {
      return 'PROJECT';
    }
    case 'app': {
      return 'APP';
    }
    default: {
      throw new MenuItemNotFoundException(className);
    }
  }
}

export function openMenuItem(className, itemName) {
  const type = `OPEN_${menuItemClassName(className)}`;
  return {
    type,
    data: itemName,
  };
}
export function closeMenuItem(className, itemName) {
  const type = `CLOSE_${menuItemClassName(className)}`;
  return {
    type,
    data: itemName,
  };
}

export function showMenu() {
  return { type: 'SHOW_MENU' };
}

export function hideMenu() {
  return { type: 'HIDE_MENU' };
}
