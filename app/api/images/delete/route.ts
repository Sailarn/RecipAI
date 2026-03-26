import { NextResponse } from "next/server";
import { imagekit } from "@/lib/imagekit";

export async function DELETE(request: Request) {
  try {
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: "No fileId provided" },
        { status: 400 },
      );
    }

    await imagekit.deleteFile(fileId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ImageKit delete error:", error);
    return NextResponse.json(
      { error: "Image deletion failed" },
      { status: 500 },
    );
  }
}
