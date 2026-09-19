'use strict';

/**
 * Controlled Phase 4 review store. It is intentionally in-memory only:
 * restarting the server clears pending, approved-dynamic, and rejected items.
 */
const pendingSignals = [];
const approvedDynamicSignals = [];
const rejectedSignals = [];

function addPending(candidate) {
  pendingSignals.push(candidate);
  return candidate;
}

function findPending(id) {
  return pendingSignals.find((candidate) => candidate.id === id) || null;
}

function approve(id) {
  const index = pendingSignals.findIndex((candidate) => candidate.id === id);
  if (index === -1) return null;
  const candidate = pendingSignals.splice(index, 1)[0];
  const approved = {
    ...candidate,
    sourceStatus: 'VERIFIED',
    evidenceStatus: 'VERIFIED',
    reviewStatus: 'APPROVED',
  };
  approvedDynamicSignals.push(approved);
  return approved;
}

function reject(id) {
  const index = pendingSignals.findIndex((candidate) => candidate.id === id);
  if (index === -1) return null;
  const candidate = pendingSignals.splice(index, 1)[0];
  const rejected = {
    ...candidate,
    reviewStatus: 'REJECTED',
  };
  rejectedSignals.push(rejected);
  return rejected;
}

module.exports = {
  pendingSignals,
  approvedDynamicSignals,
  rejectedSignals,
  addPending,
  findPending,
  approve,
  reject,
};
