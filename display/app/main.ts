import 'modern-css-reset/dist/reset.css';

import '@shoelace-style/shoelace/dist/themes/dark.css';

import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/breadcrumb-item/breadcrumb-item.js';
import '@shoelace-style/shoelace/dist/components/breadcrumb/breadcrumb.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '@shoelace-style/shoelace/dist/components/menu-label/menu-label.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/mutation-observer/mutation-observer.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/tree-item/tree-item.js';
import '@shoelace-style/shoelace/dist/components/tree/tree.js';

import type { SlSelect } from '@shoelace-style/shoelace';
import { setBasePath } from '@shoelace-style/shoelace';

import './components/ko-josa';
import './components/player-name';
import './layout/app';
import './main.css';

setBasePath('shoelace');

declare module '@shoelace-style/shoelace' {
	interface SlSelectSingle<T extends string = string> extends SlSelect {
		readonly multiple: false;
		value: T;
	}
}
