import React from 'react';
import PropTypes from 'prop-types';

// features
import Header from '../../features/MenuHeader/Main';
import Contents from '../../features/MenuContents/Main';
import Expander from '../../features/MenuExpandButton/Main';

// reusable components
import PopOutMenu from '../../shareables/PopOutMenu/Main';

const styles = {
  container: {
    marginLeft: '100px',
    marginTop: '105px',
    width: '220px',
  },
  spacer: {
    marginTop: '100px',
  },
};

const Menu = ({ showFullMenu }) => (
  showFullMenu
  ? (<div style={styles.container}>
    <Header showLinks />
    <div style={styles.spacer} />
    <Contents />
  </div>)
  : (<div style={styles.container}>
    <Header showLinks={false} />
    <Expander />
    <PopOutMenu>
      <Contents />
    </PopOutMenu>
  </div>)
);

Menu.propTypes = {
  showFullMenu: PropTypes.bool.isRequired,
};

export default Menu;
