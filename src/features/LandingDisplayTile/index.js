import React from 'react';
import PropTypes from 'prop-types';
import anime from 'animejs';
import ReactDOM from 'react-dom';

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
    if (oldInState !== newInState && (newInState === 'entered')) this.animateEnter(200);
  }


  animateEnter = (delay = 0) => {
    const targets = Object.values(this.childRefs).map(el => ReactDOM.findDOMNode(el));
    const duration = Math.floor(Math.random() * 600) + 200;
    anime({
      targets,
      scale: [0, 1],
      elasticity: 0,
      opacity: [0, 0.7],
      duration,
      delay,
    });
  }

  addRef = index => (el) => { this.childRefs[index] = el; }

  render() {
    const { widthPriority, overlaycolor, backgroundImage, onClick } = this.props;

    const backgroundStyle = backgroundImage ? { backgroundImage } : {};
    const calcStyle = {
      flexGrow: widthPriority,
      height: 'calc(100%-3px)',
      margin: '1.5px',
      display: 'flex',
      justifyContent: 'center',
      alignContent: 'center',
    };
    const style = Object.assign({}, calcStyle, backgroundStyle);

    return (
      <div role="menuItem" tabIndex={0} style={style} onClick={onClick}>
        <div
          ref={this.addRef(1)}
          style={{
            backgroundColor: overlaycolor,
            height: '90%',
            width: '90%',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
            opacity: 0.5,
          }}
        />
      </div>
    );
  }
}

Component.propTypes = {
  widthPriority: PropTypes.number.isRequired,
  overlaycolor: PropTypes.string.isRequired,
  backgroundImage: PropTypes.string,
  onClick: PropTypes.func.isRequired,
  inState: PropTypes.string,
};

Component.defaultProps = {
  backgroundImage: undefined,
  inState: undefined,
};

export default Component;
