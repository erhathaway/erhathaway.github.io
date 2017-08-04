export function logError(errorObj) {
  return {
    type: 'LOG_ERROR',
    data: errorObj,
  };
}

export function logSuccess(successObj) {
  return {
    type: 'LOG_SUCCESS',
    data: successObj,
  };
}
