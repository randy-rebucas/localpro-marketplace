import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Types } from "mongoose";
import Blog from "@/models/Blog";
import { blogRepository } from "@/repositories";
import { connectDB, disconnectDB } from "@/lib/mongodb";

describe("BlogRepository", () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clear blogs collection before each test
    await Blog.deleteMany({});
  });

  describe("create", () => {
    it("should create a new blog", async () => {
      const blogData = {
        title: "Test Blog Post",
        content: "This is test content",
        excerpt: "Test excerpt",
        author: new Types.ObjectId(),
        status: "draft" as const,
      };

      const blog = await blogRepository.create(blogData);

      expect(blog).toBeDefined();
      expect(blog.title).toBe("Test Blog Post");
      expect(blog.slug).toBe("test-blog-post");
      expect(blog.status).toBe("draft");
      expect(blog._id).toBeDefined();
    });

    it("should auto-generate slug from title", async () => {
      const blog = await blogRepository.create({
        title: "Hello World! This is a Test",
        content: "content",
        author: new Types.ObjectId(),
      });

      expect(blog.slug).toBe("hello-world-this-is-a-test");
    });

    it("should handle special characters in slug", async () => {
      const blog = await blogRepository.create({
        title: "Hello @World #2026!",
        content: "content",
        author: new Types.ObjectId(),
      });

      expect(blog.slug).toBe("hello-world-2026");
    });
  });

  describe("findById", () => {
    it("should find blog by ID", async () => {
      const created = await blogRepository.create({
        title: "Test Blog",
        content: "content",
        author: new Types.ObjectId(),
      });

      const found = await blogRepository.findById(created._id?.toString()!);

      expect(found).toBeDefined();
      expect(found?.title).toBe("Test Blog");
    });

    it("should return null for non-existent ID", async () => {
      const fakeId = new Types.ObjectId();
      const found = await blogRepository.findById(fakeId.toString());
      expect(found).toBeNull();
    });

    it("should not return deleted blogs", async () => {
      const blog = await blogRepository.create({
        title: "Test",
        content: "content",
        author: new Types.ObjectId(),
      });

      await Blog.findByIdAndUpdate(blog._id, { isDeleted: true });

      const found = await blogRepository.findById(blog._id?.toString()!);
      expect(found).toBeNull();
    });
  });

  describe("findBySlug", () => {
    it("should find published blog by slug", async () => {
      const author = new Types.ObjectId();
      await blogRepository.create({
        title: "Slugged Blog",
        content: "content",
        author,
        status: "published",
        publishedAt: new Date(),
      });

      const found = await blogRepository.findBySlug("slugged-blog");

      expect(found).toBeDefined();
      expect(found?.title).toBe("Slugged Blog");
    });

    it("should not find draft blogs by slug", async () => {
      await blogRepository.create({
        title: "Draft Blog",
        content: "content",
        author: new Types.ObjectId(),
        status: "draft",
      });

      const found = await blogRepository.findBySlug("draft-blog");
      expect(found).toBeNull();
    });

    it("should not find deleted blogs by slug", async () => {
      const blog = await blogRepository.create({
        title: "Deleted Blog",
        content: "content",
        author: new Types.ObjectId(),
        status: "published",
        publishedAt: new Date(),
      });

      await Blog.findByIdAndUpdate(blog._id, { isDeleted: true });

      const found = await blogRepository.findBySlug("deleted-blog");
      expect(found).toBeNull();
    });
  });

  describe("findPublished", () => {
    it("should find published blogs with pagination", async () => {
      const author = new Types.ObjectId();

      // Create 15 published blogs
      for (let i = 1; i <= 15; i++) {
        await blogRepository.create({
          title: `Blog ${i}`,
          content: "content",
          author,
          status: "published",
          publishedAt: new Date(Date.now() - i * 1000), // Descending dates
        });
      }

      const result = await blogRepository.findPublished(1, 10);

      expect(result.blogs).toHaveLength(10);
      expect(result.total).toBe(15);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      // Should be sorted by publishedAt descending
      expect(result.blogs[0].title).toBe("Blog 1");
    });

    it("should support search", async () => {
      const author = new Types.ObjectId();

      await blogRepository.create({
        title: "How to Cook",
        content: "Cooking tips and tricks",
        excerpt: "Learn cooking",
        author,
        status: "published",
        publishedAt: new Date(),
      });

      await blogRepository.create({
        title: "Travel Guide",
        content: "Travel destinations",
        excerpt: "Explore the world",
        author,
        status: "published",
        publishedAt: new Date(),
      });

      const result = await blogRepository.findPublished(1, 10, "cook");

      expect(result.blogs).toHaveLength(1);
      expect(result.blogs[0].title).toBe("How to Cook");
    });

    it("should not return draft or archived blogs", async () => {
      const author = new Types.ObjectId();

      await blogRepository.create({
        title: "Published",
        content: "content",
        author,
        status: "published",
        publishedAt: new Date(),
      });

      await blogRepository.create({
        title: "Draft",
        content: "content",
        author,
        status: "draft",
      });

      await blogRepository.create({
        title: "Archived",
        content: "content",
        author,
        status: "archived",
        publishedAt: new Date(),
      });

      const result = await blogRepository.findPublished(1, 10);

      expect(result.blogs).toHaveLength(1);
      expect(result.blogs[0].title).toBe("Published");
    });

    it("should not return future scheduled blogs", async () => {
      const author = new Types.ObjectId();

      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      await blogRepository.create({
        title: "Scheduled Future",
        content: "content",
        author,
        status: "published",
        publishedAt: futureDate,
      });

      const result = await blogRepository.findPublished(1, 10);

      expect(result.blogs).toHaveLength(0);
    });
  });

  describe("updateById", () => {
    it("should update blog fields", async () => {
      const blog = await blogRepository.create({
        title: "Original",
        content: "original content",
        author: new Types.ObjectId(),
      });

      const updated = await blogRepository.updateById(blog._id?.toString()!, {
        title: "Updated",
        content: "updated content",
      });

      expect(updated?.title).toBe("Updated");
      expect(updated?.content).toBe("updated content");
    });

    it("should not allow mass-assignment of protected fields", async () => {
      const blog = await blogRepository.create({
        title: "Test",
        content: "content",
        author: new Types.ObjectId(),
      });

      const originalAuthor = blog.author;

      const updated = await blogRepository.updateById(blog._id?.toString()!, {
        author: new Types.ObjectId(),
        slug: "fake-slug",
        isDeleted: true,
      } as any);

      expect(updated?.author).toEqual(originalAuthor);
      expect(updated?.slug).not.toBe("fake-slug");
      expect(updated?.isDeleted).toBe(false);
    });

    it("should not update non-existent blog", async () => {
      const fakeId = new Types.ObjectId();
      const result = await blogRepository.updateById(fakeId.toString(), {
        title: "New",
      });

      expect(result).toBeNull();
    });
  });

  describe("publish", () => {
    it("should publish a blog and set publishedAt", async () => {
      const blog = await blogRepository.create({
        title: "Draft",
        content: "content",
        author: new Types.ObjectId(),
        status: "draft",
      });

      const before = Date.now();
      const published = await blogRepository.publish(blog._id?.toString()!);
      const after = Date.now();

      expect(published?.status).toBe("published");
      expect(published?.publishedAt).toBeDefined();
      expect(published?.publishedAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(published?.publishedAt!.getTime()).toBeLessThanOrEqual(after + 1000);
    });
  });

  describe("schedule", () => {
    it("should schedule a blog for future publishing", async () => {
      const blog = await blogRepository.create({
        title: "Draft",
        content: "content",
        author: new Types.ObjectId(),
        status: "draft",
      });

      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const scheduled = await blogRepository.schedule(
        blog._id?.toString()!,
        futureDate
      );

      expect(scheduled?.status).toBe("published");
      expect(scheduled?.scheduledFor).toEqual(futureDate);
    });

    it("should reject past dates for scheduling", async () => {
      const blog = await blogRepository.create({
        title: "Draft",
        content: "content",
        author: new Types.ObjectId(),
        status: "draft",
      });

      const pastDate = new Date(Date.now() - 1000);

      await expect(
        blogRepository.schedule(blog._id?.toString()!, pastDate)
      ).rejects.toThrow();
    });
  });

  describe("archive", () => {
    it("should archive a blog", async () => {
      const blog = await blogRepository.create({
        title: "Published",
        content: "content",
        author: new Types.ObjectId(),
        status: "published",
        publishedAt: new Date(),
      });

      const archived = await blogRepository.archive(blog._id?.toString()!);

      expect(archived?.status).toBe("archived");
    });
  });

  describe("delete", () => {
    it("should soft delete a blog", async () => {
      const blog = await blogRepository.create({
        title: "Published",
        content: "content",
        author: new Types.ObjectId(),
        status: "published",
        publishedAt: new Date(),
      });

      const deleted = await blogRepository.delete(blog._id?.toString()!);

      expect(deleted?.isDeleted).toBe(true);
      expect(deleted?.deletedAt).toBeDefined();
    });

    it("should not be findable after soft delete", async () => {
      const blog = await blogRepository.create({
        title: "Test",
        content: "content",
        author: new Types.ObjectId(),
      });

      await blogRepository.delete(blog._id?.toString()!);
      const found = await blogRepository.findById(blog._id?.toString()!);

      expect(found).toBeNull();
    });
  });

  describe("countByStatus", () => {
    it("should count blogs by status", async () => {
      const author = new Types.ObjectId();

      await blogRepository.create({
        title: "Published 1",
        content: "content",
        author,
        status: "published",
        publishedAt: new Date(),
      });

      await blogRepository.create({
        title: "Published 2",
        content: "content",
        author,
        status: "published",
        publishedAt: new Date(),
      });

      await blogRepository.create({
        title: "Draft 1",
        content: "content",
        author,
        status: "draft",
      });

      const counts = await blogRepository.countByStatus();

      expect(counts.published).toBe(2);
      expect(counts.draft).toBe(1);
      expect(counts.scheduled).toBe(0);
      expect(counts.archived).toBe(0);
    });
  });

  describe("getStats", () => {
    it("should return blog statistics", async () => {
      const author = new Types.ObjectId();

      for (let i = 0; i < 5; i++) {
        await blogRepository.create({
          title: `Blog ${i}`,
          content: "content",
          author,
          status: "published",
          publishedAt: new Date(),
        });
      }

      for (let i = 0; i < 3; i++) {
        await blogRepository.create({
          title: `Draft ${i}`,
          content: "content",
          author,
          status: "draft",
        });
      }

      const stats = await blogRepository.getStats();

      expect(stats.total).toBe(8);
      expect(stats.published).toBe(5);
      expect(stats.draft).toBe(3);
      expect(stats.scheduled).toBe(0);
      expect(stats.archived).toBe(0);
    });
  });
});
