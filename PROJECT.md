# 📁 Project Structure

## 🎯 Files quan trọng

### Core Files (Bắt buộc):
```
server.js           ← Backend 24/7 monitoring
index.html          ← Web interface
chart-3a.js         ← Chart manager
signals-3a.js       ← 3A Strategy logic
config.js           ← Configuration
package.json        ← Dependencies
```

### Documentation:
```
README.md           ← Full documentation
QUICKSTART.md       ← Quick start guide
SETUP.md            ← Current setup details
PROJECT.md          ← This file
```

### Other:
```
.gitignore          ← Git ignore rules
package-lock.json   ← NPM lock file
```

---

## 🚀 Quick Commands

```bash
# Install
npm install

# Run backend
node server.js

# Open web
# Just open index.html in browser
```

---

## ⚙️ Current Setup

**Tokens**: XAUT, BTC, ETH, SOL  
**Timeframes**: 1H, 4H  
**Total Monitors**: 8  
**Strategy**: 3A (Simple Mode)  
**Exchange**: OKX  

---

## 📝 To Modify

**Change tokens**: Edit `server.js`, `config.js`, `chart-3a.js`  
**Change timeframes**: Same 3 files  
**Change strategy params**: Edit `config.js`  
**Change Telegram**: Edit `config.js` or web interface  

---

That's it! Simple and clean. 🎯
