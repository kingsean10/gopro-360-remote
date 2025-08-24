import { Device, Service, Characteristic } from 'react-native-ble-plx';

// GoPro API Response Types
export interface GoProCameraInfo {
  model_name: string;
  firmware_version: string;
  serial_number: string;
  camera_type: string;
}

export interface GoProCameraStatus {
  status: number;
  battery_level?: number;
  recording?: boolean;
  mode?: string;
}

export interface GoProMediaFile {
  id: string;
  name: string;
  size: number;
  date: string;
  type: string;
}

export interface GoProMediaList {
  media: GoProMediaFile[];
  total_count: number;
}

// Connection Status Types
export type ConnectionStatus = 
  | 'disconnected'
  | 'bluetooth_pairing'
  | 'bluetooth_connected'
  | 'wifi_connecting'
  | 'wifi_connected';

export interface ConnectionStatusInfo {
  status: ConnectionStatus;
  displayName: string;
  isConnected: boolean;
  canControlCamera: boolean;
  icon: string;
  color: string;
}

// Bluetooth Device Types
export interface GoProBluetoothDevice {
  device: Device;
  name: string;
  rssi: number;
  isGoPro: boolean;
  services?: Service[];
  characteristics?: Characteristic[];
}

// WiFi Network Types
export interface GoProWiFiNetwork {
  SSID: string;
  BSSID: string;
  capabilities: string;
  frequency: number;
  level: number;
  timestamp: number;
  isGoPro: boolean;
}

// Error Types
export type GoProErrorType = 
  | 'bluetooth_not_supported'
  | 'bluetooth_permission_denied'
  | 'device_not_found'
  | 'connection_failed'
  | 'api_timeout'
  | 'network_error'
  | 'invalid_response'
  | 'camera_not_responding'
  | 'wifi_connection_failed'
  | 'unknown';

export interface GoProError {
  type: GoProErrorType;
  message: string;
  details?: string;
  timestamp: number;
}

// Camera Control Types
export interface CameraControl {
  isRecording: boolean;
  currentMode: string;
  batteryLevel?: number;
  lastUpdate: Date;
}

// Media Management Types
export interface MediaFilter {
  type?: 'video' | 'photo' | 'all';
  format?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// App State Types
export interface GoProAppState {
  connectionStatus: ConnectionStatus;
  bluetoothDevice?: GoProBluetoothDevice;
  wifiNetwork?: GoProWiFiNetwork;
  cameraInfo?: GoProCameraInfo;
  cameraStatus?: GoProCameraStatus;
  mediaFiles: GoProMediaFile[];
  errors: GoProError[];
  isLoading: boolean;
}

// Navigation Types
export type RootStackParamList = {
  Home: undefined;
  BluetoothScan: undefined;
  WiFiConnect: { bluetoothDevice: GoProBluetoothDevice };
  CameraControl: undefined;
  MediaLibrary: undefined;
  Settings: undefined;
};

// Theme Types
export interface AppTheme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    success: string;
    warning: string;
    error: string;
    border: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

// Utility Types
export type AsyncResult<T> = Promise<{ success: true; data: T } | { success: false; error: GoProError }>;

export type Callback<T = void> = (result: T) => void;

export type ErrorCallback = (error: GoProError) => void;
