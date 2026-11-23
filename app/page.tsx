"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";

interface GeneratedEmailData {
  company: string;
  name: string;
  email: string;
  subject: string;
  body: string;
}

export default function Home() {
  // Form Inputs State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [memo, setMemo] = useState<string>("");

  // Status & UI State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Result State
  const [result, setResult] = useState<GeneratedEmailData | null>(null);

  // Refs for hidden inputs & auto-scrolling
  const previewRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Canvas Image Compression (Max Width 1280px, JPEG quality 0.8)
  const compressAndProcessImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1280;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);
          setImagePreviewUrl(compressedDataUrl);
          setImageBase64(compressedDataUrl);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMessage(null);
      compressAndProcessImage(file);
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setImageBase64(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Submit Handler
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageBase64) {
      setErrorMessage("名刺画像を選択または撮影してください。");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: imageBase64,
          memo: memo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "メール生成に失敗いたしました。");
      }

      setResult({
        company: data.company || "",
        name: data.name || "",
        email: data.email || "",
        subject: data.subject || "",
        body: data.body || "",
      });

      showToast("挨拶メールを作成しました！");

      // Smooth scroll to preview section
      setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: any) {
      setErrorMessage(err.message || "通信エラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  // Result Form Change Handler
  const handleResultFieldChange = (
    field: keyof GeneratedEmailData,
    value: string
  ) => {
    if (result) {
      setResult({
        ...result,
        [field]: value,
      });
    }
  };

  // Action: Open Mail App (mailto link)
  const handleOpenMailApp = () => {
    if (!result) return;
    const recipient = result.email.trim();
    const subject = encodeURIComponent(result.subject);
    const body = encodeURIComponent(result.body);

    const mailtoUrl = `mailto:${recipient}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
  };

  // Action: Copy to Clipboard
  const handleCopyToClipboard = async () => {
    if (!result) return;
    const textToCopy = `件名: ${result.subject}\n\n${result.body}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      showToast("件名と本文をコピーしました！");
    } catch (err) {
      showToast("コピーに失敗しました。");
    }
  };

  return (
    <main className="pb-6">
      {/* Hidden File Inputs */}
      {/* 1. Camera Input (capture="environment") */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      {/* 2. Photo Gallery Input (No capture attribute) */}
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Toast Banner */}
      {toastMessage && (
        <div className="toast-notification notification is-primary has-text-weight-bold">
          <span className="icon mr-2">
            <i className="fas fa-check-circle"></i>
          </span>
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <section className="hero is-primary is-small mb-4">
        <div className="hero-body px-4 py-5 text-center">
          <div className="container">
            <h1 className="title is-4 has-text-white">
              <i className="fas fa-id-card mr-2"></i>
              名刺お礼メール生成
            </h1>
            <p className="subtitle is-6 has-text-white-ter mt-1">
              名刺とメモからAIが挨拶メールを自動作成
            </p>
          </div>
        </div>
      </section>

      {/* Mode Switch Tabs */}
      <div className="container px-3 max-w-600 mb-4">
        <div className="tabs is-toggle is-fullwidth is-small">
          <ul>
            <li className="is-active">
              <Link href="/">
                <span className="icon is-small">
                  <i className="fas fa-id-card"></i>
                </span>
                <span className="has-text-weight-bold">名刺交換</span>
              </Link>
            </li>
            <li>
              <Link href="/mendan">
                <span className="icon is-small">
                  <i className="fas fa-user-tie"></i>
                </span>
                <span>面接・面談</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="container px-3 max-w-600">
        {/* Error Notification */}
        {errorMessage && (
          <div className="notification is-danger is-light mb-4">
            <button
              className="delete"
              onClick={() => setErrorMessage(null)}
            ></button>
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {errorMessage}
          </div>
        )}

        {/* 1. Input Form Section */}
        <div className="card mb-5">
          <div className="card-content">
            <form onSubmit={handleGenerate}>
              {/* Business Card Image Picker (2 Mode Choice) */}
              <div className="field mb-4">
                <label className="label is-small mb-2">
                  <i className="fas fa-camera mr-1"></i>
                  名刺画像の読み込み方法を選択
                </label>
                <div className="control">
                  {!imagePreviewUrl ? (
                    <div className="columns is-mobile is-variable is-2">
                      <div className="column">
                        <button
                          type="button"
                          className="button is-primary is-light is-fullwidth py-5 text-center"
                          onClick={() => cameraInputRef.current?.click()}
                          style={{
                            flexDirection: "column",
                            height: "auto",
                            borderRadius: "8px",
                            border: "2px dashed #00d1b2",
                          }}
                        >
                          <span className="icon mb-1">
                            <i className="fas fa-camera fa-lg"></i>
                          </span>
                          <span className="has-text-weight-bold is-size-7">
                            カメラ撮影
                          </span>
                        </button>
                      </div>
                      <div className="column">
                        <button
                          type="button"
                          className="button is-info is-light is-fullwidth py-5 text-center"
                          onClick={() => galleryInputRef.current?.click()}
                          style={{
                            flexDirection: "column",
                            height: "auto",
                            borderRadius: "8px",
                            border: "2px dashed #3298dc",
                          }}
                        >
                          <span className="icon mb-1">
                            <i className="fas fa-images fa-lg"></i>
                          </span>
                          <span className="has-text-weight-bold is-size-7">
                            アルバム・写真から選択
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="preview-thumbnail-container p-2">
                      <img src={imagePreviewUrl} alt="名刺プレビュー" />
                      <button
                        type="button"
                        className="button is-danger is-small is-rounded"
                        style={{ position: "absolute", top: "8px", right: "8px" }}
                        onClick={handleClearImage}
                        title="画像をやり直す"
                      >
                        <i className="fas fa-times mr-1"></i>
                        写真を変更
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Memo Textarea */}
              <div className="field mb-4">
                <label className="label is-small">
                  <i className="fas fa-sticky-note mr-1"></i>
                  備忘録メモ
                </label>
                <div className="control">
                  <textarea
                    className="textarea is-small"
                    rows={3}
                    placeholder="例: 展示会のブースでクラウド移行について相談を受けた。来週火曜日に補足資料を送る約束をした。"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                  ></textarea>
                </div>
              </div>

              {/* Submit Button */}
              <div className="field">
                <button
                  type="submit"
                  className={`button is-primary is-fullwidth has-text-weight-bold ${
                    isLoading ? "is-loading" : ""
                  }`}
                  disabled={isLoading || !imageBase64}
                >
                  <i className="fas fa-magic mr-2"></i>
                  挨拶メールを自動生成する
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 2. Preview & Edit Section */}
        {result && (
          <div className="card mb-5" ref={previewRef}>
            <header className="card-header bg-light">
              <p className="card-header-title is-size-6">
                <i className="fas fa-envelope-open-text mr-2 text-primary"></i>
                生成・編集プレビュー
              </p>
            </header>
            <div className="card-content">
              {/* Destination Email */}
              <div className="field mb-3">
                <label className="label is-small">宛先メールアドレス</label>
                <div className="control has-icons-left">
                  <input
                    className="input is-small"
                    type="email"
                    placeholder="example@company.com"
                    value={result.email}
                    onChange={(e) =>
                      handleResultFieldChange("email", e.target.value)
                    }
                  />
                  <span className="icon is-small is-left">
                    <i className="fas fa-at"></i>
                  </span>
                </div>
              </div>

              {/* Company and Name */}
              <div className="columns is-mobile mb-3">
                <div className="column py-0">
                  <div className="field">
                    <label className="label is-small">会社名</label>
                    <div className="control">
                      <input
                        className="input is-small"
                        type="text"
                        value={result.company}
                        onChange={(e) =>
                          handleResultFieldChange("company", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="column py-0">
                  <div className="field">
                    <label className="label is-small">氏名</label>
                    <div className="control">
                      <input
                        className="input is-small"
                        type="text"
                        value={result.name}
                        onChange={(e) =>
                          handleResultFieldChange("name", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Generated Subject */}
              <div className="field mb-3">
                <label className="label is-small">メール件名</label>
                <div className="control">
                  <input
                    className="input is-small has-text-weight-semibold"
                    type="text"
                    value={result.subject}
                    onChange={(e) =>
                      handleResultFieldChange("subject", e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Generated Body */}
              <div className="field mb-4">
                <label className="label is-small">メール本文</label>
                <div className="control">
                  <textarea
                    className="textarea is-small"
                    rows={10}
                    value={result.body}
                    onChange={(e) =>
                      handleResultFieldChange("body", e.target.value)
                    }
                  ></textarea>
                </div>
              </div>

              {/* Action Buttons (2 parallel) */}
              <div className="action-buttons">
                <button
                  className="button is-info is-fullwidth has-text-weight-bold"
                  onClick={handleOpenMailApp}
                >
                  <i className="fas fa-paper-plane mr-2"></i>
                  メールアプリで開く
                </button>
                <button
                  className="button is-success is-fullwidth has-text-weight-bold"
                  onClick={handleCopyToClipboard}
                >
                  <i className="fas fa-copy mr-2"></i>
                  本文・件名をコピー
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
