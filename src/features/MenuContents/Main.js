/* eslint-disable max-len */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';

// routing
import { Link } from 'react-router-dom'

// actions
import { openMenuItem, closeMenuItem } from '../../actions/menu';

// reusable components
import Divider from '../../shareables/Divider';

// views
import Item from './Views/Item';


const styles = {
  container: {
    width: '160px',
    display: 'flex',
    flexDirection: 'column',
  },
};

class MainContainer extends React.Component {
  handleCategoryClick = (categoryName) => {
    if (this.props.activeCategory === categoryName) this.props.closeMenuItem('category', categoryName);
    else this.props.openMenuItem('category', categoryName);
  }

  handleDocumentClick = (documentName) => {
    if (this.props.activeDocument === documentName) this.props.closeMenuItem('document', documentName);
    else this.props.openMenuItem('document', documentName);
  }

  handleAppClick = (appName) => {
    if (this.props.activeApps.includes(appName)) this.props.closeMenuItem('app', appName);
    else this.props.openMenuItem('app', appName);
  }

  render() {
    const { activeCategory, activeDocument, activeApps, leftJustifyDivider } = this.props;
    const dividerMarginLeft = leftJustifyDivider ? 15 : 0;
    return (
      <div style={styles.container}>
      <Link to="/category/woodworking">
        <Item name={'Woodworking'} tabIndex={0} onClick={() => this.handleCategoryClick('woodworking')} selected={activeCategory === 'woodworking'} />
      </Link>
      <Link to="/category/hardware">
        <Item name={'Hardware'} tabIndex={0} onClick={() => this.handleCategoryClick('hardware')} selected={activeCategory === 'hardware'} />
      </Link>
      <Link to="/category/software">
        <Item name={'Software'} tabIndex={0} onClick={() => this.handleCategoryClick('software')} selected={activeCategory === 'software'} />
      </Link>
        <Divider width={160} tabIndex={0} marginBottom={10} marginTop={10} marginLeft={dividerMarginLeft} />
        <Item name={'Writings'} tabIndex={0} onClick={() => this.handleDocumentClick('writings')} selected={activeDocument === 'writings'} />
        <Divider width={160} tabIndex={0} marginBottom={10} marginTop={10} marginLeft={dividerMarginLeft} />
        <Item name={'Terminal'} tabIndex={0} onClick={() => this.handleAppClick('terminal')} selected={activeApps.includes('terminal')} />
        <Item name={'Contact'} tabIndex={0} onClick={() => this.handleAppClick('contact')} selected={activeApps.includes('contact')} />
        <Item name={'Presence'} tabIndex={0} onClick={() => this.handleAppClick('presence')} selected={activeApps.includes('presence')} />
      </div>
    );
  }
}

const mapStateToProps = state => ({
  activeCategory: state.menuState.activeCategory,
  activeDocument: state.menuState.activeDocument,
  activeApps: state.menuState.activeApps,
});

const mapDispatchToProps = dispatch => ({
  openMenuItem: bindActionCreators(openMenuItem, dispatch),
  closeMenuItem: bindActionCreators(closeMenuItem, dispatch),
});

MainContainer.propTypes = {
  openMenuItem: PropTypes.func.isRequired,
  closeMenuItem: PropTypes.func.isRequired,
  activeCategory: PropTypes.string,
  activeDocument: PropTypes.string,
  activeApps: PropTypes.arrayOf(PropTypes.string),
  leftJustifyDivider: PropTypes.bool,
};

MainContainer.defaultProps = {
  activeCategory: '',
  activeDocument: '',
  activeApps: [],
  leftJustifyDivider: true,
};

const Main = connect(
  mapStateToProps,
  mapDispatchToProps,
)(MainContainer);

export default Main;
