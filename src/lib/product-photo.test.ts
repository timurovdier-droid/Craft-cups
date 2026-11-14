import { describe, expect, it } from "vitest";
import { checkPhotoFile, looksLikeImage } from "./product-photo";

function file(type: string, size = 10) {
  return new File([new Uint8Array(size)], "photo", { type });
}

describe("checkPhotoFile", () => {
  it("allows an empty photo when it is optional", () => {
    expect(checkPhotoFile(null, false)).toEqual({ file: null });
  });

  it("asks for a file when the photo is required", () => {
    expect(checkPhotoFile(null, true)).toEqual({ error: "Выберите фото" });
  });

  it("rejects a file that is not a picture", () => {
    expect(checkPhotoFile(file("text/plain"), false)).toEqual({ error: "Подойдёт фото JPG, PNG или WEBP" });
  });
});

describe("looksLikeImage", () => {
  it("recognizes jpeg and png headers", () => {
    expect(looksLikeImage(Buffer.from([0xff, 0xd8, 0xff, 0x00]), "jpg")).toBe(true);
    expect(looksLikeImage(Buffer.from([0x89, 0x50, 0x4e, 0x47]), "png")).toBe(true);
    expect(looksLikeImage(Buffer.from("not a photo"), "jpg")).toBe(false);
  });
});
