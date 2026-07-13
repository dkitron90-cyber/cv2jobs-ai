"use client";

import { useEffect, useState } from "react";
import type { ApplyResponse, Job } from "../app/lib/types";
import {
  copyText,
  downloadCvFile,
  openApplyDestination,
  type ApplyChannel,
} from "../app/lib/apply-client";
import { useLanguage } from "./LanguageProvider";

type ApplicationSendPanelProps = {
  job: Job;
  application: ApplyResponse;
  file: File;
  onClose: () => void;
  onComplete: (channel: ApplyChannel) => void;
};

export default function ApplicationSendPanel({
  job,
  application,
  file,
  onClose,
  onComplete,
}: ApplicationSendPanelProps) {
  const { t } = useLanguage();
  const [letterCopied, setLetterCopied] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);
  const [portalChannel, setPortalChannel] = useState<ApplyChannel | null>(null);

  useEffect(() => {
    downloadCvFile(file);
    void copyText(application.coverLetter).then(setLetterCopied);
  }, [application.coverLetter, file]);

  async function handleCopyLetter() {
    setLetterCopied(await copyText(application.coverLetter));
  }

  async function handleCopyMessage() {
    setMessageCopied(await copyText(application.recruiterMessage));
  }

  function handleOpenPortal() {
    const channel = openApplyDestination(application);
    setPortalChannel(channel);
  }

  function handleComplete() {
    onComplete(portalChannel ?? "portal");
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
          <li className={messageCopied ? "done" : ""}>
            <span className="send-step-mark">3</span>
            <div>
              <strong>{t("matcher.sendStepMessage")}</strong>
              <button type="button" className="send-step-action" onClick={() => void handleCopyMessage()}>
                {messageCopied ? t("matcher.sendCopied") : t("matcher.sendCopyMessage")}
              </button>
            </div>
          </li>
          <li className={portalChannel ? "done" : ""}>
            <span className="send-step-mark">4</span>
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

        <div className="send-panel-preview">
          <details>
            <summary>{t("matcher.coverLetter")}</summary>
            <div className="prose-block">{application.coverLetter}</div>
          </details>
        </div>

        <footer className="send-panel-footer">
          <button type="button" className="send-panel-done" onClick={handleComplete}>
            {t("matcher.sendMarkDone")}
          </button>
        </footer>
      </section>
    </div>
  );
}
