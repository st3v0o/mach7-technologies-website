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
import type { ExternalMediaAsset } from '@/lib/camera/types';

function formatBytes(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function formatDuration(ms?: number): string {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

interface Props {
  assets: ExternalMediaAsset[];
  isLoading: boolean;
  onFetch: () => void;
  onImport: (mediaId: string) => void;
  importingId: string | null;
}

export function MediaBrowser({ assets, isLoading, onFetch, onImport, importingId }: Props) {
  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.sectionLabel}>CAMERA MEDIA</Text>
        <TouchableOpacity style={styles.fetchBtn} onPress={onFetch} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <Ionicons name="refresh-outline" size={14} color={Colors.accent} />
          )}
          <Text style={styles.fetchBtnLabel}>{isLoading ? 'Loading…' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>

      {assets.length === 0 && !isLoading && (
        <View style={styles.emptyRow}>
          <Ionicons name="film-outline" size={18} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>No media — connect a camera and tap Refresh</Text>
        </View>
      )}

      {assets.map(asset => (
        <View key={asset.id} style={styles.assetRow}>
          <View style={styles.assetIcon}>
            <Ionicons
              name={asset.mimeType.startsWith('video') ? 'film' : 'image'}
              size={22}
              color={Colors.textSecondary}
            />
          </View>
          <View style={styles.assetInfo}>
            <Text style={styles.assetName} numberOfLines={1}>
              {asset.filename}
            </Text>
            <Text style={styles.assetMeta}>
              {formatDuration(asset.durationMs)}  ·  {formatBytes(asset.sizeBytes)}
              {asset.imported ? '  ·  ✓ imported' : ''}
            </Text>
          </View>
          {!asset.imported && (
            <TouchableOpacity
              style={styles.importBtn}
              onPress={() => onImport(asset.id)}
              disabled={importingId === asset.id}
            >
              {importingId === asset.id ? (
                <ActivityIndicator size="small" color={Colors.background} />
              ) : (
                <Ionicons name="download-outline" size={14} color={Colors.background} />
              )}
            </TouchableOpacity>
          )}
        </View>
      ))}
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
  fetchBtn: {
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
  fetchBtnLabel: {
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
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  assetIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    color: Colors.text,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  assetMeta: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  importBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
