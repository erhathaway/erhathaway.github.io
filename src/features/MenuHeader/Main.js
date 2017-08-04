import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

// reusable components
import Divider from '../../shareables/Divider';

// views
import Name from './Views/Name';
import Links from './Views/Links';

const styles = {
  container: {
    width: '226px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
};

const MainContainer = ({ color }) => (
  <div style={styles.container}>
    <Name style={{ color }} />
    <Divider width={215} marginLeft={15} />
    <Links />
  </div>
);

const mapStateToProps = state => ({
  color: state.styleState.fontColor,
});

MainContainer.propTypes = {
  color: PropTypes.string.isRequired,
};

const Main = connect(
  mapStateToProps,
)(MainContainer);

export default Main;
