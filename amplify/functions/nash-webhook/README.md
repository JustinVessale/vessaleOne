# Nash Webhook Handler

This Lambda function handles webhooks from Nash delivery service, updating order status and delivery information in real-time.

## Setup

1. Install dependencies:
   ```bash
   cd amplify/functions/nash-webhook
   npm install
   ```

2. Configure environment variables in the Amplify backend:
   - `NASH_WEBHOOK_SECRET`: The signing secret from Nash (found in the Nash Portal)
   - `API_KEY`: Your Amplify API key for accessing the database

3. Deploy the function:
   ```bash
   amplify push
   ```

## Webhook Configuration

1. In the Nash Portal, navigate to the Webhooks section.
2. Add a new webhook with the following URL:
   ```
   https://your-api-gateway-url/webhook/nash
   ```
3. Copy the signing secret and set it as the `NASH_WEBHOOK_SECRET` environment variable.
4. Select the events you want to receive (recommended: all delivery events and courier location updates).

## How It Works

1. The webhook handler receives events from Nash when delivery status changes or courier location updates.
2. It verifies the webhook signature using the Svix library.
3. It finds the corresponding order in the database using the Nash order ID.
4. It updates the order status and delivery information based on the webhook data.
5. The frontend components subscribe to these database changes for real-time updates.

## Event Types

The handler processes the following event types:

### Delivery Events
- `created`: Initial order creation
- `assigned_driver`: Driver assigned to the order
- `pickup_enroute`: Driver is on the way to the restaurant
- `pickup_arrived`: Driver has arrived at the restaurant
- `pickup_complete`: Driver has picked up the order
- `dropoff_enroute`: Driver is on the way to the customer
- `dropoff_arrived`: Driver has arrived at the customer's location
- `dropoff_complete`: Delivery is complete
- `canceled_by_provider`, `canceled_by_customer`, `canceled_by_nash`: Delivery cancelled
- `failed`: Delivery failed

### Courier Location Updates
- `updated`: Driver location has been updated

## Troubleshooting

- Check CloudWatch logs for any errors in the Lambda function.
- Verify that the Nash webhook secret is correctly configured.
- Ensure the API key has the necessary permissions to update orders.
- Test the webhook by manually triggering events in the Nash Portal. 