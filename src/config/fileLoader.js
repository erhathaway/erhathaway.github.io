// load html file and images for webpack build
require.context('../', true, /^\.\/.*\.html/);
require.context('../assets/images/', true, /^\.\/.*\.(jpg|png|svg|gif)/);
