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

  componentDidMount() {
    this.animateEnter();
  }

  componentWillUpdate({ inState: newInState, hide: newHide }) {
    const { inState: oldInState, hide: oldHide } = this.props;

    if (oldInState !== newInState && newInState === 'exiting') this.animateExit();
    if (oldHide !== newHide && newHide === true) this.animateExit();
  }

  componentDidUpdate({ inState: oldInState, hide: oldHide }) {
    const { inState: newInState, hide: newHide } = this.props;

    if (oldInState !== newInState && newInState === 'entering') this.animateEnter();
    if (oldHide !== newHide && newHide === false) this.animateEnter();
  }

  animateEnter = () => {
    const targets = Object.values(this.childRefs).map(el => ReactDOM.findDOMNode(el));

    anime({
      targets,
      height: '50%',
      scale: [0, 1],
      elasticity: 0,
      opacity: 1,
      duration: 600,
    });
  }

  animateExit = () => {
    const targets = Object.values(this.childRefs).map(el => ReactDOM.findDOMNode(el));

    anime({
      targets,
      scale: [1, 2],
      elasticity: 0,
      duration: 200,
    });
  }

  addRef = index => (el) => { this.childRefs[index] = el; }

  render() {
    const { children, hide, ...otherProps } = this.props;
    return (
      <div ref={this.addRef(1)} style={styles.container}>
        <div styleName={hide ? 'closed-container' : 'open-container'} >
          { hide
            ? null
            : React.Children.map(children, child => React.cloneElement(child, { animationContext: 'popOutMenu', ...otherProps }))
          }
        </div>
      </div>
    );
  }
}

Component.propTypes = {
  children: PropTypes.node.isRequired,
  hide: PropTypes.bool.isRequired,
  inState: PropTypes.string,
};

Component.defaultProps = {
  inState: undefined,
};


export default Radium(Component);
