export type CatPattern = "solid" | "bicolor" | "tabby" | "calico";

export interface CatSpot {
  part: "head" | "body";
  x: number;
  y: number;
  rx: number;
  ry: number;
  rotation: number;
  color: string;
  opacity: number;
}

export interface CustomCat {
  id: string;
  name: string;
  fur: string;
  patch: string;
  accent: string;
  eye: string;
  eye2: string;
  /** 外耳颜色；空字符串表示跟随主色 */
  ear?: string;
  /** 四肢颜色；空字符串表示跟随主色 */
  leg?: string;
  /** 四肢用纯色（不渐变）；默认渐变，从主色过渡到四肢色 */
  legSolid?: boolean;
  pattern: CatPattern;
  spots: CatSpot[];
}

export interface AppSettings {
  x: number | null;
  y: number | null;
  scale: number;
  opacity: number;
  alwaysOnTop: boolean;
  clickThroughLocked: boolean;
  purrPet: boolean;
  purrSleep: boolean;
  autostart: boolean;
  runAsAdmin: boolean;
  privacyMode: boolean;
  leftMouse: boolean;
  coat: string;
  sleepMinutes: number;
  idleActions: boolean;
  showKeyLabels: boolean;
  keyboardLayout: "65" | "104";
  showTrayIcon: boolean;
  mcpEnabled: boolean;
  reminderEnabled: boolean;
  reminderText: string;
  reminderIntervalMinutes: number;
}

export type CatInput =
  | { kind: "keyDown"; code: string; repeat: boolean }
  | { kind: "keyUp"; code: string }
  | { kind: "mouseDown"; button: string }
  | { kind: "mouseUp"; button: string }
  | { kind: "mouseMoved"; nx: number; ny: number }
  | { kind: "mouseWheel"; delta: number }
  | { kind: "privacyTap"; side: "Left" | "Right" };

export type PawSide = "L" | "R";