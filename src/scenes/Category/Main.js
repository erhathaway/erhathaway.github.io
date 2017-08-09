import React from 'react';
import PropTypes from 'prop-types';
import Menu from '../Menu/Main';
import LandingImages from '../LandingImages/Main';

const styles = {
  container: {
    height: '100vh',
    overflow: 'auto',
    display: 'flex',
    justifyContent: 'spaceBetween',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: '100px',
  },
};

const Category = (props) => {
  const { id } = props.match.params;

  return (
    <div style={styles.container}>

      <div style={styles.left}>
        <Menu showFullMenu={false} />
        { id }
      </div>
      <div style={styles.right}>
        <LandingImages />
      </div>
    </div>
  );
};

Category.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({ id: PropTypes.string }),
  }).isRequired,
};

export default Category;
