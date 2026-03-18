"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import "driver.js/dist/driver.css";

export interface TourStep {
  /** Optional emoji icon shown before the step title */
  icon?: string;
  title: string;
  description: string;
  /**
   * Optional CSS selector (or data-tour attribute) to spotlight an element.
   * e.g. "[data-tour='table']" · "#my-header" · ".some-class"
   * Omit for a centered popover (no spotlight).
   */
  element?: string;
}

interface TourGuideProps {
  pageKey: string;
  title: string;
  steps: TourStep[];
}

/**
 * Fires a driver.js spotlight tour once for first-time visitors.
 * Returning users see nothing — the component renders null after the tour
 * has been completed / dismissed.
 */
export default function TourGuide({ pageKey, steps }: TourGuideProps) {
  const t           = useTranslations("tourGuide");
  const storageKey  = `tour_completed_${pageKey}`;
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Already seen — do nothing
    if (localStorage.getItem(storageKey) === "1") return;

    const timer = setTimeout(async () => {
      const { driver } = await import("driver.js");

      const driverObj = driver({
        showProgress: true,
        progressText: "{{current}} / {{total}}",
        nextBtnText:  t("next"),
        prevBtnText:  t("back"),
        doneBtnText:  t("done"),
        smoothScroll: true,
        steps: steps.map((step) => ({
          ...(step.element ? { element: step.element } : {}),
          popover: {
            title:       step.icon ? `${step.icon}\u00A0 ${step.title}` : step.title,
            description: step.description,
          },
        })),
        onDestroyed: () => {
          localStorage.setItem(storageKey, "1");
        },
      });

      driverObj.drive();
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
