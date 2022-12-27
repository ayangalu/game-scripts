import type { SlTree } from '@shoelace-style/shoelace';
import { SlTreeItem } from '@shoelace-style/shoelace';
import { css, html, render, LitElement } from 'lit';
import { customElement, query, queryAll, state } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';

import { KoreanJosa } from '~/components/ko-josa';
import { PlayerName } from '~/components/player-name';
import { fetchService } from '~/services/fetch';
import { gameData$ } from '~/state/game-data';
import { path$ } from '~/state/path';

import SearchWorker from '../../worker/search?worker';

type GamesJson = NRecord<string, GameInfo, 2>;

type ProcessorResult = [label: string, icon: string, items?: Iterable<unknown>];

const labels = new WeakMap<SlTreeItem, string>();

const registerLabel = (label: string) =>
	ref((treeItem) => {
		if (treeItem) {
			labels.set(treeItem as SlTreeItem, label);
		}
	});

@customElement('gs-menu')
export class Menu extends LitElement {
	static readonly styles = css`
		sl-tree {
			--indent-guide-width: 1px;
			--indent-guide-color: var(--slategrey-darker-8);
		}

		sl-tree-item::part(label) {
			padding-right: var(--sl-spacing-small);
		}
	`;

	@query('sl-tree')
	declare tree: SlTree;

	@queryAll('sl-tree > sl-tree-item > sl-tree-item')
	declare lazyItems: NodeListOf<SlTreeItem>;

	@state()
	declare games?: GamesJson;

	constructor() {
		super();
		fetchService.json<GamesJson>('games.json').then((data) => {
			this.games = data;
		});
	}

	private parseTree(tree: MessageFormat, data: MessageData): Set<unknown> {
		const templates = new Set<unknown>();
		const visited = new Set<string>();

		for (const [entry, definition] of Object.entries(tree)) {
			const itemFrom = ([label, icon, items = []]: ProcessorResult) =>
				html`
					<sl-tree-item ${registerLabel(label)}>
						<sl-icon name=${icon}></sl-icon>
						${label} ${items}
					</sl-tree-item>
				`;

			const process: SubTreeProcessor<ProcessorResult> = ({ forWildcard, forEntry }) => {
				if (entry === '*') {
					for (const [name, subTree] of Object.entries(data)) {
						if (visited.has(name)) {
							continue;
						}
						templates.add(itemFrom(forWildcard(name, subTree)));
					}
				} else {
					visited.add(entry);
					templates.add(itemFrom(forEntry()));
				}
			};

			if (definition) {
				process({
					forWildcard: (name, subTree) => [name, 'folder', this.parseTree(definition, subTree as MessageData)],
					forEntry: () => [entry, 'folder', this.parseTree(definition, data[entry] as MessageData)],
				});
			} else {
				process({
					forWildcard: (name) => [name, 'file-earmark'],
					forEntry: () => [entry, 'file-earmark'],
				});
			}
		}

		return templates;
	}

	selectPath(path: readonly string[], parent: HTMLElement | null = this.renderRoot.querySelector('sl-tree')) {
		if (!parent) {
			return;
		}

		for (const child of parent.querySelectorAll('sl-tree-item')) {
			if (labels.get(child) === path[0]) {
				if (path.length === 1) {
					this.renderRoot.querySelector('sl-tree')?.selectItem(child);
				} else {
					if (!child.expanded) {
						child.expanded = true;
					}

					this.selectPath(path.slice(1), child);
				}

				return;
			}
		}
	}

	render() {
		if (!this.games) {
			return html`<sl-spinner></sl-spinner>`;
		}

		return html`
			<sl-tree
				.selection=${'leaf'}
				@sl-selection-change=${(event: CustomEvent<{ selection: [SlTreeItem?] }>) => {
					let [item] = event.detail.selection;

					if (!item) {
						return;
					}

					const resolve = (item: SlTreeItem) => {
						return {
							item,
							label: labels.get(item)!,
						};
					};

					const path = [resolve(item)];

					while (item.parentElement instanceof SlTreeItem) {
						item = item.parentElement;
						path.unshift(resolve(item));
					}

					path$.next(path);
				}}
			>
				${Object.entries(this.games).map(([platform, games]) => {
					return html`
						<sl-tree-item ${registerLabel(platform)}>
							<sl-icon name="pc-display-horizontal"></sl-icon>
							${platform}
							${Object.entries(games).map(([name, info]) => {
								return html`
									<sl-tree-item
										lazy
										${registerLabel(name)}
										@sl-lazy-load=${async ({ currentTarget }: TargetEvent<SlTreeItem>) => {
											for (const item of this.lazyItems) {
												if (item !== currentTarget && item.expanded) {
													await new Promise<void>((resolve) => {
														item.addEventListener(
															'sl-after-collapse',
															() => {
																for (const childItem of item.querySelectorAll('sl-tree-item')) {
																	childItem.remove();
																}

																resolve();
															},
															{ once: true },
														);
														item.expanded = false;
													});
												}
											}

											const data = await fetchService.json<MessageData>(`${info.root}/message.json`);
											const fragment = document.createDocumentFragment();
											render(this.parseTree(info.messageFormat, data), fragment, { host: this });

											currentTarget.addEventListener(
												'sl-expand',
												() => {
													const walker = document.createTreeWalker(currentTarget, NodeFilter.SHOW_ELEMENT, (node) => {
														if (node instanceof SlTreeItem && node.isLeaf) {
															return NodeFilter.FILTER_ACCEPT;
														}

														return NodeFilter.FILTER_SKIP;
													});

													const item = walker.firstChild() as SlTreeItem;
													const parent = item.parentElement as SlTreeItem;

													this.tree.selectItem(item);

													if (!parent.expanded) {
														parent.expanded = true;
													}
												},
												{ once: true },
											);

											currentTarget.appendChild(fragment);

											for (const item of this.lazyItems) {
												item.lazy = item !== currentTarget;
											}

											const search = new SearchWorker();

											gameData$.value?.search.terminate();

											PlayerName.reset(info);
											KoreanJosa.update();

											gameData$.next({
												info,
												data,
												search,
												indexed: new Promise<void>((resolve) => {
													const handleIndexed = (event: MessageEvent<string>) => {
														if (event.data === 'indexed') {
															search.removeEventListener('message', handleIndexed);
															resolve();
														}
													};

													search.addEventListener('message', handleIndexed);

													search.postMessage({
														format: info.messageFormat,
														data,
													});
												}),
											});
										}}
									>
										<sl-icon name="controller"></sl-icon>
										${name}
									</sl-tree-item>
								`;
							})}
						</sl-tree-item>
					`;
				})}
			</sl-tree>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'gs-menu': Menu;
	}
}
