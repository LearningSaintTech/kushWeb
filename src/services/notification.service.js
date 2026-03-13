/**
 * Notification API – list, unread count, mark read, push subscribe.
 * Base path: /notification
 * Requires: user auth (Bearer token via axiosClient).
 */

import client from './axiosClient.js';

const BASE = '/notification';

function getData(res) {
  return res?.data?.data ?? res?.data;
}

export const notificationService = {
  /** GET /notification/list – paginated list. Params: { page, limit } */
  getList: (params = {}) =>
    client.get(`${BASE}/list`, { params }).then((res) => getData(res)),

  /** GET /notification/unread-count */
  getUnreadCount: () =>
    client.get(`${BASE}/unread-count`).then((res) => getData(res)),

  /** PATCH /notification/:id/read */
  markRead: (id) =>
    client.patch(`${BASE}/${id}/read`).then((res) => getData(res)),

  /** PATCH /notification/read-all */
  markAllRead: () =>
    client.patch(`${BASE}/read-all`).then((res) => getData(res)),

  /** POST /notification/push-subscribe – Body: { subscription, deviceLabel? } */
  pushSubscribe: (subscription, deviceLabel) =>
    client.post(`${BASE}/push-subscribe`, { subscription, deviceLabel }).then((res) => getData(res)),

  /** POST /notification/push-unsubscribe – Body: { endpoint } */
  pushUnsubscribe: (endpoint) =>
    client.post(`${BASE}/push-unsubscribe`, { endpoint }).then((res) => getData(res)),
};
