import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

// routing
import { Link } from 'react-router-dom';

// reusable components
import Divider from '../../shareables/Divider';

// views
import Name from './Views/Name';
import Links from './Views/Links';

const linkTransitionStyles = {
  entering: {
    opacity: 0,
  },
  entered: {
    opacity: 1,
  },
  exiting: {
    opacity: 1,
  },
  exited: {
    opacity: 0,
  },
};

const dividerTransitionStyles = {};

const styles = () => ({
  container: {
    width: '220px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  linkContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
});

const renderDivider = () => (<Divider width={215} marginLeft={15} />);
const renderLinks = inState => (<Links inState={inState} />);

const Component = ({ inState, transitionDuration, color, showLinks }) => (
  <div style={styles(transitionDuration).container}>
    <Link to="/">
      <Name style={{ color }} />
    </Link>
    <div style={{ ...styles(transitionDuration).linkContainer, ...linkTransitionStyles[inState] }}>
      <div
        style={{
          ...styles(transitionDuration).dividerContainer,
          ...dividerTransitionStyles[inState],
        }}
      >
        { showLinks && renderDivider() }
      </div>
      { showLinks && renderLinks(inState) }
    </div>
  </div>
);

const mapStateToProps = state => ({
  color: state.styleState.fontColor,
});

Component.propTypes = {
  color: PropTypes.string.isRequired,
  showLinks: PropTypes.bool.isRequired,
  inState: PropTypes.string,
  transitionDuration: PropTypes.number,
};

Component.defaultProps = {
  inState: undefined,
  transitionDuration: 300,
};

export default connect(mapStateToProps)(Component);
