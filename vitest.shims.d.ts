/// <reference types="@vitest/browser-playwright" />

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}