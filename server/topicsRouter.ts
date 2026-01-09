import { Router } from "express";
import { TopicsService } from "./services/topicsService";

const router = Router();
const topicsService = new TopicsService();

/**
 * GET /api/topics
 * Get all active topics
 * Requirements: 3.1
 */
router.get("/", async (req, res) => {
  try {
    const topics = await topicsService.getAllTopics();
    res.json(topics);
  } catch (error: any) {
    console.error("Error fetching topics:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/topics/:slug
 * Get topic by slug
 * Requirements: 3.1
 */
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    
    const topic = await topicsService.getTopicBySlug(slug);
    
    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    // Check if topic has sufficient content
    const hasSufficientContent = await topicsService.hasSufficientContent(topic.id);
    
    // Get related topics if content is insufficient
    let relatedTopics = [];
    if (!hasSufficientContent) {
      relatedTopics = await topicsService.getRelatedTopics(topic.id);
    }

    res.json({
      topic,
      hasSufficientContent,
      relatedTopics: hasSufficientContent ? [] : relatedTopics
    });
  } catch (error: any) {
    console.error("Error fetching topic:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/topics/:slug/feed
 * Get topic-filtered feed
 * Requirements: 3.2, 3.3, 3.4
 */
router.get("/:slug/feed", async (req, res) => {
  try {
    const { slug } = req.params;
    const { 
      page = '1', 
      limit = '20',
      contentTypes,
      priceMin,
      priceMax,
      includeShorts = 'false'
    } = req.query;

    // Get topic by slug
    const topic = await topicsService.getTopicBySlug(slug);
    
    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    // Check if topic has sufficient content
    const contentCount = await topicsService.getTopicContentCount(topic.id);
    
    if (contentCount < 20) {
      // Return empty feed with suggestions
      const relatedTopics = await topicsService.getRelatedTopics(topic.id);
      
      return res.json({
        content: [],
        shorts: [],
        message: "Coming Soon",
        suggestion: "This topic doesn't have enough content yet. Try these related topics:",
        relatedTopics,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: 0,
          hasMore: false
        }
      });
    }

    // Parse filters
    const filters: any = {};
    
    if (contentTypes) {
      filters.contentTypes = (contentTypes as string).split(',');
    }
    
    if (priceMin) {
      filters.priceMin = parseFloat(priceMin as string);
    }
    
    if (priceMax) {
      filters.priceMax = parseFloat(priceMax as string);
    }

    // Get content for topic
    const content = await topicsService.getContentForTopic(
      topic.id,
      {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      },
      filters
    );

    // Optionally get shorts for topic
    let shorts = [];
    if (includeShorts === 'true') {
      shorts = await topicsService.getShortsForTopic(
        topic.id,
        {
          page: parseInt(page as string),
          limit: Math.floor(parseInt(limit as string) / 4) // 25% shorts
        },
        filters
      );
    }

    res.json({
      content,
      shorts,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: contentCount,
        hasMore: content.length === parseInt(limit as string)
      }
    });
  } catch (error: any) {
    console.error("Error fetching topic feed:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/topics/:slug/content-count
 * Get content count for a topic
 * Requirements: 3.6, 16.36
 */
router.get("/:slug/content-count", async (req, res) => {
  try {
    const { slug } = req.params;
    
    const topic = await topicsService.getTopicBySlug(slug);
    
    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    const count = await topicsService.getTopicContentCount(topic.id);
    const hasSufficientContent = count >= 20;

    res.json({
      topicId: topic.id,
      count,
      hasSufficientContent,
      minimumRequired: 20
    });
  } catch (error: any) {
    console.error("Error fetching topic content count:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/topics/:slug/related
 * Get related topics
 * Requirements: 3.6
 */
router.get("/:slug/related", async (req, res) => {
  try {
    const { slug } = req.params;
    const { limit = '3' } = req.query;
    
    const topic = await topicsService.getTopicBySlug(slug);
    
    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    const relatedTopics = await topicsService.getRelatedTopics(
      topic.id,
      parseInt(limit as string)
    );

    res.json(relatedTopics);
  } catch (error: any) {
    console.error("Error fetching related topics:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
