import React from 'react';
import PropTypes from 'prop-types';
import Radium from 'radium';
import anime from 'animejs';
import ReactDOM from 'react-dom';
import './style.css';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    height: '0%',
    opacity: 0,
  },
};

class Component extends React.Component {
  constructor(props) {
    super(props);
    this.childRefs = {};
  }

  animateEnter = () => {
    console.log('animating enter dropdown')
    const targets = Object.values(this.childRefs).map(el => ReactDOM.findDOMNode(el));
    // targets.each(el => el.style.marginLeft = "100px")
    // const duration = Math.floor(Math.random() * 1500) + 200;
    var nodeList = anime({
      targets,
      height: '50%',
      // width: '90%',
      scale: [0, 1],
      elasticity: 0,
      opacity: 1,
      duration: 600,
    });
  }

  animateExit = () => {
    console.log('animating exit dropdown')
    const targets = Object.values(this.childRefs).map(el => ReactDOM.findDOMNode(el));
    // targets.each(el => el.style.marginLeft = "100px")
    // const duration = Math.floor(Math.random() * 1500) + 200;
    var nodeList = anime({
      targets,
      // height: '0%',
      // width: '90%',
      scale: [1, 2],
      elasticity: 0,
      // opacity: 1,
      duration: 200,
    });
  }

  componentDidMount() {
    console.log('mounting dropdown')
    this.animateEnter();
  }

  componentDidUpdate({ inState: oldInState, hide: oldHide }) {
    const { inState: newInState, hide: newHide } = this.props;

    if (oldInState !== newInState && newInState === 'entering') this.animateEnter();
    if (oldHide !== newHide && newHide === false) this.animateEnter();
  }

  componentWillUpdate({ inState: newInState, hide: newHide }) {
    const { inState: oldInState, hide: oldHide } = this.props;

    if (oldInState !== newInState && newInState === 'exiting') this.animateExit();
    if (oldHide !== newHide && newHide === true) this.animateExit();
  }

  addRef = index => el => this.childRefs[index] = el;

  render() {
    const { children, hide } = this.props;
    return (
      <div ref={this.addRef(1)} style={styles.container}>
        <div styleName={hide ? 'closed-container' : 'open-container'} >
          { hide ? null : children }
        </div>
      </div>
    )
  }
}

// const PopOutMenu = ({ children, hide }) => (
//
// );

Component.propTypes = {
  children: PropTypes.node.isRequired,
  hide: PropTypes.bool.isRequired,
};

export default Radium(Component);
