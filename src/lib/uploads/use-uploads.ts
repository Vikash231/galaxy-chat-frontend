"use client";

import { useEffect, useRef, useState } from "react";
import Uppy from "@uppy/core";
import Transloadit from "@uppy/transloadit";
import { toast } from "sonner";
import { api, ApiError, unwrap } from "../api/client";
import type { paths } from "../api/schema";

type Attachment = paths["/api/v1/uploads/complete"]["post"]["responses"][200]["content"]["application/json"]["attachments"][number];
type Signed = paths["/api/v1/uploads/sign"]["post"]["responses"][200]["content"]["application/json"];
export type UploadItem = {
  id: string;
  name: string;
  preview?: string;
  progress: number;
  status: "uploading" | "processing" | "ready" | "error";
  error?: string;
  attachment?: Attachment;
};

const MAX_FILES = 10;
const MAX_BYTES = 500 * 1024 * 1024;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Confirm the Assembly with our API; it may still be finishing its last step, so retry briefly. */
async function complete(assemblyId: string): Promise<Attachment[]> {
  for (let i = 0; ; i++) {
    try {
      const res = await unwrap(api.POST("/api/v1/uploads/complete", { body: { assemblyId } }));
      return res.attachments;
    } catch (e) {
      if (!(e instanceof ApiError && e.code === "upload_not_ready") || i >= 5) throw e;
      await sleep(1_000 * (i + 1));
    }
  }
}

/**
 * Files go from the browser straight to Transloadit (tus, resumable) with params our API signed,
 * then our API verifies the finished Assembly and returns attachment ids. Our servers never receive file bytes.
 */
export function useUploads() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const patch = (id: string, p: Partial<UploadItem>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const uppyRef = useRef<Uppy | null>(null);

  // Created inside the effect so each mount owns its instance; React dev's double mount would otherwise
  // leave listeners attached to a destroyed instance (duplicate chips, uploads stuck at 0%).
  useEffect(() => {
    const uppy = new Uppy({
      autoProceed: true,
      restrictions: { maxNumberOfFiles: MAX_FILES, maxFileSize: MAX_BYTES, allowedFileTypes: ["image/*", "video/*", "audio/*"] },
    }).use(Transloadit, {
      waitForEncoding: true,
      assemblyOptions: async () => {
        const signed = await unwrap<Signed>(api.POST("/api/v1/uploads/sign"));
        return { params: signed.params, signature: signed.signature };
      },
    });
    uppyRef.current = uppy;
    uppy.on("file-added", (f) => {
      const preview = f.type?.startsWith("image/") && f.data instanceof Blob ? URL.createObjectURL(f.data) : undefined;
      setItems((xs) => [...xs, { id: f.id, name: f.name ?? "file", preview, progress: 0, status: "uploading" }]);
    });
    uppy.on("upload-progress", (f, p) => f && p.bytesTotal && patch(f.id, { progress: Math.round((100 * (p.bytesUploaded ?? 0)) / p.bytesTotal) }));
    uppy.on("upload-success", (f) => f && patch(f.id, { progress: 100, status: "processing" }));
    uppy.on("upload-error", (f, err) => f && patch(f.id, { status: "error", error: err.message || "Upload failed." }));
    uppy.on("restriction-failed", (_f, err) => toast.error(err.message));
    uppy.on("transloadit:assembly-error", (assembly, err) => {
      const ids = Object.keys(uppy.getState().files).filter((id) => uppy.getFile(id)?.transloadit?.assembly === assembly.assembly_id);
      ids.forEach((id) => patch(id, { status: "error", error: err.message || "Upload failed." }));
    });
    uppy.on("transloadit:complete", async (assembly) => {
      const files = uppy.getFiles().filter((f) => f.transloadit?.assembly === assembly.assembly_id);
      try {
        const attachments = await complete(assembly.assembly_id!);
        const unused = [...attachments];
        for (const f of files) {
          const i = unused.findIndex((a) => a.name === f.name) >= 0 ? unused.findIndex((a) => a.name === f.name) : 0;
          const [a] = unused.splice(i, 1);
          patch(f.id, a ? { status: "ready", attachment: a } : { status: "error", error: "This file type isn't supported." });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Upload failed.";
        files.forEach((f) => patch(f.id, { status: "error", error: message }));
      }
    });
    return () => {
      uppy.destroy();
      if (uppyRef.current === uppy) uppyRef.current = null;
    };
  }, []);

  return {
    items,
    busy: items.some((i) => i.status === "uploading" || i.status === "processing"),
    attachmentIds: items.flatMap((i) => (i.status === "ready" && i.attachment ? [i.attachment.id] : [])),
    add(files: FileList | File[]) {
      const uppy = uppyRef.current;
      if (!uppy) return;
      for (const file of Array.from(files)) {
        try {
          uppy.addFile({ name: file.name, type: file.type, data: file, source: "local" });
        } catch {
          /* restriction-failed already told the user */
        }
      }
    },
    remove(id: string) {
      const uppy = uppyRef.current;
      if (uppy?.getFile(id)) uppy.removeFile(id);
      setItems((xs) => {
        const gone = xs.find((x) => x.id === id);
        if (gone?.preview) URL.revokeObjectURL(gone.preview);
        return xs.filter((x) => x.id !== id);
      });
    },
    retry(id: string) {
      patch(id, { status: "uploading", error: undefined, progress: 0 });
      uppyRef.current?.retryUpload(id).catch(() => {});
    },
    /** After a send: forget the files without cancelling anything. */
    clear() {
      setItems((xs) => (xs.forEach((x) => x.preview && URL.revokeObjectURL(x.preview)), []));
      uppyRef.current?.clear();
    },
  };
}
