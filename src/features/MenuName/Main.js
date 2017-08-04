import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

// routing
import { Link } from 'react-router-dom'

// reusable components
import Divider from '../../shareables/Divider';

// views
import Name from './Views/Name';
import Links from './Views/Links';

const styles = {
  container: {
    width: '220px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
};

const renderDivider = () => (<Divider width={215} marginLeft={15} />);
const renderLinks = () => (<Links />);

const MainContainer = ({ color, showLinks }) => (
  <div style={styles.container}>
  <Link to="/">
    <Name style={{ color }} />
  </Link>
    { showLinks && renderDivider() }
    { showLinks && renderLinks() }
  </div>
);

const mapStateToProps = state => ({
  color: state.styleState.fontColor,
});

MainContainer.propTypes = {
  color: PropTypes.string.isRequired,
  showLinks: PropTypes.bool.isRequired,
};

const Main = connect(
  mapStateToProps,
)(MainContainer);

export default Main;
