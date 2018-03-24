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

const styles = {
  container: {
    width: '160px',
    display: 'flex',
    flexDirection: 'column',
  },
};

class Component extends React.Component {
  constructor(props) {
    super(props);
    this.childRefs = {};
  }

  componentDidMount() {
    if (!this.props.animationContext === 'popOutMenu') this.animateEnter();
  }

  componentDidUpdate({ inState: oldInState }) {
    const { inState: newInState, animationContext } = this.props;

    if (animationContext !== 'popOutMenu' && oldInState !== newInState && newInState === 'entering') {
      this.animateEnter();
    }

    if (oldInState !== newInState && newInState === 'exiting') {
      this.animateExit();
    }
  }

  animateEnter = () => {
    const targets = Object.values(this.childRefs).map(el => ReactDOM.findDOMNode(el));

    anime({
      targets,
      translateX: [20, 0],
      elasticity: 250,
      duration: (_, i) => 1000 + (i * 600),
    });
  }

  animateExit = () => {
    const targets = Object.values(this.childRefs).map(el => ReactDOM.findDOMNode(el));

    anime({
      targets,
      opacity: 0,
      duration: 10,
    });
  }

  animateButtonClick = (indexOfClick) => {
    if (this.props.animationContext === 'popOutMenu') return;
    const targets = Object.values(this.childRefs).map(el => ReactDOM.findDOMNode(el));
    const indexDif = i => Math.abs(indexOfClick - i) + 1;

    anime({
      targets,
      translateX: [0, 6, 0],
      elasticity: 400,
      round: 1,
      duration: (_, i) => indexDif(i) * 60,
    });
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

  addRef = index => (el) => { this.childRefs[index] = el; }

  render() {
    const { activeCategory, activeDocument, activeApps, leftJustifyDivider } = this.props;
    const dividerMarginLeft = leftJustifyDivider ? 15 : 0;
    return (
      <div style={styles.container}>
        <Link to="/category/woodworking" ref={this.addRef(1)}>
          <Item name={'Woodworking'} tabIndex={0} onClick={() => { this.handleCategoryClick('woodworking'); this.animateButtonClick(1); }} selected={activeCategory === 'woodworking'} />
        </Link>
        <Link to="/category/hardware" ref={this.addRef(2)}>
          <Item name={'Hardware'} tabIndex={0} onClick={() => { this.handleCategoryClick('hardware'); this.animateButtonClick(2); }} selected={activeCategory === 'hardware'} />
        </Link>
        <Link to="/category/software" ref={this.addRef(3)}>
          <Item name={'Software'} tabIndex={0} onClick={() => { this.handleCategoryClick('software'); this.animateButtonClick(3); }} selected={activeCategory === 'software'} />
        </Link>
        <Divider width={160} tabIndex={0} marginBottom={10} marginTop={10} marginLeft={dividerMarginLeft} />
        <Item ref={this.addRef(5)} name={'Writings'} tabIndex={0} onClick={() => { this.handleDocumentClick('writings'); this.animateButtonClick(4); }} selected={activeDocument === 'writings'} />
        <Divider width={160} tabIndex={0} marginBottom={10} marginTop={10} marginLeft={dividerMarginLeft} />
        <Item ref={this.addRef(7)} name={'Terminal'} tabIndex={0} onClick={() => { this.handleAppClick('terminal'); this.animateButtonClick(5); }} selected={activeApps.includes('terminal')} />
        <Item ref={this.addRef(8)} name={'Contact'} tabIndex={0} onClick={() => { this.handleAppClick('contact'); this.animateButtonClick(6); }} selected={activeApps.includes('contact')} />
        <Item ref={this.addRef(9)} name={'Presence'} tabIndex={0} onClick={() => { this.handleAppClick('presence'); this.animateButtonClick(7); }} selected={activeApps.includes('presence')} />
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

Component.propTypes = {
  openMenuItem: PropTypes.func.isRequired,
  closeMenuItem: PropTypes.func.isRequired,
  activeCategory: PropTypes.string,
  activeDocument: PropTypes.string,
  activeApps: PropTypes.arrayOf(PropTypes.string),
  leftJustifyDivider: PropTypes.bool,
  inState: PropTypes.string,
  animationContext: PropTypes.string,
};

Component.defaultProps = {
  activeCategory: '',
  activeDocument: '',
  activeApps: [],
  leftJustifyDivider: true,
  inState: undefined,
  animationContext: undefined,
};

export default connect(mapStateToProps, mapDispatchToProps)(Component);
