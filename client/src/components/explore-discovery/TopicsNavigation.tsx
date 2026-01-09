import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Topics Navigation Component
 * 
 * Horizontal scrollable topic list with active topic highlighting
 * 
 * Requirements:
 * - 3.1: Display horizontal scrollable list of Topics
 * - 3.1: Active topic highlighting
 * - 3.6: Handle topics with insufficient content
 * 
 * Features:
 * - Horizontal scroll with smooth scrolling
 * - Active topic highlighting
 * - Keyboard navigation support
 * - Scroll indicators (left/right arrows)
 * - Responsive design
 * - Touch-friendly on mobile
 */

export interface Topic {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  displayOrder: number | null;
  isActive: boolean | null;
}

interface TopicsNavigationProps {
  activeTopic?: string | null;
  onTopicSelect: (topicSlug: string | null) => void;
  className?: string;
}

export function TopicsNavigation({
  activeTopic,
  onTopicSelect,
  className,
}: TopicsNavigationProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Fetch topics from API
  const { data: topics = [], isLoading } = useQuery<Topic[]>({
    queryKey: ["topics"],
    queryFn: async () => {
      const response = await fetch("/api/topics");
      if (!response.ok) {
        throw new Error("Failed to fetch topics");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Check scroll position and update arrow visibility
  const updateScrollIndicators = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  // Scroll to a specific position
  const scrollTo = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 300;
    const newScrollLeft =
      direction === "left"
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: "smooth",
    });
  };

  // Update scroll indicators on mount and scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollIndicators();

    container.addEventListener("scroll", updateScrollIndicators);
    window.addEventListener("resize", updateScrollIndicators);

    return () => {
      container.removeEventListener("scroll", updateScrollIndicators);
      window.removeEventListener("resize", updateScrollIndicators);
    };
  }, [topics]);

  // Scroll active topic into view
  useEffect(() => {
    if (!activeTopic || !scrollContainerRef.current) return;

    const activeButton = scrollContainerRef.current.querySelector(
      `[data-topic-slug="${activeTopic}"]`
    );

    if (activeButton) {
      activeButton.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTopic]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, topicSlug: string | null) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onTopicSelect(topicSlug);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("relative py-4", className)}>
        <div className="flex gap-2 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-10 w-32 animate-pulse rounded-full bg-gray-200"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative py-4", className)}>
      {/* Left scroll arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scrollTo("left")}
          className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg transition-opacity hover:bg-gray-50"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5 text-gray-700" />
        </button>
      )}

      {/* Topics scroll container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide px-8 md:px-12"
        role="tablist"
        aria-label="Content topics"
      >
        {/* "All" / Default topic */}
        <button
          onClick={() => onTopicSelect(null)}
          onKeyDown={(e) => handleKeyDown(e, null)}
          data-topic-slug="all"
          role="tab"
          aria-selected={!activeTopic}
          className={cn(
            "flex-shrink-0 rounded-full px-6 py-2 text-sm font-medium transition-all",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            !activeTopic
              ? "bg-primary text-white shadow-md"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          )}
        >
          All
        </button>

        {/* Topic buttons */}
        {topics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onTopicSelect(topic.slug)}
            onKeyDown={(e) => handleKeyDown(e, topic.slug)}
            data-topic-slug={topic.slug}
            role="tab"
            aria-selected={activeTopic === topic.slug}
            className={cn(
              "flex flex-shrink-0 items-center gap-2 rounded-full px-6 py-2 text-sm font-medium transition-all",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              activeTopic === topic.slug
                ? "bg-primary text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            {topic.icon && <span className="text-base">{topic.icon}</span>}
            <span>{topic.name}</span>
          </button>
        ))}
      </div>

      {/* Right scroll arrow */}
      {showRightArrow && (
        <button
          onClick={() => scrollTo("right")}
          className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg transition-opacity hover:bg-gray-50"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5 text-gray-700" />
        </button>
      )}
    </div>
  );
}
