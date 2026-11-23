"use client";

import React, { useState } from "react";
import Link from "next/link";

interface GeneratedEmailData {
  company: string;
  interviewerName: string;
  email: string;
  subject: string;
  body: string;
}

export default function MendanPage() {
  // Input States
  const [calendarText, setCalendarText] = useState<string>("");
  const [emailInput, setEmailInput] = useState<string>("");
  const [memo, setMemo] = useState<string>("");

  // Status & UI States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Result State
  const [result, setResult] = useState<GeneratedEmailData | null>(null);

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

    if (!calendarText.trim() && !emailInput.trim()) {
      setErrorMessage("カレンダーや案内メールの本文、または宛先メアドを入力してください。");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarText,
          emailInput,
          memo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "メール文面の生成に失敗しました。");
      }

      setResult(data);
      showToast("お礼メールを生成しました！内容をご確認ください。");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "通信エラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  // Result Field Change Handler
  const handleResultChange = (field: keyof GeneratedEmailData, value: string) => {
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
      {/* Toast Banner */}
      {toastMessage && (
        <div className="toast-notification notification is-primary has-text-weight-bold" style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          borderRadius: "8px"
        }}>
          <span className="icon mr-2">
            <i className="fas fa-check-circle"></i>
          </span>
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <section className="hero is-info is-small mb-4">
        <div className="hero-body px-4 py-4 text-center">
          <div className="container">
            <h1 className="title is-4 has-text-white">
              <i className="fas fa-graduation-cap mr-2"></i>
              面接・面談お礼メール生成
            </h1>
            <p className="subtitle is-6 has-text-white-ter mt-1">
              カレンダー本文からAIが会社名・担当者名を解析し、短文お礼メールを作成
            </p>
          </div>
        </div>
      </section>

      {/* Mode Switch Tabs */}
      <div className="container px-3 max-w-600 mb-4">
        <div className="tabs is-toggle is-fullwidth is-small">
          <ul>
            <li>
              <Link href="/">
                <span className="icon is-small">
                  <i className="fas fa-id-card"></i>
                </span>
                <span>名刺交換</span>
              </Link>
            </li>
            <li className="is-active">
              <Link href="/mendan">
                <span className="icon is-small">
                  <i className="fas fa-user-tie"></i>
                </span>
                <span className="has-text-weight-bold">面接・面談</span>
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
              {/* Recipient Email */}
              <div className="field mb-4">
                <label className="label is-small">
                  <i className="fas fa-envelope mr-1"></i>
                  送り先メールアドレス <span className="tag is-info is-light is-rounded ml-1">手動入力または本文から抽出</span>
                </label>
                <div className="control has-icons-left">
                  <input
                    className="input is-small"
                    type="email"
                    placeholder="例: recruit@company.com (空欄なら本文から自動探索)"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />
                  <span className="icon is-small is-left">
                    <i className="fas fa-at"></i>
                  </span>
                </div>
              </div>

              {/* Calendar / Email Text */}
              <div className="field mb-4">
                <label className="label is-small">
                  <i className="fas fa-calendar-alt mr-1"></i>
                  カレンダー・面接案内メールの本文 <span className="tag is-danger is-light is-rounded ml-1">必須</span>
                </label>
                <div className="control">
                  <textarea
                    className="textarea is-small"
                    rows={6}
                    placeholder="カレンダーの詳細や、案内メールの全文をそのままペーストしてください。AIが会社名や担当者名（例: 佐藤様）を自動で抽出します。"
                    value={calendarText}
                    onChange={(e) => setCalendarText(e.target.value)}
                    required
                  ></textarea>
                </div>
              </div>

              {/* Memo (Optional) */}
              <div className="field mb-4">
                <label className="label is-small">
                  <i className="fas fa-comment-dots mr-1"></i>
                  面談の一言メモ・話題 <span className="tag is-light is-rounded ml-1">任意</span>
                </label>
                <div className="control">
                  <input
                    className="input is-small"
                    type="text"
                    placeholder="例: 新規事業の立ち上げについて、逆質問のお礼など (空欄ならシンプルな定型挨拶)"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <button
                  type="submit"
                  className={`button is-info is-fullwidth has-text-weight-bold ${
                    isLoading ? "is-loading" : ""
                  }`}
                  disabled={isLoading}
                >
                  <i className="fas fa-magic mr-2"></i>
                  お礼メールを作成する
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 2. Generated Result Section */}
        {result && (
          <div className="card mb-5" style={{ border: "2px solid #3298dc" }}>
            <header className="card-header has-background-info-light">
              <p className="card-header-title is-size-6 has-text-info-dark">
                <i className="fas fa-check-circle mr-2"></i>
                生成プレビュー（内容を直接編集できます）
              </p>
            </header>
            <div className="card-content">
              {/* Company & Name */}
              <div className="columns is-mobile is-variable is-2 mb-2">
                <div className="column">
                  <label className="label is-small mb-1">会社名</label>
                  <input
                    className="input is-small has-text-weight-bold"
                    type="text"
                    value={result.company}
                    onChange={(e) => handleResultChange("company", e.target.value)}
                  />
                </div>
                <div className="column">
                  <label className="label is-small mb-1">担当者名</label>
                  <input
                    className="input is-small has-text-weight-bold"
                    type="text"
                    value={result.interviewerName}
                    onChange={(e) => handleResultChange("interviewerName", e.target.value)}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="field mb-3">
                <label className="label is-small mb-1">
                  宛先メールアドレス
                  {!result.email && (
                    <span className="has-text-danger is-size-7 ml-2">
                      (※本文から見つかりませんでした。入力してください)
                    </span>
                  )}
                </label>
                <input
                  className="input is-small"
                  type="email"
                  placeholder="recruit@example.com"
                  value={result.email}
                  onChange={(e) => handleResultChange("email", e.target.value)}
                />
              </div>

              {/* Subject */}
              <div className="field mb-3">
                <label className="label is-small mb-1">件名</label>
                <input
                  className="input is-small"
                  type="text"
                  value={result.subject}
                  onChange={(e) => handleResultChange("subject", e.target.value)}
                />
              </div>

              {/* Body */}
              <div className="field mb-4">
                <label className="label is-small mb-1">本文 (短文プレーンテキスト)</label>
                <textarea
                  className="textarea is-small"
                  rows={9}
                  value={result.body}
                  onChange={(e) => handleResultChange("body", e.target.value)}
                ></textarea>
              </div>

              {/* Actions */}
              <div className="buttons are-small is-centered mt-4">
                <button
                  type="button"
                  className="button is-info is-fullwidth has-text-weight-bold py-4 mb-2"
                  onClick={handleOpenMailApp}
                >
                  <i className="fas fa-paper-plane mr-2"></i>
                  メールアプリを起動して送信 (mailto)
                </button>
                <button
                  type="button"
                  className="button is-light is-fullwidth py-3"
                  onClick={handleCopyToClipboard}
                >
                  <i className="fas fa-copy mr-2"></i>
                  件名と本文をコピー
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
