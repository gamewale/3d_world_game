import { Game } from './core/Game';

const appContainer = document.getElementById('app');

if (!appContainer) {
  throw new Error('Failed to find #app container in index.html');
}

const game = new Game(appContainer);
game.start();