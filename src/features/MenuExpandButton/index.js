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


// const MainContainer = ({ showingMenu, showMenuAction, hideMenuAction }) => {
class MainContainer extends React.Component {
  constructor(props) {
    super(props);
    this.childRefs = {};
    // console.log(this.props.newInState)
  }

  componentDidUpdate({ inState: oldInState }) {
    const { inState: newInState } = this.props;

    if (oldInState !== newInState && newInState === 'entering') {
      const targets = Object.values(this.childRefs).map(el => ReactDOM.findDOMNode(el));
      // targets.each(el => el.style.marginLeft = "100px")
      var nodeList = anime({
        targets,
        // translateX: 20,
        height: 6,
        width: 6,
        elasticity: 750,
        duration: (_, i) => (i * 900)
      });
    }

    else if (oldInState !== newInState && newInState === 'exiting') {
      const targets = Object.values(this.childRefs).map(el => ReactDOM.findDOMNode(el));
      // targets.each(el => el.style.marginLeft = "100px")
      var nodeList = anime({
        targets,
        // translateX: 20,
        opacity: 0,
        duration: (_, i) => (i * 900)
      });
    }

    else {
      const targets = Object.values(this.childRefs).map(el => ReactDOM.findDOMNode(el));
      // targets.each(el => el.style.marginLeft = "100px")
      var nodeList = anime({
        targets,
        height: 6,
        width: 6,
        opacity: 1,
        duration: (_, i) => (1)
      });
    }
  }

  toggleMenu = () => {
    const { showingMenu, hideMenuAction, showMenuAction } = this.props;
    if (showingMenu) hideMenuAction();
    else showMenuAction();
  };

  addRef = index => el => this.childRefs[index] = el;

  render() {
    return (
      <div role="menuItem" tabIndex={0} onClick={this.toggleMenu} style={styles.container}>
        <div ref={this.addRef(1)} style={[styles.button, styles.one]} />
        <div ref={this.addRef(2)} style={[styles.button, styles.two]} />
        <div ref={this.addRef(3)} style={[styles.button, styles.three]} />
      </div>
    );
  }
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
