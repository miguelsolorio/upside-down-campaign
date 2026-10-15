// The dev panel: plain DOM in #devpanel, only mounted with ?dev=1. Buttons and inputs for the DevHooks plus a state readout.
import type { DevHooks } from '../core/types.ts';

type Tag = keyof HTMLElementTagNameMap;
function h<T extends Tag>(tag: T, props: Partial<HTMLElementTagNameMap[T]> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[T] {
  const el = Object.assign(document.createElement(tag), props);
  el.append(...kids);
  return el;
}

const row = (...kids: (Node | string)[]): HTMLDivElement => h('div', {}, ...kids);

/** DOM panel in #devpanel (see index.html). Returns an unmount function. Only mounted with ?dev=1. The group and prop boxes
 * suggest what the stage being played has (`hooks.groups` and `hooks.props`), and any id works if you type it. */
export function mountDevPanel(hooks: DevHooks): () => void {
  const root = document.getElementById('devpanel');
  if (!root) return () => { /* no panel in this page */ };

  const button = (label: string, fn: () => void): HTMLButtonElement => {
    const b = h('button', { textContent: label });
    b.addEventListener('click', () => { fn(); b.blur(); });
    return b;
  };
  const field = (value: string, width: number, type = 'text', list = ''): HTMLInputElement => {
    const el = h('input', { type, value });
    el.style.width = `${width}px`;
    el.style.font = 'inherit';
    if (list) el.setAttribute('list', list);
    return el;
  };
  const options = (id: string, values: readonly string[]): HTMLDataListElement => h('datalist', { id }, ...values.map((v) => h('option', { value: v })));
  const num = (el: HTMLInputElement): number => Number(el.value) || 0;

  const god = h('input', { type: 'checkbox', checked: hooks.god });
  god.addEventListener('change', () => { hooks.god = god.checked; });
  const boxes = h('input', { type: 'checkbox', checked: hooks.hitboxes });
  boxes.addEventListener('change', () => { hooks.hitboxes = boxes.checked; });

  const level = field('5', 36, 'number');
  const group = field(hooks.groups[0] ?? '', 80, 'text', 'dev-groups');
  const prop = field(hooks.props[0] ?? '', 80, 'text', 'dev-props');
  const px = field('200', 44, 'number');
  const py = field('200', 44, 'number');
  const readout = h('pre', {});
  readout.style.cssText = 'margin:6px 0 0;white-space:pre-wrap;max-height:180px;overflow:auto';

  root.replaceChildren(
    h('b', { textContent: 'DEV' }),
    row(h('label', {}, god, ' god '), h('label', {}, boxes, ' hitboxes')),
    row(button('+50 XP', () => hooks.giveXp(50)), button('kill all', () => hooks.killAll()), button('recruit eleven', () => hooks.recruit('eleven'))),
    row('level ', level, button('set', () => hooks.setLevel(num(level)))),
    row('group ', group, button('spawn', () => hooks.spawnGroup(group.value.trim())), options('dev-groups', hooks.groups)),
    row('prop ', prop, button('open', () => hooks.openProp(prop.value.trim())), options('dev-props', hooks.props)),
    row('x ', px, ' y ', py, button('teleport', () => hooks.teleport(num(px), num(py)))),
    readout,
  );
  root.style.display = 'block';

  // Typing in a field must not drive the game: the window listens for WASD, J, K and the rest.
  const stop = (e: Event): void => e.stopPropagation();
  root.addEventListener('keydown', stop);
  root.addEventListener('keyup', stop);

  const refresh = (): void => {
    readout.textContent = Object.entries(hooks.state()).map(([k, v]) => `${k}: ${v}`).join('\n');
    if (document.activeElement !== god) god.checked = hooks.god;
    if (document.activeElement !== boxes) boxes.checked = hooks.hitboxes;
  };
  refresh();
  const timer = setInterval(refresh, 250);

  return () => {
    clearInterval(timer);
    root.removeEventListener('keydown', stop);
    root.removeEventListener('keyup', stop);
    root.replaceChildren();
    root.style.display = 'none';
  };
}
