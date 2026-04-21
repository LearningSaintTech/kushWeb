import client from './axiosClient.js'

const CASH_BASE = '/wallet'
const REWARD_BASE = '/reward-wallet'

export const walletService = {
  getCashBalance: () => client.get(`${CASH_BASE}/balance`),
  getCashTransactions: (params) => client.get(`${CASH_BASE}/transactions`, { params: params || {} }),
  createRechargeOrder: (body) => client.post(`${CASH_BASE}/recharge/create-order`, body),
  verifyRechargePayment: (body) => client.post(`${CASH_BASE}/recharge/verify`, body),
  redeemPoints: (body) => client.post(`${CASH_BASE}/redeem-points`, body),

  getRewardCoins: () => client.get(`${REWARD_BASE}/get-coins`),
  getRewardTransactions: (params) => client.get(`${REWARD_BASE}/get-transactions`, { params: params || {} }),
}

