// The recorder's page API, on window.__ud.demo, loaded by main.ts in capture mode only (?capture=1, docs/demo.md).
import { createDriver } from './driver.ts';
import { contactSheet } from './sheet.ts';
import type { Ud } from './types.ts';

const ud = (globalThis as unknown as { __ud: Ud }).__ud;
ud.demo = { ...createDriver(ud), sheet: contactSheet };
