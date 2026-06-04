'use strict';

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Notification helper functions for real-time user events.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-06-04
 Modification Notes:    Added typed notification emitters for wallet and betting flows.
*********************************************************/

// ========================================================
// Imports, dependencies, and module setup
// ========================================================

const { notify, NOTIFICATION_TYPES } = require("./websocket");

const sendNotification = (userId, notification) => {
  if (!userId) {
    return false;
  }

  return notify(String(userId), notification);
};

const notifyDepositCompleted = (userId, { amount, currency, transactionId }) => {
  return sendNotification(userId, {
    type: NOTIFICATION_TYPES.DEPOSIT_COMPLETED,
    title: "Deposit completed",
    message: `${currency} ${amount} has been added to your wallet.`,
    data: { amount, currency, transactionId },
  });
};

const notifyWithdrawalCompleted = (
  userId,
  { amount, currency, transactionId }
) => {
  return sendNotification(userId, {
    type: NOTIFICATION_TYPES.WITHDRAWAL_COMPLETED,
    title: "Withdrawal completed",
    message: `${currency} ${amount} has been withdrawn from your wallet.`,
    data: { amount, currency, transactionId },
  });
};

const notifyBetCreated = (userId, bet) => {
  return sendNotification(userId, {
    type: NOTIFICATION_TYPES.SYSTEM,
    title: "Bet created",
    message: `Your bet "${bet.topic}" is now open.`,
    data: { betId: bet.id, topic: bet.topic },
  });
};

const notifyBetJoined = (userId, { bet, participant, participantName }) => {
  return sendNotification(userId, {
    type: NOTIFICATION_TYPES.BET_JOINED,
    title: "New Bet Participant!",
    message: `${participantName || "A user"} joined your bet: ${bet.topic}`,
    data: {
      betId: bet.id,
      participantId: participant.id,
      stakeAmount: participant.stake_amount,
      outcome: participant.outcome,
    },
  });
};

const notifyBetSettled = (userId, { bet, result, payout, outcome }) => {
  return sendNotification(userId, {
    type: NOTIFICATION_TYPES.BET_SETTLED,
    title: "Bet Settled!",
    message: `Your bet "${bet.topic}" has been settled. Result: ${result}`,
    data: { betId: bet.id, result, payout, outcome },
  });
};

module.exports = {
  sendNotification,
  notifyDepositCompleted,
  notifyWithdrawalCompleted,
  notifyBetCreated,
  notifyBetJoined,
  notifyBetSettled,
};
