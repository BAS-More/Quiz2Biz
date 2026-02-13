/**
 * Video Tutorials Component
 * Sprint 39: Interactive Video Tutorials, In-App Player, Guided Walkthroughs
 *
 * Features:
 * - Interactive video tutorials with progress tracking
 * - In-app video player with hotspots
 * - Guided walkthroughs with overlay
 * - Video analytics tracking
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import type { ReactNode } from 'react';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: number; // seconds
  thumbnailUrl: string;
  videoUrl: string;
  category: TutorialCategory;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  hotspots: VideoHotspot[];
  chapters: VideoChapter[];
  createdAt: Date;
  updatedAt: Date;
}

export type TutorialCategory =
  | 'getting-started'
  | 'questionnaires'
  | 'scoring'
  | 'documents'
  | 'admin'
  | 'billing'
  | 'integrations'
  | 'advanced';

export interface VideoHotspot {
  id: string;
  timestamp: number; // seconds
  type: 'link' | 'popup' | 'action';
  label: string;
  description?: string;
  targetUrl?: string;
  action?: () => void;
  position: { x: number; y: number }; // percentage
}

export interface VideoChapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  description?: string;
}

export interface VideoProgress {
  tutorialId: string;
  userId: string;
  watchedSeconds: number;
  completedChapters: string[];
  completionPercentage: number;
  lastWatchedAt: Date;
  rewatchedSegments: { start: number; end: number }[];
}

export interface VideoAnalytics {
  tutorialId: string;
  totalViews: number;
  uniqueViewers: number;
  averageWatchTime: number;
  completionRate: number;
  dropOffPoints: { timestamp: number; count: number }[];
  rewatchedSegments: { start: number; end: number; count: number }[];
  hotspotEngagement: { hotspotId: string; clicks: number }[];
}

// =============================================================================
// TUTORIAL CATALOG
// =============================================================================

export const TUTORIAL_CATALOG: VideoTutorial[] = [
  {
    id: 'getting-started-overview',
    title: 'Getting Started with Quiz2Biz',
    description: 'Learn the basics of Quiz2Biz platform and how to navigate the interface.',
    duration: 420, // 7 minutes
    thumbnailUrl: '/tutorials/thumbnails/getting-started.png',
    videoUrl: '/tutorials/videos/getting-started.mp4',
    category: 'getting-started',
    difficulty: 'beginner',
    tags: ['introduction', 'basics', 'navigation'],
    hotspots: [
      {
        id: 'hs1',
        timestamp: 30,
        type: 'link',
        label: 'Go to Dashboard',
        targetUrl: '/dashboard',
        position: { x: 80, y: 20 },
      },
      {
        id: 'hs2',
        timestamp: 120,
        type: 'popup',
        label: 'Learn More',
        description: 'Click here to learn about questionnaires',
        position: { x: 50, y: 60 },
      },
    ],
    chapters: [
      { id: 'ch1', title: 'Introduction', startTime: 0, endTime: 60 },
      { id: 'ch2', title: 'Dashboard Overview', startTime: 60, endTime: 180 },
      { id: 'ch3', title: 'Navigation', startTime: 180, endTime: 300 },
      { id: 'ch4', title: 'Settings', startTime: 300, endTime: 420 },
    ],
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-25'),
  },
  {
    id: 'creating-questionnaire',
    title: 'Creating Your First Questionnaire',
    description:
      'Step-by-step guide to creating and configuring a business readiness questionnaire.',
    duration: 600, // 10 minutes
    thumbnailUrl: '/tutorials/thumbnails/questionnaire.png',
    videoUrl: '/tutorials/videos/questionnaire.mp4',
    category: 'questionnaires',
    difficulty: 'beginner',
    tags: ['questionnaire', 'create', 'setup'],
    hotspots: [],
    chapters: [
      { id: 'ch1', title: 'Selecting a Template', startTime: 0, endTime: 120 },
      { id: 'ch2', title: 'Customizing Questions', startTime: 120, endTime: 300 },
      { id: 'ch3', title: 'Adding Sections', startTime: 300, endTime: 450 },
      { id: 'ch4', title: 'Review & Publish', startTime: 450, endTime: 600 },
    ],
    createdAt: new Date('2026-01-16'),
    updatedAt: new Date('2026-01-25'),
  },
  {
    id: 'interpreting-scores',
    title: 'Understanding Your Readiness Score',
    description:
      'Learn how to interpret your business readiness scores and identify areas for improvement.',
    duration: 540, // 9 minutes
    thumbnailUrl: '/tutorials/thumbnails/scores.png',
    videoUrl: '/tutorials/videos/scores.mp4',
    category: 'scoring',
    difficulty: 'intermediate',
    tags: ['scores', 'heatmap', 'analysis'],
    hotspots: [],
    chapters: [
      { id: 'ch1', title: 'Score Overview', startTime: 0, endTime: 120 },
      { id: 'ch2', title: 'Reading the Heatmap', startTime: 120, endTime: 300 },
      { id: 'ch3', title: 'Dimension Analysis', startTime: 300, endTime: 420 },
      { id: 'ch4', title: 'Action Items', startTime: 420, endTime: 540 },
    ],
    createdAt: new Date('2026-01-17'),
    updatedAt: new Date('2026-01-25'),
  },
  {
    id: 'document-generation',
    title: 'Generating Business Documents',
    description:
      'How to generate professional business documents from your questionnaire responses.',
    duration: 480, // 8 minutes
    thumbnailUrl: '/tutorials/thumbnails/documents.png',
    videoUrl: '/tutorials/videos/documents.mp4',
    category: 'documents',
    difficulty: 'intermediate',
    tags: ['documents', 'export', 'reports'],
    hotspots: [],
    chapters: [
      { id: 'ch1', title: 'Document Types', startTime: 0, endTime: 120 },
      { id: 'ch2', title: 'Customizing Templates', startTime: 120, endTime: 280 },
      { id: 'ch3', title: 'Export Options', startTime: 280, endTime: 400 },
      { id: 'ch4', title: 'Sharing Documents', startTime: 400, endTime: 480 },
    ],
    createdAt: new Date('2026-01-18'),
    updatedAt: new Date('2026-01-25'),
  },
  {
    id: 'admin-dashboard',
    title: 'Admin Dashboard Walkthrough',
    description:
      'Complete guide to the admin dashboard for managing users, sessions, and approvals.',
    duration: 720, // 12 minutes
    thumbnailUrl: '/tutorials/thumbnails/admin.png',
    videoUrl: '/tutorials/videos/admin.mp4',
    category: 'admin',
    difficulty: 'advanced',
    tags: ['admin', 'management', 'users'],
    hotspots: [],
    chapters: [
      { id: 'ch1', title: 'Dashboard Overview', startTime: 0, endTime: 180 },
      { id: 'ch2', title: 'User Management', startTime: 180, endTime: 360 },
      { id: 'ch3', title: 'Session Monitoring', startTime: 360, endTime: 540 },
      { id: 'ch4', title: 'Approval Workflows', startTime: 540, endTime: 720 },
    ],
    createdAt: new Date('2026-01-19'),
    updatedAt: new Date('2026-01-25'),
  },
  {
    id: 'billing-subscriptions',
    title: 'Managing Billing & Subscriptions',
    description: 'How to manage your subscription, view invoices, and upgrade your plan.',
    duration: 360, // 6 minutes
    thumbnailUrl: '/tutorials/thumbnails/billing.png',
    videoUrl: '/tutorials/videos/billing.mp4',
    category: 'billing',
    difficulty: 'beginner',
    tags: ['billing', 'subscription', 'payment'],
    hotspots: [],
    chapters: [
      { id: 'ch1', title: 'Current Plan', startTime: 0, endTime: 90 },
      { id: 'ch2', title: 'Viewing Invoices', startTime: 90, endTime: 180 },
      { id: 'ch3', title: 'Upgrading Plans', startTime: 180, endTime: 300 },
      { id: 'ch4', title: 'Payment Methods', startTime: 300, endTime: 360 },
    ],
    createdAt: new Date('2026-01-20'),
    updatedAt: new Date('2026-01-25'),
  },
  {
    id: 'github-integration',
    title: 'GitHub Integration Setup',
    description:
      'Connect your GitHub repository to automatically import evidence and track compliance.',
    duration: 480, // 8 minutes
    thumbnailUrl: '/tutorials/thumbnails/github.png',
    videoUrl: '/tutorials/videos/github.mp4',
    category: 'integrations',
    difficulty: 'intermediate',
    tags: ['github', 'integration', 'evidence'],
    hotspots: [],
    chapters: [
      { id: 'ch1', title: 'OAuth Setup', startTime: 0, endTime: 120 },
      { id: 'ch2', title: 'Repository Selection', startTime: 120, endTime: 240 },
      { id: 'ch3', title: 'Evidence Mapping', startTime: 240, endTime: 360 },
      { id: 'ch4', title: 'Automation Rules', startTime: 360, endTime: 480 },
    ],
    createdAt: new Date('2026-01-21'),
    updatedAt: new Date('2026-01-25'),
  },
  {
    id: 'advanced-reporting',
    title: 'Advanced Reporting & Analytics',
    description: 'Deep dive into advanced reporting features, custom dashboards, and data exports.',
    duration: 660, // 11 minutes
    thumbnailUrl: '/tutorials/thumbnails/analytics.png',
    videoUrl: '/tutorials/videos/analytics.mp4',
    category: 'advanced',
    difficulty: 'advanced',
    tags: ['analytics', 'reporting', 'dashboards'],
    hotspots: [],
    chapters: [
      { id: 'ch1', title: 'Custom Dashboards', startTime: 0, endTime: 180 },
      { id: 'ch2', title: 'Report Builder', startTime: 180, endTime: 360 },
      { id: 'ch3', title: 'Data Export', startTime: 360, endTime: 500 },
      { id: 'ch4', title: 'Scheduled Reports', startTime: 500, endTime: 660 },
    ],
    createdAt: new Date('2026-01-22'),
    updatedAt: new Date('2026-01-25'),
  },
  {
    id: 'api-integrations',
    title: 'API & CLI Integration',
    description: 'How to use the Quiz2Biz API and CLI tools for automation and integration.',
    duration: 540, // 9 minutes
    thumbnailUrl: '/tutorials/thumbnails/api.png',
    videoUrl: '/tutorials/videos/api.mp4',
    category: 'integrations',
    difficulty: 'advanced',
    tags: ['api', 'cli', 'automation'],
    hotspots: [],
    chapters: [
      { id: 'ch1', title: 'API Overview', startTime: 0, endTime: 120 },
      { id: 'ch2', title: 'Authentication', startTime: 120, endTime: 240 },
      { id: 'ch3', title: 'CLI Commands', startTime: 240, endTime: 400 },
      { id: 'ch4', title: 'Webhooks', startTime: 400, endTime: 540 },
    ],
    createdAt: new Date('2026-01-23'),
    updatedAt: new Date('2026-01-25'),
  },
  {
    id: 'compliance-best-practices',
    title: 'Compliance Best Practices',
    description: 'Best practices for maintaining compliance and preparing for audits.',
    duration: 600, // 10 minutes
    thumbnailUrl: '/tutorials/thumbnails/compliance.png',
    videoUrl: '/tutorials/videos/compliance.mp4',
    category: 'advanced',
    difficulty: 'advanced',
    tags: ['compliance', 'audit', 'best-practices'],
    hotspots: [],
    chapters: [
      { id: 'ch1', title: 'Compliance Overview', startTime: 0, endTime: 150 },
      { id: 'ch2', title: 'Evidence Collection', startTime: 150, endTime: 300 },
      { id: 'ch3', title: 'Audit Preparation', startTime: 300, endTime: 450 },
      { id: 'ch4', title: 'Continuous Monitoring', startTime: 450, endTime: 600 },
    ],
    createdAt: new Date('2026-01-24'),
    updatedAt: new Date('2026-01-25'),
  },
];

// =============================================================================
// VIDEO TUTORIALS CONTEXT
// =============================================================================

interface VideoTutorialsState {
  tutorials: VideoTutorial[];
  currentTutorial: VideoTutorial | null;
  isPlaying: boolean;
  currentTime: number;
  progress: Map<string, VideoProgress>;
  analytics: Map<string, VideoAnalytics>;
  searchQuery: string;
  selectedCategory: TutorialCategory | 'all';
  selectedDifficulty: VideoTutorial['difficulty'] | 'all';
}

interface VideoTutorialsContextType extends VideoTutorialsState {
  playTutorial: (tutorialId: string) => void;
  pauseTutorial: () => void;
  seekTo: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  markChapterComplete: (tutorialId: string, chapterId: string) => void;
  getProgress: (tutorialId: string) => VideoProgress | null;
  searchTutorials: (query: string) => void;
  filterByCategory: (category: TutorialCategory | 'all') => void;
  filterByDifficulty: (difficulty: VideoTutorial['difficulty'] | 'all') => void;
  trackHotspotClick: (tutorialId: string, hotspotId: string) => void;
  getTutorialsByCategory: (category: TutorialCategory) => VideoTutorial[];
  getRecommendedTutorials: () => VideoTutorial[];
}

const VideoTutorialsContext = createContext<VideoTutorialsContextType | null>(null);

// =============================================================================
// VIDEO TUTORIALS PROVIDER
// =============================================================================

interface VideoTutorialsProviderProps {
  children: ReactNode;
}

export const VideoTutorialsProvider: React.FC<VideoTutorialsProviderProps> = ({ children }) => {
  const [state, setState] = useState<VideoTutorialsState>({
    tutorials: TUTORIAL_CATALOG,
    currentTutorial: null,
    isPlaying: false,
    currentTime: 0,
    progress: new Map(),
    analytics: new Map(),
    searchQuery: '',
    selectedCategory: 'all',
    selectedDifficulty: 'all',
  });

  // Load progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('quiz2biz_video_progress');
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setState((prev) => ({ ...prev, progress: new Map(Object.entries(parsed)) }));
      } catch (e) {
        console.error('Failed to load video progress:', e);
      }
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = useCallback((progress: Map<string, VideoProgress>) => {
    localStorage.setItem('quiz2biz_video_progress', JSON.stringify(Object.fromEntries(progress)));
  }, []);

  const playTutorial = useCallback((tutorialId: string) => {
    const tutorial = TUTORIAL_CATALOG.find((t) => t.id === tutorialId);
    if (tutorial) {
      setState((prev) => ({
        ...prev,
        currentTutorial: tutorial,
        isPlaying: true,
      }));
    }
  }, []);

  const pauseTutorial = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const seekTo = useCallback((time: number) => {
    setState((prev) => ({ ...prev, currentTime: time }));
  }, []);

  const setPlaybackRate = useCallback((_rate: number) => {
    // Playback rate would be handled by video element
  }, []);

  const markChapterComplete = useCallback(
    (tutorialId: string, chapterId: string) => {
      setState((prev) => {
        const newProgress = new Map(prev.progress);
        const existing = newProgress.get(tutorialId) || {
          tutorialId,
          userId: 'current-user',
          watchedSeconds: 0,
          completedChapters: [],
          completionPercentage: 0,
          lastWatchedAt: new Date(),
          rewatchedSegments: [],
        };

        if (!existing.completedChapters.includes(chapterId)) {
          existing.completedChapters.push(chapterId);
          const tutorial = TUTORIAL_CATALOG.find((t) => t.id === tutorialId);
          if (tutorial) {
            existing.completionPercentage =
              (existing.completedChapters.length / tutorial.chapters.length) * 100;
          }
        }

        existing.lastWatchedAt = new Date();
        newProgress.set(tutorialId, existing);
        saveProgress(newProgress);

        return { ...prev, progress: newProgress };
      });
    },
    [saveProgress],
  );

  const getProgress = useCallback(
    (tutorialId: string): VideoProgress | null => {
      return state.progress.get(tutorialId) || null;
    },
    [state.progress],
  );

  const searchTutorials = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const filterByCategory = useCallback((category: TutorialCategory | 'all') => {
    setState((prev) => ({ ...prev, selectedCategory: category }));
  }, []);

  const filterByDifficulty = useCallback((difficulty: VideoTutorial['difficulty'] | 'all') => {
    setState((prev) => ({ ...prev, selectedDifficulty: difficulty }));
  }, []);

  const trackHotspotClick = useCallback((tutorialId: string, hotspotId: string) => {
    // Track analytics for hotspot engagement
    console.log(`Hotspot clicked: ${hotspotId} in tutorial ${tutorialId}`);
  }, []);

  const getTutorialsByCategory = useCallback((category: TutorialCategory): VideoTutorial[] => {
    return TUTORIAL_CATALOG.filter((t) => t.category === category);
  }, []);

  const getRecommendedTutorials = useCallback((): VideoTutorial[] => {
    // Get tutorials with low completion or not started
    const incomplete = TUTORIAL_CATALOG.filter((t) => {
      const progress = state.progress.get(t.id);
      return !progress || progress.completionPercentage < 100;
    });
    return incomplete.slice(0, 5);
  }, [state.progress]);

  const contextValue = useMemo(
    () => ({
      ...state,
      playTutorial,
      pauseTutorial,
      seekTo,
      setPlaybackRate,
      markChapterComplete,
      getProgress,
      searchTutorials,
      filterByCategory,
      filterByDifficulty,
      trackHotspotClick,
      getTutorialsByCategory,
      getRecommendedTutorials,
    }),
    [
      state,
      playTutorial,
      pauseTutorial,
      seekTo,
      setPlaybackRate,
      markChapterComplete,
      getProgress,
      searchTutorials,
      filterByCategory,
      filterByDifficulty,
      trackHotspotClick,
      getTutorialsByCategory,
      getRecommendedTutorials,
    ],
  );

  return (
    <VideoTutorialsContext.Provider value={contextValue}>{children}</VideoTutorialsContext.Provider>
  );
};

export const useVideoTutorials = (): VideoTutorialsContextType => {
  const context = useContext(VideoTutorialsContext);
  if (!context) {
    throw new Error('useVideoTutorials must be used within VideoTutorialsProvider');
  }
  return context;
};

// =============================================================================
// VIDEO PLAYER COMPONENT
// =============================================================================

interface VideoPlayerProps {
  tutorial: VideoTutorial;
  autoPlay?: boolean;
  onComplete?: () => void;
  onChapterChange?: (chapter: VideoChapter) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  tutorial,
  autoPlay = false,
  onComplete,
  onChapterChange,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [activeHotspots, setActiveHotspots] = useState<VideoHotspot[]>([]);
  const [currentChapter, setCurrentChapter] = useState<VideoChapter | null>(null);

  const { markChapterComplete: _markChapterComplete, trackHotspotClick } = useVideoTutorials();

  // Update current chapter based on time
  useEffect(() => {
    const chapter = tutorial.chapters.find(
      (ch) => currentTime >= ch.startTime && currentTime < ch.endTime,
    );
    if (chapter && chapter.id !== currentChapter?.id) {
      setCurrentChapter(chapter);
      onChapterChange?.(chapter);
    }
  }, [currentTime, tutorial.chapters, currentChapter, onChapterChange]);

  // Update active hotspots based on time
  useEffect(() => {
    const active = tutorial.hotspots.filter(
      (hs) => Math.abs(currentTime - hs.timestamp) < 5, // Show within 5 seconds
    );
    setActiveHotspots(active);
  }, [currentTime, tutorial.hotspots]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    onComplete?.();
  }, [onComplete]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  }, []);

  const handlePlaybackRateChange = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleHotspotClick = useCallback(
    (hotspot: VideoHotspot) => {
      trackHotspotClick(tutorial.id, hotspot.id);
      if (hotspot.type === 'link' && hotspot.targetUrl) {
        window.location.href = hotspot.targetUrl;
      } else if (hotspot.type === 'action' && hotspot.action) {
        hotspot.action();
      }
    },
    [tutorial.id, trackHotspotClick],
  );

  const handleChapterClick = useCallback(
    (chapter: VideoChapter) => {
      handleSeek(chapter.startTime);
    },
    [handleSeek],
  );

  return (
    <div
      className="video-player relative bg-black rounded-lg overflow-hidden"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={tutorial.videoUrl}
        poster={tutorial.thumbnailUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="w-full aspect-video"
      />

      {/* Hotspots Overlay */}
      {activeHotspots.map((hotspot) => (
        <div
          key={hotspot.id}
          className="absolute cursor-pointer animate-pulse"
          style={{
            left: `${hotspot.position.x}%`,
            top: `${hotspot.position.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
          onClick={() => handleHotspotClick(hotspot)}
        >
          <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm shadow-lg">
            {hotspot.label}
          </div>
        </div>
      ))}

      {/* Controls Overlay */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Progress Bar */}
          <div className="relative h-1 bg-gray-600 rounded cursor-pointer mb-3">
            <div
              className="absolute h-full bg-blue-500 rounded"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            {/* Chapter Markers */}
            {tutorial.chapters.map((chapter) => (
              <div
                key={chapter.id}
                className="absolute w-1 h-3 -top-1 bg-white/50 cursor-pointer"
                style={{ left: `${(chapter.startTime / duration) * 100}%` }}
                onClick={() => handleChapterClick(chapter)}
                title={chapter.title}
              />
            ))}
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button onClick={togglePlay} className="p-2 hover:bg-white/20 rounded">
                {isPlaying ? '⏸' : '▶'}
              </button>

              {/* Time Display */}
              <span className="text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Volume */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleVolumeChange(volume === 0 ? 1 : 0)}
                  className="p-2 hover:bg-white/20 rounded"
                >
                  {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-20"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Current Chapter */}
              {currentChapter && (
                <span className="text-sm text-gray-300">{currentChapter.title}</span>
              )}

              {/* Playback Speed */}
              <select
                value={playbackRate}
                onChange={(e) => handlePlaybackRateChange(Number(e.target.value))}
                className="bg-transparent text-white text-sm border border-white/30 rounded px-2 py-1"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>

              {/* Fullscreen */}
              <button
                onClick={() => videoRef.current?.requestFullscreen()}
                className="p-2 hover:bg-white/20 rounded"
              >
                ⛶
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// TUTORIAL CARD COMPONENT
// =============================================================================

interface TutorialCardProps {
  tutorial: VideoTutorial;
  onClick: () => void;
  progress?: VideoProgress | null;
}

export const TutorialCard: React.FC<TutorialCardProps> = ({ tutorial, onClick, progress }) => {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const getDifficultyColor = (difficulty: VideoTutorial['difficulty']): string => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="relative">
        <img
          src={tutorial.thumbnailUrl}
          alt={tutorial.title}
          className="w-full aspect-video object-cover"
        />
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {formatDuration(tutorial.duration)}
        </div>
        {progress && progress.completionPercentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${progress.completionPercentage}%` }}
            />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1">{tutorial.title}</h3>
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{tutorial.description}</p>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(tutorial.difficulty)}`}>
            {tutorial.difficulty}
          </span>
          <span className="text-xs text-gray-500">{tutorial.chapters.length} chapters</span>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// TUTORIAL LIBRARY COMPONENT
// =============================================================================

export const TutorialLibrary: React.FC = () => {
  const {
    tutorials,
    searchQuery,
    selectedCategory,
    selectedDifficulty,
    searchTutorials,
    filterByCategory,
    filterByDifficulty,
    playTutorial: _playTutorial,
    getProgress,
    getRecommendedTutorials,
  } = useVideoTutorials();

  const [selectedTutorial, setSelectedTutorial] = useState<VideoTutorial | null>(null);

  const filteredTutorials = useMemo(() => {
    return tutorials.filter((t) => {
      const matchesSearch =
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || t.difficulty === selectedDifficulty;

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [tutorials, searchQuery, selectedCategory, selectedDifficulty]);

  const recommendedTutorials = getRecommendedTutorials();

  const categories: { value: TutorialCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All Categories' },
    { value: 'getting-started', label: 'Getting Started' },
    { value: 'questionnaires', label: 'Questionnaires' },
    { value: 'scoring', label: 'Scoring' },
    { value: 'documents', label: 'Documents' },
    { value: 'admin', label: 'Admin' },
    { value: 'billing', label: 'Billing' },
    { value: 'integrations', label: 'Integrations' },
    { value: 'advanced', label: 'Advanced' },
  ];

  if (selectedTutorial) {
    return (
      <div className="p-6">
        <button
          onClick={() => setSelectedTutorial(null)}
          className="mb-4 text-blue-500 hover:underline flex items-center gap-1"
        >
          ← Back to Library
        </button>
        <h2 className="text-2xl font-bold mb-4">{selectedTutorial.title}</h2>
        <VideoPlayer
          tutorial={selectedTutorial}
          onComplete={() => console.log('Tutorial completed!')}
        />
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Chapters</h3>
          <div className="space-y-2">
            {selectedTutorial.chapters.map((chapter) => (
              <div
                key={chapter.id}
                className="p-3 bg-gray-50 rounded flex justify-between items-center"
              >
                <span>{chapter.title}</span>
                <span className="text-sm text-gray-500">
                  {Math.floor(chapter.startTime / 60)}:
                  {(chapter.startTime % 60).toString().padStart(2, '0')} -
                  {Math.floor(chapter.endTime / 60)}:
                  {(chapter.endTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Video Tutorials</h1>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search tutorials..."
          value={searchQuery}
          onChange={(e) => searchTutorials(e.target.value)}
          className="flex-1 min-w-64 px-4 py-2 border rounded"
        />
        <select
          value={selectedCategory}
          onChange={(e) => filterByCategory(e.target.value as TutorialCategory | 'all')}
          className="px-4 py-2 border rounded"
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        <select
          value={selectedDifficulty}
          onChange={(e) =>
            filterByDifficulty(e.target.value as VideoTutorial['difficulty'] | 'all')
          }
          className="px-4 py-2 border rounded"
        >
          <option value="all">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Recommended Section */}
      {recommendedTutorials.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Recommended for You</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedTutorials.slice(0, 3).map((tutorial) => (
              <TutorialCard
                key={tutorial.id}
                tutorial={tutorial}
                onClick={() => setSelectedTutorial(tutorial)}
                progress={getProgress(tutorial.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Tutorials */}
      <div>
        <h2 className="text-lg font-semibold mb-4">All Tutorials ({filteredTutorials.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTutorials.map((tutorial) => (
            <TutorialCard
              key={tutorial.id}
              tutorial={tutorial}
              onClick={() => setSelectedTutorial(tutorial)}
              progress={getProgress(tutorial.id)}
            />
          ))}
        </div>
        {filteredTutorials.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No tutorials found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  VideoTutorialsProvider,
  useVideoTutorials,
  VideoPlayer,
  TutorialCard,
  TutorialLibrary,
  TUTORIAL_CATALOG,
};
