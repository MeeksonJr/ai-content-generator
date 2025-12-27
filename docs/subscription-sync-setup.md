# Subscription Status Sync Setup Guide

## Overview

The subscription status sync feature automatically synchronizes subscription statuses from PayPal to the local database. This ensures that subscription states remain accurate even if webhooks are missed or delayed.

## Implementation

### API Endpoint

**POST `/api/subscription/sync`**

Synchronizes all active subscriptions with PayPal, or specific subscriptions if filters are provided.

**Request Body (Optional):**
```json
{
  "userId": "uuid",           // Optional: Sync only this user's subscriptions
  "subscriptionId": "uuid"    // Optional: Sync only this specific subscription
}
```

**Response:**
```json
{
  "message": "Sync completed: 10 processed, 3 updated, 0 errors",
  "synced": 10,
  "updated": 3,
  "errors": 0,
  "errorsList": []  // Only present if errors > 0
}
```

**GET `/api/subscription/sync`**

Returns sync status and recent subscriptions for monitoring.

**Response:**
```json
{
  "message": "Subscription sync status",
  "totalActive": 10,
  "recentSubscriptions": [...]
}
```

## Cron Job Configuration

### Vercel Cron

The sync is configured to run automatically every 6 hours via Vercel Cron.

**Configuration:** `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/subscription/sync",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### Security

For cron job security, set the `CRON_SECRET` environment variable. The endpoint will require this secret in the Authorization header:

```
Authorization: Bearer <CRON_SECRET>
```

If `CRON_SECRET` is not set, the endpoint can be called without authentication (not recommended for production).

### Manual Sync

You can also trigger a sync manually:

```bash
# Sync all subscriptions
curl -X POST https://your-domain.com/api/subscription/sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"

# Sync specific user
curl -X POST https://your-domain.com/api/subscription/sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-uuid"}'

# Sync specific subscription
curl -X POST https://your-domain.com/api/subscription/sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"subscriptionId": "subscription-uuid"}'
```

## What Gets Synced

1. **Subscription Status**
   - Maps PayPal statuses (ACTIVE, SUSPENDED, CANCELLED, EXPIRED) to local statuses
   - Updates database if status has changed

2. **Expiration Date**
   - Updates `expires_at` from PayPal's `billing_info.next_billing_time`
   - Ensures accurate renewal dates

## Error Handling

- Individual subscription errors are logged but don't stop the sync process
- Error details are included in the response if any errors occur
- All errors are logged with context for debugging

## Monitoring

Use the GET endpoint to monitor sync status:

```bash
curl https://your-domain.com/api/subscription/sync
```

Check Vercel logs for detailed sync information and any errors.

## Best Practices

1. **Set CRON_SECRET** - Always set this in production for security
2. **Monitor Logs** - Check sync logs regularly for errors
3. **Adjust Schedule** - Modify cron schedule in `vercel.json` if needed
4. **Manual Sync** - Use manual sync for testing or urgent updates

## Troubleshooting

### Sync Not Running
- Check Vercel Cron configuration
- Verify `vercel.json` is in the project root
- Check Vercel dashboard for cron job status

### Authentication Errors
- Verify `CRON_SECRET` is set in environment variables
- Check Authorization header format

### PayPal API Errors
- Verify PayPal credentials are correct
- Check PayPal API status
- Review error logs for specific subscription issues

