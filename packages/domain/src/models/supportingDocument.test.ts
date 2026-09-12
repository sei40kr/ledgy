import { describe, expect, it } from "vitest";
import {
  MAX_SUPPORTING_DOCUMENT_FILE_SIZE,
  SupportingDocumentContentTypeUnsupportedError,
  SupportingDocumentFileEmptyError,
  SupportingDocumentFileTooLargeError,
  validateSupportingDocumentFile,
} from "./supportingDocument";

describe("validateSupportingDocumentFile", () => {
  it("accepts a PDF or an image within the size limit", () => {
    expect(validateSupportingDocumentFile({ contentType: "application/pdf", size: 1 })).toBe(
      "application/pdf",
    );
    expect(
      validateSupportingDocumentFile({ contentType: "image/jpeg", size: MAX_SUPPORTING_DOCUMENT_FILE_SIZE }),
    ).toBe("image/jpeg");
  });

  it("rejects any other file type", () => {
    expect(() =>
      validateSupportingDocumentFile({ contentType: "text/plain", size: 10 }),
    ).toThrow(SupportingDocumentContentTypeUnsupportedError);
    expect(() => validateSupportingDocumentFile({ contentType: "", size: 10 })).toThrow(
      SupportingDocumentContentTypeUnsupportedError,
    );
  });

  it("rejects an empty file and one over the size limit", () => {
    expect(() =>
      validateSupportingDocumentFile({ contentType: "image/png", size: 0 }),
    ).toThrow(SupportingDocumentFileEmptyError);
    expect(() =>
      validateSupportingDocumentFile({
        contentType: "image/png",
        size: MAX_SUPPORTING_DOCUMENT_FILE_SIZE + 1,
      }),
    ).toThrow(SupportingDocumentFileTooLargeError);
  });
});
