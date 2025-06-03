import { defineFunction, secret } from "@aws-amplify/backend";

export const testAmplify = defineFunction({
  name: "test-amplify",
  resourceGroupName: 'data'
}); 