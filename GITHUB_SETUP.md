# 🚀 GitHub Repository Setup Guide

## 📋 Steps to Push to GitHub

### 1. Create GitHub Repository
1. Go to [GitHub.com](https://github.com)
2. Click "New repository"
3. Name: `gopro-360-remote`
4. Description: `Professional React Native app for GoPro camera control`
5. Make it **Public** or **Private** (your choice)
6. **Don't** initialize with README, .gitignore, or license (we already have these)
7. Click "Create repository"

### 2. Add Remote Origin
```bash
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/gopro-360-remote.git
```

### 3. Push to GitHub
```bash
git branch -M main
git push -u origin main
```

## 🔗 Repository URL Format
Your repository will be available at:
```
https://github.com/YOUR_USERNAME/gopro-360-remote
```

## 📱 Using with Xcode

### Option 1: Clone from GitHub
1. Open Xcode
2. Choose "Clone an existing project"
3. Enter your GitHub repository URL
4. Choose local directory
5. Xcode will download and set up the project

### Option 2: Download ZIP
1. Go to your GitHub repository
2. Click "Code" → "Download ZIP"
3. Extract and open in Xcode

## 🎯 Next Steps After GitHub Push

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **iOS Setup:**
   ```bash
   cd ios && pod install && cd ..
   ```

3. **Run the App:**
   ```bash
   npm start
   npm run ios
   ```

## 🚨 Important Notes

- **Bluetooth testing requires a real device** (not simulator)
- **WiFi testing requires GoPro camera** connected to same network
- **App Store submission** requires Apple Developer account
- **Background modes** need to be configured in Xcode

## 🔧 Troubleshooting

### Common Issues:
- **"Module not found"** - Run `npm install` and restart Metro
- **"Bluetooth permission denied"** - Check Info.plist permissions
- **"Build failed"** - Clean build folder and try again

### Xcode Tips:
- Use **Product → Clean Build Folder** if builds fail
- Check **Signing & Capabilities** for proper provisioning
- Enable **Background Modes** for Bluetooth and WiFi

---

Your React Native GoPro app is now ready for GitHub and Xcode! 🎉
