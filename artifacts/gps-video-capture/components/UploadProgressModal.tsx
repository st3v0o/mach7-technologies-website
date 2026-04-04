import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Colors from '@/constants/colors';
import { useStorageConfig } from '@/contexts/StorageConfigContext';
import { useUpload, UploadLog } from '@/contexts/UploadContext';

interface Props {
  visible: boolean;
  sessionId: string;
  onClose: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'uploaded') return <Ionicons name="checkmark-circle" size={16} color={Colors.gpsGreen} />;
  if (status === 'uploading') return <Ionicons name="cloud-upload-outline" size={16} color={Colors.amber} />;
  if (status === 'failed') return <Ionicons name="close-circle" size={16} color={Colors.accent} />;
  return <Ionicons name="time-outline" size={16} color={Colors.textTertiary} />;
}

export default function UploadProgressModal({ visible, sessionId, onClose }: Props) {
  const { providerLabel } = useStorageConfig();
  const {
    isCloudConfigured,
    isOnline,
    queue,
    uploadLogs,
    pendingCount,
    uploadedCount,
    failedCount,
    isProcessing,
    retryFailed,
    clearLogs,
  } = useUpload();

  const slideAnim = useRef(new Animated.Value(600)).current;
  const logsScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  useEffect(() => {
    if (visible && uploadLogs.length > 0) {
      setTimeout(() => logsScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [uploadLogs.length, visible]);

  const sessionItems = queue.filter((i) => i.sessionId === sessionId);
  const total = sessionItems.length;
  const sessionUploaded = sessionItems.filter((i) => i.status === 'uploaded').length;
  const sessionFailed = sessionItems.filter((i) => i.status === 'failed').length;
  const sessionPending = sessionItems.filter(
    (i) => i.status === 'pending' || i.status === 'uploading'
  ).length;
  const progress = total > 0 ? sessionUploaded / total : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <Pressable>
            <BlurView intensity={90} tint="dark" style={styles.sheetInner}>

              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Ionicons
                    name={failedCount > 0 ? 'warning-outline' : isProcessing ? 'cloud-upload-outline' : 'checkmark-circle-outline'}
                    size={18}
                    color={failedCount > 0 ? Colors.amber : Colors.gpsGreen}
                  />
                  <Text style={styles.headerTitle}>Session Complete</Text>
                </View>
                <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
                  <Ionicons name="close" size={20} color={Colors.textSecondary} />
                </Pressable>
              </View>

              {!isCloudConfigured ? (
                <View style={styles.noticeBox}>
                  <Ionicons name="phone-portrait-outline" size={22} color={Colors.textTertiary} />
                  <Text style={styles.noticeTitle}>Saved Locally</Text>
                  <Text style={styles.noticeBody}>
                    No cloud provider configured. Frames and CSV log are saved on your device.
                    Configure a provider in Settings → Cloud Storage.
                  </Text>
                </View>
              ) : (
                <>
                  {!isOnline && (
                    <View style={styles.offlineBar}>
                      <Ionicons name="wifi-outline" size={13} color={Colors.amber} />
                      <Text style={styles.offlineText}>Offline — uploads will resume when connected</Text>
                    </View>
                  )}

                  <View style={styles.providerBadge}>
                    <Ionicons name="cloud-outline" size={12} color={Colors.textTertiary} />
                    <Text style={styles.providerBadgeText}>{providerLabel}</Text>
                  </View>

                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNum, { color: Colors.gpsGreen }]}>{sessionUploaded}</Text>
                      <Text style={styles.statLabel}>UPLOADED</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statNum, { color: Colors.amber }]}>{sessionPending}</Text>
                      <Text style={styles.statLabel}>PENDING</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statNum, { color: sessionFailed > 0 ? Colors.accent : Colors.textTertiary }]}>
                        {sessionFailed}
                      </Text>
                      <Text style={styles.statLabel}>FAILED</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statNum}>{total}</Text>
                      <Text style={styles.statLabel}>TOTAL</Text>
                    </View>
                  </View>

                  {total > 0 && (
                    <View style={styles.progressTrack}>
                      <Animated.View
                        style={[
                          styles.progressFill,
                          { width: `${Math.round(progress * 100)}%` as `${number}%` },
                          sessionFailed > 0 && sessionPending === 0 && { backgroundColor: Colors.accent },
                        ]}
                      />
                    </View>
                  )}

                  {sessionItems.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>FRAMES THIS SESSION</Text>
                      <ScrollView
                        style={styles.itemList}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled
                      >
                        {sessionItems.map((item) => (
                          <View key={item.id} style={styles.itemRow}>
                            <StatusIcon status={item.status} />
                            <Text style={styles.itemName} numberOfLines={1}>
                              {item.filename}
                            </Text>
                            {item.retries > 0 && (
                              <Text style={styles.retryBadge}>retry {item.retries}×</Text>
                            )}
                            <Text
                              style={[
                                styles.itemStatus,
                                item.status === 'uploaded' && { color: Colors.gpsGreen },
                                item.status === 'uploading' && { color: Colors.amber },
                                item.status === 'failed' && { color: Colors.accent },
                              ]}
                            >
                              {item.status === 'uploading' ? 'uploading…' : item.status}
                            </Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {total === 0 && (
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyText}>
                        No detection frames were captured this session.
                      </Text>
                    </View>
                  )}
                </>
              )}

              {uploadLogs.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionLabel}>UPLOAD LOG</Text>
                    <Pressable onPress={clearLogs} hitSlop={8}>
                      <Text style={styles.clearLogsBtn}>Clear</Text>
                    </Pressable>
                  </View>
                  <ScrollView
                    ref={logsScrollRef}
                    style={styles.logsList}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                  >
                    {uploadLogs.map((log: UploadLog, idx: number) => (
                      <View key={idx} style={styles.logRow}>
                        <Text style={styles.logTime}>{formatTime(log.time)}</Text>
                        <Text
                          style={[
                            styles.logMsg,
                            log.level === 'error' && { color: Colors.accent },
                            log.level === 'info' && { color: Colors.gpsGreen },
                          ]}
                          numberOfLines={2}
                        >
                          {log.message}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.actions}>
                {isCloudConfigured && failedCount > 0 && (
                  <Pressable
                    style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.75 }]}
                    onPress={retryFailed}
                  >
                    <Ionicons name="refresh" size={14} color={Colors.amber} />
                    <Text style={styles.retryBtnText}>Retry Failed</Text>
                  </Pressable>
                )}
                <Pressable
                  style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.8 }]}
                  onPress={onClose}
                >
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </View>

            </BlurView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    maxHeight: '82%',
  },
  sheetInner: {
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  closeBtn: {
    padding: 4,
  },
  noticeBox: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 28,
    gap: 8,
  },
  noticeTitle: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  noticeBody: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  providerBadgeText: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,170,0,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,170,0,0.25)',
  },
  offlineText: {
    color: Colors.amber,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 0,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statNum: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
  },
  statLabel: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.gpsGreen,
    borderRadius: 2,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionLabel: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  clearLogsBtn: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  itemList: {
    maxHeight: 160,
    backgroundColor: Colors.card,
    borderRadius: 10,
    paddingVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  itemName: {
    flex: 1,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  retryBadge: {
    color: Colors.amber,
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    backgroundColor: 'rgba(255,170,0,0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  itemStatus: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 0.3,
    minWidth: 64,
    textAlign: 'right',
  },
  emptyBox: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  emptyText: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
  logsList: {
    maxHeight: 110,
    backgroundColor: Colors.card,
    borderRadius: 10,
    paddingVertical: 4,
  },
  logRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  logTime: {
    color: Colors.textTertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    minWidth: 52,
    paddingTop: 1,
  },
  logMsg: {
    flex: 1,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    justifyContent: 'flex-end',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.amber,
    backgroundColor: 'rgba(255,170,0,0.08)',
  },
  retryBtnText: {
    color: Colors.amber,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  doneBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.gpsGreen,
  },
  doneBtnText: {
    color: '#000',
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
});
