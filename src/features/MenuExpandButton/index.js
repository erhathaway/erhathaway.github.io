import React from 'react';
import Radium from 'radium';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import anime from 'animejs';
import ReactDOM from 'react-dom';

// actions
import { showMenu, hideMenu } from '../../actions/menu';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  button: {
    height: '0px',
    width: '0px',
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

class Component extends React.Component {
  constructor(props) {
    super(props);
    this.childRefs = {};
  }

  componentDidMount() {
    this.animateEnter();
  }

  componentDidUpdate({ inState: oldInState }) {
    const { inState: newInState } = this.props;
    if (oldInState !== newInState && newInState === 'exiting') this.animateExit();
  }

  animateEnter = (instant = false) => {
    const targets = Object.values(this.childRefs).map(el => ReactDOM.findDOMNode(el));
    anime({
      targets,
      height: [0, 6],
      width: [0, 6],
      opacity: 1,
      elasticity: 750,
      duration: instant ? 1 : (_, i) => (i * 900),
    });
  }

  animateExit = () => {
    const targets = Object.values(this.childRefs).map(el => ReactDOM.findDOMNode(el)).reverse();
    anime({
      targets,
      opacity: 0,
      duration: (_, i) => (i * 900),
    });
  }

  toggleMenu = () => {
    const { showingMenu, hideMenuAction, showMenuAction } = this.props;
    if (showingMenu) hideMenuAction();
    else showMenuAction();
  };

  addRef = index => (el) => { this.childRefs[index] = el; }

  render() {
    return (
      <div role="menuItem" tabIndex={0} onClick={this.toggleMenu} style={styles.container}>
        <div ref={this.addRef(1)} style={[styles.button, styles.one]} />
        <div ref={this.addRef(2)} style={[styles.button, styles.two]} />
        <div ref={this.addRef(3)} style={[styles.button, styles.three]} />
      </div>
    );
  }
}

const mapStateToProps = state => ({
  showingMenu: state.menuState.showingMenu,
});

const mapDispatchToProps = dispatch => ({
  showMenuAction: bindActionCreators(showMenu, dispatch),
  hideMenuAction: bindActionCreators(hideMenu, dispatch),
});

Component.propTypes = {
  showMenuAction: PropTypes.func.isRequired,
  hideMenuAction: PropTypes.func.isRequired,
  showingMenu: PropTypes.bool.isRequired,
  inState: PropTypes.string,
};

Component.defaultProps = {
  inState: undefined,
};

export default connect(mapStateToProps, mapDispatchToProps)(Radium(Component));
