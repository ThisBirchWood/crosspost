import type { CSSProperties } from "react";
import { appLayoutStyles } from "./stats/appLayout";
import { authStyles } from "./stats/auth";
import { cardStyles } from "./stats/cards";
import { datasetStyles } from "./stats/datasets";
import { emotionalStyles } from "./stats/emotional";
import { feedbackStyles } from "./stats/feedback";
import { foundationStyles } from "./stats/foundations";
import { modalStyles } from "./stats/modal";

const StatsStyling: Record<string, CSSProperties> = {
  ...foundationStyles,
  ...appLayoutStyles,
  ...authStyles,
  ...datasetStyles,
  ...feedbackStyles,
  ...cardStyles,
  ...emotionalStyles,
  ...modalStyles,
};

export default StatsStyling;
