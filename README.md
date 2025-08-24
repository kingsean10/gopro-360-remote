# 🚀 GoPro 360 Remote - React Native App

A professional React Native app for controlling GoPro cameras with full Bluetooth LE and WiFi capabilities.

## 🎯 Features

- **Bluetooth LE Discovery** - Find and connect to GoPro cameras
- **WiFi Integration** - Control camera over local network
- **Real-time Camera Control** - Start/stop recording, change modes
- **Media Management** - View and organize 360° files
- **Cross-platform** - Works on both iOS and Android

## 🛠️ Setup

### Prerequisites
- Node.js 16+
- React Native CLI
- Xcode (for iOS)
- Android Studio (for Android)

### Installation
```bash
# Install dependencies
npm install

# iOS setup
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on device
npm run ios     # iOS
npm run android # Android
```

## 📱 Usage

1. **Bluetooth Discovery** - App scans for nearby GoPro devices
2. **Connect** - Select and connect to your GoPro
3. **WiFi Setup** - App enables WiFi and connects to camera network
4. **Camera Control** - Full control over recording, modes, and settings
5. **Media Access** - View and manage recorded files

## 🔧 Dependencies

- `react-native-ble-plx` - Bluetooth LE support
- `react-native-wifi-reborn` - WiFi network management
- `react-native-vector-icons` - UI icons
- `react-native-linear-gradient` - Gradient backgrounds
- `@react-navigation/native` - Navigation

## 📚 Architecture

- **Services** - GoPro API and Bluetooth management
- **Components** - React Native UI components
- **Types** - TypeScript interfaces and types
- **Config** - App configuration and constants

## 🚀 Next Steps

1. Test Bluetooth connection on real device
2. Verify WiFi integration with GoPro
3. Test camera controls and media access
4. Prepare for App Store submission

---

Built with React Native and TypeScript for professional GoPro camera control.
