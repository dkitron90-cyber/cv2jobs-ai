"use client";

import { useEffect, useState } from "react";
import type { ApplyResponse, Job } from "../app/lib/types";
import {
  copyText,
  downloadCvFile,
  isAutoOutreachAvailable,
  openApplyDestination,
  openRecruiterEmail,
  sendOutreachAutomatically,
  type ApplyChannel,
  type SendMode,
} from "../app/lib/apply-client";
import { useAuth } from "./useAuth";
import { useLanguage } from "./LanguageProvider";

type ApplicationSendPanelProps = {
  job: Job;
  application: ApplyResponse;
  file: File;
  onClose: () => void;
  onComplete: (channel: ApplyChannel, mode: SendMode) => void;
};

export default function ApplicationSendPanel({
  job,
  application,
  file,
  onClose,
  onComplete,
}: ApplicationSendPanelProps) {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const [mode, setMode] = useState<SendMode>("recruiter");
  const [outreachCopied, setOutreachCopied] = useState(false);
  const [letterCopied, setLetterCopied] = useState(false);
  const [portalChannel, setPortalChannel] = useState<ApplyChannel | null>(null);
  const [recruiterChannel, setRecruiterChannel] = useState<ApplyChannel | null>(null);
  const [autoAvailable, setAutoAvailable] = useState(false);
  const [autoSending, setAutoSending] = useState(false);
  const [autoSent, setAutoSent] = useState(false);
  const [autoError, setAutoError] = useState("");

  useEffect(() => {
    void isAutoOutreachAvailable().then(setAutoAvailable);
  }, []);

  useEffect(() => {
    downloadCvFile(file);
    void copyText(application.outreachMessage).then(setOutreachCopied);
  }, [application.outreachMessage, file]);

  async function handleCopyOutreach() {
    setOutreachCopied(await copyText(application.outreachMessage));
  }

  async function handleCopyLetter() {
    setLetterCopied(await copyText(application.coverLetter));
  }

  function handleEmailRecruiter() {
    void copyText(application.outreachMessage);
    setRecruiterChannel(openRecruiterEmail(application));
  }

  async function handleAutoSend() {
    if (!application.contactEmail || autoSending || autoSent) return;
    setAutoError("");
    setAutoSending(true);
    const result = await sendOutreachAutomatically({ file, application, job, locale });
    setAutoSending(false);
    if (result.ok) {
      setAutoSent(true);
      setRecruiterChannel("email");
      return;
    }
    setAutoError(t("matcher.sendAutoFailed"));
  }

  function handleOpenPortal() {
    const channel = openApplyDestination(application);
    setPortalChannel(channel);
  }

  function handleComplete() {
    if (mode === "recruiter") {
      onComplete(recruiterChannel ?? (application.contactEmail ? "email" : "none"), "recruiter");
      return;
    }
    onComplete(portalChannel ?? "portal", "portal");
  }

  return (
    <div className="send-panel-backdrop" role="presentation" onClick={onClose}>
      <section
        className="send-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-panel-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="send-panel-header">
          <div>
            <p className="eyebrow">{t("matcher.sendReady")}</p>
            <h2 id="send-panel-title">{t("matcher.sendPanelTitle")}</h2>
            <p>{job.title} · {job.company}</p>
          </div>
          <button type="button" className="send-panel-close" onClick={onClose} aria-label={t("matcher.sendClose")}>
            ×
          </button>
        </header>

        <div className="send-mode-tabs" role="tablist" aria-label={t("matcher.sendModeLabel")}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "recruiter"}
            className={mode === "recruiter" ? "active" : ""}
            onClick={() => setMode("recruiter")}
          >
            {t("matcher.sendModeRecruiter")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "portal"}
            className={mode === "portal" ? "active" : ""}
            onClick={() => setMode("portal")}
          >
            {t("matcher.sendModePortal")}
          </button>
        </div>

        {mode === "recruiter" ? (
          <>
            <p className="send-panel-subtitle">{t("matcher.sendRecruiterSubtitle")}</p>
            <div className="send-outreach-preview">
              <span className="send-ai-badge">{t("matcher.sendAiBadge")}</span>
              <div className="prose-block">{application.outreachMessage}</div>
            </div>

            {autoAvailable && application.contactEmail && (
              <section className="send-auto-block">
                <strong>{t("matcher.sendAutoTitle")}</strong>
                <p className="send-panel-note">{t("matcher.sendAutoSubtitle")}</p>
                {!user ? (
                  <p className="send-panel-note">{t("matcher.sendAutoSignIn")}</p>
                ) : (
                  <button
                    type="button"
                    className="send-auto-button"
                    onClick={() => void handleAutoSend()}
                    disabled={autoSending || autoSent}
                  >
                    {autoSending
                      ? t("matcher.sendAutoSending")
                      : autoSent
                        ? t("matcher.sendAutoSent")
                        : t("matcher.sendAutoButton")}
                  </button>
                )}
                {autoError && <p className="send-panel-warning">{autoError}</p>}
              </section>
            )}

            <p className="send-manual-divider">{t("matcher.sendManualDivider")}</p>
            <ol className="send-panel-steps">
              <li className="done">
                <span className="send-step-mark">1</span>
                <div>
                  <strong>{t("matcher.sendStepCv")}</strong>
                  <button type="button" className="send-step-action" onClick={() => downloadCvFile(file)}>
                    {t("matcher.sendDownloadCv")}
                  </button>
                </div>
              </li>
              <li className={outreachCopied ? "done" : ""}>
                <span className="send-step-mark">2</span>
                <div>
                  <strong>{t("matcher.sendStepOutreach")}</strong>
                  <button type="button" className="send-step-action" onClick={() => void handleCopyOutreach()}>
                    {outreachCopied ? t("matcher.sendCopied") : t("matcher.sendCopyOutreach")}
                  </button>
                </div>
              </li>
              <li className={recruiterChannel ? "done" : ""}>
                <span className="send-step-mark">3</span>
                <div>
                  <strong>
                    {application.contactEmail
                      ? t("matcher.sendStepEmailRecruiter")
                      : t("matcher.sendStepPasteLinkedin")}
                  </strong>
                  {application.contactEmail ? (
                    <button type="button" className="send-step-action primary" onClick={handleEmailRecruiter}>
                      {t("matcher.sendEmailRecruiter")}
                    </button>
                  ) : (
                    <p className="send-panel-note">{t("matcher.sendNoRecruiterEmail")}</p>
                  )}
                </div>
              </li>
            </ol>
          </>
        ) : (
          <>
            <p className="send-panel-subtitle">{t("matcher.sendPanelSubtitle")}</p>
            <ol className="send-panel-steps">
              <li className="done">
                <span className="send-step-mark">1</span>
                <div>
                  <strong>{t("matcher.sendStepCv")}</strong>
                  <button type="button" className="send-step-action" onClick={() => downloadCvFile(file)}>
                    {t("matcher.sendDownloadCv")}
                  </button>
                </div>
              </li>
              <li className={letterCopied ? "done" : ""}>
                <span className="send-step-mark">2</span>
                <div>
                  <strong>{t("matcher.sendStepLetter")}</strong>
                  <button type="button" className="send-step-action" onClick={() => void handleCopyLetter()}>
                    {letterCopied ? t("matcher.sendCopied") : t("matcher.sendCopyLetter")}
                  </button>
                </div>
              </li>
              <li className={portalChannel ? "done" : ""}>
                <span className="send-step-mark">3</span>
                <div>
                  <strong>{t("matcher.sendStepPortal")}</strong>
                  <button type="button" className="send-step-action primary" onClick={handleOpenPortal}>
                    {t("matcher.sendOpenPortal")}
                  </button>
                  {portalChannel === "popup_blocked" && (
                    <p className="send-panel-warning">{t("matcher.sendPopupBlocked")}</p>
                  )}
                </div>
              </li>
            </ol>
          </>
        )}

        <footer className="send-panel-footer">
          <button type="button" className="send-panel-done" onClick={handleComplete}>
            {mode === "recruiter" ? t("matcher.sendMarkRecruiterDone") : t("matcher.sendMarkDone")}
          </button>
        </footer>
      </section>
    </div>
  );
}
