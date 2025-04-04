import { defineFunction } from '@aws-amplify/backend';
import { Duration } from 'aws-cdk-lib';

export const seedDevelop = defineFunction({
  name: 'seed-develop',
  timeout: Duration.minutes(5),
  memorySize: 1024,
});

export default seedDevelop; 