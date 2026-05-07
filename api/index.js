// Vercel serverless function entry point for TanStack Start
import { handle } from '@tanstack/react-start/vercel';

// Import the built server entry
import serverEntry from '../dist/server.js';

export const config = {
  runtime: 'edge',
};

export default handle(serverEntry);