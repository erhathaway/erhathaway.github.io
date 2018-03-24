import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Radium from 'radium';

// features
import Name from '../../features/MenuName';
import Contents from '../../features/MenuContents';
import ExpandButton from '../../features/MenuExpandButton';

// reusable components
import PopOutMenu from '../../shareables/PopOutMenu';

const transitionStyles = {
  entering: {
    opacity: 0,
  },
  entered: {
    opacity: 1,
  },
};

const styles = duration => ({
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
  },
});

const Component = ({ inState, transitionDuration, showFullMenu, showExpandedMenu }) => (
  showFullMenu
  ? (<div style={{ ...styles(transitionDuration).container }}>
    <Name showLinks inState={inState} />
    <div style={{ ...styles(transitionDuration).spacer }} />
    <div style={{ ...styles(transitionDuration).opacity, ...transitionStyles[inState] }}>
      <Contents inState={inState} />
    </div>
  </div>)
  : (<div style={{ ...styles(transitionDuration).container }}>
    <Name showLinks={false} />
    <ExpandButton inState={inState} />
    <PopOutMenu hide={showExpandedMenu}>
      <Contents leftJustifyDivider={false} />
    </PopOutMenu>
  </div>)
);

Component.propTypes = {
  showFullMenu: PropTypes.bool.isRequired,
  showExpandedMenu: PropTypes.bool.isRequired,
  inState: PropTypes.string,
  transitionDuration: PropTypes.number,
};

Component.defaultProps = {
  inState: undefined,
  transitionDuration: 300,
};

const mapStateToProps = state => ({
  showExpandedMenu: state.menuState.showingMenu,
});

export default connect(mapStateToProps)(Radium(Component));
