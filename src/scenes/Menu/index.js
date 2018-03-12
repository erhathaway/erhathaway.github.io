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

const transitionStyles = {
  entering: {
    opacity: 0,
    // transform: 'translateX(100%)',
  },
  entered: {
    opacity: 1,
  },
  // exiting: {
  //   opacity: 1,
  //   // transform: 'translateX(100%)',
  // },
  // exited: {
  //   opacity: 0,
  // }
};

const styles = (duration) => ({
  container: {
    position: 'absolute',
    width: '220px',
    paddingLeft: '20px',
  },
  spacer: {
    transition: `opacity ${duration}ms ease-in-out, transform ${duration}ms ease-in-out`,
    marginTop: '100px',
  },
  opacity: {
    transition: `opacity ${duration}ms ease-in`,
  }
});

const Menu = ({ inState, transitionDuration, showFullMenu, showExpandedMenu }) => (
  showFullMenu
  ? (<div style={{...styles(transitionDuration).container}}>
    <Name showLinks />
    <div style={{...styles(transitionDuration).spacer}} />
    <div style={{...styles(transitionDuration).opacity, ...transitionStyles[inState]}} >
      <Contents inState={inState}/>
    </div>
  </div>)
  : (<div style={{...styles(transitionDuration).container}}>
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
