// GoPro API Configuration for React Native App
export const GOPRO_CONFIG = {
  // Standard GoPro WiFi IP address and port
  BASE_URL: "http://10.5.5.9:8080",
  
  // API timeout in milliseconds
  API_TIMEOUT: 5000,
  
  // API endpoints
  ENDPOINTS: {
    INFO: "/gp/gpControl/info",
    STATUS: "/gp/gpControl/status",
    SHUTTER: "/gp/gpControl/command/shutter",
    MODE: "/gp/gpControl/command/mode",
    MEDIA_LIST: "/gp/gpMediaList",
  },
  
  // Camera modes
  CAMERA_MODES: {
    VIDEO: "0",
    PHOTO: "1", 
    MULTI_SHOT: "2",
  },
  
  // Shutter commands
  SHUTTER_COMMANDS: {
    START: "1",
    STOP: "0",
  },
  
  // File extensions to look for
  SUPPORTED_FORMATS: [".360", ".MP4", ".mp4", ".JPG", ".jpg"],
  
  // Bluetooth service UUIDs (from OpenGoPro documentation)
  BLE_SERVICES: {
    WIFI_SERVICE: "fea6",
    COMMAND_SERVICE: "fea7",
    RESPONSE_SERVICE: "fea8",
    SETTINGS_SERVICE: "fea9",
    QUERY_SERVICE: "feaa",
  },
  
  // Bluetooth characteristic UUIDs
  BLE_CHARACTERISTICS: {
    WIFI_SSID: "fea6-0001",
    WIFI_PASSWORD: "fea6-0002",
    COMMAND: "fea7-0001",
    RESPONSE: "fea8-0001",
    SETTINGS: "fea9-0001",
    QUERY: "feaa-0001",
  },
} as const;

// Helper function to get full API URL
export const getGoProUrl = (endpoint: string): string => {
  return `${GOPRO_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to check if we're in development mode
export const isDevelopment = __DEV__;

// Development mode can use different IP if needed
export const getGoProBaseUrl = (): string => {
  if (isDevelopment && process.env.GOPRO_IP) {
    return `http://${process.env.GOPRO_IP}:8080`;
  }
  return GOPRO_CONFIG.BASE_URL;
};

// GoPro device name patterns for Bluetooth discovery
export const GOPRO_DEVICE_PATTERNS = [
  "gopro",
  "hero",
  "gopro hero",
  "gopro max",
  "gopro fusion",
];

// WiFi network patterns for GoPro
export const GOPRO_WIFI_PATTERNS = [
  "GP",
  "GoPro",
  "HERO",
  "MAX",
  "FUSION",
];
