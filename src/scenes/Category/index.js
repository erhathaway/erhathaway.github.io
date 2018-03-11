import React from 'react';
import PropTypes from 'prop-types';
import LandingImages from '../LandingImages/Main';

const styles = {
  container: {
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    marginLeft: '100px',
    width: '50vw',
  },
};

const Category = (props) => {
  const { id } = props.match.params;

  return (
    <div style={styles.container}>
      <LandingImages />
    </div>
  );
};

Category.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({ id: PropTypes.string }),
  }).isRequired,
};

export default Category;
