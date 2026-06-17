import { join } from 'path';
import { pathToFileURL } from 'url';

// Reuse game-trailer handlers with different defaults
const trailerPath = join(import.meta.dirname, '..', 'game-trailer', 'animations.js');
const trailer = await import(pathToFileURL(trailerPath).href);

export const handlers = trailer.handlers;
