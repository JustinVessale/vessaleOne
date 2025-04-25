import { defineFunction } from '@aws-amplify/backend';

export const seedDevelop = defineFunction({
  name: 'seed-develop',
  timeoutSeconds: 300,
  memoryMB: 1024,
});

export default seedDevelop; 