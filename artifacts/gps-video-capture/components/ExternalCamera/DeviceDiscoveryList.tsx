import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Colors from '@/constants/colors';
import type { CameraConnectionState, CameraDevice } from '@/lib/camera/types';

interface Props {
  devices: CameraDevice[];
  isDiscovering: boolean;
  connectedDeviceId: string | null;
  connectionState: CameraConnectionState;
  onDiscover: () => void;
  onConnect: (deviceId: string) => void;
  onDisconnect: () => void;
}

export function DeviceDiscoveryList({
  devices,
  isDiscovering,
  connectedDeviceId,
  connectionState,
  onDiscover,
  onConnect,
  onDisconnect,
}: Props) {
  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.sectionLabel}>DEVICES</Text>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={onDiscover}
          disabled={isDiscovering}
        >
          {isDiscovering ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <Ionicons name="search-outline" size={14} color={Colors.accent} />
          )}
          <Text style={styles.scanBtnLabel}>
            {isDiscovering ? 'Scanning…' : 'Scan'}
          </Text>
        </TouchableOpacity>
      </View>

      {devices.length === 0 && !isDiscovering && (
        <View style={styles.emptyRow}>
          <Ionicons name="wifi-outline" size={18} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>No devices found — tap Scan to search</Text>
        </View>
      )}

      {devices.map(device => {
        const isConnected = device.id === connectedDeviceId;
        const isConnecting = isConnected && connectionState === 'connecting';
        return (
          <View key={device.id} style={styles.deviceRow}>
            <View style={styles.deviceInfo}>
              <View style={[styles.dot, isConnected ? styles.dotConnected : styles.dotIdle]} />
              <View>
                <Text style={styles.deviceName}>{device.name}</Text>
                {device.model && (
                  <Text style={styles.deviceMeta}>
                    {device.model}
                    {device.firmwareVersion ? `  ·  fw ${device.firmwareVersion}` : ''}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.deviceRight}>
              {device.batteryLevel != null && (
                <Text style={styles.battery}>
                  {Math.round(device.batteryLevel * 100)}%
                </Text>
              )}
              {isConnected ? (
                <TouchableOpacity style={styles.disconnectBtn} onPress={onDisconnect}>
                  <Text style={styles.disconnectLabel}>Disconnect</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.connectBtn}
                  onPress={() => onConnect(device.id)}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <ActivityIndicator size="small" color={Colors.background} />
                  ) : (
                    <Text style={styles.connectLabel}>Connect</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLabel: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accentDim,
    backgroundColor: 'rgba(255,107,0,0.08)',
  },
  scanBtnLabel: {
    color: Colors.accent,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  emptyText: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotConnected: { backgroundColor: Colors.gpsGreen },
  dotIdle: { backgroundColor: Colors.textTertiary },
  deviceName: {
    color: Colors.text,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  deviceMeta: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
  deviceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  battery: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  connectBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 72,
    alignItems: 'center',
  },
  connectLabel: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  disconnectBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  disconnectLabel: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
});
