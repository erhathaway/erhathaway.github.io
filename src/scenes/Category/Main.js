import React from 'react';
import PropTypes from 'prop-types';

const Category = (props) => {
  const { id } = props.match.params;

  return (
    <div>
      Category - {id}
    </div>
  );
};

Category.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({ id: PropTypes.string }),
  }).isRequired,
};

export default Category;
