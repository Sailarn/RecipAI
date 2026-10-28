/**
 * @vitest-environment happy-dom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/routes";
import { deleteImage, uploadImage } from "../images";

const fetchMock = vi.fn();

function response(body: unknown, ok = true) {
  return { ok, json: () => Promise.resolve(body) } as Response;
}

describe("uploadImage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(
      response({ url: "https://ik/1", fileId: "f1" }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts a URL source as JSON", async () => {
    const uploaded = await uploadImage("https://example.com/a.jpg");

    expect(uploaded).toEqual({ url: "https://ik/1", fileId: "f1" });
    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe(api.images.upload);
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({ url: "https://example.com/a.jpg" });
  });

  it("posts a file as multipart without a manual Content-Type", async () => {
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });

    await uploadImage(file, { uploadToken: "tok" });

    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
    expect(init.headers).toEqual({ "X-Upload-Token": "tok" });
  });

  it("adds the upload token next to the JSON content type", async () => {
    await uploadImage("https://example.com/a.jpg", { uploadToken: "tok" });

    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      "Content-Type": "application/json",
      "X-Upload-Token": "tok",
    });
  });

  it("throws the server's error message", async () => {
    fetchMock.mockResolvedValue(
      response({ error: "SOURCE_FETCH_FAILED" }, false),
    );

    await expect(uploadImage("https://example.com/a.jpg")).rejects.toThrow(
      "SOURCE_FETCH_FAILED",
    );
  });

  it("throws a generic error when the failure body is not JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new SyntaxError("Unexpected token R")),
    } as Response);

    await expect(uploadImage("https://example.com/a.jpg")).rejects.toThrow(
      "Image upload failed",
    );
  });
});

describe("deleteImage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(response({}));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the file id with the upload token", async () => {
    await deleteImage("f1", { uploadToken: "tok" });

    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe(api.images.delete);
    expect(init.method).toBe("DELETE");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      "X-Upload-Token": "tok",
    });
    expect(JSON.parse(init.body)).toEqual({ fileId: "f1" });
  });
});
