import React from 'react';
import PropTypes from 'prop-types';
import anime from 'animejs';
import ReactDOM from 'react-dom';

class Component extends React.Component {
  constructor(props) {
    super(props);
    this.childRefs = {};
  }

  animate = () => {
    const targets = Object.values(this.childRefs).map(el => ReactDOM.findDOMNode(el));
    // targets.each(el => el.style.marginLeft = "100px")
    const duration = Math.floor(Math.random() * 1500) + 200;
    var nodeList = anime({
      targets,
      height: '90%',
      width: '90%',
      elasticity: 0,
      opacity: 0.7,
      duration,
    });
  }

  componentDidMount() {
    this.animate();

  }
  componentDidUpdate({ inState: oldInState }) {
    const { inState: newInState } = this.props;

    if (oldInState !== newInState && newInState === 'entering') this.animate();
  }

  addRef = index => el => this.childRefs[index] = el;

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
            backgroundColor: overlaycolor, height: '80%', width: '80%',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
              opacity: 0.5
          }}
        >
        </div>
      </div>
    );
  }
};

Component.propTypes = {
  widthPriority: PropTypes.number.isRequired,
  overlaycolor: PropTypes.string.isRequired,
  backgroundImage: PropTypes.string,
  onClick: PropTypes.func.isRequired,
};

Component.defaultProps = {
  backgroundImage: undefined,
};

export default Component;
