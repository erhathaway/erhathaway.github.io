import React from 'react';
import PropTypes from 'prop-types';

// features
import Name from '../../features/MenuName';
import Contents from '../../features/MenuContents';
import ExpandButton from '../../features/MenuExpandButton';

// reusable components
import PopOutMenu from '../../shareables/PopOutMenu/Main';

const styles = {
  container: {
    marginTop: '-40px',
    width: '220px',
  },
  spacer: {
    marginTop: '100px',
  },
};

const Menu = ({ showFullMenu }) => (
  showFullMenu
  ? (<div style={styles.container}>
    <Name showLinks />
    <div style={styles.spacer} />
    <Contents />
  </div>)
  : (<div style={styles.container}>
    <Name showLinks={false} />
    <ExpandButton />
    <PopOutMenu>
      <Contents leftJustifyDivider={false} />
    </PopOutMenu>
  </div>)
);

Menu.propTypes = {
  showFullMenu: PropTypes.bool.isRequired,
};

export default Menu;
