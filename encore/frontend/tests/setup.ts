import '@testing-library/jest-dom/vitest';

// Provide the NEXT_PUBLIC_* env the modules under test validate at import
// time (lib/env.ts). Set before any test module imports env.
process.env.NEXT_PUBLIC_API_BASE_URL ??= 'http://localhost:8000';
process.env.NEXT_PUBLIC_WS_BASE_URL ??= 'ws://localhost:8000/ws';
process.env.NEXT_PUBLIC_ENVIRONMENT ??= 'development';
