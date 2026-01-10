import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TopicsNavigation } from "../TopicsNavigation";
import { vi } from "vitest";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockTopics = [
  {
    id: "1",
    slug: "find-your-home",
    name: "Find Your Home",
    description: "Discover your perfect property",
    icon: "🏠",
    displayOrder: 1,
    isActive: true,
  },
  {
    id: "2",
    slug: "home-security",
    name: "Home Security",
    description: "Keep your home safe",
    icon: "🔒",
    displayOrder: 2,
    isActive: true,
  },
  {
    id: "3",
    slug: "renovations",
    name: "Renovations & Upgrades",
    description: "Transform your space",
    icon: "🔨",
    displayOrder: 3,
    isActive: true,
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe("TopicsNavigation", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("renders loading skeleton while fetching topics", () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    const onTopicSelect = vi.fn();
    
    render(
      <TopicsNavigation
        activeTopic={null}
        onTopicSelect={onTopicSelect}
      />,
      { wrapper: createWrapper() }
    );

    // Should show loading skeletons
    const skeletons = screen.getAllByRole("generic");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders all topics from API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTopics,
    });

    const onTopicSelect = vi.fn();
    
    render(
      <TopicsNavigation
        activeTopic={null}
        onTopicSelect={onTopicSelect}
      />,
      { wrapper: createWrapper() }
    );

    // Wait for topics to load
    await waitFor(() => {
      expect(screen.getByText("Find Your Home")).toBeInTheDocument();
    });

    // Should render "All" button
    expect(screen.getByText("All")).toBeInTheDocument();
    
    // Should render all topics
    expect(screen.getByText("Find Your Home")).toBeInTheDocument();
    expect(screen.getByText("Home Security")).toBeInTheDocument();
    expect(screen.getByText("Renovations & Upgrades")).toBeInTheDocument();
    
    // Should render icons
    expect(screen.getByText("🏠")).toBeInTheDocument();
    expect(screen.getByText("🔒")).toBeInTheDocument();
    expect(screen.getByText("🔨")).toBeInTheDocument();
  });

  it("highlights active topic correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTopics,
    });

    const onTopicSelect = vi.fn();
    
    render(
      <TopicsNavigation
        activeTopic="home-security"
        onTopicSelect={onTopicSelect}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText("Home Security")).toBeInTheDocument();
    });

    // "All" should not be active
    const allButton = screen.getByText("All");
    expect(allButton).not.toHaveClass("bg-primary");
    expect(allButton.getAttribute("aria-selected")).toBe("false");

    // "Home Security" should be active
    const activeButton = screen.getByText("Home Security");
    expect(activeButton).toHaveClass("bg-primary");
    expect(activeButton.getAttribute("aria-selected")).toBe("true");
  });

  it("calls onTopicSelect when topic is clicked", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTopics,
    });

    const onTopicSelect = vi.fn();
    
    render(
      <TopicsNavigation
        activeTopic={null}
        onTopicSelect={onTopicSelect}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText("Find Your Home")).toBeInTheDocument();
    });

    // Click on a topic
    fireEvent.click(screen.getByText("Find Your Home"));
    
    expect(onTopicSelect).toHaveBeenCalledWith("find-your-home");
  });

  it("calls onTopicSelect with null when All is clicked", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTopics,
    });

    const onTopicSelect = vi.fn();
    
    render(
      <TopicsNavigation
        activeTopic="home-security"
        onTopicSelect={onTopicSelect}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
    });

    // Click on "All"
    fireEvent.click(screen.getByText("All"));
    
    expect(onTopicSelect).toHaveBeenCalledWith(null);
  });

  it("supports keyboard navigation", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTopics,
    });

    const onTopicSelect = vi.fn();
    
    render(
      <TopicsNavigation
        activeTopic={null}
        onTopicSelect={onTopicSelect}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText("Find Your Home")).toBeInTheDocument();
    });

    const topicButton = screen.getByText("Find Your Home");
    
    // Test Enter key
    fireEvent.keyDown(topicButton, { key: "Enter" });
    expect(onTopicSelect).toHaveBeenCalledWith("find-your-home");
    
    onTopicSelect.mockClear();
    
    // Test Space key
    fireEvent.keyDown(topicButton, { key: " " });
    expect(onTopicSelect).toHaveBeenCalledWith("find-your-home");
  });

  it("handles API error gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("API Error"));

    const onTopicSelect = vi.fn();
    
    render(
      <TopicsNavigation
        activeTopic={null}
        onTopicSelect={onTopicSelect}
      />,
      { wrapper: createWrapper() }
    );

    // Should still render "All" button even if API fails
    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
    });
  });

  it("has proper accessibility attributes", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTopics,
    });

    const onTopicSelect = vi.fn();
    
    render(
      <TopicsNavigation
        activeTopic="home-security"
        onTopicSelect={onTopicSelect}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText("Find Your Home")).toBeInTheDocument();
    });

    // Should have tablist role
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-label", "Content topics");

    // All buttons should have tab role
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBe(4); // "All" + 3 topics

    // Active topic should have aria-selected="true"
    const activeTab = screen.getByText("Home Security");
    expect(activeTab).toHaveAttribute("aria-selected", "true");
    
    // Inactive tabs should have aria-selected="false"
    const inactiveTab = screen.getByText("Find Your Home");
    expect(inactiveTab).toHaveAttribute("aria-selected", "false");
  });
});