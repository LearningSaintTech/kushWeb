import client from './axiosClient.js';

// Cancellation & exchange policy helpers for web (customer) side.
// These wrap the backend routes that expose the *active* policy for each.

export const policyService = {
  /** Get currently active cancellation policy (requires authenticated user token). */
  getActiveCancellation: () => client.get('/admin/cancellation-policies/getActive'),

  /** Get currently active exchange policy (requires authenticated user token). */
  getActiveExchange: () => client.get('/exchange/getActive'),
};

