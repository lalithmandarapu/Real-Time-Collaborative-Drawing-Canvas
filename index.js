/**
 * Entry point - redirects to new server structure
 * For backward compatibility
 */

import('./server/server.js')
  .then(() => {
    console.log('Server started successfully');
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
