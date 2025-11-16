# 🚀 Guessly Platform - Quick Reference

**Status**: ✅ LIVE
**Date**: November 16, 2025 (Updated with Virtual Liquidity Bootstrapping)

---

## 🌐 Live URLs

### Backend API
```
Base URL:     https://guessly-backend-738787111842.us-central1.run.app
API:          https://guessly-backend-738787111842.us-central1.run.app/api/v1
Docs:         https://guessly-backend-738787111842.us-central1.run.app/docs
Health:       https://guessly-backend-738787111842.us-central1.run.app/api/v1/health
```

---

## 🔗 Smart Contracts (Base Sepolia)

### Contract Addresses (Virtual Liquidity Enabled)
```
FeeCollector:        0x9E0e83E0569d42a3A0420F68fe4D967F4C10F423
CreatorShareFactory: 0xaE86eC369E33A74769Ef7A1609b76E84B417c5Db
OpinionMarket:       0x9cC5bBBceb80bE28f9be3F7dd69dC815Ba64099C
USDC (Testnet):      0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

### Virtual Liquidity
```
Per Outcome:   5000 USDC
Purpose:       Fair initial pricing (prevents 100% jumps)
Markets:       Start at 50/50 probability
```

### Network
```
Network:    Base Sepolia
Chain ID:   84532
RPC URL:    https://sepolia.base.org
Explorer:   https://sepolia.basescan.org
```

### Deployer Wallet
```
Address: 0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf
Balance: 0.095 ETH
```

---

## 💾 Database (GCP)

### Cloud SQL
```
Instance:   guessly-db
IP:         136.113.238.182
Database:   guessly
User:       guessly_user
Password:   GuesslyUser2025!
```

### Redis
```
Instance:   guessly-redis
IP:         10.2.44.91:6379
```

---

## 🔑 GCP Project

```
Project ID:     guess-fun-2025-v1
Project Name:   guesslydotfun
Project Number: 738787111842
Region:         us-central1
```

---

## 📋 Configuration Commands

### View Backend Logs
```bash
gcloud run services logs tail guessly-backend \
  --region=us-central1 \
  --project=guess-fun-2025-v1
```

### Update Backend Environment
```bash
gcloud run services update guessly-backend \
  --region=us-central1 \
  --update-env-vars="VAR_NAME=value" \
  --project=guess-fun-2025-v1
```

### Connect to Database
```bash
PGPASSWORD=GuesslyUser2025! psql \
  -h localhost -p 5433 \
  -U guessly_user -d guessly
```

---

## 🧪 Quick Tests

### Test Backend
```bash
curl https://guessly-backend-738787111842.us-central1.run.app/api/v1/health
```

### Get Testnet Tokens
- ETH: https://www.alchemy.com/faucets/base-sepolia
- USDC: Contact testnet faucet for 0x036CbD53842c5426634e7929541eC2318f3dCF7e

---

## 📚 Key Files

```
/FULL_DEPLOYMENT_SUMMARY.md       - Complete deployment guide
/DEPLOYMENT_COMPLETE.md            - Backend deployment
/CONTRACTS_DEPLOYMENT.md           - Smart contracts deployment
/backend/src/contracts/abis/       - Contract ABIs
/backend/src/contracts/addresses.json - Contract addresses
/smart-contracts/deployments/testnet.json - Deployment data
```

---

## 💰 Monthly Costs

```
Cloud SQL:      ~$7/month
Redis:          ~$48/month
Cloud Run:      ~$2-5/month
Total:          ~$58-62/month
```

---

## ✅ Deployment Checklist

- [x] Backend deployed to Cloud Run
- [x] Database migrated and seeded
- [x] Smart contracts deployed to Base Sepolia
- [x] Contracts linked and whitelisted
- [x] ABIs copied to backend
- [ ] Add JWT secrets
- [ ] Add Twitter OAuth credentials
- [ ] Add blockchain private key
- [ ] Deploy frontend
- [ ] Set up monitoring

---

**Quick Start**: See FULL_DEPLOYMENT_SUMMARY.md for complete details!
