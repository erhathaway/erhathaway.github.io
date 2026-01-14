import type { PageLoad } from './$types';
import { items } from '$lib/data/items';
import { error } from '@sveltejs/kit';

export const load: PageLoad = ({ params }) => {
  const id = parseInt(params.id);
  const item = items.find(i => i.id === id);

  if (!item) {
    error(404, 'Project not found');
  }

  return {
    item
  };
};