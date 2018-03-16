import React from 'react';
import Radium from 'radium';
import anime from 'animejs';
import ReactDOM from 'react-dom';


const styles = {
  container: {
    fontSize: '12px',
    marginTop: '14px',
    display: 'flex',
    justifyContent: 'flexStart',
  },
  link: {
    color: 'inherit',
    textDecoration: 'none',
    padding: '15px',
    borderRadius: '2px',
    ':hover': {
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      color: 'transparent',
      cursor: 'alias',
    },
  },
  linkedin: {
    ':hover': {
      backgroundImage: 'url("../static/images/linkedin.png")',
    },
  },
  twitter: {
    ':hover': {
      backgroundImage: 'url("../static/images/twitter.png")',
    },
  },
  github: {
    ':hover': {
      backgroundImage: 'url("../static/images/github.png")',
    },
  },
  // ball: {
  //   height: 0,
  //   width: 0,
  //   backgroundColor: 'black',
  //   borderRadius: '50%',
  // },
};

class Links extends React.Component {
  constructor(props) {
    super(props);
    this.childRefs = {};
    console.log(props)
  }

  componentDidUpdate({ inState: oldInState }) {
    const { inState: newInState } = this.props;
    if (oldInState !== newInState && newInState === 'exiting' ||  newInState === 'exited') {
      console.log(newInState)
      const links = [1,2,3].map(n => this.childRefs[n]).map(el => ReactDOM.findDOMNode(el));
      const balls = [4,5,6].map(n => this.childRefs[n]).map(el => ReactDOM.findDOMNode(el));

      // targets.each(el => el.style.marginLeft = "100px")

      // var myTimeline = anime.timeline();

      var myTimeline = anime.timeline()
        .add({
          targets: links,
          // elasticity: 250,
          fontSize: [
            { value: 0, duration: 1000, delay: 0, easing: 'easeOutExpo' },
            // { value: 1, duration: 900, elasticity: 300 },
            // { value: 4, duration: 100, delay: 500, easing: 'easeOutExpo' },
            // { value: 1, duration: 900, elasticity: 300 }
          ],
          // opacity: [
          //   { value: 0, duration: 1000, delay: 0, easing: 'easeOutExpo' },
          // ]
        })
        // .add({
        //   targets: balls,
        //   elasticity: 0,
        //   repeat: false,
        //   height: [
        //     { value: 6, duration: 600, delay: 0 },
        //   ],
        //   width: [
        //     { value: 6, duration: 600, delay: 0 },
        //   ],
        //   // borderRadius: [
        //   //   { value: '50%', duration: 1, delay: 0, easing: 'easeOutExpo' },
        //   // ],
        //   // backgroundColor: [
        //   //   { value: '#bbb', duration: 1, delay: 0, easing: 'easeOutExpo' },
        //   // ],
        // });

      // var nodeList = anime({
      //   targets,
      //   // translateY: 20,
      //   elasticity: 250,
      //   // scale: ['*=0', 1], // Scale from 2 times the original value to 1,
      //   fontSize: [
      //     { value: 0, duration: 600, delay: 0, easing: 'easeOutExpo' },
      //     // { value: 1, duration: 900, elasticity: 300 },
      //     // { value: 4, duration: 100, delay: 500, easing: 'easeOutExpo' },
      //     // { value: 1, duration: 900, elasticity: 300 }
      //   ],
      //   height: [
      //     { value: 3, duration: 600, delay: 600, easing: 'easeOutExpo' },
      //   ],
      //   width: [
      //     { value: 3, duration: 600, delay: 600, easing: 'easeOutExpo' },
      //   ],
      //   borderRadius: [
      //     { value: '50%', duration: 1, delay: 600, easing: 'easeOutExpo' },
      //   ],
      //   backgroundColor: [
      //     { value: '#bbb', duration: 1, delay: 600, easing: 'easeOutExpo' },
      //   ],
      //   // duration: 600,
      //   // direction: 'reverse',
      //   // rotate: '1turn', // Use 'turn' as unit (from 0turn to 1turn)
      //
      //   // duration: (_, i) => 1000 + (i * 600)
      // });
    }
  }

  addRef = index => el => this.childRefs[index] = el;

  render() {
    return (
      <div style={styles.container}>
        <a
          ref={this.addRef(1)}
          href="https://www.linkedin.com/in/erhathaway"
          target="_blank"
          rel="noopener noreferrer"
          key={1}
          style={[styles.link, styles.linkedin]}
        >
          Linkedin
        </a>
        <a
          ref={this.addRef(2)}
          href="https://twitter.com/erhathaway"
          target="_blank"
          rel="noopener noreferrer"
          key={2}
          style={[styles.link, styles.twitter]}
        >
          Twitter
        </a>
        <a
          ref={this.addRef(3)}
          href="https://github.com/erhathaway"
          target="_blank"
          rel="noopener noreferrer"
          key={3}
          style={[styles.link, styles.github]}
        >
          Github
        </a>
      </div>
    );
  }
}

// <div style={styles.ball} ref={this.addRef(4)} />
// <div style={styles.ball} ref={this.addRef(5)} />
// <div style={styles.ball} ref={this.addRef(6)} />


// const Links = ({ inState }) => (
//   <div style={styles.container}>
//     <a
//       href="https://www.linkedin.com/in/erhathaway"
//       target="_blank"
//       rel="noopener noreferrer"
//       key={1}
//       style={[styles.link, styles.linkedin]}
//     >
//       Linkedin
//     </a>
//     <a
//       href="https://twitter.com/erhathaway"
//       target="_blank"
//       rel="noopener noreferrer"
//       key={2}
//       style={[styles.link, styles.twitter]}
//     >
//       Twitter
//     </a>
//     <a
//       href="https://github.com/erhathaway"
//       target="_blank"
//       rel="noopener noreferrer"
//       key={3}
//       style={[styles.link, styles.github]}
//     >
//       Github
//     </a>
//   </div>
// );

export default Radium(Links);
