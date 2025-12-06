/**
 * Accessible Video Player Component
 * 
 * Features:
 * - Keyboard navigation (Space/K to play, M to mute, C for captions)
 * - Screen reader announcements
 * - Respects prefers-reduced-motion
 * - Caption/subtitle support
 * - Focus indicators
 * - ARIA labels
 */

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useVideoAccessibility, useReducedMotion, useAnnounce } from '@/hooks/useAccessibility';

interface Caption {
  src: string;
  srclang: string;
  label: string;
  default?: boolean;
}

interface AccessibleVideoProps {
  src: string;
  poster?: string;
  captions?: Caption[];
  title: string;
  description?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  className?: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  showControls?: boolean;
  reducedMotionFallback?: React.ReactNode;
}

export interface AccessibleVideoRef {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  toggleMute: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

export const AccessibleVideo = forwardRef<AccessibleVideoRef, AccessibleVideoProps>(
  function AccessibleVideo(
    {
      src,
      poster,
      captions = [],
      title,
      description,
      autoPlay = false,
      loop = false,
      muted = true,
      className = '',
      onEnded,
      onTimeUpdate,
      showControls = true,
      reducedMotionFallback,
    },
    ref
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const prefersReducedMotion = useReducedMotion();
    const announce = useAnnounce();
    
    const {
      isPlaying,
      isMuted,
      showCaptions,
      currentTime,
      duration,
      togglePlay,
      toggleMute,
      toggleCaptions,
      seek,
      handleKeyDown,
    } = useVideoAccessibility(videoRef);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      togglePlay,
      toggleMute,
      seek: (time: number) => {
        if (videoRef.current) videoRef.current.currentTime = time;
      },
      getCurrentTime: () => videoRef.current?.currentTime || 0,
      getDuration: () => videoRef.current?.duration || 0,
    }));

    // Handle time updates
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !onTimeUpdate) return;

      const handleTime = () => onTimeUpdate(video.currentTime, video.duration);
      video.addEventListener('timeupdate', handleTime);
      return () => video.removeEventListener('timeupdate', handleTime);
    }, [onTimeUpdate]);

    // Handle video end
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !onEnded) return;

      video.addEventListener('ended', onEnded);
      return () => video.removeEventListener('ended', onEnded);
    }, [onEnded]);

    // Show static fallback for reduced motion
    if (prefersReducedMotion && reducedMotionFallback) {
      return (
        <div 
          className={className}
          role="img"
          aria-label={`${title}${description ? `: ${description}` : ''}`}
        >
          {reducedMotionFallback}
          <div className="sr-only">
            Video content: {title}. {description}
          </div>
        </div>
      );
    }

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
      <div 
        className={`relative group ${className}`}
        onKeyDown={handleKeyDown}
        role="application"
        aria-label={`Video player: ${title}`}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay={autoPlay && !prefersReducedMotion}
          loop={loop}
          muted={muted}
          playsInline
          className="w-full h-full object-cover"
          aria-describedby={description ? 'video-description' : undefined}
        >
          {captions.map((caption, index) => (
            <track
              key={index}
              kind="captions"
              src={caption.src}
              srcLang={caption.srclang}
              label={caption.label}
              default={caption.default}
            />
          ))}
          <p>Your browser does not support the video element.</p>
        </video>

        {description && (
          <div id="video-description" className="sr-only">
            {description}
          </div>
        )}

        {/* Reduced motion warning */}
        {prefersReducedMotion && (
          <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded text-sm">
            Auto-play disabled (reduced motion)
          </div>
        )}

        {/* Custom Controls */}
        {showControls && (
          <div 
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
            role="toolbar"
            aria-label="Video controls"
          >
            {/* Progress bar */}
            <div className="mb-3">
              <label htmlFor="video-progress" className="sr-only">
                Video progress: {formatTime(currentTime)} of {formatTime(duration)}
              </label>
              <input
                id="video-progress"
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  const time = parseFloat(e.target.value);
                  if (videoRef.current) {
                    videoRef.current.currentTime = time;
                  }
                }}
                className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
                  [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white 
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={currentTime}
                aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="text-white hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black rounded p-1"
                  aria-label={isPlaying ? 'Pause video (K)' : 'Play video (K)'}
                  aria-pressed={isPlaying}
                >
                  {isPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Mute/Unmute */}
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black rounded p-1"
                  aria-label={isMuted ? 'Unmute video (M)' : 'Mute video (M)'}
                  aria-pressed={!isMuted}
                >
                  {isMuted ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  )}
                </button>

                {/* Captions */}
                {captions.length > 0 && (
                  <button
                    onClick={toggleCaptions}
                    className={`text-white hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black rounded p-1 ${showCaptions ? 'bg-blue-600' : ''}`}
                    aria-label={showCaptions ? 'Hide captions (C)' : 'Show captions (C)'}
                    aria-pressed={showCaptions}
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z" />
                    </svg>
                  </button>
                )}

                {/* Time display */}
                <span className="text-white text-sm" aria-live="off">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Keyboard shortcuts hint */}
              <button
                className="text-white/60 hover:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                aria-label="Keyboard shortcuts: Space or K to play/pause, M to mute, C for captions, Arrow keys to seek"
                onClick={() => announce('Keyboard shortcuts: Space or K to play/pause, M to mute, C for captions, Left/Right arrows to seek 5 seconds, J/L to seek 10 seconds')}
              >
                ⌨️ Shortcuts
              </button>
            </div>
          </div>
        )}

        {/* Screen reader status */}
        <div className="sr-only" role="status" aria-live="polite">
          {isPlaying ? 'Video playing' : 'Video paused'}
          {isMuted ? ', muted' : ', audio on'}
          {showCaptions ? ', captions on' : ''}
        </div>
      </div>
    );
  }
);

export default AccessibleVideo;
