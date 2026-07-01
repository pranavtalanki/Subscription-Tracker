# Security Specification

## 1. Data Invariants
- **Authentication**: A user can only access, create, update, or delete data within their own path (`users/{userId}/...`).
- **Owner ID matching**: For subscriptions, alerts, etc., the user ID associated with the data or document path must match the authenticated user's UID (`request.auth.uid`).
- **Valid Types and Limits**:
  - Subscription names must be strings with lengths between 1 and 200 characters.
  - Subscription amounts must be non-negative numbers.
  - Billing cycles must be exactly `'weekly'`, `'monthly'`, or `'yearly'`.
  - Next billing dates must be strings representing a valid ISO-like date string.
  - Alert types must be `'warning'`, `'info'`, or `'success'`.
  - Settings fields must match their expected data types (e.g. `budgetThreshold` as number, reminder days, and booleans).

## 2. The "Dirty Dozen" Payloads
The following payloads are designed to break identity or data laws and must be rejected:
1. **Identity Spoofing**: Attempt to create a subscription in another user's path.
2. **Ghost Field / Shadow Update**: Attempt to update a subscription with a custom un-allocated field (e.g., `isVerified: true`).
3. **Invalid Billing Cycle**: Creating a subscription with billing cycle set to `'daily'`.
4. **Negative Rate**: Creating a subscription with an amount of `-15.00`.
5. **No Auth Access**: Attempting to read any subscriptions without a valid authenticated session.
6. **Malicious ID Injection**: Creating a document with a junk/malformed path variable or document ID that contains special symbols or exceeds size limits.
7. **Cross-Tenant Alert Writing**: Attempting to write a budget alert under another user's `alerts` subcollection.
8. **Invalid Alert Type**: Creating an alert with `type: 'critical_danger_error'`.
9. **Settings Type Abuse**: Setting `enableReminders` in notification settings to a string `"true"` instead of a boolean.
10. **Budget Threshold Abuse**: Setting `budgetThreshold` to a string instead of a number.
11. **Spoofed Email / Identity**: Trying to bypass security by matching an admin email without having `email_verified == true`.
12. **Tampering with Immutable Fields**: Trying to overwrite `userId` or changing `createdAt` after a document is created.

## 3. Test Runner (Conceptual Rules Test)
A test script would verify that all these payloads fail with a `PERMISSION_DENIED` error when evaluated against the target rules.
