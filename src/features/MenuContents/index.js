/* eslint-disable max-len */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import anime from 'animejs';
import ReactDOM from 'react-dom';

// routing
import { Link } from 'react-router-dom';

// actions
import { openMenuItem, closeMenuItem } from '../../actions/menu';

// reusable components
import Divider from '../../shareables/Divider';

// views
import Item from './Views/Item';

const transitionStyles = {
  // entering: {
  //   marginLeft: '-100px',
  // },
  // entered: {
  //   marginLeft: '-100px',
  // },
  // exiting: {
  //   opacity: 0,
  // }
};

const styles = {
  container: {
    width: '160px',
    display: 'flex',
    // marginLeft: '20px',
    flexDirection: 'column',
    marginLeft: '20px',
  },
};

class MainContainer extends React.Component {
    constructor(props) {
    super(props);
    this.childRefs = {};
  }

  animateEnter = () => {
    const targets = Object.values(this.childRefs).map(el => ReactDOM.findDOMNode(el));

    var nodeList = anime({
      targets,
      translateX: 20,
      elasticity: 250,
      duration: (_, i) => 1000 + (i * 600)
    });
  }

  animateButtonClick = (indexOfClick) => {
    console.log('animating button click', indexOfClick)
    const targets = Object.values(this.childRefs).map(el => ReactDOM.findDOMNode(el));

    const indexDif = (i) => Math.abs(indexOfClick - i);

    var nodeList = anime({
      targets,
      scale: [0, 1],
      elasticity: 250,
      duration: (_, i) => 1000 + (indexDif(i) * 600)
    });
  }

  componentDidMount() {
    this.animateEnter();
  }

  componentDidUpdate({ inState: oldInState }) {
    const { inState: newInState } = this.props;

    if (oldInState !== newInState && newInState === 'entering') {
      this.animateEnter();
    }
  }

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

  addRef = index => el => this.childRefs[index] = el;

  render() {
    const { activeCategory, activeDocument, activeApps, leftJustifyDivider, inState } = this.props;
    const dividerMarginLeft = leftJustifyDivider ? 15 : 0;
    return (
      <div style={styles.container}>
        <Link to="/category/woodworking" ref={this.addRef(1)} style={transitionStyles[inState]}>
          <Item name={'Woodworking'} tabIndex={0} onClick={() => this.handleCategoryClick('woodworking') && this.animateButtonClick(1)} selected={activeCategory === 'woodworking'} />
        </Link>
        <Link to="/category/hardware" ref={this.addRef(2)} style={transitionStyles[inState]}>
          <Item name={'Hardware'} tabIndex={0} onClick={() => this.handleCategoryClick('hardware') && this.animateButtonClick(2)} selected={activeCategory === 'hardware'} />
        </Link>
        <Link to="/category/software" ref={this.addRef(3)} style={transitionStyles[inState]}>
          <Item name={'Software'} tabIndex={0} onClick={() => this.handleCategoryClick('software') && this.animateButtonClick(3)} selected={activeCategory === 'software'} />
        </Link>
        <Divider width={160} tabIndex={0} marginBottom={10} marginTop={10} marginLeft={dividerMarginLeft} />
        <Item ref={this.addRef(5)} style={transitionStyles[inState]} name={'Writings'} tabIndex={0} onClick={() => this.handleDocumentClick('writings') && this.animateButtonClick(4)} selected={activeDocument === 'writings'} />
        <Divider width={160} tabIndex={0} marginBottom={10} marginTop={10} marginLeft={dividerMarginLeft} />
        <Item ref={this.addRef(7)} style={transitionStyles[inState]} name={'Terminal'} tabIndex={0} onClick={() => this.handleAppClick('terminal') && this.animateButtonClick(5)} selected={activeApps.includes('terminal')} />
        <Item ref={this.addRef(8)} style={transitionStyles[inState]} name={'Contact'} tabIndex={0} onClick={() => this.handleAppClick('contact') && this.animateButtonClick(6)} selected={activeApps.includes('contact')} />
        <Item ref={this.addRef(9)} style={transitionStyles[inState]} name={'Presence'} tabIndex={0} onClick={() => this.handleAppClick('presence') && this.animateButtonClick(7)} selected={activeApps.includes('presence')} />
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
  inState: PropTypes.string,
};

MainContainer.defaultProps = {
  activeCategory: '',
  activeDocument: '',
  activeApps: [],
  leftJustifyDivider: true,
  inState: null,
};

const Main = connect(
  mapStateToProps,
  mapDispatchToProps,
)(MainContainer);

export default Main;
