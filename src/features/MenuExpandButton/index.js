import React from 'react';
import Radium from 'radium';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';

// actions
import { showMenu, hideMenu } from '../../actions/menu';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  button: {
    height: '6px',
    width: '6px',
    borderRadius: '3px',
    margin: '3px',
  },
  one: {
    backgroundColor: 'blue',
  },
  two: {
    backgroundColor: 'green',
  },
  three: {
    backgroundColor: 'red',
  },
};


const MainContainer = ({ showingMenu, showMenuAction, hideMenuAction }) => {
  const toggleMenu = () => {
    if (showingMenu) hideMenuAction();
    else showMenuAction();
  };

  return (
    <div role="menuItem" tabIndex={0} onClick={toggleMenu} style={styles.container}>
      <div style={[styles.button, styles.one]} />
      <div style={[styles.button, styles.two]} />
      <div style={[styles.button, styles.three]} />
    </div>
  );
};

const mapStateToProps = state => ({
  showingMenu: state.menuState.showingMenu,
});

const mapDispatchToProps = dispatch => ({
  showMenuAction: bindActionCreators(showMenu, dispatch),
  hideMenuAction: bindActionCreators(hideMenu, dispatch),
});

MainContainer.propTypes = {
  showMenuAction: PropTypes.func.isRequired,
  hideMenuAction: PropTypes.func.isRequired,
  showingMenu: PropTypes.bool.isRequired,
};

const Main = connect(
  mapStateToProps,
  mapDispatchToProps,
)(Radium(MainContainer));

export default Main;
