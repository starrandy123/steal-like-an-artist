/* THE PARKS: every park the title can choose, each a module of plain data (its rows, its named gaps, its run, its goals, its trees). The first
 * is the default and what a save from before the second park meant. */
import plaza from './plaza.js';
import kilnyard from './kilnyard.js';

export const PARKS = [plaza, kilnyard];
export const parkById = (id) => PARKS.find((p) => p.id === id) || PARKS[0];
