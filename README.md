# 💰 My Finance App - Personal Finance Manager

A beautiful, feature-rich personal finance management app built with React and Firebase.

## 🚀 Quick Start

### Prerequisites

You need to have **Node.js** installed on your computer.

**Check if you have Node.js:**
```bash
node --version
```

**If not installed, download from:** https://nodejs.org/ (Download the LTS version)

---

## 📋 Setup Instructions (Windows)

### Step 1: Install Dependencies

Open **Command Prompt** in this folder and run:

```bash
npm install
```

This will install all required packages (takes 1-2 minutes).

---

### Step 2: Configure Firebase

1. **Copy the example config file:**
   ```bash
   copy .env.example .env
   ```

2. **Get your Firebase configuration:**
   - Go to: https://console.firebase.google.com
   - Create a new project (or use existing)
   - Enable **Authentication** → **Anonymous**
   - Enable **Firestore Database**
   - Go to **Project Settings** → **Web App** → Copy your config

3. **Edit the `.env` file:**
   - Open `.env` with Notepad: `notepad .env`
   - Replace the placeholder values with your actual Firebase config
   - Save and close

**Example `.env` file:**
```env
REACT_APP_FIREBASE_API_KEY=AIzaSyBxxx-xxxxxxxxxxxxxxxxxxxxxx
REACT_APP_FIREBASE_AUTH_DOMAIN=my-app.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=my-app-12345
REACT_APP_FIREBASE_STORAGE_BUCKET=my-app.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456
REACT_APP_VERSION=1.0.0
```

---

### Step 3: Start the App

```bash
npm start
```

**The app will automatically open in your browser at `http://localhost:3000`!** 🎉

---

## ✨ Features

- ✅ **Income & Expense Tracking** - Track all your financial transactions
- ✅ **Recurring Bills Management** - Set up monthly bills and track payments
- ✅ **Budget Dash** - View average income/expenses and net worth
- ✅ **Beautiful UI** - Modern dark theme with smooth animations
- ✅ **Real-time Sync** - All data syncs instantly with Firebase
- ✅ **Offline Ready** - Works on mobile devices

---

## 🎯 How to Use

### Adding Income
1. Click the big **+** button in the center
2. Fill in client name, amount, and date
3. Click "Save Income"

### Adding Expense
1. Click the **Expense** button at the bottom
2. Fill in expense details
3. Toggle "Save as Recurring Bill" if it's a monthly payment
4. Click "Save Expense"

### Managing Recurring Bills
1. Click the **Bills** button at the bottom
2. View all your monthly bills
3. Click "Mark Paid" when you pay a bill
4. Track monthly, weekly, or daily dues

---

## 🛑 How to Stop the App

In the Command Prompt window, press:
```
Ctrl + C
```

Then type `Y` and press Enter.

---

## 🔄 Running Again Later

1. Open Command Prompt in this folder
2. Run: `npm start`

---

## 📱 Building APK for Android

To create an Android app:

```bash
# 1. Build the React app
npm run build

# 2. Initialize Capacitor (first time only)
npx cap init "My Finance App" "com.myfinance.app" --web-dir=build

# 3. Add Android platform (first time only)
npx cap add android

# 4. Sync files
npx cap sync android

# 5. Open in Android Studio
npx cap open android

# In Android Studio: Build → Build APK
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🐛 Troubleshooting

### White screen or errors

1. **Check Firebase config:**
   - Open `.env` file
   - Make sure all values are correct
   - No quotes or spaces around values

2. **Restart the server:**
   ```bash
   Ctrl + C
   npm start
   ```

3. **Check browser console:**
   - Press `F12` in your browser
   - Look for red errors
   - Most common: Firebase config is wrong

### "npm is not recognized"

- Node.js is not installed
- Install from: https://nodejs.org/
- Restart your computer after installing

### Port 3000 already in use

```bash
netstat -ano | findstr :3000
taskkill /PID [number] /F

# Or use different port:
set PORT=3001
npm start
```

---

## 📁 Project Structure

```
my-finance-app-complete/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── App.js              # Main app code
│   ├── index.js            # React entry point
│   └── index.css           # Global styles
├── .env                    # Firebase configuration (YOU MUST CREATE THIS)
├── .env.example            # Example config file
├── package.json            # Dependencies
└── README.md               # This file
```

---

## 🔥 Firebase Setup Checklist

- [ ] Created Firebase project
- [ ] Enabled Anonymous Authentication
- [ ] Created Firestore Database
- [ ] Added security rules:
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /users/{userId}/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
  ```
- [ ] Created web app and got config
- [ ] Copied config to `.env` file

---

## 💡 Tips

- **Hot Reload:** Any code changes automatically refresh the browser
- **Mobile View:** Press `F12` → Click mobile icon to see mobile layout
- **Data Persistence:** All your data is saved in Firebase (cloud)
- **Anonymous Auth:** Each device gets a unique ID, no signup needed

---

## 📞 Support

If you encounter any issues:

1. Check the browser console (`F12`)
2. Verify Firebase configuration
3. Make sure you're connected to the internet
4. Try clearing browser cache and restarting

---

## 📄 License

Free to use for personal or commercial projects!

---

## 🎉 Enjoy Your Finance App!

Made with ❤️ using React and Firebase
