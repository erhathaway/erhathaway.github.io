export function setFontColor(fontColor) {
  return {
    type: 'SET_FONT_COLOR',
    data: fontColor,
  };
}

export function setBackgroundColor(backgroundColor) {
  return {
    type: 'SET_BACKGROUND_COLOR',
    data: backgroundColor,
  };
}
