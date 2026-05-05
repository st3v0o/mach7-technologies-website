import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';

export const ONBOARDING_KEY = '@has_seen_onboarding_v1';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Bullet {
  label: string;
  description: string;
  accentColor?: string;
}

interface Slide {
  id: string;
  iconLabel: string;
  iconBg: string;
  accentColor: string;
  title: string;
  subtitle: string;
  bullets: Bullet[];
}

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    iconLabel: '📍',
    iconBg: Colors.gpsDim,
    accentColor: Colors.gpsGreen,
    title: 'Welcome to Geospector',
    subtitle: 'GPS-tagged field capture in three steps',
    bullets: [
      { label: 'Capture', description: 'Record GPS-tagged frames from your camera' },
      { label: 'Log', description: 'Review your session on the map or in list view' },
      { label: 'Settings', description: 'Configure modes and storage before starting' },
    ],
  },
  {
    id: 'capture-modes',
    iconLabel: '🎬',
    iconBg: 'rgba(10,132,255,0.15)',
    accentColor: Colors.blue,
    title: 'Capture Modes',
    subtitle: 'Choose how frames are recorded',
    bullets: [
      { label: 'Auto (Video)', description: 'Records video — frames extracted automatically' },
      { label: 'Photo', description: 'Still photos on a timer or every N feet, no video file' },
      { label: 'Manual', description: 'GPS auto-tracks; tap the shutter when you want a frame' },
    ],
  },
  {
    id: 'frame-rate',
    iconLabel: '⏱',
    iconBg: Colors.amberDim,
    accentColor: Colors.amber,
    title: 'Frame Rate Modes',
    subtitle: 'Control how often frames are captured',
    bullets: [
      { label: 'Fixed (time)', description: '1 frame every N seconds — 0.25 to 4 fps', accentColor: Colors.blue },
      { label: 'Dynamic (distance)', description: '1 frame every N feet; rate scales with speed', accentColor: Colors.amber },
    ],
  },
  {
    id: 'storage',
    iconLabel: '☁️',
    iconBg: Colors.gpsDim,
    accentColor: Colors.gpsGreen,
    title: 'Storage Modes',
    subtitle: 'Decide where your data lives',
    bullets: [
      { label: 'Local only', description: 'Stays on device — no account or setup needed' },
      { label: 'Supabase (cloud)', description: 'Auto-uploads to bucket; required for Portal feed' },
      { label: 'Webhook', description: 'POST frames to any custom endpoint' },
    ],
  },
  {
    id: 'ready',
    iconLabel: '✅',
    iconBg: Colors.gpsDim,
    accentColor: Colors.gpsGreen,
    title: "You're all set",
    subtitle: 'Here is how to get started',
    bullets: [
      { label: 'Settings', description: 'Configure capture mode and storage first' },
      { label: 'Capture', description: 'Head to Capture and tap Record' },
      { label: 'Log', description: 'Review your frames and publish when ready' },
    ],
  },
];

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export default function OnboardingModal({ visible, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);

  const isLast = activeIndex === SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      onDismiss();
    } else {
      const next = activeIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    }
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
        <Text style={styles.iconEmoji}>{item.iconLabel}</Text>
      </View>

      <Text style={[styles.slideTitle, { fontFamily: 'Inter_700Bold' }]}>{item.title}</Text>
      <Text style={[styles.slideSubtitle, { fontFamily: 'Inter_400Regular' }]}>
        {item.subtitle}
      </Text>

      <View style={styles.bulletsContainer}>
        {item.bullets.map((bullet) => (
          <View key={bullet.label} style={styles.bulletCard}>
            <Text style={[styles.bulletLabel, { color: bullet.accentColor ?? item.accentColor, fontFamily: 'Inter_700Bold' }]}>
              {bullet.label}
            </Text>
            <Text style={[styles.bulletDescription, { fontFamily: 'Inter_400Regular' }]}>
              {bullet.description}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          {!isLast && (
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.skipText, { fontFamily: 'Inter_400Regular' }]}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          ref={flatListRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          scrollEventThrottle={16}
        />

        <View style={styles.footer}>
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === activeIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.ctaButton} onPress={handleNext} activeOpacity={0.85}>
            <Text style={[styles.ctaText, { fontFamily: 'Inter_700Bold' }]}>
              {isLast ? "Let's go" : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 48,
  },
  headerSpacer: {
    flex: 1,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  iconEmoji: {
    fontSize: 42,
  },
  slideTitle: {
    fontSize: 26,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  slideSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  bulletsContainer: {
    width: '100%',
    gap: 10,
  },
  bulletCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  bulletLabel: {
    fontSize: 14,
    marginBottom: 3,
  },
  bulletDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
    gap: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.gpsGreen,
  },
  dotInactive: {
    width: 6,
    backgroundColor: Colors.textTertiary,
  },
  ctaButton: {
    backgroundColor: Colors.gpsGreen,
    borderRadius: 100,
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: '#000000',
    fontSize: 16,
  },
});
