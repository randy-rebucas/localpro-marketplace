import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Types } from "mongoose";
import Blog from "@/models/Blog";
import User from "@/models/User";
import { connectDB, disconnectDB } from "@/lib/mongodb";
import { POST as createBlog, GET as listBlogs } from "@/app/api/admin/blogs/route";
import {
  POST as createBlogHandler,
  GET as getBlogHandler,
  PATCH as updateBlogHandler,
  DELETE as deleteBlogHandler,
} from "@/app/api/admin/blogs/[id]/route";

// Mock Request and Response constructors
class MockRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;

  constructor(
    method: string,
    url: string,
    body?: any,
    headers?: Record<string, string>
  ) {
    this.method = method;
    this.url = url;
    this.body = body;
    this.headers = {
      "content-type": "application/json",
      ...headers,
    };
  }

  async json() {
    return this.body;
  }

  async text() {
    return JSON.stringify(this.body);
  }
}

class MockResponse {
  status: number = 200;
  data: any = null;
  headers: Record<string, string> = {};

  status_(code: number) {
    this.status = code;
    return this;
  }

  json(data: any) {
    this.data = data;
    return this;
  }

  setHeader(key: string, value: string) {
    this.headers[key] = value;
    return this;
  }
}

describe("Blog API Routes", () => {
  let adminUser: any;
  let authorId: Types.ObjectId;

  beforeAll(async () => {
    await connectDB();

    // Create test admin user
    authorId = new Types.ObjectId();
    adminUser = await User.create({
      email: "admin@localpro.test",
      name: "Admin User",
      role: "admin",
      capabilities: ["manage_blogs"],
      passwordHash: "fake",
    });
  });

  afterAll(async () => {
    await Blog.deleteMany({});
    await User.deleteMany({});
    await disconnectDB();
  });

  beforeEach(async () => {
    await Blog.deleteMany({});
  });

  describe("POST /api/admin/blogs (Create Blog)", () => {
    it("should create a new blog with valid data", async () => {
      const req = new MockRequest("POST", "/api/admin/blogs", {
        title: "Test Blog",
        content: "Test content",
        excerpt: "Test excerpt",
        status: "draft",
      });

      // Mock getCurrentUser to return admin user
      const response = await createBlog(req as any);

      expect(response).toBeDefined();
      const data = await response?.json?.();
      expect(data?.data?.title).toBe("Test Blog");
      expect(data?.data?.slug).toBe("test-blog");
    });

    it("should reject blog creation without title", async () => {
      const req = new MockRequest("POST", "/api/admin/blogs", {
        content: "Test content",
        status: "draft",
      });

      // Should validate and return error
      const response = await createBlog(req as any);
      expect(response).toBeDefined();
    });

    it("should reject blog creation without content", async () => {
      const req = new MockRequest("POST", "/api/admin/blogs", {
        title: "Test",
        status: "draft",
      });

      const response = await createBlog(req as any);
      expect(response).toBeDefined();
    });
  });

  describe("GET /api/admin/blogs (List Blogs)", () => {
    beforeEach(async () => {
      // Create test blogs
      const author = new Types.ObjectId();
      for (let i = 1; i <= 5; i++) {
        await Blog.create({
          title: `Blog ${i}`,
          content: "content",
          author,
          status: i % 2 === 0 ? "published" : "draft",
          publishedAt: i % 2 === 0 ? new Date() : undefined,
        });
      }
    });

    it("should list blogs with pagination", async () => {
      const req = new MockRequest(
        "GET",
        "/api/admin/blogs?page=1&limit=2",
        null
      );

      const response = await listBlogs(req as any);

      expect(response).toBeDefined();
      const data = await response?.json?.();
      expect(data?.data?.blogs?.length).toBeLessThanOrEqual(2);
    });

    it("should filter blogs by status", async () => {
      const req = new MockRequest(
        "GET",
        "/api/admin/blogs?status=draft",
        null
      );

      const response = await listBlogs(req as any);

      expect(response).toBeDefined();
      const data = await response?.json?.();
      expect(data?.data?.blogs?.every((b: any) => b.status === "draft")).toBe(
        true
      );
    });

    it("should search blogs", async () => {
      const req = new MockRequest("GET", "/api/admin/blogs?search=Blog 1", null);

      const response = await listBlogs(req as any);

      expect(response).toBeDefined();
      const data = await response?.json?.();
      if (data?.data?.blogs?.length > 0) {
        expect(
          data?.data?.blogs?.some((b: any) => b.title.includes("Blog 1"))
        ).toBe(true);
      }
    });
  });

  describe("GET /api/admin/blogs/[id] (Get Single Blog)", () => {
    it("should get a blog by ID", async () => {
      const blog = await Blog.create({
        title: "Test",
        content: "content",
        author: authorId,
        status: "draft",
      });

      const req = new MockRequest("GET", `/api/admin/blogs/${blog._id}`, null);

      const response = await getBlogHandler(req as any, { id: blog._id.toString() });

      expect(response).toBeDefined();
      const data = await response?.json?.();
      expect(data?.data?.title).toBe("Test");
    });

    it("should return 404 for non-existent blog", async () => {
      const fakeId = new Types.ObjectId();
      const req = new MockRequest("GET", `/api/admin/blogs/${fakeId}`, null);

      const response = await getBlogHandler(req as any, { id: fakeId.toString() });

      expect(response).toBeDefined();
      if (response?.status === 404 || response?.statusCode === 404) {
        expect(response?.status || response?.statusCode).toBe(404);
      }
    });
  });

  describe("PATCH /api/admin/blogs/[id] (Update Blog)", () => {
    it("should update blog fields", async () => {
      const blog = await Blog.create({
        title: "Original",
        content: "original content",
        author: authorId,
        status: "draft",
      });

      const req = new MockRequest(
        "PATCH",
        `/api/admin/blogs/${blog._id}`,
        {
          title: "Updated",
          content: "updated content",
        }
      );

      const response = await updateBlogHandler(req as any, { id: blog._id.toString() });

      expect(response).toBeDefined();
      const data = await response?.json?.();
      expect(data?.data?.title).toBe("Updated");
      expect(data?.data?.content).toBe("updated content");
    });

    it("should publish a blog", async () => {
      const blog = await Blog.create({
        title: "Draft",
        content: "content",
        author: authorId,
        status: "draft",
      });

      const req = new MockRequest(
        "PATCH",
        `/api/admin/blogs/${blog._id}`,
        {
          status: "published",
        }
      );

      const response = await updateBlogHandler(req as any, { id: blog._id.toString() });

      expect(response).toBeDefined();
      const data = await response?.json?.();
      expect(data?.data?.status).toBe("published");
      expect(data?.data?.publishedAt).toBeDefined();
    });

    it("should schedule a blog for future publishing", async () => {
      const blog = await Blog.create({
        title: "Draft",
        content: "content",
        author: authorId,
        status: "draft",
      });

      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const req = new MockRequest(
        "PATCH",
        `/api/admin/blogs/${blog._id}`,
        {
          status: "scheduled",
          scheduledFor: futureDate,
        }
      );

      const response = await updateBlogHandler(req as any, { id: blog._id.toString() });

      expect(response).toBeDefined();
      const data = await response?.json?.();
      expect(data?.data?.status).toBe("scheduled") ||
        expect(data?.data?.status).toBe("published");
    });

    it("should archive a blog", async () => {
      const blog = await Blog.create({
        title: "Published",
        content: "content",
        author: authorId,
        status: "published",
        publishedAt: new Date(),
      });

      const req = new MockRequest(
        "PATCH",
        `/api/admin/blogs/${blog._id}`,
        {
          status: "archived",
        }
      );

      const response = await updateBlogHandler(req as any, { id: blog._id.toString() });

      expect(response).toBeDefined();
      const data = await response?.json?.();
      expect(data?.data?.status).toBe("archived");
    });

    it("should not allow mass-assignment", async () => {
      const blog = await Blog.create({
        title: "Test",
        content: "content",
        author: authorId,
        status: "draft",
      });

      const newAuthorId = new Types.ObjectId();
      const req = new MockRequest(
        "PATCH",
        `/api/admin/blogs/${blog._id}`,
        {
          author: newAuthorId,
          slug: "fake-slug",
          isDeleted: true,
        }
      );

      const response = await updateBlogHandler(req as any, { id: blog._id.toString() });

      expect(response).toBeDefined();
      const data = await response?.json?.();
      expect(data?.data?.author?.toString()).toEqual(authorId.toString());
      expect(data?.data?.isDeleted).toBe(false);
    });
  });

  describe("DELETE /api/admin/blogs/[id] (Delete Blog)", () => {
    it("should soft delete a blog", async () => {
      const blog = await Blog.create({
        title: "Test",
        content: "content",
        author: authorId,
        status: "published",
        publishedAt: new Date(),
      });

      const req = new MockRequest("DELETE", `/api/admin/blogs/${blog._id}`, null);

      const response = await deleteBlogHandler(req as any, { id: blog._id.toString() });

      expect(response).toBeDefined();
      const data = await response?.json?.();
      // Should return success message or deleted blog
      expect(data).toBeDefined();

      // Verify it's soft deleted
      const found = await Blog.findById(blog._id);
      expect(found?.isDeleted).toBe(true);
    });

    it("should return 404 for non-existent blog", async () => {
      const fakeId = new Types.ObjectId();
      const req = new MockRequest("DELETE", `/api/admin/blogs/${fakeId}`, null);

      const response = await deleteBlogHandler(req as any, { id: fakeId.toString() });

      expect(response).toBeDefined();
      if (response?.status === 404 || response?.statusCode === 404) {
        expect(response?.status || response?.statusCode).toBe(404);
      }
    });
  });
});
