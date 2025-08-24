import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { goProService } from '../services/GoProService';
import { goProBluetoothService } from '../services/GoProBluetoothService';
import { 
  ConnectionStatus, 
  GoProCameraInfo, 
  GoProMediaFile,
  GoProBluetoothDevice 
} from '../types/GoProTypes';
import { GOPRO_CONFIG } from '../config/GoProConfig';

// Main GoPro App Component for React Native
export const GoProApp: React.FC = () => {
  // State management
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [cameraInfo, setCameraInfo] = useState<GoProCameraInfo | null>(null);
  const [cameraStatus, setCameraStatus] = useState<any>(null);
  const [mediaFiles, setMediaFiles] = useState<GoProMediaFile[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bluetoothDevices, setBluetoothDevices] = useState<GoProBluetoothDevice[]>([]);
  const [connectedBluetoothDevice, setConnectedBluetoothDevice] = useState<GoProBluetoothDevice | null>(null);

  // MARK: - Effects

  useEffect(() => {
    // Initialize Bluetooth service
    initializeBluetooth();
    
    // Cleanup on unmount
    return () => {
      goProBluetoothService.destroy();
    };
  }, []);

  useEffect(() => {
    // Start periodic updates when connected
    if (connectionStatus === 'wifi_connected') {
      const statusInterval = setInterval(updateCameraStatus, 10000);
      const filesInterval = setInterval(updateMediaFiles, 30000);

      return () => {
        clearInterval(statusInterval);
        clearInterval(filesInterval);
      };
    }
  }, [connectionStatus]);

  // MARK: - Bluetooth Methods

  const initializeBluetooth = async () => {
    try {
      const supportCheck = await goProBluetoothService.checkBluetoothSupport();
      if (!supportCheck.success) {
        setErrorMessage(supportCheck.error.message);
      }
    } catch (error: any) {
      setErrorMessage(`Bluetooth initialization failed: ${error.message}`);
    }
  };

  const startBluetoothScanning = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      const result = await goProBluetoothService.startScanning();
      if (result.success) {
        // Start monitoring discovered devices
        const checkDevices = setInterval(() => {
          const devices = goProBluetoothService.getDiscoveredDevices();
          setBluetoothDevices(devices);
          
          if (devices.length > 0) {
            clearInterval(checkDevices);
            setIsLoading(false);
          }
        }, 1000);
        
        // Stop checking after 10 seconds
        setTimeout(() => {
          clearInterval(checkDevices);
          setIsLoading(false);
        }, 10000);
      } else {
        setErrorMessage(result.error.message);
        setIsLoading(false);
      }
    } catch (error: any) {
      setErrorMessage(`Scan failed: ${error.message}`);
      setIsLoading(false);
    }
  };

  const connectToBluetoothDevice = async (device: GoProBluetoothDevice) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      const result = await goProBluetoothService.connectToDevice(device.device.id);
      if (result.success) {
        setConnectedBluetoothDevice(result.data);
        setConnectionStatus('bluetooth_connected');
        
        // Enable WiFi on the GoPro
        await enableGoProWiFi();
      } else {
        setErrorMessage(result.error.message);
      }
    } catch (error: any) {
      setErrorMessage(`Connection failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const enableGoProWiFi = async () => {
    try {
      const result = await goProBluetoothService.enableWiFi();
      if (result.success) {
        // Get WiFi credentials
        const credentials = await goProBluetoothService.getWiFiCredentials();
        if (credentials.success) {
          // In a real app, you would use react-native-wifi-reborn to connect
          // For now, we'll simulate the connection
          setConnectionStatus('wifi_connecting');
          await connectToGoProWiFi();
        }
      }
    } catch (error: any) {
      setErrorMessage(`WiFi enable failed: ${error.message}`);
    }
  };

  // MARK: - WiFi Methods

  const connectToGoProWiFi = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      // Check if we can reach the GoPro
      const pingResult = await goProService.pingCamera();
      if (pingResult.success && pingResult.data) {
        // Get camera info
        const infoResult = await goProService.getCameraInfo();
        if (infoResult.success) {
          setCameraInfo(infoResult.data);
          setConnectionStatus('wifi_connected');
          
          // Get initial status and media files
          await updateCameraStatus();
          await updateMediaFiles();
        } else {
          setErrorMessage(infoResult.error.message);
          setConnectionStatus('disconnected');
        }
      } else {
        setErrorMessage('Cannot reach GoPro camera. Please connect to GoPro WiFi network.');
        setConnectionStatus('disconnected');
      }
    } catch (error: any) {
      setErrorMessage(`WiFi connection failed: ${error.message}`);
      setConnectionStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectFromGoPro = async () => {
    try {
      // Disconnect Bluetooth
      await goProBluetoothService.disconnect();
      
      // Reset all state
      setConnectionStatus('disconnected');
      setConnectedBluetoothDevice(null);
      setCameraInfo(null);
      setCameraStatus(null);
      setMediaFiles([]);
      setIsRecording(false);
      setErrorMessage(null);
      setBluetoothDevices([]);
    } catch (error: any) {
      console.error('Disconnect error:', error);
    }
  };

  // MARK: - Camera Control Methods

  const startRecording = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      const result = await goProService.startRecording();
      if (result.success) {
        setIsRecording(true);
        await updateCameraStatus();
      } else {
        setErrorMessage(result.error.message);
      }
    } catch (error: any) {
      setErrorMessage(`Start recording failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const stopRecording = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      const result = await goProService.stopRecording();
      if (result.success) {
        setIsRecording(false);
        await updateCameraStatus();
        await updateMediaFiles(); // Refresh media files
      } else {
        setErrorMessage(result.error.message);
      }
    } catch (error: any) {
      setErrorMessage(`Stop recording failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const setCameraMode = async (mode: string) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      const result = await goProService.setCameraMode(mode);
      if (result.success) {
        await updateCameraStatus();
      } else {
        setErrorMessage(result.error.message);
      }
    } catch (error: any) {
      setErrorMessage(`Mode change failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // MARK: - Update Methods

  const updateCameraStatus = async () => {
    try {
      const result = await goProService.getCameraStatus();
      if (result.success) {
        setCameraStatus(result.data);
        setIsRecording(result.data.recording || false);
      }
    } catch (error: any) {
      console.error('Status update failed:', error);
    }
  };

  const updateMediaFiles = async () => {
    try {
      const result = await goProService.getMediaList();
      if (result.success) {
        setMediaFiles(result.data);
      }
    } catch (error: any) {
      console.error('Media update failed:', error);
    }
  };

  // MARK: - UI Helper Methods

  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'disconnected':
        return { icon: 'wifi-off', color: '#ef4444', text: 'Disconnected' };
      case 'bluetooth_pairing':
        return { icon: 'bluetooth', color: '#f59e0b', text: 'Bluetooth Pairing...' };
      case 'bluetooth_connected':
        return { icon: 'bluetooth', color: '#3b82f6', text: 'Bluetooth Connected' };
      case 'wifi_connecting':
        return { icon: 'wifi', color: '#f59e0b', text: 'Connecting to WiFi...' };
      case 'wifi_connected':
        return { icon: 'wifi', color: '#10b981', text: 'WiFi Connected' };
      default:
        return { icon: 'wifi-off', color: '#ef4444', text: 'Unknown' };
    }
  };

  const renderConnectionStatus = () => {
    const statusInfo = getStatusInfo();
    
    return (
      <View style={styles.statusContainer}>
        <View style={[styles.statusCard, { borderColor: statusInfo.color }]}>
          <Icon name={statusInfo.icon} size={32} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>
        </View>
        
        {connectionStatus === 'disconnected' && (
          <TouchableOpacity 
            style={styles.connectButton}
            onPress={startBluetoothScanning}
            disabled={isLoading}
          >
            <Icon name="bluetooth" size={20} color="white" />
            <Text style={styles.connectButtonText}>Connect via Bluetooth</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderBluetoothDevices = () => {
    if (bluetoothDevices.length === 0) return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available GoPro Devices</Text>
        {bluetoothDevices.map((device, index) => (
          <TouchableOpacity
            key={device.device.id}
            style={styles.deviceCard}
            onPress={() => connectToBluetoothDevice(device)}
            disabled={isLoading}
          >
            <Icon name="camera" size={24} color="#3b82f6" />
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>{device.name}</Text>
              <Text style={styles.deviceRssi}>Signal: {device.rssi} dBm</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#6b7280" />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderCameraControls = () => {
    if (connectionStatus !== 'wifi_connected') return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Camera Controls</Text>
        
        {/* Recording Controls */}
        <View style={styles.recordingControls}>
          <TouchableOpacity
            style={[styles.recordButton, isRecording && styles.recordButtonActive]}
            onPress={startRecording}
            disabled={isRecording || isLoading}
          >
            <Icon name="record-circle" size={24} color="white" />
            <Text style={styles.recordButtonText}>Start Recording</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.recordButton, !isRecording && styles.recordButtonActive]}
            onPress={stopRecording}
            disabled={!isRecording || isLoading}
          >
            <Icon name="stop" size={24} color="white" />
            <Text style={styles.recordButtonText}>Stop Recording</Text>
          </TouchableOpacity>
        </View>
        
        {/* Mode Controls */}
        <View style={styles.modeControls}>
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => setCameraMode(GOPRO_CONFIG.CAMERA_MODES.VIDEO)}
            disabled={isLoading}
          >
            <Text style={styles.modeButtonText}>Video</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => setCameraMode(GOPRO_CONFIG.CAMERA_MODES.PHOTO)}
            disabled={isLoading}
          >
            <Text style={styles.modeButtonText}>Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => setCameraMode(GOPRO_CONFIG.CAMERA_MODES.MULTI_SHOT)}
            disabled={isLoading}
          >
            <Text style={styles.modeButtonText}>Multi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCameraInfo = () => {
    if (!cameraInfo || connectionStatus !== 'wifi_connected') return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Camera Information</Text>
        <View style={styles.infoCard}>
          <InfoRow label="Model" value={cameraInfo.model_name} />
          <InfoRow label="Firmware" value={cameraInfo.firmware_version} />
          <InfoRow label="Serial" value={cameraInfo.serial_number} />
        </View>
      </View>
    );
  };

  const renderMediaFiles = () => {
    if (connectionStatus !== 'wifi_connected') return null;
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recorded Files</Text>
          <TouchableOpacity onPress={updateMediaFiles} disabled={isLoading}>
            <Icon name="refresh" size={20} color="#3b82f6" />
          </TouchableOpacity>
        </View>
        
        {mediaFiles.length === 0 ? (
          <Text style={styles.noFilesText}>No files found</Text>
        ) : (
          <ScrollView style={styles.mediaList}>
            {mediaFiles.slice(0, 10).map((file, index) => (
              <View key={index} style={styles.mediaFileCard}>
                <Icon 
                  name={file.type.toLowerCase() === 'video' ? 'video' : 'image'} 
                  size={20} 
                  color={file.type.toLowerCase() === 'video' ? '#ef4444' : '#3b82f6'} 
                />
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{file.name}</Text>
                  <Text style={styles.fileDetails}>
                    {file.size} bytes • {file.date}
                  </Text>
                </View>
                {file.name.toLowerCase().includes('.360') && (
                  <View style={styles.threeSixtyBadge}>
                    <Text style={styles.threeSixtyText}>360°</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderError = () => {
    if (!errorMessage) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={20} color="#f59e0b" />
        <Text style={styles.errorText}>{errorMessage}</Text>
        <TouchableOpacity onPress={() => setErrorMessage(null)}>
          <Icon name="close" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
    );
  };

  // MARK: - Render

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <LinearGradient
        colors={['#3b82f6', '#8b5cf6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Icon name="camera" size={32} color="white" />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.appTitle}>GoPro 360 Remote</Text>
            <Text style={styles.appSubtitle}>Professional Camera Control</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Connection Status */}
        {renderConnectionStatus()}
        
        {/* Bluetooth Devices */}
        {renderBluetoothDevices()}
        
        {/* Camera Controls */}
        {renderCameraControls()}
        
        {/* Camera Info */}
        {renderCameraInfo()}
        
        {/* Media Files */}
        {renderMediaFiles()}
        
        {/* Error Display */}
        {renderError()}
      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

// MARK: - Helper Components

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

// MARK: - Styles

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  titleContainer: {
    flex: 1,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  appSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusContainer: {
    marginBottom: 24,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 16,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  deviceRssi: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  recordingControls: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  recordButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6b7280',
    padding: 16,
    borderRadius: 12,
  },
  recordButtonActive: {
    backgroundColor: '#ef4444',
  },
  recordButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modeControls: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  mediaList: {
    maxHeight: 300,
  },
  mediaFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  fileDetails: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  threeSixtyBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  threeSixtyText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  noFilesText: {
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic',
    padding: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  errorText: {
    flex: 1,
    color: '#92400e',
    fontSize: 14,
    marginLeft: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 12,
  },
});

export default GoProApp;
