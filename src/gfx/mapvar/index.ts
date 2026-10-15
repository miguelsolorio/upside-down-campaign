// The five map screen designs under review, in card order.
import type { MapVariant } from './types.ts';
import { V1 } from './v1.ts';
import { V2 } from './v2.ts';
import { V3 } from './v3.ts';
import { V4 } from './v4.ts';
import { V5 } from './v5.ts';

export const VARIANTS: MapVariant[] = [V1, V2, V3, V4, V5];
export type { MapVariant, VarNode, VarView, Place } from './types.ts';
