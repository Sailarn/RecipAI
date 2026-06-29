import { describe, expect, it, vi } from "vitest";
import { API_ERROR_MESSAGES, ApiError } from "@/lib/api-errors";
import { captureError } from "@/lib/telemetry";

describe("ApiError", () => {
  describe("unauthorized()", () => {
    it("returns 401 with UNAUTHORIZED message", async () => {
      const response = ApiError.unauthorized();

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: API_ERROR_MESSAGES.UNAUTHORIZED });
    });
  });

  describe("badRequest()", () => {
    it("returns 400 with the provided message", async () => {
      const response = ApiError.badRequest("Name is required");

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: "Name is required" });
    });
  });

  describe("invalidBody()", () => {
    it("returns 400 with INVALID_BODY message", async () => {
      const response = ApiError.invalidBody();

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: API_ERROR_MESSAGES.INVALID_BODY });
    });
  });

  describe("notFound()", () => {
    it("returns 404 with default NOT_FOUND message", async () => {
      const response = ApiError.notFound();

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toEqual({ error: API_ERROR_MESSAGES.NOT_FOUND });
    });

    it("returns 404 with a custom message when provided", async () => {
      const response = ApiError.notFound("Recipe not found");

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toEqual({ error: "Recipe not found" });
    });
  });

  describe("rateLimited()", () => {
    it("returns 429 with TOO_MANY_REQUESTS message", async () => {
      const response = ApiError.rateLimited();

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body).toEqual({ error: API_ERROR_MESSAGES.TOO_MANY_REQUESTS });
    });

    it("sets Retry-After header when retryAfterSeconds is provided", async () => {
      const response = ApiError.rateLimited(60);

      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBe("60");
    });

    it("does not set Retry-After header when no seconds provided", () => {
      const response = ApiError.rateLimited();

      expect(response.headers.get("Retry-After")).toBeNull();
    });
  });

  describe("maintenance()", () => {
    it("returns 503 with MAINTENANCE_MODE code and Retry-After", async () => {
      const response = ApiError.maintenance("Maintenance window");

      expect(response.status).toBe(503);
      expect(response.headers.get("Retry-After")).toBe("30");
      const body = await response.json();
      expect(body).toEqual({
        error: "Maintenance window",
        code: "MAINTENANCE_MODE",
      });
    });
  });

  describe("internal()", () => {
    it("returns 500 with generic message and calls captureError when error is provided", async () => {
      const error = new Error("DB connection failed");
      const req = new Request("https://example.com/api/recipes", {
        method: "GET",
      });

      const response = ApiError.internal(error, req);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: API_ERROR_MESSAGES.INTERNAL });
      expect(captureError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ tags: expect.any(Object) }),
      );
    });

    it("passes route tags to captureError", () => {
      const error = new Error("Unexpected");
      const req = new Request("https://example.com/api/recipes/42", {
        method: "POST",
      });

      ApiError.internal(error, req);

      expect(captureError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: {
            "http.method": "POST",
            "api.route": "/api/recipes/42",
          },
          extra: { url: req.url },
        }),
      );
    });

    it("returns custom userMessage when provided", async () => {
      const error = new Error("Raw cause");
      const response = ApiError.internal(
        error,
        undefined,
        "Something went wrong saving your recipe",
      );

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({
        error: "Something went wrong saving your recipe",
      });
    });

    it("does NOT call captureError when error is undefined", () => {
      vi.mocked(captureError).mockClear();

      ApiError.internal();

      expect(captureError).not.toHaveBeenCalled();
    });

    it("returns 500 with generic message when called with no arguments", async () => {
      const response = ApiError.internal();

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: API_ERROR_MESSAGES.INTERNAL });
    });

    it("uses 'unknown' for method and route when no request is provided", () => {
      const error = new Error("headless");

      ApiError.internal(error);

      expect(captureError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: {
            "http.method": "unknown",
            "api.route": "unknown",
          },
        }),
      );
    });
  });

  describe("capture()", () => {
    it("forwards error and request context to captureError", () => {
      const error = new Error("capture me");
      const req = new Request("https://example.com/api/sync", {
        method: "PUT",
      });

      ApiError.capture(error, req);

      expect(captureError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: {
            "http.method": "PUT",
            "api.route": "/api/sync",
          },
          extra: { url: req.url },
        }),
      );
    });

    it("captures without a request", () => {
      const error = new Error("no req");

      ApiError.capture(error);

      expect(captureError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: {
            "http.method": "unknown",
            "api.route": "unknown",
          },
        }),
      );
    });
  });
});
