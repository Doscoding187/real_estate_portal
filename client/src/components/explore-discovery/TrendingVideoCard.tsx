import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Flame, Play } from 'lucide-react';

interface TrendingVideoCardProps {
  video: {
    id: number;
    title: string;
    thumbnailUrl: string;
    duration: number;
    views: number;
    creatorName: string;
    creatorAvatar?: string;
  };
  onClick: () => void;
  index?: number;
  variant?: 'hero' | 'rail';
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatViews = (views: number) => {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(views);
};

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('') || 'EX';

export function TrendingVideoCard({
  video,
  onClick,
  index = 0,
  variant = 'rail',
}: TrendingVideoCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isHero = variant === 'hero';

  return (
    <motion.article
      className={`group relative flex-shrink-0 cursor-pointer overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 text-left shadow-[0_24px_60px_rgba(15,23,42,0.16)] ${
        isHero ? 'w-[22rem] sm:w-[24rem] lg:w-[28rem]' : 'w-[16rem] sm:w-[17rem]'
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.28 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      role="listitem"
      aria-label={`${video.title} by ${video.creatorName}, ${formatViews(video.views)} views`}
    >
      <div className={isHero ? 'aspect-[9/14]' : 'aspect-[4/6]'} />

      {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-slate-800" />}

      <motion.img
        src={video.thumbnailUrl}
        alt={video.title}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setImageLoaded(true)}
        loading="lazy"
        animate={{ scale: isHovered ? 1.05 : 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/85" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_transparent_30%)]" />

      <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-3 py-1 text-[11px] font-semibold text-white shadow-lg">
            Trending
          </span>
          {isHero ? (
            <span className="rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-xl">
              Hot this week
            </span>
          ) : null}
        </div>

        <div className="rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-xl">
          {formatDuration(video.duration)}
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className={`rounded-full border border-white/20 bg-black/28 shadow-xl backdrop-blur-xl ${
            isHero ? 'p-5' : 'p-4'
          }`}
          animate={{ scale: isHovered ? 1.08 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <Play
            className={`${isHero ? 'h-8 w-8' : 'h-6 w-6'} text-white ml-0.5`}
            fill="currentColor"
            aria-hidden="true"
          />
        </motion.div>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          {video.creatorAvatar ? (
            <img
              src={video.creatorAvatar}
              alt=""
              className="h-8 w-8 rounded-full border border-white/20 object-cover"
              aria-hidden="true"
            />
          ) : (
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[11px] font-bold text-white">
              {getInitials(video.creatorName)}
            </div>
          )}
          <span className="min-w-0 truncate text-sm font-semibold text-white/92">
            {video.creatorName}
          </span>
        </div>

        <h3
          className={`line-clamp-2 font-semibold leading-tight ${isHero ? 'text-2xl' : 'text-lg'}`}
        >
          {video.title}
        </h3>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-sm text-white/78">
            <Eye className="h-4 w-4" />
            <span>{formatViews(video.views)} views</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <Flame className="h-4 w-4 text-orange-400" />
            <span>Watch now</span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
