import type { PageLoad } from './$types';

export const load: PageLoad = ({ params, data }) => {
  return {
    ...data,
    projectId: parseInt(params.id)
  };
};
