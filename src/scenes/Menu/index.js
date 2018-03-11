import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Radium from 'radium';

// features
import Name from '../../features/MenuName';
import Contents from '../../features/MenuContents';
import ExpandButton from '../../features/MenuExpandButton';

// reusable components
import PopOutMenu from '../../shareables/PopOutMenu/Main';

const styles = {
  container: {
    marginTop: '140px',
    width: '220px',
    height: '100vh',
  },
  spacer: {
    marginTop: '100px',
  },
};

const Menu = ({ showFullMenu, showExpandedMenu }) => (
  showFullMenu
  ? (<div style={styles.container}>
    <Name showLinks />
    <div style={styles.spacer} />
    <Contents />
  </div>)
  : (<div style={styles.container}>
    <Name showLinks={false} />
    <ExpandButton />
    <PopOutMenu hide={showExpandedMenu}>
      <Contents leftJustifyDivider={false} />
    </PopOutMenu>
  </div>)
);

Menu.propTypes = {
  showFullMenu: PropTypes.bool.isRequired,
  showExpandedMenu: PropTypes.bool.isRequired,
};

const mapStateToProps = state => ({
  showExpandedMenu: state.menuState.showingMenu,
});

export default connect(
  mapStateToProps,
)(Radium(Menu));
