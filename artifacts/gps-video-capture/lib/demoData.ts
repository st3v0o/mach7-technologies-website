import { SessionSection } from '@/components/LogMapView';

export const DEMO_SECTIONS: SessionSection[] = [
  {
    sessionId: 'demo_session_001',
    mode: 'video',
    startMs: Date.now() - 3600_000,
    data: [
      {
        id: 'demo_1',
        filename: 'seg_001_f0000_demo.jpg',
        timestamp: Date.now() - 3600_000,
        latitude: 37.7749,
        longitude: -122.4194,
        videoSegment: 'seg_001',
        localPath: '',
        videoPath: '',
        sessionId: 'demo_session_001',
      },
      {
        id: 'demo_2',
        filename: 'seg_001_f0001_demo.jpg',
        timestamp: Date.now() - 3540_000,
        latitude: 37.7761,
        longitude: -122.4180,
        videoSegment: 'seg_001',
        localPath: '',
        videoPath: '',
        sessionId: 'demo_session_001',
      },
      {
        id: 'demo_3',
        filename: 'seg_002_f0000_demo.jpg',
        timestamp: Date.now() - 3480_000,
        latitude: 37.7775,
        longitude: -122.4165,
        videoSegment: 'seg_002',
        localPath: '',
        videoPath: '',
        sessionId: 'demo_session_001',
      },
    ],
  },
];
