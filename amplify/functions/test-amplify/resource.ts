import { defineFunction, secret } from "@aws-amplify/backend";

export const testAmplify = defineFunction({
  name: "test-amplify",
  environment: {
    AMPLIFY_DATA_API_KEY: secret('AMPLIFY_API_KEY'),
    AMPLIFY_DATA_DEFAULT_NAME: 'default'
  },
  resourceGroupName: 'data'
}); 