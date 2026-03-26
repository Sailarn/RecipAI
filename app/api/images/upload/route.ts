import { NextResponse } from "next/server";
import { imagekit } from "@/lib/imagekit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, file, fileName } = body;

    let fileData: string;
    const name: string = fileName || `recipe-${Date.now()}`;

    if (url) {
      // Fetch remote image and convert to base64
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
      // Already base64 from client
      fileData = file;
    } else {
      return NextResponse.json(
        { error: "No image source provided" },
        { status: 400 },
      );
    }

    const result = await imagekit.upload({
      file: fileData,
      fileName: name,
      folder: "/recipes",
    });

    return NextResponse.json({
      url: result.url,
      fileId: result.fileId,
    });
  } catch (error) {
    console.error("ImageKit upload error:", error);
    return NextResponse.json({ error: "Image upload failed" }, { status: 500 });
  }
}
