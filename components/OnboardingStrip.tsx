"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";

const STORAGE_KEY = "cv2jobs_onboarding_v1";

type OnboardingStripProps = {
  onUploadCv: () => void;
  onBrowseJobs: () => void;
};

export default function OnboardingStrip({ onUploadCv, onBrowseJobs }: OnboardingStripProps) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "dismissed") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <section className="onboarding-strip" aria-label={t("onboarding.label")}>
      <div className="onboarding-copy">
        <p className="eyebrow">{t("onboarding.eyebrow")}</p>
        <h2>{t("onboarding.title")}</h2>
        <p>{t("onboarding.body")}</p>
      </div>
      <ol className="onboarding-steps">
        <li>
          <span>1</span>
          <div>
            <strong>{t("onboarding.step1")}</strong>
            <button type="button" onClick={onUploadCv}>
              {t("onboarding.step1Cta")}
            </button>
          </div>
        </li>
        <li>
          <span>2</span>
          <div>
            <strong>{t("onboarding.step2")}</strong>
            <button type="button" onClick={onUploadCv}>
              {t("onboarding.step2Cta")}
            </button>
          </div>
        </li>
        <li>
          <span>3</span>
          <div>
            <strong>{t("onboarding.step3")}</strong>
            <button type="button" onClick={onBrowseJobs}>
              {t("onboarding.step3Cta")}
            </button>
          </div>
        </li>
      </ol>
      <button type="button" className="onboarding-dismiss" onClick={dismiss}>
        {t("onboarding.dismiss")}
      </button>
    </section>
  );
}
