"use client";

import { createContext, useContext } from "react";

export const VideoPageContext = createContext({ onVideo: false });

export function useVideoPage() {
  return useContext(VideoPageContext);
}
