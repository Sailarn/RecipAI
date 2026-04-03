import { NextResponse } from "next/server";
import { imagekit } from "@/lib/imagekit";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let fileData: string;
    let name: string = `recipe-${Date.now()}`;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 },
        );
      }
      const buffer = await file.arrayBuffer();
      fileData = Buffer.from(buffer).toString("base64");
      name = file.name || name;
    } else {
      const body = await request.json();
      const { url, file, fileName } = body;
      name = fileName || name;

      if (url) {
        const response = await fetch(url);
        if (!response.ok) {
          return NextResponse.json(
            { error: "Failed to fetch image from URL" },
            { status: 400 },
          );
        }
        const buffer = await response.arrayBuffer();
        fileData = Buffer.from(buffer).toString("base64");
      } else if (file) {
        fileData = file;
      } else {
        return NextResponse.json(
          { error: "No image source provided" },
          { status: 400 },
        );
      }
    }

    const result = await imagekit.upload({
      file: fileData,
      fileName: name,
      folder: "/recipes",
    });

    return NextResponse.json({ url: result.url, fileId: result.fileId });
  } catch (error) {
    console.error("ImageKit upload error:", error);
    return NextResponse.json({ error: "Image upload failed" }, { status: 500 });
  }
}
