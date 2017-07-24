import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';

// state actions
import { openMenuItem, closeMenuItem } from '../../state/actions/menu';

// views
import Name from './Views/Name';

const styles = {
  container: {
    width: '216px',
    height: '455px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
};

class MenuContainer extends React.Component {
  openMenuItem = (className, itemName) => this.props.openMenuItem(className, itemName)
  closeMenuItem = (className, itemName) => this.props.closeMenuItem(className, itemName)

  render() {
    const { fontColor } = this.props;
    const sharedStyles = { fontColor };

    return (
      <div style={styles.container}>
        <Name style={sharedStyles} />
      </div>
    );
  }
}

const mapStateToProps = state => ({
  fontColor: state.styleState.fontColor,
  activeCategory: state.menuState.activeCategory,
  activeDocument: state.menuState.activeDocument,
  activeProject: state.menuState.activeProject,
  activeApps: state.menuState.activeApps,
});

const mapDispatchToProps = dispatch => ({
  openMenuItem: bindActionCreators(openMenuItem, dispatch),
  closeMenuItem: bindActionCreators(closeMenuItem, dispatch),
});

MenuContainer.propTypes = {
  openMenuItem: PropTypes.func.isRequired,
  closeMenuItem: PropTypes.func.isRequired,
  fontColor: PropTypes.string.isRequired,
};

const Menu = connect(
  mapStateToProps,
  mapDispatchToProps,
)(MenuContainer);

export default Menu;
