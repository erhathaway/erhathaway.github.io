import React from 'react';
import PropTypes from 'prop-types';

const Project = (props) => {
  const { id } = props.match.params;

  return (
    <div>
      Project - {id}
      <img src="../static/images/sampleImage.jpg" alt="sample" />
    </div>
  );
};

Project.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({ id: PropTypes.string }),
  }).isRequired,
};

export default Project;
